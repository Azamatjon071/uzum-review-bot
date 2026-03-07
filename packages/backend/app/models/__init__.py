import uuid
import enum
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    String, Integer, BigInteger, Boolean, Text, DateTime, Date, Numeric,
    ForeignKey, JSON, Enum as SAEnum, UniqueConstraint, Index, Float
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class Language(str, enum.Enum):
    UZ = "UZ"
    RU = "RU"
    EN = "EN"


class SubmissionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DUPLICATE = "DUPLICATE"


class PrizeType(str, enum.Enum):
    DISCOUNT = "DISCOUNT"
    CASHBACK = "CASHBACK"
    GIFT = "GIFT"
    FREE_PRODUCT = "FREE_PRODUCT"
    CHARITY_DONATION = "CHARITY_DONATION"


class RewardStatus(str, enum.Enum):
    PENDING = "PENDING"
    CLAIMED = "CLAIMED"
    EXPIRED = "EXPIRED"
    DONATED = "DONATED"


class NotificationType(str, enum.Enum):
    SUBMISSION_APPROVED = "SUBMISSION_APPROVED"
    SUBMISSION_REJECTED = "SUBMISSION_REJECTED"
    REWARD_EARNED = "REWARD_EARNED"
    REWARD_EXPIRING = "REWARD_EXPIRING"
    BROADCAST = "BROADCAST"
    REFERRAL_BONUS = "referral_bonus"
    STREAK_WARNING = "streak_warning"
    ACHIEVEMENT_EARNED = "achievement_earned"
    LEADERBOARD_RESULT = "leaderboard_result"
    WEEKLY_SUMMARY = "weekly_summary"
    MISSION_COMPLETED = "mission_completed"
    LEVEL_UP = "level_up"


