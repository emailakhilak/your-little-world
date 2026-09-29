from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DiaryEntryCreateInput(BaseModel):
    entry_date: date
    title: str | None = Field(default=None, max_length=300)
    content: str = Field(..., min_length=1)
    mood: str | None = Field(default=None, max_length=50)


class DiaryEntryUpdateInput(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    content: str | None = Field(default=None, min_length=1)
    mood: str | None = Field(default=None, max_length=50)


class DiaryReflectionResponse(BaseModel):
    reflection: str
    themes: list[str] = Field(default_factory=list)
    gentle_questions: list[str] = Field(default_factory=list)


class DiaryEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    entry_date: date
    title: str | None = None
    content: str
    mood: str | None = None
    reflection_json: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class DiaryEntryListResponse(BaseModel):
    items: list[DiaryEntryResponse]
    total: int
