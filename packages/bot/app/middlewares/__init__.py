"""
Middleware: auto-register user on first contact and inject user lang into every update.
"""
from __future__ import annotations

from typing import Any, Awaitable, Callable

import httpx
import structlog
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update, User as TgUser

from app.config import get_settings
from app.services.api import get_me, APIError

log = structlog.get_logger()
settings = get_settings()


class UserMiddleware(BaseMiddleware):
    """
    Attaches user language to handler data.
    The bot does NOT maintain its own DB — it queries the backend API.
    On first interaction we let the backend create the user via auth/telegram.
    Here we just resolve language from an in-memory minimal cache.
    """

    # Very simple in-process cache {telegram_id: lang}
    _lang_cache: dict[int, str] = {}

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        tg_user: TgUser | None = data.get("event_from_user")
        if tg_user:
            lang = self._lang_cache.get(tg_user.id)
            if not lang:
                # Fall back to Telegram language_code
                lc = (tg_user.language_code or "uz").lower()
                lang = lc if lc in ("uz", "ru", "en") else "uz"
                self._lang_cache[tg_user.id] = lang
            data["lang"] = lang
        else:
            data["lang"] = "uz"

        return await handler(event, data)

    @classmethod
    def set_lang(cls, telegram_id: int, lang: str) -> None:
        cls._lang_cache[telegram_id] = lang
