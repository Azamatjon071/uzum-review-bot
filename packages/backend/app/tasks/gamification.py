"""
Gamification Celery tasks:
  - check_streak_risks       — daily 20:00 UZT (UTC+5 → 15:00 UTC)
  - generate_daily_missions  — daily midnight UZT (19:00 UTC prev day)
  - award_leaderboard_winners — Monday 00:00 UZT (Sunday 19:00 UTC)
  - compute_leaderboards     — every 5 minutes
  - send_weekly_summary      — Monday 09:00 UZT (Monday 04:00 UTC)
  - recompute_fraud_scores   — daily 03:00 UTC
"""
from __future__ import annotations

import random
from datetime import date, datetime, timezone, timedelta
from uuid import UUID

import structlog
from celery import shared_task
from sqlalchemy import select, func, desc, and_

log = structlog.get_logger()

# ── Streak risk check ─────────────────────────────────────────────────────────


@shared_task(name="gamification.check_streak_risks", bind=True, max_retries=3)
def check_streak_risks(self):
    """
    Find users whose streak will break tomorrow if they don't submit today.
    Send streak_warning notification to those with streak >= 3.
    """
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models import UserStreak, User, Notification, NotificationType

    async def _run():
        async with AsyncSessionLocal() as db:
            yesterday = date.today() - timedelta(days=1)
            # Users who last submitted yesterday (not today) with streak >= 3
            result = await db.execute(
                select(UserStreak)
                .join(User, User.id == UserStreak.user_id)
                .where(
                    and_(
                        UserStreak.last_submission_date == yesterday,
                        UserStreak.current_streak >= 3,
                        User.is_banned == False,
                    )
                )
            )
            at_risk = list(result.scalars().all())
            log.info("streak_risk_check", at_risk_count=len(at_risk))

            for streak in at_risk:
                db.add(Notification(
                    user_id=streak.user_id,
                    notification_type=NotificationType.STREAK_WARNING,
                    payload={
                        "current_streak": streak.current_streak,
                        "days_to_break": 1,
                    },
                ))

            await db.commit()

    asyncio.get_event_loop().run_until_complete(_run())


# ── Daily missions generation ─────────────────────────────────────────────────


MISSION_TEMPLATES = [
    {"mission_type": "submit", "target": 1, "reward_spins": 1, "reward_xp": 25,
     "description": {"uz": "Bugun 1 ta sharh yuboring", "ru": "Отправьте 1 отзыв сегодня", "en": "Submit 1 review today"}},
    {"mission_type": "submit", "target": 3, "reward_spins": 2, "reward_xp": 75,
     "description": {"uz": "Bugun 3 ta sharh yuboring", "ru": "Отправьте 3 отзыва сегодня", "en": "Submit 3 reviews today"}},
    {"mission_type": "streak", "target": 1, "reward_spins": 1, "reward_xp": 30,
     "description": {"uz": "Kunlik ketma-ketlikni saqlang", "ru": "Поддержите дневную серию", "en": "Maintain your daily streak"}},
    {"mission_type": "spin", "target": 1, "reward_spins": 0, "reward_xp": 20,
     "description": {"uz": "Bitta ruletka o'ynang", "ru": "Сыграйте в рулетку", "en": "Spin the wheel once"}},
    {"mission_type": "referral", "target": 1, "reward_spins": 3, "reward_xp": 100,
     "description": {"uz": "Do'stingizni taklif qiling", "ru": "Пригласите друга", "en": "Invite a friend"}},
]


@shared_task(name="gamification.generate_daily_missions", bind=True, max_retries=2)
def generate_daily_missions(self):
    """Generate 3 random missions for today if not already created."""
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models import DailyMission, MissionType

    async def _run():
        async with AsyncSessionLocal() as db:
            today = date.today()
            existing = await db.scalar(
                select(func.count()).select_from(DailyMission)
                .where(DailyMission.active_date == today)
            )
            if existing and existing > 0:
                log.info("daily_missions_already_generated", date=str(today))
                return

            chosen = random.sample(MISSION_TEMPLATES, min(3, len(MISSION_TEMPLATES)))
            for tmpl in chosen:
                db.add(DailyMission(
                    mission_type=MissionType(tmpl["mission_type"]),
                    description_i18n=tmpl["description"],
                    target=tmpl["target"],
                    reward_spins=tmpl["reward_spins"],
                    reward_xp=tmpl["reward_xp"],
                    active_date=today,
                ))
            await db.commit()
            log.info("daily_missions_generated", count=len(chosen), date=str(today))

    asyncio.get_event_loop().run_until_complete(_run())


# ── Leaderboard computation ───────────────────────────────────────────────────


@shared_task(name="gamification.compute_leaderboards", bind=True, max_retries=3)
def compute_leaderboards(self):
    """
    Recompute weekly, monthly, and all-time leaderboards.
    Upserts Leaderboard rows for the top 100 users per type.
    """
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models import Leaderboard, LeaderboardType, Submission, SubmissionStatus, User

    async def _run():
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            # Weekly: Monday → now
            week_start = now - timedelta(days=now.weekday())
            week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
            # Monthly: 1st of month → now
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            periods = [
                (LeaderboardType.WEEKLY, week_start),
                (LeaderboardType.MONTHLY, month_start),
                (LeaderboardType.ALLTIME, datetime(2024, 1, 1, tzinfo=timezone.utc)),
            ]

            for lb_type, period_start in periods:
                # Score = approved_submissions in period
                scores_q = (
                    select(
                        Submission.user_id,
                        func.count(Submission.id).label("score"),
                    )
                    .join(User, User.id == Submission.user_id)
                    .where(
                        and_(
                            Submission.status == SubmissionStatus.APPROVED,
                            Submission.created_at >= period_start,
                            User.is_banned == False,
                        )
                    )
                    .group_by(Submission.user_id)
                    .order_by(desc("score"))
                    .limit(100)
                )
                rows = (await db.execute(scores_q)).all()

                for rank, (user_id, score) in enumerate(rows, start=1):
                    # Fetch existing for previous_rank
                    existing_r = await db.execute(
                        select(Leaderboard).where(
                            and_(
                                Leaderboard.user_id == user_id,
                                Leaderboard.type == lb_type,
                                Leaderboard.period_start == period_start,
                            )
                        )
                    )
                    existing = existing_r.scalar_one_or_none()

                    if existing:
                        existing.previous_rank = existing.rank
                        existing.rank = rank
                        existing.score = score
                    else:
                        db.add(Leaderboard(
                            type=lb_type,
                            user_id=user_id,
                            score=score,
                            rank=rank,
                            previous_rank=rank,
                            period_start=period_start,
                        ))

            await db.commit()
            log.info("leaderboards_computed")

    asyncio.get_event_loop().run_until_complete(_run())


