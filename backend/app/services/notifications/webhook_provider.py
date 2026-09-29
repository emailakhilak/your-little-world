import logging
from typing import Any

import httpx

from app.core.timezone import now_utc
from app.services.notifications.base import (
    BaseNotificationProvider,
    NotificationPayload,
    NotificationResult,
)

logger = logging.getLogger("your_little_world.notifications.webhook")


class WebhookNotificationProvider(BaseNotificationProvider):
    """
    Production-ready webhook notification adapter.
    Dispatches notifications via HTTP POST to a designated webhook URL
    (e.g., n8n, Slack, Discord webhook, or custom mobile push gateway).
    """

    def __init__(self, webhook_url: str | None = None, timeout_seconds: float = 10.0):
        self.webhook_url = webhook_url
        self.timeout_seconds = timeout_seconds

    async def send(self, payload: NotificationPayload) -> NotificationResult:
        if not self.webhook_url:
            logger.warning(
                "Webhook notification provider invoked, but no webhook URL is configured."
            )
            return NotificationResult(
                success=False,
                provider="webhook",
                delivered_at=now_utc(),
                error="Webhook URL is not configured.",
            )

        data: dict[str, Any] = {
            "user_id": payload.user_id,
            "title": payload.title,
            "message": payload.message,
            "notification_type": payload.notification_type,
            "channel": payload.channel,
            "scheduled_time": payload.scheduled_time,
            "timezone": payload.timezone,
            "metadata": payload.metadata,
        }
        if payload.reminder_id:
            data["reminder_id"] = payload.reminder_id
        if payload.goal_id:
            data["goal_id"] = payload.goal_id
        if payload.edition_id:
            data["edition_id"] = payload.edition_id

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(self.webhook_url, json=data)
                response.raise_for_status()

            return NotificationResult(
                success=True,
                provider="webhook",
                delivered_at=now_utc(),
            )
        except Exception as exc:
            logger.warning(f"Failed to deliver notification via webhook: {exc}")
            return NotificationResult(
                success=False,
                provider="webhook",
                delivered_at=now_utc(),
                error=str(exc),
            )
