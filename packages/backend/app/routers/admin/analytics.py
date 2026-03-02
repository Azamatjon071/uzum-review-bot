from __future__ import annotations

import builtins
import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, Date
from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.deps import require_permission
from app.models import (
    Submission, SubmissionStatus, User, PrizeSpin,
    Prize, CharityDonation, CharityCampaign, Reward,
    FraudSignal, Language,
)

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


def _range_to_days(range_param: str) -> Optional[int]:
    """Convert range query param to number of days (None = all time)."""
    mapping = {"7d": 7, "30d": 30, "90d": 90, "all": None}
    return mapping.get(range_param, 30)


@router.get("/overview")
async def analytics_overview(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    admin=Depends(require_permission("analytics.read")),
    db: AsyncSession = Depends(get_db),
):
    days = _range_to_days(range)
    today = date.today()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date() if days else None

    # Total users
    total_users = (await db.execute(select(func.count(User.id)))).scalar()

    # Submissions today
    subs_today = (await db.execute(
        select(func.count(Submission.id)).where(cast(Submission.created_at, Date) == today)
    )).scalar()

    # Pending queue
    pending = (await db.execute(
        select(func.count(Submission.id)).where(Submission.status == SubmissionStatus.PENDING)
    )).scalar()

    # Total approved (in range)
    approved_q = select(func.count(Submission.id)).where(Submission.status == SubmissionStatus.APPROVED)
    if cutoff:
        approved_q = approved_q.where(cast(Submission.created_at, Date) >= cutoff)
    total_approved = (await db.execute(approved_q)).scalar()

    # Total spins
    spins_q = select(func.count(PrizeSpin.id))
    if cutoff:
        spins_q = spins_q.where(cast(PrizeSpin.created_at, Date) >= cutoff)
    total_spins = (await db.execute(spins_q)).scalar()

    # Charity raised (all time)
    total_charity = (await db.execute(
        select(func.coalesce(func.sum(CharityDonation.amount_uzs), 0))
    )).scalar()

    # New users today
    new_users_today = (await db.execute(
        select(func.count(User.id)).where(cast(User.created_at, Date) == today)
    )).scalar()

    # Approval rate (in range)
    reviewed_q = select(func.count(Submission.id)).where(
        Submission.status.in_([SubmissionStatus.APPROVED, SubmissionStatus.REJECTED])
    )
    if cutoff:
        reviewed_q = reviewed_q.where(cast(Submission.created_at, Date) >= cutoff)
    total_reviewed = (await db.execute(reviewed_q)).scalar()
    approval_rate = round(total_approved / total_reviewed * 100, 1) if total_reviewed else 0

    # Fraud review count (signals not yet reviewed)
    fraud_review_count = (await db.execute(
        select(func.count(FraudSignal.id)).where(
            and_(
                FraudSignal.is_false_positive == False,
                FraudSignal.reviewed_by == None,
            )
        )
    )).scalar() or 0

    # Draft broadcasts — no BroadcastDraft model yet, return 0
    draft_broadcasts = 0

    return {
        "total_users": total_users,
        "submissions_today": subs_today,
        "pending_queue": pending,
        "total_approved": total_approved,
        "total_spins": total_spins,
        "total_charity_uzs": float(total_charity),
        "new_users_today": new_users_today,
        "approval_rate_pct": approval_rate,
        "fraud_review_count": fraud_review_count,
        "draft_broadcasts": draft_broadcasts,
        "range": range,
    }


