import hashlib
import hmac
import json
import time
from urllib.parse import unquote, parse_qs
from typing import Optional
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext
import pyotp
import qrcode
import qrcode.image.svg
from io import BytesIO
import base64

from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Telegram initData validation ─────────────────────────────────────────────

def validate_telegram_init_data(init_data: str) -> dict:
    """
    Validate Telegram WebApp initData using HMAC-SHA256.
    Returns parsed user dict if valid, raises ValueError if invalid.
    """
    parsed = dict(parse_qs(init_data, keep_blank_values=True))
    # Flatten single-value lists
    parsed = {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise ValueError("No hash in initData")

    # Check auth_date freshness (max 1 hour old)
    auth_date = int(parsed.get("auth_date", 0))
    if time.time() - auth_date > 3600:
        raise ValueError("initData expired")

    # Build data-check-string: sorted key=value pairs joined by \n
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed.items())
    )

    # secret_key = HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(
        b"WebAppData",
        settings.BOT_TOKEN.encode(),
        hashlib.sha256
    ).digest()

    # expected_hash = HMAC-SHA256(secret_key, data_check_string)
    expected_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise ValueError("Invalid initData hash")

    # Parse user JSON
    user_data = parsed.get("user", "{}")
    if isinstance(user_data, str):
        user_data = json.loads(unquote(user_data))

    return user_data


# ─── Password hashing ─────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ─── JWT tokens ───────────────────────────────────────────────────────────────

def create_user_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "type": "user_access", "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_user_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": user_id, "type": "user_refresh", "exp": expire},
        settings.JWT_REFRESH_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_admin_token(admin_id: str, role: str, permissions: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.ADMIN_JWT_EXPIRE_HOURS)
    return jwt.encode(
        {
            "sub": admin_id,
            "type": "admin",
            "role": role,
            "permissions": permissions,
            "exp": expire,
        },
        settings.ADMIN_JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_user_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") not in ("user_access",):
            return None
        return payload.get("sub")
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.JWT_REFRESH_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "user_refresh":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def decode_admin_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.ADMIN_JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "admin":
            return None
        return payload
    except JWTError:
        return None


# ─── TOTP 2FA ─────────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    return pyotp.random_base32()


def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def get_totp_qr_data_uri(email: str, secret: str, issuer: str = "UzumBot Admin") -> str:
    """Returns base64 PNG data URI for QR code."""
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=email, issuer_name=issuer)

    qr = qrcode.make(provisioning_uri)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{b64}"
