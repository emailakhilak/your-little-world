from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NewsSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    base_url: str
    feed_url: str
    source_type: str
    category: str
    is_enabled: bool
    reliability_metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class NewsSourceListResponse(BaseModel):
    items: list[NewsSourceResponse]
    total: int


class NewsArticleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_id: str
    source_name: str | None = None
    external_id: str | None = None
    canonical_url: str
    title: str
    description: str | None = None
    url: str
    author: str | None = None
    published_at: datetime | None = None
    fetched_at: datetime
    image_url: str | None = None
    category: str
    created_at: datetime
    updated_at: datetime


class NewsArticleListResponse(BaseModel):
    items: list[NewsArticleResponse]
    total: int
    limit: int
    offset: int


class IngestionSourceStat(BaseModel):
    source_id: str
    source_name: str
    category: str
    status: str  # "success" | "error"
    articles_seen: int = 0
    articles_added: int = 0
    articles_skipped: int = 0
    error_message: str | None = None


class IngestionStatsResponse(BaseModel):
    sources_processed: int
    articles_seen: int
    articles_added: int
    articles_skipped: int
    errors: list[str] = Field(default_factory=list)
    source_details: list[IngestionSourceStat] = Field(default_factory=list)
