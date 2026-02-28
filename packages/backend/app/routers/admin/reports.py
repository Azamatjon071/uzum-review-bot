"""
Admin router: CSV/XLSX export generation and download.
"""
from __future__ import annotations

from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io

from app.database import get_db
from app.deps import require_permission
from app.models import AdminUser, Submission, User, PrizeSpin, CharityDonation
from app.services.audit import AuditService
from app.tasks.reports import generate_export_csv

router = APIRouter(prefix="/admin/reports", tags=["admin-reports"])

ExportType = Literal["submissions", "users", "spins", "donations"]


class ExportRequest(BaseModel):
    export_type: ExportType
    date_from: Optional[str] = None   # ISO date string
    date_to: Optional[str] = None
    async_mode: bool = False           # True = queue Celery task; False = stream inline


@router.post("/export")
async def request_export(
    body: ExportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_permission("reports.read")),
):
    """
    Generate a CSV export.
    - async_mode=false  → streams CSV directly in the response (up to ~50k rows)
    - async_mode=true   → queues a Celery task, returns task_id for status polling
    """
    audit = AuditService(db)
    if body.async_mode:
        task = generate_export_csv.delay(
            str(admin.id),  # UUID → string for Celery serialization
            body.export_type,
            {"date_from": body.date_from, "date_to": body.date_to},
        )
        await audit.log(
            action="report.export_queued",
            resource_type="report",
            admin_id=admin.id,
            after_data={"type": body.export_type, "task_id": task.id},
        )
        return {"task_id": task.id, "status": "queued"}

    # Inline streaming export
    buf = io.StringIO()
    writer = csv.writer(buf)

    if body.export_type == "submissions":
        writer.writerow(["id", "user_id", "order_number", "review_text", "status", "created_at"])
        rows = (await db.execute(select(Submission).order_by(Submission.id.desc()).limit(50000))).scalars().all()
        for r in rows:
            writer.writerow([r.id, r.user_id, r.order_number, r.review_text, r.status.value, r.created_at])

    elif body.export_type == "users":
        writer.writerow(["id", "telegram_id", "username", "first_name", "language", "is_banned", "total_submissions", "created_at"])
        rows = (await db.execute(select(User).order_by(User.id.desc()).limit(50000))).scalars().all()
        for r in rows:
            writer.writerow([r.id, r.telegram_id, r.username, r.first_name, r.language, r.is_banned, r.total_submissions, r.created_at])

    elif body.export_type == "spins":
        writer.writerow(["id", "user_id", "prize_id", "server_seed_hash", "nonce", "created_at"])
        rows = (await db.execute(select(PrizeSpin).order_by(PrizeSpin.id.desc()).limit(50000))).scalars().all()
        for r in rows:
            writer.writerow([r.id, r.user_id, r.prize_id, r.server_seed_hash, r.nonce, r.created_at])

    elif body.export_type == "donations":
        writer.writerow(["id", "user_id", "campaign_id", "amount_uzs", "source", "created_at"])
        rows = (await db.execute(select(CharityDonation).order_by(CharityDonation.id.desc()).limit(50000))).scalars().all()
        for r in rows:
            writer.writerow([r.id, r.user_id, r.campaign_id, r.amount_uzs, r.source, r.created_at])

    else:
        raise HTTPException(status_code=400, detail="Invalid export type")

    await audit.log(
        action="report.export_downloaded",
        resource_type="report",
        admin_id=admin.id,
        after_data={"type": body.export_type},
    )

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={body.export_type}_export.csv"},
    )


@router.get("/export/status/{task_id}")
async def export_status(
    task_id: str,
    admin: AdminUser = Depends(require_permission("reports.read")),
):
    """Poll async export task status."""
    from app.tasks.celery import celery_app
    result = celery_app.AsyncResult(task_id)
    return {"task_id": task_id, "status": result.status, "ready": result.ready()}
