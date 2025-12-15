"""
Database operations and utilities for the monitoring system.

Provides high-level database operations for servers, metrics, alerts, and health status.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func

from .models import Server, Metric, ApiKey, Alert, HealthStatus, AlertRule
from shared.models import SystemMetrics


class ServerOperations:
    """Database operations for server management."""
    
    @staticmethod
    def create_server(session: Session, server_id: str, hostname: Optional[str] = None, 
                     ip_address: Optional[str] = None) -> Server:
        """Create a new server record."""
        server = Server(
            server_id=server_id,
            hostname=hostname,
            ip_address=ip_address
        )
        session.add(server)
        session.flush()
        return server
    
    @staticmethod
    def get_server(session: Session, server_id: str) -> Optional[Server]:
        """Get server by server_id."""
        return session.query(Server).filter(Server.server_id == server_id).first()
    
    @staticmethod
    def get_or_create_server(session: Session, server_id: str, 
                           hostname: Optional[str] = None, 
                           ip_address: Optional[str] = None) -> Server:
        """Get existing server or create new one."""
        server = ServerOperations.get_server(session, server_id)
        if not server:
            server = ServerOperations.create_server(session, server_id, hostname, ip_address)
        return server
    
    @staticmethod
    def update_last_seen(session: Session, server_id: str) -> None:
        """Update server's last_seen timestamp."""
        session.query(Server).filter(Server.server_id == server_id).update({
            'last_seen': datetime.utcnow()
        })
    
    @staticmethod
    def get_all_servers(session: Session, active_only: bool = True) -> List[Server]:
        """Get all servers, optionally filtering by active status."""
        query = session.query(Server)
        if active_only:
            query = query.filter(Server.is_active == True)
        return query.all()


class MetricOperations:
    """Database operations for metrics management."""
    
    @staticmethod
    def store_metrics(session: Session, metrics: SystemMetrics) -> Metric:
        """Store system metrics in the database."""
        # Ensure server exists
        ServerOperations.get_or_create_server(session, metrics.server_id)
        
        # Convert SystemMetrics to database format
        metric = Metric(
            server_id=metrics.server_id,
            timestamp=datetime.fromisoformat(metrics.timestamp.replace('Z', '+00:00')),
            cpu_usage=metrics.cpu_usage,
            memory_total=metrics.memory.total,
            memory_used=metrics.memory.used,
            memory_percentage=metrics.memory.percentage,
            disk_usage=[{
                'mountpoint': disk.mountpoint,
                'total': disk.total,
                'used': disk.used,
                'percentage': disk.percentage
            } for disk in metrics.disk_usage],
            load_1min=metrics.load_average.one_min,
            load_5min=metrics.load_average.five_min,
            load_15min=metrics.load_average.fifteen_min,
            uptime=metrics.uptime,
            failed_services=[{
                'name': service.name,
                'status': service.status,
                'since': service.since
            } for service in metrics.failed_services]
        )
        
        session.add(metric)
        
        # Update server's last_seen timestamp
        ServerOperations.update_last_seen(session, metrics.server_id)
        
        session.flush()
        return metric
    
    @staticmethod
    def get_latest_metrics(session: Session, server_id: str, limit: int = 1) -> List[Metric]:
        """Get latest metrics for a server."""
        return (session.query(Metric)
                .filter(Metric.server_id == server_id)
                .order_by(desc(Metric.timestamp))
                .limit(limit)
                .all())
    
    @staticmethod
    def get_metrics_in_range(session: Session, server_id: str, 
                           start_time: datetime, end_time: datetime) -> List[Metric]:
        """Get metrics for a server within a time range."""
        return (session.query(Metric)
                .filter(and_(
                    Metric.server_id == server_id,
                    Metric.timestamp >= start_time,
                    Metric.timestamp <= end_time
                ))
                .order_by(Metric.timestamp)
                .all())
    
    @staticmethod
    def cleanup_old_metrics(session: Session, retention_days: int = 30) -> int:
        """Remove metrics older than retention period."""
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        deleted_count = (session.query(Metric)
                        .filter(Metric.timestamp < cutoff_date)
                        .delete())
        return deleted_count


