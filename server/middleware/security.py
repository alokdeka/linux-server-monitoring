"""
Security middleware for the Linux Server Health Monitoring System.

This module provides rate limiting, input validation, and security headers
to protect the API from abuse and attacks.
"""

import logging
import re
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

logger = logging.getLogger(__name__)

# Rate limiter configuration
limiter = Limiter(key_func=get_remote_address)

# Security patterns for input validation
SUSPICIOUS_PATTERNS = [
    # SQL injection patterns
    r"(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)",
    r"(--|#|/\*|\*/)",
    r"(\bor\b\s+\d+\s*=\s*\d+)",
    r"(\band\b\s+\d+\s*=\s*\d+)",
    
    # XSS patterns
    r"(<script[^>]*>.*?</script>)",
    r"(javascript:)",
    r"(on\w+\s*=)",
    r"(<iframe[^>]*>)",
    
    # Command injection patterns
    r"(;|\||&|`|\$\(|\${)",
    r"(\.\./|\.\.\\)",
    
    # LDAP injection patterns
    r"(\*|\(|\)|\\)",
    
    # NoSQL injection patterns
    r"(\$where|\$ne|\$gt|\$lt|\$regex)",
]

# Compile patterns for better performance
COMPILED_PATTERNS = [re.compile(pattern, re.IGNORECASE) for pattern in SUSPICIOUS_PATTERNS]


