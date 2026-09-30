import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import get_llm_provider
from app.models.note import Note
from app.repositories.note_repository import NoteRepository
from app.schemas.llm import NoteCategorizationSchema
from app.schemas.note import NoteAISuggestionResponse, NoteCreateInput, NoteUpdateInput

logger = logging.getLogger(__name__)


class NoteService:
    """Service layer managing Little Attic notes and AI suggestions."""

    def __init__(self, repository: NoteRepository | None = None) -> None:
        self.repository = repository or NoteRepository()

    async def get_note_or_404(self, db: AsyncSession, user_id: str, note_id: str) -> Note:
        note = await self.repository.get_by_id(db, user_id=user_id, note_id=note_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Note with id '{note_id}' not found.",
            )
        return note

    async def create_note(self, db: AsyncSession, user_id: str, data: NoteCreateInput) -> Note:
        return await self.repository.create(db, user_id=user_id, data=data)

    async def update_note(
        self, db: AsyncSession, user_id: str, note_id: str, data: NoteUpdateInput
    ) -> Note:
        note = await self.get_note_or_404(db, user_id=user_id, note_id=note_id)
        return await self.repository.update(db, note=note, data=data)

    async def delete_note(self, db: AsyncSession, user_id: str, note_id: str) -> None:
        note = await self.get_note_or_404(db, user_id=user_id, note_id=note_id)
        await self.repository.delete(db, note=note)

    async def toggle_pin(self, db: AsyncSession, user_id: str, note_id: str) -> Note:
        note = await self.get_note_or_404(db, user_id=user_id, note_id=note_id)
        return await self.repository.update(
            db, note=note, data=NoteUpdateInput(is_pinned=not note.is_pinned)
        )

    async def toggle_archive(self, db: AsyncSession, user_id: str, note_id: str) -> Note:
        note = await self.get_note_or_404(db, user_id=user_id, note_id=note_id)
        return await self.repository.update(
            db, note=note, data=NoteUpdateInput(is_archived=not note.is_archived)
        )

    async def list_notes(
        self,
        db: AsyncSession,
        user_id: str,
        category: str | None = None,
        is_archived: bool = False,
        search: str | None = None,
        tag: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Note], int, int, int]:
        return await self.repository.list_notes(
            db=db,
            user_id=user_id,
            category=category,
            is_archived=is_archived,
            search=search,
            tag=tag,
            limit=limit,
            offset=offset,
        )

    async def suggest_tags(
        self,
        title: str,
        content: str,
    ) -> NoteAISuggestionResponse:
        """
        AI Foundation: Proposes categorizations and tags for notes.
        Falls back to rule-based heuristics if no provider is configured.
        """
        try:
            provider = get_llm_provider()
        except Exception:
            provider = None
        if not provider:
            # Heuristic fallback
            tags = ["note"]
            cat = "idea"
            text = f"{title} {content}".lower()
            if any(k in text for k in ["todo", "task", "deadline"]):
                cat = "reminder"
                tags.append("action")
            elif any(k in text for k in ["code", "function", "api", "bug"]):
                cat = "snippet"
                tags.append("dev")
            elif any(k in text for k in ["project", "build", "architecture"]):
                cat = "project"
                tags.append("build")
            return NoteAISuggestionResponse(suggested_category=cat, suggested_tags=tags)

        try:
            prompt = (
                f"Note Title: {title}\n"
                f"Note Content: {content}\n\n"
                "Propose an appropriate category (idea, thought, snippet, reminder, project) "
                "and 2-4 clean tags for indexing."
            )
            result = await provider.generate_structured(
                prompt=prompt,
                response_schema=NoteCategorizationSchema,
            )
            return NoteAISuggestionResponse(
                suggested_category=result.suggested_category,
                suggested_tags=result.suggested_tags,
            )
        except Exception as e:
            logger.warning(
                "AI tag suggestion failed (%s), using fallback heuristic.", type(e).__name__
            )
            return NoteAISuggestionResponse(suggested_category="idea", suggested_tags=["note"])
