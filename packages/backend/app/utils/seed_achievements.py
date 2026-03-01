"""
Seed script: insert all 25 achievement definitions into the database.

Run once after migration 0003:
    python -m app.utils.seed_achievements

Or from the backend container:
    docker compose exec backend python -m app.utils.seed_achievements
"""
from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Achievement, AchievementRarity

# ── Achievement definitions ───────────────────────────────────────────────────
# Fields: key, name_uz, name_ru, name_en, description, icon_emoji, rarity,
#         target_value, xp_reward

ACHIEVEMENTS: list[dict[str, Any]] = [
    # ── Streaks ───────────────────────────────────────────────────────────────
    {
        "key": "streak_3",
        "name_uz": "3 kunlik seriya",
        "name_ru": "3 дня подряд",
        "name_en": "3-Day Streak",
        "description": "Submit reviews 3 days in a row",
        "icon_emoji": "🔥",
        "rarity": AchievementRarity.COMMON,
        "target_value": 3,
        "xp_reward": 30,
    },
    {
        "key": "streak_7",
        "name_uz": "Haftalik seriya",
        "name_ru": "Неделя подряд",
        "name_en": "Week Streak",
        "description": "Submit reviews 7 days in a row",
        "icon_emoji": "🔥",
        "rarity": AchievementRarity.UNCOMMON,
        "target_value": 7,
        "xp_reward": 70,
    },
    {
        "key": "streak_30",
        "name_uz": "Oylik seriya",
        "name_ru": "Месяц подряд",
        "name_en": "Month Streak",
        "description": "Submit reviews 30 days in a row",
        "icon_emoji": "🔥",
        "rarity": AchievementRarity.RARE,
        "target_value": 30,
        "xp_reward": 300,
    },
    {
        "key": "streak_100",
        "name_uz": "100 kunlik seriya",
        "name_ru": "100 дней подряд",
        "name_en": "100-Day Streak",
        "description": "Submit reviews 100 days in a row",
        "icon_emoji": "💯",
        "rarity": AchievementRarity.LEGENDARY,
        "target_value": 100,
        "xp_reward": 1000,
    },
    # ── Submissions ───────────────────────────────────────────────────────────
    {
        "key": "first_submission",
        "name_uz": "Birinchi sharh",
        "name_ru": "Первый отзыв",
        "name_en": "First Review",
        "description": "Submit your very first review",
        "icon_emoji": "🌟",
        "rarity": AchievementRarity.COMMON,
        "target_value": 1,
        "xp_reward": 50,
    },
    {
        "key": "submissions_10",
        "name_uz": "10 ta sharh",
        "name_ru": "10 отзывов",
        "name_en": "10 Reviews",
        "description": "Get 10 reviews approved",
        "icon_emoji": "📝",
        "rarity": AchievementRarity.COMMON,
        "target_value": 10,
        "xp_reward": 100,
    },
    {
        "key": "submissions_50",
        "name_uz": "50 ta sharh",
        "name_ru": "50 отзывов",
        "name_en": "50 Reviews",
        "description": "Get 50 reviews approved",
        "icon_emoji": "📚",
        "rarity": AchievementRarity.UNCOMMON,
        "target_value": 50,
        "xp_reward": 250,
    },
    {
        "key": "submissions_100",
        "name_uz": "100 ta sharh",
        "name_ru": "100 отзывов",
        "name_en": "100 Reviews",
        "description": "Get 100 reviews approved",
        "icon_emoji": "🏆",
        "rarity": AchievementRarity.RARE,
        "target_value": 100,
        "xp_reward": 500,
    },
    {
        "key": "submissions_500",
        "name_uz": "500 ta sharh",
        "name_ru": "500 отзывов",
        "name_en": "500 Reviews",
        "description": "Get 500 reviews approved",
        "icon_emoji": "👑",
        "rarity": AchievementRarity.LEGENDARY,
        "target_value": 500,
        "xp_reward": 2000,
    },
    # ── Referrals ─────────────────────────────────────────────────────────────
    {
        "key": "referral_1",
        "name_uz": "Birinchi taklif",
        "name_ru": "Первое приглашение",
        "name_en": "First Referral",
        "description": "Refer your first friend",
        "icon_emoji": "🤝",
        "rarity": AchievementRarity.COMMON,
        "target_value": 1,
        "xp_reward": 50,
    },
    {
        "key": "referral_5",
        "name_uz": "5 ta taklif",
        "name_ru": "5 приглашений",
        "name_en": "5 Referrals",
        "description": "Refer 5 friends",
        "icon_emoji": "👥",
        "rarity": AchievementRarity.UNCOMMON,
        "target_value": 5,
        "xp_reward": 150,
    },
    {
        "key": "referral_10",
        "name_uz": "10 ta taklif",
        "name_ru": "10 приглашений",
        "name_en": "10 Referrals",
        "description": "Refer 10 friends",
        "icon_emoji": "🌐",
        "rarity": AchievementRarity.RARE,
        "target_value": 10,
        "xp_reward": 300,
    },
    {
        "key": "referral_25",
        "name_uz": "25 ta taklif",
        "name_ru": "25 приглашений",
        "name_en": "25 Referrals",
        "description": "Refer 25 friends",
        "icon_emoji": "🚀",
        "rarity": AchievementRarity.EPIC,
        "target_value": 25,
        "xp_reward": 750,
    },
    # ── Spins ─────────────────────────────────────────────────────────────────
    {
        "key": "spin_10",
        "name_uz": "10 ta aylanish",
        "name_ru": "10 вращений",
        "name_en": "10 Spins",
        "description": "Spin the wheel 10 times",
        "icon_emoji": "🎡",
        "rarity": AchievementRarity.COMMON,
        "target_value": 10,
        "xp_reward": 50,
    },
    {
        "key": "spin_100",
        "name_uz": "100 ta aylanish",
        "name_ru": "100 вращений",
        "name_en": "100 Spins",
        "description": "Spin the wheel 100 times",
        "icon_emoji": "🎰",
        "rarity": AchievementRarity.RARE,
        "target_value": 100,
        "xp_reward": 500,
    },
    # ── Levels ────────────────────────────────────────────────────────────────
    {
        "key": "level_5",
        "name_uz": "5-daraja",
        "name_ru": "Уровень 5",
        "name_en": "Level 5",
        "description": "Reach level 5",
        "icon_emoji": "⭐",
        "rarity": AchievementRarity.COMMON,
        "target_value": 5,
        "xp_reward": 0,
    },
    {
        "key": "level_25",
        "name_uz": "25-daraja",
        "name_ru": "Уровень 25",
        "name_en": "Level 25",
        "description": "Reach level 25",
        "icon_emoji": "🌠",
        "rarity": AchievementRarity.UNCOMMON,
        "target_value": 25,
        "xp_reward": 0,
    },
    {
        "key": "level_50",
        "name_uz": "50-daraja",
        "name_ru": "Уровень 50",
        "name_en": "Level 50",
        "description": "Reach level 50",
        "icon_emoji": "💎",
        "rarity": AchievementRarity.EPIC,
        "target_value": 50,
        "xp_reward": 0,
    },
    {
        "key": "level_100",
        "name_uz": "100-daraja",
        "name_ru": "Уровень 100",
        "name_en": "Level 100",
        "description": "Reach the maximum level",
        "icon_emoji": "👑",
        "rarity": AchievementRarity.LEGENDARY,
        "target_value": 100,
        "xp_reward": 0,
    },
    # ── Bonus / misc ──────────────────────────────────────────────────────────
    {
        "key": "early_adopter",
        "name_uz": "Dastlabki foydalanuvchi",
        "name_ru": "Ранний пользователь",
        "name_en": "Early Adopter",
        "description": "One of the first 1000 users on the platform",
        "icon_emoji": "🏅",
        "rarity": AchievementRarity.RARE,
        "target_value": 1000,
        "xp_reward": 200,
    },
    {
        "key": "night_owl",
        "name_uz": "Tungi boyqush",
        "name_ru": "Ночная сова",
        "name_en": "Night Owl",
        "description": "Submit a review between midnight and 4 AM",
        "icon_emoji": "🦉",
        "rarity": AchievementRarity.UNCOMMON,
        "target_value": 1,
        "xp_reward": 30,
    },
    {
        "key": "lucky_winner",
        "name_uz": "Omadli g'olib",
        "name_ru": "Счастливчик",
        "name_en": "Lucky Winner",
        "description": "Win a prize from the wheel",
        "icon_emoji": "🍀",
        "rarity": AchievementRarity.COMMON,
        "target_value": 1,
        "xp_reward": 50,
    },
    {
        "key": "charity_donor",
        "name_uz": "Xayriya donor",
        "name_ru": "Благотворитель",
        "name_en": "Charity Donor",
        "description": "Make your first charity donation",
        "icon_emoji": "💝",
        "rarity": AchievementRarity.UNCOMMON,
        "target_value": 1,
        "xp_reward": 75,
    },
    {
        "key": "perfect_week",
        "name_uz": "Mukammal hafta",
        "name_ru": "Идеальная неделя",
        "name_en": "Perfect Week",
        "description": "Complete all 7 daily missions in a single week",
        "icon_emoji": "✨",
        "rarity": AchievementRarity.EPIC,
        "target_value": 7,
        "xp_reward": 500,
    },
    {
        "key": "top_reviewer",
        "name_uz": "Top sharhlovchi",
        "name_ru": "Лучший рецензент",
        "name_en": "Top Reviewer",
        "description": "Reach #1 on the weekly leaderboard",
        "icon_emoji": "🥇",
        "rarity": AchievementRarity.EPIC,
        "target_value": 1,
        "xp_reward": 500,
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        inserted = 0
        skipped = 0
        for data in ACHIEVEMENTS:
            existing = await session.scalar(
                select(Achievement).where(Achievement.key == data["key"])
            )
            if existing:
                skipped += 1
                continue
            ach = Achievement(
                key=data["key"],
                name_uz=data["name_uz"],
                name_ru=data["name_ru"],
                name_en=data["name_en"],
                description=data["description"],
                icon_emoji=data["icon_emoji"],
                rarity=data["rarity"],
                target_value=data["target_value"],
                xp_reward=data["xp_reward"],
            )
            session.add(ach)
            inserted += 1

        await session.commit()
        print(f"Achievements seeded: {inserted} inserted, {skipped} already existed.")


if __name__ == "__main__":
    asyncio.run(seed())
