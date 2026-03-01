import uuid
import hashlib
import hmac as _hmac
import time
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.services.auth import decode_user_token, decode_admin_token
from app.models import User, AdminUser
from app.config import get_settings

bearer = HTTPBearer(auto_error=False)
_settings = get_settings()

# Replay-protection window: reject requests older than 5 minutes
_SIGNATURE_MAX_AGE_SECONDS = 300


async def verify_bot_signature(request: Request) -> None:
    """
    Dependency that validates HMAC-signed bot-internal requests.

    When BOT_API_HMAC_SECRET is set the request must include:
      X-Bot-Signature: HMAC-SHA256(secret, "METHOD\\npath\\ntimestamp\\nsha256(body)")
      X-Bot-Timestamp: unix timestamp (seconds)

    If BOT_API_HMAC_SECRET is empty the check is skipped (dev/legacy mode).
    Falls back to legacy plain-secret comparison for backwards compatibility.
    """
    hmac_secret = _settings.BOT_API_HMAC_SECRET
    bot_secret = _settings.BOT_WEBHOOK_SECRET

    sig_header = request.headers.get("X-Bot-Signature")
    ts_header = request.headers.get("X-Bot-Timestamp")

    if hmac_secret and sig_header and ts_header:
        # ── New HMAC path ──────────────────────────────────────────────────────
        try:
            ts = int(ts_header)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid timestamp")

        if abs(time.time() - ts) > _SIGNATURE_MAX_AGE_SECONDS:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Request timestamp expired")

        body = await request.body()
        body_hash = hashlib.sha256(body).hexdigest()
        signing_string = f"{request.method.upper()}\n{request.url.path}\n{ts_header}\n{body_hash}"
        expected = _hmac.new(
            hmac_secret.encode(),
            signing_string.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not _hmac.compare_digest(expected, sig_header):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bot signature")
    elif not hmac_secret and not sig_header:
        # ── Legacy path: body contains 'secret' field — validated inline by route ─
        # Nothing to do here; the route itself calls hmac.compare_digest(secret, BOT_WEBHOOK_SECRET)
        pass
    else:
        # HMAC secret configured but headers missing — reject
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing bot signature headers")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id = decode_user_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is banned")

    return user


async def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_admin_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired admin token")

    result = await db.execute(select(AdminUser).where(AdminUser.id == uuid.UUID(payload["sub"])))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found or inactive")

    return admin


def require_permission(permission: str):
    async def checker(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
        db: AsyncSession = Depends(get_db),
    ) -> AdminUser:
        admin = await get_current_admin(credentials, db)
        payload = decode_admin_token(credentials.credentials)
        permissions = payload.get("permissions", [])
        # permissions is a list of strings (e.g. ["submissions.read", ...])
        # superadmin role name grants all permissions
        role = payload.get("role", "")
        if permission not in permissions and role != "superadmin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}"
            )
        return admin
    return checker
