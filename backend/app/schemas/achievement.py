from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

AchievementCategory = Literal["milestone", "goal", "recurring", "progress", "personal"]
AchievementSourceType = Literal["goal", "goal_instance", "system"]


class AchievementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    user_id: str
    milestone_key: str
    title: str
    description: str
    category: str
    icon: str
    source_type: str | None = None
    source_id: str | None = None
    metadata: dict[str, Any] | None = Field(
        default=None,
        validation_alias="metadata_json",
        serialization_alias="metadata",
    )
    achieved_at: datetime
    created_at: datetime


class AchievementListResponse(BaseModel):
    items: list[AchievementResponse]
    total: int
