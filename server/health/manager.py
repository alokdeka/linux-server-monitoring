"""
Health Status Manager for the Linux Server Health Monitoring System.

This module provides the HealthStatusManager class that evaluates server health
based on metrics and connectivity, classifying servers as Healthy, Warning, or Down.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass

from server.database.connection import db_manager
from server.database.operations import HealthStatusOperations, MetricOperations, ServerOperations
from shared.models import SystemMetrics

logger = logging.getLogger(__name__)


@dataclass
class HealthThresholds:
    """Configuration for health status thresholds."""
    cpu_warning_threshold: float = 80.0
    cpu_critical_threshold: float = 90.0
    memory_warning_threshold: float = 80.0
    memory_critical_threshold: float = 90.0
    disk_warning_threshold: float = 70.0
    disk_critical_threshold: float = 80.0
    offline_timeout_minutes: int = 5


class HealthStatusManager:
    """
    Manages server health status evaluation and classification.
    
    Evaluates server health based on:
    - CPU usage thresholds
    - Memory usage thresholds  
    - Disk usage thresholds
    - Connectivity (last seen timestamp)
    - Failed services presence
    """
    
    def __init__(self, connection_manager=None, thresholds: Optional[HealthThresholds] = None):
        """
        Initialize health status manager.
        
        Args:
            connection_manager: Database connection manager (defaults to global db_manager)
            thresholds: Health evaluation thresholds (defaults to HealthThresholds())
        """
        self.connection_manager = connection_manager or db_manager
        self.thresholds = thresholds or HealthThresholds()
        
    def evaluate_server_health(self, server_id: str) -> str:
        """
        Evaluate and update health status for a specific server.
        
        Args:
            server_id: Unique identifier for the server
            
        Returns:
            str: Health status ('healthy', 'warning', 'down')
        """
        try:
            with self.connection_manager.get_session() as session:
                # Get server info and latest metrics
                server = ServerOperations.get_server(session, server_id)
                if not server:
                    logger.warning(f"Server {server_id} not found")
                    return 'down'
                
                # Check connectivity first
                connectivity_status = self._evaluate_connectivity(server.last_seen)
                if connectivity_status == 'offline':
                    # Server is offline - mark as down
                    HealthStatusOperations.update_health_status(
                        session, server_id, 'down',
                        connectivity_status='offline'
                    )
                    session.commit()
                    logger.info(f"Server {server_id} marked as DOWN (offline)")
                    return 'down'
                
                # Get latest metrics for health evaluation
                latest_metrics = MetricOperations.get_latest_metrics(session, server_id, 1)
                if not latest_metrics:
                    # No metrics available - consider as warning
                    HealthStatusOperations.update_health_status(
                        session, server_id, 'warning',
                        connectivity_status='online'
                    )
                    session.commit()
                    logger.info(f"Server {server_id} marked as WARNING (no metrics)")
                    return 'warning'
                
                metric = latest_metrics[0]
                
                # Evaluate individual health components
                cpu_status, cpu_severity = self._evaluate_cpu_health(metric.cpu_usage)
                memory_status, memory_severity = self._evaluate_memory_health(metric.memory_percentage)
                disk_status, disk_severity = self._evaluate_disk_health(metric.disk_usage)
                
                # Determine overall health status
                overall_status = self._determine_overall_status(
                    cpu_severity, memory_severity, disk_severity, 
                    len(metric.failed_services) > 0
                )
                
                # Calculate max disk usage for storage
                max_disk_usage = max(
                    (disk.get('percentage', 0) for disk in metric.disk_usage),
                    default=0
                )
                
                # Update health status in database
                HealthStatusOperations.update_health_status(
                    session, server_id, overall_status,
                    cpu_status=cpu_status,
                    memory_status=memory_status,
                    disk_status=disk_status,
                    connectivity_status='online',
                    last_cpu_usage=metric.cpu_usage,
                    last_memory_percentage=metric.memory_percentage,
                    last_disk_usage_max=max_disk_usage
                )
                
                session.commit()
                logger.debug(f"Server {server_id} health evaluated as {overall_status.upper()}")
                return overall_status
                
        except Exception as e:
            logger.error(f"Failed to evaluate health for server {server_id}: {e}")
            return 'down'
    
    def evaluate_all_servers_health(self) -> Dict[str, str]:
        """
        Evaluate health status for all active servers.
        
        Returns:
            Dict[str, str]: Mapping of server_id to health status
        """
        results = {}
        
        try:
            with self.connection_manager.get_session() as session:
                servers = ServerOperations.get_all_servers(session, active_only=True)
                
                for server in servers:
                    status = self.evaluate_server_health(server.server_id)
                    results[server.server_id] = status
                    
        except Exception as e:
            logger.error(f"Failed to evaluate health for all servers: {e}")
            
        return results
    
    def get_server_health_summary(self, server_id: str) -> Optional[Dict]:
        """
        Get detailed health summary for a server.
        
        Args:
            server_id: Unique identifier for the server
            
        Returns:
            Optional[Dict]: Health summary with detailed status information
        """
        try:
            with self.connection_manager.get_session() as session:
                health_status = HealthStatusOperations.get_health_status(session, server_id)
                if not health_status:
                    return None
                
                return {
                    'server_id': server_id,
                    'overall_status': health_status.status,
                    'last_check': health_status.last_check.isoformat(),
                    'status_since': health_status.status_since.isoformat(),
                    'components': {
                        'cpu': {
                            'status': health_status.cpu_status,
                            'last_value': health_status.last_cpu_usage
                        },
                        'memory': {
                            'status': health_status.memory_status,
                            'last_value': health_status.last_memory_percentage
                        },
                        'disk': {
                            'status': health_status.disk_status,
                            'last_value': health_status.last_disk_usage_max
                        },
                        'connectivity': {
                            'status': health_status.connectivity_status
                        }
                    }
                }
                
        except Exception as e:
            logger.error(f"Failed to get health summary for server {server_id}: {e}")
            return None
    
    def _evaluate_connectivity(self, last_seen: datetime) -> str:
        """
        Evaluate server connectivity based on last seen timestamp.
        
        Args:
            last_seen: Last time server was seen
            
        Returns:
            str: 'online' or 'offline'
        """
        if not last_seen:
            return 'offline'
            
        time_since_last_seen = datetime.utcnow() - last_seen
        timeout_threshold = timedelta(minutes=self.thresholds.offline_timeout_minutes)
        
        return 'online' if time_since_last_seen <= timeout_threshold else 'offline'
    
    def _evaluate_cpu_health(self, cpu_usage: float) -> Tuple[str, str]:
        """
        Evaluate CPU health based on usage percentage.
        
        Args:
            cpu_usage: CPU usage percentage (0-100)
            
        Returns:
            Tuple[str, str]: (status, severity) where status is 'normal'/'warning'/'critical'
                           and severity is 'none'/'warning'/'critical'
        """
        if cpu_usage >= self.thresholds.cpu_critical_threshold:
            return 'critical', 'critical'
        elif cpu_usage >= self.thresholds.cpu_warning_threshold:
            return 'warning', 'warning'
        else:
            return 'normal', 'none'
    
    def _evaluate_memory_health(self, memory_percentage: float) -> Tuple[str, str]:
        """
        Evaluate memory health based on usage percentage.
        
        Args:
            memory_percentage: Memory usage percentage (0-100)
            
        Returns:
            Tuple[str, str]: (status, severity)
        """
        if memory_percentage >= self.thresholds.memory_critical_threshold:
            return 'critical', 'critical'
        elif memory_percentage >= self.thresholds.memory_warning_threshold:
            return 'warning', 'warning'
        else:
            return 'normal', 'none'
    
    def _evaluate_disk_health(self, disk_usage_list: List[Dict]) -> Tuple[str, str]:
        """
        Evaluate disk health based on usage across all filesystems.
        
        Args:
            disk_usage_list: List of disk usage dictionaries
            
        Returns:
            Tuple[str, str]: (status, severity) based on highest disk usage
        """
        if not disk_usage_list:
            return 'normal', 'none'
        
        max_disk_usage = max(
            disk.get('percentage', 0) for disk in disk_usage_list
        )
        
        if max_disk_usage >= self.thresholds.disk_critical_threshold:
            return 'critical', 'critical'
        elif max_disk_usage >= self.thresholds.disk_warning_threshold:
            return 'warning', 'warning'
        else:
            return 'normal', 'none'
    
    def _determine_overall_status(self, cpu_severity: str, memory_severity: str, 
                                disk_severity: str, has_failed_services: bool) -> str:
        """
        Determine overall server health status based on component severities.
        
        Args:
            cpu_severity: CPU severity level
            memory_severity: Memory severity level
            disk_severity: Disk severity level
            has_failed_services: Whether server has failed services
            
        Returns:
            str: Overall status ('healthy', 'warning', 'down')
        """
        severities = [cpu_severity, memory_severity, disk_severity]
        
        # If any component is critical, server is in warning state
        if 'critical' in severities:
            return 'warning'
        
        # If any component has warnings or there are failed services, server is in warning state
        if 'warning' in severities or has_failed_services:
            return 'warning'
        
        # All components normal and no failed services
        return 'healthy'


# Global health status manager instance
health_status_manager = HealthStatusManager()