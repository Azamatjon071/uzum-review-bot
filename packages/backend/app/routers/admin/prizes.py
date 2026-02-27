import uuid
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.deps import require_permission
from app.models import Prize, PrizeType
from app.services.audit import AuditService

router = APIRouter(prefix="/admin/prizes", tags=["admin-prizes"])


class PrizeCreate(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    description_uz: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    prize_type: PrizeType
    value: float
    value_currency: str = "UZS"
    icon_url: Optional[str] = None
    color: str = "#6366f1"
    weight: int = 100
    stock_limit: Optional[int] = None
    is_active: bool = True


class PrizeUpdate(BaseModel):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    description_uz: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    value: Optional[float] = None
    value_currency: Optional[str] = None
    icon_url: Optional[str] = None
    color: Optional[str] = None
    weight: Optional[int] = None
    stock_limit: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_prizes(
    admin=Depends(require_permission("prizes.read")),
    db: AsyncSession = Depends(get_db),
):
    prizes = (await db.execute(select(Prize).order_by(desc(Prize.weight)))).scalars().all()
    total_weight = sum(p.weight for p in prizes) or 1
    return {
        "prizes": [
            {
                "id": str(p.id),
                "name_uz": p.name_uz, "name_ru": p.name_ru, "name_en": p.name_en,
                "type": p.prize_type.value,
                "value": float(p.value), "currency": p.value_currency,
                "icon_url": p.icon_url, "color": p.color,
                "weight": p.weight,
                "probability_pct": round(p.weight / total_weight * 100, 2),
                "stock_limit": p.stock_limit, "stock_used": p.stock_used,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat(),
            }
            for p in prizes
        ]
    }


@router.post("", status_code=201)
async def create_prize(
    payload: PrizeCreate,
    request: Request,
    admin=Depends(require_permission("prizes.write")),
    db: AsyncSession = Depends(get_db),
):
    prize = Prize(**payload.model_dump())
    db.add(prize)
    await db.flush()
    audit = AuditService(db)
    await audit.log("create_prize", "prize", str(prize.id), admin_id=admin.id,
                    ip_address=request.client.host if request.client else None,
                    after_data=payload.model_dump())
    return {"id": str(prize.id), "message": "Prize created"}


@router.put("/{prize_id}")
async def update_prize(
    prize_id: uuid.UUID,
    payload: PrizeUpdate,
    request: Request,
    admin=Depends(require_permission("prizes.write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Prize).where(Prize.id == prize_id))
    prize = result.scalar_one_or_none()
    if not prize:
        raise HTTPException(status_code=404, detail="Prize not found")

    before = {"weight": prize.weight, "is_active": prize.is_active}
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(prize, k, v)

    audit = AuditService(db)
    await audit.log("update_prize", "prize", str(prize_id), admin_id=admin.id,
                    ip_address=request.client.host if request.client else None,
                    before_data=before, after_data=payload.model_dump(exclude_unset=True))
    return {"message": "Prize updated"}


@router.delete("/{prize_id}")
async def delete_prize(
    prize_id: uuid.UUID,
    request: Request,
    admin=Depends(require_permission("prizes.write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Prize).where(Prize.id == prize_id))
    prize = result.scalar_one_or_none()
    if not prize:
        raise HTTPException(status_code=404, detail="Prize not found")
    # Soft-delete: deactivate instead of hard delete (preserve history)
    prize.is_active = False
    audit = AuditService(db)
    await audit.log("delete_prize", "prize", str(prize_id), admin_id=admin.id,
                    ip_address=request.client.host if request.client else None)
    return {"message": "Prize deactivated"}
