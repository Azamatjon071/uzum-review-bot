"""
Admin router: broadcast messages (with optional image) to all or filtered users.
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_permission
from app.models import User, AdminUser
from app.services.audit import AuditService
from app.services.storage import StorageService
from app.tasks.notifications import send_broadcast_message, send_broadcast_photo

router = APIRouter(prefix="/admin/broadcast", tags=["admin-broadcast"])


@router.post("")
async def broadcast(
    message: str = Form(...),
    language: Optional[str] = Form(None),
    is_banned: bool = Form(False),
    limit: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_permission("broadcast.write")),
):
    """Queue a Telegram message (with optional image) to all or filtered users."""
    if not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(message) > 4096:
        raise HTTPException(status_code=400, detail="Message too long (max 4096 chars)")

    # Upload image to MinIO if provided
    image_url: str | None = None
    if image and image.filename:
        contents = await image.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large (max 10 MB)")
        storage = StorageService()
        object_name = f"broadcasts/{uuid.uuid4().hex}_{image.filename}"
        await storage.upload_image(contents, object_name, content_type=image.content_type or "image/jpeg")
        image_url = storage.get_presigned_url(object_name, expires=60 * 60 * 24 * 7)  # 7-day URL

    # Build recipient query
    query = select(User.telegram_id).where(User.is_banned == is_banned)
    if language:
        query = query.where(User.language == language)
    if limit:
        query = query.limit(min(limit, 100_000))

    result = await db.execute(query)
    telegram_ids = [row[0] for row in result.fetchall()]

    # Queue individual Celery tasks
    for tg_id in telegram_ids:
        if image_url:
            send_broadcast_photo.delay(tg_id, image_url, message)
        else:
            send_broadcast_message.delay(tg_id, message)

    audit = AuditService(db)
    await audit.log(
        action="broadcast.sent",
        resource_type="broadcast",
        admin_id=admin.id,
        after_data={
            "recipients": len(telegram_ids),
            "language_filter": language,
            "has_image": image_url is not None,
            "preview": message[:100],
        },
    )

    return {
        "queued": len(telegram_ids),
        "message": f"Broadcast queued for {len(telegram_ids)} users.",
        "has_image": image_url is not None,
    }
