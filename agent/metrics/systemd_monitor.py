"""
Systemd service monitor.

This module implements the SystemdMonitor class that monitors systemd services
and detects failed services on the system.
"""

import subprocess
import json
from typing import List
from datetime import datetime
from shared.interfaces import SystemdMonitorInterface
from shared.models import FailedService


class SystemdMonitor(SystemdMonitorInterface):
    """Monitors systemd services and detects failed services."""

    def get_failed_services(self) -> List[FailedService]:
        """
        Get list of failed systemd services.
        
        Returns:
            List[FailedService]: List of failed service objects containing
                name, status, and optional timestamp information
        """
        failed_services = []
        
        try:
            # Use systemctl to list all failed services
            # --no-pager: Don't use pager for output
            # --no-legend: Don't show column headers
            # --failed: Only show failed services
            # --output=json: Output in JSON format for easier parsing
            result = subprocess.run(
                ['systemctl', 'list-units', '--failed', '--no-pager', '--no-legend', '--output=json'],
                capture_output=True,
                text=True,
                timeout=10  # 10 second timeout to prevent hanging
            )
            
            if result.returncode == 0 and result.stdout.strip():
                try:
                    # Parse JSON output from systemctl
                    services_data = json.loads(result.stdout)
                    
                    for service_info in services_data:
                        # Extract service information from systemctl output
                        service_name = service_info.get('unit', '')
                        service_state = service_info.get('active', 'unknown')
                        
                        # Only include services that are actually failed
                        if service_state == 'failed':
                            failed_service = FailedService(
                                name=service_name,
                                status=service_state,
                                since=None  # systemctl JSON doesn't include detailed timestamp
                            )
                            failed_services.append(failed_service)
                            
                except json.JSONDecodeError:
                    # If JSON parsing fails, fall back to text parsing
                    failed_services = self._parse_text_output(result.stdout)
                    
            else:
                # If JSON output fails, try alternative approach with text output
                failed_services = self._get_failed_services_text()
                
        except subprocess.TimeoutExpired:
            # Handle timeout - systemctl might be hanging
            pass
        except subprocess.CalledProcessError:
            # Handle systemctl command errors
            pass
        except FileNotFoundError:
            # Handle case where systemctl is not available (non-systemd systems)
            pass
            
        return failed_services

    def _get_failed_services_text(self) -> List[FailedService]:
        """
        Fallback method to get failed services using text output.
        
        Returns:
            List[FailedService]: List of failed services
        """
        failed_services = []
        
        try:
            # Use text output as fallback
            result = subprocess.run(
                ['systemctl', 'list-units', '--failed', '--no-pager', '--no-legend'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                failed_services = self._parse_text_output(result.stdout)
                
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
            # If all methods fail, return empty list
            pass
            
        return failed_services

    def _parse_text_output(self, output: str) -> List[FailedService]:
        """
        Parse text output from systemctl to extract failed services.
        
        Args:
            output: Raw text output from systemctl command
            
        Returns:
            List[FailedService]: List of parsed failed services
        """
        failed_services = []
        
        for line in output.strip().split('\n'):
            if line.strip():
                # systemctl output format: UNIT LOAD ACTIVE SUB DESCRIPTION
                parts = line.split()
                if len(parts) >= 3:
                    unit_name = parts[0]
                    active_state = parts[2]
                    
                    # Only include failed services
                    if active_state == 'failed':
                        failed_service = FailedService(
                            name=unit_name,
                            status=active_state,
                            since=None
                        )
                        failed_services.append(failed_service)
                        
        return failed_services