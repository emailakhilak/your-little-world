import logging

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import Achievement
from app.models.chapter import StoryChapter
from app.models.project import Project
from app.repositories.storybook_repository import ChapterRepository, ProjectRepository
from app.schemas.storybook import (
    ProjectCreate,
    ProjectUpdate,
    StorybookAchievementItem,
    StorybookOverviewResponse,
    StoryChapterCreate,
    StoryChapterUpdate,
)

logger = logging.getLogger(__name__)


class StorybookService:
    """Business logic service for Storybook projects, chapters, and personal growth portfolio."""

    def __init__(
        self,
        project_repo: ProjectRepository | None = None,
        chapter_repo: ChapterRepository | None = None,
    ):
        self.project_repo = project_repo or ProjectRepository()
        self.chapter_repo = chapter_repo or ChapterRepository()

    # ========================================================================
    # PROJECTS
    # ========================================================================

    async def create_project(self, db: AsyncSession, user_id: str, data: ProjectCreate) -> Project:
        return await self.project_repo.create(db, user_id, data)

    async def get_project(self, db: AsyncSession, user_id: str, project_id: str) -> Project | None:
        return await self.project_repo.get_by_id(db, user_id, project_id)

    async def update_project(
        self, db: AsyncSession, user_id: str, project_id: str, data: ProjectUpdate
    ) -> Project | None:
        project = await self.project_repo.get_by_id(db, user_id, project_id)
        if not project:
            return None
        return await self.project_repo.update(db, project, data)

    async def delete_project(self, db: AsyncSession, user_id: str, project_id: str) -> bool:
        project = await self.project_repo.get_by_id(db, user_id, project_id)
        if not project:
            return False
        await self.project_repo.delete(db, project)
        return True

    async def toggle_featured(
        self, db: AsyncSession, user_id: str, project_id: str
    ) -> Project | None:
        project = await self.project_repo.get_by_id(db, user_id, project_id)
        if not project:
            return None
        update_data = ProjectUpdate(is_featured=not project.is_featured)
        return await self.project_repo.update(db, project, update_data)

    async def list_projects(
        self,
        db: AsyncSession,
        user_id: str,
        status: str | None = None,
        featured_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Project]:
        return await self.project_repo.list_projects(
            db, user_id, status=status, featured_only=featured_only, limit=limit, offset=offset
        )

    # ========================================================================
    # CHAPTERS
    # ========================================================================

    async def create_chapter(
        self, db: AsyncSession, user_id: str, data: StoryChapterCreate
    ) -> StoryChapter:
        return await self.chapter_repo.create(db, user_id, data)

    async def get_chapter(
        self, db: AsyncSession, user_id: str, chapter_id: str
    ) -> StoryChapter | None:
        return await self.chapter_repo.get_by_id(db, user_id, chapter_id)

    async def update_chapter(
        self, db: AsyncSession, user_id: str, chapter_id: str, data: StoryChapterUpdate
    ) -> StoryChapter | None:
        chapter = await self.chapter_repo.get_by_id(db, user_id, chapter_id)
        if not chapter:
            return None
        return await self.chapter_repo.update(db, chapter, data)

    async def delete_chapter(self, db: AsyncSession, user_id: str, chapter_id: str) -> bool:
        chapter = await self.chapter_repo.get_by_id(db, user_id, chapter_id)
        if not chapter:
            return False
        await self.chapter_repo.delete(db, chapter)
        return True

    async def list_chapters(
        self, db: AsyncSession, user_id: str, limit: int = 50, offset: int = 0
    ) -> list[StoryChapter]:
        return await self.chapter_repo.list_chapters(db, user_id, limit=limit, offset=offset)

    # ========================================================================
    # OVERVIEW & PORTFOLIO INTEGRATION
    # ========================================================================

    async def get_overview(self, db: AsyncSession, user_id: str) -> StorybookOverviewResponse:
        """
        Aggregates projects, narrative chapters, and durable Garden achievements
        into a unified growth portfolio overview without duplicating achievement sources of truth.
        """
        # 1. Projects
        all_projects = await self.project_repo.list_projects(db, user_id, limit=100)
        completed_count = sum(1 for p in all_projects if p.status == "completed")
        featured_projects = [p for p in all_projects if p.is_featured]

        # Gather distinct technologies across all projects
        tech_set: set[str] = set()
        for p in all_projects:
            if isinstance(p.technologies, list):
                for t in p.technologies:
                    if t and isinstance(t, str):
                        tech_set.add(t.strip())

        # 2. Chapters
        chapters = await self.chapter_repo.list_chapters(db, user_id, limit=20)

        # 3. Earned achievements (from Garden source of truth)
        achieve_stmt = (
            select(Achievement)
            .where(Achievement.user_id == user_id)
            .order_by(desc(Achievement.achieved_at))
            .limit(50)
        )
        achieve_res = await db.execute(achieve_stmt)
        earned_achievements_models = achieve_res.scalars().all()

        achievement_items = [
            StorybookAchievementItem(
                id=a.id,
                key=a.milestone_key,
                title=a.title,
                description=a.description,
                icon=a.icon,
                category=a.category,
                unlocked_at=a.achieved_at,
            )
            for a in earned_achievements_models
        ]

        return StorybookOverviewResponse(
            projects_count=len(all_projects),
            completed_projects_count=completed_count,
            featured_projects_count=len(featured_projects),
            chapters_count=len(chapters),
            achievements_earned_count=len(achievement_items),
            featured_projects=featured_projects,
            recent_chapters=chapters,
            earned_achievements=achievement_items,
            all_technologies=sorted(list(tech_set)),
        )
