"""
FastAPI endpoints for the Linux Server Health Monitoring System.

This module implements the MetricsAPI class with REST endpoints for receiving
agent metrics, health checks, and agent registration.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from server.database.connection import get_db_session
from server.auth.service import AuthenticationService
from server.database.manager import DatabaseManager
from server.middleware.security import (
    SecurityMiddleware, 
    setup_rate_limiting, 
    metrics_rate_limit,
    registration_rate_limit,
    health_rate_limit
)
from shared.models import SystemMetrics, MemoryInfo, DiskUsage, LoadAverage, FailedService

logger = logging.getLogger(__name__)

# Security scheme for API key authentication
security = HTTPBearer()


class MemoryInfoModel(BaseModel):
    """Pydantic model for memory information validation."""
    total: int = Field(..., ge=0, description="Total memory in bytes")
    used: int = Field(..., ge=0, description="Used memory in bytes")
    percentage: float = Field(..., ge=0.0, le=100.0, description="Memory usage percentage")

    @field_validator('used')
    @classmethod
    def used_not_greater_than_total(cls, v, info):
        if info.data and 'total' in info.data and v > info.data['total']:
            raise ValueError('Used memory cannot be greater than total memory')
        return v


class DiskUsageModel(BaseModel):
    """Pydantic model for disk usage validation."""
    mountpoint: str = Field(..., min_length=1, description="Filesystem mountpoint")
    total: int = Field(..., ge=0, description="Total disk space in bytes")
    used: int = Field(..., ge=0, description="Used disk space in bytes")
    percentage: float = Field(..., ge=0.0, le=100.0, description="Disk usage percentage")

    @field_validator('used')
    @classmethod
    def used_not_greater_than_total(cls, v, info):
        if info.data and 'total' in info.data and v > info.data['total']:
            raise ValueError('Used disk space cannot be greater than total disk space')
        return v

    @field_validator('mountpoint')
    @classmethod
    def validate_mountpoint(cls, v):
        # Comprehensive validation for mountpoint format
        if not v or len(v.strip()) == 0:
            raise ValueError('Mountpoint cannot be empty')
        
        v = v.strip()
        
        # Must start with /
        if not v.startswith('/'):
            raise ValueError('Mountpoint must start with /')
        
        # Check for path traversal attempts
        if '..' in v or '//' in v:
            raise ValueError('Mountpoint contains invalid path components')
        
        # Check length
        if len(v) > 4096:  # Reasonable filesystem path limit
            raise ValueError('Mountpoint path too long')
        
        # Check for suspicious characters
        invalid_chars = ['<', '>', '|', '*', '?', '"', '\x00']
        if any(char in v for char in invalid_chars):
            raise ValueError('Mountpoint contains invalid characters')
        
        return v


class LoadAverageModel(BaseModel):
    """Pydantic model for load average validation."""
    one_min: float = Field(..., ge=0.0, description="1-minute load average")
    five_min: float = Field(..., ge=0.0, description="5-minute load average")
    fifteen_min: float = Field(..., ge=0.0, description="15-minute load average")


class FailedServiceModel(BaseModel):
    """Pydantic model for failed service validation."""
    name: str = Field(..., min_length=1, max_length=255, description="Service name")
    status: str = Field(..., min_length=1, max_length=50, description="Service status")
    since: Optional[str] = Field(None, description="Timestamp when service failed")

    @field_validator('name')
    @classmethod
    def validate_service_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Service name cannot be empty')
        
        v = v.strip()
        
        # Check for valid service name format (systemd service names)
        if not v.replace('-', '').replace('_', '').replace('.', '').replace('@', '').isalnum():
            raise ValueError('Service name contains invalid characters')
        
        # Prevent path traversal and injection attempts
        if '..' in v or '/' in v or '\\' in v:
            raise ValueError('Service name contains invalid path characters')
        
        return v

    @field_validator('status')
    @classmethod
    def validate_service_status(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Service status cannot be empty')
        
        v = v.strip()
        
        # Valid systemd service states
        valid_statuses = {
            'active', 'inactive', 'failed', 'activating', 'deactivating',
            'reloading', 'enabled', 'disabled', 'static', 'masked'
        }
        
        if v.lower() not in valid_statuses:
            raise ValueError(f'Invalid service status: {v}')
        
        return v

    @field_validator('since')
    @classmethod
    def validate_since_timestamp(cls, v):
        if v is None:
            return v
        
        if not isinstance(v, str) or len(v.strip()) == 0:
            return None
        
        v = v.strip()
        
        try:
            # Validate ISO 8601 timestamp format
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('Since timestamp must be in ISO 8601 format')


class MetricsRequestModel(BaseModel):
    """Pydantic model for metrics request validation."""
    server_id: str = Field(..., min_length=1, max_length=255, description="Unique server identifier")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    cpu_usage: float = Field(..., ge=0.0, le=100.0, description="CPU usage percentage")
    memory: MemoryInfoModel
    disk_usage: list[DiskUsageModel] = Field(..., min_length=1, description="List of disk usage information")
    load_average: LoadAverageModel
    uptime: int = Field(..., ge=0, description="System uptime in seconds")
    failed_services: list[FailedServiceModel] = Field(default=[], description="List of failed services")

    @field_validator('timestamp')
    @classmethod
    def validate_timestamp(cls, v):
        try:
            # Validate ISO 8601 timestamp format
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('Timestamp must be in ISO 8601 format')

    @field_validator('server_id')
    @classmethod
    def validate_server_id(cls, v):
        # Comprehensive validation for server ID format
        if not v or len(v.strip()) == 0:
            raise ValueError('Server ID cannot be empty')
        
        # Remove whitespace
        v = v.strip()
        
        # Check length constraints
        if len(v) < 1 or len(v) > 255:
            raise ValueError('Server ID must be between 1 and 255 characters')
        
        # Check for valid characters (alphanumeric, hyphens, underscores, dots)
        if not v.replace('-', '').replace('_', '').replace('.', '').isalnum():
            raise ValueError('Server ID must contain only alphanumeric characters, hyphens, underscores, and dots')
        
        # Prevent suspicious patterns
        suspicious_patterns = ['..', '--', '__', 'admin', 'root', 'system', 'null', 'undefined']
        v_lower = v.lower()
        for pattern in suspicious_patterns:
            if pattern in v_lower:
                raise ValueError('Server ID contains invalid pattern')
        
        return v


class RegistrationRequestModel(BaseModel):
    """Pydantic model for agent registration request."""
    server_id: str = Field(..., min_length=1, max_length=255, description="Unique server identifier")
    hostname: Optional[str] = Field(None, max_length=255, description="Server hostname")
    ip_address: Optional[str] = Field(None, max_length=45, description="Server IP address")

    @field_validator('server_id')
    @classmethod
    def validate_server_id(cls, v):
        # Comprehensive validation for server ID format
        if not v or len(v.strip()) == 0:
            raise ValueError('Server ID cannot be empty')
        
        # Remove whitespace
        v = v.strip()
        
        # Check length constraints
        if len(v) < 1 or len(v) > 255:
            raise ValueError('Server ID must be between 1 and 255 characters')
        
        # Check for valid characters (alphanumeric, hyphens, underscores, dots)
        if not v.replace('-', '').replace('_', '').replace('.', '').isalnum():
            raise ValueError('Server ID must contain only alphanumeric characters, hyphens, underscores, and dots')
        
        # Prevent suspicious patterns
        suspicious_patterns = ['..', '--', '__', 'admin', 'root', 'system', 'null', 'undefined']
        v_lower = v.lower()
        for pattern in suspicious_patterns:
            if pattern in v_lower:
                raise ValueError('Server ID contains invalid pattern')
        
        return v


class MetricsAPI:
    """
    FastAPI application class for the Linux Server Health Monitoring System.
    
    Provides REST endpoints for agent communication, including metrics submission,
    health checks, and agent registration with comprehensive input validation
    and security measures.
    """

    def __init__(self):
        """Initialize the FastAPI application with middleware and routes."""
        self.app = FastAPI(
            title="Linux Server Health Monitoring API",
            description="REST API for collecting server metrics and managing agent registration",
            version="1.0.0",
            docs_url="/docs",
            redoc_url="/redoc"
        )
        
        # Set up rate limiting first
        setup_rate_limiting(self.app)
        
        # Add security middleware
        @self.app.middleware("http")
        async def security_middleware(request: Request, call_next):
            security = SecurityMiddleware()
            return await security(request, call_next)
        
        # Add CORS middleware for cross-origin requests (configurable for different environments)
        import os
        allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else ["*"]
        
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST"],
            allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
        )
        
        # Register routes
        self._register_routes()
        
        # Initialize database manager
        self.db_manager = DatabaseManager()

    def _register_routes(self):
        """Register all API routes."""
        
        @self.app.post("/api/v1/metrics", 
                      status_code=status.HTTP_201_CREATED,
                      summary="Submit server metrics",
                      description="Endpoint for agents to submit collected system metrics")
        @metrics_rate_limit()
        async def submit_metrics(
            request: Request,
            metrics_data: MetricsRequestModel,
            credentials: HTTPAuthorizationCredentials = Depends(security),
            db_session: Session = Depends(get_db_session)
        ) -> Dict[str, Any]:
            return await self._submit_metrics(metrics_data, credentials, db_session)

        @self.app.get("/api/v1/health",
                     status_code=status.HTTP_200_OK,
                     summary="Health check endpoint",
                     description="Check the health status of the monitoring server")
        @health_rate_limit()
        async def health_check(request: Request) -> Dict[str, Any]:
            return await self._health_check()

        @self.app.post("/api/v1/register",
                      status_code=status.HTTP_201_CREATED,
                      summary="Register new agent",
                      description="Register a new monitoring agent and receive API key")
        @registration_rate_limit()
        async def register_agent(
            request: Request,
            registration_data: RegistrationRequestModel,
            db_session: Session = Depends(get_db_session)
        ) -> Dict[str, Any]:
            return await self._register_agent(registration_data, db_session)

    async def _submit_metrics(
        self, 
        metrics_data: MetricsRequestModel,
        credentials: HTTPAuthorizationCredentials,
        db_session: Session
    ) -> Dict[str, Any]:
        """
        Handle metrics submission from agents.
        
        Args:
            metrics_data: Validated metrics data from the request
            credentials: API key credentials from Authorization header
            db_session: Database session for operations
            
        Returns:
            Success response with acknowledgment
            
        Raises:
            HTTPException: For authentication or processing errors
        """
        try:
            # Authenticate the request
            auth_service = AuthenticationService(db_session)
            api_key_record = auth_service.validate_api_key(credentials.credentials)
            
            if not api_key_record:
                logger.warning(f"Invalid API key used for metrics submission from {metrics_data.server_id}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired API key"
                )
            
            # Convert Pydantic model to SystemMetrics dataclass
            system_metrics = self._convert_to_system_metrics(metrics_data)
            
            # Ensure server exists in database
            self.db_manager.ensure_server_exists(
                server_id=system_metrics.server_id,
                hostname=None,  # Could be extracted from metrics if available
                ip_address=None  # Could be extracted from request if needed
            )
            
            # Store metrics in database
            success = self.db_manager.store_metrics(system_metrics)
            
            if not success:
                logger.error(f"Failed to store metrics for server {system_metrics.server_id}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to store metrics"
                )
            
            logger.info(f"Successfully stored metrics for server {system_metrics.server_id}")
            
            return {
                "status": "success",
                "message": "Metrics received and stored successfully",
                "server_id": system_metrics.server_id,
                "timestamp": system_metrics.timestamp
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error processing metrics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error processing metrics"
            )

    async def _health_check(self) -> Dict[str, Any]:
        """
        Perform health check of the monitoring server.
        
        Returns:
            Health status information including database connectivity
        """
        try:
            # Check database connectivity
            db_healthy = self.db_manager.health_check()
            
            overall_status = "healthy" if db_healthy else "unhealthy"
            
            health_info = {
                "status": overall_status,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "version": "1.0.0",
                "components": {
                    "database": "healthy" if db_healthy else "unhealthy",
                    "api": "healthy"
                }
            }
            
            if not db_healthy:
                logger.warning("Health check failed: Database connectivity issues")
                return JSONResponse(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    content=health_info
                )
            
            return health_info
            
        except Exception as e:
            logger.error(f"Health check failed with error: {e}")
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "unhealthy",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "error": "Health check failed"
                }
            )

    async def _register_agent(
        self,
        registration_data: RegistrationRequestModel,
        db_session: Session
    ) -> Dict[str, Any]:
        """
        Register a new monitoring agent.
        
        Args:
            registration_data: Validated registration data
            db_session: Database session for operations
            
        Returns:
            Registration response with API key
            
        Raises:
            HTTPException: For registration errors
        """
        try:
            # Ensure server record exists
            server = self.db_manager.ensure_server_exists(
                server_id=registration_data.server_id,
                hostname=registration_data.hostname,
                ip_address=registration_data.ip_address
            )
            
            if not server:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create server record"
                )
            
            # Generate API key for the server
            auth_service = AuthenticationService(db_session)
            api_key, key_id = auth_service.generate_api_key(
                server_id=registration_data.server_id,
                description=f"API key for server {registration_data.server_id}"
            )
            
            logger.info(f"Successfully registered agent for server {registration_data.server_id}")
            
            return {
                "status": "success",
                "message": "Agent registered successfully",
                "server_id": registration_data.server_id,
                "api_key": api_key,
                "key_id": key_id,
                "registered_at": datetime.utcnow().isoformat() + "Z"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to register agent for server {registration_data.server_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to register agent"
            )

    def _convert_to_system_metrics(self, metrics_data: MetricsRequestModel) -> SystemMetrics:
        """
        Convert Pydantic model to SystemMetrics dataclass.
        
        Args:
            metrics_data: Validated Pydantic model
            
        Returns:
            SystemMetrics dataclass instance
        """
        # Convert nested models to dataclasses
        memory = MemoryInfo(
            total=metrics_data.memory.total,
            used=metrics_data.memory.used,
            percentage=metrics_data.memory.percentage
        )
        
        disk_usage = [
            DiskUsage(
                mountpoint=disk.mountpoint,
                total=disk.total,
                used=disk.used,
                percentage=disk.percentage
            )
            for disk in metrics_data.disk_usage
        ]
        
        load_average = LoadAverage(
            one_min=metrics_data.load_average.one_min,
            five_min=metrics_data.load_average.five_min,
            fifteen_min=metrics_data.load_average.fifteen_min
        )
        
        failed_services = [
            FailedService(
                name=service.name,
                status=service.status,
                since=service.since
            )
            for service in metrics_data.failed_services
        ]
        
        return SystemMetrics(
            server_id=metrics_data.server_id,
            timestamp=metrics_data.timestamp,
            cpu_usage=metrics_data.cpu_usage,
            memory=memory,
            disk_usage=disk_usage,
            load_average=load_average,
            uptime=metrics_data.uptime,
            failed_services=failed_services
        )

    def get_app(self) -> FastAPI:
        """Get the FastAPI application instance."""
        return self.app


# Create the global API instance
metrics_api = MetricsAPI()
app = metrics_api.get_app()