import logging

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserClaims, get_current_user
from app.schemas.note import (
    NoteAISuggestionResponse,
    NoteCreateInput,
    NoteListResponse,
    NoteResponse,
    NoteUpdateInput,
)
from app.services.note_service import NoteService

logger = logging.getLogger(__name__)

router = APIRouter()
note_service = NoteService()


class SuggestTagsRequest(BaseModel):
    title: str = ""
    content: str = ""


@router.get(
    "",
    response_model=NoteListResponse,
    summary="List notes",
)
async def list_notes(
    category: str | None = Query(default=None, description="Filter by category"),
    search: str | None = Query(default=None, description="Search in title or content"),
    tag: str | None = Query(default=None, description="Filter by tag"),
    is_archived: bool = Query(default=False, description="Filter archived notes"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteListResponse:
    """List notes for the authenticated user with optional search and filters."""
    notes, total, pinned_count, archived_count = await note_service.list_notes(
        db=db,
        user_id=current_user.user_id,
        category=category,
        is_archived=is_archived,
        search=search,
        tag=tag,
        limit=limit,
        offset=offset,
    )
    return NoteListResponse(
        items=[NoteResponse.model_validate(n) for n in notes],
        total=total,
        pinned_count=pinned_count,
        archived_count=archived_count,
    )


@router.post(
    "",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create note",
)
async def create_note(
    data: NoteCreateInput,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    """Create a new note in The Little Attic."""
    note = await note_service.create_note(
        db=db,
        user_id=current_user.user_id,
        data=data,
    )
    return NoteResponse.model_validate(note)


@router.get(
    "/{note_id}",
    response_model=NoteResponse,
    summary="Get single note",
)
async def get_note(
    note_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    """Fetch a single note by ID for the authenticated user."""
    note = await note_service.get_note_or_404(
        db=db,
        user_id=current_user.user_id,
        note_id=note_id,
    )
    return NoteResponse.model_validate(note)


@router.patch(
    "/{note_id}",
    response_model=NoteResponse,
    summary="Update note",
)
async def update_note(
    note_id: str,
    data: NoteUpdateInput,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    """Update an existing note."""
    note = await note_service.update_note(
        db=db,
        user_id=current_user.user_id,
        note_id=note_id,
        data=data,
    )
    return NoteResponse.model_validate(note)


@router.delete(
    "/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete note",
)
async def delete_note(
    note_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently remove a note."""
    await note_service.delete_note(
        db=db,
        user_id=current_user.user_id,
        note_id=note_id,
    )


@router.post(
    "/{note_id}/pin",
    response_model=NoteResponse,
    summary="Toggle pin status of note",
)
async def toggle_pin(
    note_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    """Toggle whether this note is pinned to the top of the desk."""
    note = await note_service.toggle_pin(
        db=db,
        user_id=current_user.user_id,
        note_id=note_id,
    )
    return NoteResponse.model_validate(note)


@router.post(
    "/{note_id}/archive",
    response_model=NoteResponse,
    summary="Toggle archive status of note",
)
async def toggle_archive(
    note_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    """Tuck note into archival drawer or restore to desk."""
    note = await note_service.toggle_archive(
        db=db,
        user_id=current_user.user_id,
        note_id=note_id,
    )
    return NoteResponse.model_validate(note)


@router.post(
    "/suggest-tags",
    response_model=NoteAISuggestionResponse,
    summary="Suggest tags and category using AI",
)
async def suggest_tags(
    data: SuggestTagsRequest,
    current_user: UserClaims = Depends(get_current_user),
) -> NoteAISuggestionResponse:
    """Suggest category and tags based on note content."""
    return await note_service.suggest_tags(
        title=data.title,
        content=data.content,
    )
