import uuid
import secrets
import hashlib
import hmac as _hmac
import time
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
import redis.asyncio as aioredis

from app.database import get_db
from app.deps import get_current_admin
from app.models import User, AdminUser, AdminRole
from app.services.auth import (
    validate_telegram_init_data,
    hash_password, verify_password,
    create_user_access_token, create_user_refresh_token,
    create_admin_token, decode_refresh_token,
    generate_totp_secret, verify_totp, get_totp_qr_data_uri,
)
from app.services.audit import AuditService
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

_settings = get_settings()

# ─── Redis helpers for login lockout ──────────────────────────────────────────

def _lockout_key(email: str) -> str:
    return f"admin_lockout:{email}"

def _attempts_key(email: str) -> str:
    return f"admin_login_attempts:{email}"

async def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(_settings.REDIS_URL, decode_responses=True)

async def _check_lockout(email: str) -> None:
    """Raise 429 if the email is currently locked out."""
    r = await _get_redis()
    try:
        locked = await r.exists(_lockout_key(email))
        if locked:
            ttl = await r.ttl(_lockout_key(email))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked. Try again in {ttl} seconds.",
            )
    finally:
        await r.aclose()

async def _record_failed_attempt(email: str) -> None:
    """Increment failure counter; lock out after MAX_ATTEMPTS."""
    r = await _get_redis()
    try:
        key = _attempts_key(email)
        attempts = await r.incr(key)
        # Keep the counter alive for the lockout window
        await r.expire(key, _settings.ADMIN_LOGIN_LOCKOUT_SECONDS)
        if attempts >= _settings.ADMIN_LOGIN_MAX_ATTEMPTS:
            await r.setex(
                _lockout_key(email),
                _settings.ADMIN_LOGIN_LOCKOUT_SECONDS,
                "1",
            )
            await r.delete(key)
    finally:
        await r.aclose()

async def _clear_failed_attempts(email: str) -> None:
    """Clear counter on successful password verification."""
    r = await _get_redis()
    try:
        await r.delete(_attempts_key(email))
    finally:
        await r.aclose()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class TelegramAuthRequest(BaseModel):
    init_data: str


class TelegramLoginWidgetRequest(BaseModel):
    """Telegram Login Widget OAuth data — sent when user logs in via the widget in a browser."""
    id: int
    first_name: str = ""
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

class AdminLoginRequest(BaseModel):
    email: str
    password: str


class TotpVerifyRequest(BaseModel):
    code: str
    temp_token: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/telegram", response_model=TokenResponse)
