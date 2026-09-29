import logging

from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.note import Note
from app.schemas.note import NoteCreateInput, NoteUpdateInput

logger = logging.getLogger(__name__)


class NoteRepository:
    """Data access repository for Little Attic notes, enforcing strict user isolation."""

    async def create(self, db: AsyncSession, user_id: str, data: NoteCreateInput) -> Note:
        note = Note(
            user_id=user_id,
            title=data.title.strip(),
            content=data.content.strip(),
            tags=[t.strip().lower() for t in data.tags if t.strip()],
            category=data.category,
            is_pinned=data.is_pinned,
            is_archived=False,
        )
        db.add(note)
        await db.commit()
        await db.refresh(note)
        return note

    async def get_by_id(self, db: AsyncSession, user_id: str, note_id: str) -> Note | None:
        stmt = select(Note).where(Note.user_id == user_id, Note.id == note_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def update(self, db: AsyncSession, note: Note, data: NoteUpdateInput) -> Note:
        if data.title is not None:
            note.title = data.title.strip()
        if data.content is not None:
            note.content = data.content.strip()
        if data.tags is not None:
            note.tags = [t.strip().lower() for t in data.tags if t.strip()]
        if data.category is not None:
            note.category = data.category
        if data.is_pinned is not None:
            note.is_pinned = data.is_pinned
        if data.is_archived is not None:
            note.is_archived = data.is_archived

        await db.commit()
        await db.refresh(note)
        return note

    async def delete(self, db: AsyncSession, note: Note) -> None:
        await db.delete(note)
        await db.commit()

    async def list_notes(
        self,
        db: AsyncSession,
        user_id: str,
        category: str | None = None,
        is_archived: bool = False,
        search: str | None = None,
        tag: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Note], int, int, int]:
        """
        List notes matching filters.
        Returns: (items, total_filtered, pinned_count, archived_count)
        """
        base_user_stmt = select(Note).where(Note.user_id == user_id)
        all_res = await db.execute(base_user_stmt)
        all_user_notes = all_res.scalars().all()

        pinned_count = sum(1 for n in all_user_notes if n.is_pinned and not n.is_archived)
        archived_count = sum(1 for n in all_user_notes if n.is_archived)

        query = select(Note).where(Note.user_id == user_id, Note.is_archived == is_archived)

        if category and category != "all":
            query = query.where(Note.category == category)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(or_(Note.title.ilike(term), Note.content.ilike(term)))

        # Ordering: pinned notes first, then updated_at descending
        query = query.order_by(desc(Note.is_pinned), desc(Note.updated_at))

        exec_res = await db.execute(query)
        matching_notes = list(exec_res.scalars().all())

        # Tag filtering in memory if specified
        if tag and tag.strip():
            clean_tag = tag.strip().lower()
            matching_notes = [n for n in matching_notes if clean_tag in [t.lower() for t in n.tags]]

        total = len(matching_notes)
        paginated_items = matching_notes[offset : offset + limit]

        return paginated_items, total, pinned_count, archived_count
