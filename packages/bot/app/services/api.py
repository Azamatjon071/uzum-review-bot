"""
HTTP client for communicating with the backend API.
All calls use JWT tokens obtained via Telegram initData auth.
"""
from __future__ import annotations

import logging
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
# Auth
# ---------------------------------------------------------------------------

async def auth_telegram(init_data: str) -> dict:
    """Exchange Telegram WebApp initData for a JWT."""
    return await _request("POST", "/api/v1/auth/telegram", json={"init_data": init_data})


# ---------------------------------------------------------------------------
# Submissions
# ---------------------------------------------------------------------------

async def create_submission(
    token: str,
    product_url: str,
    photo_bytes_list: list[tuple[bytes, str]],  # [(bytes, filename), ...]
) -> dict:
    """Upload a submission with multipart images."""
    files = [
        ("images", (fname, data, "image/jpeg"))
        for data, fname in photo_bytes_list
    ]
    data = {"product_url": product_url}
    return await _request("POST", "/api/v1/submissions", token=token, data=data, files=files)


async def get_my_submissions(token: str) -> dict:
    return await _request("GET", "/api/v1/submissions", token=token)


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

async def get_me(token: str) -> dict:
    return await _request("GET", "/api/v1/me", token=token)


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
# Products (public — no auth required)
# ---------------------------------------------------------------------------

async def get_products(search: Optional[str] = None, page: int = 1, page_size: int = 50) -> dict:
    """Fetch active products from the public endpoint. Used for bot submission flow."""
    params: dict = {"page": page, "page_size": page_size}
    if search:
        params["search"] = search
    return await _request("GET", "/api/v1/products", params=params)
