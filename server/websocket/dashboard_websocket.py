"""
WebSocket endpoints for real-time dashboard updates.

This module provides WebSocket functionality for real-time communication
between the dashboard and server, including metrics updates, alert notifications,
and server status changes.
"""

import json
import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session
from server.database.connection import get_db_session
from server.auth.dashboard_auth import DashboardAuthService
from server.database.models import DashboardUser
import os

logger = logging.getLogger(__name__)


class WebSocketConnectionManager:
    """
    Manager for WebSocket connections and message broadcasting.
    
    Handles connection lifecycle, user authentication, and message
    distribution to connected dashboard clients.
    """
    
    def __init__(self):
        """Initialize the WebSocket connection manager."""
        self.active_connections: Dict[int, List[WebSocket]] = {}  # user_id -> [websockets]
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        self.jwt_secret = os.getenv("JWT_SECRET", "your-secret-key-here")
    
    async def connect(self, websocket: WebSocket, user_id: int, db_session: Session):
        """
        Accept a new WebSocket connection and associate it with a user.
        
        Args:
            websocket: WebSocket connection to accept
            user_id: ID of the authenticated user
            db_session: Database session for user validation
        """
        await websocket.accept()
        
        # Validate user exists and is active
        user = db_session.query(DashboardUser).filter(
            DashboardUser.id == user_id,
            DashboardUser.is_active == True
        ).first()
        
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Add connection to active connections
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        
        # Store connection metadata
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "username": user.username,
            "connected_at": datetime.utcnow(),
            "last_activity": datetime.utcnow()
        }
        
        logger.info(f"WebSocket connected for user {user.username} (ID: {user_id})")
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connection_established",
            "data": {
                "message": "WebSocket connection established",
                "user_id": user_id,
                "username": user.username
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """
        Remove a WebSocket connection.
        
        Args:
            websocket: WebSocket connection to remove
        """
        if websocket in self.connection_metadata:
            metadata = self.connection_metadata[websocket]
            user_id = metadata["user_id"]
            username = metadata["username"]
            
            # Remove from active connections
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                
                # Clean up empty user connection lists
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove metadata
            del self.connection_metadata[websocket]
            
            logger.info(f"WebSocket disconnected for user {username} (ID: {user_id})")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """
        Send a message to a specific WebSocket connection.
        
        Args:
            message: Message data to send
            websocket: WebSocket connection to send to
        """
        try:
            await websocket.send_text(json.dumps(message))
            
            # Update last activity
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["last_activity"] = datetime.utcnow()
                
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
            # Connection might be closed, remove it
            self.disconnect(websocket)
    
    async def send_to_user(self, message: Dict[str, Any], user_id: int):
        """
        Send a message to all connections for a specific user.
        
        Args:
            message: Message data to send
            user_id: ID of the user to send to
        """
        if user_id in self.active_connections:
            disconnected_connections = []
            
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                    
                    # Update last activity
                    if websocket in self.connection_metadata:
                        self.connection_metadata[websocket]["last_activity"] = datetime.utcnow()
                        
                except Exception as e:
                    logger.error(f"Failed to send message to user {user_id}: {e}")
                    disconnected_connections.append(websocket)
            
            # Clean up disconnected connections
            for websocket in disconnected_connections:
                self.disconnect(websocket)
    
    async def broadcast_to_all(self, message: Dict[str, Any]):
        """
        Broadcast a message to all connected users.
        
        Args:
            message: Message data to broadcast
        """
        disconnected_connections = []
        
        for user_id, connections in self.active_connections.items():
            for websocket in connections:
                try:
                    await websocket.send_text(json.dumps(message))
                    
                    # Update last activity
                    if websocket in self.connection_metadata:
                        self.connection_metadata[websocket]["last_activity"] = datetime.utcnow()
                        
                except Exception as e:
                    logger.error(f"Failed to broadcast to user {user_id}: {e}")
                    disconnected_connections.append(websocket)
        
        # Clean up disconnected connections
        for websocket in disconnected_connections:
            self.disconnect(websocket)
    
    async def send_metrics_update(self, server_id: str, metrics_data: Dict[str, Any]):
        """
        Send metrics update to all connected users.
        
        Args:
            server_id: ID of the server with updated metrics
            metrics_data: Metrics data to send
        """
        message = {
            "type": "metrics_update",
            "data": {
                "server_id": server_id,
                "metrics": metrics_data
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        await self.broadcast_to_all(message)
    
    async def send_alert_update(self, alert_data: Dict[str, Any]):
        """
        Send alert update to all connected users.
        
        Args:
            alert_data: Alert data to send
        """
        message = {
            "type": "alert_update",
            "data": alert_data,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        await self.broadcast_to_all(message)
    
    async def send_server_status_change(self, server_id: str, status: str, last_seen: str):
        """
        Send server status change to all connected users.
        
        Args:
            server_id: ID of the server with status change
            status: New status of the server
            last_seen: Last seen timestamp
        """
        message = {
            "type": "server_status_change",
            "data": {
                "server_id": server_id,
                "status": status,
                "last_seen": last_seen
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        await self.broadcast_to_all(message)
    
    async def send_server_registered(self, server_data: Dict[str, Any]):
        """
        Send server registration notification to all connected users.
        
        Args:
            server_data: Server registration data
        """
        message = {
            "type": "server_registered",
            "data": server_data,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        await self.broadcast_to_all(message)
    
    async def send_server_deregistered(self, server_id: str):
        """
        Send server deregistration notification to all connected users.
        
        Args:
            server_id: ID of the deregistered server
        """
        message = {
            "type": "server_deregistered",
            "data": {
                "server_id": server_id,
                "message": f"Server {server_id} has been deregistered"
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        await self.broadcast_to_all(message)
    
    async def send_settings_updated(self, user_id: int, settings_data: Dict[str, Any]):
        """
        Send settings update notification to a specific user.
        
        Args:
            user_id: ID of the user whose settings were updated
            settings_data: Updated settings data
        """
        message = {
            "type": "settings_updated",
            "data": {
                "message": "Dashboard settings have been updated",
                "settings": settings_data
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        await self.send_to_user(message, user_id)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about current WebSocket connections.
        
        Returns:
            Dictionary containing connection statistics
        """
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        
        return {
            "total_connections": total_connections,
            "connected_users": len(self.active_connections),
            "connections_per_user": {
                user_id: len(connections) 
                for user_id, connections in self.active_connections.items()
            }
        }
    
    def get_user_connections(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get connection information for a specific user.
        
        Args:
            user_id: ID of the user to get connections for
            
        Returns:
            List of connection information dictionaries
        """
        if user_id not in self.active_connections:
            return []
        
        connections_info = []
        for websocket in self.active_connections[user_id]:
            if websocket in self.connection_metadata:
                metadata = self.connection_metadata[websocket]
                connections_info.append({
                    "connected_at": metadata["connected_at"].isoformat() + "Z",
                    "last_activity": metadata["last_activity"].isoformat() + "Z",
                    "username": metadata["username"]
                })
        
        return connections_info


# Global connection manager instance
connection_manager = WebSocketConnectionManager()


async def authenticate_websocket_user(token: str, db_session: Session) -> Optional[int]:
    """
    Authenticate a WebSocket connection using JWT token.
    
    Args:
        token: JWT token from query parameters
        db_session: Database session for authentication
        
    Returns:
        User ID if authentication successful, None otherwise
    """
    try:
        auth_service = DashboardAuthService(
            db_session, 
            connection_manager.jwt_secret
        )
        
        payload = auth_service.validate_access_token(token)
        if not payload:
            return None
        
        user_id = int(payload.get("sub"))
        return user_id
        
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        return None


async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None, 
                           db_session: Session = Depends(get_db_session)):
    """
    WebSocket endpoint for dashboard real-time updates.
    
    Args:
        websocket: WebSocket connection
        token: JWT authentication token from query parameters
        db_session: Database session dependency
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Authenticate user
    user_id = await authenticate_websocket_user(token, db_session)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Connect user
    await connection_manager.connect(websocket, user_id, db_session)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await handle_client_message(message, websocket, user_id, db_session)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from user {user_id}")
                await connection_manager.send_personal_message({
                    "type": "error",
                    "data": {"message": "Invalid JSON format"},
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }, websocket)
                
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        connection_manager.disconnect(websocket)


async def handle_client_message(message: Dict[str, Any], websocket: WebSocket, 
                               user_id: int, db_session: Session):
    """
    Handle messages received from WebSocket clients.
    
    Args:
        message: Message data from client
        websocket: WebSocket connection
        user_id: ID of the authenticated user
        db_session: Database session
    """
    message_type = message.get("type")
    
    if message_type == "ping":
        # Respond to ping with pong
        await connection_manager.send_personal_message({
            "type": "pong",
            "data": {"message": "pong"},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }, websocket)
        
    elif message_type == "subscribe_server":
        # Handle server-specific subscription (future enhancement)
        server_id = message.get("data", {}).get("server_id")
        if server_id:
            await connection_manager.send_personal_message({
                "type": "subscription_confirmed",
                "data": {"server_id": server_id, "message": "Subscribed to server updates"},
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, websocket)
    
    elif message_type == "get_connection_stats":
        # Send connection statistics (admin only)
        user = db_session.query(DashboardUser).filter(
            DashboardUser.id == user_id
        ).first()
        
        if user and user.is_admin:
            stats = connection_manager.get_connection_stats()
            await connection_manager.send_personal_message({
                "type": "connection_stats",
                "data": stats,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, websocket)
    
    elif message_type == "subscribe_alerts":
        # Handle alert subscription
        await connection_manager.send_personal_message({
            "type": "subscription_confirmed",
            "data": {"message": "Subscribed to alert updates"},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }, websocket)
    
    elif message_type == "subscribe_server_management":
        # Handle server management subscription (admin only)
        user = db_session.query(DashboardUser).filter(
            DashboardUser.id == user_id
        ).first()
        
        if user and user.is_admin:
            await connection_manager.send_personal_message({
                "type": "subscription_confirmed",
                "data": {"message": "Subscribed to server management updates"},
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, websocket)
        else:
            await connection_manager.send_personal_message({
                "type": "error",
                "data": {"message": "Admin privileges required for server management subscription"},
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, websocket)
    
    elif message_type == "request_metrics_refresh":
        # Handle manual metrics refresh request
        server_id = message.get("data", {}).get("server_id")
        if server_id:
            await connection_manager.send_personal_message({
                "type": "metrics_refresh_requested",
                "data": {"server_id": server_id, "message": "Metrics refresh requested"},
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, websocket)
    
    else:
        # Unknown message type
        await connection_manager.send_personal_message({
            "type": "error",
            "data": {"message": f"Unknown message type: {message_type}"},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }, websocket)