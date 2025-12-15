"""
Tests for AlertEngine functionality.

Tests the alert engine's ability to evaluate metrics, trigger alerts,
and send notifications according to the requirements.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from server.alerts.engine import AlertEngine
from server.database.models import Alert, Server, Metric
from shared.models import SystemMetrics, MemoryInfo, DiskUsage, LoadAverage, FailedService


class TestAlertEngine:
    """Test cases for AlertEngine class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.mock_session = Mock(spec=Session)
        self.webhook_urls = ["http://webhook1.example.com", "http://webhook2.example.com"]
        self.alert_engine = AlertEngine(self.mock_session, self.webhook_urls)
    
    def create_test_metrics(self, cpu_usage=50.0, disk_percentages=None, server_id="test-server"):
        """Create test SystemMetrics object."""
        if disk_percentages is None:
            disk_percentages = [30.0]
        
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
            failed_services=[]
        )
    
    def test_init_with_default_thresholds(self):
        """Test AlertEngine initialization with default thresholds."""
        engine = AlertEngine(self.mock_session)
        
        assert engine.cpu_threshold == 90.0
        assert engine.disk_threshold == 80.0
        assert engine.offline_timeout == 300
        assert engine.webhook_urls == []
    
    @patch.dict('os.environ', {
        'ALERT_CPU_THRESHOLD': '85.0',
        'ALERT_DISK_THRESHOLD': '75.0',
        'ALERT_OFFLINE_TIMEOUT': '600'
    })
    def test_init_with_custom_thresholds(self):
        """Test AlertEngine initialization with custom thresholds from environment."""
        engine = AlertEngine(self.mock_session)
        
        assert engine.cpu_threshold == 85.0
        assert engine.disk_threshold == 75.0
        assert engine.offline_timeout == 600
    
    @patch('server.database.operations.AlertOperations.create_alert')
    @patch('server.database.operations.AlertOperations.get_active_alerts')
    def test_evaluate_metrics_cpu_threshold_exceeded(self, mock_get_alerts, mock_create_alert):
        """Test CPU threshold alert triggering."""
        # Setup
        mock_get_alerts.return_value = []  # No existing alerts
        mock_alert = Mock(spec=Alert)
        mock_create_alert.return_value = mock_alert
        
        # Create metrics with high CPU usage
        metrics = self.create_test_metrics(cpu_usage=95.0)
        
        # Execute
        with patch.object(self.alert_engine, '_process_alert') as mock_process:
            alerts = self.alert_engine.evaluate_metrics(metrics)
        
        # Verify
        assert len(alerts) == 1
        mock_create_alert.assert_called_once()
        mock_process.assert_called_once_with(mock_alert)
        
        # Check alert creation parameters
        call_args = mock_create_alert.call_args
        assert call_args[1]['alert_type'] == 'cpu'
        assert call_args[1]['severity'] == 'critical'  # > 95%
        assert call_args[1]['actual_value'] == 95.0
    
    @patch('server.database.operations.AlertOperations.create_alert')
    @patch('server.database.operations.AlertOperations.get_active_alerts')
    def test_evaluate_metrics_disk_threshold_exceeded(self, mock_get_alerts, mock_create_alert):
        """Test disk threshold alert triggering."""
        # Setup
        mock_get_alerts.return_value = []  # No existing alerts
        mock_alert = Mock(spec=Alert)
        mock_create_alert.return_value = mock_alert
        
        # Create metrics with high disk usage
        metrics = self.create_test_metrics(disk_percentages=[85.0, 30.0])  # One high, one normal
        
        # Execute
        with patch.object(self.alert_engine, '_process_alert') as mock_process:
            alerts = self.alert_engine.evaluate_metrics(metrics)
        
        # Verify
        assert len(alerts) == 1
        mock_create_alert.assert_called_once()
        mock_process.assert_called_once_with(mock_alert)
        
        # Check alert creation parameters
        call_args = mock_create_alert.call_args
        assert call_args[1]['alert_type'] == 'disk'
        assert call_args[1]['severity'] == 'warning'  # < 90%
        assert call_args[1]['actual_value'] == 85.0
    
    @patch('server.database.operations.AlertOperations.get_active_alerts')
    def test_evaluate_metrics_no_alerts_when_existing_active(self, mock_get_alerts):
        """Test that no new alerts are created when active alerts already exist."""
        # Setup - existing active CPU alert
        existing_alert = Mock(spec=Alert)
        existing_alert.alert_type = 'cpu'
        mock_get_alerts.return_value = [existing_alert]
        
        # Create metrics with high CPU usage
        metrics = self.create_test_metrics(cpu_usage=95.0)
        
        # Execute
        alerts = self.alert_engine.evaluate_metrics(metrics)
        
        # Verify - no new alerts created
        assert len(alerts) == 0
    
    @patch('server.database.operations.AlertOperations.create_alert')
    @patch('server.database.operations.AlertOperations.get_active_alerts')
    @patch('server.database.operations.ServerOperations.get_all_servers')
    @patch('server.database.operations.HealthStatusOperations.update_health_status')
    def test_check_offline_servers(self, mock_update_health, mock_get_servers, 
                                  mock_get_alerts, mock_create_alert):
        """Test offline server detection and alert creation."""
        # Setup
        old_time = datetime.utcnow() - timedelta(seconds=600)  # 10 minutes ago
        mock_server = Mock(spec=Server)
        mock_server.server_id = "offline-server"
        mock_server.last_seen = old_time
        
        mock_get_servers.return_value = [mock_server]
        mock_get_alerts.return_value = []  # No existing alerts
        mock_alert = Mock(spec=Alert)
        mock_create_alert.return_value = mock_alert
        
        # Execute
        with patch.object(self.alert_engine, '_process_alert') as mock_process:
            alerts = self.alert_engine.check_offline_servers()
        
        # Verify
        assert len(alerts) == 1
        mock_create_alert.assert_called_once()
        mock_process.assert_called_once_with(mock_alert)
        mock_update_health.assert_called_once()
        
        # Check alert creation parameters
        call_args = mock_create_alert.call_args
        assert call_args[1]['alert_type'] == 'offline'
        assert call_args[1]['severity'] == 'critical'
    
    @patch('server.alerts.engine.logger')
    def test_log_alert(self, mock_logger):
        """Test alert logging functionality."""
        # Setup
        mock_alert = Mock(spec=Alert)
        mock_alert.severity = 'critical'
        mock_alert.alert_type = 'cpu'
        mock_alert.message = "High CPU usage"
        
        # Execute
        self.alert_engine._log_alert(mock_alert)
        
        # Verify
        mock_logger.log.assert_called_once()
        call_args = mock_logger.log.call_args
        assert call_args[0][1] == "ALERT [CRITICAL] CPU: High CPU usage"
    
    @patch('requests.post')
    @patch('server.database.operations.AlertOperations.update_webhook_status')
    def test_send_webhook_success(self, mock_update_status, mock_post):
        """Test successful webhook notification."""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        payload = {"test": "data"}
        
        # Execute
        result = self.alert_engine._send_webhook("http://test.com", payload, 123)
        
        # Verify
        assert result is True
        mock_post.assert_called_once()
        mock_update_status.assert_called_once_with(
            session=self.mock_session,
            alert_id=123,
            response_code=200
        )
    
    @patch('requests.post')
    @patch('server.database.operations.AlertOperations.update_webhook_status')
    def test_send_webhook_failure_with_retry(self, mock_update_status, mock_post):
        """Test webhook failure with retry logic."""
        # Setup - all attempts fail
        mock_post.side_effect = Exception("Connection failed")
        
        payload = {"test": "data"}
        
        # Execute
        result = self.alert_engine._send_webhook("http://test.com", payload, 123)
        
        # Verify
        assert result is False
        assert mock_post.call_count == self.alert_engine.webhook_retry_attempts
        mock_update_status.assert_called_once_with(
            session=self.mock_session,
            alert_id=123,
            response_code=0  # 0 indicates network failure
        )
    
    def test_create_webhook_payload(self):
        """Test webhook payload creation."""
        # Setup
        mock_alert = Mock(spec=Alert)
        mock_alert.id = 123
        mock_alert.server_id = "test-server"
        mock_alert.alert_type = "cpu"
        mock_alert.severity = "warning"
        mock_alert.message = "High CPU usage"
        mock_alert.threshold_value = 90.0
        mock_alert.actual_value = 95.0
        mock_alert.triggered_at = datetime(2024, 1, 1, 12, 0, 0)
        
        # Execute
        payload = self.alert_engine._create_webhook_payload(mock_alert)
        
        # Verify
        assert payload["alert_id"] == 123
        assert payload["server_id"] == "test-server"
        assert payload["alert_type"] == "cpu"
        assert payload["severity"] == "warning"
        assert payload["message"] == "High CPU usage"
        assert payload["threshold_value"] == 90.0
        assert payload["actual_value"] == 95.0
        assert "timestamp" in payload
    
    @patch('server.database.operations.AlertOperations.get_active_alerts')
    @patch('server.database.operations.AlertOperations.resolve_alert')
    def test_resolve_alerts_for_server(self, mock_resolve, mock_get_alerts):
        """Test resolving alerts for a server."""
        # Setup
        mock_alert1 = Mock(spec=Alert)
        mock_alert1.id = 1
        mock_alert1.alert_type = "cpu"
        
        mock_alert2 = Mock(spec=Alert)
        mock_alert2.id = 2
        mock_alert2.alert_type = "disk"
        
        mock_get_alerts.return_value = [mock_alert1, mock_alert2]
        mock_resolve.return_value = True
        
        # Execute
        resolved_count = self.alert_engine.resolve_alerts_for_server("test-server", ["cpu"])
        
        # Verify
        assert resolved_count == 1  # Only CPU alert should be resolved
        mock_resolve.assert_called_once_with(self.mock_session, 1)
        self.mock_session.commit.assert_called_once()
    
    def test_get_alert_statistics(self):
        """Test alert statistics retrieval."""
        # Execute
        stats = self.alert_engine.get_alert_statistics()
        
        # Verify
        assert "thresholds" in stats
        assert "webhook_config" in stats
        assert stats["thresholds"]["cpu_threshold"] == 90.0
        assert stats["webhook_config"]["webhook_count"] == 2