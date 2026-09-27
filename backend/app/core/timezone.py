"""
Centralized Timezone Service for Your Little World.

Enforces explicit timezone handling across all goal recurrence,
scheduling, and reminder calculations. Defaults to Asia/Kolkata
in local development when no explicit user preference is supplied.
"""

import logging
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger(__name__)

DEFAULT_TIMEZONE = "Asia/Kolkata"


def get_timezone(tz_name: str | None = None) -> ZoneInfo:
    """
    Safely resolves a ZoneInfo object from an IANA timezone string.
    Falls back to DEFAULT_TIMEZONE ('Asia/Kolkata') if tz_name is None,
    empty, or invalid.
    """
    if not tz_name or not tz_name.strip():
        return ZoneInfo(DEFAULT_TIMEZONE)

    clean_name = tz_name.strip()
    try:
        return ZoneInfo(clean_name)
    except ZoneInfoNotFoundError:
        logger.warning(
            f"Invalid timezone '{clean_name}' requested. Falling back to default '{DEFAULT_TIMEZONE}'."
        )
        return ZoneInfo(DEFAULT_TIMEZONE)


def now_utc() -> datetime:
    """Returns the current timezone-aware UTC datetime."""
    return datetime.now(UTC)


def now_in_timezone(tz_name: str | None = None) -> datetime:
    """Returns the current datetime converted to the requested timezone (default: Asia/Kolkata)."""
    tz = get_timezone(tz_name)
    return datetime.now(tz)


def get_today_date(tz_name: str | None = None) -> date:
    """Returns the local calendar date in the specified timezone."""
    return now_in_timezone(tz_name).date()


def to_utc(dt: datetime) -> datetime:
    """
    Ensures a datetime is timezone-aware and normalized to UTC.
    If naive, assumes it is already in UTC.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def to_timezone(dt: datetime, tz_name: str | None = None) -> datetime:
    """Converts any datetime to the specified timezone."""
    tz = get_timezone(tz_name)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(tz)
