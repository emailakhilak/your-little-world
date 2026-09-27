from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class NotificationPayload:
    """Standardized payload for reminder notifications."""

    reminder_id: str
    goal_id: str
    user_id: str
    title: str
    message: str
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
    """Abstract contract for delivering garden reminders."""

    @abstractmethod
    async def send(self, payload: NotificationPayload) -> NotificationResult:
        """Deliver the notification payload through the specific provider channel."""
        pass
