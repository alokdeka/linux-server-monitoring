"""
WebSocket module for real-time dashboard communication.

This module provides WebSocket functionality for the dashboard interface,
enabling real-time updates for metrics, alerts, and server status changes.
"""

from .dashboard_websocket import connection_manager, websocket_endpoint

__all__ = ["connection_manager", "websocket_endpoint"]