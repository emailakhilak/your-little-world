from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
from app.schemas.goal import GoalCreate


class GoalRepository:
    """Repository handling all database queries for Goal entities."""

    async def get_by_id(self, db: AsyncSession, goal_id: str, user_id: str) -> Goal | None:
        """Fetch a single goal by ID, strictly scoping by user_id."""
        query = select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_goals(
        self,
        db: AsyncSession,
        user_id: str,
        status: str | None = None,
        category: str | None = None,
    ) -> list[Goal]:
        """Fetch list of goals for a specific user, with optional status and category filtering."""
        query = select(Goal).where(Goal.user_id == user_id)

        if status:
            query = query.where(Goal.status == status)
        if category:
            query = query.where(Goal.category == category)

        # Default ordering: active first, then by created_at descending
        query = query.order_by(
            Goal.created_at.desc(),
        )

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_user_counts(self, db: AsyncSession, user_id: str) -> dict[str, int]:
        """Fetch summary counts for active, completed, and archived goals for the user."""
        query = (
            select(Goal.status, func.count(Goal.id))
            .where(Goal.user_id == user_id)
            .group_by(Goal.status)
        )
        result = await db.execute(query)
        counts = {"active": 0, "completed": 0, "archived": 0}
        total = 0
        for status, count in result.all():
            if status in counts:
                counts[status] = count
            total += count
        counts["total"] = total
        return counts

    async def create(self, db: AsyncSession, user_id: str, data: GoalCreate) -> Goal:
        """Persist a new goal in the database."""
        goal_dict = data.model_dump()
        goal = Goal(
            user_id=user_id,
            **goal_dict,
        )
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    async def update(self, db: AsyncSession, goal: Goal, updates: dict[str, Any]) -> Goal:
        """Apply updates to an existing goal and persist."""
        for field, value in updates.items():
            setattr(goal, field, value)
        goal.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(goal)
        return goal

    async def delete(self, db: AsyncSession, goal: Goal) -> None:
        """Permanently delete a goal from the database."""
        await db.delete(goal)
        await db.commit()
