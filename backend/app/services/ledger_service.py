import logging
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ledger import LedgerEntry
from app.repositories.ledger_repository import LedgerRepository
from app.schemas.ledger import LedgerEntryCreateInput, LedgerEntryUpdateInput

logger = logging.getLogger(__name__)


class LedgerService:
    """Business logic for The Little Ledger money diary."""

    def __init__(self, repository: LedgerRepository | None = None) -> None:
        self.repository = repository or LedgerRepository()

    async def get_by_date(
        self, db: AsyncSession, user_id: str, entry_date: date
    ) -> LedgerEntry | None:
        return await self.repository.get_by_date(db, user_id=user_id, entry_date=entry_date)

    async def get_by_id(
        self, db: AsyncSession, user_id: str, entry_id: str
    ) -> LedgerEntry | None:
        return await self.repository.get_by_id(db, user_id=user_id, entry_id=entry_id)

    async def list_entries(
        self, db: AsyncSession, user_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[LedgerEntry], int]:
        return await self.repository.list_entries(db, user_id=user_id, limit=limit, offset=offset)

    async def create_entry(
        self, db: AsyncSession, user_id: str, data: LedgerEntryCreateInput
    ) -> LedgerEntry:
        return await self.repository.create(db, user_id=user_id, data=data)

    async def update_entry(
        self, db: AsyncSession, user_id: str, entry_id: str, data: LedgerEntryUpdateInput
    ) -> LedgerEntry | None:
        return await self.repository.update(db, user_id=user_id, entry_id=entry_id, data=data)

    async def delete_entry(
        self, db: AsyncSession, user_id: str, entry_id: str
    ) -> bool:
        return await self.repository.delete(db, user_id=user_id, entry_id=entry_id)
