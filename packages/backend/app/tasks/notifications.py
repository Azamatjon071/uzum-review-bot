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


def _send_message(chat_id: int, text: str, parse_mode: str = "HTML",
                  reply_markup: dict | None = None) -> bool:
    """Synchronous helper — called inside Celery worker (no event loop)."""
    try:
        payload: dict = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        resp = httpx.post(f"{BOT_API}/sendMessage", json=payload, timeout=10)
        resp.raise_for_status()
        return True
    except Exception as exc:
        logger.error("Failed to send Telegram message to %s: %s", chat_id, exc)
        return False


def _send_photo(chat_id: int, photo_url: str, caption: str = "",
                parse_mode: str = "HTML") -> bool:
    """Send a photo message via Telegram Bot API."""
    try:
        resp = httpx.post(
            f"{BOT_API}/sendPhoto",
            json={"chat_id": chat_id, "photo": photo_url,
                  "caption": caption, "parse_mode": parse_mode},
            timeout=15,
        )
        resp.raise_for_status()
        return True
    except Exception as exc:
        logger.error("Failed to send Telegram photo to %s: %s", chat_id, exc)
        return False


def _webapp_button(lang: str) -> dict:
    """Inline keyboard with Open Mini App button."""
    labels = {"uz": "🎡 Mini Ilovani ochish", "ru": "🎡 Открыть мини-приложение", "en": "🎡 Open Mini App"}
    label = labels.get(lang, labels["uz"])
    return {
        "inline_keyboard": [[{
            "text": label,
            "web_app": {"url": settings.WEBAPP_URL},
        }]]
    }


# ── Milestone encouragement messages ──────────────────────────────────────────

MILESTONES = {
    1:  {"uz": "🌟 Birinchi sharhingiz tasdiqlandi! Ajoyib boshlash!",
         "ru": "🌟 Первый отзыв одобрен! Отличное начало!",
         "en": "🌟 First review approved! Great start!"},
    3:  {"uz": "🔥 3 ta sharh! Siz faolsiz — davom eting!",
         "ru": "🔥 3 отзыва! Вы активны — продолжайте!",
         "en": "🔥 3 reviews! You're on a roll — keep going!"},
    5:  {"uz": "⭐ 5 ta sharh! Siz bizning eng faol foydalanuvchilarimizdan birisiz!",
         "ru": "⭐ 5 отзывов! Вы один из самых активных пользователей!",
         "en": "⭐ 5 reviews! You're one of our most active users!"},
    10: {"uz": "🏆 10 ta sharh! Siz UZUM EKSPERTI bo'ldingiz! Maxsus sovrin kutmoqda!",
         "ru": "🏆 10 отзывов! Вы стали ЭКСПЕРТОМ UZUM! Специальный приз ждёт!",
         "en": "🏆 10 reviews! You've become an UZUM EXPERT! A special prize awaits!"},
    20: {"uz": "👑 20 ta sharh! Siz UZUM LEGENDASI! Zo'r natija!",
         "ru": "👑 20 отзывов! Вы ЛЕГЕНДА UZUM! Невероятный результат!",
         "en": "👑 20 reviews! You're an UZUM LEGEND! Incredible achievement!"},
}


