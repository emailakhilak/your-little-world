import logging
from datetime import date

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ledger import LedgerEntry
from app.schemas.ledger import LedgerEntryCreateInput, LedgerEntryUpdateInput

logger = logging.getLogger(__name__)


class LedgerRepository:
    """Repository handling private money diary records with strict user isolation."""

    async def get_by_date(
        self, db: AsyncSession, user_id: str, entry_date: date
    ) -> LedgerEntry | None:
        stmt = (
            select(LedgerEntry)
            .where(LedgerEntry.user_id == user_id, LedgerEntry.entry_date == entry_date)
            .order_by(desc(LedgerEntry.created_at))
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def get_by_id(
        self, db: AsyncSession, user_id: str, entry_id: str
    ) -> LedgerEntry | None:
        stmt = select(LedgerEntry).where(
            LedgerEntry.user_id == user_id, LedgerEntry.id == entry_id
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def list_entries(
        self, db: AsyncSession, user_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[LedgerEntry], int]:
        count_stmt = (
            select(func.count(LedgerEntry.id))
            .where(LedgerEntry.user_id == user_id)
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = (
            select(LedgerEntry)
            .where(LedgerEntry.user_id == user_id)
            .order_by(desc(LedgerEntry.entry_date), desc(LedgerEntry.created_at))
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def create(
        self, db: AsyncSession, user_id: str, data: LedgerEntryCreateInput
    ) -> LedgerEntry:
        # Check if an entry already exists for this date; if so, update content cleanly
        existing = await self.get_by_date(db, user_id=user_id, entry_date=data.entry_date)
        if existing:
            existing.content = data.content.strip()
            await db.commit()
            await db.refresh(existing)
            return existing

        entry = LedgerEntry(
            user_id=user_id,
            entry_date=data.entry_date,
            content=data.content.strip(),
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    async def update(
        self, db: AsyncSession, user_id: str, entry_id: str, data: LedgerEntryUpdateInput
    ) -> LedgerEntry | None:
        entry = await self.get_by_id(db, user_id=user_id, entry_id=entry_id)
        if not entry:
            return None

        entry.content = data.content.strip()
        await db.commit()
        await db.refresh(entry)
        return entry

    async def delete(self, db: AsyncSession, user_id: str, entry_id: str) -> bool:
        entry = await self.get_by_id(db, user_id=user_id, entry_id=entry_id)
        if not entry:
            return False

        await db.delete(entry)
        await db.commit()
        return True
