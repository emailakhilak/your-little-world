import asyncio
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.services.goal_instance_service import GoalInstanceService
from app.services.reminder_service import ReminderService

logger = logging.getLogger("your_little_world.scheduler")


class GardenScheduler:
    """
    Lightweight, observable background scheduler for recurring goal instances
    and reminder processing. Idempotent and safe to run in-process without
    external message queues.
    """

    def __init__(
        self,
        interval_seconds: int = 60,
        goal_instance_service: GoalInstanceService | None = None,
        reminder_service: ReminderService | None = None,
    ):
        self.interval_seconds = interval_seconds
        self.instance_service = goal_instance_service or GoalInstanceService()
        self.reminder_service = reminder_service or ReminderService()
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
        Returns execution summary.
        """
        logger.debug("Garden scheduler starting job pass...")
        try:
            instances = await self.instance_service.generate_due_instances(db, as_of=as_of)
            reminders_count = await self.reminder_service.process_due_reminders(db, as_of=as_of)

            summary = {
                "instances_generated": len(instances),
                "reminders_processed": reminders_count,
                "timestamp": datetime.now().isoformat(),
            }
            if instances or reminders_count:
                logger.info(
                    f"Garden scheduler pass completed: {len(instances)} instances, "
                    f"{reminders_count} reminders dispatched."
                )
            return summary
        except Exception as exc:
            logger.error(f"Error during garden scheduler execution: {exc}", exc_info=True)
            raise

    async def _worker_loop(self) -> None:
        """Continuous background loop executing jobs at configured interval."""
        logger.info(f"Garden background scheduler started (interval: {self.interval_seconds}s).")
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

        logger.info("Garden background scheduler stopped.")

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
