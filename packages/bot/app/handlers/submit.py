"""
Submission FSM wizard:
  1. Entry: check for saved draft → offer resume or start fresh
  2. Show product list (with search), user picks a product via inline button
  3. Ask for order number (optional, with Skip button)
  4. Collect 1–5 screenshots
  5. Show confirmation card (product, order, photo count) → Confirm / Edit
  6. On Confirm: POST to backend API
"""
from __future__ import annotations

import io
import logging
import random
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
    get_auth_token,
    get_products,
    _request,
    APIError,
)

router = Router(name="submit")
log = logging.getLogger(__name__)
settings = get_settings()

MAX_PHOTOS = 5
PAGE_SIZE = 8   # products shown per page

TIP_KEYS = ["tip.1", "tip.2", "tip.3", "tip.4", "tip.5"]


# ── Keyboard helpers ──────────────────────────────────────────────────────────

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


def _draft_keyboard(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("submit.btn_resume", lang), callback_data="draft:resume")
    builder.button(text=t("submit.btn_new", lang), callback_data="draft:new")
    builder.adjust(1)
    return builder.as_markup()


def _order_skip_keyboard(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("submit.btn_skip", lang), callback_data="order:skip")
    return builder.as_markup()


def _confirm_keyboard(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("submit.btn_confirm", lang), callback_data="confirm:yes")
    builder.button(text=t("submit.btn_edit", lang), callback_data="confirm:edit")
    builder.adjust(2)
    return builder.as_markup()


# ── Entry point ───────────────────────────────────────────────────────────────

@router.message(Command("submit"))
@router.message(F.text.in_({"📝 Sharh yuborish", "📝 Отправить отзыв", "📝 Submit review"}))
async def cmd_submit(message: Message, state: FSMContext, lang: str):
    # Check for a saved draft (product_id set, at least 0 photos recorded)
    current = await state.get_data()
    has_draft = bool(current.get("product_id") and current.get("product_name"))

    if has_draft:
        photo_count = len(current.get("photos", []))
        await message.answer(
            t("submit.draft_resume", lang,
              product=current["product_name"],
              count=photo_count),
            reply_markup=_draft_keyboard(lang),
            parse_mode="HTML",
        )
        return

    await _start_fresh(message, state, lang)


# ── Draft: resume or start fresh ─────────────────────────────────────────────

@router.callback_query(F.data == "draft:resume")
async def draft_resume(callback: CallbackQuery, state: FSMContext, lang: str):
    data = await state.get_data()
    await callback.answer()
    photos = data.get("photos", [])
    if photos:
        # Already has photos — go straight to photo collection
        await state.set_state(SubmitStates.waiting_for_photos)
        await callback.message.edit_text(
            t("submit.product_selected", lang, name=data["product_name"]),
            parse_mode="HTML",
        )
        await callback.message.answer(
            t("submit.ask_screenshots", lang),
            reply_markup=done_cancel_keyboard(lang),
            parse_mode="HTML",
        )
    else:
        # Has product but no photos — resume at order number step
        await state.set_state(SubmitStates.waiting_for_order)
        await callback.message.edit_text(
            t("submit.ask_order_number", lang),
            reply_markup=_order_skip_keyboard(lang),
            parse_mode="HTML",
        )


@router.callback_query(F.data == "draft:new")
async def draft_new(callback: CallbackQuery, state: FSMContext, lang: str):
    await callback.answer()
    await state.clear()
    await _start_fresh(callback.message, state, lang)


async def _start_fresh(message: Message, state: FSMContext, lang: str) -> None:
    await state.set_state(SubmitStates.waiting_for_product)
    await state.update_data(photos=[], product_id=None, product_name=None, order_number=None)

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

    await message.answer(
        t("submit.ask_product", lang),
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
    SubmitStates.waiting_for_order,
)
@router.message(
    F.text.in_({"❌ Bekor qilish", "❌ Отмена", "❌ Cancel"}),
    SubmitStates.waiting_for_photos,
)
async def cancel_submit(message: Message, state: FSMContext, lang: str):
    # Save partial draft before clearing only product/order metadata
    data = await state.get_data()
    product_id = data.get("product_id")
    product_name = data.get("product_name")
    photos = data.get("photos", [])

    if product_id:
        # Keep draft in state but clear the FSM active state
        await state.set_state(None)
        await state.update_data(product_id=product_id, product_name=product_name, photos=photos, order_number=None)
        await message.answer(
            t("submit.draft_saved", lang),
            reply_markup=main_menu(lang, settings.WEBAPP_URL),
        )
    else:
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

    name = _product_name(product, lang) if product else product_id[:16]

    await state.update_data(product_id=product_id, product_name=name, photos=[], order_number=None)
    await state.set_state(SubmitStates.waiting_for_order)

    await callback.answer(f"✅ {name}")
    await callback.message.edit_text(
        t("submit.product_selected", lang, name=name),
        parse_mode="HTML",
    )

    # Show order number prompt
    await callback.message.answer(
        t("submit.ask_order_number", lang),
        reply_markup=_order_skip_keyboard(lang),
        parse_mode="HTML",
    )


# ── Order number step ─────────────────────────────────────────────────────────

