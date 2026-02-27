"""
/start and /help handlers.
"""
from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

from app.config import get_settings
from app.i18n import t
from app.keyboards import main_menu, language_keyboard
from app.services.api import bot_register_user, APIError

router = Router(name="common")
settings = get_settings()


@router.message(CommandStart())
async def cmd_start(message: Message, lang: str):
    tg_user = message.from_user
    name = tg_user.first_name or "Do'stim"

    # Register or look up user in the backend
    is_new = True
    try:
        result = await bot_register_user(
            telegram_id=tg_user.id,
            first_name=tg_user.first_name or "",
            last_name=tg_user.last_name,
            username=tg_user.username,
            language_code=tg_user.language_code or "uz",
            secret=settings.BOT_WEBHOOK_SECRET,
        )
        is_new = result.get("is_new", True)
    except APIError:
        pass  # Fall back to "new user" greeting on error

    key = "start.welcome" if is_new else "start.returning"
    await message.answer(
        t(key, lang, name=name),
        reply_markup=main_menu(lang, settings.WEBAPP_URL),
        parse_mode="HTML",
    )


@router.message(Command("help"))
@router.message(F.text.in_({"❓ Yordam", "❓ Помощь", "❓ Help"}))
async def cmd_help(message: Message, lang: str):
    await message.answer(t("help.text", lang), parse_mode="HTML")


@router.message(Command("language"))
async def cmd_language(message: Message, lang: str):
    await message.answer(
        t("lang.choose", lang),
        reply_markup=language_keyboard(),
        parse_mode="HTML",
    )
