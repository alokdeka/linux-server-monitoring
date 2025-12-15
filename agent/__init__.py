"""
Linux Server Health Monitoring Agent

This package contains the agent components that run on monitored Linux servers
to collect system metrics and transmit them to the central monitoring server.
"""

from .service import AgentService

__version__ = "1.0.0"
__all__ = ["AgentService"]