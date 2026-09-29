import uuid

from sqlalchemy import JSON, Boolean, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class UserPreference(Base, TimestampMixin):
    """
    Stores individual user settings and world preferences.
    """

    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )
    display_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    timezone: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Asia/Kolkata",
    )
    news_daily_update: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    news_update_time: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="20:00",
    )
    notifications_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    notification_channels: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: ["log"],
    )
    reduced_motion: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    __table_args__ = (Index("ix_user_preferences_user_id", "user_id"),)
