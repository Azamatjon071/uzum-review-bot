import hmac
import hashlib
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import get_settings
from app.database import engine, Base
from app.services.storage import ensure_bucket_exists

# Routers
from app.routers.auth import router as auth_router
from app.routers.submissions import router as submissions_router
from app.routers.spins import router as spins_router
from app.routers.admin.submissions import router as admin_submissions_router
from app.routers.admin.users import router as admin_users_router
from app.routers.admin.prizes import router as admin_prizes_router
from app.routers.admin.charity import router as admin_charity_router
from app.routers.admin.analytics import router as admin_analytics_router
from app.routers.admin.audit import router as admin_audit_router
from app.routers.admin.admins import router as admin_admins_router
from app.routers.admin.settings import router as admin_settings_router
from app.routers.admin.broadcast import router as admin_broadcast_router
from app.routers.admin.products import router as admin_products_router
from app.routers.admin.reports import router as admin_reports_router

settings = get_settings()
log = structlog.get_logger()
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting UzumBot API", environment=settings.ENVIRONMENT)
    # Ensure DB tables exist (dev only — use Alembic in production)
    if settings.ENVIRONMENT == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    # Ensure MinIO bucket exists
    try:
        ensure_bucket_exists()
        log.info("MinIO bucket ready")
    except Exception as e:
        log.warning("MinIO bucket setup failed", error=str(e))
    yield
    log.info("Shutting down UzumBot API")
    await engine.dispose()


app = FastAPI(
    title="UzumBot API",
    version="1.0.0",
    description="Uzum Market Review Rewards Platform",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/api/openapi.json" if settings.ENVIRONMENT != "production" else None,
)

# ─── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Prometheus metrics ───────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# ─── Request logging middleware ───────────────────────────────────────────────

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    import time
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 2)
    log.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
        ip=request.client.host if request.client else None,
    )
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ─── Telegram Webhook Endpoint ────────────────────────────────────────────────

