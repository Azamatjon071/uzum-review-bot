"""
Admin router: fraud signals management.
GET  /admin/fraud/signals    — list signals (filterable)
GET  /admin/fraud/stats      — summary stats
POST /admin/fraud/signals/:id/dismiss — mark false positive
"""
from __future__ import annotations

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from app.database import get_db
from app.deps import get_current_admin
from app.models import FraudSignal, FraudSignalType, User, AdminUser
from app.services.fraud import FraudService

router = APIRouter(prefix="/admin/fraud", tags=["admin-fraud"])


class DismissRequest(BaseModel):
    reason: Optional[str] = None


@router.get("/stats")
async def get_fraud_stats(
    db: AsyncSession = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
):
    """Return aggregate fraud statistics."""
    auto_banned = await db.scalar(
        select(func.count(User.id)).where(User.is_banned == True)
    )
    false_positives = await db.scalar(
        select(func.count(FraudSignal.id)).where(FraudSignal.is_false_positive == True)
    )

    return {
        "pending_review": await db.scalar(
            select(func.count(FraudSignal.id)).where(
                and_(
                    FraudSignal.is_false_positive == False,
                    FraudSignal.reviewed_by == None,
                )
            )
        ) or 0,
        "auto_banned": auto_banned or 0,
        "false_positives": false_positives or 0,
        "avg_score": 0.0,
    }


@router.get("/signals")
async def list_fraud_signals(
    status: Optional[str] = "pending",   # pending | auto_banned | false_positive | all
    signal_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
):
    """List fraud signals with optional filters."""
    query = select(FraudSignal).join(User, User.id == FraudSignal.user_id)

    if status == "pending":
        query = query.where(
            and_(
                FraudSignal.is_false_positive == False,
                FraudSignal.reviewed_by == None,
            )
        )
    elif status == "auto_banned":
        query = query.where(
            and_(FraudSignal.is_false_positive == False, User.is_banned == True)
        )
    elif status == "false_positive":
        query = query.where(FraudSignal.is_false_positive == True)
    # 'all' → no additional filter

    if signal_type:
        try:
            st = FraudSignalType(signal_type)
            query = query.where(FraudSignal.signal_type == st)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown signal_type: {signal_type}")

    total = await db.scalar(
        select(func.count()).select_from(query.subquery())
    )
    query = query.order_by(desc(FraudSignal.detected_at)).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    signals = result.scalars().all()

    items = []
    for sig in signals:
        user = await db.get(User, sig.user_id)
        items.append({
            "id": str(sig.id),
            "user_id": str(sig.user_id),
            "user_name": (
                f"{user.first_name or ''} {user.last_name or ''}".strip()
                or user.username
                or str(sig.user_id)[:8]
            ) if user else str(sig.user_id)[:8],
            "signal_type": sig.signal_type.value,
            "score": sig.score,
            "evidence": sig.evidence or {},
            "detected_at": sig.detected_at.isoformat(),
            "is_false_positive": sig.is_false_positive,
            "reviewed_by": str(sig.reviewed_by) if sig.reviewed_by else None,
        })

    return {
        "signals": items,
        "total": total or 0,
        "page": page,
        "page_size": page_size,
    }


@router.post("/signals/{signal_id}/dismiss", status_code=status.HTTP_200_OK)
async def dismiss_fraud_signal(
    signal_id: UUID,
    body: DismissRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    """Mark a fraud signal as false positive and recompute user fraud score."""
    signal = await db.get(FraudSignal, signal_id)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    if signal.is_false_positive:
        raise HTTPException(status_code=400, detail="Signal already dismissed")

    svc = FraudService(db)
    new_score = await svc.dismiss_signal(signal_id, reviewed_by=admin.id)
    await db.commit()

    return {
        "message": "Signal dismissed as false positive",
        "new_fraud_score": new_score,
    }
