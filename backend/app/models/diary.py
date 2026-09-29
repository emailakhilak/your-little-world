import uuid
from datetime import date
from typing import Any

from sqlalchemy import JSON, Date, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class DiaryEntry(Base, TimestampMixin):
    """
    Private reflective diary record in The Moon Room.
    Guaranteed user-isolated and never exposed without explicit authorization.
    """

    __tablename__ = "diary_entries"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        index=True,
    )
    entry_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    mood: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )  # e.g. "quiet", "reflective", "hopeful", "heavy", "inspired", "peaceful"
    reflection_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "entry_date", name="uq_user_diary_entry_date"),
        Index("ix_diary_entries_user_date", "user_id", "entry_date"),
    )
