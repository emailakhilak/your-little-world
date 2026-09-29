from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class NotificationPayload:
    """Standardized payload for world notifications (garden reminders, daily news dispatches, etc.)."""

    user_id: str = ""
    title: str = ""
    message: str = ""
    reminder_id: str | None = None
    goal_id: str | None = None
    edition_id: str | None = None
    notification_type: str = "reminder"  # "reminder", "news_edition"
    channel: str = "log"
    scheduled_time: str = ""
    timezone: str = "Asia/Kolkata"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class NotificationResult:
    """Result of attempting to dispatch a notification."""

    success: bool
    provider: str
    delivered_at: datetime
    error: str | None = None


class BaseNotificationProvider(ABC):
    """Abstract contract for delivering world notifications."""

    @abstractmethod
    async def send(self, payload: NotificationPayload) -> NotificationResult:
        """Deliver the notification payload through the specific provider channel."""
        pass
