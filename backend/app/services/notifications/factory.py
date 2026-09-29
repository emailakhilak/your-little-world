import logging

from app.core.config import settings
from app.services.notifications.base import BaseNotificationProvider
from app.services.notifications.log_provider import (
    default_notification_provider,
)
from app.services.notifications.webhook_provider import WebhookNotificationProvider

logger = logging.getLogger("your_little_world.notifications.factory")


def get_notification_provider(provider_type: str | None = None) -> BaseNotificationProvider:
    """
    Factory resolving the appropriate notification provider implementation.
    Defaults to LogNotificationProvider for local development and testing.
    When configured with 'webhook', routes dispatches to WebhookNotificationProvider.
    """
    provider_name = (provider_type or settings.NOTIFICATION_PROVIDER or "log").strip().lower()

    if provider_name == "webhook":
        return WebhookNotificationProvider(webhook_url=settings.NOTIFICATION_WEBHOOK_URL)
    elif provider_name == "log":
        return default_notification_provider
    else:
        logger.warning(
            f"Unknown notification provider '{provider_name}'; falling back to LogNotificationProvider."
        )
        return default_notification_provider
