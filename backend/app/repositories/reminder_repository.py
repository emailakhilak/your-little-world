from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate


class ReminderRepository:
    """Repository handling database operations for Goal Reminders."""

    async def get_by_id(self, db: AsyncSession, reminder_id: str, user_id: str) -> Reminder | None:
        """Fetch reminder strictly isolated to the user."""
        query = (
            select(Reminder)
            .options(selectinload(Reminder.goal))
            .where(
                Reminder.id == reminder_id,
                Reminder.user_id == user_id,
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_by_goal(self, db: AsyncSession, user_id: str, goal_id: str) -> list[Reminder]:
        """Fetch all reminders for a user's goal."""
        query = (
            select(Reminder)
            .where(
                Reminder.user_id == user_id,
                Reminder.goal_id == goal_id,
            )
            .order_by(Reminder.created_at.asc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def list_all_enabled(
        self, db: AsyncSession, user_id: str | None = None
    ) -> list[Reminder]:
        """Fetch all enabled reminders across the system for due schedule evaluation."""
        query = (
            select(Reminder).options(selectinload(Reminder.goal)).where(Reminder.is_enabled == True)  # noqa: E712
        )
        if user_id is not None:
            query = query.where(Reminder.user_id == user_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def create(
        self, db: AsyncSession, goal_id: str, user_id: str, data: ReminderCreate
    ) -> Reminder:
        """Persist a new reminder."""
        reminder = Reminder(
            goal_id=goal_id,
            user_id=user_id,
            reminder_time=data.reminder_time,
            timezone=data.timezone,
            is_enabled=data.is_enabled,
            channel=data.channel,
        )
        db.add(reminder)
        await db.commit()
        await db.refresh(reminder)
        return reminder

    async def update(
        self, db: AsyncSession, reminder: Reminder, updates: dict[str, Any]
    ) -> Reminder:
        """Update fields on an existing reminder."""
        for field, value in updates.items():
            setattr(reminder, field, value)
        await db.commit()
        await db.refresh(reminder)
        return reminder

    async def delete(self, db: AsyncSession, reminder: Reminder) -> None:
        """Delete a reminder."""
        await db.delete(reminder)
        await db.commit()
