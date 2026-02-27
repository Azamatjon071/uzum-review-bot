import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_, desc

from app.database import get_db
from app.deps import get_current_admin, require_permission
from app.models import (
    Submission, SubmissionStatus, SubmissionImage, User,
    Notification, NotificationType
)
from app.services.storage import StorageService
from app.services.audit import AuditService
from app.tasks.notifications import notify_submission_approved, notify_submission_rejected

router = APIRouter(prefix="/admin/submissions", tags=["admin-submissions"])
storage = StorageService()


class ApproveRequest(BaseModel):
    pass


class RejectRequest(BaseModel):
    reason: str


class BulkActionRequest(BaseModel):
    ids: List[uuid.UUID]
    action: str  # approve / reject
    reason: Optional[str] = None


from pydantic import BaseModel


@router.get("")
async def list_submissions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin=Depends(require_permission("view_submissions")),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    filters = []
    if status:
        filters.append(Submission.status == status)

    query = select(Submission).order_by(desc(Submission.created_at)).offset(offset).limit(limit)
    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    submissions = result.scalars().all()

    count_q = select(func.count(Submission.id))
    if filters:
        count_q = count_q.where(and_(*filters))
    total = (await db.execute(count_q)).scalar()

    items = []
    for s in submissions:
        user_r = await db.execute(select(User).where(User.id == s.user_id))
        user = user_r.scalar_one_or_none()
        img_r = await db.execute(select(SubmissionImage).where(SubmissionImage.submission_id == s.id))
        imgs = img_r.scalars().all()

        items.append({
            "id": str(s.id),
            "status": s.status.value,
            "spin_granted": s.spin_granted,
            "order_number": s.order_number,
            "review_text": s.review_text,
            "rejection_reason": s.rejection_reason,
            "created_at": s.created_at.isoformat(),
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "user": {
                "id": str(user.id) if user else None,
                "telegram_id": user.telegram_id if user else None,
                "first_name": user.first_name if user else "Unknown",
                "username": user.username if user else None,
                "approved_submissions": user.approved_submissions if user else 0,
            },
            "images": [
                {
                    "id": str(img.id),
                    "url": storage.get_presigned_url(img.file_key, 3600),
                    "file_size": img.file_size,
                }
                for img in imgs
            ],
        })

    return {"items": items, "total": total, "page": page, "limit": limit}


