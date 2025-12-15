"""
Alert Engine for the Linux Server Health Monitoring System.

This module provides the AlertEngine class that implements rule-based alerting
for CPU usage, disk usage, and server offline conditions. It supports console
logging and webhook notifications for triggered alerts.
"""

import os
import json
import logging
import requests
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from server.database.models import Alert, Server, Metric, HealthStatus
from server.database.operations import AlertOperations, ServerOperations, HealthStatusOperations
from shared.models import SystemMetrics


logger = logging.getLogger(__name__)


class AlertEngine:
    """
    Rule-based alerting engine for monitoring system thresholds.
    
    Monitors CPU usage, disk usage, and server connectivity to trigger alerts
    when configurable thresholds are exceeded. Supports console logging and
    webhook notifications for extensible alerting.
    """
    
    def __init__(self, session: Session, webhook_urls: Optional[List[str]] = None):
        """
        Initialize AlertEngine.
        
        Args:
            session: Database session for alert operations
            webhook_urls: List of webhook URLs for notifications (optional)
        """
        self.session = session
        self.webhook_urls = webhook_urls or []
        
        # Default alert thresholds (can be overridden via environment variables)
        self.cpu_threshold = float(os.getenv("ALERT_CPU_THRESHOLD", "90.0"))
        self.disk_threshold = float(os.getenv("ALERT_DISK_THRESHOLD", "80.0"))
        self.offline_timeout = int(os.getenv("ALERT_OFFLINE_TIMEOUT", "300"))  # seconds
        
        # Webhook configuration
        self.webhook_timeout = int(os.getenv("WEBHOOK_TIMEOUT", "10"))  # seconds
        self.webhook_retry_attempts = int(os.getenv("WEBHOOK_RETRY_ATTEMPTS", "3"))
        
        logger.info(f"AlertEngine initialized with thresholds: CPU={self.cpu_threshold}%, "
                   f"Disk={self.disk_threshold}%, Offline={self.offline_timeout}s")
        if self.webhook_urls:
            logger.info(f"Webhook notifications enabled for {len(self.webhook_urls)} URLs")
    
    def evaluate_metrics(self, metrics: SystemMetrics) -> List[Alert]:
        """
        Evaluate system metrics against alert rules and trigger alerts if needed.
        
        Args:
            metrics: System metrics to evaluate
            
        Returns:
            List of triggered alerts
        """
        triggered_alerts = []
        
        # Check CPU usage threshold
        cpu_alert = self._check_cpu_threshold(metrics)
        if cpu_alert:
            triggered_alerts.append(cpu_alert)
        
        # Check disk usage thresholds
        disk_alerts = self._check_disk_thresholds(metrics)
        triggered_alerts.extend(disk_alerts)
        
        # Process all triggered alerts
        for alert in triggered_alerts:
            self._process_alert(alert)
        
        return triggered_alerts
    
    def check_offline_servers(self) -> List[Alert]:
        """
        Check for servers that have gone offline and trigger alerts.
        
        Returns:
            List of offline alerts triggered
        """
        triggered_alerts = []
        cutoff_time = datetime.utcnow() - timedelta(seconds=self.offline_timeout)
        
        # Get all servers that haven't been seen recently
        servers = ServerOperations.get_all_servers(self.session, active_only=True)
        
        for server in servers:
            if server.last_seen < cutoff_time:
                # Check if we already have an active offline alert for this server
                existing_alerts = AlertOperations.get_active_alerts(self.session, server.server_id)
                has_offline_alert = any(alert.alert_type == 'offline' for alert in existing_alerts)
                
                if not has_offline_alert:
                    offline_minutes = int((datetime.utcnow() - server.last_seen).total_seconds() / 60)
                    alert = AlertOperations.create_alert(
                        session=self.session,
                        server_id=server.server_id,
                        alert_type='offline',
                        severity='critical',
                        message=f"Server {server.server_id} has been offline for {offline_minutes} minutes",
                        threshold_value=float(self.offline_timeout),
                        actual_value=float((datetime.utcnow() - server.last_seen).total_seconds())
                    )
                    triggered_alerts.append(alert)
                    self._process_alert(alert)
                    
                    # Update health status to 'down'
                    HealthStatusOperations.update_health_status(
                        session=self.session,
                        server_id=server.server_id,
                        status='down',
                        connectivity_status='offline'
                    )
        
        return triggered_alerts
    
    def _check_cpu_threshold(self, metrics: SystemMetrics) -> Optional[Alert]:
        """
        Check if CPU usage exceeds threshold.
        
        Args:
            metrics: System metrics to check
            
        Returns:
            Alert if threshold exceeded, None otherwise
        """
        if metrics.cpu_usage > self.cpu_threshold:
            # Check if we already have an active CPU alert for this server
            existing_alerts = AlertOperations.get_active_alerts(self.session, metrics.server_id)
            has_cpu_alert = any(alert.alert_type == 'cpu' for alert in existing_alerts)
            
            if not has_cpu_alert:
                return AlertOperations.create_alert(
                    session=self.session,
                    server_id=metrics.server_id,
                    alert_type='cpu',
                    severity='warning' if metrics.cpu_usage < 95.0 else 'critical',
                    message=f"High CPU usage on {metrics.server_id}: {metrics.cpu_usage:.1f}%",
                    threshold_value=self.cpu_threshold,
                    actual_value=metrics.cpu_usage
                )
        
        return None
    
    def _check_disk_thresholds(self, metrics: SystemMetrics) -> List[Alert]:
        """
        Check if any disk usage exceeds threshold.
        
        Args:
            metrics: System metrics to check
            
        Returns:
            List of disk usage alerts
        """
        alerts = []
        
        # Get existing active disk alerts for this server
        existing_alerts = AlertOperations.get_active_alerts(self.session, metrics.server_id)
        existing_disk_alerts = {
            alert.message.split(' ')[-1]: alert  # Extract mountpoint from message
            for alert in existing_alerts 
            if alert.alert_type == 'disk'
        }
        
        for disk in metrics.disk_usage:
            if disk.percentage > self.disk_threshold:
                # Check if we already have an active alert for this specific mountpoint
                mountpoint_key = f"({disk.mountpoint})"
                if mountpoint_key not in existing_disk_alerts:
                    alert = AlertOperations.create_alert(
                        session=self.session,
                        server_id=metrics.server_id,
                        alert_type='disk',
                        severity='warning' if disk.percentage < 90.0 else 'critical',
                        message=f"High disk usage on {metrics.server_id}: {disk.percentage:.1f}% ({disk.mountpoint})",
                        threshold_value=self.disk_threshold,
                        actual_value=disk.percentage
                    )
                    alerts.append(alert)
        
        return alerts
    
    def _process_alert(self, alert: Alert) -> None:
        """
        Process a triggered alert by logging and sending notifications.
        
        Args:
            alert: Alert to process
        """
        # Log alert to console
        self._log_alert(alert)
        
        # Send webhook notifications if configured
        if self.webhook_urls:
            self._send_webhook_notifications(alert)
        
        # Commit the alert to database
        self.session.commit()
    
    def _log_alert(self, alert: Alert) -> None:
        """
        Log alert message to console.
        
        Args:
            alert: Alert to log
        """
        log_level = logging.CRITICAL if alert.severity == 'critical' else logging.WARNING
        logger.log(
            log_level,
            f"ALERT [{alert.severity.upper()}] {alert.alert_type.upper()}: {alert.message}"
        )
    
    def _send_webhook_notifications(self, alert: Alert) -> None:
        """
        Send webhook notifications for an alert.
        
        Args:
            alert: Alert to send notifications for
        """
        webhook_payload = self._create_webhook_payload(alert)
        
        for webhook_url in self.webhook_urls:
            success = self._send_webhook(webhook_url, webhook_payload, alert.id)
            if success:
                logger.info(f"Webhook notification sent successfully to {webhook_url}")
            else:
                logger.error(f"Failed to send webhook notification to {webhook_url}")
    
    def _create_webhook_payload(self, alert: Alert) -> Dict[str, Any]:
        """
        Create webhook payload for an alert.
        
        Args:
            alert: Alert to create payload for
            
        Returns:
            Dictionary containing webhook payload
        """
        return {
            "alert_id": alert.id,
            "server_id": alert.server_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "threshold_value": alert.threshold_value,
            "actual_value": alert.actual_value,
            "triggered_at": alert.triggered_at.isoformat(),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _send_webhook(self, webhook_url: str, payload: Dict[str, Any], alert_id: int) -> bool:
        """
        Send webhook notification with retry logic.
        
        Args:
            webhook_url: URL to send webhook to
            payload: Webhook payload
            alert_id: Alert ID for tracking delivery status
            
        Returns:
            True if webhook sent successfully, False otherwise
        """
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Linux-Server-Monitoring/1.0'
        }
        
        for attempt in range(self.webhook_retry_attempts):
            try:
                response = requests.post(
                    webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=self.webhook_timeout
                )
                
                # Update webhook delivery status in database
                AlertOperations.update_webhook_status(
                    session=self.session,
                    alert_id=alert_id,
                    response_code=response.status_code
                )
                
                if response.status_code < 400:
                    return True
                else:
                    logger.warning(f"Webhook returned status {response.status_code} for alert {alert_id}")
                    
            except Exception as e:
                logger.warning(f"Webhook attempt {attempt + 1} failed for {webhook_url}: {e}")
                
                if attempt == self.webhook_retry_attempts - 1:
                    # Update webhook status as failed on final attempt
                    AlertOperations.update_webhook_status(
                        session=self.session,
                        alert_id=alert_id,
                        response_code=0  # 0 indicates network/connection failure
                    )
        
        return False
    
    def resolve_alerts_for_server(self, server_id: str, alert_types: Optional[List[str]] = None) -> int:
        """
        Resolve active alerts for a server when conditions return to normal.
        
        Args:
            server_id: Server ID to resolve alerts for
            alert_types: Specific alert types to resolve (optional, resolves all if None)
            
        Returns:
            Number of alerts resolved
        """
        active_alerts = AlertOperations.get_active_alerts(self.session, server_id)
        resolved_count = 0
        
        for alert in active_alerts:
            if alert_types is None or alert.alert_type in alert_types:
                if AlertOperations.resolve_alert(self.session, alert.id):
                    resolved_count += 1
                    logger.info(f"Resolved {alert.alert_type} alert for server {server_id}")
        
        if resolved_count > 0:
            self.session.commit()
        
        return resolved_count
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """
        Get alert statistics for monitoring and reporting.
        
        Returns:
            Dictionary containing alert statistics
        """
        # This would typically query the database for statistics
        # For now, return basic configuration info
        return {
            "thresholds": {
                "cpu_threshold": self.cpu_threshold,
                "disk_threshold": self.disk_threshold,
                "offline_timeout": self.offline_timeout
            },
            "webhook_config": {
                "webhook_count": len(self.webhook_urls),
                "webhook_timeout": self.webhook_timeout,
                "retry_attempts": self.webhook_retry_attempts
            }
        }