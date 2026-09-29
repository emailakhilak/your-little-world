import logging
from datetime import date

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserClaims, get_current_user
from app.schemas.diary import (
    DiaryEntryCreateInput,
    DiaryEntryListResponse,
    DiaryEntryResponse,
    DiaryEntryUpdateInput,
    DiaryReflectionResponse,
)
from app.services.diary_service import DiaryService

logger = logging.getLogger(__name__)

router = APIRouter()
diary_service = DiaryService()


@router.get(
    "/entries",
    response_model=DiaryEntryListResponse,
    summary="List diary entries",
)
async def list_entries(
    search: str | None = Query(default=None, description="Search in title or content"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DiaryEntryListResponse:
    """Fetch private diary entries for the authenticated user."""
    items, total = await diary_service.list_entries(
        db=db,
        user_id=current_user.user_id,
        search=search,
        limit=limit,
        offset=offset,
    )
    return DiaryEntryListResponse(
        items=[DiaryEntryResponse.model_validate(e) for e in items],
        total=total,
    )


@router.get(
    "/entries/by-date/{entry_date}",
    response_model=DiaryEntryResponse | None,
    summary="Get diary entry by calendar date",
)
async def get_entry_by_date(
    entry_date: date = Path(..., description="Date (YYYY-MM-DD)"),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DiaryEntryResponse | None:
    """Get diary entry for a specific calendar date, or None if blank."""
    entry = await diary_service.get_entry_by_date(
        db=db,
        user_id=current_user.user_id,
        entry_date=entry_date,
    )
    return DiaryEntryResponse.model_validate(entry) if entry else None


@router.post(
    "/entries",
    response_model=DiaryEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or save diary entry",
)
async def create_entry(
    data: DiaryEntryCreateInput,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DiaryEntryResponse:
    """Create or update diary entry for a given date."""
    entry = await diary_service.create_or_upsert_entry(
        db=db,
        user_id=current_user.user_id,
        data=data,
    )
    return DiaryEntryResponse.model_validate(entry)


@router.get(
    "/entries/{entry_id}",
    response_model=DiaryEntryResponse,
    summary="Get single diary entry",
)
async def get_entry(
    entry_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DiaryEntryResponse:
    """Get diary entry by ID."""
    entry = await diary_service.get_entry_or_404(
        db=db,
        user_id=current_user.user_id,
        entry_id=entry_id,
    )
    return DiaryEntryResponse.model_validate(entry)


@router.patch(
    "/entries/{entry_id}",
    response_model=DiaryEntryResponse,
    summary="Update diary entry",
)
async def update_entry(
    entry_id: str,
    data: DiaryEntryUpdateInput,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DiaryEntryResponse:
    """Update existing diary entry."""
    entry = await diary_service.update_entry(
        db=db,
        user_id=current_user.user_id,
        entry_id=entry_id,
        data=data,
    )
    return DiaryEntryResponse.model_validate(entry)


@router.delete(
    "/entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete diary entry",
)
async def delete_entry(
    entry_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently delete a diary entry."""
    await diary_service.delete_entry(
        db=db,
        user_id=current_user.user_id,
        entry_id=entry_id,
    )


@router.post(
    "/entries/{entry_id}/reflect",
    response_model=DiaryReflectionResponse,
    summary="Reflect on diary entry with AI",
)
async def reflect_on_entry(
    entry_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DiaryReflectionResponse:
    """Explicitly trigger quiet AI reflection on this single diary entry."""
    return await diary_service.reflect_on_entry(
        db=db,
        user_id=current_user.user_id,
        entry_id=entry_id,
    )
