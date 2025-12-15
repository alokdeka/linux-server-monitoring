"""
Integration tests for agent metrics collection.
"""

import pytest
from datetime import datetime
from agent.metrics.collector import MetricsCollector
from agent.metrics.systemd_monitor import SystemdMonitor
from shared.models import SystemMetrics, MemoryInfo, DiskUsage, LoadAverage, FailedService


class TestMetricsIntegration:
    """Integration tests for metrics collection components."""

    def test_complete_metrics_collection(self):
        """Test that we can collect all metrics and create a SystemMetrics object."""
        collector = MetricsCollector()
        monitor = SystemdMonitor()
        
        # Collect all metrics
        cpu_usage = collector.collect_cpu_usage()
        memory_data = collector.collect_memory_usage()
        disk_data = collector.collect_disk_usage()
        load_data = collector.collect_load_average()
        uptime = collector.collect_uptime()
        failed_services = monitor.get_failed_services()
        
        # Create data model objects
        memory = MemoryInfo(
            total=memory_data['total'],
            used=memory_data['used'],
            percentage=memory_data['percentage']
        )
        
        disk_usage = [
            DiskUsage(
                mountpoint=disk['mountpoint'],
                total=disk['total'],
                used=disk['used'],
                percentage=disk['percentage']
            )
            for disk in disk_data
        ]
        
        load_average = LoadAverage(
            one_min=load_data['1min'],
            five_min=load_data['5min'],
            fifteen_min=load_data['15min']
        )
        
        # Create complete SystemMetrics object
        metrics = SystemMetrics(
            server_id="test-server",
            timestamp=datetime.utcnow().isoformat() + "Z",
            cpu_usage=cpu_usage,
            memory=memory,
            disk_usage=disk_usage,
            load_average=load_average,
            uptime=uptime,
            failed_services=failed_services
        )
        
        # Verify the complete metrics object
        assert metrics.server_id == "test-server"
        assert isinstance(metrics.timestamp, str)
        assert isinstance(metrics.cpu_usage, float)
        assert isinstance(metrics.memory, MemoryInfo)
        assert isinstance(metrics.disk_usage, list)
        assert isinstance(metrics.load_average, LoadAverage)
        assert isinstance(metrics.uptime, int)
        assert isinstance(metrics.failed_services, list)
        
        # Test JSON serialization
        json_str = metrics.to_json()
        assert isinstance(json_str, str)
        assert len(json_str) > 0
        
        # Test JSON deserialization
        restored_metrics = SystemMetrics.from_json(json_str)
        assert restored_metrics.server_id == metrics.server_id
        assert restored_metrics.cpu_usage == metrics.cpu_usage
        assert restored_metrics.memory.total == metrics.memory.total
        assert len(restored_metrics.disk_usage) == len(metrics.disk_usage)
        assert restored_metrics.load_average.one_min == metrics.load_average.one_min