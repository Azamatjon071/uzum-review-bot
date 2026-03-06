import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_, desc

from app.database import get_db
from app.deps import get_current_admin, require_permission
from app.models import (
    Submission, SubmissionStatus, SubmissionImage, User, Product,
    Notification, NotificationType
)
from app.services.storage import StorageService
from app.services.audit import AuditService
from app.services.gamification import GamificationService
from app.tasks.notifications import notify_submission_approved, notify_submission_rejected

router = APIRouter(prefix="/admin/submissions", tags=["admin-submissions"])
storage = StorageService()


class ApproveRequest(BaseModel):
    pass


class RejectRequest(BaseModel):
    reason: Optional[str] = None


class BulkActionRequest(BaseModel):
    ids: List[uuid.UUID]
    action: str  # approve / reject
    reason: Optional[str] = None


@router.get("")
async def list_submissions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin=Depends(require_permission("submissions.read")),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    filters = []
    if status:
        # Normalise to lowercase so "PENDING" from frontend matches enum values
        filters.append(Submission.status == status.lower())

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
        product_r = await db.execute(select(Product).where(Product.id == s.product_id))
        product = product_r.scalar_one_or_none()

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
            "product": {
                "id": str(product.id) if product else None,
                "name_uz": product.name_uz if product else None,
                "name_ru": product.name_ru if product else None,
                "name_en": product.name_en if product else None,
                "image_url": product.image_url if product else None,
            } if product else None,
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
    admin=Depends(require_permission("submissions.write")),
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
        # Gamification: award XP, update streak, check achievements
        gam_svc = GamificationService(db)
        await gam_svc.on_submission_approved(user.id)

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
    try:
        if user and user.telegram_id:
            notify_submission_approved.delay(
                telegram_id=user.telegram_id,
                submission_id=str(submission_id),
                lang=user.language.value if user.language else "uz",
                spin_count=user.spin_count,
                approved_total=user.approved_submissions,
            )
    except Exception as e:
        # Log error but don't fail the request since the transaction is already committed
        print(f"Failed to dispatch approval notification: {e}")

    return {"message": "Submission approved", "id": str(submission_id)}


@router.patch("/{submission_id}/reject")
async def reject_submission(
    submission_id: uuid.UUID,
    payload: RejectRequest,
    request: Request,
    admin=Depends(require_permission("submissions.write")),
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
    sub.rejection_reason = payload.reason or None
    sub.reviewed_by_admin_id = admin.id
    sub.reviewed_at = datetime.now(timezone.utc)

    notif = Notification(
        user_id=sub.user_id,
        notification_type=NotificationType.SUBMISSION_REJECTED,
        payload={"submission_id": str(submission_id), "reason": payload.reason or ""},
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
    admin=Depends(require_permission("submissions.write")),
    db: AsyncSession = Depends(get_db),
):
    print(f"DEBUG: bulk_action called with {payload}")
    
    # Fetch all submissions to process
    stmt = select(Submission).where(Submission.id.in_(payload.ids))
    result = await db.execute(stmt)
    submissions = result.scalars().all()
    
    processed_count = 0
    notifications_data = []

    for sub in submissions:
        if payload.action == "approve":
            if sub.status not in (SubmissionStatus.PENDING, SubmissionStatus.DUPLICATE):
                continue
            
            sub.status = SubmissionStatus.APPROVED
            sub.reviewed_by_admin_id = admin.id
            sub.reviewed_at = datetime.now(timezone.utc)
            sub.spin_granted = True
            
            # Fetch user
            user_stmt = select(User).where(User.id == sub.user_id)
            user = (await db.execute(user_stmt)).scalar_one_or_none()
            
            if user:
                user.approved_submissions += 1
                user.spin_count += 1
                user.total_spins += 1
                
                # Gamification
                gam_svc = GamificationService(db)
                await gam_svc.on_submission_approved(user.id)
                
                notifications_data.append({
                    "type": "approve",
                    "telegram_id": user.telegram_id,
                    "submission_id": str(sub.id),
                    "lang": user.language.value if user.language else "uz",
                    "spin_count": user.spin_count,
                    "approved_total": user.approved_submissions
                })
            
            # Notification record
            db.add(Notification(
                user_id=sub.user_id,
                notification_type=NotificationType.SUBMISSION_APPROVED,
                payload={"submission_id": str(sub.id)},
            ))
            processed_count += 1
            
        elif payload.action == "reject":
            if sub.status == SubmissionStatus.APPROVED:
                continue
                
            sub.status = SubmissionStatus.REJECTED
            sub.rejection_reason = payload.reason or "Rejected by admin"
            sub.reviewed_by_admin_id = admin.id
            sub.reviewed_at = datetime.now(timezone.utc)
            
            user_stmt = select(User).where(User.id == sub.user_id)
            user = (await db.execute(user_stmt)).scalar_one_or_none()
            
            if user:
                 notifications_data.append({
                    "type": "reject",
                    "telegram_id": user.telegram_id,
                    "submission_id": str(sub.id),
                    "reason": payload.reason or "Rejected by admin",
                    "lang": user.language.value if user.language else "uz",
                })
            
            db.add(Notification(
                user_id=sub.user_id,
                notification_type=NotificationType.SUBMISSION_REJECTED,
                payload={"submission_id": str(sub.id), "reason": payload.reason or ""},
            ))
            processed_count += 1

    audit = AuditService(db)
    await audit.log(
        action=f"bulk_{payload.action}",
        resource_type="submission",
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None,
        after_data={"count": processed_count, "ids": [str(i) for i in payload.ids]},
    )

    await db.commit()

    # Send notifications
    try:
        for item in notifications_data:
            if not item["telegram_id"]:
                continue
                
            if item["type"] == "approve":
                notify_submission_approved.delay(
                    telegram_id=item["telegram_id"],
                    submission_id=item["submission_id"],
                    lang=item["lang"],
                    spin_count=item["spin_count"],
                    approved_total=item["approved_total"],
                )
            else:
                notify_submission_rejected.delay(
                    telegram_id=item["telegram_id"],
                    submission_id=item["submission_id"],
                    reason=item["reason"],
                    lang=item["lang"],
                )
    except Exception as e:
        print(f"Failed to dispatch bulk notifications: {e}")

    return {"message": f"Bulk {payload.action} completed", "processed": processed_count}


@router.delete("/{submission_id}", status_code=204)
async def delete_submission(
    submission_id: uuid.UUID,
    request: Request,
    admin=Depends(require_permission("submissions.write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Delete associated images first
    await db.execute(
        select(SubmissionImage).where(SubmissionImage.submission_id == submission_id)
    )
    img_r = await db.execute(select(SubmissionImage).where(SubmissionImage.submission_id == submission_id))
    imgs = img_r.scalars().all()
    for img in imgs:
        await db.delete(img)

    audit = AuditService(db)
    await audit.log(
        action="delete_submission",
        resource_type="submission",
        resource_id=str(submission_id),
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None,
        before_data={"status": sub.status.value},
    )

    await db.delete(sub)
    await db.commit()
