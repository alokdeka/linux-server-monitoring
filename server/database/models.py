"""
SQLAlchemy database models for the Linux Server Health Monitoring System.

These models define the database schema for storing server metrics, authentication,
alerts, and health status information.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean, 
    ForeignKey, JSON, Index, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Server(Base):
    """Server registration and metadata."""
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    server_id = Column(String(255), unique=True, nullable=False, index=True)
    hostname = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    registered_at = Column(DateTime, default=func.now(), nullable=False)
    last_seen = Column(DateTime, default=func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    metrics = relationship("Metric", back_populates="server", cascade="all, delete-orphan")
    health_status = relationship("HealthStatus", back_populates="server", uselist=False)
    alerts = relationship("Alert", back_populates="server")

    def __repr__(self):
        return f"<Server(server_id='{self.server_id}', hostname='{self.hostname}')>"


class Metric(Base):
    """Time-series metrics data from agents."""
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    server_id = Column(String(255), ForeignKey("servers.server_id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # System metrics
    cpu_usage = Column(Float, nullable=False)
    memory_total = Column(Integer, nullable=False)
    memory_used = Column(Integer, nullable=False)
    memory_percentage = Column(Float, nullable=False)
    
    # Disk usage stored as JSON array
    disk_usage = Column(JSON, nullable=False)
    
    # Load average
    load_1min = Column(Float, nullable=False)
    load_5min = Column(Float, nullable=False)
    load_15min = Column(Float, nullable=False)
    
    # System uptime in seconds
    uptime = Column(Integer, nullable=False)
    
    # Failed services stored as JSON array
    failed_services = Column(JSON, nullable=False, default=list)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    server = relationship("Server", back_populates="metrics")

    # Indexes for performance
    __table_args__ = (
        Index('idx_metrics_server_timestamp', 'server_id', 'timestamp'),
        Index('idx_metrics_timestamp', 'timestamp'),
    )

    def __repr__(self):
        return f"<Metric(server_id='{self.server_id}', timestamp='{self.timestamp}')>"


class ApiKey(Base):
    """API key authentication tokens."""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    server_id = Column(String(255), ForeignKey("servers.server_id"), nullable=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    last_used = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<ApiKey(id={self.id}, server_id='{self.server_id}', active={self.is_active})>"


class Alert(Base):
    """Alert history and configuration."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    server_id = Column(String(255), ForeignKey("servers.server_id"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # 'cpu', 'disk', 'offline', etc.
    severity = Column(String(20), nullable=False)    # 'warning', 'critical'
    message = Column(Text, nullable=False)
    threshold_value = Column(Float, nullable=True)
    actual_value = Column(Float, nullable=True)
    triggered_at = Column(DateTime, default=func.now(), nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    is_resolved = Column(Boolean, default=False, nullable=False)
    
    # Webhook delivery tracking
    webhook_sent = Column(Boolean, default=False, nullable=False)
    webhook_sent_at = Column(DateTime, nullable=True)
    webhook_response_code = Column(Integer, nullable=True)
    
    # Relationships
    server = relationship("Server", back_populates="alerts")

    # Indexes for performance
    __table_args__ = (
        Index('idx_alerts_server_triggered', 'server_id', 'triggered_at'),
        Index('idx_alerts_type_triggered', 'alert_type', 'triggered_at'),
        Index('idx_alerts_resolved', 'is_resolved'),
    )

    def __repr__(self):
        return f"<Alert(server_id='{self.server_id}', type='{self.alert_type}', severity='{self.severity}')>"


class HealthStatus(Base):
    """Current server health states."""
    __tablename__ = "health_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    server_id = Column(String(255), ForeignKey("servers.server_id"), unique=True, nullable=False)
    status = Column(String(20), nullable=False)  # 'healthy', 'warning', 'down'
    last_check = Column(DateTime, default=func.now(), nullable=False)
    status_since = Column(DateTime, default=func.now(), nullable=False)
    
    # Health indicators
    cpu_status = Column(String(20), default='normal', nullable=False)
    memory_status = Column(String(20), default='normal', nullable=False)
    disk_status = Column(String(20), default='normal', nullable=False)
    connectivity_status = Column(String(20), default='online', nullable=False)
    
    # Last known values
    last_cpu_usage = Column(Float, nullable=True)
    last_memory_percentage = Column(Float, nullable=True)
    last_disk_usage_max = Column(Float, nullable=True)
    
    # Metadata
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    server = relationship("Server", back_populates="health_status")

    def __repr__(self):
        return f"<HealthStatus(server_id='{self.server_id}', status='{self.status}')>"


class AlertRule(Base):
    """Configurable alert rules and thresholds."""
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    alert_type = Column(String(50), nullable=False)
    threshold_value = Column(Float, nullable=False)
    severity = Column(String(20), nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Timing configuration
    evaluation_interval = Column(Integer, default=60, nullable=False)  # seconds
    cooldown_period = Column(Integer, default=300, nullable=False)     # seconds
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<AlertRule(name='{self.name}', type='{self.alert_type}', threshold={self.threshold_value})>"