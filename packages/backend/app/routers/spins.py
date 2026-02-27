import uuid
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.deps import get_current_user
from app.models import Prize, User
from app.services.spin import SpinService, generate_server_seed, hash_seed, generate_nonce
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/spins", tags=["spins"])

SEED_CACHE_TTL = 600  # 10 min TTL for uncommitted seeds


async def get_redis():
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
    try:
        yield r
    finally:
        await r.aclose()


class ExecuteSpinRequest(BaseModel):
    commitment_id: uuid.UUID


class VerifySpinRequest(BaseModel):
    spin_id: uuid.UUID
    server_seed: str
    nonce: str
    seed_hash: str


@router.get("/eligibility")
async def check_eligibility(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = SpinService(db)
    eligible, reason = await svc.check_eligibility(user.id)
    return {"eligible": eligible, "reason": reason}


@router.post("/commit")
async def create_commitment(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """
    Step 1 of provably fair: create and return hash commitment.
    The actual seed is stored server-side (Redis) until spin is executed.
    User receives only the hash — they cannot manipulate the outcome.
    """
    svc = SpinService(db)
    eligible, reason = await svc.check_eligibility(user.id)
    if not eligible:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not eligible to spin: {reason}"
        )

    seed = generate_server_seed()
    nonce = generate_nonce()
    seed_hash = hash_seed(seed)

    commitment, seed = await svc.create_commitment(user.id)

    # Store seed in Redis with TTL (not in DB — only hash goes to DB/user)
    await redis.setex(
        f"spin_seed:{commitment.id}",
        SEED_CACHE_TTL,
        seed.hex() if isinstance(seed, bytes) else seed,
    )

    return {
        "commitment_id": str(commitment.id),
        "seed_hash": commitment.server_seed_hash,
        "nonce": commitment.nonce,
        "message": "Hash committed. Spin now and we'll reveal the seed for verification.",
    }


@router.post("/execute")
async def execute_spin(
    payload: ExecuteSpinRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """
    Step 2: Execute spin. Retrieves committed seed from Redis, spins, reveals seed.
    """
    seed_hex = await redis.get(f"spin_seed:{payload.commitment_id}")
    if not seed_hex:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Commitment expired or not found. Please start over."
        )
    if isinstance(seed_hex, bytes):
        seed_hex = seed_hex.decode()

    svc = SpinService(db)
    try:
        spin, reward = await svc.execute_spin(user.id, payload.commitment_id, seed_hex)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Delete seed from Redis (used)
    await redis.delete(f"spin_seed:{payload.commitment_id}")

    # Get prize details
    prize_result = await db.execute(select(Prize).where(Prize.id == spin.prize_id))
    prize = prize_result.scalar_one()

    return {
        "spin_id": str(spin.id),
        "prize": {
            "id": str(prize.id),
            "name_uz": prize.name_uz,
            "name_ru": prize.name_ru,
            "name_en": prize.name_en,
            "type": prize.prize_type.value,
            "value": float(prize.value),
            "currency": prize.value_currency,
            "icon_url": prize.icon_url,
            "color": prize.color,
        },
        "reward_id": str(reward.id),
        "claim_code": reward.claim_code,
        "expires_at": reward.expires_at.isoformat() if reward.expires_at else None,
        # Reveal seed for provably fair verification
        "server_seed": spin.server_seed,
        "seed_hash": spin.server_seed_hash,
        "nonce": spin.nonce,
        "raw_result": spin.raw_result,
    }


@router.get("/history")
async def spin_history(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func
    from app.models import PrizeSpin
    offset = (page - 1) * limit

    result = await db.execute(
        select(PrizeSpin)
        .where(PrizeSpin.user_id == user.id)
        .order_by(PrizeSpin.created_at.desc())
        .offset(offset).limit(limit)
    )
    spins = result.scalars().all()

    items = []
    for spin in spins:
        prize_result = await db.execute(select(Prize).where(Prize.id == spin.prize_id))
        prize = prize_result.scalar_one_or_none()
        items.append({
            "spin_id": str(spin.id),
            "prize_name": prize.name_uz if prize else "Unknown",
            "server_seed_hash": spin.server_seed_hash,
            "nonce": spin.nonce,
            "created_at": spin.created_at.isoformat(),
        })
    return {"items": items}


@router.post("/verify")
async def verify_spin(
    payload: VerifySpinRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint to verify a past spin's fairness."""
    from app.models import PrizeSpin
    result = await db.execute(
        select(PrizeSpin).where(PrizeSpin.id == payload.spin_id)
    )
    spin = result.scalar_one_or_none()
    if not spin:
        raise HTTPException(status_code=404, detail="Spin not found")

    prizes = (await db.execute(select(Prize).where(Prize.is_active == True))).scalars().all()
    is_fair = SpinService.verify_spin(
        payload.server_seed, payload.nonce, payload.seed_hash, prizes, spin.prize_id
    )
    return {"is_fair": is_fair, "spin_id": str(spin.id)}


@router.get("/prizes")
async def list_prizes(db: AsyncSession = Depends(get_db)):
    """Public prize list with weights (for wheel display and transparency)."""
    result = await db.execute(
        select(Prize)
        .where(Prize.is_active == True)
        .order_by(Prize.weight.desc())
    )
    prizes = result.scalars().all()
    total_weight = sum(p.weight for p in prizes)
    return {
        "prizes": [
            {
                "id": str(p.id),
                "name_uz": p.name_uz,
                "name_ru": p.name_ru,
                "name_en": p.name_en,
                "type": p.prize_type.value,
                "value": float(p.value),
                "currency": p.value_currency,
                "icon_url": p.icon_url,
                "color": p.color,
                "weight": p.weight,
                "probability_pct": round(p.weight / total_weight * 100, 2) if total_weight else 0,
            }
            for p in prizes
        ]
    }
