import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news import NewsSource
from app.repositories.news_repository import NewsRepository
from app.schemas.news import IngestionSourceStat, IngestionStatsResponse
from app.services.news.base_provider import NewsProvider, NewsProviderError
from app.services.news.normalizer import ArticleNormalizer, NormalizationError
from app.services.news.rss_provider import RssNewsProvider
from app.services.news.sources_registry import INITIAL_SOURCES

logger = logging.getLogger(__name__)


class NewsIngestionService:
    """
    Orchestrates news fetching, normalization, deduplication, and persistence.
    Isolates external provider errors so failures in one feed do not affect other sources.
    """

    def __init__(
        self,
        repository: NewsRepository | None = None,
        providers: dict[str, NewsProvider] | None = None,
    ) -> None:
        self.repository = repository or NewsRepository()
        self.providers: dict[str, NewsProvider] = providers or {
            "rss": RssNewsProvider(),
            "atom": RssNewsProvider(),
        }

    def get_provider(self, source_type: str) -> NewsProvider:
        """Resolve the appropriate provider implementation for a source type."""
        provider = self.providers.get(source_type.lower())
        if not provider:
            # Fall back to RSS provider as default for XML-based feeds
            provider = self.providers.get("rss")
        if not provider:
            raise ValueError(f"No provider registered for source type '{source_type}'")
        return provider

    async def sync_sources(self, db: AsyncSession) -> list[NewsSource]:
        """Ensure all initial pre-configured sources are registered in the database."""
        return await self.repository.sync_preconfigured_sources(db, INITIAL_SOURCES)

    async def ingest_source(
        self,
        db: AsyncSession,
        source: NewsSource,
        timeout_seconds: float = 15.0,
    ) -> IngestionSourceStat:
        """
        Ingest and persist articles from a single news source.
        Returns detailed stats for this source execution.
        """
        stat = IngestionSourceStat(
            source_id=source.id,
            source_name=source.name,
            category=source.category,
            status="success",
        )

        try:
            provider = self.get_provider(source.source_type)
            raw_entries = await provider.fetch_feed(
                source.feed_url, timeout_seconds=timeout_seconds
            )
            stat.articles_seen = len(raw_entries)

            seen_canonicals_in_run: set[str] = set()

            for raw_entry in raw_entries:
                try:
                    norm = ArticleNormalizer.normalize_entry(raw_entry, category=source.category)
                except NormalizationError as norm_err:
                    logger.debug(f"Normalization skipped entry from '{source.name}': {norm_err}")
                    stat.articles_skipped += 1
                    continue
                except Exception as norm_err:
                    logger.warning(f"Unexpected normalization error in '{source.name}': {norm_err}")
                    stat.articles_skipped += 1
                    continue

                # In-batch duplicate check
                if norm.canonical_url in seen_canonicals_in_run:
                    stat.articles_skipped += 1
                    continue

                seen_canonicals_in_run.add(norm.canonical_url)

                # Database deduplication check
                is_dup = await self.repository.is_duplicate(
                    db=db,
                    source_id=source.id,
                    canonical_url=norm.canonical_url,
                    external_id=norm.external_id,
                )
                if is_dup:
                    stat.articles_skipped += 1
                    continue

                # Persist new article
                await self.repository.create_article(
                    db=db,
                    source_id=source.id,
                    title=norm.title,
                    url=norm.url,
                    canonical_url=norm.canonical_url,
                    category=norm.category,
                    external_id=norm.external_id,
                    description=norm.description,
                    author=norm.author,
                    published_at=norm.published_at,
                    image_url=norm.image_url,
                    raw_metadata=norm.raw_metadata,
                )
                stat.articles_added += 1

        except NewsProviderError as exc:
            logger.warning(f"Provider error ingesting '{source.name}': {exc}")
            stat.status = "error"
            stat.error_message = str(exc)
        except Exception as exc:
            logger.error(f"Unexpected error ingesting '{source.name}': {exc}", exc_info=True)
            stat.status = "error"
            stat.error_message = f"Unexpected failure: {exc}"

        return stat

    async def ingest_all(
        self,
        db: AsyncSession,
        sync_sources_first: bool = True,
        category: str | None = None,
        timeout_seconds: float = 15.0,
    ) -> IngestionStatsResponse:
        """
        Orchestrate complete ingestion across all enabled sources.
        Guarantees that an error in one source does not prevent processing others.
        """
        if sync_sources_first:
            await self.sync_sources(db)

        sources = await self.repository.list_sources(db=db, category=category, is_enabled=True)

        sources_processed = 0
        total_seen = 0
        total_added = 0
        total_skipped = 0
        errors: list[str] = []
        details: list[IngestionSourceStat] = []

        for source in sources:
            source_stat = await self.ingest_source(
                db=db, source=source, timeout_seconds=timeout_seconds
            )
            sources_processed += 1
            total_seen += source_stat.articles_seen
            total_added += source_stat.articles_added
            total_skipped += source_stat.articles_skipped
            details.append(source_stat)

            if source_stat.status == "error" and source_stat.error_message:
                errors.append(f"{source.name}: {source_stat.error_message}")

        return IngestionStatsResponse(
            sources_processed=sources_processed,
            articles_seen=total_seen,
            articles_added=total_added,
            articles_skipped=total_skipped,
            errors=errors,
            source_details=details,
        )
