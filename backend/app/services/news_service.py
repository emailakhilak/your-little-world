import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news import NewsArticle, NewsSource
from app.repositories.news_repository import NewsRepository
from app.schemas.news import IngestionStatsResponse
from app.services.news.categories import is_valid_category
from app.services.news.ingestion_service import NewsIngestionService

logger = logging.getLogger(__name__)


class NewsService:
    """Service layer exposing news querying and ingestion operations to the API."""

    def __init__(
        self,
        repository: NewsRepository | None = None,
        ingestion_service: NewsIngestionService | None = None,
    ) -> None:
        self.repository = repository or NewsRepository()
        self.ingestion_service = ingestion_service or NewsIngestionService(
            repository=self.repository
        )

    async def get_article_or_404(self, db: AsyncSession, article_id: str) -> NewsArticle:
        """Fetch article by ID or raise 404."""
        article = await self.repository.get_article_by_id(db, article_id)
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"News article with id '{article_id}' not found.",
            )
        return article

    async def list_articles(
        self,
        db: AsyncSession,
        category: str | None = None,
        source_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[NewsArticle], int]:
        """Fetch paginated articles ordered newest first."""
        if category and not is_valid_category(category):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid news category '{category}'. Valid categories: ai, mystery, science_defence, developer",
            )
        return await self.repository.list_articles(
            db=db,
            category=category,
            source_id=source_id,
            limit=limit,
            offset=offset,
        )

    async def list_sources(
        self,
        db: AsyncSession,
        category: str | None = None,
        is_enabled: bool | None = None,
    ) -> list[NewsSource]:
        """Fetch all news sources matching category or enabled state."""
        if category and not is_valid_category(category):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid news category '{category}'. Valid categories: ai, mystery, science_defence, developer",
            )
        # Ensure initial sources are seeded if database is currently empty
        existing_count = await self.repository.count_sources(db)
        if existing_count == 0:
            await self.ingestion_service.sync_sources(db)

        return await self.repository.list_sources(db=db, category=category, is_enabled=is_enabled)

    async def trigger_ingestion(
        self,
        db: AsyncSession,
        category: str | None = None,
        sync_sources: bool = True,
    ) -> IngestionStatsResponse:
        """Trigger news ingestion run across enabled sources."""
        if category and not is_valid_category(category):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid news category '{category}'. Valid categories: ai, mystery, science_defence, developer",
            )
        return await self.ingestion_service.ingest_all(
            db=db,
            sync_sources_first=sync_sources,
            category=category,
        )