# ── Leaderboard awards (weekly) ───────────────────────────────────────────────


@shared_task(name="gamification.award_leaderboard_winners", bind=True, max_retries=2)
def award_leaderboard_winners(self):
    """
    Run every Monday: award bonus spins to top-3 weekly leaderboard users.
    """
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models import Leaderboard, LeaderboardType, User, Notification, NotificationType

    SPIN_PRIZES = {1: 10, 2: 5, 3: 2}

    async def _run():
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            # Previous week start (last Monday)
            prev_monday = now - timedelta(days=now.weekday() + 7)
            prev_monday = prev_monday.replace(hour=0, minute=0, second=0, microsecond=0)

            result = await db.execute(
                select(Leaderboard)
                .where(
                    and_(
                        Leaderboard.type == LeaderboardType.WEEKLY,
                        Leaderboard.period_start == prev_monday,
                        Leaderboard.rank <= 3,
                    )
                )
                .order_by(Leaderboard.rank)
            )
            winners = list(result.scalars().all())

            for lb in winners:
                spins = SPIN_PRIZES.get(lb.rank, 0)
                if not spins:
                    continue
                user = await db.get(User, lb.user_id)
                if user and not user.is_banned:
                    user.spin_count += spins
                    db.add(Notification(
                        user_id=lb.user_id,
                        notification_type=NotificationType.LEADERBOARD_RESULT,
                        payload={
                            "rank": lb.rank,
                            "score": lb.score,
                            "bonus_spins": spins,
                            "period": "weekly",
                        },
                    ))

            await db.commit()
            log.info("leaderboard_winners_awarded", count=len(winners))

    asyncio.get_event_loop().run_until_complete(_run())


# ── Weekly summary ────────────────────────────────────────────────────────────


@shared_task(name="gamification.send_weekly_summary", bind=True, max_retries=2)
def send_weekly_summary(self):
    """
    Every Monday 09:00 UZT: send weekly summary to all active users.
    """
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models import User, Submission, SubmissionStatus, Notification, NotificationType

    async def _run():
        async with AsyncSessionLocal() as db:
            week_start = datetime.now(timezone.utc) - timedelta(days=7)

            # Users who submitted at least once last week
            active_r = await db.execute(
                select(Submission.user_id, func.count(Submission.id).label("count"))
                .where(
                    and_(
                        Submission.created_at >= week_start,
                        Submission.status == SubmissionStatus.APPROVED,
                    )
                )
                .group_by(Submission.user_id)
            )
            rows = active_r.all()

            for user_id, count in rows:
                db.add(Notification(
                    user_id=user_id,
                    notification_type=NotificationType.WEEKLY_SUMMARY,
                    payload={"approved_this_week": count},
                ))

            await db.commit()
            log.info("weekly_summary_queued", user_count=len(rows))

    asyncio.get_event_loop().run_until_complete(_run())


# ── Fraud scores daily recompute ──────────────────────────────────────────────


@shared_task(name="gamification.recompute_fraud_scores", bind=True, max_retries=2)
def recompute_fraud_scores(self):
    """Daily: recompute fraud scores and auto-ban users at threshold >= 80."""
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models import User
    from app.services.fraud import FraudService

    async def _run():
        async with AsyncSessionLocal() as db:
            # Load all non-banned users with any fraud signals
            from app.models import FraudSignal
            user_ids_r = await db.execute(
                select(FraudSignal.user_id).distinct().where(
                    FraudSignal.is_false_positive == False
                )
            )
            user_ids = list(user_ids_r.scalars().all())
            svc = FraudService(db)
            banned_count = 0
            for uid in user_ids:
                new_score = await svc.recompute_user_fraud_score(uid)
                if new_score >= 80:
                    banned_count += 1
            await db.commit()
            log.info("fraud_scores_recomputed", checked=len(user_ids), auto_banned=banned_count)

    asyncio.get_event_loop().run_until_complete(_run())


# ── Expire old rewards ────────────────────────────────────────────────────────


@shared_task(name="gamification.expire_old_rewards", bind=True, max_retries=2)
def expire_old_rewards(self):
    """Hourly: mark rewards as expired if past their expiry date."""
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models import Reward, RewardStatus

    async def _run():
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            result = await db.execute(
                select(Reward).where(
                    and_(
                        Reward.status == RewardStatus.PENDING,
                        Reward.expires_at != None,
                        Reward.expires_at < now,
                    )
                )
            )
            expired = list(result.scalars().all())
            for r in expired:
                r.status = RewardStatus.EXPIRED
            await db.commit()
            if expired:
                log.info("rewards_expired", count=len(expired))

    asyncio.get_event_loop().run_until_complete(_run())
