from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.scheduler import garden_scheduler
from app.core.security import UserClaims, get_current_user
from app.schemas.goal import GoalCreate, GoalListResponse, GoalResponse, GoalUpdate
from app.schemas.goal_instance import (
    GoalInstanceListResponse,
    GoalInstanceResponse,
)
from app.schemas.reminder import (
    ReminderCreate,
    ReminderListResponse,
    ReminderResponse,
    ReminderUpdate,
)
from app.services.goal_instance_service import GoalInstanceService
from app.services.goal_service import GoalService
from app.services.reminder_service import ReminderService

router = APIRouter()
goal_service = GoalService()
instance_service = GoalInstanceService()
reminder_service = ReminderService()


# ---------------------------------------------------------------------------
# Recurring Goal Instances & Scheduler Endpoints (Static prefixes first)
# ---------------------------------------------------------------------------


@router.get(
    "/instances",
    response_model=GoalInstanceListResponse,
    summary="List goal occurrences for current user",
)
async def list_user_instances(
    goal_id: str | None = Query(default=None, description="Filter by parent goal ID"),
    status_filter: str | None = Query(
        default=None, alias="status", description="Filter by status ('active', 'completed')"
    ),
    scheduled_date: date | None = Query(
        default=None, alias="date", description="Filter by scheduled calendar date"
    ),
    auto_generate: bool = Query(
        default=True, description="Automatically generate any newly due instances"
    ),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoalInstanceListResponse:
    """List goal occurrences. Automatically ensures due recurring instances are present."""
    if auto_generate:
        await instance_service.generate_due_instances(db, user_id=current_user.user_id)

    return await instance_service.list_instances(
        db,
        user_id=current_user.user_id,
        goal_id=goal_id,
        status_filter=status_filter,
        scheduled_date=scheduled_date,
    )


@router.post(
    "/instances/generate",
    response_model=list[GoalInstanceResponse],
    summary="Generate due recurring goal instances",
)
async def generate_due_instances(
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GoalInstanceResponse]:
    """Manually trigger due recurring goal occurrence generation for current user."""
    instances = await instance_service.generate_due_instances(db, user_id=current_user.user_id)
    return [GoalInstanceResponse.model_validate(i) for i in instances]


@router.patch(
    "/instances/{instance_id}/complete",
    response_model=GoalInstanceResponse,
    summary="Toggle recurring goal instance completion",
)
async def toggle_instance_complete(
    instance_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoalInstanceResponse:
    """
    Toggle completion for a specific occurrence without completing or archiving
    the parent recurring goal.
    """
    return await instance_service.toggle_complete(
        db, instance_id=instance_id, user_id=current_user.user_id
    )


@router.post(
    "/scheduler/run",
    summary="Trigger scheduler pass manually",
)
async def trigger_scheduler_pass(
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Manually run a full scheduler pass (instance generation + reminder dispatch)."""
    return await garden_scheduler.run_jobs(db)


# ---------------------------------------------------------------------------
# Reminder Endpoints (Static prefixes)
# ---------------------------------------------------------------------------


@router.patch(
    "/reminders/{reminder_id}",
    response_model=ReminderResponse,
    summary="Update reminder configuration",
)
async def update_reminder(
    reminder_id: str,
    data: ReminderUpdate,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReminderResponse:
    """Update settings (time, timezone, enabled) for a reminder."""
    return await reminder_service.update_reminder(
        db, user_id=current_user.user_id, reminder_id=reminder_id, data=data
    )


@router.delete(
    "/reminders/{reminder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a reminder",
)
async def delete_reminder(
    reminder_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a reminder."""
    await reminder_service.delete_reminder(
        db, user_id=current_user.user_id, reminder_id=reminder_id
    )


# ---------------------------------------------------------------------------
# Core Goals Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new goal or intention",
)
async def create_goal(
    data: GoalCreate,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoalResponse:
    """Create a new goal planted in the Garden of Tomorrow."""
    goal_res = await goal_service.create_goal(db, user_id=current_user.user_id, data=data)
    # If recurring, immediately ensure initial instance is generated
    if data.recurrence_cadence and data.recurrence_cadence != "none":
        await instance_service.generate_due_instances(db, user_id=current_user.user_id)
    return goal_res


@router.get(
    "",
    response_model=GoalListResponse,
    summary="List all goals for current user",
)
async def list_goals(
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Filter by status: 'active', 'completed', 'archived'",
    ),
    category_filter: str | None = Query(
        default=None,
        alias="category",
        description="Filter by category e.g. 'seedling', 'habit', 'milestone', 'aspiration'",
    ),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoalListResponse:
    """List goals belonging strictly to the authenticated user."""
    return await goal_service.list_goals(
        db,
        user_id=current_user.user_id,
        status=status_filter,
        category=category_filter,
    )


@router.get(
    "/{goal_id}",
    response_model=GoalResponse,
    summary="Get single goal details",
)
async def get_goal(
    goal_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoalResponse:
    """Fetch details of a single goal belonging to the authenticated user."""
    goal = await goal_service.get_goal_or_404(db, goal_id=goal_id, user_id=current_user.user_id)
    return GoalResponse.model_validate(goal)


@router.patch(
    "/{goal_id}",
    response_model=GoalResponse,
    summary="Update goal details or status",
)
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoalResponse:
    """Update editable fields of a user's goal."""
    updated = await goal_service.update_goal(
        db, goal_id=goal_id, user_id=current_user.user_id, data=data
    )
    if data.recurrence_cadence and data.recurrence_cadence != "none":
        await instance_service.generate_due_instances(db, user_id=current_user.user_id)
    return updated


@router.patch(
    "/{goal_id}/complete",
    response_model=GoalResponse,
    summary="Toggle goal completion status",
)
async def toggle_goal_complete(
    goal_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoalResponse:
    """Toggle a goal between active and completed status."""
    return await goal_service.toggle_complete(db, goal_id=goal_id, user_id=current_user.user_id)


@router.patch(
    "/{goal_id}/archive",
    response_model=GoalResponse,
    summary="Archive a goal",
)
async def archive_goal(
    goal_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoalResponse:
    """Move a goal to archived status (resting in soil)."""
    return await goal_service.archive_goal(db, goal_id=goal_id, user_id=current_user.user_id)


@router.delete(
    "/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete a goal",
)
async def delete_goal(
    goal_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently delete a goal."""
    await goal_service.delete_goal(db, goal_id=goal_id, user_id=current_user.user_id)


# ---------------------------------------------------------------------------
# Goal Reminders & Instances Nested by Goal ID
# ---------------------------------------------------------------------------


@router.post(
    "/{goal_id}/reminders",
    response_model=ReminderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a reminder for a goal",
)
async def create_reminder_for_goal(
    goal_id: str,
    data: ReminderCreate,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReminderResponse:
    """Attach a reminder to a user's goal."""
    return await reminder_service.create_reminder(
        db, user_id=current_user.user_id, goal_id=goal_id, data=data
    )


@router.get(
    "/{goal_id}/reminders",
    response_model=ReminderListResponse,
    summary="List reminders for a goal",
)
async def list_reminders_for_goal(
    goal_id: str,
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReminderListResponse:
    """List reminders attached to a goal."""
    return await reminder_service.list_reminders(db, user_id=current_user.user_id, goal_id=goal_id)


@router.get(
    "/{goal_id}/instances",
    response_model=GoalInstanceListResponse,
    summary="List occurrences for a specific goal",
)
async def list_instances_for_goal(
    goal_id: str,
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: UserClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoalInstanceListResponse:
    """List occurrences for a specific goal."""
    # Ensure goal belongs to user
    await goal_service.get_goal_or_404(db, goal_id=goal_id, user_id=current_user.user_id)
    return await instance_service.list_instances(
        db,
        user_id=current_user.user_id,
        goal_id=goal_id,
        status_filter=status_filter,
    )
