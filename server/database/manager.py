"""
High-level database manager for the Linux Server Health Monitoring System.

This module provides a DatabaseManager class that implements the DatabaseManagerInterface
and provides business logic for metrics storage, server management, and health tracking.
"""

import logging
from typing import Optional
from datetime import datetime

from shared.interfaces import DatabaseManagerInterface
from shared.models import SystemMetrics
from .connection import db_manager
from .operations import (
    ServerOperations, MetricOperations, HealthStatusOperations, ApiKeyOperations
)

logger = logging.getLogger(__name__)


class DatabaseManager(DatabaseManagerInterface):
    """
    High-level database manager that implements business logic for metrics storage
    and server management.
    """
    
    def __init__(self, connection_manager=None):
        """Initialize database manager with optional connection manager."""
        self.connection_manager = connection_manager or db_manager
        
    def store_metrics(self, metrics: SystemMetrics) -> bool:
        """
        Store metrics in database and update server last-seen timestamp.
        
        Args:
            metrics: SystemMetrics object containing all collected metrics
            
        Returns:
            bool: True if metrics were stored successfully, False otherwise
        """
        try:
            with self.connection_manager.get_session() as session:
                # Store the metrics (this also updates last_seen via MetricOperations.store_metrics)
                stored_metric = MetricOperations.store_metrics(session, metrics)
                
                logger.info(f"Stored metrics for server {metrics.server_id} at {metrics.timestamp}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to store metrics for server {metrics.server_id}: {e}")
            return False
    
    def get_server_status(self, server_id: str) -> Optional[str]:
        """
        Get current health status of a server.
        
        Args:
            server_id: Unique identifier for the server
            
        Returns:
            Optional[str]: Current status ('healthy', 'warning', 'down') or None if not found
        """
        try:
            with self.connection_manager.get_session() as session:
                health_status = HealthStatusOperations.get_health_status(session, server_id)
                return health_status.status if health_status else None
                
        except Exception as e:
            logger.error(f"Failed to get server status for {server_id}: {e}")
            return None
    
    def update_last_seen(self, server_id: str) -> bool:
        """
        Update last seen timestamp for a server.
        
        Args:
            server_id: Unique identifier for the server
            
        Returns:
            bool: True if timestamp was updated successfully, False otherwise
        """
        try:
            with self.connection_manager.get_session() as session:
                ServerOperations.update_last_seen(session, server_id)
                logger.debug(f"Updated last_seen timestamp for server {server_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to update last_seen for server {server_id}: {e}")
            return False
    
    def get_latest_metrics(self, server_id: str, limit: int = 1):
        """
        Get the latest metrics for a server.
        
        Args:
            server_id: Unique identifier for the server
            limit: Maximum number of metric records to return
            
        Returns:
            List of Metric objects or empty list if none found
        """
        try:
            with self.connection_manager.get_session() as session:
                return MetricOperations.get_latest_metrics(session, server_id, limit)
                
        except Exception as e:
            logger.error(f"Failed to get latest metrics for server {server_id}: {e}")
            return []
    
    def get_server_info(self, server_id: str):
        """
        Get server information including registration details.
        
        Args:
            server_id: Unique identifier for the server
            
        Returns:
            Server object or None if not found
        """
        try:
            with self.connection_manager.get_session() as session:
                return ServerOperations.get_server(session, server_id)
                
        except Exception as e:
            logger.error(f"Failed to get server info for {server_id}: {e}")
            return None
    
    def ensure_server_exists(self, server_id: str, hostname: Optional[str] = None, 
                           ip_address: Optional[str] = None):
        """
        Ensure a server record exists, creating it if necessary.
        
        Args:
            server_id: Unique identifier for the server
            hostname: Optional hostname for the server
            ip_address: Optional IP address for the server
            
        Returns:
            Server object (existing or newly created)
        """
        try:
            with self.connection_manager.get_session() as session:
                return ServerOperations.get_or_create_server(
                    session, server_id, hostname, ip_address
                )
                
        except Exception as e:
            logger.error(f"Failed to ensure server exists for {server_id}: {e}")
            return None
    
    def health_check(self) -> bool:
        """
        Check if database connection is healthy.
        
        Returns:
            bool: True if database is accessible, False otherwise
        """
        return self.connection_manager.health_check()


# Global database manager instance for the application
database_manager = DatabaseManager()