"""
Metrics aggregation service for historical data analysis.

This module provides functionality for aggregating and analyzing historical
server metrics data for dashboard visualization and reporting.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from server.database.models import Metric, Server


class MetricsAggregationService:
    """
    Service for aggregating and analyzing historical metrics data.
    
    Provides functionality for time-series data aggregation, statistical
    analysis, and data preparation for dashboard visualization.
    """
    
    def __init__(self, db_session: Session):
        """
        Initialize the metrics aggregation service.
        
        Args:
            db_session: SQLAlchemy database session for database operations
        """
        self.db_session = db_session
    
    def get_metrics_for_time_range(self, server_id: str, start_time: datetime, 
                                 end_time: datetime, interval_minutes: int = 5) -> List[Dict[str, Any]]:
        """
        Get aggregated metrics for a server within a time range.
        
        Args:
            server_id: ID of the server to get metrics for
            start_time: Start of the time range
            end_time: End of the time range
            interval_minutes: Aggregation interval in minutes
            
        Returns:
            List of aggregated metric data points
        """
        try:
            # Calculate interval for aggregation
            interval_seconds = interval_minutes * 60
            
            # Query metrics within time range
            metrics = self.db_session.query(Metric).filter(
                and_(
                    Metric.server_id == server_id,
                    Metric.timestamp >= start_time,
                    Metric.timestamp <= end_time
                )
            ).order_by(Metric.timestamp).all()
            
            if not metrics:
                return []
            
            # Group metrics by time intervals
            aggregated_data = []
            current_interval_start = start_time
            
            while current_interval_start < end_time:
                interval_end = current_interval_start + timedelta(seconds=interval_seconds)
                
                # Get metrics within this interval
                interval_metrics = [
                    m for m in metrics 
                    if current_interval_start <= m.timestamp < interval_end
                ]
                
                if interval_metrics:
                    # Calculate aggregated values for this interval
                    aggregated_point = self._aggregate_metrics_data(interval_metrics, current_interval_start)
                    aggregated_data.append(aggregated_point)
                
                current_interval_start = interval_end
            
            return aggregated_data
            
        except Exception as e:
            return []
    
    def get_latest_metrics_summary(self, server_id: str, limit: int = 100) -> Dict[str, Any]:
        """
        Get a summary of the latest metrics for a server.
        
        Args:
            server_id: ID of the server to get metrics summary for
            limit: Maximum number of recent metrics to analyze
            
        Returns:
            Dictionary containing metrics summary statistics
        """
        try:
            # Get latest metrics
            latest_metrics = self.db_session.query(Metric).filter(
                Metric.server_id == server_id
            ).order_by(desc(Metric.timestamp)).limit(limit).all()
            
            if not latest_metrics:
                return {}
            
            # Calculate summary statistics
            cpu_values = [m.cpu_usage for m in latest_metrics]
            memory_values = [m.memory_percentage for m in latest_metrics]
            
            # Get disk usage statistics (max across all mountpoints)
            disk_values = []
            for metric in latest_metrics:
                if metric.disk_usage:
                    max_disk = max([disk.get('percentage', 0) for disk in metric.disk_usage])
                    disk_values.append(max_disk)
            
            # Load average statistics
            load_1min_values = [m.load_1min for m in latest_metrics]
            load_5min_values = [m.load_5min for m in latest_metrics]
            load_15min_values = [m.load_15min for m in latest_metrics]
            
            summary = {
                "server_id": server_id,
                "data_points": len(latest_metrics),
                "time_range": {
                    "start": latest_metrics[-1].timestamp.isoformat() + "Z",
                    "end": latest_metrics[0].timestamp.isoformat() + "Z"
                },
                "cpu": self._calculate_statistics(cpu_values),
                "memory": self._calculate_statistics(memory_values),
                "disk": self._calculate_statistics(disk_values) if disk_values else {},
                "load_average": {
                    "1min": self._calculate_statistics(load_1min_values),
                    "5min": self._calculate_statistics(load_5min_values),
                    "15min": self._calculate_statistics(load_15min_values)
                },
                "latest": {
                    "timestamp": latest_metrics[0].timestamp.isoformat() + "Z",
                    "cpu_usage": latest_metrics[0].cpu_usage,
                    "memory_percentage": latest_metrics[0].memory_percentage,
                    "uptime": latest_metrics[0].uptime,
                    "failed_services_count": len(latest_metrics[0].failed_services or [])
                }
            }
            
            return summary
            
        except Exception as e:
            return {}
    
    def get_server_metrics_overview(self, time_range_hours: int = 24) -> List[Dict[str, Any]]:
        """
        Get metrics overview for all servers within a time range.
        
        Args:
            time_range_hours: Number of hours to look back for metrics
            
        Returns:
            List of server metrics overviews
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=time_range_hours)
            
            # Get all active servers
            servers = self.db_session.query(Server).filter(
                Server.is_active == True
            ).all()
            
            overview_data = []
            
            for server in servers:
                # Get latest metric for this server
                latest_metric = self.db_session.query(Metric).filter(
                    and_(
                        Metric.server_id == server.server_id,
                        Metric.timestamp >= cutoff_time
                    )
                ).order_by(desc(Metric.timestamp)).first()
                
                if latest_metric:
                    # Calculate max disk usage
                    max_disk_usage = 0
                    if latest_metric.disk_usage:
                        max_disk_usage = max([disk.get('percentage', 0) for disk in latest_metric.disk_usage])
                    
                    server_overview = {
                        "server_id": server.server_id,
                        "hostname": server.hostname,
                        "ip_address": server.ip_address,
                        "last_seen": server.last_seen.isoformat() + "Z",
                        "status": self._determine_server_status(latest_metric),
                        "current_metrics": {
                            "timestamp": latest_metric.timestamp.isoformat() + "Z",
                            "cpu_usage": latest_metric.cpu_usage,
                            "memory_percentage": latest_metric.memory_percentage,
                            "max_disk_usage": max_disk_usage,
                            "load_1min": latest_metric.load_1min,
                            "uptime": latest_metric.uptime,
                            "failed_services_count": len(latest_metric.failed_services or [])
                        }
                    }
                else:
                    # Server has no recent metrics
                    server_overview = {
                        "server_id": server.server_id,
                        "hostname": server.hostname,
                        "ip_address": server.ip_address,
                        "last_seen": server.last_seen.isoformat() + "Z",
                        "status": "offline",
                        "current_metrics": None
                    }
                
                overview_data.append(server_overview)
            
            return overview_data
            
        except Exception as e:
            return []
    
    def get_alert_worthy_metrics(self, cpu_threshold: float = 80.0, 
                               memory_threshold: float = 85.0,
                               disk_threshold: float = 90.0,
                               time_range_minutes: int = 60) -> List[Dict[str, Any]]:
        """
        Get metrics that exceed alert thresholds within a time range.
        
        Args:
            cpu_threshold: CPU usage threshold percentage
            memory_threshold: Memory usage threshold percentage
            disk_threshold: Disk usage threshold percentage
            time_range_minutes: Time range to check in minutes
            
        Returns:
            List of metrics that exceed thresholds
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=time_range_minutes)
            
            # Query metrics that exceed thresholds
            alert_metrics = self.db_session.query(Metric).filter(
                and_(
                    Metric.timestamp >= cutoff_time,
                    func.or_(
                        Metric.cpu_usage >= cpu_threshold,
                        Metric.memory_percentage >= memory_threshold
                    )
                )
            ).order_by(desc(Metric.timestamp)).all()
            
            alert_data = []
            
            for metric in alert_metrics:
                alerts = []
                
                # Check CPU threshold
                if metric.cpu_usage >= cpu_threshold:
                    alerts.append({
                        "type": "cpu",
                        "threshold": cpu_threshold,
                        "actual": metric.cpu_usage,
                        "severity": "critical" if metric.cpu_usage >= 95 else "warning"
                    })
                
                # Check memory threshold
                if metric.memory_percentage >= memory_threshold:
                    alerts.append({
                        "type": "memory",
                        "threshold": memory_threshold,
                        "actual": metric.memory_percentage,
                        "severity": "critical" if metric.memory_percentage >= 95 else "warning"
                    })
                
                # Check disk thresholds
                if metric.disk_usage:
                    for disk in metric.disk_usage:
                        disk_percentage = disk.get('percentage', 0)
                        if disk_percentage >= disk_threshold:
                            alerts.append({
                                "type": "disk",
                                "mountpoint": disk.get('mountpoint', 'unknown'),
                                "threshold": disk_threshold,
                                "actual": disk_percentage,
                                "severity": "critical" if disk_percentage >= 98 else "warning"
                            })
                
                if alerts:
                    alert_data.append({
                        "server_id": metric.server_id,
                        "timestamp": metric.timestamp.isoformat() + "Z",
                        "alerts": alerts
                    })
            
            return alert_data
            
        except Exception as e:
            return []
    
    def _aggregate_metrics_data(self, metrics: List[Metric], timestamp: datetime) -> Dict[str, Any]:
        """
        Aggregate a list of metrics into a single data point.
        
        Args:
            metrics: List of Metric objects to aggregate
            timestamp: Timestamp for the aggregated data point
            
        Returns:
            Dictionary containing aggregated metrics data
        """
        if not metrics:
            return {}
        
        # Calculate averages for numeric values
        cpu_values = [m.cpu_usage for m in metrics]
        memory_values = [m.memory_percentage for m in metrics]
        load_1min_values = [m.load_1min for m in metrics]
        load_5min_values = [m.load_5min for m in metrics]
        load_15min_values = [m.load_15min for m in metrics]
        
        # Aggregate disk usage (average of max values)
        disk_max_values = []
        for metric in metrics:
            if metric.disk_usage:
                max_disk = max([disk.get('percentage', 0) for disk in metric.disk_usage])
                disk_max_values.append(max_disk)
        
        # Count failed services
        total_failed_services = sum([len(m.failed_services or []) for m in metrics])
        
        return {
            "timestamp": timestamp.isoformat() + "Z",
            "cpu_usage": sum(cpu_values) / len(cpu_values),
            "memory_percentage": sum(memory_values) / len(memory_values),
            "max_disk_usage": sum(disk_max_values) / len(disk_max_values) if disk_max_values else 0,
            "load_1min": sum(load_1min_values) / len(load_1min_values),
            "load_5min": sum(load_5min_values) / len(load_5min_values),
            "load_15min": sum(load_15min_values) / len(load_15min_values),
            "failed_services_count": total_failed_services / len(metrics),
            "data_points": len(metrics)
        }
    
    def _calculate_statistics(self, values: List[float]) -> Dict[str, float]:
        """
        Calculate basic statistics for a list of values.
        
        Args:
            values: List of numeric values
            
        Returns:
            Dictionary containing statistical measures
        """
        if not values:
            return {}
        
        sorted_values = sorted(values)
        n = len(values)
        
        stats = {
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / n,
            "median": sorted_values[n // 2] if n % 2 == 1 else (sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2
        }
        
        # Calculate standard deviation
        if n > 1:
            variance = sum([(x - stats["avg"]) ** 2 for x in values]) / (n - 1)
            stats["std_dev"] = variance ** 0.5
        else:
            stats["std_dev"] = 0
        
        return stats
    
    def _determine_server_status(self, metric: Metric) -> str:
        """
        Determine server status based on latest metrics.
        
        Args:
            metric: Latest metric for the server
            
        Returns:
            Status string: 'online', 'warning', or 'critical'
        """
        # Check for critical conditions
        if metric.cpu_usage >= 95 or metric.memory_percentage >= 95:
            return "critical"
        
        # Check for warning conditions
        if metric.cpu_usage >= 80 or metric.memory_percentage >= 85:
            return "warning"
        
        # Check disk usage
        if metric.disk_usage:
            max_disk = max([disk.get('percentage', 0) for disk in metric.disk_usage])
            if max_disk >= 98:
                return "critical"
            elif max_disk >= 90:
                return "warning"
        
        # Check for failed services
        if metric.failed_services and len(metric.failed_services) > 0:
            return "warning"
        
        return "online"