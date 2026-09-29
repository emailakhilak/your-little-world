import logging
from datetime import date

from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.diary import DiaryEntry
from app.schemas.diary import DiaryEntryCreateInput, DiaryEntryUpdateInput

logger = logging.getLogger(__name__)


class DiaryRepository:
    """Repository handling private diary storage with strict user isolation."""

    async def get_by_date(
        self, db: AsyncSession, user_id: str, entry_date: date
    ) -> DiaryEntry | None:
        stmt = select(DiaryEntry).where(
            DiaryEntry.user_id == user_id, DiaryEntry.entry_date == entry_date
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def get_by_id(self, db: AsyncSession, user_id: str, entry_id: str) -> DiaryEntry | None:
        stmt = select(DiaryEntry).where(DiaryEntry.user_id == user_id, DiaryEntry.id == entry_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def create(
        self, db: AsyncSession, user_id: str, data: DiaryEntryCreateInput
    ) -> DiaryEntry:
        # Check if entry already exists for this date; if so, update content
        existing = await self.get_by_date(db, user_id=user_id, entry_date=data.entry_date)
        if existing:
            existing.title = data.title.strip() if data.title else existing.title
            existing.content = data.content.strip()
            if data.mood is not None:
                existing.mood = data.mood
            await db.commit()
            await db.refresh(existing)
            return existing

        entry = DiaryEntry(
            user_id=user_id,
            entry_date=data.entry_date,
            title=data.title.strip() if data.title else None,
            content=data.content.strip(),
            mood=data.mood,
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    async def update(
        self, db: AsyncSession, entry: DiaryEntry, data: DiaryEntryUpdateInput
    ) -> DiaryEntry:
        if data.title is not None:
            entry.title = data.title.strip() if data.title else None
        if data.content is not None:
            entry.content = data.content.strip()
        if data.mood is not None:
            entry.mood = data.mood

        await db.commit()
        await db.refresh(entry)
        return entry

    async def save_reflection(
        self, db: AsyncSession, entry: DiaryEntry, reflection_data: dict
    ) -> DiaryEntry:
        entry.reflection_json = reflection_data
        await db.commit()
        await db.refresh(entry)
        return entry

    async def delete(self, db: AsyncSession, entry: DiaryEntry) -> None:
        await db.delete(entry)
        await db.commit()

    async def list_entries(
        self,
        db: AsyncSession,
        user_id: str,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[DiaryEntry], int]:
        query = select(DiaryEntry).where(DiaryEntry.user_id == user_id)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(or_(DiaryEntry.title.ilike(term), DiaryEntry.content.ilike(term)))

        count_res = await db.execute(query)
        total = len(count_res.scalars().all())

        query = query.order_by(desc(DiaryEntry.entry_date)).limit(limit).offset(offset)
        result = await db.execute(query)
        return list(result.scalars().all()), total
