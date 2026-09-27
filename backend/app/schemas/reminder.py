from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReminderCreate(BaseModel):
    reminder_time: str = Field(
        default="09:00",
        pattern=r"^([01]\d|2[0-3]):([0-5]\d)$",
        description="Time of day in 24-hr format (HH:MM)",
    )
    timezone: str = Field(
        default="Asia/Kolkata",
        max_length=50,
        description="Timezone for evaluating reminder schedule",
    )
    is_enabled: bool = Field(default=True, description="Whether reminder is active")
    channel: str = Field(default="log", max_length=30, description="Delivery channel")


class ReminderUpdate(BaseModel):
    reminder_time: str | None = Field(
        default=None,
        pattern=r"^([01]\d|2[0-3]):([0-5]\d)$",
        description="Time of day in 24-hr format (HH:MM)",
    )
    timezone: str | None = Field(
        default=None,
        max_length=50,
        description="Timezone for evaluating reminder schedule",
    )
    is_enabled: bool | None = None
    channel: str | None = Field(default=None, max_length=30)


class ReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    goal_id: str
    user_id: str
    reminder_time: str
    timezone: str
    is_enabled: bool
    channel: str
    last_triggered_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ReminderListResponse(BaseModel):
    items: list[ReminderResponse]
    total: int
