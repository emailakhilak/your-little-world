from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserPreferenceBase(BaseModel):
    display_name: str | None = Field(None, max_length=100)
    timezone: str = Field(default="Asia/Kolkata", max_length=100)
    news_daily_update: bool = True
    news_update_time: str = Field(default="20:00", max_length=10)
    notifications_enabled: bool = True
    notification_channels: list[str] = Field(default_factory=lambda: ["log"])
    reduced_motion: bool = False


class UserPreferenceUpdate(BaseModel):
    display_name: str | None = None
    timezone: str | None = None
    news_daily_update: bool | None = None
    news_update_time: str | None = None
    notifications_enabled: bool | None = None
    notification_channels: list[str] | None = None
    reduced_motion: bool | None = None


class UserPreferenceResponse(UserPreferenceBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
