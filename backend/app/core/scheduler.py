import asyncio
import logging
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.timezone import get_today_date, now_in_timezone
from app.models.scheduled_job import ScheduledJob
from app.services.goal_instance_service import GoalInstanceService
from app.services.news.daily_job import DailyNewsJobService
from app.services.reminder_service import ReminderService

logger = logging.getLogger("your_little_world.scheduler")


class GardenScheduler:
    """
    Lightweight, observable background scheduler for recurring goal instances,
    reminder processing, and 8 PM Asia/Kolkata Faraway Window news editions.
    Idempotent and safe to run in-process without external message queues.
    """

    def __init__(
        self,
        interval_seconds: int = 60,
        goal_instance_service: GoalInstanceService | None = None,
        reminder_service: ReminderService | None = None,
        daily_news_job_service: DailyNewsJobService | None = None,
    ):
        self.interval_seconds = interval_seconds
        self.instance_service = goal_instance_service or GoalInstanceService()
        self.reminder_service = reminder_service or ReminderService()
        self.daily_news_job_service = daily_news_job_service or DailyNewsJobService()
        self._task: asyncio.Task | None = None
        self._running = False

    async def run_jobs(
        self,
        db: AsyncSession,
        as_of: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Executes a single scheduled pass:
        1. Generates due occurrences for all active recurring goals.
        2. Processes and delivers due reminders.
        3. If 8 PM Asia/Kolkata has arrived and daily edition has not yet executed,
           curates and publishes today's Faraway Window edition.
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
            reminders_count = await self.reminder_service.process_due_reminders(db, as_of=as_of)
            summary["instances_generated"] = len(instances)
            summary["reminders_processed"] = reminders_count

            if instances or reminders_count:
                logger.info(
                    f"Garden scheduler pass completed: {len(instances)} instances, "
                    f"{reminders_count} reminders dispatched."
                )

            # 2. 8 PM Asia/Kolkata Faraway Window Daily News Check
            try:
                kolkata_now = now_in_timezone("Asia/Kolkata")
                today_kolkata = get_today_date("Asia/Kolkata")
                job_name = f"daily_news_edition_{today_kolkata.isoformat()}"

                # Only run if 8 PM (20:00) or later
                if kolkata_now.hour >= 20:
                    # Check if already succeeded today
                    stmt = select(ScheduledJob).where(
                        ScheduledJob.job_name == job_name,
                        ScheduledJob.status == "success",
                    )
                    existing = (await db.execute(stmt)).scalars().first()
                    if not existing:
                        logger.info(
                            f"8 PM Asia/Kolkata reached ({kolkata_now.strftime('%H:%M')}). "
                            f"Initiating daily news edition curation..."
                        )
                        job_result = await self.daily_news_job_service.execute_daily_update(
                            db, target_timezone="Asia/Kolkata"
                        )
                        summary["news_daily_job_executed"] = True
                        summary["news_daily_job_result"] = job_result
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
