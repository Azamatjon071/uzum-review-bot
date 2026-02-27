"""
Submission FSM wizard:
  1. Ask for product URL
  2. Collect 1–5 screenshots
  3. POST to backend API
"""
from __future__ import annotations

import io
import logging
from typing import Any

from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, PhotoSize

from app.config import get_settings
from app.i18n import t
from app.keyboards import cancel_keyboard, done_cancel_keyboard, main_menu
from app.states import SubmitStates
from app.services.api import (
    auth_telegram,
    create_submission,
    APIError,
)

router = Router(name="submit")
log = logging.getLogger(__name__)
settings = get_settings()

UZUM_URL_PREFIX = "https://uzum.uz"
MAX_PHOTOS = 5


def _is_valid_uzum_url(url: str) -> bool:
    return url.startswith(UZUM_URL_PREFIX) and len(url) > len(UZUM_URL_PREFIX)


# ── Entry point ──────────────────────────────────────────────────────────────

@router.message(Command("submit"))
@router.message(F.text.in_({"📝 Sharh yuborish", "📝 Отправить отзыв", "📝 Submit review"}))
async def cmd_submit(message: Message, state: FSMContext, lang: str):
    await state.set_state(SubmitStates.waiting_for_url)
    await message.answer(
        t("submit.ask_url", lang),
        reply_markup=cancel_keyboard(lang),
        parse_mode="HTML",
    )


# ── Cancel from any state ─────────────────────────────────────────────────────

@router.message(
    F.text.in_({"❌ Bekor qilish", "❌ Отмена", "❌ Cancel"}),
    SubmitStates.waiting_for_url,
)
@router.message(
    F.text.in_({"❌ Bekor qilish", "❌ Отмена", "❌ Cancel"}),
    SubmitStates.waiting_for_photos,
)
async def cancel_submit(message: Message, state: FSMContext, lang: str):
    await state.clear()
    await message.answer(
        t("submit.cancelled", lang),
        reply_markup=main_menu(lang, settings.WEBAPP_URL),
    )


# ── Step 1: URL ───────────────────────────────────────────────────────────────

@router.message(SubmitStates.waiting_for_url)
async def process_url(message: Message, state: FSMContext, lang: str):
    url = (message.text or "").strip()
    if not _is_valid_uzum_url(url):
        await message.answer(t("submit.invalid_url", lang))
        return

    await state.update_data(product_url=url, photos=[])
    await state.set_state(SubmitStates.waiting_for_photos)
    await message.answer(
        t("submit.ask_screenshots", lang),
        reply_markup=done_cancel_keyboard(lang),
        parse_mode="HTML",
    )


# ── Step 2: Photos ────────────────────────────────────────────────────────────

@router.message(SubmitStates.waiting_for_photos, F.photo)
async def process_photo(message: Message, state: FSMContext, lang: str, bot: Bot):
    data = await state.get_data()
    photos: list[dict] = data.get("photos", [])

    if len(photos) >= MAX_PHOTOS:
        await message.answer(t("submit.max_photos", lang))
        return

    # Take highest resolution
    best: PhotoSize = message.photo[-1]
    photos.append({"file_id": best.file_id})
    await state.update_data(photos=photos)

    count = len(photos)
    await message.answer(t("submit.photo_added", lang, count=count))


# ── Step 3: Done — upload ─────────────────────────────────────────────────────

@router.message(
    SubmitStates.waiting_for_photos,
    F.text.in_({"✅ Tayyor", "✅ Готово", "✅ Done"}),
)
async def process_done(message: Message, state: FSMContext, lang: str, bot: Bot):
    data = await state.get_data()
    photos: list[dict] = data.get("photos", [])

    if not photos:
        await message.answer(t("submit.no_photos", lang))
        return

    await message.answer(t("submit.sending", lang))
    await state.clear()

    # Get JWT — build a minimal initData string using bot token + user info
    tg_user = message.from_user
    # For bot-side auth we use a special server-to-server endpoint or build initData
    # Here we build the initData manually so the backend can verify it
    import hashlib, hmac, json, time, urllib.parse

    user_json = json.dumps({
        "id": tg_user.id,
        "first_name": tg_user.first_name or "",
        "last_name": tg_user.last_name or "",
        "username": tg_user.username or "",
        "language_code": tg_user.language_code or lang,
    }, separators=(",", ":"))

    auth_date = str(int(time.time()))
    data_check_string = f"auth_date={auth_date}\nuser={user_json}"
    secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    hash_val = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    init_data = urllib.parse.urlencode({
        "auth_date": auth_date,
        "user": user_json,
        "hash": hash_val,
    })

    try:
        auth_resp = await auth_telegram(init_data)
        token = auth_resp["access_token"]
    except APIError as e:
        log.error("Auth failed for user %s: %s", tg_user.id, e)
        await message.answer(t("submit.error", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
        return

    # Download photos
    photo_bytes_list = []
    for i, p in enumerate(photos):
        file = await bot.get_file(p["file_id"])
        buf = io.BytesIO()
        await bot.download_file(file.file_path, buf)
        photo_bytes_list.append((buf.getvalue(), f"photo_{i+1}.jpg"))

    try:
        resp = await create_submission(
            token=token,
            product_url=data["product_url"],
            photo_bytes_list=photo_bytes_list,
        )
        submission_id = resp.get("id", "?")
        await message.answer(
            t("submit.success", lang, submission_id=submission_id),
            reply_markup=main_menu(lang, settings.WEBAPP_URL),
            parse_mode="HTML",
        )
    except APIError as e:
        log.error("Submit failed: %s", e)
        if e.status_code == 429:
            await message.answer(t("submit.daily_limit", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
        elif e.status_code == 409:
            await message.answer(t("submit.duplicate", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
        else:
            await message.answer(t("submit.error", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
