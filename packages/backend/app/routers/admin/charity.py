import uuid
from datetime import datetime as dt
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.deps import require_permission
from app.models import CharityCampaign, CharityDonation, User
from app.services.audit import AuditService

router = APIRouter(prefix="/admin/charity", tags=["admin-charity"])


class CampaignCreate(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    description_uz: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    image_url: Optional[str] = None
    goal_amount: float
    currency: str = "UZS"
    deadline: Optional[str] = None


class CampaignUpdate(BaseModel):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    description_uz: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    image_url: Optional[str] = None
    goal_amount: Optional[float] = None
    deadline: Optional[str] = None


@router.get("/campaigns")
async def list_campaigns(
    admin=Depends(require_permission("charity.read")),
    db: AsyncSession = Depends(get_db),
):
    campaigns = (await db.execute(select(CharityCampaign).order_by(desc(CharityCampaign.created_at)))).scalars().all()
    result = []
    for c in campaigns:
        donor_count = (await db.execute(
            select(func.count(CharityDonation.id)).where(CharityDonation.campaign_id == c.id)
        )).scalar()
        result.append({
            "id": str(c.id),
            "name_uz": c.name_uz, "name_ru": c.name_ru, "name_en": c.name_en,
            "image_url": c.image_url,
            "goal_amount": float(c.goal_amount),
            "raised_amount": float(c.raised_amount),
            "currency": c.currency,
            "is_active": c.is_active,
            "deadline": c.deadline.isoformat() if c.deadline else None,
            "donor_count": donor_count,
            "progress_pct": round(float(c.raised_amount) / float(c.goal_amount) * 100, 1) if c.goal_amount else 0,
            "created_at": c.created_at.isoformat(),
        })
    return {"campaigns": result}


@router.post("/campaigns", status_code=201)
async def create_campaign(
    payload: CampaignCreate,
    request: Request,
    admin=Depends(require_permission("charity.write")),
    db: AsyncSession = Depends(get_db),
):
    campaign = CharityCampaign(
        name_uz=payload.name_uz,
        name_ru=payload.name_ru,
        name_en=payload.name_en,
        description_uz=payload.description_uz,
        description_ru=payload.description_ru,
        description_en=payload.description_en,
        image_url=payload.image_url,
        goal_amount=payload.goal_amount,
        currency=payload.currency,
        deadline=dt.fromisoformat(payload.deadline) if payload.deadline else None,
    )
    db.add(campaign)
    await db.flush()
    audit = AuditService(db)
    await audit.log("create_charity_campaign", "charity_campaign", str(campaign.id),
                    admin_id=admin.id, ip_address=request.client.host if request.client else None,
                    after_data=payload.model_dump())
    await db.commit()
    return {"id": str(campaign.id), "message": "Campaign created"}


@router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
    request: Request,
    admin=Depends(require_permission("charity.write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CharityCampaign).where(CharityCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        if k == 'deadline' and isinstance(v, str):
            v = dt.fromisoformat(v)
        setattr(campaign, k, v)
    audit = AuditService(db)
    await audit.log("update_charity_campaign", "charity_campaign", str(campaign_id),
                    admin_id=admin.id, ip_address=request.client.host if request.client else None)
    await db.commit()
    return {"message": "Campaign updated"}


@router.patch("/campaigns/{campaign_id}/close")
async def close_campaign(
    campaign_id: uuid.UUID,
    admin=Depends(require_permission("charity.write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CharityCampaign).where(CharityCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.is_active = False
    await db.commit()
    return {"message": "Campaign closed"}


@router.get("/donations")
async def list_donations(
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    campaign_id: Optional[uuid.UUID] = None,
    admin=Depends(require_permission("charity.read")),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    from sqlalchemy import and_
    filters = []
    if campaign_id:
        filters.append(CharityDonation.campaign_id == campaign_id)

    query = select(CharityDonation).order_by(desc(CharityDonation.created_at)).offset(offset).limit(limit)
    if filters:
        query = query.where(and_(*filters))

    donations = (await db.execute(query)).scalars().all()
    total = (await db.execute(
        select(func.count(CharityDonation.id)).where(and_(*filters)) if filters else select(func.count(CharityDonation.id))
    )).scalar()

    items = []
    for d in donations:
        user_r = await db.execute(select(User).where(User.id == d.user_id))
        user = user_r.scalar_one_or_none()
        items.append({
            "id": str(d.id),
            "user": {"id": str(d.user_id), "first_name": user.first_name if user else "Unknown"},
            "campaign_id": str(d.campaign_id) if d.campaign_id else None,
            "amount_uzs": float(d.amount_uzs),
            "source": d.source,
            "created_at": d.created_at.isoformat(),
        })

    return {"items": items, "total": total, "page": page, "limit": limit}