class AlertOperations:
    """Database operations for alert management."""
    
    @staticmethod
    def create_alert(session: Session, server_id: str, alert_type: str, 
                    severity: str, message: str, threshold_value: Optional[float] = None,
                    actual_value: Optional[float] = None) -> Alert:
        """Create a new alert."""
        alert = Alert(
            server_id=server_id,
            alert_type=alert_type,
            severity=severity,
            message=message,
            threshold_value=threshold_value,
            actual_value=actual_value
        )
        session.add(alert)
        session.flush()
        return alert
    
    @staticmethod
    def get_active_alerts(session: Session, server_id: Optional[str] = None) -> List[Alert]:
        """Get all unresolved alerts, optionally filtered by server."""
        query = session.query(Alert).filter(Alert.is_resolved == False)
        if server_id:
            query = query.filter(Alert.server_id == server_id)
        return query.order_by(desc(Alert.triggered_at)).all()
    
    @staticmethod
    def resolve_alert(session: Session, alert_id: int) -> bool:
        """Mark an alert as resolved."""
        updated = (session.query(Alert)
                  .filter(Alert.id == alert_id)
                  .update({
                      'is_resolved': True,
                      'resolved_at': datetime.utcnow()
                  }))
        return updated > 0
    
    @staticmethod
    def update_webhook_status(session: Session, alert_id: int, 
                            response_code: Optional[int] = None) -> None:
        """Update webhook delivery status for an alert."""
        update_data = {
            'webhook_sent': True,
            'webhook_sent_at': datetime.utcnow()
        }
        if response_code is not None:
            update_data['webhook_response_code'] = response_code
            
        session.query(Alert).filter(Alert.id == alert_id).update(update_data)


class HealthStatusOperations:
    """Database operations for health status management."""
    
    @staticmethod
    def update_health_status(session: Session, server_id: str, status: str,
                           cpu_status: str = 'normal', memory_status: str = 'normal',
                           disk_status: str = 'normal', connectivity_status: str = 'online',
                           last_cpu_usage: Optional[float] = None,
                           last_memory_percentage: Optional[float] = None,
                           last_disk_usage_max: Optional[float] = None) -> HealthStatus:
        """Update or create health status for a server."""
        health_status = (session.query(HealthStatus)
                        .filter(HealthStatus.server_id == server_id)
                        .first())
        
        now = datetime.utcnow()
        
        if health_status:
            # Update existing status
            if health_status.status != status:
                health_status.status_since = now
            
            health_status.status = status
            health_status.last_check = now
            health_status.cpu_status = cpu_status
            health_status.memory_status = memory_status
            health_status.disk_status = disk_status
            health_status.connectivity_status = connectivity_status
            health_status.last_cpu_usage = last_cpu_usage
            health_status.last_memory_percentage = last_memory_percentage
            health_status.last_disk_usage_max = last_disk_usage_max
        else:
            # Create new status
            health_status = HealthStatus(
                server_id=server_id,
                status=status,
                last_check=now,
                status_since=now,
                cpu_status=cpu_status,
                memory_status=memory_status,
                disk_status=disk_status,
                connectivity_status=connectivity_status,
                last_cpu_usage=last_cpu_usage,
                last_memory_percentage=last_memory_percentage,
                last_disk_usage_max=last_disk_usage_max
            )
            session.add(health_status)
        
        session.flush()
        return health_status
    
    @staticmethod
    def get_health_status(session: Session, server_id: str) -> Optional[HealthStatus]:
        """Get health status for a server."""
        return (session.query(HealthStatus)
                .filter(HealthStatus.server_id == server_id)
                .first())
    
    @staticmethod
    def get_all_health_status(session: Session) -> List[HealthStatus]:
        """Get health status for all servers."""
        return session.query(HealthStatus).all()


class ApiKeyOperations:
    """Database operations for API key management."""
    
    @staticmethod
    def create_api_key(session: Session, key_hash: str, server_id: Optional[str] = None,
                      description: Optional[str] = None, 
                      expires_at: Optional[datetime] = None) -> ApiKey:
        """Create a new API key record."""
        api_key = ApiKey(
            key_hash=key_hash,
            server_id=server_id,
            description=description,
            expires_at=expires_at
        )
        session.add(api_key)
        session.flush()
        return api_key
    
    @staticmethod
    def get_api_key_by_hash(session: Session, key_hash: str) -> Optional[ApiKey]:
        """Get API key by hash."""
        return (session.query(ApiKey)
                .filter(and_(
                    ApiKey.key_hash == key_hash,
                    ApiKey.is_active == True
                ))
                .first())
    
    @staticmethod
    def update_last_used(session: Session, key_hash: str) -> None:
        """Update API key's last_used timestamp."""
        session.query(ApiKey).filter(ApiKey.key_hash == key_hash).update({
            'last_used': datetime.utcnow()
        })
    
    @staticmethod
    def deactivate_api_key(session: Session, key_hash: str) -> bool:
        """Deactivate an API key."""
        updated = (session.query(ApiKey)
                  .filter(ApiKey.key_hash == key_hash)
                  .update({'is_active': False}))
        return updated > 0