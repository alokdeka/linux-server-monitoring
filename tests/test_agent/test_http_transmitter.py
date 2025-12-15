"""
Tests for agent HTTP transmitter functionality.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
import requests
from requests.exceptions import ConnectionError, Timeout, RequestException

from agent.transport.http_transmitter import HTTPTransmitter
from shared.models import SystemMetrics, MemoryInfo, DiskUsage, LoadAverage, FailedService


class TestHTTPTransmitter:
    """Test cases for HTTPTransmitter class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.server_url = "https://monitoring.example.com"
        self.api_key = "test-api-key-12345"
        self.transmitter = HTTPTransmitter(
            server_url=self.server_url,
            timeout=10,
            max_retries=2,
            backoff_factor=1.5
        )
        
        # Create sample metrics data
        self.sample_metrics = SystemMetrics(
            server_id="test-server-001",
            timestamp="2024-12-15T10:30:00Z",
            cpu_usage=45.2,
            memory=MemoryInfo(total=8589934592, used=4294967296, percentage=50.0),
            disk_usage=[
                DiskUsage(mountpoint="/", total=107374182400, used=53687091200, percentage=50.0)
            ],
            load_average=LoadAverage(one_min=1.2, five_min=1.1, fifteen_min=0.9),
            uptime=86400,
            failed_services=[
                FailedService(name="nginx", status="failed", since="2024-12-15T09:15:00Z")
            ]
        )

    def teardown_method(self):
        """Clean up after tests."""
        self.transmitter.close()

    @patch('agent.transport.http_transmitter.requests.Session.post')
    def test_send_metrics_success(self, mock_post):
        """Test successful metrics transmission."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        result = self.transmitter.send_metrics(self.sample_metrics, self.api_key)
        
        assert result is True
        mock_post.assert_called_once()
        
        # Verify the call arguments
        call_args = mock_post.call_args
        assert call_args[1]['timeout'] == 10
        assert call_args[1]['verify'] is True
        assert 'Authorization' in call_args[1]['headers']
        assert call_args[1]['headers']['Authorization'] == f'Bearer {self.api_key}'
        assert 'X-API-Key' in call_args[1]['headers']
        assert call_args[1]['headers']['X-API-Key'] == self.api_key

    @patch('agent.transport.http_transmitter.requests.Session.post')
    def test_send_metrics_authentication_failure(self, mock_post):
        """Test metrics transmission with authentication failure."""
        # Mock authentication failure response
        mock_response = Mock()
        mock_response.status_code = 401
        mock_post.return_value = mock_response
        
        result = self.transmitter.send_metrics(self.sample_metrics, "invalid-key")
        
        assert result is False
        mock_post.assert_called_once()

    @patch('agent.transport.http_transmitter.requests.Session.post')
    def test_send_metrics_rate_limit(self, mock_post):
        """Test metrics transmission with rate limiting."""
        # Mock rate limit response
        mock_response = Mock()
        mock_response.status_code = 429
        mock_post.return_value = mock_response
        
        result = self.transmitter.send_metrics(self.sample_metrics, self.api_key)
        
        assert result is False
        mock_post.assert_called_once()

    @patch('agent.transport.http_transmitter.requests.Session.post')
    def test_send_metrics_server_error(self, mock_post):
        """Test metrics transmission with server error."""
        # Mock server error response
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response
        
        result = self.transmitter.send_metrics(self.sample_metrics, self.api_key)
        
        assert result is False
        mock_post.assert_called_once()

    @patch('agent.transport.http_transmitter.requests.Session.post')
    def test_send_metrics_connection_error(self, mock_post):
        """Test metrics transmission with connection error."""
        # Mock connection error
        mock_post.side_effect = ConnectionError("Connection failed")
        
        result = self.transmitter.send_metrics(self.sample_metrics, self.api_key)
        
        assert result is False
        mock_post.assert_called_once()

    @patch('agent.transport.http_transmitter.requests.Session.post')
    def test_send_metrics_timeout(self, mock_post):
        """Test metrics transmission with timeout."""
        # Mock timeout error
        mock_post.side_effect = Timeout("Request timed out")
        
        result = self.transmitter.send_metrics(self.sample_metrics, self.api_key)
        
        assert result is False
        mock_post.assert_called_once()

    @patch('agent.transport.http_transmitter.requests.Session.get')
    def test_authenticate_success(self, mock_get):
        """Test successful authentication."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        
        result = self.transmitter.authenticate(self.api_key)
        
        assert result is True
        mock_get.assert_called_once()
        
        # Verify the call arguments
        call_args = mock_get.call_args
        assert 'Authorization' in call_args[1]['headers']
        assert call_args[1]['headers']['Authorization'] == f'Bearer {self.api_key}'

    @patch('agent.transport.http_transmitter.requests.Session.get')
    def test_authenticate_failure(self, mock_get):
        """Test authentication failure."""
        # Mock authentication failure response
        mock_response = Mock()
        mock_response.status_code = 401
        mock_get.return_value = mock_response
        
        result = self.transmitter.authenticate("invalid-key")
        
        assert result is False
        mock_get.assert_called_once()

    @patch('agent.transport.http_transmitter.requests.Session.get')
    def test_authenticate_connection_error(self, mock_get):
        """Test authentication with connection error."""
        # Mock connection error
        mock_get.side_effect = ConnectionError("Connection failed")
        
        result = self.transmitter.authenticate(self.api_key)
        
        assert result is False
        mock_get.assert_called_once()

    @patch('agent.transport.http_transmitter.time.sleep')
    @patch('agent.transport.http_transmitter.HTTPTransmitter.send_metrics')
    def test_send_with_exponential_backoff_success_first_attempt(self, mock_send, mock_sleep):
        """Test exponential backoff with success on first attempt."""
        mock_send.return_value = True
        
        result = self.transmitter.send_with_exponential_backoff(
            self.sample_metrics, self.api_key, max_attempts=3
        )
        
        assert result is True
        mock_send.assert_called_once()
        mock_sleep.assert_not_called()

    @patch('agent.transport.http_transmitter.time.sleep')
    @patch('agent.transport.http_transmitter.HTTPTransmitter.send_metrics')
    def test_send_with_exponential_backoff_success_second_attempt(self, mock_send, mock_sleep):
        """Test exponential backoff with success on second attempt."""
        mock_send.side_effect = [False, True]  # Fail first, succeed second
        
        result = self.transmitter.send_with_exponential_backoff(
            self.sample_metrics, self.api_key, max_attempts=3
        )
        
        assert result is True
        assert mock_send.call_count == 2
        mock_sleep.assert_called_once_with(1.0)  # backoff_factor^0 = 1.5^0 = 1.0

    @patch('agent.transport.http_transmitter.time.sleep')
    @patch('agent.transport.http_transmitter.HTTPTransmitter.send_metrics')
    def test_send_with_exponential_backoff_all_attempts_fail(self, mock_send, mock_sleep):
        """Test exponential backoff when all attempts fail."""
        mock_send.return_value = False
        
        result = self.transmitter.send_with_exponential_backoff(
            self.sample_metrics, self.api_key, max_attempts=3
        )
        
        assert result is False
        assert mock_send.call_count == 3
        # Should sleep twice (between attempts 1-2 and 2-3)
        assert mock_sleep.call_count == 2
        # Verify exponential backoff delays: 1.5^0=1.0, 1.5^1=1.5
        expected_calls = [pytest.approx(1.5**0), pytest.approx(1.5**1)]
        actual_calls = [call[0][0] for call in mock_sleep.call_args_list]
        assert actual_calls == expected_calls

    @patch('agent.transport.http_transmitter.requests.Session.post')
    def test_register_agent_success(self, mock_post):
        """Test successful agent registration."""
        # Mock successful registration response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'api_key': 'new-api-key-12345'}
        mock_post.return_value = mock_response
        
        result = self.transmitter.register_agent("test-server-001", {"os": "linux"})
        
        assert result == 'new-api-key-12345'
        mock_post.assert_called_once()
        
        # Verify the call arguments
        call_args = mock_post.call_args
        assert call_args[1]['json']['server_id'] == "test-server-001"
        assert call_args[1]['json']['metadata'] == {"os": "linux"}

    @patch('agent.transport.http_transmitter.requests.Session.post')
    def test_register_agent_failure(self, mock_post):
        """Test agent registration failure."""
        # Mock registration failure response
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        mock_post.return_value = mock_response
        
        result = self.transmitter.register_agent("test-server-001")
        
        assert result is None
        mock_post.assert_called_once()

    @patch('agent.transport.http_transmitter.requests.Session.post')
    def test_register_agent_missing_api_key(self, mock_post):
        """Test agent registration with missing API key in response."""
        # Mock response without API key
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'message': 'registered'}
        mock_post.return_value = mock_response
        
        result = self.transmitter.register_agent("test-server-001")
        
        assert result is None
        mock_post.assert_called_once()

    def test_initialization_parameters(self):
        """Test HTTPTransmitter initialization with various parameters."""
        transmitter = HTTPTransmitter(
            server_url="http://localhost:8000/",  # Test URL normalization
            timeout=60,
            max_retries=5,
            backoff_factor=3.0,
            verify_ssl=False
        )
        
        assert transmitter.server_url == "http://localhost:8000"  # Should strip trailing slash
        assert transmitter.timeout == 60
        assert transmitter.max_retries == 5
        assert transmitter.backoff_factor == 3.0
        assert transmitter.verify_ssl is False
        
        transmitter.close()

    def test_session_headers(self):
        """Test that session has correct default headers."""
        headers = self.transmitter.session.headers
        
        assert headers['Content-Type'] == 'application/json'
        assert headers['User-Agent'] == 'LinuxServerMonitor-Agent/1.0'

    def test_json_serialization_in_send_metrics(self):
        """Test that metrics are properly serialized to JSON."""
        with patch('agent.transport.http_transmitter.requests.Session.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_post.return_value = mock_response
            
            self.transmitter.send_metrics(self.sample_metrics, self.api_key)
            
            # Verify that the data sent is valid JSON
            call_args = mock_post.call_args
            sent_data = call_args[1]['data']
            
            # Should be able to parse as JSON
            parsed_data = json.loads(sent_data)
            assert parsed_data['server_id'] == "test-server-001"
            assert parsed_data['cpu_usage'] == 45.2