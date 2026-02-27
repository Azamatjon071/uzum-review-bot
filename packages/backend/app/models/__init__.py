import uuid
import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Integer, BigInteger, Boolean, Text, DateTime, Numeric,
    ForeignKey, JSON, Enum as SAEnum, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class Language(str, enum.Enum):
    UZ = "uz"
    RU = "ru"
    EN = "en"


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DUPLICATE = "duplicate"


class PrizeType(str, enum.Enum):
    DISCOUNT = "discount"
    CASHBACK = "cashback"
    GIFT = "gift"
    FREE_PRODUCT = "free_product"
    CHARITY_DONATION = "charity_donation"


class RewardStatus(str, enum.Enum):
    PENDING = "pending"
    CLAIMED = "claimed"
    EXPIRED = "expired"
    DONATED = "donated"


class NotificationType(str, enum.Enum):
    SUBMISSION_APPROVED = "submission_approved"
    SUBMISSION_REJECTED = "submission_rejected"
    REWARD_EARNED = "reward_earned"
    REWARD_EXPIRING = "reward_expiring"
    BROADCAST = "broadcast"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(64))
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(String(128))
    language: Mapped[Language] = mapped_column(SAEnum(Language), default=Language.UZ)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    ban_reason: Mapped[Optional[str]] = mapped_column(Text)
    total_submissions: Mapped[int] = mapped_column(Integer, default=0)
    approved_submissions: Mapped[int] = mapped_column(Integer, default=0)
    total_spins: Mapped[int] = mapped_column(Integer, default=0)
    referral_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    referred_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    submissions: Mapped[List["Submission"]] = relationship(back_populates="user")
    spins: Mapped[List["PrizeSpin"]] = relationship(back_populates="user")
    rewards: Mapped[List["Reward"]] = relationship(back_populates="user")
    donations: Mapped[List["CharityDonation"]] = relationship(back_populates="user")


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
    status: Mapped[SubmissionStatus] = mapped_column(SAEnum(SubmissionStatus), default=SubmissionStatus.PENDING, index=True)
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
    prize_type: Mapped[PrizeType] = mapped_column(SAEnum(PrizeType), nullable=False)
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
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submissions.id"), nullable=False, unique=True)
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
    status: Mapped[RewardStatus] = mapped_column(SAEnum(RewardStatus), default=RewardStatus.PENDING)
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
    notification_type: Mapped[NotificationType] = mapped_column(SAEnum(NotificationType), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    error: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
