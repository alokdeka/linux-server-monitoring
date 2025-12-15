"""
Pytest configuration and shared fixtures for the test suite.
"""

import pytest
from hypothesis import settings, Verbosity
from datetime import datetime
from shared.models import SystemMetrics, MemoryInfo, DiskUsage, LoadAverage, FailedService


# Configure Hypothesis for property-based testing
settings.register_profile("default", max_examples=100, verbosity=Verbosity.normal)
settings.load_profile("default")


@pytest.fixture
def sample_memory_info():
    """Sample memory information for testing."""
    return MemoryInfo(
        total=8589934592,  # 8GB
        used=4294967296,   # 4GB
        percentage=50.0
    )


@pytest.fixture
def sample_disk_usage():
    """Sample disk usage information for testing."""
    return [
        DiskUsage(
            mountpoint="/",
            total=107374182400,  # 100GB
            used=53687091200,    # 50GB
            percentage=50.0
        ),
        DiskUsage(
            mountpoint="/home",
            total=214748364800,  # 200GB
            used=64424509440,    # 60GB
            percentage=30.0
        )
    ]


@pytest.fixture
def sample_load_average():
    """Sample load average information for testing."""
    return LoadAverage(
        one_min=1.2,
        five_min=1.1,
        fifteen_min=0.9
    )


@pytest.fixture
def sample_failed_services():
    """Sample failed services for testing."""
    return [
        FailedService(
            name="nginx",
            status="failed",
            since="2024-12-15T09:15:00Z"
        ),
        FailedService(
            name="redis",
            status="failed"
        )
    ]


@pytest.fixture
def sample_system_metrics(sample_memory_info, sample_disk_usage, 
                         sample_load_average, sample_failed_services):
    """Complete sample system metrics for testing."""
    return SystemMetrics(
        server_id="test-server-001",
        timestamp="2024-12-15T10:30:00Z",
        cpu_usage=45.2,
        memory=sample_memory_info,
        disk_usage=sample_disk_usage,
        load_average=sample_load_average,
        uptime=86400,
        failed_services=sample_failed_services
    )