from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

GoalCategory = Literal[
    "seedling", "habit", "milestone", "aspiration", "deep-work", "creative", "custom"
]
GoalStatus = Literal["active", "completed", "archived"]
GoalPriority = Literal["low", "normal", "high"]
GoalCadence = Literal["daily", "weekly", "monthly", "yearly"]


class GoalBase(BaseModel):
    title: str = Field(
        ..., min_length=1, max_length=200, description="Title of the goal or intention"
    )
    description: str | None = Field(
        default=None, max_length=2000, description="Optional cozy description or notes"
    )
    category: str = Field(default="seedling", max_length=50, description="Goal type or category")
    icon: str = Field(
        default="🌱", max_length=10, description="Botanical or whimsical emblem emoji"
    )
    priority: str = Field(default="normal", max_length=20, description="Priority level")
    target_date: datetime | None = Field(
        default=None, description="Optional target or deadline date"
    )
    progress_current: int = Field(default=0, ge=0, description="Current progress counter")
    progress_target: int = Field(default=1, ge=1, description="Target progress milestone")
    recurrence_cadence: str | None = Field(
        default=None, max_length=50, description="Optional recurring cadence"
    )


class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    category: str = Field(default="seedling", max_length=50)
    icon: str = Field(default="🌱", max_length=10)
    priority: str = Field(default="normal", max_length=20)
    target_date: datetime | None = None
    progress_current: int = Field(default=0, ge=0)
    progress_target: int = Field(default=1, ge=1)
    recurrence_cadence: str | None = Field(default=None, max_length=50)


class GoalUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    category: str | None = Field(default=None, max_length=50)
    status: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=10)
    priority: str | None = Field(default=None, max_length=20)
    target_date: datetime | None = None
    progress_current: int | None = Field(default=None, ge=0)
    progress_target: int | None = Field(default=None, ge=1)
    recurrence_cadence: str | None = Field(default=None, max_length=50)


class GoalStatusUpdate(BaseModel):
    status: Literal["active", "completed", "archived"]


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    description: str | None
    category: str
    status: str
    icon: str
    priority: str
    target_date: datetime | None
    completed_at: datetime | None
    archived_at: datetime | None
    progress_current: int
    progress_target: int
    recurrence_cadence: str | None
    created_at: datetime
    updated_at: datetime


class GoalListResponse(BaseModel):
    items: list[GoalResponse]
    total: int
    active_count: int
    completed_count: int
    archived_count: int


class GoalBulkDeleteRequest(BaseModel):
    goal_ids: list[str] = Field(
        default_factory=list, description="List of goal IDs to permanently remove"
    )


class GoalBulkDeleteResponse(BaseModel):
    deleted_count: int
    deleted_ids: list[str]

