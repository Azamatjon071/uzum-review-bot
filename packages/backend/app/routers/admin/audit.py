from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.deps import require_permission
from app.models import AuditLog, AdminUser

router = APIRouter(prefix="/admin/audit-log", tags=["admin-audit"])


@router.get("")
async def get_audit_log(
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    action: str = None,
    resource_type: str = None,
    admin=Depends(require_permission("view_audit_log")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import and_, func
    offset = (page - 1) * limit
    filters = []
    if action:
        filters.append(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        filters.append(AuditLog.resource_type == resource_type)

    query = select(AuditLog).order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
    if filters:
        query = query.where(and_(*filters))

    logs = (await db.execute(query)).scalars().all()
    total_q = select(func.count(AuditLog.id))
    if filters:
        total_q = total_q.where(and_(*filters))
    total = (await db.execute(total_q)).scalar()

    items = []
    for log in logs:
        admin_name = None
        if log.admin_id:
            admin_r = await db.execute(select(AdminUser).where(AdminUser.id == log.admin_id))
            admin_user = admin_r.scalar_one_or_none()
            admin_name = admin_user.full_name if admin_user else "Unknown"

        items.append({
            "id": str(log.id),
            "admin_id": str(log.admin_id) if log.admin_id else None,
            "admin_name": admin_name,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "before_data": log.before_data,
            "after_data": log.after_data,
            "created_at": log.created_at.isoformat(),
        })

    return {"items": items, "total": total, "page": page, "limit": limit}
