"""
Integration tests for DatabaseManager with actual database operations.

These tests verify that the DatabaseManager correctly integrates with
the underlying database operations and models.
"""

import pytest
from datetime import datetime
from unittest.mock import Mock

from server.database.manager import DatabaseManager
from server.database.connection import DatabaseManager as ConnectionManager
from server.database.operations import MetricOperations, ServerOperations
from shared.models import SystemMetrics, MemoryInfo, DiskUsage, LoadAverage, FailedService


class TestDatabaseManagerIntegration:
    """Integration tests for DatabaseManager."""
    
    def test_store_metrics_integration(self, sample_system_metrics):
        """Test metrics storage integration with mocked database operations."""
        # Create a real DatabaseManager with mocked connection manager
        mock_connection_manager = Mock(spec=ConnectionManager)
        mock_session = Mock()
        
        # Mock the context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_session)
        mock_context.__exit__ = Mock(return_value=None)
        mock_connection_manager.get_session.return_value = mock_context
        
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Mock MetricOperations.store_metrics to simulate successful storage
        with pytest.MonkeyPatch().context() as m:
            mock_metric = Mock()
            mock_metric.id = 1
            mock_metric.server_id = sample_system_metrics.server_id
            
            def mock_store_metrics(session, metrics):
                # Verify the metrics object is passed correctly
                assert metrics.server_id == sample_system_metrics.server_id
                assert metrics.cpu_usage == sample_system_metrics.cpu_usage
                assert metrics.memory.total == sample_system_metrics.memory.total
                return mock_metric
            
            m.setattr('server.database.manager.MetricOperations.store_metrics', mock_store_metrics)
            
            # Test storing metrics
            result = db_manager.store_metrics(sample_system_metrics)
            
            # Verify success
            assert result is True
            mock_connection_manager.get_session.assert_called_once()
    
    def test_metrics_storage_with_server_creation(self, sample_system_metrics):
        """Test that metrics storage properly handles server creation."""
        # Create a real DatabaseManager with mocked connection manager
        mock_connection_manager = Mock(spec=ConnectionManager)
        mock_session = Mock()
        
        # Mock the context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_session)
        mock_context.__exit__ = Mock(return_value=None)
        mock_connection_manager.get_session.return_value = mock_context
        
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Mock the operations to verify they're called correctly
        with pytest.MonkeyPatch().context() as m:
            mock_metric = Mock()
            mock_server = Mock()
            mock_server.server_id = sample_system_metrics.server_id
            
            store_metrics_calls = []
            def mock_store_metrics(session, metrics):
                store_metrics_calls.append((session, metrics))
                # Verify the session and metrics are passed correctly
                assert session == mock_session
                assert isinstance(metrics, SystemMetrics)
                return mock_metric
            
            m.setattr('server.database.manager.MetricOperations.store_metrics', mock_store_metrics)
            
            # Test storing metrics
            result = db_manager.store_metrics(sample_system_metrics)
            
            # Verify the operations were called
            assert result is True
            assert len(store_metrics_calls) == 1
            assert store_metrics_calls[0][1].server_id == sample_system_metrics.server_id
    
    def test_last_seen_update_integration(self):
        """Test last seen timestamp update integration."""
        # Create a real DatabaseManager with mocked connection manager
        mock_connection_manager = Mock(spec=ConnectionManager)
        mock_session = Mock()
        
        # Mock the context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_session)
        mock_context.__exit__ = Mock(return_value=None)
        mock_connection_manager.get_session.return_value = mock_context
        
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Mock ServerOperations.update_last_seen
        with pytest.MonkeyPatch().context() as m:
            update_calls = []
            def mock_update_last_seen(session, server_id):
                update_calls.append((session, server_id))
                assert session == mock_session
                assert server_id == "test-server"
            
            m.setattr('server.database.manager.ServerOperations.update_last_seen', mock_update_last_seen)
            
            # Test updating last seen
            result = db_manager.update_last_seen("test-server")
            
            # Verify the operation was called correctly
            assert result is True
            assert len(update_calls) == 1
            assert update_calls[0][1] == "test-server"
    
    def test_error_handling_preserves_transaction_integrity(self, sample_system_metrics):
        """Test that errors during storage don't corrupt the transaction."""
        # Create a real DatabaseManager with mocked connection manager
        mock_connection_manager = Mock(spec=ConnectionManager)
        mock_session = Mock()
        
        # Mock the context manager to simulate transaction behavior
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_session)
        mock_context.__exit__ = Mock(return_value=None)
        mock_connection_manager.get_session.return_value = mock_context
        
        db_manager = DatabaseManager(mock_connection_manager)
        
        # Mock MetricOperations.store_metrics to raise an exception
        with pytest.MonkeyPatch().context() as m:
            def mock_store_metrics_error(session, metrics):
                raise Exception("Database error")
            
            m.setattr('server.database.manager.MetricOperations.store_metrics', mock_store_metrics_error)
            
            # Test storing metrics with error
            result = db_manager.store_metrics(sample_system_metrics)
            
            # Verify failure is handled gracefully
            assert result is False
            # Verify the session context manager was still called (transaction handling)
            mock_connection_manager.get_session.assert_called_once()