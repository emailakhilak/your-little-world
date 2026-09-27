from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
from app.repositories.goal_repository import GoalRepository
from app.schemas.goal import GoalCreate, GoalListResponse, GoalResponse, GoalUpdate
from app.services.achievement_service import AchievementService


class GoalService:
    """Service encapsulating goal business logic, validations, and ownership enforcement."""

    def __init__(
        self,
        repository: GoalRepository | None = None,
        achievement_service: AchievementService | None = None,
    ):
        self.repository = repository or GoalRepository()
        self.achievement_service = achievement_service or AchievementService()

    async def get_goal_or_404(self, db: AsyncSession, goal_id: str, user_id: str) -> Goal:
        """Retrieve goal ensuring strict user isolation; raise 404 if not found or unauthorized."""
        goal = await self.repository.get_by_id(db, goal_id=goal_id, user_id=user_id)
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Goal with id '{goal_id}' not found.",
            )
        return goal

    async def list_goals(
        self,
        db: AsyncSession,
        user_id: str,
        status: str | None = None,
        category: str | None = None,
    ) -> GoalListResponse:
        """Fetch list of user's goals along with status summary counts."""
        goals = await self.repository.list_goals(
            db, user_id=user_id, status=status, category=category
        )
        counts = await self.repository.get_user_counts(db, user_id=user_id)

        return GoalListResponse(
            items=[GoalResponse.model_validate(g) for g in goals],
            total=counts["total"],
            active_count=counts["active"],
            completed_count=counts["completed"],
            archived_count=counts["archived"],
        )

    async def create_goal(self, db: AsyncSession, user_id: str, data: GoalCreate) -> GoalResponse:
        """Create a new goal for the authenticated user."""
        goal = await self.repository.create(db, user_id=user_id, data=data)
        return GoalResponse.model_validate(goal)

    async def update_goal(
        self, db: AsyncSession, goal_id: str, user_id: str, data: GoalUpdate
    ) -> GoalResponse:
        """Update fields of an existing goal with state transition logic."""
        goal = await self.get_goal_or_404(db, goal_id, user_id)
        update_dict: dict[str, Any] = data.model_dump(exclude_unset=True)

        # Handle status transitions
        new_status = update_dict.get("status")
        if new_status and new_status != goal.status:
            if new_status == "completed":
                update_dict["completed_at"] = datetime.now(UTC)
                if (
                    update_dict.get("progress_current") is None
                    and goal.progress_current < goal.progress_target
                ):
                    update_dict["progress_current"] = goal.progress_target
            elif new_status == "active":
                update_dict["completed_at"] = None
                update_dict["archived_at"] = None
            elif new_status == "archived":
                update_dict["archived_at"] = datetime.now(UTC)

        # Validate progress if both provided or updated
        prog_curr = update_dict.get("progress_current", goal.progress_current)
        prog_target = update_dict.get("progress_target", goal.progress_target)
        if prog_curr > prog_target and update_dict.get("progress_target") is None:
            # Auto-adjust target if user exceeds without specifying
            update_dict["progress_target"] = prog_curr

        updated_goal = await self.repository.update(db, goal, update_dict)
        if updated_goal.status == "completed":
            await self.achievement_service.evaluate_goal_milestones(db, user_id, updated_goal)

        return GoalResponse.model_validate(updated_goal)

    async def toggle_complete(self, db: AsyncSession, goal_id: str, user_id: str) -> GoalResponse:
        """Toggle active <-> completed for a goal with cozy feedback."""
        goal = await self.get_goal_or_404(db, goal_id, user_id)
        updates: dict[str, Any] = {}

        if goal.status == "completed":
            updates["status"] = "active"
            updates["completed_at"] = None
        else:
            updates["status"] = "completed"
            updates["completed_at"] = datetime.now(UTC)
            updates["progress_current"] = goal.progress_target

        updated_goal = await self.repository.update(db, goal, updates)
        if updated_goal.status == "completed":
            await self.achievement_service.evaluate_goal_milestones(db, user_id, updated_goal)

        return GoalResponse.model_validate(updated_goal)

    async def archive_goal(self, db: AsyncSession, goal_id: str, user_id: str) -> GoalResponse:
        """Archive a goal (move to resting soil)."""
        goal = await self.get_goal_or_404(db, goal_id, user_id)
        updates: dict[str, Any] = {
            "status": "archived",
            "archived_at": datetime.now(UTC),
        }
        updated_goal = await self.repository.update(db, goal, updates)
        return GoalResponse.model_validate(updated_goal)

    async def delete_goal(self, db: AsyncSession, goal_id: str, user_id: str) -> None:
        """Permanently remove a goal."""
        goal = await self.get_goal_or_404(db, goal_id, user_id)
        await self.repository.delete(db, goal)
