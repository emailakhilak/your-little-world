import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserClaims, get_current_user
from app.schemas.ledger import (
    LedgerEntryCreateInput,
    LedgerEntryListResponse,
    LedgerEntryResponse,
    LedgerEntryUpdateInput,
)
from app.services.ledger_service import LedgerService

logger = logging.getLogger(__name__)

router = APIRouter()
ledger_service = LedgerService()


@router.get(
    "/entries",
    response_model=LedgerEntryListResponse,
    summary="List recent ledger entries",
)
async def list_entries(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LedgerEntryListResponse:
    """Fetch private money diary entries for the authenticated user."""
    items, total = await ledger_service.list_entries(
        db=db,
        user_id=current_user.user_id,
        limit=limit,
        offset=offset,
    )
    return LedgerEntryListResponse(
        items=[LedgerEntryResponse.model_validate(e) for e in items],
        total=total,
    )


@router.get(
    "/entries/by-date/{entry_date}",
    response_model=LedgerEntryResponse | None,
    summary="Get ledger entry by calendar date",
)
async def get_entry_by_date(
    entry_date: date = Path(..., description="Date (YYYY-MM-DD)"),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LedgerEntryResponse | None:
    """Get ledger entry for a specific calendar date, or None if none written."""
    entry = await ledger_service.get_by_date(
        db=db,
        user_id=current_user.user_id,
        entry_date=entry_date,
    )
    if not entry:
        return None
    return LedgerEntryResponse.model_validate(entry)


@router.get(
    "/entries/{entry_id}",
    response_model=LedgerEntryResponse,
    summary="Get ledger entry by ID",
)
async def get_entry_by_id(
    entry_id: str = Path(..., description="Entry UUID"),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LedgerEntryResponse:
    """Retrieve a specific ledger entry by its unique identifier."""
    entry = await ledger_service.get_by_id(
        db=db,
        user_id=current_user.user_id,
        entry_id=entry_id,
    )
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ledger entry not found",
        )
    return LedgerEntryResponse.model_validate(entry)


@router.post(
    "/entries",
    response_model=LedgerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or write a ledger entry",
)
async def create_entry(
    data: LedgerEntryCreateInput,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LedgerEntryResponse:
    """Save a private money diary note for a calendar date."""
    entry = await ledger_service.create_entry(
        db=db,
        user_id=current_user.user_id,
        data=data,
    )
    return LedgerEntryResponse.model_validate(entry)


@router.put(
    "/entries/{entry_id}",
    response_model=LedgerEntryResponse,
    summary="Update a ledger entry",
)
async def update_entry(
    entry_id: str = Path(..., description="Entry UUID"),
    data: LedgerEntryUpdateInput = ...,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LedgerEntryResponse:
    """Update written text for an existing ledger entry."""
    entry = await ledger_service.update_entry(
        db=db,
        user_id=current_user.user_id,
        entry_id=entry_id,
        data=data,
    )
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ledger entry not found",
        )
    return LedgerEntryResponse.model_validate(entry)


@router.delete(
    "/entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a ledger entry",
)
async def delete_entry(
    entry_id: str = Path(..., description="Entry UUID"),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently delete a ledger entry."""
    deleted = await ledger_service.delete_entry(
        db=db,
        user_id=current_user.user_id,
        entry_id=entry_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ledger entry not found",
        )
