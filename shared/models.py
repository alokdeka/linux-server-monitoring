"""
Shared data models for the Linux Server Health Monitoring System.

These models define the structure of data exchanged between agents and the central server.
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime
import json


@dataclass
class MemoryInfo:
    """Memory usage information."""
    total: int
    used: int
    percentage: float


@dataclass
class DiskUsage:
    """Disk usage information for a filesystem."""
    mountpoint: str
    total: int
    used: int
    percentage: float


@dataclass
class LoadAverage:
    """System load average information."""
    one_min: float
    five_min: float
    fifteen_min: float


@dataclass
class FailedService:
    """Information about a failed systemd service."""
    name: str
    status: str
    since: Optional[str] = None


@dataclass
class SystemMetrics:
    """Complete system metrics collected by an agent."""
    server_id: str
    timestamp: str
    cpu_usage: float
    memory: MemoryInfo
    disk_usage: List[DiskUsage]
    load_average: LoadAverage
    uptime: int
    failed_services: List[FailedService]

    def to_json(self) -> str:
        """Serialize metrics to JSON string."""
        return json.dumps(self, default=lambda o: o.__dict__, indent=2)

    @classmethod
    def from_json(cls, json_str: str) -> 'SystemMetrics':
        """Deserialize metrics from JSON string."""
        data = json.loads(json_str)
        
        # Convert nested dictionaries back to dataclass instances
        memory = MemoryInfo(**data['memory'])
        disk_usage = [DiskUsage(**disk) for disk in data['disk_usage']]
        load_average = LoadAverage(**data['load_average'])
        failed_services = [FailedService(**service) for service in data['failed_services']]
        
        return cls(
            server_id=data['server_id'],
            timestamp=data['timestamp'],
            cpu_usage=data['cpu_usage'],
            memory=memory,
            disk_usage=disk_usage,
            load_average=load_average,
            uptime=data['uptime'],
            failed_services=failed_services
        )