class SecurityMiddleware:
    """
    Security middleware for comprehensive input validation and protection.
    
    Provides protection against various injection attacks and malicious inputs
    by scanning request data for suspicious patterns.
    """
    
    def __init__(self):
        """Initialize the security middleware."""
        self.blocked_ips: Dict[str, datetime] = {}
        self.failed_attempts: Dict[str, int] = {}
        self.block_duration = timedelta(minutes=15)
        self.max_failed_attempts = 5
    
    async def __call__(self, request: Request, call_next):
        """
        Process incoming requests for security validation.
        
        Args:
            request: The incoming FastAPI request
            call_next: The next middleware or endpoint handler
            
        Returns:
            Response with security headers or error response
        """
        client_ip = get_remote_address(request)
        
        # Check if IP is blocked
        if self._is_ip_blocked(client_ip):
            logger.warning(f"Blocked request from IP {client_ip} - IP is temporarily blocked")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "IP temporarily blocked due to suspicious activity",
                    "retry_after": "15 minutes"
                }
            )
        
        # Validate request for malicious content
        try:
            await self._validate_request_security(request)
        except HTTPException as e:
            # Record failed attempt
            self._record_failed_attempt(client_ip)
            raise e
        
        # Process the request
        response = await call_next(request)
        
        # Add security headers
        self._add_security_headers(response)
        
        return response
    
    def _is_ip_blocked(self, ip: str) -> bool:
        """
        Check if an IP address is currently blocked.
        
        Args:
            ip: The IP address to check
            
        Returns:
            True if the IP is blocked, False otherwise
        """
        if ip in self.blocked_ips:
            block_time = self.blocked_ips[ip]
            if datetime.utcnow() - block_time < self.block_duration:
                return True
            else:
                # Block expired, remove from blocked list
                del self.blocked_ips[ip]
                if ip in self.failed_attempts:
                    del self.failed_attempts[ip]
        
        return False
    
    def _record_failed_attempt(self, ip: str):
        """
        Record a failed security attempt for an IP.
        
        Args:
            ip: The IP address that failed validation
        """
        self.failed_attempts[ip] = self.failed_attempts.get(ip, 0) + 1
        
        if self.failed_attempts[ip] >= self.max_failed_attempts:
            self.blocked_ips[ip] = datetime.utcnow()
            logger.warning(f"IP {ip} blocked due to {self.failed_attempts[ip]} failed attempts")
    
    async def _validate_request_security(self, request: Request):
        """
        Validate request content for security threats.
        
        Args:
            request: The FastAPI request to validate
            
        Raises:
            HTTPException: If malicious content is detected
        """
        # Get request body if present
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    body_str = body.decode('utf-8', errors='ignore')
                    if self._contains_malicious_content(body_str):
                        logger.warning(f"Malicious content detected in request body from {get_remote_address(request)}")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid request content detected"
                        )
            except UnicodeDecodeError:
                logger.warning(f"Invalid encoding in request body from {get_remote_address(request)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid request encoding"
                )
        
        # Validate query parameters
        for key, value in request.query_params.items():
            if self._contains_malicious_content(f"{key}={value}"):
                logger.warning(f"Malicious content detected in query parameters from {get_remote_address(request)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid query parameters detected"
                )
        
        # Validate headers (excluding standard ones)
        excluded_headers = {
            'host', 'user-agent', 'accept', 'accept-encoding', 'accept-language',
            'connection', 'content-type', 'content-length', 'authorization'
        }
        
        for key, value in request.headers.items():
            if key.lower() not in excluded_headers:
                if self._contains_malicious_content(f"{key}: {value}"):
                    logger.warning(f"Malicious content detected in headers from {get_remote_address(request)}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid request headers detected"
                    )
    
    def _contains_malicious_content(self, content: str) -> bool:
        """
        Check if content contains malicious patterns.
        
        Args:
            content: The content string to check
            
        Returns:
            True if malicious content is detected, False otherwise
        """
        if not content:
            return False
        
        # Skip validation for JSON content that looks like legitimate API requests
        # This allows Pydantic validation to handle input validation properly
        if self._looks_like_json_api_request(content):
            return False
        
        # Check against compiled patterns
        for pattern in COMPILED_PATTERNS:
            if pattern.search(content):
                return True
        
        # Additional checks for suspicious content
        if len(content) > 50000:  # Unusually large content (increased threshold)
            return True
        
        # Check for excessive special characters (more lenient)
        special_char_count = sum(1 for c in content if not c.isalnum() and c not in ' .-_@:/#{}[]",')
        if len(content) > 0 and special_char_count / len(content) > 0.7:
            return True
        
        return False
    
    def _looks_like_json_api_request(self, content: str) -> bool:
        """
        Check if content looks like a legitimate JSON API request.
        
        Args:
            content: The content string to check
            
        Returns:
            True if it looks like legitimate JSON, False otherwise
        """
        try:
            import json
            data = json.loads(content)
            
            # Check if it's a dictionary with reasonable keys
            if isinstance(data, dict):
                # Common API request fields
                api_fields = {
                    'server_id', 'hostname', 'ip_address', 'timestamp', 
                    'cpu_usage', 'memory', 'disk_usage', 'load_average', 
                    'uptime', 'failed_services'
                }
                
                # If any field matches our expected API fields, consider it legitimate
                if any(key in api_fields for key in data.keys()):
                    return True
                    
                # If it's a small object with reasonable string values, allow it
                if len(data) <= 10 and all(
                    isinstance(k, str) and len(k) <= 100 and
                    (isinstance(v, (str, int, float, bool, list, dict)) or v is None)
                    for k, v in data.items()
                ):
                    return True
            
            return False
        except (json.JSONDecodeError, TypeError, AttributeError):
            return False
    
    def _add_security_headers(self, response: Response):
        """
        Add security headers to the response.
        
        Args:
            response: The FastAPI response to modify
        """
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"


def setup_rate_limiting(app):
    """
    Set up rate limiting for the FastAPI application.
    
    Args:
        app: The FastAPI application instance
    """
    # Add rate limiting middleware
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    
    logger.info("Rate limiting middleware configured")


def get_limiter():
    """Get the rate limiter instance for use in route decorators."""
    return limiter


# Rate limiting decorators for different endpoint types
def metrics_rate_limit():
    """Rate limit for metrics endpoints - more permissive for legitimate agents."""
    import os
    # More lenient rate limiting for testing
    if os.getenv("TESTING") == "true":
        return limiter.limit("1000/minute")
    return limiter.limit("100/minute")


def registration_rate_limit():
    """Rate limit for registration endpoints - more restrictive."""
    import os
    # More lenient rate limiting for testing
    if os.getenv("TESTING") == "true":
        return limiter.limit("100/minute")
    return limiter.limit("10/minute")


def health_rate_limit():
    """Rate limit for health check endpoints - moderate limits."""
    import os
    # More lenient rate limiting for testing
    if os.getenv("TESTING") == "true":
        return limiter.limit("1000/minute")
    return limiter.limit("60/minute")


def general_rate_limit():
    """General rate limit for other endpoints."""
    return limiter.limit("30/minute")