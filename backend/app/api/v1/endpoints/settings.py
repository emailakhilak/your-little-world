import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import UserClaims, get_current_user
from app.schemas.preferences import UserPreferenceResponse, UserPreferenceUpdate
from app.services.preferences_service import PreferencesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])


def get_preferences_service() -> PreferencesService:
    return PreferencesService()


@router.get("/preferences", response_model=UserPreferenceResponse)
async def get_user_preferences(
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[PreferencesService, Depends(get_preferences_service)],
):
    pref = await service.get_preferences(db, user.user_id)
    return UserPreferenceResponse.model_validate(pref)


@router.put("/preferences", response_model=UserPreferenceResponse)
async def update_user_preferences(
    data: UserPreferenceUpdate,
    user: Annotated[UserClaims, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[PreferencesService, Depends(get_preferences_service)],
):
    pref = await service.update_preferences(db, user.user_id, data)
    return UserPreferenceResponse.model_validate(pref)
