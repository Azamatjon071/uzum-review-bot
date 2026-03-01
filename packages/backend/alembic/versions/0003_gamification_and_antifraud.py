"""gamification_and_antifraud

Adds Achievement, UserAchievement, UserStreak, UserXP, DailyMission,
UserMissionProgress, Leaderboard, ShareCard, FraudSignal tables plus
new enum values and indexes required for the gamification overhaul.

Revision ID: 0003_gamification_and_antifraud
Revises: 0002_user_extended_fields
Create Date: 2026-03-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_gamification_and_antifraud"
down_revision = "0002_user_extended_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── New enum types ─────────────────────────────────────────────────────────

    # These use native PostgreSQL ENUMs for performance
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE achievementrarity AS ENUM ('common','rare','epic','legendary');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE leaderboardtype AS ENUM ('weekly','monthly','alltime','charity');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE missiontype AS ENUM (
                'submit_reviews','refer_friends','complete_profile',
                'spin_wheel','charity_donation'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE fraudsignaltype AS ENUM (
                'duplicate_order','image_similarity','velocity_limit',
                'bot_behavior','new_account','cluster_match'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    # Add new NotificationType values
    for val in [
        "streak_warning", "achievement_earned", "leaderboard_result",
        "weekly_summary", "mission_completed", "level_up",
    ]:
        op.execute(
            f"ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS '{val}'"
        )

    # ── Add streak / XP columns to users for quick access ─────────────────────
    op.add_column("users", sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("xp", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("level", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("users", sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("fraud_score", sa.Integer(), nullable=False, server_default="0"))

    # ── Achievement ────────────────────────────────────────────────────────────
    op.create_table(
        "achievements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(64), nullable=False, unique=True),
        sa.Column("name_uz", sa.String(128), nullable=False),
        sa.Column("name_ru", sa.String(128), nullable=False),
        sa.Column("name_en", sa.String(128), nullable=False),
        sa.Column("description_uz", sa.Text(), nullable=True),
        sa.Column("description_ru", sa.Text(), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column("icon_emoji", sa.String(8), nullable=False, server_default="🏆"),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("rarity", postgresql.ENUM("common", "rare", "epic", "legendary", name="achievementrarity", create_type=False), nullable=False, server_default="common"),
        sa.Column("target_value", sa.Integer(), nullable=True),
        sa.Column("spin_bonus", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_achievements_key", "achievements", ["key"])

    # ── UserAchievement ────────────────────────────────────────────────────────
    op.create_table(
        "user_achievements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("achievement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("achievements.id"), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_new_flag", sa.Boolean(), nullable=False, server_default="true"),
        sa.UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )
    op.create_index("ix_user_achievements_user_id", "user_achievements", ["user_id"])

    # ── UserStreak ─────────────────────────────────────────────────────────────
    op.create_table(
        "user_streaks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_submission_date", sa.Date(), nullable=True),
        sa.Column("total_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ── UserXP ─────────────────────────────────────────────────────────────────
    op.create_table(
        "user_xp",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("xp_history", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="'[]'"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ── DailyMission ───────────────────────────────────────────────────────────
    op.create_table(
        "daily_missions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("mission_type", postgresql.ENUM(
            "submit_reviews", "refer_friends", "complete_profile",
            "spin_wheel", "charity_donation", name="missiontype", create_type=False
        ), nullable=False),
        sa.Column("description_i18n", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="'{}'"),
        sa.Column("target", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reward_spins", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reward_xp", sa.Integer(), nullable=False, server_default="25"),
        sa.Column("active_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_daily_missions_active_date", "daily_missions", ["active_date"])

    # ── UserMissionProgress ────────────────────────────────────────────────────
    op.create_table(
        "user_mission_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("mission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("daily_missions.id"), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reward_claimed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "mission_id", name="uq_user_mission"),
    )
    op.create_index("ix_user_mission_progress_user_id", "user_mission_progress", ["user_id"])

    # ── Leaderboard ────────────────────────────────────────────────────────────
    op.create_table(
        "leaderboards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("leaderboard_type", postgresql.ENUM(
            "weekly", "monthly", "alltime", "charity",
            name="leaderboardtype", create_type=False
        ), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("previous_rank", sa.Integer(), nullable=True),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_leaderboards_type_period", "leaderboards", ["leaderboard_type", "period_start"])
    op.create_index("ix_leaderboards_type_rank", "leaderboards", ["leaderboard_type", "rank"])

    # ── ShareCard ──────────────────────────────────────────────────────────────
    op.create_table(
        "share_cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("prize_spin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("prize_spins.id"), nullable=True),
        sa.Column("image_path", sa.String(512), nullable=False),
        sa.Column("clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_share_cards_user_id", "share_cards", ["user_id"])

    # ── FraudSignal ────────────────────────────────────────────────────────────
    op.create_table(
        "fraud_signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("signal_type", postgresql.ENUM(
            "duplicate_order", "image_similarity", "velocity_limit",
            "bot_behavior", "new_account", "cluster_match",
            name="fraudsignaltype", create_type=False
        ), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="'{}'"),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), index=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admin_users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_false_positive", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index("ix_fraud_signals_user_id", "fraud_signals", ["user_id"])
    op.create_index("ix_fraud_signals_user_type", "fraud_signals", ["user_id", "signal_type"])
    op.create_index("ix_fraud_signals_detected_at", "fraud_signals", ["detected_at"])

    # ── Append-only policy for audit_logs ────────────────────────────────────
    # Prevent UPDATE/DELETE on audit_logs for immutability
    op.execute("""
        CREATE OR REPLACE RULE audit_logs_no_update AS
            ON UPDATE TO audit_logs DO INSTEAD NOTHING;
        CREATE OR REPLACE RULE audit_logs_no_delete AS
            ON DELETE TO audit_logs DO INSTEAD NOTHING;
    """)


def downgrade() -> None:
    # Remove rules
    op.execute("DROP RULE IF EXISTS audit_logs_no_update ON audit_logs")
    op.execute("DROP RULE IF EXISTS audit_logs_no_delete ON audit_logs")

    # Drop tables in reverse dependency order
    op.drop_table("fraud_signals")
    op.drop_table("share_cards")
    op.drop_table("leaderboards")
    op.drop_table("user_mission_progress")
    op.drop_table("daily_missions")
    op.drop_table("user_xp")
    op.drop_table("user_streaks")
    op.drop_table("user_achievements")
    op.drop_table("achievements")

    # Remove columns from users
    op.drop_column("users", "fraud_score")
    op.drop_column("users", "onboarding_completed")
    op.drop_column("users", "level")
    op.drop_column("users", "xp")
    op.drop_column("users", "longest_streak")
    op.drop_column("users", "current_streak")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS fraudsignaltype")
    op.execute("DROP TYPE IF EXISTS missiontype")
    op.execute("DROP TYPE IF EXISTS leaderboardtype")
    op.execute("DROP TYPE IF EXISTS achievementrarity")
