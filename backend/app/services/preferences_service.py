import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_preference import UserPreference
from app.repositories.preferences_repository import PreferencesRepository
from app.schemas.preferences import UserPreferenceUpdate

logger = logging.getLogger(__name__)


class PreferencesService:
    """Service handling user world preferences, timezones, and notifications settings."""

    def __init__(self, repo: PreferencesRepository | None = None):
        self.repo = repo or PreferencesRepository()

    async def get_preferences(self, db: AsyncSession, user_id: str) -> UserPreference:
        return await self.repo.get_or_create(db, user_id)

    async def update_preferences(
        self, db: AsyncSession, user_id: str, data: UserPreferenceUpdate
    ) -> UserPreference:
        return await self.repo.update(db, user_id, data)