# ---------------------------------------------------------------------------
# Submission notifications
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_submission_received(self, telegram_id: int, submission_id: str, lang: str = "uz"):
    """Tell the user their submission was received and is under review."""
    lang = lang.lower()
    texts = {
        "uz": (
            f"✅ <b>Sharh qabul qilindi!</b>\n\n"
            f"Sizning <code>{submission_id[:8]}…</code> raqamli sharhingiz ko'rib chiqish uchun yuborildi.\n"
            f"Natija 24 soat ichida ma'lum qilinadi.\n\n"
            f"Holat: /status"
        ),
        "ru": (
            f"✅ <b>Отзыв получен!</b>\n\n"
            f"Ваш отзыв <code>{submission_id[:8]}…</code> отправлен на проверку.\n"
            f"Результат будет сообщён в течение 24 часов.\n\n"
            f"Статус: /status"
        ),
        "en": (
            f"✅ <b>Review received!</b>\n\n"
            f"Your review <code>{submission_id[:8]}…</code> has been submitted for moderation.\n"
            f"You will be notified within 24 hours.\n\n"
            f"Status: /status"
        ),
    }
    text = texts.get(lang, texts["uz"])
    try:
        _send_message(telegram_id, text)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_submission_approved(
    self,
    telegram_id: int,
    submission_id: str,
    lang: str = "uz",
    spin_count: int = 0,
    approved_total: int = 1,
):
    """Tell the user their submission was approved — they can now spin."""
    lang = lang.lower()
    spin_info = {
        "uz": f"\n\n🎯 Sizda <b>{spin_count}</b> ta g'ildirak aylanishi mavjud!",
        "ru": f"\n\n🎯 У вас доступно <b>{spin_count}</b> вращений колеса!",
        "en": f"\n\n🎯 You have <b>{spin_count}</b> spin(s) available!",
    }
    texts = {
        "uz": (
            f"🎉 <b>Sharhingiz tasdiqlandi!</b>\n\n"
            f"<code>{submission_id[:8]}…</code> raqamli sharhingiz muvaffaqiyatli tasdiqlandi."
            f"{spin_info['uz']}"
        ),
        "ru": (
            f"🎉 <b>Ваш отзыв одобрен!</b>\n\n"
            f"Отзыв <code>{submission_id[:8]}…</code> успешно одобрен."
            f"{spin_info['ru']}"
        ),
        "en": (
            f"🎉 <b>Review approved!</b>\n\n"
            f"Review <code>{submission_id[:8]}…</code> has been approved."
            f"{spin_info['en']}"
        ),
    }
    text = texts.get(lang, texts["uz"])

    # Add milestone message if applicable
    milestone = MILESTONES.get(approved_total)
    if milestone:
        text += f"\n\n{milestone.get(lang, milestone['uz'])}"

    try:
        _send_message(telegram_id, text, reply_markup=_webapp_button(lang))
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_submission_rejected(
    self,
    telegram_id: int,
    submission_id: str,
    reason: Optional[str] = None,
    lang: str = "uz",
):
    """Tell the user their submission was rejected with an optional reason."""
    lang = lang.lower()
    reason_str_map = {
        "uz": f"\n\n<i>Sabab: {reason}</i>" if reason else "",
        "ru": f"\n\n<i>Причина: {reason}</i>" if reason else "",
        "en": f"\n\n<i>Reason: {reason}</i>" if reason else "",
    }
    texts = {
        "uz": (
            f"❌ <b>Sharh rad etildi</b>\n\n"
            f"<code>{submission_id[:8]}…</code> raqamli sharhingiz moderatsiyadan o'tmadi."
            f"{reason_str_map['uz']}\n\n"
            f"Qayta urinib ko'ring yoki /help buyrug'idan foydalaning."
        ),
        "ru": (
            f"❌ <b>Отзыв отклонён</b>\n\n"
            f"Отзыв <code>{submission_id[:8]}…</code> не прошёл модерацию."
            f"{reason_str_map['ru']}\n\n"
            f"Попробуйте ещё раз или используйте /help."
        ),
        "en": (
            f"❌ <b>Review rejected</b>\n\n"
            f"Review <code>{submission_id[:8]}…</code> did not pass moderation."
            f"{reason_str_map['en']}\n\n"
            f"Please try again or use /help."
        ),
    }
    text = texts.get(lang, texts["uz"])
    try:
        _send_message(telegram_id, text)
    except Exception as exc:
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Referral notifications
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_referral_bonus(
    self,
    telegram_id: int,
    referred_name: str,
    total_referrals: int,
    spin_count: int,
    lang: str = "uz",
):
    """Notify referrer that their friend joined and they earned a bonus spin."""
    lang = lang.lower()
    texts = {
        "uz": (
            f"🎁 <b>Taklif bonusi!</b>\n\n"
            f"<b>{referred_name}</b> sizning taklif havolangiz orqali qo'shildi!\n"
            f"Siz <b>1 ta qo'shimcha</b> g'ildirak aylanishi oldingiz.\n\n"
            f"Jami takliflar: <b>{total_referrals}</b>\n"
            f"Mavjud aylanishlar: <b>{spin_count}</b>\n\n"
            f"Havolangizni: /referral"
        ),
        "ru": (
            f"🎁 <b>Реферальный бонус!</b>\n\n"
            f"<b>{referred_name}</b> присоединился по вашей реферальной ссылке!\n"
            f"Вы получили <b>1 дополнительное</b> вращение колеса.\n\n"
            f"Всего рефералов: <b>{total_referrals}</b>\n"
            f"Доступно вращений: <b>{spin_count}</b>\n\n"
            f"Ваша ссылка: /referral"
        ),
        "en": (
            f"🎁 <b>Referral bonus!</b>\n\n"
            f"<b>{referred_name}</b> joined via your referral link!\n"
            f"You earned <b>1 extra</b> wheel spin.\n\n"
            f"Total referrals: <b>{total_referrals}</b>\n"
            f"Available spins: <b>{spin_count}</b>\n\n"
            f"Your link: /referral"
        ),
    }
    text = texts.get(lang, texts["uz"])
    try:
        _send_message(telegram_id, text, reply_markup=_webapp_button(lang))
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
    lang = lang.lower()
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
        _send_message(telegram_id, text, reply_markup=_webapp_button(lang))
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
    lang = lang.lower()
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
    """Send a single broadcast text message to one user."""
    try:
        _send_message(telegram_id, message)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def send_broadcast_photo(self, telegram_id: int, photo_url: str, caption: str = ""):
    """Send a single broadcast photo message to one user."""
    try:
        _send_photo(telegram_id, photo_url, caption)
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
