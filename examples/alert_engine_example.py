#!/usr/bin/env python3
"""
Example usage of the AlertEngine for the Linux Server Health Monitoring System.

This script demonstrates how to:
1. Initialize the AlertEngine with webhook URLs
2. Evaluate metrics and trigger alerts
3. Check for offline servers
4. Handle webhook notifications

Run this script to see the AlertEngine in action with sample data.
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from unittest.mock import Mock

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.alerts.engine import AlertEngine
from shared.models import SystemMetrics, MemoryInfo, DiskUsage, LoadAverage, FailedService


def setup_logging():
    """Set up logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def create_sample_metrics(server_id: str, cpu_usage: float = 50.0, 
                         disk_percentages: list = None) -> SystemMetrics:
    """Create sample SystemMetrics for testing."""
    if disk_percentages is None:
        disk_percentages = [30.0, 45.0]
    
    disk_usage = [
        DiskUsage(
            mountpoint=f"/disk{i}",
            total=1000000000,
            used=int(1000000000 * (percentage / 100)),
            percentage=percentage
        )
        for i, percentage in enumerate(disk_percentages)
    ]
    
    return SystemMetrics(
        server_id=server_id,
        timestamp=datetime.utcnow().isoformat(),
        cpu_usage=cpu_usage,
        memory=MemoryInfo(total=8000000000, used=4000000000, percentage=50.0),
        disk_usage=disk_usage,
        load_average=LoadAverage(one_min=1.0, five_min=1.1, fifteen_min=0.9),
        uptime=86400,
        failed_services=[
            FailedService(name="nginx", status="failed", since="2024-12-15T10:00:00Z")
        ]
    )


