import logging
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import now_in_timezone, now_utc
from app.models.reminder import Reminder
from app.repositories.goal_repository import GoalRepository
from app.repositories.reminder_repository import ReminderRepository
from app.schemas.reminder import (
    ReminderCreate,
    ReminderListResponse,
    ReminderResponse,
    ReminderUpdate,
)
from app.services.notifications.base import BaseNotificationProvider, NotificationPayload
from app.services.notifications.log_provider import default_notification_provider

logger = logging.getLogger(__name__)


class ReminderService:
    """Service handling goal reminder configuration and due processing."""

    def __init__(
        self,
        repository: ReminderRepository | None = None,
        goal_repository: GoalRepository | None = None,
        notification_provider: BaseNotificationProvider | None = None,
    ):
        self.repository = repository or ReminderRepository()
        self.goal_repository = goal_repository or GoalRepository()
        self.notification_provider = notification_provider or default_notification_provider

    async def get_reminder_or_404(
        self, db: AsyncSession, reminder_id: str, user_id: str
    ) -> Reminder:
        """Fetch reminder strictly validating user ownership; 404 if missing or unauthorized."""
        reminder = await self.repository.get_by_id(db, reminder_id, user_id)
        if not reminder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reminder with id '{reminder_id}' not found.",
            )
        return reminder

    async def create_reminder(
        self, db: AsyncSession, user_id: str, goal_id: str, data: ReminderCreate
    ) -> ReminderResponse:
        """Create a reminder for a goal, ensuring the goal belongs to the user."""
        goal = await self.goal_repository.get_by_id(db, goal_id, user_id)
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Goal with id '{goal_id}' not found.",
            )

        reminder = await self.repository.create(db, goal_id=goal_id, user_id=user_id, data=data)
        return ReminderResponse.model_validate(reminder)

    async def list_reminders(
        self, db: AsyncSession, user_id: str, goal_id: str
    ) -> ReminderListResponse:
        """List all reminders for a specific goal belonging to the user."""
        goal = await self.goal_repository.get_by_id(db, goal_id, user_id)
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Goal with id '{goal_id}' not found.",
            )

        reminders = await self.repository.list_by_goal(db, user_id, goal_id)
        return ReminderListResponse(
            items=[ReminderResponse.model_validate(r) for r in reminders],
            total=len(reminders),
        )

    async def list_user_reminders(
        self, db: AsyncSession, user_id: str
    ) -> ReminderListResponse:
        """List all reminders for the authenticated user in one round trip."""
        reminders = await self.repository.list_by_user(db, user_id)
        return ReminderListResponse(
            items=[ReminderResponse.model_validate(r) for r in reminders],
            total=len(reminders),
        )

    async def update_reminder(
        self, db: AsyncSession, user_id: str, reminder_id: str, data: ReminderUpdate
    ) -> ReminderResponse:
        """Update settings for an existing reminder."""
        reminder = await self.get_reminder_or_404(db, reminder_id, user_id)
        updates = data.model_dump(exclude_unset=True)
        updated = await self.repository.update(db, reminder, updates)
        return ReminderResponse.model_validate(updated)

    async def delete_reminder(self, db: AsyncSession, user_id: str, reminder_id: str) -> None:
        """Delete a reminder."""
        reminder = await self.get_reminder_or_404(db, reminder_id, user_id)
        await self.repository.delete(db, reminder)

    async def process_due_reminders(
        self,
        db: AsyncSession,
        as_of: datetime | None = None,
        provider: BaseNotificationProvider | None = None,
        user_id: str | None = None,
    ) -> int:
        """
        Evaluates enabled reminders across user timezones and dispatches notifications.
        Guarantees idempotency via last_period_key tracking to prevent duplicate sends.
        """
        active_provider = provider or self.notification_provider
        reminders = await self.repository.list_all_enabled(db, user_id=user_id)
        processed_count = 0

        for reminder in reminders:
            # Evaluate current local time in the reminder's timezone
            if as_of:
                from app.core.timezone import get_timezone

                tz = get_timezone(reminder.timezone)
                local_now = as_of.astimezone(tz) if as_of.tzinfo else as_of.replace(tzinfo=tz)
            else:
                local_now = now_in_timezone(reminder.timezone)

            current_period_key = local_now.date().isoformat()

            # Skip if already fired for this period
            if reminder.last_period_key == current_period_key:
                continue

            current_time_str = local_now.strftime("%H:%M")
            # If current local time has reached or passed scheduled reminder time
            if current_time_str >= reminder.reminder_time:
                goal_title = reminder.goal.title if reminder.goal else "Garden Intention"
                goal_desc = (
                    reminder.goal.description
                    if reminder.goal and reminder.goal.description
                    else "Take a quiet moment to tend to your intention in the Garden."
                )

                payload = NotificationPayload(
                    reminder_id=reminder.id,
                    goal_id=reminder.goal_id,
                    user_id=reminder.user_id,
                    title=f"🌱 {goal_title}",
                    message=goal_desc,
                    channel=reminder.channel,
                    scheduled_time=reminder.reminder_time,
                    timezone=reminder.timezone,
                )

                # Deliver notification through abstraction
                result = await active_provider.send(payload)
                if result.success:
                    await self.repository.update(
                        db,
                        reminder,
                        {
                            "last_triggered_at": now_utc(),
                            "last_period_key": current_period_key,
                        },
                    )
                    processed_count += 1
                    logger.info(f"Processed reminder '{reminder.id}' for goal '{goal_title}'")

        return processed_count
