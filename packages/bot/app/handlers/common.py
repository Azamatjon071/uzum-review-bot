"""
/start and /help handlers, plus the 5-step onboarding wizard for new users.
"""
from aiogram import Router, F, Bot
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    Message,
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.config import get_settings
from app.i18n import t
from app.keyboards import main_menu, language_keyboard, open_webapp_keyboard, start_inline_keyboard
from app.services.api import bot_register_user, get_user_info, get_products, update_user_language, APIError
from app.states import OnboardingStates

router = Router(name="common")
settings = get_settings()


# ── Onboarding helpers ────────────────────────────────────────────────────────

def _onboarding_step2_keyboard(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("onboarding.step2_btn", lang), callback_data="onboard:next2")
    return builder.as_markup()


def _onboarding_product_keyboard(products: list[dict], lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for p in products:
        name = (
            (lang == "ru" and p.get("name_ru")) and p["name_ru"]
            or (lang == "en" and p.get("name_en")) and p["name_en"]
            or p.get("name_uz") or p.get("name_ru") or p.get("name_en") or "?"
        )
        label = name[:48] + "…" if len(name) > 48 else name
        # Truncate name in callback_data to avoid BUTTON_DATA_INVALID (max 64 bytes)
        # uuid is 36 chars, "onboard:prod:" is 13. leaves ~15 bytes.
        safe_name = name[:5] 
        builder.button(text=label, callback_data=f"onboard:prod:{p['id']}:{safe_name}")
    builder.adjust(1)
    return builder.as_markup()


def _onboarding_order_keyboard(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("submit.btn_skip", lang), callback_data="onboard:skip_order")
    return builder.as_markup()


async def _get_profile_photo_file_id(bot: Bot, user_id: int) -> str | None:
    """Fetch the most recent profile photo file_id for a Telegram user."""
    try:
        photos = await bot.get_user_profile_photos(user_id, limit=1)
        if photos.total_count > 0 and photos.photos:
            return photos.photos[0][-1].file_id  # highest-res version
    except Exception:
        pass
    return None


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext, lang: str, bot: Bot):
    tg_user = message.from_user
    name = tg_user.first_name or "Do'stim"

    # Parse deep-link referral code: /start REFCODE
    referred_by_code: str | None = None
    if message.text:
        parts = message.text.strip().split(maxsplit=1)
        if len(parts) == 2 and parts[1]:
            referred_by_code = parts[1]

    # Fetch profile photo lazily
    profile_photo_file_id = await _get_profile_photo_file_id(bot, tg_user.id)

    # Register or look up user in the backend
    is_new = True
    spin_count = 0
    approved = 0
    referred_count = 0
    total_submissions = 0
    try:
        result = await bot_register_user(
            telegram_id=tg_user.id,
            first_name=tg_user.first_name or "",
            last_name=tg_user.last_name,
            username=tg_user.username,
            language_code=tg_user.language_code or "uz",
            secret=settings.BOT_WEBHOOK_SECRET,
            profile_photo_file_id=profile_photo_file_id,
            referred_by_code=referred_by_code,
        )
        is_new = result.get("is_new", True)
        spin_count = result.get("spin_count", 0)
        if not is_new:
            # Fetch full user stats for the returning greeting
            try:
                info = await get_user_info(tg_user.id, settings.BOT_WEBHOOK_SECRET)
                approved = info.get("approved_submissions", 0)
                spin_count = info.get("spin_count", spin_count)
                referred_count = info.get("referred_count", 0)
                total_submissions = info.get("total_submissions", 0)
            except APIError:
                pass  # non-critical; spin_count from register is still shown
    except APIError:
        pass  # Fall back to "new user" greeting on error

    if is_new:
        # ── NEW USER: trigger 5-step onboarding wizard ────────────────────
        await state.set_state(OnboardingStates.step_language)
        await state.update_data(onboard_name=name)
        await message.answer(
            t("onboarding.step1", lang),
            reply_markup=language_keyboard(),
            parse_mode="HTML",
        )
        return

    # ── RETURNING USER ────────────────────────────────────────────────────
    if spin_count > 0:
        spin_cta = t("start.returning_spin_cta", lang, spin_count=spin_count)
    else:
        spin_cta = t("start.returning_no_spin_cta", lang)
    text = t("start.returning", lang, name=name, spin_count=spin_count, approved=approved, spin_cta=spin_cta)

    await message.answer(
        text,
        reply_markup=main_menu(lang, settings.WEBAPP_URL),
        parse_mode="HTML",
    )
    
    # Inline quick actions
    await message.answer(
        t("start.quick_actions", lang),
        reply_markup=start_inline_keyboard(lang, settings.WEBAPP_URL),
        parse_mode="HTML",
    )

    # ── Features for RETURNING users only ────────────────────────────────
    MILESTONES = {50: "milestone_50", 25: "milestone_25", 10: "milestone_10", 5: "milestone_5", 1: "milestone_1"}
    for threshold, key in MILESTONES.items():
        if referred_count >= threshold:
            await message.answer(t(key, lang))
            break

    if spin_count > 0:
        await message.answer(
            t("nudge_has_spins", lang, n=spin_count),
            reply_markup=open_webapp_keyboard(lang, settings.WEBAPP_URL),
        )
    elif approved > 0:
        await message.answer(
            t("nudge_check_spins", lang),
            reply_markup=open_webapp_keyboard(lang, settings.WEBAPP_URL),
        )
    elif total_submissions == 0:
        await message.answer(
            t("nudge_first_review", lang),
            reply_markup=main_menu(lang, settings.WEBAPP_URL),
        )


