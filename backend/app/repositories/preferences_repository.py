import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_preference import UserPreference
from app.schemas.preferences import UserPreferenceUpdate

logger = logging.getLogger(__name__)


class PreferencesRepository:
    """Data access repository for user world settings with strict user isolation."""

    async def get_or_create(self, db: AsyncSession, user_id: str) -> UserPreference:
        stmt = select(UserPreference).where(UserPreference.user_id == user_id)
        result = await db.execute(stmt)
        pref = result.scalars().first()
        if not pref:
            pref = UserPreference(
                user_id=user_id,
                display_name=None,
                timezone="Asia/Kolkata",
                news_daily_update=True,
                news_update_time="20:00",
                notifications_enabled=True,
                notification_channels=["log"],
                reduced_motion=False,
            )
            db.add(pref)
            await db.commit()
            await db.refresh(pref)
        return pref

    async def update(
        self, db: AsyncSession, user_id: str, data: UserPreferenceUpdate
    ) -> UserPreference:
        pref = await self.get_or_create(db, user_id)

        if data.display_name is not None:
            pref.display_name = data.display_name.strip() if data.display_name else None
        if data.timezone is not None:
            pref.timezone = data.timezone.strip()
        if data.news_daily_update is not None:
            pref.news_daily_update = data.news_daily_update
        if data.news_update_time is not None:
            pref.news_update_time = data.news_update_time.strip()
        if data.notifications_enabled is not None:
            pref.notifications_enabled = data.notifications_enabled
        if data.notification_channels is not None:
            pref.notification_channels = data.notification_channels
        if data.reduced_motion is not None:
            pref.reduced_motion = data.reduced_motion

        await db.commit()
        await db.refresh(pref)
        return pref