@router.patch("/{submission_id}/approve")
async def approve_submission(
    submission_id: uuid.UUID,
    request: Request,
    admin=Depends(require_permission("review_submissions")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.status not in (SubmissionStatus.PENDING, SubmissionStatus.DUPLICATE):
        raise HTTPException(status_code=400, detail="Submission already reviewed")

    before = {"status": sub.status.value}
    sub.status = SubmissionStatus.APPROVED
    sub.reviewed_by_admin_id = admin.id
    sub.reviewed_at = datetime.now(timezone.utc)
    sub.spin_granted = True

    # Update user stats and grant available spin
    user_r = await db.execute(select(User).where(User.id == sub.user_id))
    user = user_r.scalar_one_or_none()
    if user:
        user.approved_submissions += 1
        user.spin_count += 1   # grant 1 available spin
        user.total_spins += 1  # lifetime counter

    notif = Notification(
        user_id=sub.user_id,
        notification_type=NotificationType.SUBMISSION_APPROVED,
        payload={"submission_id": str(submission_id)},
    )
    db.add(notif)

    audit = AuditService(db)
    await audit.log(
        action="approve_submission",
        resource_type="submission",
        resource_id=str(submission_id),
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None,
        before_data=before,
        after_data={"status": "approved"},
    )

    await db.commit()

    # Dispatch Telegram notification via Celery (after commit so data is persisted)
    if user and user.telegram_id:
        notify_submission_approved.delay(
            telegram_id=user.telegram_id,
            submission_id=str(submission_id),
            lang=user.language.value if user.language else "uz",
            spin_count=user.spin_count,
            approved_total=user.approved_submissions,
        )

    return {"message": "Submission approved", "id": str(submission_id)}


@router.patch("/{submission_id}/reject")
async def reject_submission(
    submission_id: uuid.UUID,
    payload: RejectRequest,
    request: Request,
    admin=Depends(require_permission("review_submissions")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.status == SubmissionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Cannot reject already approved submission")

    before = {"status": sub.status.value}
    sub.status = SubmissionStatus.REJECTED
    sub.rejection_reason = payload.reason
    sub.reviewed_by_admin_id = admin.id
    sub.reviewed_at = datetime.now(timezone.utc)

    notif = Notification(
        user_id=sub.user_id,
        notification_type=NotificationType.SUBMISSION_REJECTED,
        payload={"submission_id": str(submission_id), "reason": payload.reason},
    )
    db.add(notif)

    audit = AuditService(db)
    await audit.log(
        action="reject_submission",
        resource_type="submission",
        resource_id=str(submission_id),
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None,
        before_data=before,
        after_data={"status": "rejected", "reason": payload.reason},
    )

    user_r = await db.execute(select(User).where(User.id == sub.user_id))
    user = user_r.scalar_one_or_none()

    await db.commit()

    if user and user.telegram_id:
        notify_submission_rejected.delay(
            telegram_id=user.telegram_id,
            submission_id=str(submission_id),
            reason=payload.reason,
            lang=user.language.value if user.language else "uz",
        )

    return {"message": "Submission rejected", "id": str(submission_id)}


@router.post("/bulk")
async def bulk_action(
    payload: BulkActionRequest,
    request: Request,
    admin=Depends(require_permission("review_submissions")),
    db: AsyncSession = Depends(get_db),
):
    processed = 0
    notifications_to_send = []

    for sub_id in payload.ids:
        result = await db.execute(select(Submission).where(Submission.id == sub_id))
        sub = result.scalar_one_or_none()
        if not sub:
            continue
        if payload.action == "approve" and sub.status in (SubmissionStatus.PENDING, SubmissionStatus.DUPLICATE):
            sub.status = SubmissionStatus.APPROVED
            sub.reviewed_by_admin_id = admin.id
            sub.reviewed_at = datetime.now(timezone.utc)
            sub.spin_granted = True
            user_r = await db.execute(select(User).where(User.id == sub.user_id))
            user = user_r.scalar_one_or_none()
            if user:
                user.approved_submissions += 1
                user.spin_count += 1
                user.total_spins += 1
                notifications_to_send.append(("approve", user, sub_id))
            db.add(Notification(
                user_id=sub.user_id,
                notification_type=NotificationType.SUBMISSION_APPROVED,
                payload={"submission_id": str(sub_id)},
            ))
            processed += 1
        elif payload.action == "reject" and sub.status != SubmissionStatus.APPROVED:
            sub.status = SubmissionStatus.REJECTED
            sub.rejection_reason = payload.reason or "Rejected by admin"
            sub.reviewed_by_admin_id = admin.id
            sub.reviewed_at = datetime.now(timezone.utc)
            user_r = await db.execute(select(User).where(User.id == sub.user_id))
            user = user_r.scalar_one_or_none()
            if user:
                notifications_to_send.append(("reject", user, sub_id))
            processed += 1

    audit = AuditService(db)
    await audit.log(
        action=f"bulk_{payload.action}",
        resource_type="submission",
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None,
        after_data={"count": processed, "ids": [str(i) for i in payload.ids]},
    )

    await db.commit()

    # Dispatch notifications after commit
    for action, user, sub_id in notifications_to_send:
        if not user or not user.telegram_id:
            continue
        lang = user.language.value if user.language else "uz"
        if action == "approve":
            notify_submission_approved.delay(
                telegram_id=user.telegram_id,
                submission_id=str(sub_id),
                lang=lang,
                spin_count=user.spin_count,
                approved_total=user.approved_submissions,
            )
        else:
            notify_submission_rejected.delay(
                telegram_id=user.telegram_id,
                submission_id=str(sub_id),
                reason=payload.reason or "Rejected by admin",
                lang=lang,
            )

    return {"message": f"Bulk {payload.action} completed", "processed": processed}
