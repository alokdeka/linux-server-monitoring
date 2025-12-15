"""
Tests for agent service orchestrator functionality.
"""

import pytest
import os
import tempfile
import yaml
import time
import threading
from unittest.mock import Mock, patch, MagicMock

from agent.service import AgentService
from agent.config.manager import AgentConfig


class TestAgentService:
    """Test cases for AgentService class."""

    def setup_method(self):
        """Set up test fixtures."""
        # Clear any existing environment variables that might interfere
        self.original_env = {}
        for key in list(os.environ.keys()):
            if key.startswith('MONITORING_'):
                self.original_env[key] = os.environ.pop(key)
        
        # Set required environment variables for testing
        os.environ['MONITORING_API_KEY'] = 'test-api-key'
        os.environ['MONITORING_SERVER_URL'] = 'http://test.example.com'

    def teardown_method(self):
        """Clean up after tests."""
        # Restore original environment variables
        for key, value in self.original_env.items():
            os.environ[key] = value
        
        # Clear any test environment variables
        for key in list(os.environ.keys()):
            if key.startswith('MONITORING_'):
                os.environ.pop(key, None)

    def test_init_with_valid_config(self):
        """Test AgentService initialization with valid configuration."""
        with patch('agent.service.HTTPTransmitter') as mock_transmitter:
            service = AgentService()
            
            assert service.config.server_url == 'http://test.example.com'
            assert service.config.api_key == 'test-api-key'
            assert service.config.collection_interval == 60
            assert not service._running
            assert service._collection_thread is None
            
            # Verify components are initialized
            assert service.metrics_collector is not None
            assert service.systemd_monitor is not None
            assert service.http_transmitter is not None
            assert service.config_manager is not None

    def test_init_with_invalid_config(self):
        """Test AgentService initialization with invalid configuration."""
        # Remove required API key
        os.environ.pop('MONITORING_API_KEY', None)
        
        with pytest.raises(ValueError) as exc_info:
            AgentService()
        
        assert "Configuration validation failed" in str(exc_info.value)

    def test_init_with_config_file(self):
        """Test AgentService initialization with configuration file."""
        config_data = {
            "server_url": "https://config-file.example.com",
            "collection_interval": 30,
            "retry_attempts": 5
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config_data, f)
            temp_path = f.name
        
        try:
            with patch('agent.service.HTTPTransmitter') as mock_transmitter:
                service = AgentService(config_path=temp_path)
                
                # Environment variables should still override file values
                assert service.config.server_url == 'http://test.example.com'
                assert service.config.api_key == 'test-api-key'
                # But file values should be used where env vars don't exist
                assert service.config.collection_interval == 30
                assert service.config.retry_attempts == 5
        finally:
            os.unlink(temp_path)

    @patch('agent.service.HTTPTransmitter')
    def test_collect_and_send_metrics(self, mock_transmitter_class):
        """Test metrics collection and transmission."""
        # Mock the transmitter instance
        mock_transmitter = Mock()
        mock_transmitter.send_with_exponential_backoff.return_value = True
        mock_transmitter_class.return_value = mock_transmitter
        
        service = AgentService()
        
        # Mock the collectors to return predictable data
        with patch.object(service.metrics_collector, 'collect_cpu_usage', return_value=45.2), \
             patch.object(service.metrics_collector, 'collect_memory_usage', 
                         return_value={'total': 8589934592, 'used': 4294967296, 'percentage': 50.0}), \
             patch.object(service.metrics_collector, 'collect_disk_usage',
                         return_value=[{'mountpoint': '/', 'total': 107374182400, 'used': 53687091200, 'percentage': 50.0}]), \
             patch.object(service.metrics_collector, 'collect_load_average',
                         return_value={'1min': 1.2, '5min': 1.1, '15min': 0.9}), \
             patch.object(service.metrics_collector, 'collect_uptime', return_value=86400), \
             patch.object(service.systemd_monitor, 'get_failed_services', return_value=[]):
            
            result = service.collect_and_send_metrics()
            
            assert result is True
            mock_transmitter.send_with_exponential_backoff.assert_called_once()
            
            # Verify the metrics object passed to transmitter
            call_args = mock_transmitter.send_with_exponential_backoff.call_args
            metrics = call_args[0][0]  # First argument
            api_key = call_args[0][1]  # Second argument
            
            assert metrics.cpu_usage == 45.2
            assert metrics.memory.percentage == 50.0
            assert len(metrics.disk_usage) == 1
            assert metrics.load_average.one_min == 1.2
            assert metrics.uptime == 86400
            assert api_key == 'test-api-key'

    @patch('agent.service.HTTPTransmitter')
    def test_collect_and_send_metrics_failure(self, mock_transmitter_class):
        """Test metrics collection when transmission fails."""
        # Mock the transmitter instance to fail
        mock_transmitter = Mock()
        mock_transmitter.send_with_exponential_backoff.return_value = False
        mock_transmitter_class.return_value = mock_transmitter
        
        service = AgentService()
        
        # Mock the collectors
        with patch.object(service.metrics_collector, 'collect_cpu_usage', return_value=45.2), \
             patch.object(service.metrics_collector, 'collect_memory_usage', 
                         return_value={'total': 8589934592, 'used': 4294967296, 'percentage': 50.0}), \
             patch.object(service.metrics_collector, 'collect_disk_usage',
                         return_value=[{'mountpoint': '/', 'total': 107374182400, 'used': 53687091200, 'percentage': 50.0}]), \
             patch.object(service.metrics_collector, 'collect_load_average',
                         return_value={'1min': 1.2, '5min': 1.1, '15min': 0.9}), \
             patch.object(service.metrics_collector, 'collect_uptime', return_value=86400), \
             patch.object(service.systemd_monitor, 'get_failed_services', return_value=[]):
            
            result = service.collect_and_send_metrics()
            
            assert result is False
            mock_transmitter.send_with_exponential_backoff.assert_called_once()

    @patch('agent.service.HTTPTransmitter')
    def test_start_and_stop_service(self, mock_transmitter_class):
        """Test starting and stopping the agent service."""
        # Mock the transmitter instance
        mock_transmitter = Mock()
        mock_transmitter.authenticate.return_value = True
        mock_transmitter_class.return_value = mock_transmitter
        
        service = AgentService()
        
        # Mock the collection method to avoid actual metric collection
        with patch.object(service, 'collect_and_send_metrics', return_value=True):
            # Test start
            service.start()
            assert service._running is True
            assert service._collection_thread is not None
            assert service._collection_thread.is_alive()
            
            # Give the thread a moment to start
            time.sleep(0.1)
            
            # Test stop
            service.stop()
            assert service._running is False
            
            # Wait for thread to finish
            service._collection_thread.join(timeout=1)
            assert not service._collection_thread.is_alive()

    @patch('agent.service.HTTPTransmitter')
    def test_start_with_authentication_failure(self, mock_transmitter_class):
        """Test starting service when authentication fails."""
        # Mock the transmitter instance to fail authentication
        mock_transmitter = Mock()
        mock_transmitter.authenticate.return_value = False
        mock_transmitter_class.return_value = mock_transmitter
        
        service = AgentService()
        
        with pytest.raises(RuntimeError) as exc_info:
            service.start()
        
        assert "Authentication failed" in str(exc_info.value)
        assert service._running is False

    @patch('agent.service.HTTPTransmitter')
    def test_get_status(self, mock_transmitter_class):
        """Test getting service status information."""
        mock_transmitter = Mock()
        mock_transmitter_class.return_value = mock_transmitter
        
        service = AgentService()
        status = service.get_status()
        
        assert isinstance(status, dict)
        assert 'running' in status
        assert 'server_id' in status
        assert 'server_url' in status
        assert 'collection_interval' in status
        assert 'retry_attempts' in status
        assert 'log_level' in status
        assert 'thread_alive' in status
        
        assert status['running'] is False
        assert status['server_url'] == 'http://test.example.com'
        assert status['collection_interval'] == 60
        assert status['thread_alive'] is False

    @patch('agent.service.HTTPTransmitter')
    def test_generate_server_id(self, mock_transmitter_class):
        """Test server ID generation when not configured."""
        mock_transmitter = Mock()
        mock_transmitter_class.return_value = mock_transmitter
        
        service = AgentService()
        server_id = service._generate_server_id()
        
        assert isinstance(server_id, str)
        assert server_id.startswith('agent-')
        assert len(server_id) > len('agent-')

    @patch('agent.service.HTTPTransmitter')
    def test_reload_config(self, mock_transmitter_class):
        """Test configuration reloading."""
        mock_transmitter = Mock()
        mock_transmitter_class.return_value = mock_transmitter
        
        service = AgentService()
        original_interval = service.config.collection_interval
        
        # Change environment variable
        os.environ['MONITORING_COLLECTION_INTERVAL'] = '120'
        
        service.reload_config()
        
        # Configuration should be updated
        assert service.config.collection_interval == 120
        assert service.config.collection_interval != original_interval

    @patch('agent.service.HTTPTransmitter')
    def test_service_with_server_id_configured(self, mock_transmitter_class):
        """Test service with server ID configured via environment."""
        mock_transmitter = Mock()
        mock_transmitter_class.return_value = mock_transmitter
        
        os.environ['MONITORING_SERVER_ID'] = 'custom-server-123'
        
        service = AgentService()
        
        assert service.config.server_id == 'custom-server-123'
        
        status = service.get_status()
        assert status['server_id'] == 'custom-server-123'