import logging
from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.news import NewsArticle, UserArticleRead

logger = logging.getLogger(__name__)


class ReadingHistoryService:
    """
    Manages personal article reading history and completion markers.
    Ensures user-isolation and idempotency.
    """

    async def mark_read(
        self,
        db: AsyncSession,
        user_id: str,
        article_id: str,
    ) -> UserArticleRead:
        """
        Marks an article as read for the user. If already marked, updates read_at timestamp.
        """
        stmt = select(UserArticleRead).where(
            UserArticleRead.user_id == user_id,
            UserArticleRead.article_id == article_id,
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()

        if existing:
            existing.read_at = datetime.now(UTC)
            existing.completed = True
            await db.commit()
            await db.refresh(existing)
            return existing

        read_record = UserArticleRead(
            user_id=user_id,
            article_id=article_id,
            read_at=datetime.now(UTC),
            completed=True,
        )
        db.add(read_record)
        await db.commit()
        await db.refresh(read_record)
        return read_record

    async def get_read_article_ids(
        self,
        db: AsyncSession,
        user_id: str,
    ) -> set[str]:
        """
        Returns the set of article IDs that this user has read.
        """
        stmt = select(UserArticleRead.article_id).where(UserArticleRead.user_id == user_id)
        result = await db.execute(stmt)
        return set(result.scalars().all())

    async def list_reading_history(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[UserArticleRead], int]:
        """
        Returns full reading history records with related articles for the user.
        """
        count_stmt = select(UserArticleRead).where(UserArticleRead.user_id == user_id)
        count_res = await db.execute(count_stmt)
        total = len(count_res.scalars().all())

        stmt = (
            select(UserArticleRead)
            .where(UserArticleRead.user_id == user_id)
            .order_by(desc(UserArticleRead.read_at))
            .limit(limit)
            .offset(offset)
            .options(selectinload(UserArticleRead.article).selectinload(NewsArticle.source))
        )
        result = await db.execute(stmt)
        return list(result.scalars().all()), total
