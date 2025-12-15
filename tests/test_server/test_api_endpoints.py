"""
Unit tests for FastAPI server endpoints.

Tests the MetricsAPI class endpoints including metrics submission,
health checks, and agent registration with proper authentication
and input validation.
"""

import pytest
import json
from datetime import datetime
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from server.api.metrics import MetricsAPI
from server.auth.service import AuthenticationService
from server.database.models import ApiKey, Server
from shared.models import SystemMetrics


class TestMetricsAPI:
    """Test cases for the MetricsAPI FastAPI endpoints."""

    @pytest.fixture
    def api_client(self):
        """Create a test client for the FastAPI application."""
        self.metrics_api = MetricsAPI()
        return TestClient(self.metrics_api.get_app())

    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session."""
        return Mock(spec=Session)

    @pytest.fixture
    def valid_metrics_data(self):
        """Create valid metrics data for testing."""
        return {
            "server_id": "test-server-001",
            "timestamp": "2024-12-15T10:30:00Z",
            "cpu_usage": 45.2,
            "memory": {
                "total": 8589934592,
                "used": 4294967296,
                "percentage": 50.0
            },
            "disk_usage": [
                {
                    "mountpoint": "/",
                    "total": 107374182400,
                    "used": 53687091200,
                    "percentage": 50.0
                }
            ],
            "load_average": {
                "one_min": 1.2,
                "five_min": 1.1,
                "fifteen_min": 0.9
            },
            "uptime": 86400,
            "failed_services": [
                {
                    "name": "nginx",
                    "status": "failed",
                    "since": "2024-12-15T09:15:00Z"
                }
            ]
        }

    @pytest.fixture
    def valid_api_key(self):
        """Create a valid API key for testing."""
        return "test-api-key-12345"

    def test_health_check_endpoint_success(self, api_client):
        """Test successful health check endpoint."""
        with patch.object(self.metrics_api, 'db_manager') as mock_db_manager:
            # Mock successful database health check
            mock_db_manager.health_check.return_value = True
            
            response = api_client.get("/api/v1/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "timestamp" in data
            assert "version" in data
            assert data["components"]["database"] == "healthy"
            assert data["components"]["api"] == "healthy"

    def test_health_check_endpoint_database_failure(self, api_client):
        """Test health check endpoint with database failure."""
        with patch.object(self.metrics_api, 'db_manager') as mock_db_manager:
            # Mock database health check failure
            mock_db_manager.health_check.return_value = False
            
            response = api_client.get("/api/v1/health")
            
            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["components"]["database"] == "unhealthy"

    def test_submit_metrics_success(self, api_client, valid_metrics_data, valid_api_key):
        """Test successful metrics submission."""
        with patch('server.api.metrics.get_db_session') as mock_get_session, \
             patch('server.api.metrics.AuthenticationService') as mock_auth_service, \
             patch.object(self.metrics_api, 'db_manager') as mock_db_manager:
            
            # Mock database session
            mock_session = Mock()
            mock_get_session.return_value = mock_session
            
            # Mock successful authentication
            mock_api_key_record = Mock(spec=ApiKey)
            mock_auth_service.return_value.validate_api_key.return_value = mock_api_key_record
            
            # Mock successful metrics storage
            mock_db_manager.ensure_server_exists.return_value = Mock(spec=Server)
            mock_db_manager.store_metrics.return_value = True
            
            headers = {"Authorization": f"Bearer {valid_api_key}"}
            response = api_client.post("/api/v1/metrics", json=valid_metrics_data, headers=headers)
            
            assert response.status_code == 201
            data = response.json()
            assert data["status"] == "success"
            assert data["server_id"] == valid_metrics_data["server_id"]
            assert "timestamp" in data

    def test_submit_metrics_invalid_api_key(self, api_client, valid_metrics_data):
        """Test metrics submission with invalid API key."""
        with patch('server.api.metrics.get_db_session') as mock_get_session, \
             patch('server.api.metrics.AuthenticationService') as mock_auth_service:
            
            # Mock database session
            mock_session = Mock()
            mock_get_session.return_value = mock_session
            
            # Mock failed authentication
            mock_auth_service.return_value.validate_api_key.return_value = None
            
            headers = {"Authorization": "Bearer invalid-key"}
            response = api_client.post("/api/v1/metrics", json=valid_metrics_data, headers=headers)
            
            assert response.status_code == 401
            data = response.json()
            assert "Invalid or expired API key" in data["detail"]

    def test_submit_metrics_missing_authorization(self, api_client, valid_metrics_data):
        """Test metrics submission without authorization header."""
        response = api_client.post("/api/v1/metrics", json=valid_metrics_data)
        
        assert response.status_code == 401  # FastAPI HTTPBearer returns 401 for missing auth

    def test_submit_metrics_invalid_data(self, api_client, valid_api_key):
        """Test metrics submission with invalid data."""
        invalid_data = {
            "server_id": "",  # Invalid: empty server_id
            "timestamp": "invalid-timestamp",  # Invalid: bad timestamp format
            "cpu_usage": 150.0,  # Invalid: CPU usage > 100%
        }
        
        headers = {"Authorization": f"Bearer {valid_api_key}"}
        response = api_client.post("/api/v1/metrics", json=invalid_data, headers=headers)
        
        assert response.status_code == 422  # Validation error

    def test_register_agent_success(self, api_client):
        """Test successful agent registration."""
        registration_data = {
            "server_id": "test-server-001",
            "hostname": "test-host",
            "ip_address": "192.168.1.100"
        }
        
        with patch('server.api.metrics.get_db_session') as mock_get_session, \
             patch.object(self.metrics_api, 'db_manager') as mock_db_manager, \
             patch('server.api.metrics.AuthenticationService') as mock_auth_service:
            
            # Mock database session
            mock_session = Mock()
            mock_get_session.return_value = mock_session
            
            # Mock successful server creation
            mock_server = Mock(spec=Server)
            mock_db_manager.ensure_server_exists.return_value = mock_server
            
            # Mock successful API key generation
            mock_auth_service.return_value.generate_api_key.return_value = ("test-api-key", "key-123")
            
            response = api_client.post("/api/v1/register", json=registration_data)
            
            assert response.status_code == 201
            data = response.json()
            assert data["status"] == "success"
            assert data["server_id"] == registration_data["server_id"]
            assert "api_key" in data
            assert "key_id" in data

    def test_register_agent_invalid_server_id(self, api_client):
        """Test agent registration with invalid server ID."""
        registration_data = {
            "server_id": "invalid@server#id",  # Invalid characters
            "hostname": "test-host"
        }
        
        response = api_client.post("/api/v1/register", json=registration_data)
        
        assert response.status_code == 422  # Validation error

    def test_register_agent_database_error(self, api_client):
        """Test agent registration with database error."""
        registration_data = {
            "server_id": "test-server-001",
            "hostname": "test-host"
        }
        
        with patch('server.api.metrics.get_db_session') as mock_get_session, \
             patch.object(self.metrics_api, 'db_manager') as mock_db_manager:
            
            # Mock database session
            mock_session = Mock()
            mock_get_session.return_value = mock_session
            
            # Mock server creation failure
            mock_db_manager.ensure_server_exists.return_value = None
            
            response = api_client.post("/api/v1/register", json=registration_data)
            
            assert response.status_code == 500

    def test_metrics_data_validation_edge_cases(self, api_client, valid_api_key):
        """Test metrics data validation with edge cases."""
        # Test with minimum valid values
        minimal_data = {
            "server_id": "s",
            "timestamp": "2024-12-15T10:30:00Z",
            "cpu_usage": 0.0,
            "memory": {
                "total": 0,
                "used": 0,
                "percentage": 0.0
            },
            "disk_usage": [
                {
                    "mountpoint": "/",
                    "total": 0,
                    "used": 0,
                    "percentage": 0.0
                }
            ],
            "load_average": {
                "one_min": 0.0,
                "five_min": 0.0,
                "fifteen_min": 0.0
            },
            "uptime": 0,
            "failed_services": []
        }
        
        with patch('server.api.metrics.get_db_session') as mock_get_session, \
             patch('server.api.metrics.AuthenticationService') as mock_auth_service, \
             patch.object(self.metrics_api, 'db_manager') as mock_db_manager:
            
            # Mock successful authentication and storage
            mock_session = Mock()
            mock_get_session.return_value = mock_session
            mock_auth_service.return_value.validate_api_key.return_value = Mock(spec=ApiKey)
            mock_db_manager.ensure_server_exists.return_value = Mock(spec=Server)
            mock_db_manager.store_metrics.return_value = True
            
            headers = {"Authorization": f"Bearer {valid_api_key}"}
            response = api_client.post("/api/v1/metrics", json=minimal_data, headers=headers)
            
            assert response.status_code == 201

    def test_cors_headers(self, api_client):
        """Test that CORS headers are properly set."""
        with patch.object(self.metrics_api, 'db_manager') as mock_db_manager:
            # Mock successful database health check
            mock_db_manager.health_check.return_value = True
            
            response = api_client.get("/api/v1/health")
            
            # Check for CORS headers (these are set by the CORS middleware)
            assert response.status_code == 200

    def test_security_headers(self, api_client):
        """Test that security headers are properly set."""
        response = api_client.get("/api/v1/health")
        
        # Check for security headers
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_convert_to_system_metrics(self):
        """Test conversion from Pydantic model to SystemMetrics dataclass."""
        from server.api.metrics import MetricsRequestModel
        
        metrics_api = MetricsAPI()
        
        # Create a valid Pydantic model
        pydantic_data = {
            "server_id": "test-server",
            "timestamp": "2024-12-15T10:30:00Z",
            "cpu_usage": 50.0,
            "memory": {
                "total": 1000,
                "used": 500,
                "percentage": 50.0
            },
            "disk_usage": [
                {
                    "mountpoint": "/",
                    "total": 2000,
                    "used": 1000,
                    "percentage": 50.0
                }
            ],
            "load_average": {
                "one_min": 1.0,
                "five_min": 1.0,
                "fifteen_min": 1.0
            },
            "uptime": 3600,
            "failed_services": []
        }
        
        pydantic_model = MetricsRequestModel(**pydantic_data)
        system_metrics = metrics_api._convert_to_system_metrics(pydantic_model)
        
        assert isinstance(system_metrics, SystemMetrics)
        assert system_metrics.server_id == "test-server"
        assert system_metrics.cpu_usage == 50.0
        assert system_metrics.memory.total == 1000
        assert len(system_metrics.disk_usage) == 1
        assert system_metrics.disk_usage[0].mountpoint == "/"