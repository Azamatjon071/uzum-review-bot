import uuid
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from app.database import get_db
from app.deps import require_permission
from app.models import User, Reward, Submission
from app.services.audit import AuditService

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


class BanRequest(BaseModel):
    reason: str


@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    search: Optional[str] = None,
    is_banned: Optional[bool] = None,
    admin=Depends(require_permission("view_users")),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    filters = []
    if is_banned is not None:
        filters.append(User.is_banned == is_banned)
    if search:
        filters.append(or_(
            User.username.ilike(f"%{search}%"),
            User.first_name.ilike(f"%{search}%"),
        ))

    from sqlalchemy import and_
    query = select(User).order_by(desc(User.created_at)).offset(offset).limit(limit)
    if filters:
        query = query.where(and_(*filters))

    users = (await db.execute(query)).scalars().all()
    total = (await db.execute(
        select(func.count(User.id)).where(and_(*filters)) if filters else select(func.count(User.id))
    )).scalar()

    return {
        "items": [
            {
                "id": str(u.id),
                "telegram_id": u.telegram_id,
                "username": u.username,
                "first_name": u.first_name,
                "language": u.language.value,
                "is_banned": u.is_banned,
                "total_submissions": u.total_submissions,
                "approved_submissions": u.approved_submissions,
                "total_spins": u.total_spins,
                "referral_code": u.referral_code,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
        "total": total, "page": page, "limit": limit,
    }


@router.get("/{user_id}")
async def get_user(
    user_id: uuid.UUID,
    admin=Depends(require_permission("view_users")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    subs = (await db.execute(
        select(Submission).where(Submission.user_id == user_id).order_by(desc(Submission.created_at)).limit(10)
    )).scalars().all()

    rewards = (await db.execute(
        select(Reward).where(Reward.user_id == user_id).order_by(desc(Reward.created_at)).limit(10)
    )).scalars().all()

    return {
        "id": str(user.id),
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "language": user.language.value,
        "is_banned": user.is_banned,
        "ban_reason": user.ban_reason,
        "total_submissions": user.total_submissions,
        "approved_submissions": user.approved_submissions,
        "total_spins": user.total_spins,
        "referral_code": user.referral_code,
        "created_at": user.created_at.isoformat(),
        "recent_submissions": [
            {"id": str(s.id), "status": s.status.value, "created_at": s.created_at.isoformat()}
            for s in subs
        ],
        "recent_rewards": [
            {"id": str(r.id), "status": r.status.value, "claim_code": r.claim_code}
            for r in rewards
        ],
    }


@router.patch("/{user_id}/ban")
async def ban_user(
    user_id: uuid.UUID,
    payload: BanRequest,
    request: Request,
    admin=Depends(require_permission("manage_users")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_banned = True
    user.ban_reason = payload.reason

    audit = AuditService(db)
    await audit.log("ban_user", "user", str(user_id), admin_id=admin.id,
                    ip_address=request.client.host if request.client else None,
                    after_data={"reason": payload.reason})
    return {"message": "User banned"}


@router.patch("/{user_id}/unban")
async def unban_user(
    user_id: uuid.UUID,
    request: Request,
    admin=Depends(require_permission("manage_users")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_banned = False
    user.ban_reason = None

    audit = AuditService(db)
    await audit.log("unban_user", "user", str(user_id), admin_id=admin.id,
                    ip_address=request.client.host if request.client else None)
    return {"message": "User unbanned"}