def demo_alert_engine():
    """Demonstrate AlertEngine functionality."""
    logger = logging.getLogger(__name__)
    
    # Create a mock database session
    mock_session = Mock()
    
    # Configure webhook URLs (these are example URLs)
    webhook_urls = [
        "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
        "https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK"
    ]
    
    # Initialize AlertEngine with custom thresholds
    logger.info("Initializing AlertEngine...")
    alert_engine = AlertEngine(
        session=mock_session,
        webhook_urls=webhook_urls
    )
    
    # Display configuration
    stats = alert_engine.get_alert_statistics()
    logger.info(f"AlertEngine Configuration:")
    logger.info(f"  CPU Threshold: {stats['thresholds']['cpu_threshold']}%")
    logger.info(f"  Disk Threshold: {stats['thresholds']['disk_threshold']}%")
    logger.info(f"  Offline Timeout: {stats['thresholds']['offline_timeout']} seconds")
    logger.info(f"  Webhook URLs: {stats['webhook_config']['webhook_count']} configured")
    
    # Test 1: Normal metrics (no alerts should be triggered)
    logger.info("\n=== Test 1: Normal Metrics ===")
    normal_metrics = create_sample_metrics("server-001", cpu_usage=45.0, disk_percentages=[30.0, 50.0])
    
    # Mock database operations to return no existing alerts
    from server.database.operations import AlertOperations
    AlertOperations.get_active_alerts = Mock(return_value=[])
    AlertOperations.create_alert = Mock()
    
    alerts = alert_engine.evaluate_metrics(normal_metrics)
    logger.info(f"Normal metrics evaluation: {len(alerts)} alerts triggered")
    
    # Test 2: High CPU usage (should trigger CPU alert)
    logger.info("\n=== Test 2: High CPU Usage ===")
    high_cpu_metrics = create_sample_metrics("server-002", cpu_usage=95.0, disk_percentages=[30.0, 50.0])
    
    # Mock alert creation
    mock_cpu_alert = Mock()
    mock_cpu_alert.id = 1
    mock_cpu_alert.server_id = "server-002"
    mock_cpu_alert.alert_type = "cpu"
    mock_cpu_alert.severity = "critical"
    mock_cpu_alert.message = "High CPU usage on server-002: 95.0%"
    AlertOperations.create_alert = Mock(return_value=mock_cpu_alert)
    
    alerts = alert_engine.evaluate_metrics(high_cpu_metrics)
    logger.info(f"High CPU metrics evaluation: {len(alerts)} alerts triggered")
    
    # Test 3: High disk usage (should trigger disk alert)
    logger.info("\n=== Test 3: High Disk Usage ===")
    high_disk_metrics = create_sample_metrics("server-003", cpu_usage=45.0, disk_percentages=[85.0, 30.0])
    
    # Mock alert creation
    mock_disk_alert = Mock()
    mock_disk_alert.id = 2
    mock_disk_alert.server_id = "server-003"
    mock_disk_alert.alert_type = "disk"
    mock_disk_alert.severity = "warning"
    mock_disk_alert.message = "High disk usage on server-003: 85.0% (/disk0)"
    AlertOperations.create_alert = Mock(return_value=mock_disk_alert)
    
    alerts = alert_engine.evaluate_metrics(high_disk_metrics)
    logger.info(f"High disk metrics evaluation: {len(alerts)} alerts triggered")
    
    # Test 4: Check for offline servers
    logger.info("\n=== Test 4: Offline Server Detection ===")
    
    # Mock server operations
    from server.database.operations import ServerOperations, HealthStatusOperations
    
    # Create a mock offline server
    mock_offline_server = Mock()
    mock_offline_server.server_id = "server-offline"
    mock_offline_server.last_seen = datetime.utcnow() - timedelta(seconds=600)  # 10 minutes ago
    
    ServerOperations.get_all_servers = Mock(return_value=[mock_offline_server])
    AlertOperations.get_active_alerts = Mock(return_value=[])  # No existing alerts
    HealthStatusOperations.update_health_status = Mock()
    
    # Mock offline alert creation
    mock_offline_alert = Mock()
    mock_offline_alert.id = 3
    mock_offline_alert.server_id = "server-offline"
    mock_offline_alert.alert_type = "offline"
    mock_offline_alert.severity = "critical"
    mock_offline_alert.message = "Server server-offline has been offline for 10 minutes"
    AlertOperations.create_alert = Mock(return_value=mock_offline_alert)
    
    offline_alerts = alert_engine.check_offline_servers()
    logger.info(f"Offline server check: {len(offline_alerts)} alerts triggered")
    
    # Test 5: Webhook notification (mocked)
    logger.info("\n=== Test 5: Webhook Notification ===")
    
    # Mock requests.post for webhook testing
    import requests
    from unittest.mock import patch
    
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        # Mock webhook status update
        AlertOperations.update_webhook_status = Mock()
        
        # Test webhook sending
        test_payload = {"test": "webhook", "alert_id": 123}
        success = alert_engine._send_webhook("https://example.com/webhook", test_payload, 123)
        
        logger.info(f"Webhook notification test: {'Success' if success else 'Failed'}")
        logger.info(f"Webhook calls made: {mock_post.call_count}")
    
    # Test 6: Alert resolution
    logger.info("\n=== Test 6: Alert Resolution ===")
    
    # Mock active alerts
    mock_active_alert1 = Mock()
    mock_active_alert1.id = 1
    mock_active_alert1.alert_type = "cpu"
    
    mock_active_alert2 = Mock()
    mock_active_alert2.id = 2
    mock_active_alert2.alert_type = "disk"
    
    AlertOperations.get_active_alerts = Mock(return_value=[mock_active_alert1, mock_active_alert2])
    AlertOperations.resolve_alert = Mock(return_value=True)
    
    resolved_count = alert_engine.resolve_alerts_for_server("server-002", ["cpu"])
    logger.info(f"Alert resolution test: {resolved_count} alerts resolved")
    
    logger.info("\n=== AlertEngine Demo Complete ===")
    logger.info("The AlertEngine is ready for integration with the monitoring system!")


if __name__ == "__main__":
    setup_logging()
    
    print("Linux Server Health Monitoring System - AlertEngine Demo")
    print("=" * 60)
    
    try:
        demo_alert_engine()
    except Exception as e:
        logging.error(f"Demo failed: {e}")
        sys.exit(1)
    
    print("\nDemo completed successfully!")