@router.get("/submissions")
async def analytics_submissions(
    days: int = 30,
    admin=Depends(require_permission("analytics.read")),
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
    admin=Depends(require_permission("analytics.read")),
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


@router.get("/retention")
async def analytics_retention(
    weeks: int = Query(8, ge=2, le=16),
    admin=Depends(require_permission("analytics.read")),
    db: AsyncSession = Depends(get_db),
):
    """
    Retention cohort table.
    Returns cohort_week x retention_week matrix (% of cohort still active).
    A user is "active" in week N if they submitted in that week.
    """
    today = date.today()
    cohorts = []

    for w in range(weeks - 1, -1, -1):
        cohort_start = today - timedelta(weeks=w + 1)
        cohort_end = cohort_start + timedelta(days=6)

        # Users who registered in this cohort week
        cohort_users_r = await db.execute(
            select(User.id).where(
                and_(
                    cast(User.created_at, Date) >= cohort_start,
                    cast(User.created_at, Date) <= cohort_end,
                )
            )
        )
        cohort_user_ids = [row[0] for row in cohort_users_r.all()]
        cohort_size = len(cohort_user_ids)

        if not cohort_size:
            cohorts.append({
                "cohort_week": cohort_start.isoformat(),
                "size": 0,
                "retention": [],
            })
            continue

        retention = []
        for follow_w in range(weeks - w):
            act_start = cohort_start + timedelta(weeks=follow_w)
            act_end = act_start + timedelta(days=6)
            active_r = await db.execute(
                select(func.count(func.distinct(Submission.user_id))).where(
                    and_(
                        Submission.user_id.in_(cohort_user_ids),
                        cast(Submission.created_at, Date) >= act_start,
                        cast(Submission.created_at, Date) <= act_end,
                    )
                )
            )
            active = active_r.scalar() or 0
            retention.append(round(active / cohort_size * 100, 1))

        cohorts.append({
            "cohort_week": cohort_start.isoformat(),
            "size": cohort_size,
            "retention": retention,
        })

    return {"cohorts": cohorts, "weeks": weeks}


@router.get("/funnel")
async def analytics_funnel(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    admin=Depends(require_permission("analytics.read")),
    db: AsyncSession = Depends(get_db),
):
    """Conversion funnel: registered → submitted → approved → spun."""
    days = _range_to_days(range)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date() if days else None

    reg_q = select(func.count(User.id))
    sub_q = select(func.count(func.distinct(Submission.user_id)))
    apr_q = select(func.count(func.distinct(Submission.user_id))).where(
        Submission.status == SubmissionStatus.APPROVED
    )
    spun_q = select(func.count(func.distinct(PrizeSpin.user_id)))

    if cutoff:
        reg_q = reg_q.where(cast(User.created_at, Date) >= cutoff)
        sub_q = sub_q.where(cast(Submission.created_at, Date) >= cutoff)
        apr_q = apr_q.where(cast(Submission.created_at, Date) >= cutoff)
        spun_q = spun_q.where(cast(PrizeSpin.created_at, Date) >= cutoff)

    registered = (await db.execute(reg_q)).scalar() or 0
    submitted = (await db.execute(sub_q)).scalar() or 0
    approved = (await db.execute(apr_q)).scalar() or 0
    spun = (await db.execute(spun_q)).scalar() or 0

    def pct(a: int, b: int) -> float:
        return round(a / b * 100, 1) if b else 0.0

    return {
        "steps": [
            {"label": "Registered", "count": registered, "pct_of_first": 100.0},
            {"label": "Submitted", "count": submitted, "pct_of_first": pct(submitted, registered)},
            {"label": "Approved", "count": approved, "pct_of_first": pct(approved, registered)},
            {"label": "Spun Wheel", "count": spun, "pct_of_first": pct(spun, registered)},
        ],
        "range": range,
    }


@router.get("/prize-popularity")
async def analytics_prize_popularity(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    admin=Depends(require_permission("analytics.read")),
    db: AsyncSession = Depends(get_db),
):
    """Prize win frequency."""
    days = _range_to_days(range)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date() if days else None

    q = (
        select(Prize.id, Prize.name_uz, Prize.color, func.count(PrizeSpin.id).label("spin_count"))
        .join(PrizeSpin, PrizeSpin.prize_id == Prize.id)
        .group_by(Prize.id, Prize.name_uz, Prize.color)
        .order_by(func.count(PrizeSpin.id).desc())
    )
    if cutoff:
        q = q.where(cast(PrizeSpin.created_at, Date) >= cutoff)

    rows = (await db.execute(q)).all()
    total = sum(r.spin_count for r in rows) or 1

    return {
        "prizes": [
            {
                "id": str(r.id),
                "name": r.name_uz,
                "color": r.color or "#6366f1",
                "count": r.spin_count,
                "pct": round(r.spin_count / total * 100, 1),
            }
            for r in rows
        ],
        "range": range,
    }


@router.get("/heatmap")
async def analytics_heatmap(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    admin=Depends(require_permission("analytics.read")),
    db: AsyncSession = Depends(get_db),
):
    """
    Submission activity heatmap: day-of-week (0=Mon) × hour-of-day.
    Returns a 7×24 matrix of submission counts.
    """
    from sqlalchemy import extract
    days = _range_to_days(range)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)) if days else None

    q = select(
        extract("dow", Submission.created_at).label("dow"),
        extract("hour", Submission.created_at).label("hour"),
        func.count(Submission.id).label("cnt"),
    ).group_by("dow", "hour")

    if cutoff:
        q = q.where(Submission.created_at >= cutoff)

    rows = (await db.execute(q)).all()

    # Build 7×24 grid (ISO: Mon=1..Sun=7 → we shift to 0=Mon)
    grid = [[0] * 24 for _ in builtins.range(7)]
    for row in rows:
        dow = int(row.dow)  # 0=Sun..6=Sat (postgres extract)
        # Convert postgres Sunday=0 → ISO Monday=0
        iso_dow = (dow - 1) % 7
        hour = int(row.hour)
        grid[iso_dow][hour] = row.cnt

    return {"grid": grid, "range": range, "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}


@router.get("/geo")
async def analytics_geo(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    admin=Depends(require_permission("analytics.read")),
    db: AsyncSession = Depends(get_db),
):
    """
    Geographic distribution by user language (proxy for locale).
    Returns counts per language code.
    """
    days = _range_to_days(range)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date() if days else None

    q = (
        select(User.language, func.count(User.id).label("cnt"))
        .group_by(User.language)
        .order_by(func.count(User.id).desc())
    )
    if cutoff:
        q = q.where(cast(User.created_at, Date) >= cutoff)

    rows = (await db.execute(q)).all()
    total = sum(r.cnt for r in rows) or 1

    lang_labels = {"uz": "Uzbek", "ru": "Russian", "en": "English"}

    return {
        "regions": [
            {
                "language": r.language.value if r.language else "uz",
                "label": lang_labels.get(r.language.value if r.language else "uz", r.language.value if r.language else "uz"),
                "count": r.cnt,
                "pct": round(r.cnt / total * 100, 1),
            }
            for r in rows
        ],
        "range": range,
    }
