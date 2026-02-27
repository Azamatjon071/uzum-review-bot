"""
/status handler — shows the user's recent submissions.
"""
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message

from app.config import get_settings
from app.i18n import t
from app.keyboards import main_menu
from app.services.api import get_my_submissions, auth_telegram, APIError
import hashlib, hmac, json, time, urllib.parse

router = Router(name="status")
settings = get_settings()

STATUS_EMOJI = {
    "pending": "⏳",
    "approved": "✅",
    "rejected": "❌",
    "duplicate": "♻️",
}


async def _get_token(tg_user, lang: str) -> str | None:
    user_json = json.dumps({
        "id": tg_user.id,
        "first_name": tg_user.first_name or "",
        "username": tg_user.username or "",
        "language_code": lang,
    }, separators=(",", ":"))
    auth_date = str(int(time.time()))
    data_check_string = f"auth_date={auth_date}\nuser={user_json}"
    secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    hash_val = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    init_data = urllib.parse.urlencode({"auth_date": auth_date, "user": user_json, "hash": hash_val})
    try:
        resp = await auth_telegram(init_data)
        return resp["access_token"]
    except APIError:
        return None


@router.message(Command("status"))
async def cmd_status(message: Message, lang: str):
    token = await _get_token(message.from_user, lang)
    if not token:
        await message.answer(t("submit.error", lang))
        return

    try:
        resp = await get_my_submissions(token)
        submissions = resp.get("submissions", [])
    except APIError:
        await message.answer(t("submit.error", lang))
        return

    if not submissions:
        await message.answer(t("status.empty", lang))
        return

    lines = [t("status.header", lang)]
    for s in submissions[:10]:
        emoji = STATUS_EMOJI.get(s.get("status", "pending"), "❓")
        created = s.get("created_at", "")[:10]
        lines.append(
            t("status.item", lang,
              id=s["id"],
              status_emoji=emoji,
              status=s.get("status", ""),
              created=created)
        )
    await message.answer("\n".join(lines), parse_mode="HTML")


@router.message(Command("wallet"))
@router.message(F.text.in_({"💼 Mukofotlarim", "💼 Мои награды", "💼 My rewards"}))
async def cmd_wallet(message: Message, lang: str):
    from app.keyboards import open_webapp_keyboard
    await message.answer(
        t("wallet.open_app", lang),
        reply_markup=open_webapp_keyboard(lang, settings.WEBAPP_URL),
    )


@router.message(Command("charity"))
@router.message(F.text.in_({"🕌 Xayriya", "🕌 Благотворительность", "🕌 Charity"}))
async def cmd_charity(message: Message, lang: str):
    from app.services.api import get_charity_campaigns
    try:
        resp = await get_charity_campaigns()
        campaigns = resp.get("campaigns", [])
    except APIError:
        await message.answer(t("submit.error", lang))
        return

    if not campaigns:
        await message.answer(t("charity.empty", lang))
        return

    lines = [t("charity.header", lang), ""]
    for c in campaigns[:5]:
        lang_key = f"name_{lang}" if f"name_{lang}" in c else "name_uz"
        lines.append(t("charity.campaign_item", lang,
                       name=c.get(lang_key, c.get("name_uz", "")),
                       raised=f"{int(c.get('raised_amount', 0)):,}",
                       goal=f"{int(c.get('goal_amount', 1)):,}",
                       pct=c.get("progress_pct", 0)))
    await message.answer("\n".join(lines), parse_mode="HTML")
