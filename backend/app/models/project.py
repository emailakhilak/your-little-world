import uuid
from datetime import date

from sqlalchemy import JSON, Boolean, Date, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Project(Base, TimestampMixin):
    """
    Represents an engineering or creative project logged in The Storybook.
    """

    __tablename__ = "projects"

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
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="in_progress",
    )  # "in_progress", "completed", "archived", "concept"
    technologies: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    github_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    live_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    start_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )
    completion_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )
    lessons_learned: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    is_featured: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )
    order_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    __table_args__ = (
        Index("ix_projects_user_status", "user_id", "status"),
        Index("ix_projects_user_featured", "user_id", "is_featured"),
        Index("ix_projects_user_order", "user_id", "order_index"),
    )
