"""
System metrics collector using psutil.

This module implements the MetricsCollector class that gathers system metrics
including CPU usage, memory usage, disk usage, load average, and uptime.
"""

import psutil
from typing import List, Dict
from shared.interfaces import MetricsCollectorInterface
from shared.models import MemoryInfo, DiskUsage, LoadAverage


class MetricsCollector(MetricsCollectorInterface):
    """Collects system metrics using psutil library."""

    def collect_cpu_usage(self) -> float:
        """
        Collect CPU usage percentage (0-100).
        
        Returns:
            float: CPU usage percentage as a float between 0 and 100
        """
        # Use interval=1 to get a meaningful CPU percentage over 1 second
        return psutil.cpu_percent(interval=1)

    def collect_memory_usage(self) -> Dict:
        """
        Collect memory usage information.
        
        Returns:
            Dict: Dictionary containing memory information with keys:
                - total: Total memory in bytes
                - used: Used memory in bytes  
                - percentage: Memory usage percentage
        """
        memory = psutil.virtual_memory()
        return {
            'total': memory.total,
            'used': memory.used,
            'percentage': memory.percent
        }

    def collect_disk_usage(self) -> List[Dict]:
        """
        Collect disk usage for all mounted filesystems.
        
        Returns:
            List[Dict]: List of dictionaries, each containing:
                - mountpoint: Mount point path
                - total: Total disk space in bytes
                - used: Used disk space in bytes
                - percentage: Disk usage percentage
        """
        disk_usage_list = []
        
        # Get all disk partitions
        partitions = psutil.disk_partitions()
        
        for partition in partitions:
            try:
                # Get usage statistics for this partition
                usage = psutil.disk_usage(partition.mountpoint)
                
                disk_info = {
                    'mountpoint': partition.mountpoint,
                    'total': usage.total,
                    'used': usage.used,
                    'percentage': (usage.used / usage.total) * 100 if usage.total > 0 else 0
                }
                disk_usage_list.append(disk_info)
                
            except PermissionError:
                # Skip partitions we can't access (e.g., system partitions on some systems)
                continue
            except OSError:
                # Skip invalid or unmounted partitions
                continue
                
        return disk_usage_list

    def collect_load_average(self) -> Dict:
        """
        Collect system load average.
        
        Returns:
            Dict: Dictionary containing load average with keys:
                - 1min: 1-minute load average
                - 5min: 5-minute load average  
                - 15min: 15-minute load average
        """
        # psutil.getloadavg() returns a tuple of (1min, 5min, 15min)
        load_avg = psutil.getloadavg()
        
        return {
            '1min': load_avg[0],
            '5min': load_avg[1],
            '15min': load_avg[2]
        }

    def collect_uptime(self) -> int:
        """
        Collect system uptime in seconds.
        
        Returns:
            int: System uptime in seconds since boot
        """
        import time
        
        # psutil.boot_time() returns timestamp when system was booted
        boot_time = psutil.boot_time()
        current_time = time.time()
        
        # Calculate uptime as difference between current time and boot time
        uptime_seconds = int(current_time - boot_time)
        
        return uptime_seconds