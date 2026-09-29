import logging
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserClaims, get_current_user
from app.core.timezone import get_today_date
from app.schemas.news import (
    DailyEditionListResponse,
    DailyEditionResponse,
    IngestionStatsResponse,
    NewsArticleListResponse,
    NewsArticleResponse,
    NewsSourceListResponse,
    NewsSourceResponse,
    ReadingHistoryListResponse,
    UserArticleReadResponse,
)
from app.services.news_service import NewsService
from app.services.preferences_service import PreferencesService

logger = logging.getLogger(__name__)

router = APIRouter()
news_service = NewsService()
preferences_service = PreferencesService()


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
    """Fetch paginated news articles ordered newest first, with user reading history annotated."""
    articles, total = await news_service.list_articles(
        db=db,
        category=category,
        source_id=source_id,
        limit=limit,
        offset=offset,
    )

    read_ids = await news_service.get_user_read_ids(db=db, user_id=current_user.user_id)

    response_items = []
    for art in articles:
        model = NewsArticleResponse.model_validate(art)
        model.is_read = art.id in read_ids
        response_items.append(model)

    return NewsArticleListResponse(
        items=response_items,
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
    read_ids = await news_service.get_user_read_ids(db=db, user_id=current_user.user_id)
    resp = NewsArticleResponse.model_validate(article)
    resp.is_read = article.id in read_ids
    return resp


@router.post(
    "/articles/{article_id}/summarize",
    response_model=NewsArticleResponse,
    summary="Generate AI summary for an article",
)
async def summarize_article(
    article_id: str,
    force: bool = Query(default=False, description="Force re-generation"),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NewsArticleResponse:
    """Trigger LLM summarization for an article."""
    article = await news_service.summarize_article(db=db, article_id=article_id, force=force)
    return NewsArticleResponse.model_validate(article)


@router.post(
    "/articles/{article_id}/read",
    response_model=UserArticleReadResponse,
    summary="Mark an article as read",
)
async def mark_article_read(
    article_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserArticleReadResponse:
    """Record that the authenticated user has read this article."""
    read_record = await news_service.mark_article_read(
        db=db,
        user_id=current_user.user_id,
        article_id=article_id,
    )
    return UserArticleReadResponse.model_validate(read_record)


@router.get(
    "/reading-history",
    response_model=ReadingHistoryListResponse,
    summary="Get user reading history",
)
async def get_reading_history(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReadingHistoryListResponse:
    """Fetch reading history for the current user."""
    items, total = await news_service.list_user_reading_history(
        db=db,
        user_id=current_user.user_id,
        limit=limit,
        offset=offset,
    )
    return ReadingHistoryListResponse(
        items=[ReadingHistoryListResponse.model_validate(i) for i in items]
        if False
        else [
            {
                "id": r.id,
                "user_id": r.user_id,
                "article_id": r.article_id,
                "read_at": r.read_at,
                "completed": r.completed,
                "article": NewsArticleResponse.model_validate(r.article) if r.article else None,
            }
            for r in items
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/editions/today",
    response_model=DailyEditionResponse,
    summary="Get today's daily news edition",
)
async def get_today_edition(
    force_regenerate: bool = Query(default=False),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyEditionResponse:
    """Curate or fetch today's Faraway Window daily edition (user configured timezone or Asia/Kolkata)."""
    pref = await preferences_service.get_preferences(db, current_user.user_id)
    user_tz = pref.timezone or "Asia/Kolkata"
    today_date = get_today_date(user_tz)
    edition = await news_service.get_or_create_today_edition(
        db=db,
        target_date=today_date,
        force_regenerate=force_regenerate,
    )
    return DailyEditionResponse.model_validate(edition)


@router.get(
    "/editions",
    response_model=DailyEditionListResponse,
    summary="List past daily editions",
)
async def list_editions(
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyEditionListResponse:
    """List historical daily editions."""
    editions, total = await news_service.list_editions(db=db, limit=limit, offset=offset)
    return DailyEditionListResponse(
        items=[DailyEditionResponse.model_validate(e) for e in editions],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/editions/{edition_date}",
    response_model=DailyEditionResponse,
    summary="Get daily edition by date",
)
async def get_edition_by_date(
    edition_date: date = Path(..., description="Target date (YYYY-MM-DD)"),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyEditionResponse:
    """Retrieve edition for a specific date."""
    edition = await news_service.get_edition_by_date(db=db, edition_date=edition_date)
    return DailyEditionResponse.model_validate(edition)


@router.post(
    "/editions/generate",
    response_model=DailyEditionResponse,
    summary="Generate or refresh daily edition",
)
async def generate_edition(
    target_date: date | None = Query(default=None, description="Optional target date"),
    force: bool = Query(default=True, description="Force re-generation"),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyEditionResponse:
    """Generate or update daily edition."""
    edition = await news_service.get_or_create_today_edition(
        db=db,
        target_date=target_date,
        force_regenerate=force,
    )
    return DailyEditionResponse.model_validate(edition)


@router.post(
    "/daily-job",
    summary="Run 8 PM daily news update job",
)
async def run_daily_job(
    timezone: str | None = Query(
        default=None,
        description="Target timezone (defaults to user preference or Asia/Kolkata)",
    ),
    force: bool = Query(default=False, description="Force run even if already completed today"),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Manually invoke the 8 PM daily news update workflow."""
    target_tz = timezone
    if not target_tz:
        pref = await preferences_service.get_preferences(db, current_user.user_id)
        target_tz = pref.timezone or "Asia/Kolkata"
    return await news_service.run_daily_update_job(
        db=db,
        target_timezone=target_tz,
        force=force,
    )


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
