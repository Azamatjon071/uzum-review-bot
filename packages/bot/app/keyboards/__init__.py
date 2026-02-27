"""
ReplyKeyboard and InlineKeyboard builders.
"""
from aiogram.types import (
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder

from app.i18n import t


def main_menu(lang: str, webapp_url: str) -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.row(
        KeyboardButton(text=t("btn.submit_review", lang)),
        KeyboardButton(
            text=t("btn.open_webapp", lang),
            web_app=WebAppInfo(url=webapp_url),
        ),
    )
    builder.row(
        KeyboardButton(text=t("btn.my_rewards", lang)),
        KeyboardButton(text=t("btn.charity", lang)),
    )
    builder.row(KeyboardButton(text=t("btn.help", lang)))
    return builder.as_markup(resize_keyboard=True)


def cancel_keyboard(lang: str) -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.add(KeyboardButton(text=t("btn.cancel", lang)))
    return builder.as_markup(resize_keyboard=True, one_time_keyboard=True)


def done_cancel_keyboard(lang: str) -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.row(
        KeyboardButton(text=t("btn.done", lang)),
        KeyboardButton(text=t("btn.cancel", lang)),
    )
    return builder.as_markup(resize_keyboard=True, one_time_keyboard=True)


def language_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🇺🇿 O'zbek", callback_data="lang:uz"),
        InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang:ru"),
        InlineKeyboardButton(text="🇬🇧 English", callback_data="lang:en"),
    )
    return builder.as_markup()


def open_webapp_keyboard(lang: str, webapp_url: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.add(
        InlineKeyboardButton(
            text=t("btn.open_webapp", lang),
            web_app=WebAppInfo(url=webapp_url),
        )
    )
    return builder.as_markup()


def referral_keyboard(
    lang: str,
    webapp_url: str,
    referral_code: str = "",
    bot_username: str = "",
) -> InlineKeyboardMarkup:
    """Inline keyboard for referral command — share link + open Mini App."""
    builder = InlineKeyboardBuilder()
    if referral_code and bot_username:
        share_url = f"https://t.me/{bot_username}?start={referral_code}"
        builder.row(
            InlineKeyboardButton(
                text=t("btn.share_referral", lang),
                url=share_url,
            )
        )
    builder.row(
        InlineKeyboardButton(
            text=t("btn.open_webapp", lang),
            web_app=WebAppInfo(url=webapp_url),
        )
    )
    return builder.as_markup()
