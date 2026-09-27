from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal_instance import GoalInstance


class GoalInstanceRepository:
    """Repository handling database operations for GoalInstance occurrences."""

    async def get_by_id(
        self, db: AsyncSession, instance_id: str, user_id: str
    ) -> GoalInstance | None:
        """Fetch instance by ID strictly isolated to the user."""
        query = select(GoalInstance).where(
            GoalInstance.id == instance_id,
            GoalInstance.user_id == user_id,
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_goal_and_period(
        self, db: AsyncSession, goal_id: str, period_key: str
    ) -> GoalInstance | None:
        """Fetch an instance by goal ID and period key (idempotency check)."""
        query = select(GoalInstance).where(
            GoalInstance.goal_id == goal_id,
            GoalInstance.period_key == period_key,
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_instances(
        self,
        db: AsyncSession,
        user_id: str,
        goal_id: str | None = None,
        status: str | None = None,
        scheduled_date: date | None = None,
    ) -> list[GoalInstance]:
        """Fetch instances for the user with optional filters."""
        query = select(GoalInstance).where(GoalInstance.user_id == user_id)

        if goal_id:
            query = query.where(GoalInstance.goal_id == goal_id)
        if status:
            query = query.where(GoalInstance.status == status)
        if scheduled_date:
            query = query.where(GoalInstance.scheduled_date == scheduled_date)

        query = query.order_by(GoalInstance.scheduled_date.desc(), GoalInstance.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def create(
        self,
        db: AsyncSession,
        goal_id: str,
        user_id: str,
        period_key: str,
        scheduled_date: date,
        status: str = "active",
        notes: str | None = None,
    ) -> GoalInstance:
        """Create and persist a new goal instance."""
        instance = GoalInstance(
            goal_id=goal_id,
            user_id=user_id,
            period_key=period_key,
            scheduled_date=scheduled_date,
            status=status,
            notes=notes,
        )
        db.add(instance)
        await db.commit()
        await db.refresh(instance)
        return instance

    async def update(
        self, db: AsyncSession, instance: GoalInstance, updates: dict[str, Any]
    ) -> GoalInstance:
        """Apply updates to an existing instance."""
        for field, value in updates.items():
            setattr(instance, field, value)
        await db.commit()
        await db.refresh(instance)
        return instance

    async def delete(self, db: AsyncSession, instance: GoalInstance) -> None:
        """Delete an instance."""
        await db.delete(instance)
        await db.commit()
