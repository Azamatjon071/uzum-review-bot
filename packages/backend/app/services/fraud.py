"""Anti-fraud detection service for UzumBot.

Detects review farming, duplicate orders, velocity abuse, and bot-like
behavior. Each check contributes a score to a composite FraudScore (0-100).
Score > 80 → auto-ban; Score > 50 → manual review queue.

WHY THIS MATTERS:
- Review farms destroy platform credibility and unfairly drain prize stock.
- Simple IP rate-limiting is easily bypassed with VPNs/mobile data rotation.
- A composite score approach catches coordinated fraud that single signals miss.
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import structlog
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    FraudSignal,
    FraudSignalType,
    Submission,
    SubmissionImage,
    SubmissionStatus,
    User,
)

log = structlog.get_logger()

# ── Score weights per signal type ─────────────────────────────────────────────
SIGNAL_SCORES: dict[FraudSignalType, int] = {
    FraudSignalType.DUPLICATE_ORDER: 40,       # One order submitted by multiple users
    FraudSignalType.IMAGE_SIMILARITY: 30,      # Near-duplicate image from different user
    FraudSignalType.VELOCITY_LIMIT: 25,        # Too many submissions per day/week
    FraudSignalType.BOT_BEHAVIOR: 35,          # Regular interval submission timing
    FraudSignalType.NEW_ACCOUNT: 10,           # Account < 7 days old
    FraudSignalType.CLUSTER_MATCH: 45,         # Part of image cluster farm
}

# Thresholds
AUTO_BAN_THRESHOLD = 80
REVIEW_QUEUE_THRESHOLD = 50
MAX_SUBMISSIONS_PER_DAY = 3
MAX_SUBMISSIONS_PER_WEEK = 10
NEW_ACCOUNT_DAYS = 7


class FraudService:
    """Stateless fraud detection service. Inject AsyncSession per request."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def check_submission(
        self,
        user: User,
        order_number: Optional[str],
        image_hashes: list[str],
    ) -> tuple[int, list[FraudSignal]]:
        """Run all fraud checks for a new submission.

        Returns:
            (composite_score, list_of_new_signals)
            composite_score is capped at 100.
        """
        signals: list[FraudSignal] = []

        # Run checks in parallel-ish (all are DB queries, await each)
        sig = await self._check_duplicate_order(user.id, order_number)
        if sig:
            signals.append(sig)

        sig = await self._check_velocity(user.id)
        if sig:
            signals.append(sig)

        sig = await self._check_image_similarity(user.id, image_hashes)
        if sig:
            signals.append(sig)

        sig = await self._check_new_account(user)
        if sig:
            signals.append(sig)

        # Persist new signals
        for s in signals:
            self.db.add(s)

        # Compute composite score = existing_score + new signals
        existing_score = await self._get_existing_score(user.id)
        new_score_delta = sum(SIGNAL_SCORES.get(s.signal_type, 10) for s in signals)
        composite = min(existing_score + new_score_delta, 100)

        # Update user.fraud_score
        user.fraud_score = composite  # type: ignore[assignment]

        if signals:
            await self.db.commit()
            log.info(
                "fraud_signals_detected",
                user_id=str(user.id),
                signals=[s.signal_type.value for s in signals],
                composite_score=composite,
            )

        return composite, signals

    # ── Individual checks ──────────────────────────────────────────────────────

    async def _check_duplicate_order(
        self, user_id: uuid.UUID, order_number: Optional[str]
    ) -> Optional[FraudSignal]:
        """Flag if the same order number was already submitted by ANOTHER user."""
        if not order_number:
            return None

        result = await self.db.execute(
            select(Submission).where(
                and_(
                    Submission.order_number == order_number,
                    Submission.user_id != user_id,
                    Submission.status != SubmissionStatus.REJECTED,
                )
            ).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing:
            log.warning(
                "duplicate_order_detected",
                order_number=order_number,
                original_user_id=str(existing.user_id),
                new_user_id=str(user_id),
            )
            return FraudSignal(
                user_id=user_id,
                signal_type=FraudSignalType.DUPLICATE_ORDER,
                score=SIGNAL_SCORES[FraudSignalType.DUPLICATE_ORDER],
                evidence={
                    "order_number": order_number,
                    "original_submission_id": str(existing.id),
                    "original_user_id": str(existing.user_id),
                },
            )
        return None

    async def _check_velocity(self, user_id: uuid.UUID) -> Optional[FraudSignal]:
        """Flag if user exceeds daily (3) or weekly (10) submission limits."""
        now = datetime.now(timezone.utc)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = day_start - timedelta(days=day_start.weekday())

        daily_count = await self.db.scalar(
            select(func.count(Submission.id)).where(
                and_(
                    Submission.user_id == user_id,
                    Submission.created_at >= day_start,
                )
            )
        ) or 0

        weekly_count = await self.db.scalar(
            select(func.count(Submission.id)).where(
                and_(
                    Submission.user_id == user_id,
                    Submission.created_at >= week_start,
                )
            )
        ) or 0

        if daily_count >= MAX_SUBMISSIONS_PER_DAY or weekly_count >= MAX_SUBMISSIONS_PER_WEEK:
            return FraudSignal(
                user_id=user_id,
                signal_type=FraudSignalType.VELOCITY_LIMIT,
                score=SIGNAL_SCORES[FraudSignalType.VELOCITY_LIMIT],
                evidence={
                    "daily_count": daily_count,
                    "weekly_count": weekly_count,
                    "daily_limit": MAX_SUBMISSIONS_PER_DAY,
                    "weekly_limit": MAX_SUBMISSIONS_PER_WEEK,
                },
            )
        return None

    async def _check_image_similarity(
        self, user_id: uuid.UUID, image_hashes: list[str]
    ) -> Optional[FraudSignal]:
        """Flag if any submitted image hash matches an image from a DIFFERENT user.

        Uses exact hash match for speed. Fuzzy/perceptual matching (pHash)
        is done in the weekly batch `detect_review_farms` Celery task.
        """
        if not image_hashes:
            return None

        result = await self.db.execute(
            select(SubmissionImage).where(
                and_(
                    SubmissionImage.perceptual_hash.in_(image_hashes),
                )
            ).limit(5)
        )
        matched = result.scalars().all()

        # Filter to matches from OTHER users
        conflicting = []
        for img in matched:
            # Load parent submission's user_id
            sub_result = await self.db.execute(
                select(Submission.user_id).where(Submission.id == img.submission_id)
            )
            owner_id = sub_result.scalar_one_or_none()
            if owner_id and owner_id != user_id:
                conflicting.append({
                    "hash": img.perceptual_hash,
                    "original_submission_id": str(img.submission_id),
                    "original_user_id": str(owner_id),
                })

        if conflicting:
            return FraudSignal(
                user_id=user_id,
                signal_type=FraudSignalType.IMAGE_SIMILARITY,
                score=SIGNAL_SCORES[FraudSignalType.IMAGE_SIMILARITY],
                evidence={"matches": conflicting[:5]},  # cap evidence size
            )
        return None

    async def _check_new_account(self, user: User) -> Optional[FraudSignal]:
        """Flag accounts younger than NEW_ACCOUNT_DAYS days on first submission."""
        age_days = (datetime.now(timezone.utc) - user.created_at).days
        if age_days < NEW_ACCOUNT_DAYS:
            # Only flag once (check if signal already exists)
            existing = await self.db.scalar(
                select(func.count(FraudSignal.id)).where(
                    and_(
                        FraudSignal.user_id == user.id,
                        FraudSignal.signal_type == FraudSignalType.NEW_ACCOUNT,
                    )
                )
            )
            if not existing:
                return FraudSignal(
                    user_id=user.id,
                    signal_type=FraudSignalType.NEW_ACCOUNT,
                    score=SIGNAL_SCORES[FraudSignalType.NEW_ACCOUNT],
                    evidence={"account_age_days": age_days},
                )
        return None

    async def _get_existing_score(self, user_id: uuid.UUID) -> int:
        """Sum all non-false-positive fraud signal scores for this user."""
        result = await self.db.scalar(
            select(func.sum(FraudSignal.score)).where(
                and_(
                    FraudSignal.user_id == user_id,
                    FraudSignal.is_false_positive == False,  # noqa: E712
                )
            )
        )
        return int(result or 0)

    async def recompute_user_fraud_score(self, user_id: uuid.UUID) -> int:
        """Recompute and persist fraud score for a user. Call from Celery task."""
        score = await self._get_existing_score(user_id)
        score = min(score, 100)

        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.fraud_score = score  # type: ignore[assignment]
            await self.db.commit()

            if score >= AUTO_BAN_THRESHOLD and not user.is_banned:
                user.is_banned = True
                user.ban_reason = f"Auto-banned: fraud score {score}/100"
                await self.db.commit()
                log.warning("user_auto_banned_fraud", user_id=str(user_id), score=score)

        return score

    async def dismiss_signal(
        self,
        signal_id: uuid.UUID,
        admin_id: uuid.UUID,
    ) -> None:
        """Mark a fraud signal as false positive. Triggers score recomputation."""
        result = await self.db.execute(
            select(FraudSignal).where(FraudSignal.id == signal_id)
        )
        signal = result.scalar_one_or_none()
        if signal:
            signal.is_false_positive = True
            signal.reviewed_by = admin_id
            signal.reviewed_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.recompute_user_fraud_score(signal.user_id)
