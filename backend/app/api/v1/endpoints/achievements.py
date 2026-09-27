from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserClaims, get_current_user
from app.schemas.achievement import AchievementListResponse, AchievementResponse
from app.services.achievement_service import AchievementService

router = APIRouter()
achievement_service = AchievementService()


@router.get("", response_model=AchievementListResponse, summary="List user's milestones")
async def list_achievements(
    category: str | None = Query(
        default=None,
        description="Filter achievements by category (milestone, goal, recurring, progress, personal)",
    ),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AchievementListResponse:
    """Fetch all achievements earned by the authenticated user, ordered newest first."""
    achievements = await achievement_service.list_achievements(
        db=db,
        user_id=current_user.user_id,
        category=category,
    )
    return AchievementListResponse(
        items=[AchievementResponse.model_validate(a) for a in achievements],
        total=len(achievements),
    )


@router.get(
    "/{achievement_id}",
    response_model=AchievementResponse,
    summary="Get single milestone",
)
async def get_achievement(
    achievement_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AchievementResponse:
    """Fetch details for a specific achievement strictly owned by the authenticated user."""
    achievement = await achievement_service.get_achievement_or_404(
        db=db,
        achievement_id=achievement_id,
        user_id=current_user.user_id,
    )
    return AchievementResponse.model_validate(achievement)
