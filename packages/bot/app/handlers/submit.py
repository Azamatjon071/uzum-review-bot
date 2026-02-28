"""
Submission FSM wizard:
  1. Show product list (with search), user picks a product via inline button
  2. Collect 1–5 screenshots
  3. POST to backend API with product_id
"""
from __future__ import annotations

import io
import logging
from typing import Any

from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    Message, PhotoSize,
    InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.config import get_settings
from app.i18n import t
from app.keyboards import cancel_keyboard, done_cancel_keyboard, main_menu
from app.states import SubmitStates
from app.services.api import (
    auth_telegram,
    create_submission,
    get_products,
    APIError,
)

router = Router(name="submit")
log = logging.getLogger(__name__)
settings = get_settings()

MAX_PHOTOS = 5
PAGE_SIZE = 8   # products shown per page


def _product_name(product: dict, lang: str) -> str:
    if lang == "ru" and product.get("name_ru"):
        return product["name_ru"]
    if lang == "en" and product.get("name_en"):
        return product["name_en"]
    return product.get("name_uz") or product.get("name_ru") or product.get("name_en") or "?"


def _build_product_keyboard(products: list[dict], lang: str, show_search_btn: bool = True) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for p in products:
        name = _product_name(p, lang)
        label = name[:48] + "…" if len(name) > 48 else name
        builder.button(text=label, callback_data=f"prod:{p['id']}")
    builder.adjust(1)
    # Extra row: Search + Cancel
    extras = []
    if show_search_btn:
        extras.append(InlineKeyboardButton(
            text={"uz": "🔍 Qidirish", "ru": "🔍 Поиск", "en": "🔍 Search"}.get(lang, "🔍 Search"),
            callback_data="prod:search",
        ))
    extras.append(InlineKeyboardButton(
        text=t("btn.cancel", lang),
        callback_data="prod:cancel",
    ))
    builder.row(*extras)
    return builder.as_markup()


# ── Entry point ──────────────────────────────────────────────────────────────

@router.message(Command("submit"))
@router.message(F.text.in_({"📝 Sharh yuborish", "📝 Отправить отзыв", "📝 Submit review"}))
async def cmd_submit(message: Message, state: FSMContext, lang: str):
    await state.set_state(SubmitStates.waiting_for_product)
    await state.update_data(photos=[], product_id=None, product_name=None)

    try:
        data = await get_products(page_size=PAGE_SIZE)
        products: list[dict] = data.get("products", [])
    except APIError:
        products = []

    if not products:
        await message.answer(
            t("submit.no_products", lang),
            reply_markup=main_menu(lang, settings.WEBAPP_URL),
        )
        await state.clear()
        return

    lines = [t("submit.ask_product", lang), ""]
    await message.answer(
        "\n".join(lines),
        reply_markup=_build_product_keyboard(products, lang),
        parse_mode="HTML",
    )


# ── Cancel from any state ─────────────────────────────────────────────────────

@router.message(
    F.text.in_({"❌ Bekor qilish", "❌ Отмена", "❌ Cancel"}),
    SubmitStates.waiting_for_product,
)
@router.message(
    F.text.in_({"❌ Bekor qilish", "❌ Отмена", "❌ Cancel"}),
    SubmitStates.waiting_for_search,
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


@router.callback_query(F.data == "prod:cancel", SubmitStates.waiting_for_product)
@router.callback_query(F.data == "prod:cancel", SubmitStates.waiting_for_search)
async def inline_cancel(callback: CallbackQuery, state: FSMContext, lang: str):
    await state.clear()
    await callback.message.edit_text(t("submit.cancelled", lang))
    await callback.answer()
    await callback.message.answer(
        t("submit.cancelled", lang),
        reply_markup=main_menu(lang, settings.WEBAPP_URL),
    )


# ── Inline search button ──────────────────────────────────────────────────────

@router.callback_query(F.data == "prod:search", SubmitStates.waiting_for_product)
async def inline_search(callback: CallbackQuery, state: FSMContext, lang: str):
    await state.set_state(SubmitStates.waiting_for_search)
    await callback.answer()
    await callback.message.answer(
        t("submit.search_hint", lang),
        reply_markup=cancel_keyboard(lang),
    )


# ── User types a search query ─────────────────────────────────────────────────

@router.message(SubmitStates.waiting_for_search)
async def process_search(message: Message, state: FSMContext, lang: str):
    query = (message.text or "").strip()
    try:
        data = await get_products(search=query, page_size=PAGE_SIZE)
        products: list[dict] = data.get("products", [])
    except APIError:
        products = []

    if not products:
        await message.answer(
            t("submit.product_not_found", lang),
            reply_markup=cancel_keyboard(lang),
        )
        return

    await state.set_state(SubmitStates.waiting_for_product)
    await message.answer(
        t("submit.product_list_header", lang),
        reply_markup=_build_product_keyboard(products, lang),
        parse_mode="HTML",
    )


# ── Product selected via inline button ───────────────────────────────────────

@router.callback_query(F.data.startswith("prod:"), SubmitStates.waiting_for_product)
async def inline_product_selected(callback: CallbackQuery, state: FSMContext, lang: str):
    product_id = callback.data.split("prod:", 1)[1]
    # Fetch the product name to display
    try:
        data = await get_products(page_size=200)
        products = data.get("products", [])
        product = next((p for p in products if p["id"] == product_id), None)
    except APIError:
        product = None

    if not product:
        # Fallback: just use the ID
        name = product_id[:16]
    else:
        name = _product_name(product, lang)

    await state.update_data(product_id=product_id, product_name=name, photos=[])
    await state.set_state(SubmitStates.waiting_for_photos)

    await callback.answer(f"✅ {name}")
    await callback.message.edit_text(
        t("submit.product_selected", lang, name=name),
        parse_mode="HTML",
    )
    await callback.message.answer(
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
    product_id: str | None = data.get("product_id")

    if not photos:
        await message.answer(t("submit.no_photos", lang))
        return

    await message.answer(t("submit.sending", lang))
    await state.clear()

    # Build JWT via Telegram initData
    tg_user = message.from_user
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
        # Always submit with product_id (UUID)
        from app.services.api import _request
        files = [
            ("images", (fname, data_bytes, "image/jpeg"))
            for data_bytes, fname in photo_bytes_list
        ]
        form_data = {"product_id": product_id} if product_id else {}
        resp = await _request("POST", "/api/v1/submissions", token=token, data=form_data, files=files)
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
