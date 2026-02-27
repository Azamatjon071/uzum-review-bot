import uuid
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.deps import get_current_admin, require_permission
from app.models import AdminUser, AdminRole
from app.services.auth import hash_password, generate_totp_secret
from app.services.audit import AuditService

router = APIRouter(prefix="/admin/admins", tags=["admin-management"])


class InviteAdmin(BaseModel):
    email: EmailStr
    full_name: str
    role_id: uuid.UUID
    password: str


class UpdateAdmin(BaseModel):
    full_name: Optional[str] = None
    role_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class CreateRoleRequest(BaseModel):
    name: str
    permissions: List[str]


@router.get("")
async def list_admins(
    admin=Depends(require_permission("admins.write")),
    db: AsyncSession = Depends(get_db),
):
    admins = (await db.execute(select(AdminUser))).scalars().all()
    return {
        "admins": [
            {
                "id": str(a.id),
                "email": a.email,
                "full_name": a.full_name,
                "role_id": str(a.role_id),
                "is_totp_enabled": a.is_totp_enabled,
                "is_active": a.is_active,
                "last_login_at": a.last_login_at.isoformat() if a.last_login_at else None,
                "last_login_ip": a.last_login_ip,
            }
            for a in admins
        ]
    }


@router.post("", status_code=201)
async def invite_admin(
    payload: InviteAdmin,
    request: Request,
    admin=Depends(require_permission("admins.write")),
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(select(AdminUser).where(AdminUser.email == payload.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    new_admin = AdminUser(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role_id=payload.role_id,
    )
    db.add(new_admin)
    await db.flush()

    audit = AuditService(db)
    await audit.log("invite_admin", "admin_user", str(new_admin.id), admin_id=admin.id,
                    ip_address=request.client.host if request.client else None,
                    after_data={"email": payload.email, "role_id": str(payload.role_id)})
    await db.commit()
    return {"id": str(new_admin.id), "message": "Admin invited"}


@router.patch("/{admin_id}")
async def update_admin(
    admin_id: uuid.UUID,
    payload: UpdateAdmin,
    request: Request,
    admin=Depends(require_permission("admins.write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Admin not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(target, k, v)

    audit = AuditService(db)
    await audit.log("update_admin", "admin_user", str(admin_id), admin_id=admin.id,
                    ip_address=request.client.host if request.client else None,
                    after_data=payload.model_dump(exclude_unset=True))
    return {"message": "Admin updated"}


@router.get("/roles")
async def list_roles(
    admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    roles = (await db.execute(select(AdminRole))).scalars().all()
    return {
        "roles": [
            {"id": str(r.id), "name": r.name, "permissions": r.permissions}
            for r in roles
        ]
    }


@router.post("/roles", status_code=201)
async def create_role(
    payload: CreateRoleRequest,
    admin=Depends(require_permission("admins.write")),
    db: AsyncSession = Depends(get_db),
):
    role = AdminRole(name=payload.name, permissions=payload.permissions)
    db.add(role)
    await db.flush()
    await db.commit()
    return {"id": str(role.id), "message": "Role created"}
