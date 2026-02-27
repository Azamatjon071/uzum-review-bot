"""
Celery tasks for Telegram bot notifications.
Sends messages to users asynchronously so the API response is not blocked.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx
from celery import shared_task

from app.config import get_settings
from app.tasks.celery import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()

BOT_API = f"https://api.telegram.org/bot{settings.BOT_TOKEN}"


def _send_message(chat_id: int, text: str, parse_mode: str = "HTML") -> bool:
    """Synchronous helper — called inside Celery worker (no event loop)."""
    try:
        resp = httpx.post(
            f"{BOT_API}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception as exc:
        logger.error("Failed to send Telegram message to %s: %s", chat_id, exc)
        return False


# ---------------------------------------------------------------------------
# Submission notifications
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_submission_received(self, telegram_id: int, submission_id: int, lang: str = "uz"):
    """Tell the user their submission was received and is under review."""
    texts = {
        "uz": (
            f"✅ <b>Sharh qabul qilindi!</b>\n\n"
            f"Sizning #{submission_id} raqamli sharhingiz ko'rib chiqish uchun yuborildi.\n"
            f"Natija 24 soat ichida ma'lum qilinadi."
        ),
        "ru": (
            f"✅ <b>Отзыв получен!</b>\n\n"
            f"Ваш отзыв #{submission_id} отправлен на проверку.\n"
            f"Результат будет сообщён в течение 24 часов."
        ),
        "en": (
            f"✅ <b>Review received!</b>\n\n"
            f"Your review #{submission_id} has been submitted for moderation.\n"
            f"You will be notified within 24 hours."
        ),
    }
    text = texts.get(lang, texts["uz"])
    try:
        _send_message(telegram_id, text)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_submission_approved(self, telegram_id: int, submission_id: int, lang: str = "uz"):
    """Tell the user their submission was approved — they can now spin."""
    texts = {
        "uz": (
            f"🎉 <b>Sharhingiz tasdiqlandi!</b>\n\n"
            f"#{submission_id} raqamli sharhingiz muvaffaqiyatli tasdiqlandi.\n"
            f"Sovrin g'ildiragi uchun Mini Ilovani oching! 🎡"
        ),
        "ru": (
            f"🎉 <b>Ваш отзыв одобрен!</b>\n\n"
            f"Отзыв #{submission_id} успешно одобрен.\n"
            f"Откройте мини-приложение, чтобы крутить колесо призов! 🎡"
        ),
        "en": (
            f"🎉 <b>Review approved!</b>\n\n"
            f"Review #{submission_id} has been approved.\n"
            f"Open the Mini App to spin the prize wheel! 🎡"
        ),
    }
    text = texts.get(lang, texts["uz"])
    try:
        _send_message(telegram_id, text)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_submission_rejected(
    self,
    telegram_id: int,
    submission_id: int,
    reason: Optional[str] = None,
    lang: str = "uz",
):
    """Tell the user their submission was rejected with an optional reason."""
    reason_str = f"\n\n<i>Sabab: {reason}</i>" if reason else ""
    texts = {
        "uz": (
            f"❌ <b>Sharh rad etildi</b>\n\n"
            f"#{submission_id} raqamli sharhingiz moderatsiyadan o'tmadi.{reason_str}\n\n"
            f"Qayta urinib ko'ring yoki murojaat qiling."
        ),
        "ru": (
            f"❌ <b>Отзыв отклонён</b>\n\n"
            f"Отзыв #{submission_id} не прошёл модерацию.{reason_str}\n\n"
            f"Попробуйте ещё раз или обратитесь в поддержку."
        ),
        "en": (
            f"❌ <b>Review rejected</b>\n\n"
            f"Review #{submission_id} did not pass moderation.{reason_str}\n\n"
            f"Please try again or contact support."
        ),
    }
    text = texts.get(lang, texts["uz"])
    try:
        _send_message(telegram_id, text)
    except Exception as exc:
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Prize / reward notifications
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_prize_won(
    self,
    telegram_id: int,
    prize_name: str,
    prize_value: str,
    lang: str = "uz",
):
    texts = {
        "uz": (
            f"🏆 <b>Tabriklaymiz! Siz yutdingiz!</b>\n\n"
            f"Sovrin: <b>{prize_name}</b>\n"
            f"Qiymat: <b>{prize_value}</b>\n\n"
            f"Mukofotingiz hamyon bo'limiga qo'shildi."
        ),
        "ru": (
            f"🏆 <b>Поздравляем! Вы выиграли!</b>\n\n"
            f"Приз: <b>{prize_name}</b>\n"
            f"Стоимость: <b>{prize_value}</b>\n\n"
            f"Ваш приз добавлен в раздел «Кошелёк»."
        ),
        "en": (
            f"🏆 <b>Congratulations! You won!</b>\n\n"
            f"Prize: <b>{prize_name}</b>\n"
            f"Value: <b>{prize_value}</b>\n\n"
            f"Your reward has been added to your Wallet."
        ),
    }
    text = texts.get(lang, texts["uz"])
    try:
        _send_message(telegram_id, text)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_reward_expiring(
    self,
    telegram_id: int,
    prize_name: str,
    days_left: int,
    lang: str = "uz",
):
    texts = {
        "uz": (
            f"⏰ <b>Mukofot muddati tugayapti!</b>\n\n"
            f"<b>{prize_name}</b> mukofotingizni foydalanish uchun {days_left} kun qoldi.\n"
            f"Uni yutqazib qo'ymang!"
        ),
        "ru": (
            f"⏰ <b>Срок действия приза истекает!</b>\n\n"
            f"У вас осталось {days_left} дн. чтобы использовать <b>{prize_name}</b>.\n"
            f"Не упустите его!"
        ),
        "en": (
            f"⏰ <b>Reward expiring soon!</b>\n\n"
            f"You have {days_left} day(s) left to use <b>{prize_name}</b>.\n"
            f"Don't let it expire!"
        ),
    }
    text = texts.get(lang, texts["uz"])
    try:
        _send_message(telegram_id, text)
    except Exception as exc:
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Admin broadcast
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def send_broadcast_message(self, telegram_id: int, message: str):
    """Send a single broadcast message to one user (called per-user from broadcast router)."""
    try:
        _send_message(telegram_id, message)
    except Exception as exc:
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Maintenance
# ---------------------------------------------------------------------------

@celery_app.task
def expire_spin_commitments():
    """
    Placeholder beat task — Redis TTL handles expiry automatically.
    This task can be used to clean up DB records if needed in the future.
    """
    logger.info("expire_spin_commitments beat task ran (Redis TTL handles actual cleanup)")
