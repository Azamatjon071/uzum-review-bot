import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_
from app.models import CharityCampaign, CharityDonation, Reward, RewardStatus, User


class CharityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_campaigns(self) -> list[CharityCampaign]:
        result = await self.db.execute(
            select(CharityCampaign)
            .where(CharityCampaign.is_active == True)
            .order_by(CharityCampaign.created_at.desc())
        )
        return result.scalars().all()

    async def donate(
        self,
        user_id: uuid.UUID,
        amount_uzs: float,
        campaign_id: Optional[uuid.UUID] = None,
        reward_id: Optional[uuid.UUID] = None,
        source: str = "direct",
    ) -> CharityDonation:
        """Record a charity donation."""
        donation = CharityDonation(
            user_id=user_id,
            campaign_id=campaign_id,
            amount_uzs=amount_uzs,
            source=source,
            reward_id=reward_id,
        )
        self.db.add(donation)

        # Update campaign raised amount
        if campaign_id:
            result = await self.db.execute(
                select(CharityCampaign).where(CharityCampaign.id == campaign_id)
            )
            campaign = result.scalar_one_or_none()
            if campaign:
                campaign.raised_amount = float(campaign.raised_amount) + amount_uzs

        # Mark reward as donated if applicable
        if reward_id:
            result = await self.db.execute(
                select(Reward).where(Reward.id == reward_id)
            )
            reward = result.scalar_one_or_none()
            if reward and reward.user_id == user_id:
                reward.status = RewardStatus.DONATED

        await self.db.flush()
        return donation

    async def get_leaderboard(self, limit: int = 20) -> list[dict]:
        """Top donors by total amount (anonymous by default)."""
        result = await self.db.execute(
            select(
                CharityDonation.user_id,
                func.sum(CharityDonation.amount_uzs).label("total_donated"),
                func.count(CharityDonation.id).label("donation_count"),
            )
            .group_by(CharityDonation.user_id)
            .order_by(func.sum(CharityDonation.amount_uzs).desc())
            .limit(limit)
        )
        rows = result.all()
        leaderboard = []
        for row in rows:
            user_result = await self.db.execute(
                select(User).where(User.id == row.user_id)
            )
            user = user_result.scalar_one_or_none()
            leaderboard.append({
                "user_id": str(row.user_id),
                "display_name": user.first_name if user else "Anonymous",
                "total_donated": float(row.total_donated),
                "donation_count": row.donation_count,
            })
        return leaderboard
