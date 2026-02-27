"""
/status, /myspins, /referral, /wallet, /charity handlers.
"""
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message

from app.config import get_settings
from app.i18n import t, status_label, status_emoji
from app.keyboards import main_menu, open_webapp_keyboard, referral_keyboard
from app.services.api import get_my_submissions, get_user_info, get_my_rewards, auth_telegram, APIError
import hashlib, hmac, json, time, urllib.parse

router = Router(name="status")
settings = get_settings()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _get_token(tg_user, lang: str) -> str | None:
    """Generate a valid Telegram initData HMAC and exchange it for a JWT."""
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


# ---------------------------------------------------------------------------
# /status
# ---------------------------------------------------------------------------

@router.message(Command("status"))
async def cmd_status(message: Message, lang: str):
    token = await _get_token(message.from_user, lang)
    if not token:
        await message.answer(t("submit.error", lang))
        return

    try:
        resp = await get_my_submissions(token)
        # Bug fix: key is "items", not "submissions"
        submissions = resp.get("items", resp.get("submissions", []))
    except APIError:
        await message.answer(t("submit.error", lang))
        return

    if not submissions:
        await message.answer(t("status.empty", lang))
        return

    # Compute summary counts
    total = len(submissions)
    approved_count = sum(1 for s in submissions if s.get("status") == "approved")
    pending_count = sum(1 for s in submissions if s.get("status") == "pending")
    rejected_count = sum(1 for s in submissions if s.get("status") in ("rejected", "duplicate"))

    lines: list[str] = [
        t("status.header", lang),
        "",
        t("status.summary", lang,
          total=total,
          approved=approved_count,
          pending=pending_count,
          rejected=rejected_count),
    ]

    for s in submissions[:10]:
        st = s.get("status", "pending")
        emoji = status_emoji(st)
        label = status_label(st, lang)
        created = (s.get("created_at") or "")[:10]
        short_id = str(s.get("id", ""))[:8].upper()

        lines.append(t("status.item", lang,
                       status_emoji=emoji,
                       status_label=label,
                       created=created,
                       short_id=short_id))

        # Rejection reason
        if st in ("rejected", "duplicate") and s.get("rejection_reason"):
            lines.append(t("status.item_rejected", lang, reason=s["rejection_reason"]))

        # Spin granted indicator
        if s.get("spin_granted"):
            lines.append(t("status.item_spin", lang))

    await message.answer("\n".join(lines), parse_mode="HTML")


# ---------------------------------------------------------------------------
# /myspins
# ---------------------------------------------------------------------------

@router.message(Command("myspins"))
async def cmd_myspins(message: Message, lang: str):
    try:
        info = await get_user_info(message.from_user.id, settings.BOT_WEBHOOK_SECRET)
    except APIError:
        await message.answer(t("submit.error", lang))
        return

    spin_count = info.get("spin_count", 0)
    total_spins = info.get("total_spins", 0)
    approved = info.get("approved_submissions", 0)

    spin_note = t("myspins.has_spins", lang) if spin_count > 0 else t("myspins.no_spins", lang)

    text = t("myspins.text", lang,
             spin_count=spin_count,
             total_spins=total_spins,
             approved=approved,
             spin_note=spin_note)

    if spin_count > 0:
        await message.answer(
            text,
            reply_markup=open_webapp_keyboard(lang, settings.WEBAPP_URL),
            parse_mode="HTML",
        )
    else:
        await message.answer(text, parse_mode="HTML")


# ---------------------------------------------------------------------------
# /referral
# ---------------------------------------------------------------------------

@router.message(Command("referral"))
async def cmd_referral(message: Message, lang: str):
    try:
        info = await get_user_info(message.from_user.id, settings.BOT_WEBHOOK_SECRET)
    except APIError:
        await message.answer(t("submit.error", lang))
        return

    code = info.get("referral_code", "—")
    referred_count = info.get("referred_count", 0)
    bonus_spins = info.get("referral_bonus_spins", 0)
    bot_username = settings.BOT_USERNAME if hasattr(settings, "BOT_USERNAME") else "pprosta_bot"

    text = t("referral.text", lang,
             code=code,
             bot_username=bot_username,
             count=referred_count,
             bonus=bonus_spins)

    await message.answer(
        text,
        reply_markup=referral_keyboard(
            lang,
            settings.WEBAPP_URL,
            referral_code=code,
            bot_username=bot_username,
        ),
        parse_mode="HTML",
    )


# ---------------------------------------------------------------------------
# /wallet
# ---------------------------------------------------------------------------

@router.message(Command("wallet"))
@router.message(F.text.in_({"💼 Mukofotlarim", "💼 Мои награды", "💼 My rewards"}))
async def cmd_wallet(message: Message, lang: str):
    token = await _get_token(message.from_user, lang)
    if not token:
        await message.answer(t("submit.error", lang))
        return

    try:
        resp = await get_my_rewards(token)
        rewards = resp.get("rewards", resp.get("items", []))
    except APIError:
        # Fallback: just open the mini app if API fails
        await message.answer(
            t("wallet.open_app", lang),
            reply_markup=open_webapp_keyboard(lang, settings.WEBAPP_URL),
        )
        return

    if not rewards:
        await message.answer(
            t("wallet.empty", lang),
            reply_markup=open_webapp_keyboard(lang, settings.WEBAPP_URL),
        )
        return

    STATUS_ICONS = {"pending": "🎁", "claimed": "✅", "expired": "⏰", "donated": "🕌"}
    lines = [t("wallet.header", lang), ""]
    for r in rewards[:8]:
        st = r.get("status", "pending")
        icon = STATUS_ICONS.get(st, "🎁")
        prize = r.get("prize", {})
        name_key = f"name_{lang}" if f"name_{lang}" in prize else "name_uz"
        prize_name = prize.get(name_key, prize.get("name_uz", "—"))
        claim_code = r.get("claim_code", "")
        expires = (r.get("expires_at") or "")[:10]
        lines.append(f"{icon} <b>{prize_name}</b>")
        if st == "pending" and claim_code:
            lines.append(f"   <code>{claim_code}</code>  📅 {expires}")
        elif st == "claimed":
            lines.append(f"   {t('wallet.claimed', lang)}")
        elif st == "expired":
            lines.append(f"   {t('wallet.expired', lang)}")

    await message.answer(
        "\n".join(lines),
        reply_markup=open_webapp_keyboard(lang, settings.WEBAPP_URL),
        parse_mode="HTML",
    )


# ---------------------------------------------------------------------------
# /charity
# ---------------------------------------------------------------------------

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
