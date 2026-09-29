import logging
from datetime import date

from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.timezone import get_today_date
from app.models.news import DailyEdition, DailyEditionArticle, NewsArticle

logger = logging.getLogger(__name__)


class DailyEditionService:
    """
    Manages curated Daily News Editions for Faraway Window.
    Ensures idempotency, balanced category coverage, and zero duplicate articles within an edition.
    """

    async def get_or_create_today_edition(
        self,
        db: AsyncSession,
        target_date: date | None = None,
        force_regenerate: bool = False,
    ) -> DailyEdition:
        """
        Retrieves today's edition (Asia/Kolkata date by default) or generates a new one.
        """
        edition_date = target_date or get_today_date("Asia/Kolkata")

        # Check existing edition
        stmt = (
            select(DailyEdition)
            .where(DailyEdition.edition_date == edition_date)
            .options(
                selectinload(DailyEdition.edition_articles)
                .selectinload(DailyEditionArticle.article)
                .selectinload(NewsArticle.source)
            )
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()

        if existing and not force_regenerate:
            return existing

        if existing and force_regenerate:
            # Clear existing articles in edition
            await db.delete(existing)
            await db.flush()

        # Build new daily edition
        title = f"Faraway Window — {edition_date.strftime('%B %d, %Y')}"
        edition = DailyEdition(
            edition_date=edition_date,
            title=title,
            status="published",
            lead_summary="A daily collection of dispatches across intelligence, deep space, mysteries, and craft.",
            metadata_json={"generated_for": edition_date.isoformat()},
        )
        db.add(edition)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            # Race condition: another execution already created the edition for this date
            existing = await self.get_edition_by_date(db, edition_date)
            if existing:
                return existing
            raise

        # Select top articles per category
        categories = ["ai", "mystery", "science_defence", "developer"]
        added_article_ids: set[str] = set()
        position = 0

        for cat in categories:
            cat_stmt = (
                select(NewsArticle)
                .where(NewsArticle.category == cat)
                .order_by(desc(NewsArticle.published_at), desc(NewsArticle.created_at))
                .limit(4)
            )
            cat_result = await db.execute(cat_stmt)
            cat_articles = cat_result.scalars().all()

            for art in cat_articles:
                if art.id not in added_article_ids:
                    edition_item = DailyEditionArticle(
                        edition_id=edition.id,
                        article_id=art.id,
                        category=cat,
                        position=position,
                    )
                    db.add(edition_item)
                    added_article_ids.add(art.id)
                    position += 1

        await db.commit()

        # Reload with relationships
        reload_stmt = (
            select(DailyEdition)
            .where(DailyEdition.id == edition.id)
            .options(
                selectinload(DailyEdition.edition_articles)
                .selectinload(DailyEditionArticle.article)
                .selectinload(NewsArticle.source)
            )
        )
        reloaded = await db.execute(reload_stmt)
        return reloaded.scalars().one()

    async def get_edition_by_date(
        self,
        db: AsyncSession,
        edition_date: date,
    ) -> DailyEdition | None:
        """Fetch edition by exact date."""
        stmt = (
            select(DailyEdition)
            .where(DailyEdition.edition_date == edition_date)
            .options(
                selectinload(DailyEdition.edition_articles)
                .selectinload(DailyEditionArticle.article)
                .selectinload(NewsArticle.source)
            )
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def list_editions(
        self,
        db: AsyncSession,
        limit: int = 30,
        offset: int = 0,
    ) -> tuple[list[DailyEdition], int]:
        """List historical editions ordered newest first."""
        count_stmt = select(DailyEdition)
        all_editions = await db.execute(count_stmt)
        total = len(all_editions.scalars().all())

        stmt = (
            select(DailyEdition)
            .order_by(desc(DailyEdition.edition_date))
            .limit(limit)
            .offset(offset)
            .options(
                selectinload(DailyEdition.edition_articles)
                .selectinload(DailyEditionArticle.article)
                .selectinload(NewsArticle.source)
            )
        )
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        return items, total
