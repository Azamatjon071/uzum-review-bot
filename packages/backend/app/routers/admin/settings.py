from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.deps import require_permission
from app.models import Setting
from app.services.audit import AuditService
from typing import Any

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])


@router.get("")
async def get_settings_all(
    admin=Depends(require_permission("view_settings")),
    db: AsyncSession = Depends(get_db),
):
    settings = (await db.execute(select(Setting))).scalars().all()
    return {s.key: {"value": s.value, "description": s.description} for s in settings}


@router.patch("")
async def update_settings(
    updates: dict,
    request: Request,
    admin=Depends(require_permission("manage_settings")),
    db: AsyncSession = Depends(get_db),
):
    audit = AuditService(db)
    for key, value in updates.items():
        result = await db.execute(select(Setting).where(Setting.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            before = {"value": setting.value}
            setting.value = value
            setting.updated_by_admin_id = admin.id
            await audit.log("update_setting", "setting", key, admin_id=admin.id,
                            ip_address=request.client.host if request.client else None,
                            before_data=before, after_data={"value": value})
        else:
            new_setting = Setting(key=key, value=value, updated_by_admin_id=admin.id)
            db.add(new_setting)
    return {"message": f"Updated {len(updates)} setting(s)"}