class AchievementRarity(str, enum.Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class LeaderboardType(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALLTIME = "alltime"
    CHARITY = "charity"


class MissionType(str, enum.Enum):
    SUBMIT_REVIEWS = "submit_reviews"
    REFER_FRIENDS = "refer_friends"
    COMPLETE_PROFILE = "complete_profile"
    SPIN_WHEEL = "spin_wheel"
    CHARITY_DONATION = "charity_donation"


class FraudSignalType(str, enum.Enum):
    DUPLICATE_ORDER = "duplicate_order"
    IMAGE_SIMILARITY = "image_similarity"
    VELOCITY_LIMIT = "velocity_limit"
    BOT_BEHAVIOR = "bot_behavior"
    NEW_ACCOUNT = "NEW_ACCOUNT"
    CLUSTER_MATCH = "cluster_match"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(64))
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(String(128))
    # Extended profile fields
    phone: Mapped[Optional[str]] = mapped_column(String(32))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    profile_photo_url: Mapped[Optional[str]] = mapped_column(String(512))
    profile_photo_file_id: Mapped[Optional[str]] = mapped_column(String(256))
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    # Language & status
    language: Mapped[Language] = mapped_column(SAEnum(Language, values_callable=lambda obj: [e.value for e in obj]), default=Language.UZ)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    ban_reason: Mapped[Optional[str]] = mapped_column(Text)
    # Stats
    total_submissions: Mapped[int] = mapped_column(Integer, default=0)
    approved_submissions: Mapped[int] = mapped_column(Integer, default=0)
    total_spins: Mapped[int] = mapped_column(Integer, default=0)
    # Available spins balance (granted on approval, deducted on spin)
    spin_count: Mapped[int] = mapped_column(Integer, default=0)
    # Referral
    referral_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    referred_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    referral_bonus_spins: Mapped[int] = mapped_column(Integer, default=0)  # lifetime bonus spins from referrals
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    submissions: Mapped[List["Submission"]] = relationship(back_populates="user")
    spins: Mapped[List["PrizeSpin"]] = relationship(back_populates="user")
    rewards: Mapped[List["Reward"]] = relationship(back_populates="user")
    donations: Mapped[List["CharityDonation"]] = relationship(back_populates="user")
    streak: Mapped[Optional["UserStreak"]] = relationship(back_populates="user", uselist=False)
    xp: Mapped[Optional["UserXP"]] = relationship(back_populates="user", uselist=False)
    achievements: Mapped[List["UserAchievement"]] = relationship(back_populates="user")
    mission_progress: Mapped[List["UserMissionProgress"]] = relationship(back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    name_uz: Mapped[str] = mapped_column(String(256), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(256), nullable=False)
    name_en: Mapped[str] = mapped_column(String(256), nullable=False)
    uzum_product_url: Mapped[Optional[str]] = mapped_column(String(512))
    image_url: Mapped[Optional[str]] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    submissions: Mapped[List["Submission"]] = relationship(back_populates="product")


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    order_number: Mapped[Optional[str]] = mapped_column(String(64))
    review_text: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[SubmissionStatus] = mapped_column(SAEnum(SubmissionStatus, values_callable=lambda obj: [e.value for e in obj]), default=SubmissionStatus.PENDING, index=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_by_admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("admin_users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    spin_granted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="submissions")
    product: Mapped["Product"] = relationship(back_populates="submissions")
    images: Mapped[List["SubmissionImage"]] = relationship(back_populates="submission", cascade="all, delete-orphan")
    spin: Mapped[Optional["PrizeSpin"]] = relationship(back_populates="submission")

    __table_args__ = (Index("ix_submissions_user_created", "user_id", "created_at"),)


class SubmissionImage(Base):
    __tablename__ = "submission_images"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    file_key: Mapped[str] = mapped_column(String(512), nullable=False)
    original_filename: Mapped[Optional[str]] = mapped_column(String(256))
    perceptual_hash: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    submission: Mapped["Submission"] = relationship(back_populates="images")


class Prize(Base):
    __tablename__ = "prizes"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    name_uz: Mapped[str] = mapped_column(String(256), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(256), nullable=False)
    name_en: Mapped[str] = mapped_column(String(256), nullable=False)
    description_uz: Mapped[Optional[str]] = mapped_column(Text)
    description_ru: Mapped[Optional[str]] = mapped_column(Text)
    description_en: Mapped[Optional[str]] = mapped_column(Text)
    prize_type: Mapped[PrizeType] = mapped_column(SAEnum(PrizeType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    value_currency: Mapped[str] = mapped_column(String(8), default="UZS")
    icon_url: Mapped[Optional[str]] = mapped_column(String(512))
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")
    weight: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    stock_limit: Mapped[Optional[int]] = mapped_column(Integer)
    stock_used: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    spins: Mapped[List["PrizeSpin"]] = relationship(back_populates="prize")
    rewards: Mapped[List["Reward"]] = relationship(back_populates="prize")


class SpinCommitment(Base):
    __tablename__ = "spin_commitments"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    server_seed_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    nonce: Mapped[str] = mapped_column(String(32), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PrizeSpin(Base):
    __tablename__ = "prize_spins"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    submission_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("submissions.id"), nullable=True, unique=True)
    prize_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("prizes.id"), nullable=False)
    server_seed: Mapped[str] = mapped_column(String(128), nullable=False)
    server_seed_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    nonce: Mapped[str] = mapped_column(String(32), nullable=False)
    raw_result: Mapped[int] = mapped_column(Integer, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="spins")
    submission: Mapped["Submission"] = relationship(back_populates="spin")
    prize: Mapped["Prize"] = relationship(back_populates="spins")
    reward: Mapped[Optional["Reward"]] = relationship(back_populates="spin")


class Reward(Base):
    __tablename__ = "rewards"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    spin_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("prize_spins.id"), nullable=True)
    prize_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("prizes.id"), nullable=False)
    status: Mapped[RewardStatus] = mapped_column(SAEnum(RewardStatus, values_callable=lambda obj: [e.value for e in obj]), default=RewardStatus.PENDING)
    claim_code: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True)
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="rewards")
    prize: Mapped["Prize"] = relationship(back_populates="rewards")
    spin: Mapped[Optional["PrizeSpin"]] = relationship(back_populates="reward")
    donation: Mapped[Optional["CharityDonation"]] = relationship(back_populates="reward")


class CharityCampaign(Base):
    __tablename__ = "charity_campaigns"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    name_uz: Mapped[str] = mapped_column(String(256), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(256), nullable=False)
    name_en: Mapped[str] = mapped_column(String(256), nullable=False)
    description_uz: Mapped[Optional[str]] = mapped_column(Text)
    description_ru: Mapped[Optional[str]] = mapped_column(Text)
    description_en: Mapped[Optional[str]] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(512))
    goal_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    raised_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    currency: Mapped[str] = mapped_column(String(8), default="UZS")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    donations: Mapped[List["CharityDonation"]] = relationship(back_populates="campaign")


