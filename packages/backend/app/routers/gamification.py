"""
Public gamification endpoints (authenticated user).

GET  /gamification/me/streak
GET  /gamification/me/xp
GET  /gamification/me/achievements
GET  /gamification/leaderboard/{type}
GET  /gamification/missions/today
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    User, UserStreak, UserXP, Achievement, UserAchievement,
    Leaderboard, LeaderboardType, DailyMission, UserMissionProgress,
)
from app.services.gamification import GamificationService, xp_to_next_level, xp_for_level

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/me/streak")
async def get_my_streak(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Current streak stats for the authenticated user."""
    svc = GamificationService(db)
    streak = await svc.get_or_create_streak(user.id)
    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "last_submission_date": streak.last_submission_date.isoformat() if streak.last_submission_date else None,
        "total_days": streak.total_days,
    }


@router.get("/me/xp")
async def get_my_xp(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """XP and level for the authenticated user."""
    svc = GamificationService(db)
    xp_row = await svc.get_or_create_xp(user.id)
    return {
        "total_xp": xp_row.total_xp,
        "current_level": xp_row.current_level,
        "xp_to_next_level": xp_to_next_level(xp_row.total_xp),
        "xp_for_current_level": xp_for_level(xp_row.current_level),
        "xp_for_next_level": xp_for_level(xp_row.current_level + 1),
    }


@router.get("/me/achievements")
async def get_my_achievements(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """All achievements — earned and unearned — with progress for the current user."""
    # Load all achievements
    all_ach_r = await db.execute(select(Achievement))
    all_achievements = list(all_ach_r.scalars().all())

    # Load earned
    earned_r = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == user.id)
    )
    earned_map: dict = {ua.achievement_id: ua for ua in earned_r.scalars().all()}

    items = []
    for ach in all_achievements:
        ua = earned_map.get(ach.id)
        items.append({
            "key": ach.key,
            "name_uz": ach.name_uz,
            "name_ru": ach.name_ru,
            "name_en": ach.name_en,
            "description": ach.description,
            "icon_emoji": ach.icon_emoji,
            "xp_reward": ach.xp_reward,
            "rarity": ach.rarity.value,
            "target_value": ach.target_value,
            "earned": ua is not None,
            "earned_at": ua.earned_at.isoformat() if ua else None,
            "progress": ua.progress if ua else 0,
            "is_new": ua.is_new_flag if ua else False,
        })

    return {"achievements": items, "total": len(items), "earned": len(earned_map)}


@router.post("/me/achievements/{key}/seen")
async def mark_achievement_seen(
    key: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear the is_new flag on an earned achievement."""
    ach_r = await db.execute(select(Achievement).where(Achievement.key == key))
    ach = ach_r.scalar_one_or_none()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    ua_r = await db.execute(
        select(UserAchievement).where(
            and_(UserAchievement.user_id == user.id, UserAchievement.achievement_id == ach.id)
        )
    )
    ua = ua_r.scalar_one_or_none()
    if not ua:
        raise HTTPException(status_code=404, detail="Achievement not earned")

    ua.is_new_flag = False
    await db.commit()
    return {"ok": True}


@router.get("/leaderboard/{lb_type}")
async def get_leaderboard(
    lb_type: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user),
):
    """Public leaderboard — weekly, monthly, or alltime."""
    try:
        ltype = LeaderboardType(lb_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown leaderboard type: {lb_type}. Use weekly/monthly/alltime")

    result = await db.execute(
        select(Leaderboard)
        .where(Leaderboard.type == ltype)
        .order_by(Leaderboard.rank)
        .limit(min(limit, 100))
    )
    entries = list(result.scalars().all())

    items = []
    for lb in entries:
        u = await db.get(User, lb.user_id)
        items.append({
            "rank": lb.rank,
            "previous_rank": lb.previous_rank,
            "score": lb.score,
            "user_id": str(lb.user_id),
            "first_name": u.first_name if u else "",
            "username": u.username if u else None,
            "profile_photo_url": u.profile_photo_url if u else None,
            "level": u.level if u else 1,
            "is_self": (u.id == user.id) if u and user else False,
        })

    # Inject current user's position if they're not in top-N
    my_entry = None
    if user:
        my_lb_r = await db.execute(
            select(Leaderboard).where(
                and_(Leaderboard.user_id == user.id, Leaderboard.type == ltype)
            )
        )
        my_lb = my_lb_r.scalar_one_or_none()
        if my_lb and my_lb.rank > limit:
            my_entry = {
                "rank": my_lb.rank,
                "previous_rank": my_lb.previous_rank,
                "score": my_lb.score,
                "user_id": str(user.id),
                "first_name": user.first_name,
                "username": user.username,
                "profile_photo_url": user.profile_photo_url,
                "level": user.level,
                "is_self": True,
            }

    return {
        "type": lb_type,
        "entries": items,
        "my_position": my_entry,
    }


@router.get("/missions/today")
async def get_todays_missions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return today's missions with user's progress."""
    today = date.today()
    missions_r = await db.execute(
        select(DailyMission).where(DailyMission.active_date == today)
    )
    missions = list(missions_r.scalars().all())

    items = []
    for mission in missions:
        prog_r = await db.execute(
            select(UserMissionProgress).where(
                and_(
                    UserMissionProgress.user_id == user.id,
                    UserMissionProgress.mission_id == mission.id,
                )
            )
        )
        prog = prog_r.scalar_one_or_none()

        items.append({
            "id": str(mission.id),
            "mission_type": mission.mission_type.value,
            "description": mission.description_i18n or {},
            "target": mission.target,
            "reward_spins": mission.reward_spins,
            "reward_xp": mission.reward_xp,
            "progress": prog.progress if prog else 0,
            "completed": prog.completed_at is not None if prog else False,
            "completed_at": prog.completed_at.isoformat() if prog and prog.completed_at else None,
            "reward_claimed": prog.reward_claimed if prog else False,
        })

    return {"missions": items, "date": today.isoformat()}