@router.message(SubmitStates.waiting_for_order, F.text)
async def process_order_number(message: Message, state: FSMContext, lang: str):
    order = (message.text or "").strip()
    await state.update_data(order_number=order)
    await _proceed_to_photos(message, state, lang, order_display=order)


@router.callback_query(F.data == "order:skip", SubmitStates.waiting_for_order)
async def order_skip(callback: CallbackQuery, state: FSMContext, lang: str):
    await state.update_data(order_number=None)
    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await _proceed_to_photos(callback.message, state, lang, order_display=None)


async def _proceed_to_photos(message: Message, state: FSMContext, lang: str, order_display: str | None) -> None:
    await state.set_state(SubmitStates.waiting_for_photos)

    if order_display:
        await message.answer(
            t("submit.order_saved", lang, order=order_display),
            parse_mode="HTML",
        )

    # Smart Review Tip
    tip_key = random.choice(TIP_KEYS)
    await message.answer(t(tip_key, lang))
    await message.answer(
        t("submit.ask_screenshots", lang),
        reply_markup=done_cancel_keyboard(lang),
        parse_mode="HTML",
    )


# ── Step: Photos ──────────────────────────────────────────────────────────────

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


# ── Step: Done — show confirmation card ──────────────────────────────────────

@router.message(
    SubmitStates.waiting_for_photos,
    F.text.in_({"✅ Tayyor", "✅ Готово", "✅ Done"}),
)
async def process_done(message: Message, state: FSMContext, lang: str):
    data = await state.get_data()
    photos: list[dict] = data.get("photos", [])

    if not photos:
        await message.answer(t("submit.no_photos", lang))
        return

    # Advance to confirm state
    await state.set_state(SubmitStates.waiting_for_confirm)

    product_name = data.get("product_name", "?")
    order = data.get("order_number") or "—"

    await message.answer(
        t("submit.confirm_header", lang,
          product=product_name,
          order=order,
          count=len(photos)),
        reply_markup=_confirm_keyboard(lang),
        parse_mode="HTML",
    )


# ── Confirmation: Edit (go back to photos) ────────────────────────────────────

@router.callback_query(F.data == "confirm:edit", SubmitStates.waiting_for_confirm)
async def confirm_edit(callback: CallbackQuery, state: FSMContext, lang: str):
    await state.set_state(SubmitStates.waiting_for_photos)
    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    data = await state.get_data()
    # Reset photo list so user re-uploads
    await state.update_data(photos=[])
    await callback.message.answer(
        t("submit.ask_screenshots", lang),
        reply_markup=done_cancel_keyboard(lang),
        parse_mode="HTML",
    )


# ── Confirmation: Confirm → upload ────────────────────────────────────────────

@router.callback_query(F.data == "confirm:yes", SubmitStates.waiting_for_confirm)
async def confirm_yes(callback: CallbackQuery, state: FSMContext, lang: str, bot: Bot):
    data = await state.get_data()
    photos: list[dict] = data.get("photos", [])
    product_id: str | None = data.get("product_id")
    order_number: str | None = data.get("order_number")

    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(t("submit.sending", lang))

    tg_user = callback.from_user
    token = await get_auth_token(tg_user, lang)
    if not token:
        log.error("Auth failed for user %s", tg_user.id)
        await state.clear()
        await callback.message.answer(t("submit.error", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
        return

    # Download photos
    photo_bytes_list = []
    try:
        for i, p in enumerate(photos):
            file = await bot.get_file(p["file_id"])
            buf = io.BytesIO()
            await bot.download_file(file.file_path, buf)
            photo_bytes_list.append((buf.getvalue(), f"photo_{i+1}.jpg"))
    except Exception as download_err:
        log.error("Photo download failed for user %s: %s", tg_user.id, download_err)
        await state.clear()
        await callback.message.answer(t("submit.error_download_failed", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
        return

    try:
        files = [
            ("images", (fname, data_bytes, "image/jpeg"))
            for data_bytes, fname in photo_bytes_list
        ]
        form_data: dict[str, Any] = {}
        if product_id:
            form_data["product_id"] = product_id
        if order_number:
            form_data["order_number"] = order_number

        resp = await _request("POST", "/api/v1/submissions", token=token, data=form_data, files=files)
        submission_id = resp.get("id", "?")
        await state.clear()
        await callback.message.answer(
            t("submit.success", lang, submission_id=submission_id),
            reply_markup=main_menu(lang, settings.WEBAPP_URL),
            parse_mode="HTML",
        )
    except APIError as e:
        log.error("Submit failed for user %s: status=%s detail=%s", tg_user.id, e.status_code, e.detail)
        await state.clear()
        if e.status_code == 429:
            await callback.message.answer(t("submit.daily_limit", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
        elif e.status_code == 409:
            await callback.message.answer(t("submit.duplicate", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
        elif e.status_code == 404:
            await callback.message.answer(t("submit.error_product_not_found", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
        elif e.status_code == 400:
            # Show specific backend validation message if available
            detail = e.detail if e.detail else None
            if detail and "image" in detail.lower():
                await callback.message.answer(t("submit.error_image_invalid", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
            else:
                msg = t("submit.error_validation", lang, detail=detail or "")
                await callback.message.answer(msg, reply_markup=main_menu(lang, settings.WEBAPP_URL))
        else:
            await callback.message.answer(t("submit.error_server", lang), reply_markup=main_menu(lang, settings.WEBAPP_URL))
