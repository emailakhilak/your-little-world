"""
Recurrence Calculation Engine for Your Little World.

Handles calculation of recurring goal periods, scheduled dates,
month-end clamping, and idempotency period keys across daily, weekly,
and monthly cadences. Completely isolated from database dependencies
for pure unit testability.
"""

import calendar
from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal

from app.core.timezone import get_timezone, get_today_date

RecurrenceType = Literal["daily", "weekly", "monthly", "none"]


@dataclass(frozen=True)
class RecurrencePeriod:
    """Represents a calculated recurrence window and scheduled date."""

    period_key: str
    scheduled_date: date
    cadence: str


class RecurrenceCalculator:
    """Calculates due occurrences and idempotency keys for recurring goals."""

    @staticmethod
    def get_period_key(cadence: str, target_date: date) -> str:
        """
        Generates an idempotent string identifier for a given cadence and date.
        - daily: '2026-09-27'
        - weekly: '2026-W39' (ISO year and week number)
        - monthly: '2026-09' (YYYY-MM)
        """
        cadence_lower = cadence.lower().strip()
        if cadence_lower == "daily":
            return target_date.isoformat()
        elif cadence_lower == "weekly":
            year, week, _ = target_date.isocalendar()
            return f"{year}-W{week:02d}"
        elif cadence_lower == "monthly":
            return f"{target_date.year:04d}-{target_date.month:02d}"
        else:
            return target_date.isoformat()

    @classmethod
    def calculate_scheduled_date(
        cls,
        cadence: str,
        reference_date: date,
        anchor_day_of_month: int | None = None,
        anchor_weekday: int | None = None,
    ) -> date:
        """
        Calculates the canonical scheduled date for a period, handling
        month-end edge cases (e.g. 31st in a 30-day or 28-day month).
        """
        cadence_lower = cadence.lower().strip()

        if cadence_lower == "daily":
            return reference_date

        elif cadence_lower == "weekly":
            # Schedule on the Monday of the reference week (or specified anchor weekday)
            target_weekday = anchor_weekday if anchor_weekday is not None else 0  # Monday = 0
            current_weekday = reference_date.weekday()
            days_diff = target_weekday - current_weekday
            # If target day is in the same ISO week
            return reference_date.fromordinal(reference_date.toordinal() + days_diff)

        elif cadence_lower == "monthly":
            year = reference_date.year
            month = reference_date.month
            _, max_days = calendar.monthrange(year, month)

            # If anchor day given (e.g. created on the 31st), clamp to month max days
            if anchor_day_of_month:
                day = min(anchor_day_of_month, max_days)
            else:
                day = min(reference_date.day, max_days)

            return date(year, month, day)

        return reference_date

    @classmethod
    def get_current_period(
        cls,
        cadence: str | None,
        created_at: datetime,
        tz_name: str | None = None,
        as_of: datetime | date | None = None,
    ) -> RecurrencePeriod | None:
        """
        Determines the current due recurrence period for a goal.
        Returns None if the goal is not recurring (cadence is None or 'none').
        """
        if not cadence or cadence.lower().strip() in ("none", ""):
            return None

        cadence_lower = cadence.lower().strip()
        if cadence_lower not in ("daily", "weekly", "monthly"):
            return None

        # Resolve local reference date
        if as_of is None:
            ref_date = get_today_date(tz_name)
        elif isinstance(as_of, datetime):
            tz = get_timezone(tz_name)
            if as_of.tzinfo is None:
                as_of = as_of.replace(tzinfo=tz)
            else:
                as_of = as_of.astimezone(tz)
            ref_date = as_of.date()
        else:
            ref_date = as_of

        # Resolve anchor from creation date in user timezone
        tz = get_timezone(tz_name)
        created_local = (
            created_at.astimezone(tz) if created_at.tzinfo else created_at.replace(tzinfo=tz)
        )
        created_date = created_local.date()

        # Do not generate occurrences before the goal was created
        if ref_date < created_date:
            return None

        period_key = cls.get_period_key(cadence_lower, ref_date)
        scheduled_date = cls.calculate_scheduled_date(
            cadence=cadence_lower,
            reference_date=ref_date,
            anchor_day_of_month=created_date.day,
            anchor_weekday=created_date.weekday(),
        )

        return RecurrencePeriod(
            period_key=period_key,
            scheduled_date=scheduled_date,
            cadence=cadence_lower,
        )