# ── Onboarding: Step 1 → language selected (callback from language_keyboard) ─

@router.callback_query(F.data.startswith("lang:"), OnboardingStates.step_language)
async def onboard_lang_selected(callback: CallbackQuery, state: FSMContext):
    chosen_lang = callback.data.split("lang:", 1)[1]  # "uz", "ru", or "en"
    await callback.answer(t("lang.changed", chosen_lang))

    tg_user = callback.from_user
    # Persist language choice to backend
    await update_user_language(
        telegram_id=tg_user.id,
        first_name=tg_user.first_name or "",
        username=tg_user.username,
        language_code=chosen_lang,
    )

    # Advance to step 2
    await state.update_data(onboard_lang=chosen_lang)
    await state.set_state(OnboardingStates.step_explain)

    await callback.message.edit_text(
        t("onboarding.step2", chosen_lang),
        reply_markup=_onboarding_step2_keyboard(chosen_lang),
        parse_mode="HTML",
    )


# ── Onboarding: Step 2 → user taps Continue ──────────────────────────────────

@router.callback_query(F.data == "onboard:next2", OnboardingStates.step_explain)
async def onboard_step2_continue(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    lang = data.get("onboard_lang", "uz")

    await state.set_state(OnboardingStates.step_product)
    await callback.answer()

    # Fetch product list for step 3
    try:
        resp = await get_products(page_size=8)
        products: list[dict] = resp.get("products", [])
    except APIError:
        products = []

    if not products:
        # Skip product step — jump straight to completion
        await state.set_state(OnboardingStates.step_done)
        await callback.message.edit_text(
            t("onboarding.step5", lang),
            parse_mode="HTML",
        )
        await callback.message.answer(
            t("start.welcome", lang, name=data.get("onboard_name", "")),
            reply_markup=main_menu(lang, settings.WEBAPP_URL),
            parse_mode="HTML",
        )
        await state.clear()
        return

    await callback.message.edit_text(
        t("onboarding.step3", lang),
        reply_markup=_onboarding_product_keyboard(products, lang),
        parse_mode="HTML",
    )


# ── Onboarding: Step 3 → product picked ──────────────────────────────────────

@router.callback_query(F.data.startswith("onboard:prod:"), OnboardingStates.step_product)
async def onboard_product_selected(callback: CallbackQuery, state: FSMContext):
    # callback_data format: "onboard:prod:<uuid>:<name>"
    parts = callback.data.split(":", 3)
    product_id = parts[2] if len(parts) > 2 else None
    product_name = parts[3] if len(parts) > 3 else product_id

    data = await state.get_data()
    lang = data.get("onboard_lang", "uz")

    await state.update_data(onboard_product_id=product_id, onboard_product_name=product_name)
    await state.set_state(OnboardingStates.step_order)
    await callback.answer(f"✅ {product_name}")

    await callback.message.edit_text(
        t("onboarding.step4", lang),
        reply_markup=_onboarding_order_keyboard(lang),
        parse_mode="HTML",
    )


# ── Onboarding: Step 4a → user types an order number ─────────────────────────

@router.message(OnboardingStates.step_order, F.text)
async def onboard_order_entered(message: Message, state: FSMContext):
    data = await state.get_data()
    lang = data.get("onboard_lang", "uz")
    order = (message.text or "").strip()

    await state.update_data(onboard_order=order)
    await _finish_onboarding(message, state, lang, data.get("onboard_name", ""))


# ── Onboarding: Step 4b → user taps Skip ─────────────────────────────────────

@router.callback_query(F.data == "onboard:skip_order", OnboardingStates.step_order)
async def onboard_order_skipped(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    lang = data.get("onboard_lang", "uz")

    await state.update_data(onboard_order=None)
    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await _finish_onboarding(callback.message, state, lang, data.get("onboard_name", ""))


# ── Onboarding: Step 5 — completion ──────────────────────────────────────────

async def _finish_onboarding(message: Message, state: FSMContext, lang: str, name: str) -> None:
    """Send the completion message and show the main menu. Persist onboarding_completed=True."""
    await state.set_state(OnboardingStates.step_done)

    await message.answer(
        t("onboarding.step5", lang),
        parse_mode="HTML",
    )
    await message.answer(
        t("start.welcome", lang, name=name),
        reply_markup=main_menu(lang, settings.WEBAPP_URL),
        parse_mode="HTML",
    )
    await state.clear()


@router.message(Command("help"))
@router.message(F.text.in_({"❓ Yordam", "❓ Помощь", "❓ Help"}))
async def cmd_help(message: Message, lang: str):
    await message.answer(
        t("help.text", lang, support=settings.SUPPORT_USERNAME),
        parse_mode="HTML",
    )


@router.message(Command("language"))
async def cmd_language(message: Message, lang: str):
    await message.answer(
        t("lang.choose", lang),
        reply_markup=language_keyboard(),
        parse_mode="HTML",
    )


# ── New menu button shortcuts ────────────────────────────────────────────────
# These simply delegate to the existing /status, /myspins and /referral handlers
# by re-using the same filter text values that the buttons emit.

@router.message(F.text.in_({"📋 Sharhlarim", "📋 Мои отзывы", "📋 My Reviews"}))
async def btn_my_status(message: Message, lang: str):
    """Redirect 'My Reviews' keyboard button → /status logic."""
    # Import here to avoid circular imports
    from app.handlers.status import cmd_status
    await cmd_status(message, lang)


@router.message(F.text.in_({"🎡 Aylanishlarim", "🎡 Мои вращения", "🎡 My Spins"}))
async def btn_my_spins(message: Message, lang: str):
    """Redirect 'My Spins' keyboard button → /myspins logic."""
    from app.handlers.status import cmd_myspins
    await cmd_myspins(message, lang)


@router.message(F.text.in_({"🔗 Taklif", "🔗 Реферал", "🔗 Referral"}))
async def btn_referral(message: Message, lang: str):
    """Redirect 'Referral' keyboard button → /referral logic."""
    from app.handlers.status import cmd_referral
    await cmd_referral(message, lang)
