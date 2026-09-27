import logging
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import Achievement
from app.models.goal import Goal
from app.models.goal_instance import GoalInstance
from app.repositories.achievement_repository import AchievementRepository

logger = logging.getLogger(__name__)


class AchievementService:
    """
    Dedicated service evaluating and awarding durable milestone achievements.
    Ensures idempotent creation, user isolation, and decoupling from HTTP routes.
    """

    def __init__(self, repository: AchievementRepository | None = None):
        self.repository = repository or AchievementRepository()

    async def get_achievement_or_404(
        self, db: AsyncSession, achievement_id: str, user_id: str
    ) -> Achievement:
        """Fetch a specific achievement ensuring strict user ownership; 404 if missing or foreign."""
        achievement = await self.repository.get_by_id(db, achievement_id, user_id)
        if not achievement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Achievement with id '{achievement_id}' not found.",
            )
        return achievement

    async def list_achievements(
        self, db: AsyncSession, user_id: str, category: str | None = None
    ) -> list[Achievement]:
        """Return list of achievements earned by the user, ordered newest first."""
        return await self.repository.list_achievements(db, user_id, category=category)

    async def _award_milestone(
        self,
        db: AsyncSession,
        user_id: str,
        milestone_key: str,
        title: str,
        description: str,
        category: str,
        icon: str,
        source_type: str | None = None,
        source_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Achievement | None:
        """
        Idempotently awards an achievement to a user.
        If the user has already earned this milestone, it safely returns None without duplicating.
        Handles concurrent race conditions via database uniqueness constraints.
        """
        # Fast read check
        existing = await self.repository.get_by_milestone_key(db, user_id, milestone_key)
        if existing:
            return None

        try:
            achievement = await self.repository.create(
                db=db,
                user_id=user_id,
                milestone_key=milestone_key,
                title=title,
                description=description,
                category=category,
                icon=icon,
                source_type=source_type,
                source_id=source_id,
                metadata=metadata,
            )
            logger.info(f"Earned milestone: User '{user_id}' unlocked '{title}' ({milestone_key})")
            return achievement
        except IntegrityError:
            # Another process or concurrent request already committed this milestone
            await db.rollback()
            logger.debug(f"Milestone '{milestone_key}' already recorded for user '{user_id}'.")
            return None

    async def evaluate_goal_milestones(
        self, db: AsyncSession, user_id: str, completed_goal: Goal
    ) -> list[Achievement]:
        """
        Evaluates deterministic milestones after a goal is completed or updated.
        Supports:
        - First Step (1 completed goal)
        - Five Little Steps (5 completed goals)
        - A Growing Path (10 completed goals)
        - Something Finished (major non-binary goal reaching 100%)
        """
        awarded: list[Achievement] = []

        # 1. Total completed goals count
        count_stmt = select(func.count(Goal.id)).where(
            Goal.user_id == user_id,
            Goal.status == "completed",
        )
        count_res = await db.execute(count_stmt)
        total_completed = count_res.scalar() or 0

        # A. First Goal Milestone
        if total_completed >= 1:
            ach = await self._award_milestone(
                db=db,
                user_id=user_id,
                milestone_key="first_goal",
                title="First Step",
                description="You completed your first goal.",
                category="milestone",
                icon="🌱",
                source_type="goal",
                source_id=completed_goal.id,
            )
            if ach:
                awarded.append(ach)

        # B. Five Goals Milestone
        if total_completed >= 5:
            ach = await self._award_milestone(
                db=db,
                user_id=user_id,
                milestone_key="completed_5_goals",
                title="Five Little Steps",
                description="You completed five goals.",
                category="milestone",
                icon="🌿",
                source_type="goal",
                source_id=completed_goal.id,
            )
            if ach:
                awarded.append(ach)

        # C. Ten Goals Milestone
        if total_completed >= 10:
            ach = await self._award_milestone(
                db=db,
                user_id=user_id,
                milestone_key="completed_10_goals",
                title="A Growing Path",
                description="You completed ten goals.",
                category="milestone",
                icon="🌳",
                source_type="goal",
                source_id=completed_goal.id,
            )
            if ach:
                awarded.append(ach)

        # G. Major Goal Milestone: meaningful progress target (>1) reaching 100%
        if (
            completed_goal.progress_target > 1
            and completed_goal.progress_current >= completed_goal.progress_target
        ):
            ach = await self._award_milestone(
                db=db,
                user_id=user_id,
                milestone_key=f"major_goal_{completed_goal.id}",
                title="Something Finished",
                description="You brought an important intention to completion.",
                category="progress",
                icon="✨",
                source_type="goal",
                source_id=completed_goal.id,
                metadata={
                    "progress_target": completed_goal.progress_target,
                    "progress_current": completed_goal.progress_current,
                },
            )
            if ach:
                awarded.append(ach)

        return awarded

    async def evaluate_recurring_milestones(
        self,
        db: AsyncSession,
        user_id: str,
        completed_instance: GoalInstance,
        parent_goal: Goal | None = None,
    ) -> list[Achievement]:
        """
        Evaluates deterministic milestones after a recurring goal instance is completed.
        Supports:
        - Rhythm Found (1 completed recurring instance)
        - A Gentle Rhythm (4 completed recurring instances)
        - A Month Remembered (first completed monthly recurring instance)
        """
        awarded: list[Achievement] = []

        # 1. Total completed occurrences count
        count_stmt = select(func.count(GoalInstance.id)).where(
            GoalInstance.user_id == user_id,
            GoalInstance.status == "completed",
        )
        count_res = await db.execute(count_stmt)
        total_occurrences = count_res.scalar() or 0

        # D. First Recurring Goal Completion
        if total_occurrences >= 1:
            ach = await self._award_milestone(
                db=db,
                user_id=user_id,
                milestone_key="first_recurring_instance",
                title="Rhythm Found",
                description="You completed a recurring intention for the first time.",
                category="recurring",
                icon="🪴",
                source_type="goal_instance",
                source_id=completed_instance.id,
            )
            if ach:
                awarded.append(ach)

        # E. Four Recurring Occurrences
        if total_occurrences >= 4:
            ach = await self._award_milestone(
                db=db,
                user_id=user_id,
                milestone_key="completed_4_recurring_instances",
                title="A Gentle Rhythm",
                description="You completed four recurring intentions.",
                category="recurring",
                icon="🌸",
                source_type="goal_instance",
                source_id=completed_instance.id,
            )
            if ach:
                awarded.append(ach)

        # F. First Monthly Recurring Goal
        if parent_goal is None and completed_instance.goal_id:
            parent_goal = await db.get(Goal, completed_instance.goal_id)

        if parent_goal and parent_goal.recurrence_cadence == "monthly":
            ach = await self._award_milestone(
                db=db,
                user_id=user_id,
                milestone_key="first_monthly_instance",
                title="A Month Remembered",
                description="You completed your first monthly intention.",
                category="recurring",
                icon="🌙",
                source_type="goal_instance",
                source_id=completed_instance.id,
            )
            if ach:
                awarded.append(ach)

        return awarded
