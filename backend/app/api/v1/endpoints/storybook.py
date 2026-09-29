import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserClaims, get_current_user
from app.schemas.storybook import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
    StorybookOverviewResponse,
    StoryChapterCreate,
    StoryChapterListResponse,
    StoryChapterResponse,
    StoryChapterUpdate,
)
from app.services.storybook_service import StorybookService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/storybook", tags=["Storybook"])


def get_storybook_service() -> StorybookService:
    return StorybookService()


@router.get("/overview", response_model=StorybookOverviewResponse)
async def get_storybook_overview(
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    """
    Returns an aggregated overview of projects, story chapters, and earned Garden achievements.
    """
    return await service.get_overview(db, user.user_id)


# ============================================================================
# PROJECTS ENDPOINTS
# ============================================================================


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
    status: str | None = None,
    featured_only: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items = await service.list_projects(
        db, user.user_id, status=status, featured_only=featured_only, limit=limit, offset=offset
    )
    return ProjectListResponse(
        items=[ProjectResponse.model_validate(p) for p in items], total=len(items)
    )


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    project = await service.create_project(db, user.user_id, data)
    return ProjectResponse.model_validate(project)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    project = await service.get_project(db, user.user_id, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse.model_validate(project)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    project = await service.update_project(db, user.user_id, project_id, data)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse.model_validate(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    deleted = await service.delete_project(db, user.user_id, project_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


@router.post("/projects/{project_id}/featured", response_model=ProjectResponse)
async def toggle_project_featured(
    project_id: str,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    project = await service.toggle_featured(db, user.user_id, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse.model_validate(project)


# ============================================================================
# CHAPTERS ENDPOINTS
# ============================================================================


@router.get("/chapters", response_model=StoryChapterListResponse)
async def list_chapters(
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items = await service.list_chapters(db, user.user_id, limit=limit, offset=offset)
    return StoryChapterListResponse(
        items=[StoryChapterResponse.model_validate(c) for c in items], total=len(items)
    )


@router.post("/chapters", response_model=StoryChapterResponse, status_code=status.HTTP_201_CREATED)
async def create_chapter(
    data: StoryChapterCreate,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    chapter = await service.create_chapter(db, user.user_id, data)
    return StoryChapterResponse.model_validate(chapter)


@router.get("/chapters/{chapter_id}", response_model=StoryChapterResponse)
async def get_chapter(
    chapter_id: str,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    chapter = await service.get_chapter(db, user.user_id, chapter_id)
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story chapter not found")
    return StoryChapterResponse.model_validate(chapter)


@router.put("/chapters/{chapter_id}", response_model=StoryChapterResponse)
async def update_chapter(
    chapter_id: str,
    data: StoryChapterUpdate,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    chapter = await service.update_chapter(db, user.user_id, chapter_id, data)
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story chapter not found")
    return StoryChapterResponse.model_validate(chapter)


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(
    chapter_id: str,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[StorybookService, Depends(get_storybook_service)],
):
    deleted = await service.delete_chapter(db, user.user_id, chapter_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story chapter not found")
