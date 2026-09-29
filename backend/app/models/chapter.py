import uuid
from typing import Any

from sqlalchemy import JSON, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class StoryChapter(Base, TimestampMixin):
    """
    Represents an overarching narrative chapter of personal or technical growth
    in The Storybook.
    """

    __tablename__ = "story_chapters"

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
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    period: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )  # e.g., "Spring 2026", "Foundational Years"
    order_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    milestones: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    reflections: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    __table_args__ = (Index("ix_story_chapters_user_order", "user_id", "order_index"),)
