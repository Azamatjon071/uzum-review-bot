"""user_extended_fields_referral_spin_count

Revision ID: 0002_user_extended_fields
Revises: 1f4159131dec
Create Date: 2026-02-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0002_user_extended_fields'
down_revision = '1f4159131dec'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add extended profile fields to users
    op.add_column('users', sa.Column('phone', sa.String(32), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('profile_photo_url', sa.String(512), nullable=True))
    op.add_column('users', sa.Column('profile_photo_file_id', sa.String(256), nullable=True))
    op.add_column('users', sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('spin_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('referral_bonus_spins', sa.Integer(), nullable=False, server_default='0'))

    # Add referral_bonus notification type to the enum
    # For PostgreSQL we need to alter the type
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'referral_bonus'")


def downgrade() -> None:
    op.drop_column('users', 'phone')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'profile_photo_url')
    op.drop_column('users', 'profile_photo_file_id')
    op.drop_column('users', 'last_seen_at')
    op.drop_column('users', 'spin_count')
    op.drop_column('users', 'referral_bonus_spins')
