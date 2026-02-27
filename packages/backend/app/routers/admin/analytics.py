import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, Date
from fastapi import APIRouter, Depends
from app.database import get_db
from app.deps import require_permission
from app.models import (
    Submission, SubmissionStatus, User, PrizeSpin,
    Prize, CharityDonation, CharityCampaign, Reward
)

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("/overview")
async def analytics_overview(
    admin=Depends(require_permission("view_analytics")),
    db: AsyncSession = Depends(get_db),
):
    # Total users
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    # Submissions today
    today = date.today()
    subs_today = (await db.execute(
        select(func.count(Submission.id)).where(cast(Submission.created_at, Date) == today)
    )).scalar()
    # Pending queue
    pending = (await db.execute(
        select(func.count(Submission.id)).where(Submission.status == SubmissionStatus.PENDING)
    )).scalar()
    # Total approved
    total_approved = (await db.execute(
        select(func.count(Submission.id)).where(Submission.status == SubmissionStatus.APPROVED)
    )).scalar()
    # Total spins
    total_spins = (await db.execute(select(func.count(PrizeSpin.id)))).scalar()
    # Charity raised
    total_charity = (await db.execute(
        select(func.coalesce(func.sum(CharityDonation.amount_uzs), 0))
    )).scalar()
    # New users today
    new_users_today = (await db.execute(
        select(func.count(User.id)).where(cast(User.created_at, Date) == today)
    )).scalar()
    # Approval rate
    total_reviewed = (await db.execute(
        select(func.count(Submission.id)).where(
            Submission.status.in_([SubmissionStatus.APPROVED, SubmissionStatus.REJECTED])
        )
    )).scalar()
    approval_rate = round(total_approved / total_reviewed * 100, 1) if total_reviewed else 0

    return {
        "total_users": total_users,
        "submissions_today": subs_today,
        "pending_queue": pending,
        "total_approved": total_approved,
        "total_spins": total_spins,
        "total_charity_uzs": float(total_charity),
        "new_users_today": new_users_today,
        "approval_rate_pct": approval_rate,
    }


@router.get("/submissions")
async def analytics_submissions(
    days: int = 30,
    admin=Depends(require_permission("view_analytics")),
    db: AsyncSession = Depends(get_db),
):
    """Daily submission counts for the last N days."""
    data = []
    today = date.today()
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        count = (await db.execute(
            select(func.count(Submission.id)).where(cast(Submission.created_at, Date) == d)
        )).scalar()
        approved = (await db.execute(
            select(func.count(Submission.id)).where(
                and_(cast(Submission.created_at, Date) == d, Submission.status == SubmissionStatus.APPROVED)
            )
        )).scalar()
        data.append({"date": d.isoformat(), "total": count, "approved": approved})
    return {"data": data}


@router.get("/charity")
async def analytics_charity(
    admin=Depends(require_permission("view_analytics")),
    db: AsyncSession = Depends(get_db),
):
    campaigns = (await db.execute(
        select(CharityCampaign).order_by(CharityCampaign.raised_amount.desc())
    )).scalars().all()

    return {
        "campaigns": [
            {
                "id": str(c.id),
                "name": c.name_uz,
                "goal": float(c.goal_amount),
                "raised": float(c.raised_amount),
                "pct": round(float(c.raised_amount) / float(c.goal_amount) * 100, 1) if c.goal_amount else 0,
            }
            for c in campaigns
        ]
    }
