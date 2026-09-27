from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import Achievement


class AchievementRepository:
    """Repository managing database persistence and queries for Achievement entities."""

    async def get_by_id(
        self, db: AsyncSession, achievement_id: str, user_id: str
    ) -> Achievement | None:
        """Fetch a single achievement ensuring strict user isolation."""
        query = select(Achievement).where(
            Achievement.id == achievement_id,
            Achievement.user_id == user_id,
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def get_by_milestone_key(
        self, db: AsyncSession, user_id: str, milestone_key: str
    ) -> Achievement | None:
        """Fetch an achievement by its deterministic milestone key for idempotency checks."""
        query = select(Achievement).where(
            Achievement.user_id == user_id,
            Achievement.milestone_key == milestone_key,
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def list_achievements(
        self, db: AsyncSession, user_id: str, category: str | None = None
    ) -> list[Achievement]:
        """Fetch all achievements for a user ordered newest first, with optional category filtering."""
        query = (
            select(Achievement)
            .where(Achievement.user_id == user_id)
            .order_by(Achievement.achieved_at.desc(), Achievement.created_at.desc())
        )
        if category:
            query = query.where(Achievement.category == category)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def count_user_achievements(self, db: AsyncSession, user_id: str) -> int:
        """Count total achievements earned by a user."""
        query = select(func.count(Achievement.id)).where(Achievement.user_id == user_id)
        result = await db.execute(query)
        return result.scalar() or 0

    async def create(
        self,
        db: AsyncSession,
        user_id: str,
        milestone_key: str,
        title: str,
        description: str,
        category: str = "milestone",
        icon: str = "🌱",
        source_type: str | None = None,
        source_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        achieved_at: datetime | None = None,
    ) -> Achievement:
        """Create and persist a new achievement."""
        achievement = Achievement(
            user_id=user_id,
            milestone_key=milestone_key,
            title=title,
            description=description,
            category=category,
            icon=icon,
            source_type=source_type,
            source_id=source_id,
            metadata_json=metadata,
        )
        if achieved_at:
            achievement.achieved_at = achieved_at

        db.add(achievement)
        await db.commit()
        await db.refresh(achievement)
        return achievement
