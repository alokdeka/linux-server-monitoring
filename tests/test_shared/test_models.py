"""
Tests for shared data models.
"""

import pytest
import json
from hypothesis import given, strategies as st
from shared.models import (
    SystemMetrics, MemoryInfo, DiskUsage, LoadAverage, FailedService
)


class TestSystemMetrics:
    """Test cases for SystemMetrics model."""

    def test_system_metrics_creation(self, sample_system_metrics):
        """Test that SystemMetrics can be created with valid data."""
        metrics = sample_system_metrics
        assert metrics.server_id == "test-server-001"
        assert metrics.cpu_usage == 45.2
        assert isinstance(metrics.memory, MemoryInfo)
        assert isinstance(metrics.disk_usage, list)
        assert isinstance(metrics.load_average, LoadAverage)
        assert metrics.uptime == 86400

    def test_to_json_serialization(self, sample_system_metrics):
        """Test JSON serialization of SystemMetrics."""
        metrics = sample_system_metrics
        json_str = metrics.to_json()
        
        # Verify it's valid JSON
        parsed = json.loads(json_str)
        assert parsed["server_id"] == "test-server-001"
        assert parsed["cpu_usage"] == 45.2
        assert "memory" in parsed
        assert "disk_usage" in parsed

    def test_from_json_deserialization(self, sample_system_metrics):
        """Test JSON deserialization of SystemMetrics."""
        original = sample_system_metrics
        json_str = original.to_json()
        
        # Deserialize back
        restored = SystemMetrics.from_json(json_str)
        
        # Verify all fields match
        assert restored.server_id == original.server_id
        assert restored.cpu_usage == original.cpu_usage
        assert restored.memory.total == original.memory.total
        assert restored.memory.used == original.memory.used
        assert len(restored.disk_usage) == len(original.disk_usage)


class TestMemoryInfo:
    """Test cases for MemoryInfo model."""

    def test_memory_info_creation(self):
        """Test MemoryInfo creation with valid data."""
        memory = MemoryInfo(total=8589934592, used=4294967296, percentage=50.0)
        assert memory.total == 8589934592
        assert memory.used == 4294967296
        assert memory.percentage == 50.0


class TestDiskUsage:
    """Test cases for DiskUsage model."""

    def test_disk_usage_creation(self):
        """Test DiskUsage creation with valid data."""
        disk = DiskUsage(
            mountpoint="/",
            total=107374182400,
            used=53687091200,
            percentage=50.0
        )
        assert disk.mountpoint == "/"
        assert disk.total == 107374182400
        assert disk.used == 53687091200
        assert disk.percentage == 50.0