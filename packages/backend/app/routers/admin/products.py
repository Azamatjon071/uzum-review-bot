"""
Admin router: product catalog management.
Admins add known Uzum products so the bot can validate submission URLs.
"""
from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, HttpUrl
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_permission
from app.models import Product, AdminUser
from app.services.audit import AuditService

router = APIRouter(prefix="/admin/products", tags=["admin-products"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ProductCreate(BaseModel):
    name: str
    uzum_product_id: str
    url: str
    category: Optional[str] = None
    is_active: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: int
    name: str
    uzum_product_id: str
    url: str
    category: Optional[str]
    is_active: bool
    submission_count: int = 0

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
                Product.name.ilike(f"%{search}%"),
                Product.uzum_product_id.ilike(f"%{search}%"),
            )
        )
    if is_active is not None:
        query = query.where(Product.is_active == is_active)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    products = (
        await db.execute(
            query.offset((page - 1) * page_size).limit(page_size).order_by(Product.id.desc())
        )
    ).scalars().all()

    return ProductListResponse(
        items=[ProductOut.model_validate(p) for p in products],
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
    existing = await db.scalar(
        select(Product).where(Product.uzum_product_id == body.uzum_product_id)
    )
    if existing:
        raise HTTPException(status_code=409, detail="Product with this uzum_product_id already exists")

    product = Product(**body.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)

    audit = AuditService(db)
    await audit.log(
        action="product.created",
        resource_type="product",
        resource_id=str(product.id),
        admin_id=admin.id,
        after_data={"name": product.name},
    )
    return ProductOut.model_validate(product)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_permission("submissions.read")),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductOut.model_validate(product)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
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
    return ProductOut.model_validate(product)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: int,
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
