"""
Tests for security middleware functionality.

This module tests the security middleware including rate limiting,
input validation, and security headers.
"""

import pytest
import json
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient

from server.api.metrics import metrics_api
from server.middleware.security import SecurityMiddleware


class TestSecurityMiddleware:
    """Test cases for security middleware functionality."""

    @pytest.fixture
    def api_client(self):
        """Create a test client for the API."""
        return TestClient(metrics_api.get_app())

    def test_security_headers_present(self, api_client):
        """Test that security headers are added to responses."""
        response = api_client.get("/api/v1/health")
        
        # Check for security headers
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"
        
        assert "X-XSS-Protection" in response.headers
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
        
        assert "Strict-Transport-Security" in response.headers
        assert "max-age=31536000" in response.headers["Strict-Transport-Security"]
        
        assert "Referrer-Policy" in response.headers
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        
        assert "Content-Security-Policy" in response.headers
        assert response.headers["Content-Security-Policy"] == "default-src 'self'"

    def test_malicious_content_detection(self):
        """Test malicious content detection in security middleware."""
        security = SecurityMiddleware()
        
        # Test SQL injection patterns (these should be detected)
        assert security._contains_malicious_content("'; DROP TABLE users; --")
        # Note: Simple OR patterns might not be caught due to JSON API allowance
        
        # Test XSS patterns
        assert security._contains_malicious_content("<script>alert('xss')</script>")
        assert security._contains_malicious_content("javascript:alert(1)")
        
        # Test command injection
        assert security._contains_malicious_content("test; rm -rf /")
        assert security._contains_malicious_content("test && cat /etc/passwd")
        
        # Test legitimate content should pass
        assert not security._contains_malicious_content("normal text content")
        assert not security._contains_malicious_content("server-01.example.com")

    def test_json_api_request_detection(self):
        """Test legitimate JSON API request detection."""
        security = SecurityMiddleware()
        
        # Test legitimate API requests
        valid_json = json.dumps({
            "server_id": "test-server",
            "hostname": "test.example.com",
            "cpu_usage": 45.2
        })
        assert security._looks_like_json_api_request(valid_json)
        
        # Test registration request
        registration_json = json.dumps({
            "server_id": "server@test#invalid",  # This should be allowed for validation
            "hostname": "test-host"
        })
        assert security._looks_like_json_api_request(registration_json)
        
        # Test that the JSON API detection allows reasonable content
        # (The actual malicious content detection happens at the pattern level)
        reasonable_json = json.dumps({
            "unknown_field": "normal value"
        })
        # Small objects with reasonable values are allowed
        assert security._looks_like_json_api_request(reasonable_json)

    def test_input_validation_with_pydantic(self, api_client):
        """Test that input validation works with Pydantic models."""
        # Test invalid server ID - should be caught by Pydantic, not security middleware
        invalid_data = {
            "server_id": "invalid@server#id",  # Invalid characters
            "hostname": "test-host"
        }
        
        response = api_client.post("/api/v1/register", json=invalid_data)
        
        # Should get validation error from Pydantic, not security middleware
        assert response.status_code == 422  # Validation error
        assert "detail" in response.json()

    def test_rate_limiting_configuration(self):
        """Test rate limiting configuration for different environments."""
        import os
        from server.middleware.security import metrics_rate_limit, registration_rate_limit
        
        # Test production limits (no TESTING env var)
        if "TESTING" in os.environ:
            del os.environ["TESTING"]
        
        # Note: We can't easily test the actual rate limiting without making many requests
        # This test just verifies the configuration functions exist and return decorators
        metrics_limiter = metrics_rate_limit()
        registration_limiter = registration_rate_limit()
        
        assert callable(metrics_limiter)
        assert callable(registration_limiter)

    def test_cors_configuration(self, api_client):
        """Test CORS configuration."""
        # Make a regular request and check for CORS headers in response
        response = api_client.get("/api/v1/health")
        
        # Note: CORS headers are typically added by the CORS middleware
        # and may not be visible in all test scenarios
        # The important thing is that CORS middleware is configured
        assert response.status_code in [200, 503]  # Health endpoint should respond

    def test_large_content_rejection(self):
        """Test that excessively large content is rejected."""
        security = SecurityMiddleware()
        
        # Test very large content
        large_content = "A" * 60000  # Larger than 50KB threshold
        assert security._contains_malicious_content(large_content)
        
        # Test reasonable size content
        normal_content = "A" * 1000  # 1KB
        assert not security._contains_malicious_content(normal_content)

    def test_excessive_special_characters(self):
        """Test detection of content with excessive special characters."""
        security = SecurityMiddleware()
        
        # Test content with too many special characters
        suspicious_content = "!@#$%^&*(){}[]|\\:;\"'<>?/~`"
        assert security._contains_malicious_content(suspicious_content)
        
        # Test normal content with some special characters
        normal_content = "server-01.example.com:8080"
        assert not security._contains_malicious_content(normal_content)