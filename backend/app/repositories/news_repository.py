from typing import TYPE_CHECKING, Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.news import NewsArticle, NewsSource

if TYPE_CHECKING:
    from app.services.news.sources_registry import PreconfiguredSource


class NewsRepository:
    """Repository managing database persistence and queries for NewsSource and NewsArticle entities."""

    # ---------------------------------------------------------
    # NewsSource Operations
    # ---------------------------------------------------------

    async def get_source_by_id(self, db: AsyncSession, source_id: str) -> NewsSource | None:
        """Fetch a single news source by its unique ID."""
        query = select(NewsSource).where(NewsSource.id == source_id)
        result = await db.execute(query)
        return result.scalars().first()

    async def get_source_by_feed_url(self, db: AsyncSession, feed_url: str) -> NewsSource | None:
        """Fetch a single news source by its unique feed URL."""
        query = select(NewsSource).where(NewsSource.feed_url == feed_url)
        result = await db.execute(query)
        return result.scalars().first()

    async def list_sources(
        self,
        db: AsyncSession,
        category: str | None = None,
        is_enabled: bool | None = None,
    ) -> list[NewsSource]:
        """List news sources with optional category and enabled status filtering."""
        query = select(NewsSource).order_by(NewsSource.category.asc(), NewsSource.name.asc())
        if category:
            query = query.where(NewsSource.category == category)
        if is_enabled is not None:
            query = query.where(NewsSource.is_enabled == is_enabled)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def count_sources(
        self,
        db: AsyncSession,
        category: str | None = None,
        is_enabled: bool | None = None,
    ) -> int:
        """Count total news sources matching criteria."""
        query = select(func.count(NewsSource.id))
        if category:
            query = query.where(NewsSource.category == category)
        if is_enabled is not None:
            query = query.where(NewsSource.is_enabled == is_enabled)

        result = await db.execute(query)
        return result.scalar() or 0

    async def create_source(
        self,
        db: AsyncSession,
        name: str,
        base_url: str,
        feed_url: str,
        category: str,
        source_type: str = "rss",
        is_enabled: bool = True,
        reliability_metadata: dict[str, Any] | None = None,
    ) -> NewsSource:
        """Create and persist a new news source."""
        source = NewsSource(
            name=name,
            base_url=base_url,
            feed_url=feed_url,
            category=category,
            source_type=source_type,
            is_enabled=is_enabled,
            reliability_metadata=reliability_metadata,
        )
        db.add(source)
        await db.commit()
        await db.refresh(source)
        return source

    async def sync_preconfigured_sources(
        self,
        db: AsyncSession,
        sources: list[PreconfiguredSource],
    ) -> list[NewsSource]:
        """Ensure all pre-configured sources exist in database, updating or inserting as necessary."""
        synced_sources: list[NewsSource] = []
        for pre in sources:
            existing = await self.get_source_by_feed_url(db, pre.feed_url)
            if existing:
                # Update attributes if needed
                existing.name = pre.name
                existing.base_url = pre.base_url
                existing.category = pre.category.value
                existing.source_type = pre.source_type
                existing.reliability_metadata = pre.reliability_metadata
                synced_sources.append(existing)
            else:
                new_src = NewsSource(
                    name=pre.name,
                    base_url=pre.base_url,
                    feed_url=pre.feed_url,
                    category=pre.category.value,
                    source_type=pre.source_type,
                    is_enabled=pre.is_enabled,
                    reliability_metadata=pre.reliability_metadata,
                )
                db.add(new_src)
                synced_sources.append(new_src)

        await db.commit()
        for src in synced_sources:
            await db.refresh(src)
        return synced_sources

    # ---------------------------------------------------------
    # NewsArticle Operations
    # ---------------------------------------------------------

    async def get_article_by_id(self, db: AsyncSession, article_id: str) -> NewsArticle | None:
        """Fetch a single article by ID including source relationship."""
        query = (
            select(NewsArticle)
            .options(joinedload(NewsArticle.source))
            .where(NewsArticle.id == article_id)
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def is_duplicate(
        self,
        db: AsyncSession,
        source_id: str,
        canonical_url: str,
        external_id: str | None = None,
    ) -> bool:
        """
        Deterministic deduplication check:
        Returns True if canonical_url exists OR (external_id is given and same source+external_id exists).
        """
        conditions = [NewsArticle.canonical_url == canonical_url]
        if external_id:
            conditions.append(
                (NewsArticle.source_id == source_id) & (NewsArticle.external_id == external_id)
            )

        query = select(NewsArticle.id).where(or_(*conditions)).limit(1)
        result = await db.execute(query)
        return result.scalar() is not None

    async def list_articles(
        self,
        db: AsyncSession,
        category: str | None = None,
        source_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[NewsArticle], int]:
        """
        Fetch articles ordered newest first with optional category/source filtering and pagination.
        Returns: (articles, total_count)
        """
        # Count query
        count_query = select(func.count(NewsArticle.id))
        if category:
            count_query = count_query.where(NewsArticle.category == category)
        if source_id:
            count_query = count_query.where(NewsArticle.source_id == source_id)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Articles query (order newest first by published_at or fetched_at)
        query = (
            select(NewsArticle)
            .options(joinedload(NewsArticle.source))
            .order_by(
                NewsArticle.published_at.desc().nullslast(),
                NewsArticle.fetched_at.desc(),
                NewsArticle.created_at.desc(),
            )
            .limit(limit)
            .offset(offset)
        )
        if category:
            query = query.where(NewsArticle.category == category)
        if source_id:
            query = query.where(NewsArticle.source_id == source_id)

        result = await db.execute(query)
        return list(result.scalars().all()), total

    async def create_article(
        self,
        db: AsyncSession,
        source_id: str,
        title: str,
        url: str,
        canonical_url: str,
        category: str,
        external_id: str | None = None,
        description: str | None = None,
        author: str | None = None,
        published_at: Any = None,
        image_url: str | None = None,
        raw_metadata: dict[str, Any] | None = None,
    ) -> NewsArticle:
        """Persist a single normalized article."""
        article = NewsArticle(
            source_id=source_id,
            title=title,
            url=url,
            canonical_url=canonical_url,
            category=category,
            external_id=external_id,
            description=description,
            author=author,
            published_at=published_at,
            image_url=image_url,
            raw_metadata=raw_metadata,
        )
        db.add(article)
        await db.commit()
        await db.refresh(article)
        return article
