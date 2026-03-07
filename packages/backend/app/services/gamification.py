"""
Gamification service — streak tracking, XP awards, level-ups, achievement granting.
"""
from __future__ import annotations

import math
from datetime import date, datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    User, UserStreak, UserXP, Achievement, UserAchievement,
    DailyMission, UserMissionProgress, Notification, NotificationType,
)

log = structlog.get_logger()

# ── Level curve constants ─────────────────────────────────────────────────────
# Level n requires XP = BASE_XP * n^EXPONENT  (cumulative from 1)
BASE_XP = 100
XP_EXPONENT = 1.5
MAX_LEVEL = 100

# ── XP rewards ────────────────────────────────────────────────────────────────
XP_SUBMISSION_APPROVED = 50
XP_DAILY_STREAK_BONUS = 10   # per day of streak
XP_MISSION_BASE = 25


def xp_for_level(level: int) -> int:
    """Total cumulative XP needed to reach `level`."""
    if level <= 1:
        return 0
    return int(BASE_XP * sum(n ** XP_EXPONENT for n in range(1, level)))


def level_from_xp(total_xp: int) -> int:
    """Compute current level from total XP (binary search up to MAX_LEVEL)."""
    lo, hi = 1, MAX_LEVEL
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if xp_for_level(mid) <= total_xp:
            lo = mid
        else:
            hi = mid - 1
    return lo


def xp_to_next_level(total_xp: int) -> int:
    """XP remaining until next level."""
    current = level_from_xp(total_xp)
    if current >= MAX_LEVEL:
        return 0
    return xp_for_level(current + 1) - total_xp


class GamificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Streak ────────────────────────────────────────────────────────────────

    async def get_or_create_streak(self, user_id: UUID) -> UserStreak:
        result = await self.db.execute(
            select(UserStreak).where(UserStreak.user_id == user_id)
        )
        streak = result.scalar_one_or_none()
        if not streak:
            streak = UserStreak(user_id=user_id)
            self.db.add(streak)
            await self.db.flush()
        return streak

    async def record_activity(self, user_id: UUID) -> UserStreak:
        """Called whenever a submission is approved. Updates streak accordingly."""
        streak = await self.get_or_create_streak(user_id)
        today = date.today()

        if streak.last_submission_date == today:
            # Already recorded today
            return streak

        if streak.last_submission_date == today - timedelta(days=1):
            # Consecutive day
            streak.current_streak += 1
        else:
            # Broken streak
            streak.current_streak = 1

        streak.last_submission_date = today
        streak.total_days += 1
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak

        # Sync on User row too (for quick access without join)
        user = await self.db.get(User, user_id)
        if user:
            user.current_streak = streak.current_streak
            user.longest_streak = streak.longest_streak

        log.info(
            "streak_updated",
            user_id=str(user_id),
            current=streak.current_streak,
            longest=streak.longest_streak,
        )
        return streak

    # ── XP ────────────────────────────────────────────────────────────────────

    async def get_or_create_xp(self, user_id: UUID) -> UserXP:
        result = await self.db.execute(
            select(UserXP).where(UserXP.user_id == user_id)
        )
        xp_row = result.scalar_one_or_none()
        if not xp_row:
            xp_row = UserXP(user_id=user_id, total_xp=0, current_level=1, xp_history=[])
            self.db.add(xp_row)
            await self.db.flush()
        return xp_row

    async def award_xp(
        self,
        user_id: UUID,
        amount: int,
        reason: str,
    ) -> tuple[UserXP, bool]:
        """
        Awards XP and checks for level-up.

        Returns (xp_row, leveled_up).
        """
        xp_row = await self.get_or_create_xp(user_id)
        old_level = xp_row.current_level
        xp_row.total_xp += amount

        new_level = level_from_xp(xp_row.total_xp)
        xp_row.current_level = min(new_level, MAX_LEVEL)

        # Append history entry
        history: list = list(xp_row.xp_history or [])
        history.append({
            "ts": datetime.now(timezone.utc).isoformat(),
            "amount": amount,
            "reason": reason,
            "total": xp_row.total_xp,
        })
        # Keep last 200 entries
        xp_row.xp_history = history[-200:]

        # Sync on User row
        # User model does not have separate xp/level columns; relying on relationship.
        # user = await self.db.get(User, user_id)
        # if user:
        #    user.xp = xp_row.total_xp
        #    user.level = xp_row.current_level

        leveled_up = xp_row.current_level > old_level

        if leveled_up:
            log.info(
                "level_up",
                user_id=str(user_id),
                old_level=old_level,
                new_level=xp_row.current_level,
            )
            # Queue level-up notification
            self.db.add(Notification(
                user_id=user_id,
                notification_type=NotificationType.LEVEL_UP,
                payload={
                    "old_level": old_level,
                    "new_level": xp_row.current_level,
                    "total_xp": xp_row.total_xp,
                },
            ))

        return xp_row, leveled_up

    # ── Achievements ──────────────────────────────────────────────────────────

    async def check_and_grant_achievements(self, user_id: UUID) -> list[Achievement]:
        """
        Evaluate all achievements for this user and grant any newly earned ones.
        Returns list of newly granted achievements.
        """
        # Load all achievements
        all_ach_r = await self.db.execute(select(Achievement))
        all_achievements: list[Achievement] = list(all_ach_r.scalars().all())

        # Load already earned achievement IDs
        earned_r = await self.db.execute(
            select(UserAchievement.achievement_id).where(
                UserAchievement.user_id == user_id
            )
        )
        earned_ids: set[UUID] = set(earned_r.scalars().all())

        user = await self.db.get(User, user_id)
        streak = await self.get_or_create_streak(user_id)
        xp_row = await self.get_or_create_xp(user_id)

        newly_granted: list[Achievement] = []

        for ach in all_achievements:
            if ach.id in earned_ids:
                continue

            earned = await self._evaluate_achievement(
                ach, user, streak, xp_row, user_id
            )
            if earned:
                ua = UserAchievement(
                    user_id=user_id,
                    achievement_id=ach.id,
                    earned_at=datetime.now(timezone.utc),
                    progress=ach.target_value,
                    is_new_flag=True,
                )
                self.db.add(ua)
                newly_granted.append(ach)

                # Award XP
                await self.award_xp(user_id, ach.xp_reward, f"achievement:{ach.key}")

                # Queue notification
                self.db.add(Notification(
                    user_id=user_id,
                    notification_type=NotificationType.ACHIEVEMENT_EARNED,
                    payload={
                        "achievement_key": ach.key,
                        "achievement_name": ach.name_uz,
                        "icon": ach.icon_emoji,
                        "rarity": ach.rarity.value,
                        "xp_reward": ach.xp_reward,
                    },
                ))

                log.info(
                    "achievement_granted",
                    user_id=str(user_id),
                    achievement=ach.key,
                    rarity=ach.rarity.value,
                )

        return newly_granted

    async def _evaluate_achievement(
        self,
        ach: Achievement,
        user: Optional[User],
        streak: UserStreak,
        xp_row: UserXP,
        user_id: UUID,
    ) -> bool:
        """Return True if user has met the conditions for this achievement."""
        if user is None:
            return False

        key = ach.key
        target = ach.target_value or 1

        # ── Streak-based ──────────────────────────────────────────────────────
        if key == "streak_3":
            return streak.current_streak >= 3
        if key == "streak_7":
            return streak.current_streak >= 7
        if key == "streak_30":
            return streak.current_streak >= 30
        if key == "streak_100":
            return streak.current_streak >= 100

        # ── Submission-based ──────────────────────────────────────────────────
        if key == "first_submission":
            return user.total_submissions >= 1
        if key == "submissions_10":
            return user.approved_submissions >= 10
        if key == "submissions_50":
            return user.approved_submissions >= 50
        if key == "submissions_100":
            return user.approved_submissions >= 100
        if key == "submissions_500":
            return user.approved_submissions >= 500

        # ── Referral-based ────────────────────────────────────────────────────
        if key in ("referral_1", "referral_5", "referral_10", "referral_25"):
            ref_count_r = await self.db.execute(
                select(func.count(User.id)).where(User.referred_by_id == user_id)
            )
            ref_count = ref_count_r.scalar() or 0
            return ref_count >= target

        # ── Spin / level based ────────────────────────────────────────────────
        if key == "spin_10":
            return user.total_spins >= 10
        if key == "spin_100":
            return user.total_spins >= 100
        if key == "level_5":
            return xp_row.current_level >= 5
        if key == "level_25":
            return xp_row.current_level >= 25
        if key == "level_50":
            return xp_row.current_level >= 50
        if key == "level_100":
            return xp_row.current_level >= 100

        # Generic target_value check (custom future achievements)
        if hasattr(user, key):
            return getattr(user, key, 0) >= target

        return False

    # ── Mission progress ──────────────────────────────────────────────────────

    async def update_mission_progress(
        self,
        user_id: UUID,
        mission_type: str,
        increment: int = 1,
    ) -> list[UserMissionProgress]:
        """
        Increment progress for all active today's missions matching `mission_type`.
        Returns completed missions (newly completed).
        """
        today = date.today()
        missions_r = await self.db.execute(
            select(DailyMission).where(DailyMission.active_date == today)
        )
        missions = list(missions_r.scalars().all())

        newly_completed: list[UserMissionProgress] = []

        for mission in missions:
            if mission.mission_type.value != mission_type:
                continue

            # Get or create progress
            prog_r = await self.db.execute(
                select(UserMissionProgress).where(
                    UserMissionProgress.user_id == user_id,
                    UserMissionProgress.mission_id == mission.id,
                )
            )
            prog = prog_r.scalar_one_or_none()

            if prog is None:
                prog = UserMissionProgress(
                    user_id=user_id,
                    mission_id=mission.id,
                    progress=0,
                )
                self.db.add(prog)
                await self.db.flush()

            if prog.completed_at is not None:
                continue  # Already done

            prog.progress += increment
            if prog.progress >= mission.target:
                prog.progress = mission.target
                prog.completed_at = datetime.now(timezone.utc)
                newly_completed.append(prog)

                # Award mission rewards
                user = await self.db.get(User, user_id)
                if user:
                    user.spin_count += mission.reward_spins

                await self.award_xp(user_id, mission.reward_xp, f"mission:{mission.mission_type.value}")

                # Queue notification
                self.db.add(Notification(
                    user_id=user_id,
                    notification_type=NotificationType.MISSION_COMPLETED,
                    payload={
                        "mission_type": mission.mission_type.value,
                        "reward_spins": mission.reward_spins,
                        "reward_xp": mission.reward_xp,
                    },
                ))

        return newly_completed

    # ── Full post-approval pipeline ───────────────────────────────────────────

    async def on_submission_approved(self, user_id: UUID) -> dict:
        """
        Call this after a submission is approved to:
        1. Record activity & update streak
        2. Award XP
        3. Update mission progress
        4. Check achievements
        5. Flush changes (caller must commit)
        """
        # 1. Streak
        streak = await self.record_activity(user_id)
        streak_xp_bonus = streak.current_streak * XP_DAILY_STREAK_BONUS

        # 2. XP
        _, leveled_up = await self.award_xp(
            user_id,
            XP_SUBMISSION_APPROVED + streak_xp_bonus,
            "submission_approved",
        )

        # 3. Mission progress
        completed_missions = await self.update_mission_progress(
            user_id, "submit", increment=1
        )

        # 4. Achievements
        new_achievements = await self.check_and_grant_achievements(user_id)

        await self.db.flush()

        return {
            "streak": streak.current_streak,
            "xp_awarded": XP_SUBMISSION_APPROVED + streak_xp_bonus,
            "leveled_up": leveled_up,
            "completed_missions": len(completed_missions),
            "new_achievements": [a.key for a in new_achievements],
        }
