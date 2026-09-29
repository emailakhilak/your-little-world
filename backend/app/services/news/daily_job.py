import logging
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import get_timezone, get_today_date, now_in_timezone, now_utc, to_utc
from app.models.scheduled_job import ScheduledJob
from app.services.news.edition_service import DailyEditionService
from app.services.news.ingestion_service import NewsIngestionService

logger = logging.getLogger("your_little_world.daily_job")


class DailyNewsJobService:
    """
    Orchestrates the daily news workflow for Faraway Window:
    1. Synchronize sources
    2. Ingest latest feeds with source failure isolation
    3. Curate Daily Edition for the target date
    4. Record execution status and idempotency in scheduled_jobs table
    """

    def __init__(
        self,
        ingestion_service: NewsIngestionService | None = None,
        edition_service: DailyEditionService | None = None,
    ):
        self.ingestion_service = ingestion_service or NewsIngestionService()
        self.edition_service = edition_service or DailyEditionService()

    async def execute_daily_update(
        self,
        db: AsyncSession,
        target_timezone: str = "Asia/Kolkata",
        target_date: date | None = None,
        as_of: datetime | None = None,
        force: bool = False,
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
            existing_running = (await db.execute(stmt_running)).scalars().first()
            if existing_running:
                started = to_utc(existing_running.started_at)
                if (current_time - started).total_seconds() < 600:
                    logger.info(
                        f"Daily news edition job '{job_name}' is currently running; skipping duplicate execution."
                    )
                    return {
                        "job_id": existing_running.id,
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
            try:
                # Notification hook (cleanly isolated from edition persistence)
                pass
            except Exception as notif_err:
                logger.warning(f"Notification delivery failed (non-fatal): {notif_err}")

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
            }
        except Exception as e:
            logger.error(f"Daily news update job failed: {e}", exc_info=True)
            job_record.status = "failed"
            job_record.completed_at = to_utc(as_of) if as_of else now_utc()
            job_record.error_message = str(e)
            await db.commit()
            raise
