"""
HTTP client for communicating with the backend API.
All calls use JWT tokens obtained via Telegram initData auth.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
import urllib.parse
from typing import Any, Optional

import httpx

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

BASE = settings.API_BASE_URL.rstrip("/")
TIMEOUT = httpx.Timeout(15.0)


class APIError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"API {status_code}: {detail}")


async def _request(
    method: str,
    path: str,
    token: Optional[str] = None,
    **kwargs: Any,
) -> Any:
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.request(method, f"{BASE}{path}", headers=headers, **kwargs)

    if resp.status_code >= 400:
        try:
            detail = resp.json().get("detail", resp.text)
        except Exception:
            detail = resp.text
        raise APIError(resp.status_code, detail)

    if resp.status_code == 204:
        return None
    return resp.json()


# ---------------------------------------------------------------------------
# Shared auth helper — generates Telegram initData HMAC and exchanges for JWT
# ---------------------------------------------------------------------------

async def get_auth_token(tg_user: Any, lang: str, bot_token: str | None = None) -> str | None:
    """
    Generate a valid Telegram initData HMAC and exchange it for a JWT.
    Used by both submit.py and status.py to avoid duplicated HMAC code.
    """
    _bot_token = bot_token or settings.BOT_TOKEN
    user_json = json.dumps({
        "id": tg_user.id,
        "first_name": tg_user.first_name or "",
        "last_name": getattr(tg_user, "last_name", "") or "",
        "username": tg_user.username or "",
        "language_code": getattr(tg_user, "language_code", lang) or lang,
    }, separators=(",", ":"))

    auth_date = str(int(time.time()))
    data_check_string = f"auth_date={auth_date}\nuser={user_json}"
    secret_key = hmac.new(b"WebAppData", _bot_token.encode(), hashlib.sha256).digest()
    hash_val = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    init_data = urllib.parse.urlencode({
        "auth_date": auth_date,
        "user": user_json,
        "hash": hash_val,
    })

    try:
        resp = await auth_telegram(init_data)
        return resp["access_token"]
    except APIError:
        return None


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

async def auth_telegram(init_data: str) -> dict:
    """Exchange Telegram WebApp initData for a JWT."""
    return await _request("POST", "/api/v1/auth/telegram", json={"init_data": init_data})


# ---------------------------------------------------------------------------
# Submissions
# ---------------------------------------------------------------------------

async def get_my_submissions(token: str) -> dict:
    return await _request("GET", "/api/v1/submissions", token=token)


# ---------------------------------------------------------------------------
# Rewards
# ---------------------------------------------------------------------------

async def get_my_rewards(token: str) -> dict:
    return await _request("GET", "/api/v1/rewards", token=token)


# ---------------------------------------------------------------------------
# Charity
# ---------------------------------------------------------------------------

async def get_charity_campaigns() -> dict:
    return await _request("GET", "/api/v1/charity/campaigns")


# ---------------------------------------------------------------------------
# Bot-internal registration
# ---------------------------------------------------------------------------

async def bot_register_user(
    telegram_id: int,
    first_name: str,
    last_name: str | None,
    username: str | None,
    language_code: str,
    secret: str,
    bio: str | None = None,
    profile_photo_file_id: str | None = None,
    referred_by_code: str | None = None,
) -> dict:
    """Register or look up a user. Returns {'is_new': bool, 'user_id': str, 'spin_count': int, ...}."""
    return await _request(
        "POST",
        "/api/v1/bot/register",
        json={
            "telegram_id": telegram_id,
            "first_name": first_name or "",
            "last_name": last_name,
            "username": username,
            "language_code": language_code,
            "secret": secret,
            "bio": bio,
            "profile_photo_file_id": profile_photo_file_id,
            "referred_by_code": referred_by_code,
        },
    )


async def get_user_info(telegram_id: int, secret: str) -> dict:
    """Fetch full user info including spin_count, referral stats, etc."""
    return await _request(
        "GET",
        f"/api/v1/bot/user/{telegram_id}",
        params={"secret": secret},
    )


# ---------------------------------------------------------------------------
# Language persistence — update language via bot/register endpoint
# ---------------------------------------------------------------------------

async def update_user_language(telegram_id: int, first_name: str, username: str | None, language_code: str) -> None:
    """Re-register user with updated language_code so the backend persists it."""
    try:
        await bot_register_user(
            telegram_id=telegram_id,
            first_name=first_name,
            last_name=None,
            username=username,
            language_code=language_code,
            secret=settings.BOT_WEBHOOK_SECRET,
        )
    except APIError as e:
        logger.warning("Failed to persist language for user %s: %s", telegram_id, e)


# ---------------------------------------------------------------------------
# Products (public — no auth required)
# ---------------------------------------------------------------------------

async def get_products(search: Optional[str] = None, page: int = 1, page_size: int = 50) -> dict:
    """Fetch active products from the public endpoint. Used for bot submission flow."""
    params: dict = {"page": page, "page_size": page_size}
    if search:
        params["search"] = search
    return await _request("GET", "/api/v1/products", params=params)
