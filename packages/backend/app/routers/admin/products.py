"""
Admin router: product catalog management.
Admins add known Uzum products so the bot can show them in the submission flow.
"""
from __future__ import annotations

import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_permission
from app.models import Product, AdminUser, Submission
from app.services.audit import AuditService

router = APIRouter(prefix="/admin/products", tags=["admin-products"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ProductCreate(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    uzum_product_url: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True


class ProductUpdate(BaseModel):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    uzum_product_url: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: str
    name_uz: str
    name_ru: str
    name_en: str
    uzum_product_url: Optional[str]
    image_url: Optional[str]
    is_active: bool
    submission_count: int = 0
    created_at: str

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_permission("submissions.read")),
):
    query = select(Product)
    if search:
        query = query.where(
            or_(
                Product.name_uz.ilike(f"%{search}%"),
                Product.name_ru.ilike(f"%{search}%"),
                Product.name_en.ilike(f"%{search}%"),
            )
        )
    if is_active is not None:
        query = query.where(Product.is_active == is_active)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    products = (
        await db.execute(
            query.offset((page - 1) * page_size).limit(page_size).order_by(Product.created_at.desc())
        )
    ).scalars().all()

    items = []
    for p in products:
        sub_count = await db.scalar(
            select(func.count(Submission.id)).where(Submission.product_id == p.id)
        )
        items.append(ProductOut(
            id=str(p.id),
            name_uz=p.name_uz,
            name_ru=p.name_ru,
            name_en=p.name_en,
            uzum_product_url=p.uzum_product_url,
            image_url=p.image_url,
            is_active=p.is_active,
            submission_count=sub_count or 0,
            created_at=p.created_at.isoformat(),
        ))

    return ProductListResponse(
        items=items,
        total=total or 0,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    body: ProductCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_permission("submissions.write")),
):
    product = Product(
        name_uz=body.name_uz,
        name_ru=body.name_ru,
        name_en=body.name_en,
        uzum_product_url=body.uzum_product_url,
        image_url=body.image_url,
        is_active=body.is_active,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    audit = AuditService(db)
    await audit.log(
        action="product.created",
        resource_type="product",
        resource_id=str(product.id),
        admin_id=admin.id,
        after_data={"name_uz": product.name_uz},
    )
    return ProductOut(
        id=str(product.id),
        name_uz=product.name_uz,
        name_ru=product.name_ru,
        name_en=product.name_en,
        uzum_product_url=product.uzum_product_url,
        image_url=product.image_url,
        is_active=product.is_active,
        submission_count=0,
        created_at=product.created_at.isoformat(),
    )


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_permission("submissions.read")),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    sub_count = await db.scalar(
        select(func.count(Submission.id)).where(Submission.product_id == product.id)
    )
    return ProductOut(
        id=str(product.id),
        name_uz=product.name_uz,
        name_ru=product.name_ru,
        name_en=product.name_en,
        uzum_product_url=product.uzum_product_url,
        image_url=product.image_url,
        is_active=product.is_active,
        submission_count=sub_count or 0,
        created_at=product.created_at.isoformat(),
    )


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: uuid.UUID,
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_permission("submissions.write")),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    audit = AuditService(db)
    await audit.log(
        action="product.updated",
        resource_type="product",
        resource_id=str(product_id),
        admin_id=admin.id,
    )
    sub_count = await db.scalar(
        select(func.count(Submission.id)).where(Submission.product_id == product.id)
    )
    return ProductOut(
        id=str(product.id),
        name_uz=product.name_uz,
        name_ru=product.name_ru,
        name_en=product.name_en,
        uzum_product_url=product.uzum_product_url,
        image_url=product.image_url,
        is_active=product.is_active,
        submission_count=sub_count or 0,
        created_at=product.created_at.isoformat(),
    )


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_permission("submissions.write")),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
    audit = AuditService(db)
    await audit.log(
        action="product.deleted",
        resource_type="product",
        resource_id=str(product_id),
        admin_id=admin.id,
    )
