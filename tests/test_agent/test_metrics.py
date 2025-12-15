"""
Tests for agent metrics collection functionality.
"""

import pytest
from agent.metrics.collector import MetricsCollector
from agent.metrics.systemd_monitor import SystemdMonitor


class TestMetricsCollector:
    """Test cases for MetricsCollector class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.collector = MetricsCollector()

    def test_collect_cpu_usage(self):
        """Test CPU usage collection returns valid percentage."""
        cpu_usage = self.collector.collect_cpu_usage()
        
        assert isinstance(cpu_usage, float)
        assert 0.0 <= cpu_usage <= 100.0

    def test_collect_memory_usage(self):
        """Test memory usage collection returns valid data structure."""
        memory = self.collector.collect_memory_usage()
        
        assert isinstance(memory, dict)
        assert 'total' in memory
        assert 'used' in memory
        assert 'percentage' in memory
        
        assert isinstance(memory['total'], int)
        assert isinstance(memory['used'], int)
        assert isinstance(memory['percentage'], float)
        
        assert memory['total'] > 0
        assert memory['used'] >= 0
        assert 0.0 <= memory['percentage'] <= 100.0
        assert memory['used'] <= memory['total']

    def test_collect_disk_usage(self):
        """Test disk usage collection returns valid data structure."""
        disk_usage = self.collector.collect_disk_usage()
        
        assert isinstance(disk_usage, list)
        assert len(disk_usage) > 0  # Should have at least one mounted filesystem
        
        for disk in disk_usage:
            assert isinstance(disk, dict)
            assert 'mountpoint' in disk
            assert 'total' in disk
            assert 'used' in disk
            assert 'percentage' in disk
            
            assert isinstance(disk['mountpoint'], str)
            assert isinstance(disk['total'], int)
            assert isinstance(disk['used'], int)
            assert isinstance(disk['percentage'], float)
            
            assert disk['total'] > 0
            assert disk['used'] >= 0
            assert 0.0 <= disk['percentage'] <= 100.0
            assert disk['used'] <= disk['total']

    def test_collect_load_average(self):
        """Test load average collection returns valid data structure."""
        load_avg = self.collector.collect_load_average()
        
        assert isinstance(load_avg, dict)
        assert '1min' in load_avg
        assert '5min' in load_avg
        assert '15min' in load_avg
        
        assert isinstance(load_avg['1min'], float)
        assert isinstance(load_avg['5min'], float)
        assert isinstance(load_avg['15min'], float)
        
        # Load averages should be non-negative
        assert load_avg['1min'] >= 0.0
        assert load_avg['5min'] >= 0.0
        assert load_avg['15min'] >= 0.0

    def test_collect_uptime(self):
        """Test uptime collection returns valid value."""
        uptime = self.collector.collect_uptime()
        
        assert isinstance(uptime, int)
        assert uptime > 0  # System should have been running for some time


class TestSystemdMonitor:
    """Test cases for SystemdMonitor class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.monitor = SystemdMonitor()

    def test_get_failed_services(self):
        """Test failed services detection returns valid data structure."""
        failed_services = self.monitor.get_failed_services()
        
        assert isinstance(failed_services, list)
        
        # Each failed service should have the correct structure
        for service in failed_services:
            assert hasattr(service, 'name')
            assert hasattr(service, 'status')
            assert hasattr(service, 'since')
            
            assert isinstance(service.name, str)
            assert isinstance(service.status, str)
            assert len(service.name) > 0
            assert service.status == 'failed'