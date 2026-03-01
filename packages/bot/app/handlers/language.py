"""
Language selection callback handler.
"""
from aiogram import Router
from aiogram.types import CallbackQuery

from app.i18n import t
from app.keyboards import main_menu
from app.middlewares import UserMiddleware
from app.config import get_settings
from app.services.api import update_user_language

router = Router(name="language")
settings = get_settings()

SUPPORTED_LANGS = ("uz", "ru", "en")


@router.callback_query(lambda c: c.data and c.data.startswith("lang:"))
async def set_language(callback: CallbackQuery, lang: str):
    chosen = callback.data.split(":")[1]
    if chosen not in SUPPORTED_LANGS:
        return await callback.answer("Unknown language")

    # Update in-memory cache
    UserMiddleware.set_lang(callback.from_user.id, chosen)

    # Persist language to backend
    await update_user_language(
        callback.from_user.id,
        callback.from_user.first_name or "",
        callback.from_user.username,
        chosen,
    )

    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(
        t("lang.changed", chosen),
        reply_markup=main_menu(chosen, settings.WEBAPP_URL),
    )
    await callback.answer()
