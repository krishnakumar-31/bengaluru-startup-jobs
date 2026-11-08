"""Add professional management fields to companies, offices, and jobs

Revision ID: c81fd92a1012
Revises: 3a24b6388f48
Create Date: 2026-11-04 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c81fd92a1012'
down_revision = '3a24b6388f48'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Companies additions
    op.add_column('companies', sa.Column('cin', sa.String(length=50), nullable=True))
    op.add_column('companies', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('companies', sa.Column('phone', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_companies_cin'), 'companies', ['cin'], unique=False)

    # 2. Offices additions
    op.add_column('offices', sa.Column('name', sa.String(length=255), nullable=True))
    op.add_column(
        'offices',
        sa.Column('is_headquarters', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )

    # 3. Jobs additions
    op.add_column(
        'jobs',
        sa.Column('work_mode', sa.String(length=50), server_default='in-office', nullable=False)
    )
    op.add_column(
        'jobs',
        sa.Column('vacancies', sa.Integer(), server_default='1', nullable=False)
    )
    op.add_column('jobs', sa.Column('experience_min', sa.Integer(), nullable=True))
    op.add_column('jobs', sa.Column('experience_max', sa.Integer(), nullable=True))
    op.add_column('jobs', sa.Column('job_source_url', sa.String(length=500), nullable=True))
    op.create_index(op.f('ix_jobs_work_mode'), 'jobs', ['work_mode'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_jobs_work_mode'), table_name='jobs')
    op.drop_column('jobs', 'job_source_url')
    op.drop_column('jobs', 'experience_max')
    op.drop_column('jobs', 'experience_min')
    op.drop_column('jobs', 'vacancies')
    op.drop_column('jobs', 'work_mode')

    op.drop_column('offices', 'is_headquarters')
    op.drop_column('offices', 'name')

    op.drop_index(op.f('ix_companies_cin'), table_name='companies')
    op.drop_column('companies', 'phone')
    op.drop_column('companies', 'email')
    op.drop_column('companies', 'cin')
