from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserClaims, get_current_user
from app.schemas.news import (
    IngestionStatsResponse,
    NewsArticleListResponse,
    NewsArticleResponse,
    NewsSourceListResponse,
    NewsSourceResponse,
)
from app.services.news_service import NewsService

router = APIRouter()
news_service = NewsService()


@router.get(
    "/articles",
    response_model=NewsArticleListResponse,
    summary="List news articles",
)
async def list_articles(
    category: str | None = Query(
        default=None,
        description="Filter by category (ai, mystery, science_defence, developer)",
    ),
    source_id: str | None = Query(
        default=None,
        description="Filter by news source ID",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
        description="Maximum articles to return",
    ),
    offset: int = Query(
        default=0,
        ge=0,
        description="Pagination offset",
    ),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NewsArticleListResponse:
    """Fetch paginated news articles ordered newest first, with optional category or source filtering."""
    articles, total = await news_service.list_articles(
        db=db,
        category=category,
        source_id=source_id,
        limit=limit,
        offset=offset,
    )
    return NewsArticleListResponse(
        items=[NewsArticleResponse.model_validate(a) for a in articles],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/articles/{article_id}",
    response_model=NewsArticleResponse,
    summary="Get single news article",
)
async def get_article(
    article_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NewsArticleResponse:
    """Fetch full details for a single news article."""
    article = await news_service.get_article_or_404(db=db, article_id=article_id)
    return NewsArticleResponse.model_validate(article)


@router.get(
    "/sources",
    response_model=NewsSourceListResponse,
    summary="List news sources",
)
async def list_sources(
    category: str | None = Query(
        default=None,
        description="Filter by category (ai, mystery, science_defence, developer)",
    ),
    is_enabled: bool | None = Query(
        default=None,
        description="Filter by active status",
    ),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NewsSourceListResponse:
    """Fetch all registered news sources and their configuration."""
    sources = await news_service.list_sources(
        db=db,
        category=category,
        is_enabled=is_enabled,
    )
    return NewsSourceListResponse(
        items=[NewsSourceResponse.model_validate(s) for s in sources],
        total=len(sources),
    )


@router.post(
    "/ingest",
    response_model=IngestionStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger news ingestion",
)
async def trigger_ingestion(
    category: str | None = Query(
        default=None,
        description="Optionally restrict ingestion to a single category",
    ),
    sync_sources: bool = Query(
        default=True,
        description="Whether to synchronize pre-configured sources first",
    ),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IngestionStatsResponse:
    """
    Trigger a news ingestion run across enabled sources.
    Fetches external feeds, normalizes entries, deduplicates, and persists new articles.
    """
    return await news_service.trigger_ingestion(
        db=db,
        category=category,
        sync_sources=sync_sources,
    )
