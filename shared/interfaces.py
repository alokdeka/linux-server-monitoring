"""
Shared interfaces for the Linux Server Health Monitoring System.

These interfaces define the contracts between different components.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from .models import SystemMetrics, FailedService


class MetricsCollectorInterface(ABC):
    """Interface for collecting system metrics."""

    @abstractmethod
    def collect_cpu_usage(self) -> float:
        """Collect CPU usage percentage (0-100)."""
        pass

    @abstractmethod
    def collect_memory_usage(self) -> Dict:
        """Collect memory usage information."""
        pass

    @abstractmethod
    def collect_disk_usage(self) -> List[Dict]:
        """Collect disk usage for all mounted filesystems."""
        pass

    @abstractmethod
    def collect_load_average(self) -> Dict:
        """Collect system load average."""
        pass

    @abstractmethod
    def collect_uptime(self) -> int:
        """Collect system uptime in seconds."""
        pass


class SystemdMonitorInterface(ABC):
    """Interface for monitoring systemd services."""

    @abstractmethod
    def get_failed_services(self) -> List[FailedService]:
        """Get list of failed systemd services."""
        pass


class HTTPTransmitterInterface(ABC):
    """Interface for HTTP communication with central server."""

    @abstractmethod
    def send_metrics(self, data: SystemMetrics, api_key: str) -> bool:
        """Send metrics to central server."""
        pass

    @abstractmethod
    def authenticate(self, api_key: str) -> bool:
        """Authenticate with central server."""
        pass


class ConfigManagerInterface(ABC):
    """Interface for configuration management."""

    @abstractmethod
    def load_config(self, config_path: str) -> Dict:
        """Load configuration from file."""
        pass

    @abstractmethod
    def get_setting(self, key: str, default=None):
        """Get configuration setting with optional default."""
        pass


class DatabaseManagerInterface(ABC):
    """Interface for database operations."""

    @abstractmethod
    def store_metrics(self, metrics: SystemMetrics) -> bool:
        """Store metrics in database."""
        pass

    @abstractmethod
    def get_server_status(self, server_id: str) -> Optional[str]:
        """Get current status of a server."""
        pass

    @abstractmethod
    def update_last_seen(self, server_id: str) -> bool:
        """Update last seen timestamp for a server."""
        pass