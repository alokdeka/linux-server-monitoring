"""Add dashboard user and settings tables

Revision ID: 002
Revises: 001
Create Date: 2024-12-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    """Add dashboard-specific tables for user management and settings."""
    
    # Create dashboard_users table
    op.create_table('dashboard_users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_admin', sa.Boolean(), nullable=False, default=False),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('login_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for dashboard_users
    op.create_index('ix_dashboard_users_username', 'dashboard_users', ['username'], unique=True)
    op.create_index('ix_dashboard_users_email', 'dashboard_users', ['email'], unique=True)
    
    # Create dashboard_sessions table
    op.create_table('dashboard_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('session_token', sa.String(length=255), nullable=False),
        sa.Column('refresh_token', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('refresh_expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('last_activity', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['dashboard_users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for dashboard_sessions
    op.create_index('ix_dashboard_sessions_session_token', 'dashboard_sessions', ['session_token'], unique=True)
    op.create_index('ix_dashboard_sessions_refresh_token', 'dashboard_sessions', ['refresh_token'], unique=True)
    
    # Create dashboard_settings table
    op.create_table('dashboard_settings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('theme', sa.String(length=20), nullable=False, default='light'),
        sa.Column('refresh_interval', sa.Integer(), nullable=False, default=30),
        sa.Column('compact_mode', sa.Boolean(), nullable=False, default=False),
        sa.Column('charts_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('cpu_threshold', sa.Float(), nullable=False, default=80.0),
        sa.Column('memory_threshold', sa.Float(), nullable=False, default=85.0),
        sa.Column('disk_threshold', sa.Float(), nullable=False, default=90.0),
        sa.Column('notifications_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('webhook_urls', sa.JSON(), nullable=False, default=[]),
        sa.Column('email_notifications', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['dashboard_users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )


def downgrade():
    """Remove dashboard-specific tables."""
    
    # Drop tables in reverse order due to foreign key constraints
    op.drop_table('dashboard_settings')
    op.drop_table('dashboard_sessions')
    op.drop_table('dashboard_users')