class CharityDonation(Base):
    __tablename__ = "charity_donations"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("charity_campaigns.id"), nullable=True)
    amount_uzs: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    source: Mapped[str] = mapped_column(String(32), default="direct")  # reward / direct
    reward_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("rewards.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="donations")
    campaign: Mapped[Optional["CharityCampaign"]] = relationship(back_populates="donations")
    reward: Mapped[Optional["Reward"]] = relationship(back_populates="donation")


class AdminRole(Base):
    __tablename__ = "admin_roles"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    permissions: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    admins: Mapped[List["AdminUser"]] = relationship(back_populates="role")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    email: Mapped[str] = mapped_column(String(256), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("admin_roles.id"), nullable=False)
    totp_secret: Mapped[Optional[str]] = mapped_column(String(64))
    is_totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    force_2fa_setup: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_login_ip: Mapped[Optional[str]] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    role: Mapped["AdminRole"] = relationship(back_populates="admins")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("admin_users.id"), nullable=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(64))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(String(512))
    before_data: Mapped[Optional[dict]] = mapped_column(JSON)
    after_data: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (Index("ix_audit_logs_created_action", "created_at", "action"),)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    updated_by_admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("admin_users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    notification_type: Mapped[NotificationType] = mapped_column(SAEnum(NotificationType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    error: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─── Gamification Models ──────────────────────────────────────────────────────

class Achievement(Base):
    """Defines achievement types that users can earn."""
    __tablename__ = "achievements"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name_uz: Mapped[str] = mapped_column(String(128), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(128), nullable=False)
    name_en: Mapped[str] = mapped_column(String(128), nullable=False)
    description_uz: Mapped[Optional[str]] = mapped_column(Text)
    description_ru: Mapped[Optional[str]] = mapped_column(Text)
    description_en: Mapped[Optional[str]] = mapped_column(Text)
    icon_emoji: Mapped[str] = mapped_column(String(8), default="🏆")
    xp_reward: Mapped[int] = mapped_column(Integer, default=50)
    rarity: Mapped[AchievementRarity] = mapped_column(
        SAEnum(AchievementRarity, values_callable=lambda obj: [e.value for e in obj]),
        default=AchievementRarity.COMMON
    )
    # Target value for progressive achievements (e.g., 10 reviews)
    target_value: Mapped[Optional[int]] = mapped_column(Integer)
    # Extra spins granted when earned
    spin_bonus: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_achievements: Mapped[List["UserAchievement"]] = relationship(back_populates="achievement")


class UserAchievement(Base):
    """Tracks which achievements each user has earned."""
    __tablename__ = "user_achievements"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    achievement_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("achievements.id"), nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    progress: Mapped[int] = mapped_column(Integer, default=0)  # for progressive achievements
    is_new_flag: Mapped[bool] = mapped_column(Boolean, default=True)  # cleared after user sees it

    user: Mapped["User"] = relationship(back_populates="achievements")
    achievement: Mapped["Achievement"] = relationship(back_populates="user_achievements")

    __table_args__ = (UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),)


class UserStreak(Base):
    """Tracks daily submission streaks per user."""
    __tablename__ = "user_streaks"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, unique=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_submission_date: Mapped[Optional[date]] = mapped_column(Date)
    # Total streak days in lifetime (for achievements)
    total_days: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="streak")


class UserXP(Base):
    """Tracks XP and level for each user."""
    __tablename__ = "user_xp"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, unique=True)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    current_level: Mapped[int] = mapped_column(Integer, default=1)
    # JSONB history: [{date, amount, source, description}]
    xp_history: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="xp")


class DailyMission(Base):
    """Defines missions generated each day."""
    __tablename__ = "daily_missions"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    mission_type: Mapped[MissionType] = mapped_column(SAEnum(MissionType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    # {uz: "...", ru: "...", en: "..."}
    description_i18n: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    target: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reward_spins: Mapped[int] = mapped_column(Integer, default=1)
    reward_xp: Mapped[int] = mapped_column(Integer, default=25)
    active_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    progress_entries: Mapped[List["UserMissionProgress"]] = relationship(back_populates="mission")


class UserMissionProgress(Base):
    """Tracks a user's progress on a daily mission."""
    __tablename__ = "user_mission_progress"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    mission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("daily_missions.id"), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    reward_claimed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="mission_progress")
    mission: Mapped["DailyMission"] = relationship(back_populates="progress_entries")

    __table_args__ = (UniqueConstraint("user_id", "mission_id", name="uq_user_mission"),)


class Leaderboard(Base):
    """Leaderboard snapshots (recomputed periodically)."""
    __tablename__ = "leaderboards"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    leaderboard_type: Mapped[LeaderboardType] = mapped_column(SAEnum(LeaderboardType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    previous_rank: Mapped[Optional[int]] = mapped_column(Integer)  # for rank change arrows
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[Optional[date]] = mapped_column(Date)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship()

    __table_args__ = (
        Index("ix_leaderboards_type_period", "leaderboard_type", "period_start"),
        Index("ix_leaderboards_type_rank", "leaderboard_type", "rank"),
    )


class ShareCard(Base):
    """Generated share cards for prize wins."""
    __tablename__ = "share_cards"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    prize_spin_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("prize_spins.id"), nullable=True)
    image_path: Mapped[str] = mapped_column(String(512), nullable=False)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship()


class FraudSignal(Base):
    """Anti-fraud signals flagged per user."""
    __tablename__ = "fraud_signals"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    signal_type: Mapped[FraudSignalType] = mapped_column(SAEnum(FraudSignalType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    # Score contribution (0-100 scale)
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    # Evidence JSON (order numbers, image hashes, etc.)
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("admin_users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_false_positive: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship()

    __table_args__ = (Index("ix_fraud_signals_user_type", "user_id", "signal_type"),)
