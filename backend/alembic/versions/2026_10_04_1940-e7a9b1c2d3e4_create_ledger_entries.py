"""create_ledger_entries

Revision ID: e7a9b1c2d3e4
Revises: d6f19d6a714f
Create Date: 2026-10-04 19:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e7a9b1c2d3e4"
down_revision: str | None = "d6f19d6a714f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=128), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ledger_entries_user_id", "ledger_entries", ["user_id"], unique=False)
    op.create_index("ix_ledger_entries_entry_date", "ledger_entries", ["entry_date"], unique=False)
    op.create_index(
        "ix_ledger_entries_user_date",
        "ledger_entries",
        ["user_id", "entry_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ledger_entries_user_date", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_entry_date", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_user_id", table_name="ledger_entries")
    op.drop_table("ledger_entries")
