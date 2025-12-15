"""
Tests for the DatabaseManager class.

Tests the high-level database manager that implements metrics storage,
server management, and health tracking functionality.
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch

from server.database.manager import DatabaseManager
from shared.models import SystemMetrics, MemoryInfo, DiskUsage, LoadAverage, FailedService


class TestDatabaseManager:
    """Test cases for DatabaseManager class."""
    
    def test_store_metrics_success(self, sample_system_metrics):
        """Test successful metrics storage."""
        # Mock the connection manager and session
        mock_connection_manager = Mock()
        mock_session = Mock()
        
        # Mock the context manager properly
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_session)
        mock_context.__exit__ = Mock(return_value=None)
        mock_connection_manager.get_session.return_value = mock_context
        
        # Create DatabaseManager with mocked connection
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Mock the MetricOperations.store_metrics to return a mock metric
        with patch('server.database.manager.MetricOperations.store_metrics') as mock_store:
            mock_metric = Mock()
            mock_store.return_value = mock_metric
            
            # Test storing metrics
            result = db_manager.store_metrics(sample_system_metrics)
            
            # Verify the result and that store_metrics was called
            assert result is True
            mock_store.assert_called_once_with(mock_session, sample_system_metrics)
    
    def test_store_metrics_failure(self, sample_system_metrics):
        """Test metrics storage failure handling."""
        # Mock the connection manager to raise an exception
        mock_connection_manager = Mock()
        mock_connection_manager.get_session.side_effect = Exception("Database error")
        
        # Create DatabaseManager with mocked connection
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Test storing metrics with failure
        result = db_manager.store_metrics(sample_system_metrics)
        
        # Verify the result is False on failure
        assert result is False
    
    def test_get_server_status_success(self):
        """Test successful server status retrieval."""
        # Mock the connection manager and session
        mock_connection_manager = Mock()
        mock_session = Mock()
        
        # Mock the context manager properly
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_session)
        mock_context.__exit__ = Mock(return_value=None)
        mock_connection_manager.get_session.return_value = mock_context
        
        # Create DatabaseManager with mocked connection
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Mock the HealthStatusOperations.get_health_status
        with patch('server.database.manager.HealthStatusOperations.get_health_status') as mock_get:
            mock_health_status = Mock()
            mock_health_status.status = "healthy"
            mock_get.return_value = mock_health_status
            
            # Test getting server status
            result = db_manager.get_server_status("test-server")
            
            # Verify the result
            assert result == "healthy"
            mock_get.assert_called_once_with(mock_session, "test-server")
    
    def test_get_server_status_not_found(self):
        """Test server status retrieval when server not found."""
        # Mock the connection manager and session
        mock_connection_manager = Mock()
        mock_session = Mock()
        
        # Mock the context manager properly
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_session)
        mock_context.__exit__ = Mock(return_value=None)
        mock_connection_manager.get_session.return_value = mock_context
        
        # Create DatabaseManager with mocked connection
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Mock the HealthStatusOperations.get_health_status to return None
        with patch('server.database.manager.HealthStatusOperations.get_health_status') as mock_get:
            mock_get.return_value = None
            
            # Test getting server status for non-existent server
            result = db_manager.get_server_status("non-existent-server")
            
            # Verify the result is None
            assert result is None
    
    def test_update_last_seen_success(self):
        """Test successful last seen timestamp update."""
        # Mock the connection manager and session
        mock_connection_manager = Mock()
        mock_session = Mock()
        
        # Mock the context manager properly
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_session)
        mock_context.__exit__ = Mock(return_value=None)
        mock_connection_manager.get_session.return_value = mock_context
        
        # Create DatabaseManager with mocked connection
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Mock the ServerOperations.update_last_seen
        with patch('server.database.manager.ServerOperations.update_last_seen') as mock_update:
            # Test updating last seen
            result = db_manager.update_last_seen("test-server")
            
            # Verify the result and that update_last_seen was called
            assert result is True
            mock_update.assert_called_once_with(mock_session, "test-server")
    
    def test_update_last_seen_failure(self):
        """Test last seen timestamp update failure handling."""
        # Mock the connection manager to raise an exception
        mock_connection_manager = Mock()
        mock_connection_manager.get_session.side_effect = Exception("Database error")
        
        # Create DatabaseManager with mocked connection
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Test updating last seen with failure
        result = db_manager.update_last_seen("test-server")
        
        # Verify the result is False on failure
        assert result is False
    
    def test_health_check(self):
        """Test database health check."""
        # Mock the connection manager
        mock_connection_manager = Mock()
        mock_connection_manager.health_check.return_value = True
        
        # Create DatabaseManager with mocked connection
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Test health check
        result = db_manager.health_check()
        
        # Verify the result
        assert result is True
        mock_connection_manager.health_check.assert_called_once()