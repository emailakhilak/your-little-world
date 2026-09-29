from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NoteCreateInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    content: str = Field(..., min_length=1)
    tags: list[str] = Field(default_factory=list)
    category: str = Field(default="idea")  # "idea", "thought", "snippet", "reminder", "project"
    is_pinned: bool = Field(default=False)


class NoteUpdateInput(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    content: str | None = Field(default=None, min_length=1)
    tags: list[str] | None = None
    category: str | None = None
    is_pinned: bool | None = None
    is_archived: bool | None = None


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    content: str
    tags: list[str]
    category: str
    is_pinned: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class NoteListResponse(BaseModel):
    items: list[NoteResponse]
    total: int
    pinned_count: int
    archived_count: int


class NoteAISuggestionResponse(BaseModel):
    suggested_category: str
    suggested_tags: list[str]
