import logging

from app.core.timezone import now_utc
from app.services.notifications.base import (
    BaseNotificationProvider,
    NotificationPayload,
    NotificationResult,
)

logger = logging.getLogger("your_little_world.notifications")


class LogNotificationProvider(BaseNotificationProvider):
    """
    Development and logging adapter for world notifications.
    Emits formatted log events and maintains an observable in-memory history
    for inspection and testing without external push services.
    """

    def __init__(self):
        self.dispatched_history: list[NotificationPayload] = []

    async def send(self, payload: NotificationPayload) -> NotificationResult:
        logger.info(
            f"🌿 [{payload.notification_type.upper()} DISPATCHED] "
            f"Title: '{payload.title}' | Message: '{payload.message}' | "
            f"Scheduled: {payload.scheduled_time} ({payload.timezone}) | "
            f"User: {payload.user_id}"
        )
        self.dispatched_history.append(payload)
        return NotificationResult(
            success=True,
            provider="log_provider",
            delivered_at=now_utc(),
        )

    def clear_history(self) -> None:
        """Helper to reset history between unit tests."""
        self.dispatched_history.clear()

    def get_history_for_user(self, user_id: str) -> list[NotificationPayload]:
        """Filter dispatched notifications for a specific user."""
        return [p for p in self.dispatched_history if p.user_id == user_id]


# Shared singleton instance for application use
default_notification_provider = LogNotificationProvider()
