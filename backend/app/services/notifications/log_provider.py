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
    Development and logging adapter for garden reminders.
    Emits formatted log events and maintains an observable in-memory history
    for inspection and testing without external push services.
    """

    def __init__(self):
        self.dispatched_history: list[NotificationPayload] = []

    async def send(self, payload: NotificationPayload) -> NotificationResult:
        logger.info(
            f"🌿 [GARDEN REMINDER DISPATCHED] "
            f"Goal: '{payload.title}' | Message: '{payload.message}' | "
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


# Shared singleton instance for application use
default_notification_provider = LogNotificationProvider()
