import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.timezone import get_timezone, now_in_timezone, now_utc, to_utc
from app.models.news import DailyEdition
from app.models.scheduled_job import ScheduledJob
from app.models.user_preference import UserPreference
from app.services.goal_instance_service import GoalInstanceService
from app.services.news.daily_job import DailyNewsJobService
from app.services.notifications.base import BaseNotificationProvider
from app.services.notifications.log_provider import default_notification_provider
from app.services.reminder_service import ReminderService

logger = logging.getLogger("your_little_world.scheduler")


class GardenScheduler:
    """
    Lightweight, observable background scheduler for recurring goal instances,
    reminder processing, and Faraway Window news editions.
    Idempotent and safe to run in-process without external message queues.
    """

    def __init__(
        self,
        interval_seconds: int = 60,
        goal_instance_service: GoalInstanceService | None = None,
        reminder_service: ReminderService | None = None,
        daily_news_job_service: DailyNewsJobService | None = None,
        notification_provider: BaseNotificationProvider | None = None,
    ):
        self.interval_seconds = interval_seconds
        self.instance_service = goal_instance_service or GoalInstanceService()
        self.notification_provider = notification_provider or default_notification_provider
        self.reminder_service = reminder_service or ReminderService(
            notification_provider=self.notification_provider
        )
        self.daily_news_job_service = daily_news_job_service or DailyNewsJobService(
            notification_provider=self.notification_provider
        )
        self._task: asyncio.Task | None = None
        self._running = False

    async def _check_and_run_daily_news(
        self,
        db: AsyncSession,
        as_of: datetime | None = None,
        user_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Evaluates daily news edition schedules based on user preferences.
        - Defaults to Asia/Kolkata and 20:00 when no user preferences exist.
        - Supports user-configured timezone and update times.
        - Handles same-day and yesterday missed-job catch-up without aggressive backfill.
        - Enforces idempotency, active job locking, and failure backoff with max retry limits.
        """
        stmt = select(UserPreference).where(UserPreference.news_daily_update.is_(True))
        if user_id:
            stmt = stmt.where(UserPreference.user_id == user_id)
        user_prefs = (await db.execute(stmt)).scalars().all()

        schedules: list[tuple[str, str]] = []
        if user_prefs:
            seen_pairs: set[tuple[str, str]] = set()
            for p in user_prefs:
                tz_name = (p.timezone or "Asia/Kolkata").strip()
                update_time = (p.news_update_time or "20:00").strip()
                pair = (tz_name, update_time)
                if pair not in seen_pairs:
                    seen_pairs.add(pair)
                    schedules.append(pair)
        else:
            schedules.append(("Asia/Kolkata", "20:00"))

        executed_results: list[dict[str, Any]] = []
        current_utc = to_utc(as_of) if as_of else now_utc()

        for tz_name, update_time_str in schedules:
            try:
                parts = update_time_str.split(":", 1)
                sched_hour = int(parts[0])
                sched_minute = int(parts[1]) if len(parts) > 1 else 0
            except Exception:
                sched_hour, sched_minute = 20, 0

            tz = get_timezone(tz_name)
            if as_of:
                local_now = as_of.astimezone(tz) if as_of.tzinfo else as_of.replace(tzinfo=tz)
            else:
                local_now = now_in_timezone(tz_name)

            today_date = local_now.date()
            is_due_today = (local_now.hour > sched_hour) or (
                local_now.hour == sched_hour and local_now.minute >= sched_minute
            )

            target_dates: list[Any] = []
            if is_due_today:
                target_dates.append(today_date)

            # Check missed job for yesterday (bounded catch-up: at most 1 day)
            yesterday_date = today_date - timedelta(days=1)
            stmt_yest_ed = select(DailyEdition).where(DailyEdition.edition_date == yesterday_date)
            yest_edition = (await db.execute(stmt_yest_ed)).scalars().first()
            if not yest_edition:
                job_name_yest = f"daily_news_edition_{yesterday_date.isoformat()}"
                stmt_yest_job = select(ScheduledJob).where(
                    ScheduledJob.job_name == job_name_yest,
                    ScheduledJob.status == "success",
                )
                yest_job = (await db.execute(stmt_yest_job)).scalars().first()
                if not yest_job and yesterday_date not in target_dates:
                    target_dates.append(yesterday_date)

            for target_date in target_dates:
                job_name = f"daily_news_edition_{target_date.isoformat()}"

                # Query existing jobs for this target date
                stmt_jobs = (
                    select(ScheduledJob)
                    .where(ScheduledJob.job_name == job_name)
                    .order_by(desc(ScheduledJob.started_at))
                )
                jobs = (await db.execute(stmt_jobs)).scalars().all()

                # 1. Skip if already succeeded for this timezone
                if any(
                    j.status == "success"
                    and (not j.metadata_json or j.metadata_json.get("timezone") == tz_name)
                    for j in jobs
                ):
                    continue

                # 2. Skip if active execution in progress (started within 10 minutes)
                running_job = next(
                    (
                        j
                        for j in jobs
                        if j.status == "running"
                        and (not j.metadata_json or j.metadata_json.get("timezone") == tz_name)
                    ),
                    None,
                )
                if running_job:
                    started = to_utc(running_job.started_at)
                    if (current_utc - started).total_seconds() < 600:
                        logger.info(
                            f"Daily news job '{job_name}' currently running; skipping duplicate trigger."
                        )
                        continue

                # 3. Check retry limits (max 3 failed attempts) and backoff (300 seconds)
                failed_jobs = [j for j in jobs if j.status == "failed"]
                if len(failed_jobs) >= 3:
                    logger.warning(
                        f"Daily news job '{job_name}' reached maximum retry attempts ({len(failed_jobs)}); skipping automatic retry."
                    )
                    continue

                if failed_jobs:
                    last_failure = failed_jobs[0]
                    failure_time = to_utc(last_failure.completed_at or last_failure.started_at)
                    elapsed = (current_utc - failure_time).total_seconds()
                    if elapsed < 300:
                        logger.debug(
                            f"Daily news job '{job_name}' backoff active ({int(elapsed)}s < 300s); waiting before retry."
                        )
                        continue

                # Run job
                logger.info(
                    f"Executing daily news update for target date '{target_date.isoformat()}' (timezone: {tz_name})."
                )
                res = await self.daily_news_job_service.execute_daily_update(
                    db=db,
                    target_timezone=tz_name,
                    target_date=target_date,
                    as_of=as_of,
                    user_id=user_id,
                )
                executed_results.append(res)

        return executed_results

    async def run_jobs(
        self,
        db: AsyncSession,
        as_of: datetime | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Executes a single scheduled pass:
        1. Generates due occurrences for all active recurring goals.
        2. Processes and delivers due reminders.
        3. Evaluates and executes scheduled Faraway Window daily news editions.
        Returns execution summary.
        """
        logger.debug("World scheduler starting job pass...")
        summary: dict[str, Any] = {
            "instances_generated": 0,
            "reminders_processed": 0,
            "news_daily_job_executed": False,
            "timestamp": datetime.now().isoformat(),
        }

        try:
            # 1. Goal instances & reminders
            instances = await self.instance_service.generate_due_instances(db, as_of=as_of)
            reminders_count = await self.reminder_service.process_due_reminders(
                db, as_of=as_of, user_id=user_id
            )
            summary["instances_generated"] = len(instances)
            summary["reminders_processed"] = reminders_count

            if instances or reminders_count:
                logger.info(
                    f"Garden scheduler pass completed: {len(instances)} instances, "
                    f"{reminders_count} reminders dispatched."
                )

            # 2. Daily News Check & Catch-up
            try:
                news_results = await self._check_and_run_daily_news(
                    db, as_of=as_of, user_id=user_id
                )
                if news_results:
                    summary["news_daily_job_executed"] = True
                    summary["news_daily_job_result"] = news_results[0]
                    summary["news_daily_job_results"] = news_results
            except Exception as news_err:
                logger.warning(
                    f"Scheduler encountered non-fatal error during daily news check: {news_err}",
                    exc_info=True,
                )

            return summary
        except Exception as exc:
            logger.error(f"Error during world scheduler execution: {exc}", exc_info=True)
            raise

    async def _worker_loop(self) -> None:
        """Continuous background loop executing jobs at configured interval."""
        logger.info(f"World background scheduler started (interval: {self.interval_seconds}s).")
        while self._running:
            try:
                async with AsyncSessionLocal() as session:
                    await self.run_jobs(session)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Scheduler tick caught exception: {e}")

            try:
                await asyncio.sleep(self.interval_seconds)
            except asyncio.CancelledError:
                break

        logger.info("World background scheduler stopped.")

    def start(self) -> None:
        """Starts the background worker task if not already running."""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._worker_loop())

    def stop(self) -> None:
        """Stops the background worker task cleanly."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()


# Global scheduler singleton
garden_scheduler = GardenScheduler()
