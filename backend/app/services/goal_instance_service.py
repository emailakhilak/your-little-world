import logging
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import now_utc
from app.models.goal import Goal
from app.models.goal_instance import GoalInstance
from app.repositories.goal_instance_repository import GoalInstanceRepository
from app.schemas.goal_instance import (
    GoalInstanceListResponse,
    GoalInstanceResponse,
)
from app.services.recurrence import RecurrenceCalculator

logger = logging.getLogger(__name__)


class GoalInstanceService:
    """Service handling recurring goal instance generation, listing, and completion."""

    def __init__(self, repository: GoalInstanceRepository | None = None):
        self.repository = repository or GoalInstanceRepository()

    async def get_instance_or_404(
        self, db: AsyncSession, instance_id: str, user_id: str
    ) -> GoalInstance:
        """Fetch instance strictly verifying user ownership; 404 if missing or unauthorized."""
        instance = await self.repository.get_by_id(db, instance_id, user_id)
        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Goal occurrence with id '{instance_id}' not found.",
            )
        return instance

    async def list_instances(
        self,
        db: AsyncSession,
        user_id: str,
        goal_id: str | None = None,
        status_filter: str | None = None,
        scheduled_date: date | None = None,
    ) -> GoalInstanceListResponse:
        """List goal occurrences belonging strictly to the user."""
        instances = await self.repository.list_instances(
            db,
            user_id=user_id,
            goal_id=goal_id,
            status=status_filter,
            scheduled_date=scheduled_date,
        )
        return GoalInstanceListResponse(
            items=[GoalInstanceResponse.model_validate(inst) for inst in instances],
            total=len(instances),
        )

    async def toggle_complete(
        self, db: AsyncSession, instance_id: str, user_id: str
    ) -> GoalInstanceResponse:
        """
        Toggles completion for a specific recurring instance.
        Crucially: does NOT complete or archive the parent recurring goal!
        """
        instance = await self.get_instance_or_404(db, instance_id, user_id)
        updates = {}

        if instance.status == "completed":
            updates["status"] = "active"
            updates["completed_at"] = None
        else:
            updates["status"] = "completed"
            updates["completed_at"] = now_utc()

        updated = await self.repository.update(db, instance, updates)
        return GoalInstanceResponse.model_validate(updated)

    async def generate_due_instances(
        self,
        db: AsyncSession,
        user_id: str | None = None,
        as_of: datetime | date | None = None,
    ) -> list[GoalInstance]:
        """
        Idempotently generates due occurrences for active recurring goals.
        Safe to run repeatedly; uses database unique constraints to guarantee no duplicates.
        """
        # Fetch active recurring goals
        query = select(Goal).where(
            Goal.status == "active",
            Goal.recurrence_cadence != None,  # noqa: E711
            Goal.recurrence_cadence != "none",
            Goal.recurrence_cadence != "",
        )
        if user_id:
            query = query.where(Goal.user_id == user_id)

        result = await db.execute(query)
        goals = result.scalars().all()

        generated: list[GoalInstance] = []

        for goal in goals:
            period = RecurrenceCalculator.get_current_period(
                cadence=goal.recurrence_cadence,
                created_at=goal.created_at,
                tz_name="Asia/Kolkata",
                as_of=as_of,
            )
            if not period:
                continue

            # Check if this period instance already exists
            existing = await self.repository.get_by_goal_and_period(db, goal.id, period.period_key)
            if existing:
                continue

            try:
                instance = await self.repository.create(
                    db=db,
                    goal_id=goal.id,
                    user_id=goal.user_id,
                    period_key=period.period_key,
                    scheduled_date=period.scheduled_date,
                    status="active",
                    notes=f"Occurrence for {period.period_key}",
                )
                generated.append(instance)
                logger.info(
                    f"Planted recurring occurrence: Goal '{goal.title}' | Period '{period.period_key}'"
                )
            except IntegrityError:
                # Concurrent race condition or already exists; rollback and ignore
                await db.rollback()
                logger.debug(
                    f"Occurrence for goal {goal.id} period {period.period_key} already existed."
                )

        return generated
