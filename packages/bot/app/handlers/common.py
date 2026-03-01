"""
/start and /help handlers.
"""
from aiogram import Router, F, Bot
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

from app.config import get_settings
from app.i18n import t
from app.keyboards import main_menu, language_keyboard, open_webapp_keyboard
from app.services.api import bot_register_user, get_user_info, APIError

router = Router(name="common")
settings = get_settings()


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
async def cmd_start(message: Message, lang: str, bot: Bot):
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
        key = "start.welcome"
        text = t(key, lang, name=name)
    else:
        key = "start.returning"
        text = t(key, lang, name=name, spin_count=spin_count, approved=approved)

    await message.answer(
        text,
        reply_markup=main_menu(lang, settings.WEBAPP_URL),
        parse_mode="HTML",
    )

    # ── Features for RETURNING users only ────────────────────────────────
    if not is_new:
        # Feature 3: Referral Milestone Messages
        MILESTONES = {50: "milestone_50", 25: "milestone_25", 10: "milestone_10", 5: "milestone_5", 1: "milestone_1"}
        for threshold, key in MILESTONES.items():
            if referred_count >= threshold:
                await message.answer(t(key, lang))
                break

        # Feature 4: Engagement Nudges (prioritised — only show one)
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
