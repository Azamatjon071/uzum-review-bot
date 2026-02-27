"""
Celery tasks for generating and sending reports.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

import httpx
from sqlalchemy import select, func, and_

from app.config import get_settings
from app.tasks.celery import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


@celery_app.task
def send_daily_summary():
    """
    Compute yesterday's KPIs and post a summary message to the admin Telegram group
    (if ADMIN_CHAT_ID is configured). Runs synchronously inside the Celery worker.
    """
    try:
        import asyncio
        asyncio.run(_compute_and_send_daily_summary())
    except Exception as exc:
        logger.error("send_daily_summary failed: %s", exc)


async def _compute_and_send_daily_summary():
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.models import Submission, PrizeSpin, CharityDonation, User
    from app.models import SubmissionStatus

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    yesterday = date.today() - timedelta(days=1)
    start = f"{yesterday} 00:00:00"
    end = f"{yesterday} 23:59:59"

    async with async_session() as session:
        # submissions
        sub_total = await session.scalar(
            select(func.count(Submission.id)).where(
                and_(Submission.created_at >= start, Submission.created_at <= end)
            )
        )
        sub_approved = await session.scalar(
            select(func.count(Submission.id)).where(
                and_(
                    Submission.created_at >= start,
                    Submission.created_at <= end,
                    Submission.status == SubmissionStatus.APPROVED,
                )
            )
        )
        # spins
        spins_total = await session.scalar(
            select(func.count(PrizeSpin.id)).where(
                and_(PrizeSpin.created_at >= start, PrizeSpin.created_at <= end)
            )
        )
        # charity
        charity_total = await session.scalar(
            select(func.coalesce(func.sum(CharityDonation.amount_uzs), 0)).where(
                and_(CharityDonation.created_at >= start, CharityDonation.created_at <= end)
            )
        )
        # new users
        new_users = await session.scalar(
            select(func.count(User.id)).where(
                and_(User.created_at >= start, User.created_at <= end)
            )
        )

    await engine.dispose()

    text = (
        f"📊 <b>Kunlik hisobot — {yesterday}</b>\n\n"
        f"👤 Yangi foydalanuvchilar: <b>{new_users}</b>\n"
        f"📝 Yuborilgan sharhlar: <b>{sub_total}</b>\n"
        f"✅ Tasdiqlangan: <b>{sub_approved}</b>\n"
        f"🎡 Aylantirishlar: <b>{spins_total}</b>\n"
        f"🕌 Xayriya: <b>{int(charity_total):,} UZS</b>"
    )

    admin_chat_id = getattr(settings, "ADMIN_CHAT_ID", None)
    if admin_chat_id:
        try:
            httpx.post(
                f"https://api.telegram.org/bot{settings.BOT_TOKEN}/sendMessage",
                json={"chat_id": admin_chat_id, "text": text, "parse_mode": "HTML"},
                timeout=10,
            )
        except Exception as exc:
            logger.error("Failed to send daily summary to admin chat: %s", exc)
    else:
        logger.info("Daily summary (no ADMIN_CHAT_ID configured):\n%s", text)


@celery_app.task(bind=True, max_retries=2)
def generate_export_csv(self, admin_user_id: int, export_type: str, filters: dict):
    """
    Generate a CSV export (submissions / users / spins) and upload to MinIO,
    then notify the requesting admin via a presigned download URL.
    """
    try:
        import asyncio
        asyncio.run(_generate_export(admin_user_id, export_type, filters))
    except Exception as exc:
        raise self.retry(exc=exc)


async def _generate_export(admin_user_id: int, export_type: str, filters: dict):
    import csv
    import io
    from datetime import datetime
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.models import Submission, User, PrizeSpin
    from app.services.storage import StorageService

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    storage = StorageService()

    buf = io.StringIO()
    writer = csv.writer(buf)

    async with async_session() as session:
        if export_type == "submissions":
            writer.writerow(["id", "user_id", "order_number", "review_text", "status", "created_at"])
            rows = (await session.execute(select(Submission).limit(10000))).scalars().all()
            for r in rows:
                writer.writerow([r.id, r.user_id, r.order_number, r.review_text, r.status.value, r.created_at])
        elif export_type == "users":
            writer.writerow(["id", "telegram_id", "username", "language", "is_banned", "created_at"])
            rows = (await session.execute(select(User).limit(10000))).scalars().all()
            for r in rows:
                writer.writerow([r.id, r.telegram_id, r.username, r.language, r.is_banned, r.created_at])
        elif export_type == "spins":
            writer.writerow(["id", "user_id", "prize_id", "created_at"])
            rows = (await session.execute(select(PrizeSpin).limit(10000))).scalars().all()
            for r in rows:
                writer.writerow([r.id, r.user_id, r.prize_id, r.created_at])
        elif export_type == "donations":
            writer.writerow(["id", "user_id", "campaign_id", "amount_uzs", "source", "created_at"])
            from app.models import CharityDonation
            rows = (await session.execute(select(CharityDonation).limit(10000))).scalars().all()
            for r in rows:
                writer.writerow([r.id, r.user_id, r.campaign_id, r.amount_uzs, r.source, r.created_at])

    await engine.dispose()

    content = buf.getvalue().encode("utf-8")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    object_name = f"exports/{export_type}_{timestamp}_{admin_user_id}.csv"

    # Upload CSV to MinIO
    await storage.upload_image(content, object_name, content_type="text/csv")

    presigned_url = storage.get_presigned_url(
        object_name, expires=60 * 60 * 24  # 24-hour download link
    )

    # Notify admin via Telegram if ADMIN_CHAT_ID is set
    admin_chat_id = getattr(settings, "ADMIN_CHAT_ID", None)
    if admin_chat_id:
        try:
            import httpx as _httpx
            BOT_API = f"https://api.telegram.org/bot{settings.BOT_TOKEN}"
            text = (
                f"📥 <b>Export ready!</b>\n\n"
                f"Type: <code>{export_type}</code>\n"
                f"Generated: {timestamp}\n\n"
                f'<a href="{presigned_url}">Download CSV (valid 24h)</a>'
            )
            _httpx.post(
                f"{BOT_API}/sendMessage",
                json={"chat_id": admin_chat_id, "text": text,
                      "parse_mode": "HTML", "disable_web_page_preview": True},
                timeout=10,
            )
        except Exception as exc:
            logger.error("Failed to notify admin of export: %s", exc)
    else:
        logger.info("Export ready for admin %s: %s", admin_user_id, presigned_url)
