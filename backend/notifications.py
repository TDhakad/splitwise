import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone

from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from . import models, schemas

_subscribers: dict[int, set[asyncio.Queue[dict]]] = defaultdict(set)


def serialize_notification(notification: models.Notification) -> dict:
    return schemas.Notification.model_validate(notification).model_dump(mode="json")


async def create_notification(
    db: AsyncSession,
    user_id: int,
    type: str,
    actor_user_id: int | None,
    target_type: str,
    target_id: int | None,
    payload: dict | None = None,
) -> models.Notification:
    notification = models.Notification(
        user_id=user_id,
        type=type,
        actor_user_id=actor_user_id,
        target_type=target_type,
        target_id=target_id,
        payload=payload or {},
    )
    db.add(notification)
    await db.flush()
    await publish_notification(notification)
    return notification


async def publish_notification(notification: models.Notification) -> None:
    event = serialize_notification(notification)
    stale_queues = []
    for queue in list(_subscribers.get(notification.user_id, set())):
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            stale_queues.append(queue)
    for queue in stale_queues:
        _subscribers[notification.user_id].discard(queue)


def notification_stream_response(user_id: int, initial: list[models.Notification]):
    queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=50)
    _subscribers[user_id].add(queue)

    async def event_generator():
        try:
            for notification in initial:
                yield _format_sse("notification", serialize_notification(notification))

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20)
                    yield _format_sse("notification", event)
                except asyncio.TimeoutError:
                    yield _format_sse("heartbeat", {"at": datetime.now(timezone.utc).isoformat()})
        finally:
            _subscribers[user_id].discard(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
