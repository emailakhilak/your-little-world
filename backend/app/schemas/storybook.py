from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# ============================================================================
# PROJECT SCHEMAS
# ============================================================================


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    status: str = Field(default="in_progress", max_length=50)
    technologies: list[str] = Field(default_factory=list)
    github_url: str | None = None
    live_url: str | None = None
    start_date: date | None = None
    completion_date: date | None = None
    lessons_learned: str | None = None
    is_featured: bool = False
    order_index: int = 0


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    status: str | None = None
    technologies: list[str] | None = None
    github_url: str | None = None
    live_url: str | None = None
    start_date: date | None = None
    completion_date: date | None = None
    lessons_learned: str | None = None
    is_featured: bool | None = None
    order_index: int | None = None


class ProjectResponse(ProjectBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int = 0


# ============================================================================
# STORY CHAPTER SCHEMAS
# ============================================================================


class StoryChapterBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    period: str | None = None
    order_index: int = 0
    milestones: list[dict[str, Any]] = Field(default_factory=list)
    reflections: str | None = None


class StoryChapterCreate(StoryChapterBase):
    pass


class StoryChapterUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    period: str | None = None
    order_index: int | None = None
    milestones: list[dict[str, Any]] | None = None
    reflections: str | None = None


class StoryChapterResponse(StoryChapterBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StoryChapterListResponse(BaseModel):
    items: list[StoryChapterResponse]
    total: int = 0


# ============================================================================
# STORYBOOK OVERVIEW & PORTFOLIO
# ============================================================================


class StorybookAchievementItem(BaseModel):
    id: str
    key: str
    title: str
    description: str
    icon: str
    category: str
    unlocked_at: datetime


class StorybookOverviewResponse(BaseModel):
    projects_count: int
    completed_projects_count: int
    featured_projects_count: int
    chapters_count: int
    achievements_earned_count: int
    featured_projects: list[ProjectResponse]
    recent_chapters: list[StoryChapterResponse]
    earned_achievements: list[StorybookAchievementItem]
    all_technologies: list[str]
