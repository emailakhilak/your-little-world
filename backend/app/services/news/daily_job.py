import logging
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import get_timezone, get_today_date, now_in_timezone, now_utc, to_utc
from app.models.scheduled_job import ScheduledJob
from app.models.user_preference import UserPreference
from app.services.news.edition_service import DailyEditionService
from app.services.news.ingestion_service import NewsIngestionService
from app.services.notifications.base import BaseNotificationProvider, NotificationPayload
from app.services.notifications.log_provider import default_notification_provider

logger = logging.getLogger("your_little_world.daily_job")


class DailyNewsJobService:
    """
    Orchestrates the daily news workflow for Faraway Window:
    1. Synchronize sources
    2. Ingest latest feeds with source failure isolation
    3. Curate Daily Edition for the target date
    4. Deliver dispatches via notification abstraction respecting user preferences
    5. Record execution status, idempotency, and notifications in scheduled_jobs table
    """

    def __init__(
        self,
        ingestion_service: NewsIngestionService | None = None,
        edition_service: DailyEditionService | None = None,
        notification_provider: BaseNotificationProvider | None = None,
    ):
        self.ingestion_service = ingestion_service or NewsIngestionService()
        self.edition_service = edition_service or DailyEditionService()
        self.notification_provider = notification_provider or default_notification_provider

    async def execute_daily_update(
        self,
        db: AsyncSession,
        target_timezone: str = "Asia/Kolkata",
        target_date: date | None = None,
        as_of: datetime | None = None,
        force: bool = False,
        user_id: str | None = None,
        notification_provider: BaseNotificationProvider | None = None,
        notify: bool = True,
    ) -> dict[str, Any]:
        """
        Executes daily ingestion and edition curation pass with job tracking and idempotency.
        """
        tz = get_timezone(target_timezone)
        if as_of:
            local_now = as_of.astimezone(tz) if as_of.tzinfo else as_of.replace(tzinfo=tz)
        else:
            local_now = now_in_timezone(target_timezone)

        today_date = target_date or (local_now.date() if as_of else get_today_date(target_timezone))
        job_name = f"daily_news_edition_{today_date.isoformat()}"
        current_time = to_utc(as_of) if as_of else now_utc()

        # Check if another execution is currently active (started within last 10 minutes)
        if not force:
            stmt_running = select(ScheduledJob).where(
                ScheduledJob.job_name == job_name,
                ScheduledJob.status == "running",
            )
            running_jobs = (await db.execute(stmt_running)).scalars().all()
            for r_job in running_jobs:
                if (
                    not r_job.metadata_json
                    or r_job.metadata_json.get("timezone") == target_timezone
                ):
                    started = to_utc(r_job.started_at)
                    if (current_time - started).total_seconds() < 600:
                        logger.info(
                            f"Daily news edition job '{job_name}' is currently running for {target_timezone}; skipping duplicate execution."
                        )
                        return {
                            "job_id": r_job.id,
                            "status": "already_running",
                            "edition_date": today_date.isoformat(),
                            "message": f"Daily news edition job '{job_name}' is currently active.",
                        }

        # 3. Record job start
        job_record = ScheduledJob(
            job_name=job_name,
            scheduled_time=local_now.astimezone(UTC),
            started_at=current_time,
            status="running",
            metadata_json={"timezone": target_timezone, "target_date": today_date.isoformat()},
        )
        db.add(job_record)
        await db.commit()
        await db.refresh(job_record)

        try:
            # 1. Sync default sources
            await self.ingestion_service.sync_sources(db)

            # 2. Ingest latest feeds across all categories (with failure isolation per feed)
            stats = await self.ingestion_service.ingest_all(db)

            # 3. Curate daily edition for target date
            edition = await self.edition_service.get_or_create_today_edition(
                db=db,
                target_date=today_date,
                force_regenerate=force,
            )

            # 4. Notification separation: notifications must not invalidate edition creation
            notifications_sent = 0
            notifications_failed = 0
            notifications_skipped = 0
            notification_errors: list[str] = []

            if notify:
                active_provider = notification_provider or self.notification_provider
                try:
                    # Determine users to consider for notification
                    users_to_check: list[UserPreference] = []
                    if user_id:
                        stmt_u = select(UserPreference).where(UserPreference.user_id == user_id)
                        pref = (await db.execute(stmt_u)).scalars().first()
                        if pref:
                            users_to_check.append(pref)
                        else:
                            # Ephemeral default preference for isolated or new test user
                            users_to_check.append(
                                UserPreference(
                                    user_id=user_id,
                                    timezone=target_timezone,
                                    notifications_enabled=True,
                                    notification_channels=["log"],
                                    news_update_time="20:00",
                                )
                            )
                    else:
                        # Multi-user resolution matching target timezone with active news updates
                        stmt_prefs = select(UserPreference).where(
                            UserPreference.news_daily_update.is_(True),
                            UserPreference.timezone == target_timezone,
                        )
                        users_to_check = list((await db.execute(stmt_prefs)).scalars().all())

                    # Check edition's existing notification records to prevent duplicates
                    edition_meta = dict(edition.metadata_json or {})
                    notified_users = dict(edition_meta.get("notified_users", {}))

                    for user_pref in users_to_check:
                        uid = user_pref.user_id

                        # 1. Prevent duplicate notifications for same user/date
                        if uid in notified_users and notified_users[uid].get("status") == "sent":
                            logger.info(
                                f"Notification already sent to user '{uid}' for edition {today_date.isoformat()}; skipping duplicate."
                            )
                            notifications_skipped += 1
                            continue

                        # 2. Respect notification preference
                        if not user_pref.notifications_enabled:
                            logger.info(
                                f"User '{uid}' has notifications disabled; skipping dispatch."
                            )
                            notifications_skipped += 1
                            continue

                        # 3. Construct concise notification payload (no private diary content)
                        channel = "log"
                        if (
                            user_pref.notification_channels
                            and len(user_pref.notification_channels) > 0
                        ):
                            channel = user_pref.notification_channels[0]

                        payload = NotificationPayload(
                            user_id=uid,
                            title="Your Little World has a new dispatch 🌙",
                            message="Today's Faraway Window edition is ready.\nOpen your world to see today's discoveries.",
                            edition_id=edition.id,
                            notification_type="news_edition",
                            channel=channel,
                            scheduled_time=user_pref.news_update_time or "20:00",
                            timezone=user_pref.timezone or target_timezone,
                            metadata={
                                "edition_id": edition.id,
                                "edition_date": today_date.isoformat(),
                                "edition_title": edition.title,
                            },
                        )

                        # 4. Attempt delivery through provider abstraction with failure isolation
                        try:
                            result = await active_provider.send(payload)
                            if result.success:
                                notified_users[uid] = {
                                    "status": "sent",
                                    "delivered_at": result.delivered_at.isoformat(),
                                    "provider": result.provider,
                                }
                                notifications_sent += 1
                                logger.info(
                                    f"Daily news notification successfully sent to user '{uid}' via {result.provider}."
                                )
                            else:
                                err_msg = result.error or "Delivery failed"
                                notified_users[uid] = {
                                    "status": "failed",
                                    "error": err_msg,
                                    "attempted_at": now_utc().isoformat(),
                                    "provider": result.provider,
                                }
                                notifications_failed += 1
                                notification_errors.append(f"User {uid}: {err_msg}")
                                logger.warning(
                                    f"Notification provider failed for user '{uid}': {err_msg}"
                                )
                        except Exception as prov_err:
                            err_msg = str(prov_err)
                            notified_users[uid] = {
                                "status": "failed",
                                "error": err_msg,
                                "attempted_at": now_utc().isoformat(),
                            }
                            notifications_failed += 1
                            notification_errors.append(f"User {uid}: {err_msg}")
                            logger.warning(
                                f"Exception delivering notification to user '{uid}' (isolated): {prov_err}"
                            )

                    # Update edition metadata with notification dispatch records
                    edition_meta["notified_users"] = notified_users
                    edition.metadata_json = edition_meta
                    await db.commit()

                except Exception as notif_err:
                    logger.warning(
                        f"Non-fatal error in notification dispatch pipeline: {notif_err}",
                        exc_info=True,
                    )
                    notifications_failed += 1
                    notification_errors.append(str(notif_err))

            # 5. Record success
            job_record.status = "success"
            job_record.completed_at = to_utc(as_of) if as_of else now_utc()
            job_record.metadata_json = {
                "timezone": target_timezone,
                "target_date": today_date.isoformat(),
                "edition_id": edition.id,
                "articles_seen": stats.articles_seen,
                "articles_added": stats.articles_added,
                "sources_processed": stats.sources_processed,
                "errors": stats.errors,
                "notifications_sent": notifications_sent,
                "notifications_failed": notifications_failed,
                "notifications_skipped": notifications_skipped,
                "notification_errors": notification_errors,
            }
            await db.commit()

            return {
                "job_id": job_record.id,
                "status": "success",
                "edition_id": edition.id,
                "edition_date": today_date.isoformat(),
                "articles_added": stats.articles_added,
                "sources_processed": stats.sources_processed,
                "errors": stats.errors,
                "notifications_sent": notifications_sent,
                "notifications_failed": notifications_failed,
                "notifications_skipped": notifications_skipped,
            }
        except Exception as e:
            logger.error(f"Daily news update job failed: {e}", exc_info=True)
            job_record.status = "failed"
            job_record.completed_at = to_utc(as_of) if as_of else now_utc()
            job_record.error_message = str(e)
            await db.commit()
            raise
