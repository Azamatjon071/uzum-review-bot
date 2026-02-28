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
from sqlalchemy import select, desc, func, or_
from pydantic import BaseModel
from typing import Optional
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


class DonateRequest(BaseModel):
    campaign_id: Optional[uuid.UUID] = None
    amount: Optional[float] = None
    amount_uzs: Optional[float] = None  # alias for compatibility


@charity_router.post("/donate")
async def donate(
    body: DonateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    amount_uzs = body.amount_uzs or body.amount
    if not amount_uzs:
        raise HTTPException(status_code=400, detail="amount or amount_uzs is required")
    svc = CharityService(db)
    donation = await svc.donate(user.id, float(amount_uzs), campaign_id=body.campaign_id)
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
                "name_ru": prize.name_ru if prize else "",
                "name_en": prize.name_en if prize else "",
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
    await db.commit()
    return {"message": "Reward claimed!", "claim_code": reward.claim_code}


@rewards_router.post("/{reward_id}/donate")
async def donate_reward(
    reward_id: uuid.UUID,
    campaign_id: uuid.UUID = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Donate a pending reward to charity."""
    from datetime import datetime, timezone
    from app.models import CharityDonation, RewardStatus
    result = await db.execute(select(Reward).where(
        Reward.id == reward_id, Reward.user_id == user.id
    ))
    reward = result.scalar_one_or_none()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if reward.status != RewardStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot donate: reward is {reward.status.value}")

    # Get prize value for donation amount
    prize_r = await db.execute(select(Prize).where(Prize.id == reward.prize_id))
    prize = prize_r.scalar_one_or_none()
    amount = float(prize.value) if prize else 0

    reward.status = RewardStatus.DONATED
    reward.claimed_at = datetime.now(timezone.utc)

    donation = CharityDonation(
        user_id=user.id,
        campaign_id=campaign_id,
        amount_uzs=amount,
        source="reward",
        reward_id=reward.id,
    )
    db.add(donation)

    # Update campaign raised amount
    if campaign_id:
        from app.models import CharityCampaign
        camp = await db.get(CharityCampaign, campaign_id)
        if camp:
            camp.raised_amount = float(camp.raised_amount) + amount

    await db.commit()
    return {"message": "JazakAllah khayr! Reward donated to charity.", "donation_id": str(donation.id)}


app.include_router(rewards_router)


# ─── User profile ─────────────────────────────────────────────────────────────

me_router = APIRouter(prefix="/api/v1/me", tags=["me"])

@me_router.get("/referral")
async def get_me_referral(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return referral stats for the current user (used by webapp ProfilePage)."""
    referred_count_r = await db.execute(
        select(func.count(User.id)).where(User.referred_by_id == user.id)
    )
    referred_count = referred_count_r.scalar() or 0

    # total_wins = actual claimed/pending rewards (not total_spins)
    total_wins_r = await db.execute(
        select(func.count(Reward.id)).where(Reward.user_id == user.id)
    )
    total_wins = total_wins_r.scalar() or 0

    return {
        "referral_code": user.referral_code,
        "referral_count": referred_count,
        "total_referrals": referred_count,
        "bonus_spins": user.referral_bonus_spins,
        "earned_bonus_spins": user.referral_bonus_spins,
        "total_spins": user.total_spins,
        "total_wins": total_wins,
    }


@me_router.get("")
async def get_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Count referred users
    referred_count_r = await db.execute(
        select(func.count(User.id)).where(User.referred_by_id == user.id)
    )
    referred_count = referred_count_r.scalar() or 0

    return {
        "id": str(user.id),
        "telegram_id": user.telegram_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "bio": user.bio,
        "profile_photo_url": user.profile_photo_url,
        "language": user.language.value,
        "total_submissions": user.total_submissions,
        "approved_submissions": user.approved_submissions,
        "total_spins": user.total_spins,
        "spin_count": user.spin_count,
        "referral_code": user.referral_code,
        "referral_bonus_spins": user.referral_bonus_spins,
        "referred_count": referred_count,
        "last_seen_at": user.last_seen_at.isoformat() if user.last_seen_at else None,
        "created_at": user.created_at.isoformat(),
    }

app.include_router(me_router)


# ─── Public products endpoint (for bot + webapp) ──────────────────────────────

products_public_router = APIRouter(prefix="/api/v1/products", tags=["products"])

@products_public_router.get("")
async def list_public_products(
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: list active products for bot/webapp product selection."""
    from app.models import Product
    from sqlalchemy import or_
    query = select(Product).where(Product.is_active == True)
    if search:
        query = query.where(
            or_(
                Product.name_uz.ilike(f"%{search}%"),
                Product.name_ru.ilike(f"%{search}%"),
                Product.name_en.ilike(f"%{search}%"),
            )
        )
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    products = (
        await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(Product.name_uz))
    ).scalars().all()
    return {
        "products": [
            {
                "id": str(p.id),
                "name_uz": p.name_uz,
                "name_ru": p.name_ru,
                "name_en": p.name_en,
                "uzum_product_url": p.uzum_product_url,
                "image_url": p.image_url,
            }
            for p in products
        ],
        "total": total or 0,
    }

app.include_router(products_public_router)


# ─── Bot internal API ─────────────────────────────────────────────────────────

from sqlalchemy import func as sql_func

bot_router = APIRouter(prefix="/api/v1/bot", tags=["bot-internal"])


class BotRegisterRequest(BaseModel):
    telegram_id: int
    first_name: str = ""
    last_name: str | None = None
    username: str | None = None
    language_code: str = "uz"
    secret: str
    # Extended profile
    bio: str | None = None
    profile_photo_file_id: str | None = None
    # Referral
    referred_by_code: str | None = None


@bot_router.post("/register")
async def bot_register_user(
    payload: BotRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Bot-internal: upsert user and return is_new flag. Handles referral attribution."""
    if not hmac.compare_digest(payload.secret, settings.BOT_WEBHOOK_SECRET):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    from datetime import datetime, timezone
    from app.models import Language, NotificationType, Notification

    result = await db.execute(select(User).where(User.telegram_id == payload.telegram_id))
    user = result.scalar_one_or_none()
    is_new = user is None

    lang_map = {"uz": "uz", "ru": "ru", "en": "en"}
    lang = lang_map.get(payload.language_code, "uz")

    if is_new:
        import secrets as _secrets
        user = User(
            telegram_id=payload.telegram_id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            username=payload.username,
            language=Language(lang),
            bio=payload.bio,
            profile_photo_file_id=payload.profile_photo_file_id,
            referral_code=_secrets.token_urlsafe(8)[:10].upper(),
            last_seen_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()  # get user.id before referral lookup

        # ── Referral attribution ──────────────────────────────────────────
        if payload.referred_by_code:
            ref_r = await db.execute(
                select(User).where(User.referral_code == payload.referred_by_code.upper())
            )
            referrer = ref_r.scalar_one_or_none()
            if referrer and referrer.id != user.id and not referrer.is_banned:
                user.referred_by_id = referrer.id
                # Grant referrer bonus spins
                bonus = settings.REFERRAL_BONUS_SPINS
                referrer.spin_count += bonus
                referrer.referral_bonus_spins += bonus
                # Count total referrals for this referrer
                ref_count_r = await db.execute(
                    select(sql_func.count(User.id)).where(User.referred_by_id == referrer.id)
                )
                ref_total = (ref_count_r.scalar() or 0)

                # Queue referral bonus notification
                db.add(Notification(
                    user_id=referrer.id,
                    notification_type=NotificationType.REFERRAL_BONUS,
                    payload={
                        "referred_name": payload.first_name,
                        "total_referrals": ref_total,
                        "spin_count": referrer.spin_count,
                    },
                ))
                # Dispatch Celery task immediately
                from app.tasks.notifications import notify_referral_bonus
                # We defer this to after commit below

        await db.commit()

        # Send referral bonus notification (after commit so DB is consistent)
        if payload.referred_by_code:
            ref_r2 = await db.execute(
                select(User).where(User.referral_code == payload.referred_by_code.upper())
            )
            referrer2 = ref_r2.scalar_one_or_none()
            if referrer2 and referrer2.telegram_id:
                from app.tasks.notifications import notify_referral_bonus
                ref_count_r2 = await db.execute(
                    select(sql_func.count(User.id)).where(User.referred_by_id == referrer2.id)
                )
                notify_referral_bonus.delay(
                    telegram_id=referrer2.telegram_id,
                    referred_name=payload.first_name or "Someone",
                    total_referrals=ref_count_r2.scalar() or 1,
                    spin_count=referrer2.spin_count,
                    lang=referrer2.language.value if referrer2.language else "uz",
                )
    else:
        # Update name/username/profile on every /start
        user.first_name = payload.first_name or user.first_name
        user.last_name = payload.last_name
        user.username = payload.username
        user.last_seen_at = datetime.now(timezone.utc)
        if payload.bio:
            user.bio = payload.bio
        if payload.profile_photo_file_id:
            user.profile_photo_file_id = payload.profile_photo_file_id
        await db.commit()

    return {
        "is_new": is_new,
        "user_id": str(user.id),
        "referral_code": user.referral_code,
        "spin_count": user.spin_count,
        "language": user.language.value if user.language else "uz",
    }


@bot_router.get("/user/{telegram_id}")
async def bot_get_user(
    telegram_id: int,
    secret: str,
    db: AsyncSession = Depends(get_db),
):
    """Get user info including spin count and referral stats."""
    if not hmac.compare_digest(secret, settings.BOT_WEBHOOK_SECRET):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ref_count_r = await db.execute(
        select(sql_func.count(User.id)).where(User.referred_by_id == user.id)
    )
    referred_count = ref_count_r.scalar() or 0

    return {
        "id": str(user.id),
        "first_name": user.first_name,
        "username": user.username,
        "language": user.language.value if user.language else "uz",
        "spin_count": user.spin_count,
        "total_spins": user.total_spins,
        "approved_submissions": user.approved_submissions,
        "total_submissions": user.total_submissions,
        "referral_code": user.referral_code,
        "referral_bonus_spins": user.referral_bonus_spins,
        "referred_count": referred_count,
        "is_banned": user.is_banned,
    }


app.include_router(bot_router)
