"""Initial database schema

Revision ID: 001
Revises: 
Create Date: 2024-12-15 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create servers table
    op.create_table('servers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('server_id', sa.String(length=255), nullable=False),
        sa.Column('hostname', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('registered_at', sa.DateTime(), nullable=False),
        sa.Column('last_seen', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_servers_server_id'), 'servers', ['server_id'], unique=True)

    # Create api_keys table
    op.create_table('api_keys',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('key_hash', sa.String(length=255), nullable=False),
        sa.Column('server_id', sa.String(length=255), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['server_id'], ['servers.server_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_api_keys_key_hash'), 'api_keys', ['key_hash'], unique=True)

    # Create alert_rules table
    op.create_table('alert_rules',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('threshold_value', sa.Float(), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('evaluation_interval', sa.Integer(), nullable=False),
        sa.Column('cooldown_period', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Create health_status table
    op.create_table('health_status',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('server_id', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('last_check', sa.DateTime(), nullable=False),
        sa.Column('status_since', sa.DateTime(), nullable=False),
        sa.Column('cpu_status', sa.String(length=20), nullable=False),
        sa.Column('memory_status', sa.String(length=20), nullable=False),
        sa.Column('disk_status', sa.String(length=20), nullable=False),
        sa.Column('connectivity_status', sa.String(length=20), nullable=False),
        sa.Column('last_cpu_usage', sa.Float(), nullable=True),
        sa.Column('last_memory_percentage', sa.Float(), nullable=True),
        sa.Column('last_disk_usage_max', sa.Float(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['server_id'], ['servers.server_id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('server_id')
    )

    # Create metrics table
    op.create_table('metrics',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('server_id', sa.String(length=255), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('cpu_usage', sa.Float(), nullable=False),
        sa.Column('memory_total', sa.Integer(), nullable=False),
        sa.Column('memory_used', sa.Integer(), nullable=False),
        sa.Column('memory_percentage', sa.Float(), nullable=False),
        sa.Column('disk_usage', sa.JSON(), nullable=False),
        sa.Column('load_1min', sa.Float(), nullable=False),
        sa.Column('load_5min', sa.Float(), nullable=False),
        sa.Column('load_15min', sa.Float(), nullable=False),
        sa.Column('uptime', sa.Integer(), nullable=False),
        sa.Column('failed_services', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['server_id'], ['servers.server_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_metrics_server_timestamp', 'metrics', ['server_id', 'timestamp'], unique=False)
    op.create_index('idx_metrics_timestamp', 'metrics', ['timestamp'], unique=False)

    # Create alerts table
    op.create_table('alerts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('server_id', sa.String(length=255), nullable=False),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('threshold_value', sa.Float(), nullable=True),
        sa.Column('actual_value', sa.Float(), nullable=True),
        sa.Column('triggered_at', sa.DateTime(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('is_resolved', sa.Boolean(), nullable=False),
        sa.Column('webhook_sent', sa.Boolean(), nullable=False),
        sa.Column('webhook_sent_at', sa.DateTime(), nullable=True),
        sa.Column('webhook_response_code', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['server_id'], ['servers.server_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_alerts_resolved', 'alerts', ['is_resolved'], unique=False)
    op.create_index('idx_alerts_server_triggered', 'alerts', ['server_id', 'triggered_at'], unique=False)
    op.create_index('idx_alerts_type_triggered', 'alerts', ['alert_type', 'triggered_at'], unique=False)


def downgrade() -> None:
    op.drop_table('alerts')
    op.drop_table('metrics')
    op.drop_table('health_status')
    op.drop_table('alert_rules')
    op.drop_table('api_keys')
    op.drop_table('servers')