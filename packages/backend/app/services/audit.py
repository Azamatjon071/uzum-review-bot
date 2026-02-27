import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        admin_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        before_data: Optional[dict] = None,
        after_data: Optional[dict] = None,
    ) -> AuditLog:
        log = AuditLog(
            admin_id=admin_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            before_data=before_data,
            after_data=after_data,
        )
        self.db.add(log)
        await self.db.flush()
        return log
