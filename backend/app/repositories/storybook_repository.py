import logging

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chapter import StoryChapter
from app.models.project import Project
from app.schemas.storybook import (
    ProjectCreate,
    ProjectUpdate,
    StoryChapterCreate,
    StoryChapterUpdate,
)

logger = logging.getLogger(__name__)


class ProjectRepository:
    """Data access repository for Storybook Projects with strict user isolation."""

    async def create(self, db: AsyncSession, user_id: str, data: ProjectCreate) -> Project:
        project = Project(
            user_id=user_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            status=data.status,
            technologies=[t.strip() for t in data.technologies if t.strip()],
            github_url=data.github_url.strip() if data.github_url else None,
            live_url=data.live_url.strip() if data.live_url else None,
            start_date=data.start_date,
            completion_date=data.completion_date,
            lessons_learned=data.lessons_learned.strip() if data.lessons_learned else None,
            is_featured=data.is_featured,
            order_index=data.order_index,
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    async def get_by_id(self, db: AsyncSession, user_id: str, project_id: str) -> Project | None:
        stmt = select(Project).where(Project.user_id == user_id, Project.id == project_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def update(self, db: AsyncSession, project: Project, data: ProjectUpdate) -> Project:
        if data.title is not None:
            project.title = data.title.strip()
        if data.description is not None:
            project.description = data.description.strip() if data.description else None
        if data.status is not None:
            project.status = data.status
        if data.technologies is not None:
            project.technologies = [t.strip() for t in data.technologies if t.strip()]
        if data.github_url is not None:
            project.github_url = data.github_url.strip() if data.github_url else None
        if data.live_url is not None:
            project.live_url = data.live_url.strip() if data.live_url else None
        if data.start_date is not None:
            project.start_date = data.start_date
        if data.completion_date is not None:
            project.completion_date = data.completion_date
        if data.lessons_learned is not None:
            project.lessons_learned = data.lessons_learned.strip() if data.lessons_learned else None
        if data.is_featured is not None:
            project.is_featured = data.is_featured
        if data.order_index is not None:
            project.order_index = data.order_index

        await db.commit()
        await db.refresh(project)
        return project

    async def delete(self, db: AsyncSession, project: Project) -> None:
        await db.delete(project)
        await db.commit()

    async def list_projects(
        self,
        db: AsyncSession,
        user_id: str,
        status: str | None = None,
        featured_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Project]:
        query = select(Project).where(Project.user_id == user_id)
        if status:
            query = query.where(Project.status == status)
        if featured_only:
            query = query.where(Project.is_featured.is_(True))

        query = (
            query.order_index_or_created
            if hasattr(Project, "order_index_or_created")
            else query.order_by(Project.order_index.asc(), desc(Project.created_at))
        )
        query = query.limit(limit).offset(offset)
        result = await db.execute(query)
        return list(result.scalars().all())


class ChapterRepository:
    """Data access repository for Story Chapters with strict user isolation."""

    async def create(
        self, db: AsyncSession, user_id: str, data: StoryChapterCreate
    ) -> StoryChapter:
        chapter = StoryChapter(
            user_id=user_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            period=data.period.strip() if data.period else None,
            order_index=data.order_index,
            milestones=data.milestones,
            reflections=data.reflections.strip() if data.reflections else None,
        )
        db.add(chapter)
        await db.commit()
        await db.refresh(chapter)
        return chapter

    async def get_by_id(
        self, db: AsyncSession, user_id: str, chapter_id: str
    ) -> StoryChapter | None:
        stmt = select(StoryChapter).where(
            StoryChapter.user_id == user_id, StoryChapter.id == chapter_id
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def update(
        self, db: AsyncSession, chapter: StoryChapter, data: StoryChapterUpdate
    ) -> StoryChapter:
        if data.title is not None:
            chapter.title = data.title.strip()
        if data.description is not None:
            chapter.description = data.description.strip() if data.description else None
        if data.period is not None:
            chapter.period = data.period.strip() if data.period else None
        if data.order_index is not None:
            chapter.order_index = data.order_index
        if data.milestones is not None:
            chapter.milestones = data.milestones
        if data.reflections is not None:
            chapter.reflections = data.reflections.strip() if data.reflections else None

        await db.commit()
        await db.refresh(chapter)
        return chapter

    async def delete(self, db: AsyncSession, chapter: StoryChapter) -> None:
        await db.delete(chapter)
        await db.commit()

    async def list_chapters(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[StoryChapter]:
        query = (
            select(StoryChapter)
            .where(StoryChapter.user_id == user_id)
            .order_by(StoryChapter.order_index.asc(), desc(StoryChapter.created_at))
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(query)
        return list(result.scalars().all())
