from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

GoalInstanceStatus = Literal["active", "completed", "skipped"]


class GoalInstanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    goal_id: str
    user_id: str
    period_key: str
    scheduled_date: date
    status: str
    completed_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class GoalInstanceListResponse(BaseModel):
    items: list[GoalInstanceResponse]
    total: int
