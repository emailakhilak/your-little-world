import logging
from datetime import date
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news import DailyEdition, NewsArticle, NewsSource, UserArticleRead
from app.repositories.news_repository import NewsRepository
from app.schemas.news import IngestionStatsResponse
from app.services.news.categories import is_valid_category
from app.services.news.daily_job import DailyNewsJobService
from app.services.news.edition_service import DailyEditionService
from app.services.news.ingestion_service import NewsIngestionService
from app.services.news.reading_history_service import ReadingHistoryService
from app.services.news.summarizer import NewsSummarizerService

logger = logging.getLogger(__name__)


class NewsService:
    """Service layer exposing news querying, summarization, daily editions, and reading history."""

    def __init__(
        self,
        repository: NewsRepository | None = None,
        ingestion_service: NewsIngestionService | None = None,
        edition_service: DailyEditionService | None = None,
        summarizer_service: NewsSummarizerService | None = None,
        reading_history_service: ReadingHistoryService | None = None,
        daily_job_service: DailyNewsJobService | None = None,
    ) -> None:
        self.repository = repository or NewsRepository()
        self.ingestion_service = ingestion_service or NewsIngestionService(
            repository=self.repository
        )
        self.edition_service = edition_service or DailyEditionService()
        self.summarizer_service = summarizer_service or NewsSummarizerService()
        self.reading_history_service = reading_history_service or ReadingHistoryService()
        self.daily_job_service = daily_job_service or DailyNewsJobService(
            ingestion_service=self.ingestion_service,
            edition_service=self.edition_service,
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

    async def summarize_article(
        self,
        db: AsyncSession,
        article_id: str,
        force: bool = False,
    ) -> NewsArticle:
        """Generate structured summary for an article."""
        article = await self.get_article_or_404(db, article_id)
        return await self.summarizer_service.summarize_article(db, article, force=force)

    async def get_or_create_today_edition(
        self,
        db: AsyncSession,
        target_date: date | None = None,
        force_regenerate: bool = False,
    ) -> DailyEdition:
        """Curate or fetch today's daily edition."""
        return await self.edition_service.get_or_create_today_edition(
            db=db,
            target_date=target_date,
            force_regenerate=force_regenerate,
        )

    async def get_edition_by_date(
        self,
        db: AsyncSession,
        edition_date: date,
    ) -> DailyEdition:
        """Fetch edition for a specific date or raise 404."""
        edition = await self.edition_service.get_edition_by_date(db, edition_date)
        if not edition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Daily edition for date '{edition_date}' not found.",
            )
        return edition

    async def list_editions(
        self,
        db: AsyncSession,
        limit: int = 30,
        offset: int = 0,
    ) -> tuple[list[DailyEdition], int]:
        """List past editions."""
        return await self.edition_service.list_editions(db=db, limit=limit, offset=offset)

    async def mark_article_read(
        self,
        db: AsyncSession,
        user_id: str,
        article_id: str,
    ) -> UserArticleRead:
        """Record reading of an article."""
        await self.get_article_or_404(db, article_id)
        return await self.reading_history_service.mark_read(
            db=db,
            user_id=user_id,
            article_id=article_id,
        )

    async def get_user_read_ids(
        self,
        db: AsyncSession,
        user_id: str,
    ) -> set[str]:
        """Get set of read article IDs."""
        return await self.reading_history_service.get_read_article_ids(db=db, user_id=user_id)

    async def list_user_reading_history(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[UserArticleRead], int]:
        """List full reading history for user."""
        return await self.reading_history_service.list_reading_history(
            db=db,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

    async def run_daily_update_job(
        self,
        db: AsyncSession,
        target_timezone: str = "Asia/Kolkata",
        target_date: date | None = None,
        force: bool = False,
        as_of: Any | None = None,
    ) -> dict[str, Any]:
        """Run daily news ingestion and edition curation pass."""
        return await self.daily_job_service.execute_daily_update(
            db=db,
            target_timezone=target_timezone,
            target_date=target_date,
            force=force,
            as_of=as_of,
        )
