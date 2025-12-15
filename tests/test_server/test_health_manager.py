"""
Unit tests for the HealthStatusManager class.

Tests health status evaluation logic, server classification, and database operations.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

from server.health.manager import HealthStatusManager, HealthThresholds
from server.database.models import Server, Metric, HealthStatus


class TestHealthStatusManager:
    """Test cases for HealthStatusManager class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.mock_connection_manager = Mock()
        self.mock_session = Mock()
        
        # Set up context manager mock properly
        context_manager = Mock()
        context_manager.__enter__ = Mock(return_value=self.mock_session)
        context_manager.__exit__ = Mock(return_value=None)
        self.mock_connection_manager.get_session.return_value = context_manager
        
        self.thresholds = HealthThresholds(
            cpu_warning_threshold=80.0,
            cpu_critical_threshold=90.0,
            memory_warning_threshold=80.0,
            memory_critical_threshold=90.0,
            disk_warning_threshold=70.0,
            disk_critical_threshold=80.0,
            offline_timeout_minutes=5
        )
        
        self.manager = HealthStatusManager(
            connection_manager=self.mock_connection_manager,
            thresholds=self.thresholds
        )
    
    @patch('server.health.manager.ServerOperations')
    @patch('server.health.manager.MetricOperations')
    @patch('server.health.manager.HealthStatusOperations')
    def test_evaluate_server_health_healthy_server(self, mock_health_ops, mock_metric_ops, mock_server_ops):
        """Test health evaluation for a healthy server."""
        # Setup mock data
        server = Mock()
        server.server_id = "test-server"
        server.last_seen = datetime.utcnow() - timedelta(minutes=1)  # Recent
        
        metric = Mock()
        metric.cpu_usage = 50.0
        metric.memory_percentage = 60.0
        metric.disk_usage = [{'percentage': 40.0}, {'percentage': 50.0}]
        metric.failed_services = []
        
        mock_server_ops.get_server.return_value = server
        mock_metric_ops.get_latest_metrics.return_value = [metric]
        
        # Execute
        result = self.manager.evaluate_server_health("test-server")
        
        # Verify
        assert result == "healthy"
        mock_health_ops.update_health_status.assert_called_once()
        call_args = mock_health_ops.update_health_status.call_args
        assert call_args[0][1] == "test-server"  # server_id
        assert call_args[0][2] == "healthy"      # status
    
    @patch('server.health.manager.ServerOperations')
    @patch('server.health.manager.MetricOperations')
    @patch('server.health.manager.HealthStatusOperations')
    def test_evaluate_server_health_warning_high_cpu(self, mock_health_ops, mock_metric_ops, mock_server_ops):
        """Test health evaluation for server with high CPU usage."""
        # Setup mock data
        server = Mock()
        server.server_id = "test-server"
        server.last_seen = datetime.utcnow() - timedelta(minutes=1)
        
        metric = Mock()
        metric.cpu_usage = 95.0  # Critical CPU
        metric.memory_percentage = 60.0
        metric.disk_usage = [{'percentage': 40.0}]
        metric.failed_services = []
        
        mock_server_ops.get_server.return_value = server
        mock_metric_ops.get_latest_metrics.return_value = [metric]
        
        # Execute
        result = self.manager.evaluate_server_health("test-server")
        
        # Verify
        assert result == "warning"
        mock_health_ops.update_health_status.assert_called_once()
        call_args = mock_health_ops.update_health_status.call_args
        assert call_args[0][2] == "warning"  # status
        assert call_args[1]['cpu_status'] == "critical"
    
    @patch('server.health.manager.ServerOperations')
    @patch('server.health.manager.MetricOperations')
    @patch('server.health.manager.HealthStatusOperations')
    def test_evaluate_server_health_warning_high_disk(self, mock_health_ops, mock_metric_ops, mock_server_ops):
        """Test health evaluation for server with high disk usage."""
        # Setup mock data
        server = Mock()
        server.server_id = "test-server"
        server.last_seen = datetime.utcnow() - timedelta(minutes=1)
        
        metric = Mock()
        metric.cpu_usage = 50.0
        metric.memory_percentage = 60.0
        metric.disk_usage = [{'percentage': 85.0}, {'percentage': 40.0}]  # One critical disk
        metric.failed_services = []
        
        mock_server_ops.get_server.return_value = server
        mock_metric_ops.get_latest_metrics.return_value = [metric]
        
        # Execute
        result = self.manager.evaluate_server_health("test-server")
        
        # Verify
        assert result == "warning"
        call_args = mock_health_ops.update_health_status.call_args
        assert call_args[1]['disk_status'] == "critical"
    
    @patch('server.health.manager.ServerOperations')
    @patch('server.health.manager.MetricOperations')
    @patch('server.health.manager.HealthStatusOperations')
    def test_evaluate_server_health_warning_failed_services(self, mock_health_ops, mock_metric_ops, mock_server_ops):
        """Test health evaluation for server with failed services."""
        # Setup mock data
        server = Mock()
        server.server_id = "test-server"
        server.last_seen = datetime.utcnow() - timedelta(minutes=1)
        
        metric = Mock()
        metric.cpu_usage = 50.0
        metric.memory_percentage = 60.0
        metric.disk_usage = [{'percentage': 40.0}]
        metric.failed_services = [{'name': 'nginx', 'status': 'failed'}]  # Has failed services
        
        mock_server_ops.get_server.return_value = server
        mock_metric_ops.get_latest_metrics.return_value = [metric]
        
        # Execute
        result = self.manager.evaluate_server_health("test-server")
        
        # Verify
        assert result == "warning"
    
    @patch('server.health.manager.ServerOperations')
    @patch('server.health.manager.HealthStatusOperations')
    def test_evaluate_server_health_down_offline(self, mock_health_ops, mock_server_ops):
        """Test health evaluation for offline server."""
        # Setup mock data - server offline for 10 minutes
        server = Mock()
        server.server_id = "test-server"
        server.last_seen = datetime.utcnow() - timedelta(minutes=10)
        
        mock_server_ops.get_server.return_value = server
        
        # Execute
        result = self.manager.evaluate_server_health("test-server")
        
        # Verify
        assert result == "down"
        mock_health_ops.update_health_status.assert_called_once()
        call_args = mock_health_ops.update_health_status.call_args
        assert call_args[0][2] == "down"  # status
        assert call_args[1]['connectivity_status'] == "offline"
    
    @patch('server.health.manager.ServerOperations')
    def test_evaluate_server_health_server_not_found(self, mock_server_ops):
        """Test health evaluation for non-existent server."""
        mock_server_ops.get_server.return_value = None
        
        # Execute
        result = self.manager.evaluate_server_health("nonexistent-server")
        
        # Verify
        assert result == "down"
    
    @patch('server.health.manager.ServerOperations')
    @patch('server.health.manager.MetricOperations')
    @patch('server.health.manager.HealthStatusOperations')
    def test_evaluate_server_health_no_metrics(self, mock_health_ops, mock_metric_ops, mock_server_ops):
        """Test health evaluation for server with no metrics."""
        # Setup mock data
        server = Mock()
        server.server_id = "test-server"
        server.last_seen = datetime.utcnow() - timedelta(minutes=1)
        
        mock_server_ops.get_server.return_value = server
        mock_metric_ops.get_latest_metrics.return_value = []  # No metrics
        
        # Execute
        result = self.manager.evaluate_server_health("test-server")
        
        # Verify
        assert result == "warning"
        call_args = mock_health_ops.update_health_status.call_args
        assert call_args[0][2] == "warning"  # status
    
    def test_evaluate_connectivity_online(self):
        """Test connectivity evaluation for online server."""
        recent_time = datetime.utcnow() - timedelta(minutes=2)
        result = self.manager._evaluate_connectivity(recent_time)
        assert result == "online"
    
    def test_evaluate_connectivity_offline(self):
        """Test connectivity evaluation for offline server."""
        old_time = datetime.utcnow() - timedelta(minutes=10)
        result = self.manager._evaluate_connectivity(old_time)
        assert result == "offline"
    
    def test_evaluate_connectivity_none_timestamp(self):
        """Test connectivity evaluation with None timestamp."""
        result = self.manager._evaluate_connectivity(None)
        assert result == "offline"
    
    def test_evaluate_cpu_health_normal(self):
        """Test CPU health evaluation for normal usage."""
        status, severity = self.manager._evaluate_cpu_health(50.0)
        assert status == "normal"
        assert severity == "none"
    
    def test_evaluate_cpu_health_warning(self):
        """Test CPU health evaluation for warning level usage."""
        status, severity = self.manager._evaluate_cpu_health(85.0)
        assert status == "warning"
        assert severity == "warning"
    
    def test_evaluate_cpu_health_critical(self):
        """Test CPU health evaluation for critical usage."""
        status, severity = self.manager._evaluate_cpu_health(95.0)
        assert status == "critical"
        assert severity == "critical"
    
    def test_evaluate_memory_health_normal(self):
        """Test memory health evaluation for normal usage."""
        status, severity = self.manager._evaluate_memory_health(60.0)
        assert status == "normal"
        assert severity == "none"
    
    def test_evaluate_memory_health_warning(self):
        """Test memory health evaluation for warning level usage."""
        status, severity = self.manager._evaluate_memory_health(85.0)
        assert status == "warning"
        assert severity == "warning"
    
    def test_evaluate_memory_health_critical(self):
        """Test memory health evaluation for critical usage."""
        status, severity = self.manager._evaluate_memory_health(95.0)
        assert status == "critical"
        assert severity == "critical"
    
    def test_evaluate_disk_health_normal(self):
        """Test disk health evaluation for normal usage."""
        disk_usage = [{'percentage': 40.0}, {'percentage': 50.0}]
        status, severity = self.manager._evaluate_disk_health(disk_usage)
        assert status == "normal"
        assert severity == "none"
    
    def test_evaluate_disk_health_warning(self):
        """Test disk health evaluation for warning level usage."""
        disk_usage = [{'percentage': 40.0}, {'percentage': 75.0}]
        status, severity = self.manager._evaluate_disk_health(disk_usage)
        assert status == "warning"
        assert severity == "warning"
    
    def test_evaluate_disk_health_critical(self):
        """Test disk health evaluation for critical usage."""
        disk_usage = [{'percentage': 40.0}, {'percentage': 85.0}]
        status, severity = self.manager._evaluate_disk_health(disk_usage)
        assert status == "critical"
        assert severity == "critical"
    
    def test_evaluate_disk_health_empty_list(self):
        """Test disk health evaluation with empty disk list."""
        status, severity = self.manager._evaluate_disk_health([])
        assert status == "normal"
        assert severity == "none"
    
    def test_determine_overall_status_healthy(self):
        """Test overall status determination for healthy server."""
        result = self.manager._determine_overall_status("none", "none", "none", False)
        assert result == "healthy"
    
    def test_determine_overall_status_warning_cpu_critical(self):
        """Test overall status determination with critical CPU."""
        result = self.manager._determine_overall_status("critical", "none", "none", False)
        assert result == "warning"
    
    def test_determine_overall_status_warning_memory_warning(self):
        """Test overall status determination with memory warning."""
        result = self.manager._determine_overall_status("none", "warning", "none", False)
        assert result == "warning"
    
    def test_determine_overall_status_warning_failed_services(self):
        """Test overall status determination with failed services."""
        result = self.manager._determine_overall_status("none", "none", "none", True)
        assert result == "warning"
    
    @patch('server.health.manager.HealthStatusOperations')
    def test_get_server_health_summary_success(self, mock_health_ops):
        """Test getting server health summary successfully."""
        # Setup mock health status
        mock_health_status = Mock()
        mock_health_status.status = "healthy"
        mock_health_status.last_check = datetime(2024, 12, 15, 10, 30, 0)
        mock_health_status.status_since = datetime(2024, 12, 15, 9, 0, 0)
        mock_health_status.cpu_status = "normal"
        mock_health_status.memory_status = "normal"
        mock_health_status.disk_status = "normal"
        mock_health_status.connectivity_status = "online"
        mock_health_status.last_cpu_usage = 45.2
        mock_health_status.last_memory_percentage = 60.5
        mock_health_status.last_disk_usage_max = 55.0
        
        mock_health_ops.get_health_status.return_value = mock_health_status
        
        # Execute
        result = self.manager.get_server_health_summary("test-server")
        
        # Verify
        assert result is not None
        assert result['server_id'] == "test-server"
        assert result['overall_status'] == "healthy"
        assert result['components']['cpu']['status'] == "normal"
        assert result['components']['cpu']['last_value'] == 45.2
        assert result['components']['memory']['status'] == "normal"
        assert result['components']['disk']['status'] == "normal"
        assert result['components']['connectivity']['status'] == "online"
    
    @patch('server.health.manager.HealthStatusOperations')
    def test_get_server_health_summary_not_found(self, mock_health_ops):
        """Test getting server health summary for non-existent server."""
        mock_health_ops.get_health_status.return_value = None
        
        # Execute
        result = self.manager.get_server_health_summary("nonexistent-server")
        
        # Verify
        assert result is None
    
    @patch('server.health.manager.ServerOperations')
    def test_evaluate_all_servers_health(self, mock_server_ops):
        """Test evaluating health for all servers."""
        # Setup mock servers
        server1 = Mock()
        server1.server_id = "server-1"
        server2 = Mock()
        server2.server_id = "server-2"
        
        mock_server_ops.get_all_servers.return_value = [server1, server2]
        
        # Mock the evaluate_server_health method
        with patch.object(self.manager, 'evaluate_server_health') as mock_evaluate:
            mock_evaluate.side_effect = ["healthy", "warning"]
            
            # Execute
            result = self.manager.evaluate_all_servers_health()
            
            # Verify
            assert result == {"server-1": "healthy", "server-2": "warning"}
            assert mock_evaluate.call_count == 2
    
    def test_health_thresholds_defaults(self):
        """Test HealthThresholds default values."""
        thresholds = HealthThresholds()
        assert thresholds.cpu_warning_threshold == 80.0
        assert thresholds.cpu_critical_threshold == 90.0
        assert thresholds.memory_warning_threshold == 80.0
        assert thresholds.memory_critical_threshold == 90.0
        assert thresholds.disk_warning_threshold == 70.0
        assert thresholds.disk_critical_threshold == 80.0
        assert thresholds.offline_timeout_minutes == 5
    
    def test_health_thresholds_custom_values(self):
        """Test HealthThresholds with custom values."""
        thresholds = HealthThresholds(
            cpu_warning_threshold=70.0,
            cpu_critical_threshold=85.0,
            offline_timeout_minutes=10
        )
        assert thresholds.cpu_warning_threshold == 70.0
        assert thresholds.cpu_critical_threshold == 85.0
        assert thresholds.offline_timeout_minutes == 10
        # Other values should remain default
        assert thresholds.memory_warning_threshold == 80.0