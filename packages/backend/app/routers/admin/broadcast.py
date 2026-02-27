"""
Admin router: broadcast messages to all or filtered users.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_permission
from app.models import User, AdminUser
from app.services.audit import AuditService
from app.tasks.notifications import send_broadcast_message

router = APIRouter(prefix="/admin/broadcast", tags=["admin-broadcast"])


class BroadcastRequest(BaseModel):
    message: str
    language: Optional[str] = None        # "uz" | "ru" | "en" | None = all
    is_banned: bool = False                # include banned users?
    limit: Optional[int] = None           # max recipients (safety cap)


class BroadcastResponse(BaseModel):
    queued: int
    message: str


@router.post("", response_model=BroadcastResponse)
async def broadcast(
    body: BroadcastRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_permission("broadcast.write")),
):
    """Queue a Telegram message to all (or filtered) users."""
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(body.message) > 4096:
        raise HTTPException(status_code=400, detail="Message too long (max 4096 chars)")

    query = select(User.telegram_id).where(User.is_banned == body.is_banned)
    if body.language:
        query = query.where(User.language == body.language)
    if body.limit:
        query = query.limit(min(body.limit, 100_000))

    result = await db.execute(query)
    telegram_ids = [row[0] for row in result.fetchall()]

    # Queue individual tasks — Celery handles retries
    for tg_id in telegram_ids:
        send_broadcast_message.delay(tg_id, body.message)

    audit = AuditService(db)
    await audit.log(
        action="broadcast.sent",
        resource_type="broadcast",
        admin_id=admin.id,
        after_data={
            "recipients": len(telegram_ids),
            "language_filter": body.language,
            "preview": body.message[:100],
        },
    )

    return BroadcastResponse(
        queued=len(telegram_ids),
        message=f"Broadcast queued for {len(telegram_ids)} users.",
    )
