import logging
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import get_llm_provider
from app.core.timezone import get_today_date
from app.models.diary import DiaryEntry
from app.repositories.diary_repository import DiaryRepository
from app.repositories.preferences_repository import PreferencesRepository
from app.schemas.diary import DiaryEntryCreateInput, DiaryEntryUpdateInput, DiaryReflectionResponse
from app.schemas.llm import DiaryReflectionSchema

logger = logging.getLogger(__name__)


class DiaryService:
    """Service layer for private diary operations and explicit AI reflections."""

    def __init__(
        self,
        repository: DiaryRepository | None = None,
        preferences_repo: PreferencesRepository | None = None,
    ) -> None:
        self.repository = repository or DiaryRepository()
        self.preferences_repo = preferences_repo or PreferencesRepository()

    async def _get_user_today(self, db: AsyncSession, user_id: str) -> date:
        pref = await self.preferences_repo.get_or_create(db, user_id=user_id)
        return get_today_date(pref.timezone)

    async def get_entry_or_404(self, db: AsyncSession, user_id: str, entry_id: str) -> DiaryEntry:
        entry = await self.repository.get_by_id(db, user_id=user_id, entry_id=entry_id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Diary entry with id '{entry_id}' not found.",
            )
        return entry

    async def get_entry_by_date(
        self, db: AsyncSession, user_id: str, entry_date: date
    ) -> DiaryEntry | None:
        return await self.repository.get_by_date(db, user_id=user_id, entry_date=entry_date)

    async def create_or_upsert_entry(
        self, db: AsyncSession, user_id: str, data: DiaryEntryCreateInput
    ) -> DiaryEntry:
        today = await self._get_user_today(db, user_id=user_id)
        if data.entry_date < today:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Past diary entries are immutable and cannot be created or modified.",
            )
        return await self.repository.create(db, user_id=user_id, data=data)

    async def update_entry(
        self, db: AsyncSession, user_id: str, entry_id: str, data: DiaryEntryUpdateInput
    ) -> DiaryEntry:
        entry = await self.get_entry_or_404(db, user_id=user_id, entry_id=entry_id)
        today = await self._get_user_today(db, user_id=user_id)
        if entry.entry_date < today:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Past diary entries are immutable and cannot be modified.",
            )
        return await self.repository.update(db, entry=entry, data=data)

    async def delete_entry(self, db: AsyncSession, user_id: str, entry_id: str) -> None:
        entry = await self.get_entry_or_404(db, user_id=user_id, entry_id=entry_id)
        today = await self._get_user_today(db, user_id=user_id)
        if entry.entry_date < today:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Past diary entries are immutable and cannot be deleted.",
            )
        await self.repository.delete(db, entry=entry)

    async def list_entries(
        self,
        db: AsyncSession,
        user_id: str,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[DiaryEntry], int]:
        return await self.repository.list_entries(
            db=db,
            user_id=user_id,
            search=search,
            limit=limit,
            offset=offset,
        )

    async def reflect_on_entry(
        self,
        db: AsyncSession,
        user_id: str,
        entry_id: str,
    ) -> DiaryReflectionResponse:
        """
        Explicitly triggers an AI reflection for ONLY the designated diary entry.
        Guaranteed non-clinical, gentle, and reflective.
        """
        entry = await self.get_entry_or_404(db, user_id=user_id, entry_id=entry_id)

        try:
            provider = get_llm_provider()
        except Exception as e:
            logger.warning("LLM provider misconfigured for diary reflection: %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM provider is not configured. Reflection requires a configured provider.",
            ) from e

        if not provider:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM provider is not configured. Reflection requires a configured provider.",
            )

        prompt = (
            f"Date: {entry.entry_date.isoformat()}\n"
            f"Title: {entry.title or 'Untitled'}\n"
            f"Mood: {entry.mood or 'Unspecified'}\n\n"
            f"Content:\n{entry.content}\n\n"
            "Offer a quiet, grounding, non-clinical reflection on this entry."
        )

        try:
            reflection_schema: DiaryReflectionSchema = await provider.generate_structured(
                prompt=prompt,
                response_schema=DiaryReflectionSchema,
                system_instruction=(
                    "You are a quiet, reassuring nocturnal presence in The Moon Room sanctuary. "
                    "Offer gentle, poetic, and compassionate reflection. "
                    "Never evaluate mental health disorders, never diagnose, and never give clinical prescriptions."
                ),
                temperature=0.3,
            )

            reflection_dict = reflection_schema.model_dump()
            await self.repository.save_reflection(db, entry=entry, reflection_data=reflection_dict)

            return DiaryReflectionResponse(
                reflection=reflection_schema.reflection,
                themes=reflection_schema.themes,
                gentle_questions=reflection_schema.gentle_questions,
            )
        except Exception as e:
            logger.warning("Diary reflection failed for entry %s: %s", entry_id, type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not generate reflection at this time.",
            ) from e
