import secrets
import hashlib
import hmac
import struct
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models import Prize, SpinCommitment, PrizeSpin, Reward, RewardStatus, User, Submission, SubmissionStatus
from app.config import get_settings
import uuid
from datetime import datetime, timedelta, timezone

settings = get_settings()


def generate_server_seed() -> bytes:
    """Generate cryptographically secure server seed."""
    return secrets.token_bytes(32)


def hash_seed(seed: bytes) -> str:
    """SHA-256 hash of seed (sent to user as commitment before spin)."""
    return hashlib.sha256(seed).hexdigest()


def generate_nonce() -> str:
    """Generate random nonce."""
    return secrets.token_hex(16)


def compute_spin_result(server_seed: bytes, nonce: str, total_weight: int) -> int:
    """
    Provably fair spin result.
    result = HMAC-SHA256(server_seed, nonce) interpreted as big-endian uint64 % total_weight
    """
    h = hmac.new(server_seed, nonce.encode(), hashlib.sha256).digest()
    # Take first 8 bytes as uint64 big-endian
    value = struct.unpack(">Q", h[:8])[0]
    return int(value % total_weight)


def select_prize(raw_result: int, prizes: List[Prize]) -> Prize:
    """Select prize from weighted list given a raw_result in [0, total_weight)."""
    cumulative = 0
    for prize in prizes:
        cumulative += prize.weight
        if raw_result < cumulative:
            return prize
    return prizes[-1]  # fallback


class SpinService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_prizes(self) -> List[Prize]:
        result = await self.db.execute(
            select(Prize).where(
                and_(
                    Prize.is_active == True,
                    # Exclude out-of-stock prizes
                    (Prize.stock_limit == None) | (Prize.stock_used < Prize.stock_limit)
                )
            ).order_by(Prize.weight.desc())
        )
        return result.scalars().all()

    async def check_eligibility(self, user_id: uuid.UUID) -> Tuple[bool, str]:
        """Check if user can spin. Returns (eligible, reason)."""
        # First check spin balance (primary source of truth)
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        
        if user and user.spin_count > 0:
            return True, "has_spins"

        # Fallback: Check for unapproved submission (legacy logic, maybe redundant if spin_count wasn't incremented)
        # But if spin_count is 0, they shouldn't spin even if they have an unused submission 
        # (the submission approval should have incremented spin_count).
        
        # If we want to be safe and auto-correct:
        result = await self.db.execute(
            select(Submission).where(
                and_(
                    Submission.user_id == user_id,
                    Submission.status == SubmissionStatus.APPROVED,
                    Submission.spin_granted == False,
                )
            ).limit(1)
        )
        eligible_submission = result.scalar_one_or_none()
        if eligible_submission:
            # Auto-correct: user has eligible submission but 0 spins. 
            # We should probably grant them the spin and let them use it.
            # ideally this should happen at approval time, but for safety:
            return True, "eligible_submission_found"

        return False, "no_spins_available"

    async def get_eligible_submission(self, user_id: uuid.UUID) -> Submission | None:
        result = await self.db.execute(
            select(Submission).where(
                and_(
                    Submission.user_id == user_id,
                    Submission.status == SubmissionStatus.APPROVED,
                    Submission.spin_granted == False,
                )
            ).order_by(Submission.reviewed_at).limit(1)
        )
        return result.scalar_one_or_none()

    async def create_commitment(self, user_id: uuid.UUID) -> SpinCommitment:
        """Step 1: Create and store commitment (hash) BEFORE user spins."""
        seed = generate_server_seed()
        nonce = generate_nonce()
        seed_hash = hash_seed(seed)

        commitment = SpinCommitment(
            user_id=user_id,
            server_seed_hash=seed_hash,
            nonce=nonce,
            is_used=False,
        )
        # Store seed temporarily encoded in nonce field (we'll retrieve it)
        # Actually store seed securely encoded
        commitment._server_seed = seed.hex()  # transient attr

        self.db.add(commitment)
        await self.db.flush()

        # Store actual seed in a secure way - we'll use a Redis cache with TTL
        # For simplicity here, store seed encoded in a separate field
        # In production: use Redis with TTL=10min
        return commitment, seed

    async def execute_spin(
        self, user_id: uuid.UUID, commitment_id: uuid.UUID, server_seed_hex: str
    ) -> Tuple[PrizeSpin, Reward]:
        """Step 2: Execute spin with the pre-committed seed."""
        server_seed = bytes.fromhex(server_seed_hex)
        prizes = await self.get_active_prizes()
        if not prizes:
            raise ValueError("No active prizes available")

        # Get commitment
        result = await self.db.execute(
            select(SpinCommitment).where(
                and_(
                    SpinCommitment.id == commitment_id,
                    SpinCommitment.user_id == user_id,
                    SpinCommitment.is_used == False,
                )
            )
        )
        commitment = result.scalar_one_or_none()
        if not commitment:
            raise ValueError("Invalid or expired commitment")

        # Verify hash matches
        if hash_seed(server_seed) != commitment.server_seed_hash:
            raise ValueError("Seed hash mismatch - integrity error")

        # Get eligible submission (if any)
        # Even if none found, we proceed if user has spins
        submission = await self.get_eligible_submission(user_id)
        
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one()

        if user.spin_count <= 0 and not submission:
             raise ValueError("No spins available and no eligible submission found.")
        
        # If user has 0 spins but HAS a submission, we auto-correct by granting + using immediately
        # (Though ideally approval logic should have granted it)
        
        # Compute result
        total_weight = sum(p.weight for p in prizes)
        raw_result = compute_spin_result(server_seed, commitment.nonce, total_weight)
        prize = select_prize(raw_result, prizes)

        # Create spin record
        spin = PrizeSpin(
            user_id=user_id,
            submission_id=submission.id if submission else None,
            prize_id=prize.id,
            server_seed=server_seed_hex,
            server_seed_hash=commitment.server_seed_hash,
            nonce=commitment.nonce,
            raw_result=raw_result,
        )
        self.db.add(spin)

        # Mark submission as spin used (if applicable)
        if submission:
            submission.spin_granted = True

        # Mark commitment as used
        commitment.is_used = True

        # Update prize stock
        prize.stock_used += 1

        # Create reward
        claim_code = secrets.token_urlsafe(16)
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        reward = Reward(
            user_id=user_id,
            prize_id=prize.id,
            status=RewardStatus.PENDING,
            claim_code=claim_code,
            expires_at=expires_at,
        )
        self.db.add(reward)

        # Update user stats
        user.total_spins += 1
        # Deduct from available spin balance if greater than 0
        if user.spin_count > 0:
            user.spin_count -= 1
        # If user had 0 spins but relied on submission auto-correction, count stays 0

        await self.db.flush()

        # Link reward to spin
        reward.spin_id = spin.id

        return spin, reward

    @staticmethod
    def verify_spin(
        server_seed_hex: str, nonce: str, seed_hash: str, prizes: List[Prize], claimed_prize_id: uuid.UUID
    ) -> bool:
        """Public verification: user can verify their spin was fair."""
        server_seed = bytes.fromhex(server_seed_hex)

        # Verify hash
        if hash_seed(server_seed) != seed_hash:
            return False

        total_weight = sum(p.weight for p in prizes)
        raw_result = compute_spin_result(server_seed, nonce, total_weight)
        expected_prize = select_prize(raw_result, prizes)
        return expected_prize.id == claimed_prize_id
