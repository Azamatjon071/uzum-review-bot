"""make_submission_id_nullable

Revision ID: 0004_make_submission_id_nullable
Revises: 1f4159131dec
Create Date: 2024-05-23 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '80ff8f0d7545'
down_revision = '80ff8f0d7544'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Remove unique constraint first if it exists, but since we are making it nullable, 
    # unique(null) allows multiple nulls in Postgres, so unique constraint is fine.
    
    # We must reference table name directly
    op.alter_column('prize_spins', 'submission_id',
               existing_type=sa.UUID(),
               nullable=True)


def downgrade() -> None:
    op.alter_column('prize_spins', 'submission_id',
               existing_type=sa.UUID(),
               nullable=False)
