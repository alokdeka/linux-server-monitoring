"""
Alert system for the Linux Server Health Monitoring System.

This module provides alerting functionality including rule-based alert evaluation,
console logging, and webhook notifications.
"""

from .engine import AlertEngine

__all__ = ['AlertEngine']