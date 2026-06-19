import datetime


def as_naive_utc(value: datetime.datetime | None) -> datetime.datetime | None:
    if value is None or value.tzinfo is None:
        return value
    return value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