async def auth_telegram(
    payload: TelegramAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate via Telegram WebApp initData."""
    try:
        tg_user = validate_telegram_init_data(payload.init_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    telegram_id = int(tg_user["id"])

    # Upsert user
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            telegram_id=telegram_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name", ""),
            last_name=tg_user.get("last_name"),
            referral_code=secrets.token_urlsafe(8)[:10].upper(),
        )
        db.add(user)
        await db.flush()
    else:
        # Update profile
        user.username = tg_user.get("username")
        user.first_name = tg_user.get("first_name", user.first_name)
        user.last_name = tg_user.get("last_name")

    access = create_user_access_token(str(user.id))
    refresh = create_user_refresh_token(str(user.id))
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/telegram-login", response_model=TokenResponse)
async def auth_telegram_login_widget(
    payload: TelegramLoginWidgetRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate via Telegram Login Widget (browser OAuth flow).
    The widget passes { id, first_name, last_name, username, photo_url, auth_date, hash }.
    Hash is verified using SHA-256 of sorted key=value pairs against SHA-256 of BOT_TOKEN.
    """
    from app.config import get_settings
    settings = get_settings()

    # Check auth_date freshness (max 1 day old)
    if time.time() - payload.auth_date > 86400:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login data expired")

    # Build check string: all fields except hash, sorted, joined by \n
    fields = {
        "id": str(payload.id),
        "first_name": payload.first_name,
        "auth_date": str(payload.auth_date),
    }
    if payload.last_name:
        fields["last_name"] = payload.last_name
    if payload.username:
        fields["username"] = payload.username
    if payload.photo_url:
        fields["photo_url"] = payload.photo_url

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))

    # secret = SHA-256(bot_token)  ← Login Widget uses plain SHA-256, not HMAC
    secret_key = hashlib.sha256(settings.BOT_TOKEN.encode()).digest()
    expected_hash = _hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not _hmac.compare_digest(expected_hash, payload.hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login widget hash")

    telegram_id = payload.id

    # Upsert user
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            telegram_id=telegram_id,
            username=payload.username,
            first_name=payload.first_name,
            last_name=payload.last_name,
            referral_code=secrets.token_urlsafe(8)[:10].upper(),
        )
        db.add(user)
        await db.flush()
    else:
        user.username = payload.username or user.username
        user.first_name = payload.first_name or user.first_name
        user.last_name = payload.last_name

    access = create_user_access_token(str(user.id))
    refresh = create_user_refresh_token(str(user.id))
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    user_id = decode_refresh_token(payload.refresh_token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or user.is_banned:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or banned")

    access = create_user_access_token(str(user.id))
    new_refresh = create_user_refresh_token(str(user.id))
    return TokenResponse(access_token=access, refresh_token=new_refresh)


@router.post("/admin/login")
async def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Admin login — returns temp token if 2FA enabled, else full token."""

    # ── Lockout check ────────────────────────────────────────────────────────
    await _check_lockout(payload.email)

    result = await db.execute(select(AdminUser).where(AdminUser.email == payload.email))
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(payload.password, admin.password_hash):
        # Record failure regardless of whether the user exists (prevents enumeration)
        await _record_failed_attempt(payload.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not admin.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    # ── Clear failure counter on success ─────────────────────────────────────
    await _clear_failed_attempts(payload.email)

    # Log attempt
    audit = AuditService(db)
    await audit.log(
        action="admin_login_attempt",
        resource_type="admin_user",
        resource_id=str(admin.id),
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    # ── Mandatory TOTP enforcement ────────────────────────────────────────────
    # If the platform requires TOTP and this admin hasn't set it up yet,
    # return a special flag so the frontend redirects to the 2FA setup wizard.
    if _settings.ADMIN_TOTP_REQUIRED and not admin.is_totp_enabled:
        temp_token = create_admin_token(str(admin.id), "pending_2fa_setup", {"pending_2fa_setup": True})
        return {"requires_2fa_setup": True, "temp_token": temp_token}

    if admin.is_totp_enabled:
        # Issue a short-lived temp token for 2FA step
        temp_token = create_admin_token(str(admin.id), "pending_2fa", {"pending_2fa": True})
        return {"requires_2fa": True, "temp_token": temp_token}

    # No 2FA: issue full token
    result2 = await db.execute(select(AdminRole).where(AdminRole.id == admin.role_id))
    role = result2.scalar_one_or_none()
    permissions = role.permissions if role else {}
    token = create_admin_token(str(admin.id), role.name if role else "unknown", permissions)

    admin.last_login_at = datetime.now(timezone.utc)
    admin.last_login_ip = request.client.host if request.client else None

    return {"access_token": token, "token_type": "bearer", "requires_2fa": False}


@router.post("/admin/2fa")
async def admin_2fa_verify(
    payload: TotpVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Verify TOTP code and issue full admin token."""
    from app.services.auth import decode_admin_token
    data = decode_admin_token(payload.temp_token)
    if not data or not data.get("permissions", {}).get("pending_2fa"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid temp token")

    admin_id = data["sub"]
    totp_lockout_key = f"totp_lockout:{admin_id}"

    # Brute-force guard on TOTP
    r = await _get_redis()
    try:
        if await r.exists(totp_lockout_key):
            ttl = await r.ttl(totp_lockout_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed TOTP attempts. Try again in {ttl} seconds.",
            )
    finally:
        await r.aclose()

    result = await db.execute(select(AdminUser).where(AdminUser.id == uuid.UUID(admin_id)))
    admin = result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

    if not verify_totp(admin.totp_secret, payload.code):
        # Track failed TOTP attempts separately with a shorter window (5 min)
        r2 = await _get_redis()
        try:
            totp_attempts_key = f"totp_attempts:{admin_id}"
            attempts = await r2.incr(totp_attempts_key)
            await r2.expire(totp_attempts_key, 300)
            if attempts >= _settings.ADMIN_LOGIN_MAX_ATTEMPTS:
                await r2.setex(totp_lockout_key, 300, "1")
                await r2.delete(totp_attempts_key)
        finally:
            await r2.aclose()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid TOTP code")

    # Clear TOTP attempt counter
    r3 = await _get_redis()
    try:
        await r3.delete(f"totp_attempts:{admin_id}")
    finally:
        await r3.aclose()

    result2 = await db.execute(select(AdminRole).where(AdminRole.id == admin.role_id))
    role = result2.scalar_one_or_none()
    permissions = role.permissions if role else {}
    token = create_admin_token(str(admin.id), role.name if role else "unknown", permissions)

    admin.last_login_at = datetime.now(timezone.utc)
    admin.last_login_ip = request.client.host if request.client else None

    return {"access_token": token, "token_type": "bearer"}


class AdminRefreshRequest(BaseModel):
    refresh_token: str


@router.post("/admin/refresh")
async def admin_refresh_token(
    payload: AdminRefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange a valid admin refresh token for a new access token.
    Admin refresh tokens are long-lived JWTs signed with ADMIN_JWT_SECRET
    and carry a `refresh: true` claim.
    """
    from app.services.auth import decode_admin_token
    data = decode_admin_token(payload.refresh_token)
    if not data or not data.get("permissions", {}).get("refresh"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(select(AdminUser).where(AdminUser.id == uuid.UUID(data["sub"])))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found or inactive")

    result2 = await db.execute(select(AdminRole).where(AdminRole.id == admin.role_id))
    role = result2.scalar_one_or_none()
    permissions = role.permissions if role else {}
    new_token = create_admin_token(str(admin.id), role.name if role else "unknown", permissions)
    # Issue a fresh refresh token too
    new_refresh = create_admin_token(
        str(admin.id), "refresh", {"refresh": True},
        expire_hours=_settings.ADMIN_JWT_EXPIRE_HOURS * 24,  # 8 days
    )
    return {"access_token": new_token, "refresh_token": new_refresh, "token_type": "bearer"}


async def admin_2fa_setup(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate new TOTP secret and return QR code for setup."""
    secret = generate_totp_secret()
    admin.totp_secret = secret
    admin.is_totp_enabled = False  # Not enabled until verified
    await db.flush()

    qr_data_uri = get_totp_qr_data_uri(admin.email, secret)
    return {"secret": secret, "qr_data_uri": qr_data_uri}


class ForcedSetupRequest(BaseModel):
    temp_token: str
    code: str


@router.post("/admin/2fa/setup-forced")
async def admin_2fa_setup_forced(
    payload: ForcedSetupRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Complete forced TOTP setup for admins who haven't configured 2FA yet.
    Called with the temp_token issued when ADMIN_TOTP_REQUIRED=true and the
    admin has no TOTP secret.  The frontend should:
      1. POST /auth/admin/2fa/setup-forced with temp_token to get QR code
         (use GET param mode = 'init')
      2. User scans QR, enters code
      3. POST /auth/admin/2fa/setup-forced with temp_token + code to confirm
    For simplicity this endpoint handles step 1 (no code) and step 2 (with code).
    """
    from app.services.auth import decode_admin_token
    data = decode_admin_token(payload.temp_token)
    if not data or not data.get("permissions", {}).get("pending_2fa_setup"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid setup token")

    result = await db.execute(select(AdminUser).where(AdminUser.id == uuid.UUID(data["sub"])))
    admin = result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

    if not payload.code:
        # Step 1: generate secret + QR
        secret = generate_totp_secret()
        admin.totp_secret = secret
        admin.is_totp_enabled = False
        await db.flush()
        qr_data_uri = get_totp_qr_data_uri(admin.email, secret)
        return {"secret": secret, "qr_data_uri": qr_data_uri}

    # Step 2: confirm and issue full token
    if not admin.totp_secret:
        raise HTTPException(status_code=400, detail="TOTP setup not initiated")
    if not verify_totp(admin.totp_secret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    admin.is_totp_enabled = True

    result2 = await db.execute(select(AdminRole).where(AdminRole.id == admin.role_id))
    role = result2.scalar_one_or_none()
    permissions = role.permissions if role else {}
    token = create_admin_token(str(admin.id), role.name if role else "unknown", permissions)

    admin.last_login_at = datetime.now(timezone.utc)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/admin/2fa/confirm")
async def admin_2fa_confirm(
    code: str = Body(..., embed=True),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Confirm TOTP setup with first code."""
    if not admin.totp_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated")
    if not verify_totp(admin.totp_secret, code):
        raise HTTPException(status_code=400, detail="Invalid code")
    admin.is_totp_enabled = True
    return {"message": "2FA enabled successfully"}
