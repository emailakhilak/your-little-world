from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class LedgerEntryCreateInput(BaseModel):
    entry_date: date = Field(..., description="Date for the ledger entry (YYYY-MM-DD)")
    content: str = Field(..., min_length=1, max_length=10000, description="Personal money diary text")


class LedgerEntryUpdateInput(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000, description="Updated money diary text")


class LedgerEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    entry_date: date
    content: str
    created_at: datetime
    updated_at: datetime


class LedgerEntryListResponse(BaseModel):
    items: list[LedgerEntryResponse]
    total: int
