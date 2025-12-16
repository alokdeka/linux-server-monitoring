"""
Dashboard API endpoints for web interface functionality.

This module implements REST API endpoints specifically for the web dashboard,
including authentication, user management, settings, and historical metrics.
"""

import logging
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Request, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import desc

from server.database.connection import get_db_session
from server.auth.dashboard_auth import DashboardAuthService
from server.services.dashboard_settings import DashboardSettingsService
from server.services.metrics_aggregation import MetricsAggregationService
from server.database.operations import ServerOperations, MetricOperations, AlertOperations
from server.database.models import ApiKey
from server.middleware.security import metrics_rate_limit, registration_rate_limit

logger = logging.getLogger(__name__)

# Security scheme for JWT authentication
security = HTTPBearer()

# JWT secret from environment
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")


# Pydantic models for request/response validation
class LoginRequest(BaseModel):
    """Request model for user login."""
    username: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Username cannot be empty')
        return v.strip()


class LoginResponse(BaseModel):
    """Response model for successful login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class RefreshTokenRequest(BaseModel):
    """Request model for token refresh."""
    refresh_token: str = Field(..., min_length=1)


class UserRegistrationRequest(BaseModel):
    """Request model for user registration."""
    username: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8)
    email: Optional[str] = Field(None, max_length=255)
    full_name: Optional[str] = Field(None, max_length=255)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Username cannot be empty')
        
        v = v.strip()
        
        # Check for valid characters (alphanumeric, hyphens, underscores)
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Username must contain only alphanumeric characters, hyphens, and underscores')
        
        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return v
        
        v = v.strip()
        if len(v) == 0:
            return None
        
        # Basic email validation
        if '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError('Invalid email format')
        
        return v


class SettingsUpdateRequest(BaseModel):
    """Request model for settings updates."""
    display: Optional[Dict[str, Any]] = None
    alert_thresholds: Optional[Dict[str, float]] = None
    notifications: Optional[Dict[str, Any]] = None


class MetricsQueryRequest(BaseModel):
    """Request model for metrics queries."""
    server_id: str = Field(..., min_length=1)
    start_time: str = Field(..., description="ISO 8601 timestamp")
    end_time: str = Field(..., description="ISO 8601 timestamp")
    interval_minutes: int = Field(default=5, ge=1, le=60)

    @field_validator('start_time', 'end_time')
    @classmethod
    def validate_timestamp(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('Timestamp must be in ISO 8601 format')


# Create router for dashboard endpoints
dashboard_router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security),
                    db_session: Session = Depends(get_db_session)):
    """
    Dependency to get current authenticated user from JWT token.
    
    Args:
        credentials: JWT credentials from Authorization header
        db_session: Database session
        
    Returns:
        Current user ID
        
    Raises:
        HTTPException: If authentication fails
    """
    auth_service = DashboardAuthService(db_session, JWT_SECRET)
    
    payload = auth_service.validate_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return int(payload.get("sub"))


@dashboard_router.post("/auth/login", response_model=LoginResponse)
async def login(request: Request, login_data: LoginRequest, 
               db_session: Session = Depends(get_db_session)):
    """
    Authenticate user and return JWT tokens.
    
    Args:
        request: FastAPI request object
        login_data: Login credentials
        db_session: Database session
        
    Returns:
        Login response with tokens and user info
    """
    try:
        auth_service = DashboardAuthService(db_session, JWT_SECRET)
        
        # Authenticate user
        user = auth_service.authenticate_user(login_data.username, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Create session and tokens
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        access_token, refresh_token = auth_service.create_session(
            user, client_ip, user_agent
        )
        
        logger.info(f"User {user.username} logged in successfully")
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600,  # 1 hour
            user={
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "is_admin": user.is_admin
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@dashboard_router.post("/auth/refresh")
async def refresh_token(refresh_data: RefreshTokenRequest,
                       db_session: Session = Depends(get_db_session)):
    """
    Refresh access token using refresh token.
    
    Args:
        refresh_data: Refresh token data
        db_session: Database session
        
    Returns:
        New access and refresh tokens
    """
    try:
        auth_service = DashboardAuthService(db_session, JWT_SECRET)
        
        result = auth_service.refresh_access_token(refresh_data.refresh_token)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        access_token, new_refresh_token = result
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": 3600
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@dashboard_router.post("/auth/logout")
async def logout(current_user_id: int = Depends(get_current_user),
                db_session: Session = Depends(get_db_session)):
    """
    Logout current user session.
    
    Args:
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        Logout confirmation
    """
    try:
        auth_service = DashboardAuthService(db_session, JWT_SECRET)
        
        # Logout all sessions for the user
        logged_out_count = auth_service.logout_all_sessions(current_user_id)
        
        logger.info(f"User {current_user_id} logged out ({logged_out_count} sessions)")
        
        return {
            "message": "Logged out successfully",
            "sessions_terminated": logged_out_count
        }
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@dashboard_router.post("/auth/register")
@registration_rate_limit()
async def register_user(request: Request, registration_data: UserRegistrationRequest,
                       db_session: Session = Depends(get_db_session)):
    """
    Register a new dashboard user.
    
    Args:
        request: FastAPI request object
        registration_data: User registration data
        db_session: Database session
        
    Returns:
        Registration confirmation
    """
    try:
        auth_service = DashboardAuthService(db_session, JWT_SECRET)
        
        # Create user
        user = auth_service.create_user(
            username=registration_data.username,
            password=registration_data.password,
            email=registration_data.email,
            full_name=registration_data.full_name
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )
        
        logger.info(f"New user registered: {user.username}")
        
        return {
            "message": "User registered successfully",
            "user_id": user.id,
            "username": user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@dashboard_router.get("/user/profile")
async def get_user_profile(current_user_id: int = Depends(get_current_user),
                          db_session: Session = Depends(get_db_session)):
    """
    Get current user profile information.
    
    Args:
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        User profile information
    """
    try:
        auth_service = DashboardAuthService(db_session, JWT_SECRET)
        user = auth_service.get_user_by_id(current_user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "last_login": user.last_login.isoformat() + "Z" if user.last_login else None,
            "login_count": user.login_count,
            "created_at": user.created_at.isoformat() + "Z"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile"
        )


@dashboard_router.get("/settings")
async def get_user_settings(current_user_id: int = Depends(get_current_user),
                           db_session: Session = Depends(get_db_session)):
    """
    Get user dashboard settings.
    
    Args:
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        User dashboard settings
    """
    try:
        settings_service = DashboardSettingsService(db_session)
        settings = settings_service.get_user_settings(current_user_id)
        
        if not settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Settings not found"
            )
        
        return settings
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Settings retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve settings"
        )


@dashboard_router.put("/settings")
async def update_user_settings(settings_data: SettingsUpdateRequest,
                              current_user_id: int = Depends(get_current_user),
                              db_session: Session = Depends(get_db_session)):
    """
    Update user dashboard settings.
    
    Args:
        settings_data: Settings update data
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        Update confirmation
    """
    try:
        settings_service = DashboardSettingsService(db_session)
        
        success = settings_service.update_user_settings(
            current_user_id, 
            settings_data.dict(exclude_unset=True)
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update settings"
            )
        
        return {"message": "Settings updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Settings update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings"
        )


@dashboard_router.post("/settings/reset")
async def reset_user_settings(current_user_id: int = Depends(get_current_user),
                             db_session: Session = Depends(get_db_session)):
    """
    Reset user settings to defaults.
    
    Args:
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        Reset confirmation
    """
    try:
        settings_service = DashboardSettingsService(db_session)
        
        success = settings_service.reset_user_settings(current_user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to reset settings"
            )
        
        return {"message": "Settings reset to defaults"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Settings reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset settings"
        )


@dashboard_router.get("/servers")
@metrics_rate_limit()
async def get_servers_overview(request: Request,
                              current_user_id: int = Depends(get_current_user),
                              db_session: Session = Depends(get_db_session)):
    """
    Get overview of all monitored servers.
    
    Args:
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        List of server overviews with current status
    """
    try:
        metrics_service = MetricsAggregationService(db_session)
        servers_overview = metrics_service.get_server_metrics_overview()
        
        return {
            "servers": servers_overview,
            "total_count": len(servers_overview),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
    except Exception as e:
        logger.error(f"Servers overview error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve servers overview"
        )


@dashboard_router.get("/servers/{server_id}/metrics")
@metrics_rate_limit()
async def get_server_metrics(request: Request,
                            server_id: str,
                            start_time: str = Query(..., description="ISO 8601 start time"),
                            end_time: str = Query(..., description="ISO 8601 end time"),
                            interval_minutes: int = Query(default=5, ge=1, le=60),
                            current_user_id: int = Depends(get_current_user),
                            db_session: Session = Depends(get_db_session)):
    """
    Get historical metrics for a specific server.
    
    Args:
        server_id: ID of the server to get metrics for
        start_time: Start time for metrics query
        end_time: End time for metrics query
        interval_minutes: Aggregation interval in minutes
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        Historical metrics data for the server
    """
    try:
        # Validate timestamps
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid timestamp format"
            )
        
        # Validate time range
        if start_dt >= end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start time must be before end time"
            )
        
        # Limit time range to prevent excessive queries
        max_range = timedelta(days=30)
        if end_dt - start_dt > max_range:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time range cannot exceed 30 days"
            )
        
        metrics_service = MetricsAggregationService(db_session)
        metrics_data = metrics_service.get_metrics_for_time_range(
            server_id, start_dt, end_dt, interval_minutes
        )
        
        return {
            "server_id": server_id,
            "start_time": start_time,
            "end_time": end_time,
            "interval_minutes": interval_minutes,
            "data_points": len(metrics_data),
            "metrics": metrics_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Server metrics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve server metrics"
        )


@dashboard_router.get("/servers/{server_id}/summary")
@metrics_rate_limit()
async def get_server_summary(request: Request,
                            server_id: str,
                            current_user_id: int = Depends(get_current_user),
                            db_session: Session = Depends(get_db_session)):
    """
    Get summary statistics for a specific server.
    
    Args:
        server_id: ID of the server to get summary for
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        Server summary with statistics
    """
    try:
        metrics_service = MetricsAggregationService(db_session)
        summary = metrics_service.get_latest_metrics_summary(server_id)
        
        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Server not found or no metrics available"
            )
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Server summary error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve server summary"
        )


@dashboard_router.get("/alerts")
@metrics_rate_limit()
async def get_alerts(request: Request,
                    active_only: bool = Query(default=True),
                    server_id: Optional[str] = Query(default=None),
                    current_user_id: int = Depends(get_current_user),
                    db_session: Session = Depends(get_db_session)):
    """
    Get alerts with optional filtering.
    
    Args:
        active_only: Whether to return only active alerts
        server_id: Optional server ID to filter by
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        List of alerts matching the criteria
    """
    try:
        if active_only:
            alerts = AlertOperations.get_active_alerts(db_session, server_id)
        else:
            # For historical alerts, we'd need to implement a method in AlertOperations
            # For now, just return active alerts
            alerts = AlertOperations.get_active_alerts(db_session, server_id)
        
        alerts_data = []
        for alert in alerts:
            alerts_data.append({
                "id": alert.id,
                "server_id": alert.server_id,
                "type": alert.alert_type,
                "severity": alert.severity,
                "message": alert.message,
                "threshold_value": alert.threshold_value,
                "actual_value": alert.actual_value,
                "triggered_at": alert.triggered_at.isoformat() + "Z",
                "resolved_at": alert.resolved_at.isoformat() + "Z" if alert.resolved_at else None,
                "is_resolved": alert.is_resolved
            })
        
        return {
            "alerts": alerts_data,
            "total_count": len(alerts_data),
            "active_only": active_only,
            "server_id": server_id
        }
        
    except Exception as e:
        logger.error(f"Alerts retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alerts"
        )


# Server Management Endpoints

class ServerRegistrationRequest(BaseModel):
    """Request model for server registration."""
    server_id: str = Field(..., min_length=1, max_length=255)
    hostname: Optional[str] = Field(None, max_length=255)
    ip_address: Optional[str] = Field(None, max_length=45)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator('server_id')
    @classmethod
    def validate_server_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Server ID cannot be empty')
        return v.strip()


class ApiKeyRegenerationRequest(BaseModel):
    """Request model for API key regeneration."""
    description: Optional[str] = Field(None, max_length=500)


@dashboard_router.get("/management/servers")
async def get_managed_servers(current_user_id: int = Depends(get_current_user),
                             db_session: Session = Depends(get_db_session)):
    """
    Get list of all registered servers for management.
    
    Args:
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        List of registered servers with management information
    """
    try:
        servers = ServerOperations.get_all_servers(db_session)
        
        servers_data = []
        for server in servers:
            # Get API key information
            api_key = db_session.query(ApiKey).filter(
                ApiKey.server_id == server.server_id,
                ApiKey.is_active == True
            ).first()
            
            servers_data.append({
                "server_id": server.server_id,
                "hostname": server.hostname,
                "ip_address": server.ip_address,
                "registered_at": server.registered_at.isoformat() + "Z",
                "last_seen": server.last_seen.isoformat() + "Z",
                "is_active": server.is_active,
                "has_api_key": api_key is not None,
                "api_key_created": api_key.created_at.isoformat() + "Z" if api_key else None,
                "api_key_last_used": api_key.last_used.isoformat() + "Z" if api_key and api_key.last_used else None
            })
        
        return {
            "servers": servers_data,
            "total_count": len(servers_data)
        }
        
    except Exception as e:
        logger.error(f"Server management retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve server management information"
        )


@dashboard_router.post("/management/servers/register")
@registration_rate_limit()
async def register_server_via_dashboard(request: Request, 
                                       registration_data: ServerRegistrationRequest,
                                       current_user_id: int = Depends(get_current_user),
                                       db_session: Session = Depends(get_db_session)):
    """
    Register a new server through the dashboard interface.
    
    Args:
        request: FastAPI request object
        registration_data: Server registration data
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        Registration response with API key
    """
    try:
        from server.auth.service import AuthenticationService
        
        # Check if server already exists
        existing_server = ServerOperations.get_server(db_session, registration_data.server_id)
        if existing_server:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Server with ID '{registration_data.server_id}' already exists"
            )
        
        # Create server record
        server = ServerOperations.create_server(
            db_session,
            server_id=registration_data.server_id,
            hostname=registration_data.hostname,
            ip_address=registration_data.ip_address
        )
        
        if not server:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create server record"
            )
        
        # Generate API key for the server
        auth_service = AuthenticationService(db_session)
        api_key, key_id = auth_service.generate_api_key(
            server_id=registration_data.server_id,
            description=registration_data.description or f"API key for server {registration_data.server_id}"
        )
        
        logger.info(f"Server {registration_data.server_id} registered via dashboard by user {current_user_id}")
        
        return {
            "message": "Server registered successfully",
            "server_id": registration_data.server_id,
            "api_key": api_key,
            "key_id": key_id,
            "registered_at": server.registered_at.isoformat() + "Z"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dashboard server registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server registration failed"
        )


@dashboard_router.post("/management/servers/{server_id}/regenerate-key")
async def regenerate_server_api_key(server_id: str,
                                   regeneration_data: ApiKeyRegenerationRequest,
                                   current_user_id: int = Depends(get_current_user),
                                   db_session: Session = Depends(get_db_session)):
    """
    Regenerate API key for a specific server.
    
    Args:
        server_id: ID of the server to regenerate key for
        regeneration_data: API key regeneration data
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        New API key information
    """
    try:
        from server.auth.service import AuthenticationService
        
        # Verify server exists
        server = ServerOperations.get_server(db_session, server_id)
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Server not found"
            )
        
        # Deactivate existing API keys for this server
        existing_keys = db_session.query(ApiKey).filter(
            ApiKey.server_id == server_id,
            ApiKey.is_active == True
        ).all()
        
        for key in existing_keys:
            key.is_active = False
        
        # Generate new API key
        auth_service = AuthenticationService(db_session)
        new_api_key, key_id = auth_service.generate_api_key(
            server_id=server_id,
            description=regeneration_data.description or f"Regenerated API key for server {server_id}"
        )
        
        logger.info(f"API key regenerated for server {server_id} by user {current_user_id}")
        
        return {
            "message": "API key regenerated successfully",
            "server_id": server_id,
            "api_key": new_api_key,
            "key_id": key_id,
            "regenerated_at": datetime.utcnow().isoformat() + "Z",
            "previous_keys_deactivated": len(existing_keys)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API key regeneration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key regeneration failed"
        )


@dashboard_router.delete("/management/servers/{server_id}")
async def deregister_server(server_id: str,
                           current_user_id: int = Depends(get_current_user),
                           db_session: Session = Depends(get_db_session)):
    """
    Deregister a server and clean up associated data.
    
    Args:
        server_id: ID of the server to deregister
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        Deregistration confirmation
    """
    try:
        # Verify server exists
        server = ServerOperations.get_server(db_session, server_id)
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Server not found"
            )
        
        # Deactivate all API keys for this server
        api_keys_updated = db_session.query(ApiKey).filter(
            ApiKey.server_id == server_id,
            ApiKey.is_active == True
        ).update({"is_active": False})
        
        # Mark server as inactive (soft delete to preserve historical data)
        server.is_active = False
        
        db_session.commit()
        
        logger.info(f"Server {server_id} deregistered by user {current_user_id}")
        
        return {
            "message": "Server deregistered successfully",
            "server_id": server_id,
            "deregistered_at": datetime.utcnow().isoformat() + "Z",
            "api_keys_deactivated": api_keys_updated
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Server deregistration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server deregistration failed"
        )


@dashboard_router.get("/metrics/aggregated")
@metrics_rate_limit()
async def get_aggregated_metrics(request: Request,
                                time_range: str = Query(default="24h", regex="^(1h|6h|24h|7d|30d)$"),
                                current_user_id: int = Depends(get_current_user),
                                db_session: Session = Depends(get_db_session)):
    """
    Get aggregated metrics across all servers for a time range.
    
    Args:
        request: FastAPI request object
        time_range: Time range for aggregation (1h, 6h, 24h, 7d, 30d)
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        Aggregated metrics data across all servers
    """
    try:
        # Parse time range
        time_ranges = {
            "1h": 1,
            "6h": 6,
            "24h": 24,
            "7d": 24 * 7,
            "30d": 24 * 30
        }
        
        hours = time_ranges.get(time_range, 24)
        
        metrics_service = MetricsAggregationService(db_session)
        
        # Get overview for all servers
        servers_overview = metrics_service.get_server_metrics_overview(hours)
        
        # Calculate aggregate statistics
        total_servers = len(servers_overview)
        online_servers = len([s for s in servers_overview if s["status"] == "online"])
        warning_servers = len([s for s in servers_overview if s["status"] == "warning"])
        critical_servers = len([s for s in servers_overview if s["status"] == "critical"])
        offline_servers = len([s for s in servers_overview if s["status"] == "offline"])
        
        # Calculate average metrics for online servers
        online_metrics = [s["current_metrics"] for s in servers_overview 
                         if s["status"] in ["online", "warning", "critical"] and s["current_metrics"]]
        
        avg_cpu = sum([m["cpu_usage"] for m in online_metrics]) / len(online_metrics) if online_metrics else 0
        avg_memory = sum([m["memory_percentage"] for m in online_metrics]) / len(online_metrics) if online_metrics else 0
        avg_disk = sum([m["max_disk_usage"] for m in online_metrics]) / len(online_metrics) if online_metrics else 0
        
        return {
            "time_range": time_range,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "summary": {
                "total_servers": total_servers,
                "online_servers": online_servers,
                "warning_servers": warning_servers,
                "critical_servers": critical_servers,
                "offline_servers": offline_servers
            },
            "averages": {
                "cpu_usage": round(avg_cpu, 2),
                "memory_percentage": round(avg_memory, 2),
                "disk_usage": round(avg_disk, 2)
            },
            "servers": servers_overview
        }
        
    except Exception as e:
        logger.error(f"Aggregated metrics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve aggregated metrics"
        )


@dashboard_router.get("/alerts/history")
@metrics_rate_limit()
async def get_alert_history(request: Request,
                           days: int = Query(default=7, ge=1, le=90),
                           server_id: Optional[str] = Query(default=None),
                           alert_type: Optional[str] = Query(default=None),
                           current_user_id: int = Depends(get_current_user),
                           db_session: Session = Depends(get_db_session)):
    """
    Get historical alerts with filtering options.
    
    Args:
        request: FastAPI request object
        days: Number of days to look back for alerts
        server_id: Optional server ID to filter by
        alert_type: Optional alert type to filter by
        current_user_id: Current authenticated user ID
        db_session: Database session
        
    Returns:
        Historical alerts data
    """
    try:
        from server.database.models import Alert
        
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        
        # Build query with filters
        query = db_session.query(Alert).filter(
            Alert.triggered_at >= cutoff_time
        )
        
        if server_id:
            query = query.filter(Alert.server_id == server_id)
        
        if alert_type:
            query = query.filter(Alert.alert_type == alert_type)
        
        alerts = query.order_by(desc(Alert.triggered_at)).all()
        
        alerts_data = []
        for alert in alerts:
            alerts_data.append({
                "id": alert.id,
                "server_id": alert.server_id,
                "type": alert.alert_type,
                "severity": alert.severity,
                "message": alert.message,
                "threshold_value": alert.threshold_value,
                "actual_value": alert.actual_value,
                "triggered_at": alert.triggered_at.isoformat() + "Z",
                "resolved_at": alert.resolved_at.isoformat() + "Z" if alert.resolved_at else None,
                "is_resolved": alert.is_resolved,
                "duration_minutes": (
                    (alert.resolved_at - alert.triggered_at).total_seconds() / 60
                    if alert.resolved_at else None
                )
            })
        
        # Calculate statistics
        total_alerts = len(alerts_data)
        resolved_alerts = len([a for a in alerts_data if a["is_resolved"]])
        critical_alerts = len([a for a in alerts_data if a["severity"] == "critical"])
        warning_alerts = len([a for a in alerts_data if a["severity"] == "warning"])
        
        return {
            "alerts": alerts_data,
            "statistics": {
                "total_alerts": total_alerts,
                "resolved_alerts": resolved_alerts,
                "active_alerts": total_alerts - resolved_alerts,
                "critical_alerts": critical_alerts,
                "warning_alerts": warning_alerts
            },
            "filters": {
                "days": days,
                "server_id": server_id,
                "alert_type": alert_type
            }
        }
        
    except Exception as e:
        logger.error(f"Alert history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alert history"
        )