import uuid

from sqlalchemy import JSON, Boolean, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Note(Base, TimestampMixin):
    """
    Represents a fleeting idea, question, research note, or snippet
    stored safely in The Little Attic.
    """

    __tablename__ = "notes"

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
        String(300),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    tags: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="idea",
    )  # "idea", "thought", "snippet", "reminder", "project"
    is_pinned: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    __table_args__ = (
        Index("ix_notes_user_pinned", "user_id", "is_pinned"),
        Index("ix_notes_user_archived", "user_id", "is_archived"),
        Index("ix_notes_user_updated", "user_id", "updated_at"),
    )