@app.post("/api/v1/webhook/telegram")
async def telegram_webhook(request: Request):
    """Receive Telegram Bot webhook updates. Secret token validated."""
    secret_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    expected = settings.BOT_WEBHOOK_SECRET
    if not hmac.compare_digest(secret_token.encode(), expected.encode()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid webhook token")
    # The actual update processing is handled by the bot service
    # Here we just acknowledge receipt
    body = await request.json()
    log.debug("Telegram webhook received", update_id=body.get("update_id"))
    return {"ok": True}


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


# ─── Routers ──────────────────────────────────────────────────────────────────

PREFIX = "/api/v1"

app.include_router(auth_router, prefix=PREFIX)
app.include_router(submissions_router, prefix=PREFIX)
app.include_router(spins_router, prefix=PREFIX)
app.include_router(admin_submissions_router, prefix=PREFIX)
app.include_router(admin_users_router, prefix=PREFIX)
app.include_router(admin_prizes_router, prefix=PREFIX)
app.include_router(admin_charity_router, prefix=PREFIX)
app.include_router(admin_analytics_router, prefix=PREFIX)
app.include_router(admin_audit_router, prefix=PREFIX)
app.include_router(admin_admins_router, prefix=PREFIX)
app.include_router(admin_settings_router, prefix=PREFIX)
app.include_router(admin_broadcast_router, prefix=PREFIX)
app.include_router(admin_products_router, prefix=PREFIX)
app.include_router(admin_reports_router, prefix=PREFIX)


# ─── Charity & Rewards routers (inline) ──────────────────────────────────────

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from app.database import get_db
from app.deps import get_current_user
from app.models import Reward, RewardStatus, User, Prize
from app.services.charity import CharityService
import uuid

charity_router = APIRouter(prefix="/api/v1/charity", tags=["charity"])

@charity_router.get("/campaigns")
async def get_campaigns(db: AsyncSession = Depends(get_db)):
    svc = CharityService(db)
    campaigns = await svc.get_active_campaigns()
    return {
        "campaigns": [
            {
                "id": str(c.id),
                "name_uz": c.name_uz, "name_ru": c.name_ru, "name_en": c.name_en,
                "description_uz": c.description_uz,
                "image_url": c.image_url,
                "goal_amount": float(c.goal_amount),
                "raised_amount": float(c.raised_amount),
                "currency": c.currency,
                "deadline": c.deadline.isoformat() if c.deadline else None,
                "progress_pct": round(float(c.raised_amount) / float(c.goal_amount) * 100, 1) if c.goal_amount else 0,
            }
            for c in campaigns
        ]
    }


@charity_router.post("/donate")
async def donate(
    campaign_id: uuid.UUID = None,
    amount_uzs: float = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CharityService(db)
    donation = await svc.donate(user.id, amount_uzs, campaign_id=campaign_id)
    return {"id": str(donation.id), "message": "Sadaqa accepted. JazakAllah khayr."}


@charity_router.get("/leaderboard")
async def charity_leaderboard(db: AsyncSession = Depends(get_db)):
    svc = CharityService(db)
    return {"leaderboard": await svc.get_leaderboard()}


app.include_router(charity_router)


rewards_router = APIRouter(prefix="/api/v1/rewards", tags=["rewards"])

@rewards_router.get("")
async def get_my_rewards(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rewards = (await db.execute(
        select(Reward).where(Reward.user_id == user.id).order_by(desc(Reward.created_at))
    )).scalars().all()
    items = []
    for r in rewards:
        prize_r = await db.execute(select(Prize).where(Prize.id == r.prize_id))
        prize = prize_r.scalar_one_or_none()
        items.append({
            "id": str(r.id),
            "status": r.status.value,
            "claim_code": r.claim_code,
            "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            "created_at": r.created_at.isoformat(),
            "prize": {
                "name_uz": prize.name_uz if prize else "",
                "type": prize.prize_type.value if prize else "",
                "value": float(prize.value) if prize else 0,
                "icon_url": prize.icon_url if prize else None,
                "color": prize.color if prize else "#6366f1",
            } if prize else None,
        })
    return {"rewards": items}


@rewards_router.post("/{reward_id}/claim")
async def claim_reward(
    reward_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    result = await db.execute(select(Reward).where(
        Reward.id == reward_id, Reward.user_id == user.id
    ))
    reward = result.scalar_one_or_none()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if reward.status != RewardStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Reward already {reward.status.value}")
    if reward.expires_at and reward.expires_at < datetime.now(timezone.utc):
        reward.status = RewardStatus.EXPIRED
        raise HTTPException(status_code=400, detail="Reward has expired")
    reward.status = RewardStatus.CLAIMED
    reward.claimed_at = datetime.now(timezone.utc)
    return {"message": "Reward claimed!", "claim_code": reward.claim_code}


app.include_router(rewards_router)


# ─── User profile ─────────────────────────────────────────────────────────────

me_router = APIRouter(prefix="/api/v1/me", tags=["me"])

@me_router.get("")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "telegram_id": user.telegram_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "language": user.language.value,
        "total_submissions": user.total_submissions,
        "approved_submissions": user.approved_submissions,
        "total_spins": user.total_spins,
        "referral_code": user.referral_code,
        "created_at": user.created_at.isoformat(),
    }

app.include_router(me_router)


# ─── Bot internal API ─────────────────────────────────────────────────────────

bot_router = APIRouter(prefix="/api/v1/bot", tags=["bot-internal"])


class BotRegisterRequest(BaseModel):
    telegram_id: int
    first_name: str = ""
    last_name: str | None = None
    username: str | None = None
    language_code: str = "uz"
    secret: str


@bot_router.post("/register")
async def bot_register_user(
    payload: BotRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Bot-internal: upsert user and return is_new flag."""
    if not hmac.compare_digest(payload.secret, settings.BOT_WEBHOOK_SECRET):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    result = await db.execute(select(User).where(User.telegram_id == payload.telegram_id))
    user = result.scalar_one_or_none()
    is_new = user is None

    if is_new:
        import secrets as _secrets
        lang_map = {"uz": "uz", "ru": "ru", "en": "en"}
        from app.models import Language
        lang = lang_map.get(payload.language_code, "uz")
        user = User(
            telegram_id=payload.telegram_id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            username=payload.username,
            language=Language(lang),
            referral_code=_secrets.token_urlsafe(8)[:10].upper(),
        )
        db.add(user)
        await db.commit()
    else:
        # Update name/username
        user.first_name = payload.first_name or user.first_name
        user.last_name = payload.last_name
        user.username = payload.username
        await db.commit()

    return {"is_new": is_new, "user_id": str(user.id)}


app.include_router(bot_router)
