from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.services.recurrence import RecurrenceCalculator


def test_daily_recurrence_calculation():
    """Daily recurrence generates period key equal to YYYY-MM-DD."""
    created_at = datetime(2026, 9, 20, 10, 0, tzinfo=ZoneInfo("UTC"))
    as_of = date(2026, 9, 27)

    period = RecurrenceCalculator.get_current_period(
        cadence="daily",
        created_at=created_at,
        tz_name="Asia/Kolkata",
        as_of=as_of,
    )
    assert period is not None
    assert period.period_key == "2026-09-27"
    assert period.scheduled_date == date(2026, 9, 27)
    assert period.cadence == "daily"


def test_weekly_recurrence_calculation():
    """Weekly recurrence generates ISO week period key 'YYYY-Wxx'."""
    created_at = datetime(2026, 9, 1, 10, 0, tzinfo=ZoneInfo("UTC"))
    as_of = date(2026, 9, 27)  # Sunday of week 39

    period = RecurrenceCalculator.get_current_period(
        cadence="weekly",
        created_at=created_at,
        tz_name="Asia/Kolkata",
        as_of=as_of,
    )
    assert period is not None
    assert period.period_key == "2026-W39"
    assert period.cadence == "weekly"


def test_monthly_recurrence_and_month_end_clamping():
    """
    Monthly recurrence on 31st clamps properly to 28th/29th in Feb
    and 30th in Apr, preventing month-end calendar overflow errors.
    """
    # Goal created on Jan 31st
    created_at = datetime(2026, 1, 31, 12, 0, tzinfo=ZoneInfo("UTC"))

    # In February (28 days in 2026 non-leap year)
    feb_period = RecurrenceCalculator.get_current_period(
        cadence="monthly",
        created_at=created_at,
        tz_name="Asia/Kolkata",
        as_of=date(2026, 2, 15),
    )
    assert feb_period is not None
    assert feb_period.period_key == "2026-02"
    assert feb_period.scheduled_date == date(2026, 2, 28)

    # In April (30 days)
    apr_period = RecurrenceCalculator.get_current_period(
        cadence="monthly",
        created_at=created_at,
        tz_name="Asia/Kolkata",
        as_of=date(2026, 4, 10),
    )
    assert apr_period is not None
    assert apr_period.period_key == "2026-04"
    assert apr_period.scheduled_date == date(2026, 4, 30)

    # In March (31 days)
    mar_period = RecurrenceCalculator.get_current_period(
        cadence="monthly",
        created_at=created_at,
        tz_name="Asia/Kolkata",
        as_of=date(2026, 3, 5),
    )
    assert mar_period is not None
    assert mar_period.period_key == "2026-03"
    assert mar_period.scheduled_date == date(2026, 3, 31)


def test_no_recurrence_returns_none():
    """Cadence of None, empty string, or 'none' returns None."""
    created_at = datetime(2026, 9, 20, 10, 0, tzinfo=ZoneInfo("UTC"))

    assert RecurrenceCalculator.get_current_period(None, created_at) is None
    assert RecurrenceCalculator.get_current_period("none", created_at) is None
    assert RecurrenceCalculator.get_current_period("", created_at) is None


def test_no_future_occurrences_before_creation():
    """Does not generate an occurrence if as_of date is prior to goal creation date."""
    created_at = datetime(2026, 10, 1, 10, 0, tzinfo=ZoneInfo("UTC"))
    as_of = date(2026, 9, 27)

    period = RecurrenceCalculator.get_current_period(
        cadence="daily",
        created_at=created_at,
        tz_name="Asia/Kolkata",
        as_of=as_of,
    )
    assert period is None
