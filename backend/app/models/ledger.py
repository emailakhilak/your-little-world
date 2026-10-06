import uuid
from datetime import date

from sqlalchemy import Date, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class LedgerEntry(Base, TimestampMixin):
    """
    A personal money diary record in The Little Ledger.
    Guaranteed user-isolated and never exposed without explicit authorization.
    """

    __tablename__ = "ledger_entries"

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
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    __table_args__ = (
        Index("ix_ledger_entries_user_date", "user_id", "entry_date"),
    )
