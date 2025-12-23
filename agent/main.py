#!/usr/bin/env python3
"""
Linux Server Health Monitoring Agent

A lightweight monitoring agent that collects system metrics and sends them
to the monitoring server via REST API.
"""

import os
import sys
import time
import json
import yaml
import logging
import requests
import psutil
import socket
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional


class MonitoringAgent:
    """Main monitoring agent class."""
    
    def __init__(self, config_file: str = "/etc/monitoring-agent/config.yaml"):
        """Initialize the monitoring agent."""
        self.config_file = config_file
        self.config = self.load_config()
        self.setup_logging()
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.config["server"]["api_key"]}',
            'Content-Type': 'application/json',
            'User-Agent': f'MonitoringAgent/1.0 ({socket.gethostname()})'
        })
        
        # Agent identification
        self.server_id = self.config["agent"].get("hostname", socket.gethostname())
        self.hostname = socket.gethostname()
        
        self.logger.info(f"Monitoring agent initialized for server: {self.server_id}")
    
    def load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        try:
            with open(self.config_file, 'r') as f:
                config = yaml.safe_load(f)
            
            # Validate required configuration
            required_keys = ['server', 'metrics', 'logging']
            for key in required_keys:
                if key not in config:
                    raise ValueError(f"Missing required configuration section: {key}")
            
            # Validate server configuration
            server_config = config['server']
            if 'url' not in server_config or 'api_key' not in server_config:
                raise ValueError("Missing required server configuration: url and api_key")
            
            return config
            
        except FileNotFoundError:
            print(f"Configuration file not found: {self.config_file}")
            sys.exit(1)
        except yaml.YAMLError as e:
            print(f"Error parsing configuration file: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Error loading configuration: {e}")
            sys.exit(1)
    
    def setup_logging(self):
        """Set up logging configuration."""
        log_config = self.config.get('logging', {})
        log_level = getattr(logging, log_config.get('level', 'INFO').upper())
        log_file = log_config.get('file', '/var/log/monitoring-agent/agent.log')
        
        # Create log directory if it doesn't exist
        log_dir = os.path.dirname(log_file)
        os.makedirs(log_dir, exist_ok=True)
        
        # Configure logging
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger('monitoring-agent')
    
    def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect system metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            
            # Disk metrics
            disk_usage = []
            for partition in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    disk_usage.append({
                        'device': partition.device,
                        'mountpoint': partition.mountpoint,
                        'fstype': partition.fstype,
                        'total': usage.total,
                        'used': usage.used,
                        'free': usage.free,
                        'percentage': (usage.used / usage.total) * 100
                    })
                except PermissionError:
                    # Skip partitions we can't access
                    continue
            
            # Load average
            load_avg = os.getloadavg()
            
            # System uptime
            boot_time = psutil.boot_time()
            uptime = int(time.time() - boot_time)
            
            # Network metrics (basic)
            network = psutil.net_io_counters()
            
            # Failed services (systemd)
            failed_services = self.get_failed_services()
            
            metrics = {
                'server_id': self.server_id,
                'hostname': self.hostname,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'cpu_usage': cpu_percent,
                'cpu_count': cpu_count,
                'memory_total': memory.total,
                'memory_used': memory.used,
                'memory_percentage': memory.percent,
                'disk_usage': disk_usage,
                'load_1min': load_avg[0],
                'load_5min': load_avg[1],
                'load_15min': load_avg[2],
                'uptime': uptime,
                'network_bytes_sent': network.bytes_sent,
                'network_bytes_recv': network.bytes_recv,
                'failed_services': failed_services
            }
            
            self.logger.debug(f"Collected metrics: CPU={cpu_percent}%, Memory={memory.percent}%")
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")
            return {}
    
    def get_failed_services(self) -> List[str]:
        """Get list of failed systemd services."""
        try:
            if not self.config['metrics']['services']['enabled']:
                return []
            
            # Run systemctl to get failed services
            result = subprocess.run(
                ['systemctl', '--failed', '--no-legend', '--plain'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                failed_services = []
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        # Extract service name (first column)
                        service_name = line.split()[0]
                        failed_services.append(service_name)
                return failed_services
            else:
                self.logger.warning("Failed to get systemd service status")
                return []
                
        except subprocess.TimeoutExpired:
            self.logger.warning("Timeout getting systemd service status")
            return []
        except Exception as e:
            self.logger.warning(f"Error getting failed services: {e}")
            return []
    
    def send_metrics(self, metrics: Dict[str, Any]) -> bool:
        """Send metrics to the monitoring server."""
        try:
            server_config = self.config['server']
            url = f"{server_config['url']}/api/v1/metrics"
            timeout = server_config.get('timeout', 30)
            
            response = self.session.post(
                url,
                json=metrics,
                timeout=timeout
            )
            
            if response.status_code == 200:
                self.logger.debug("Metrics sent successfully")
                return True
            else:
                self.logger.error(f"Failed to send metrics: HTTP {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            self.logger.error("Timeout sending metrics to server")
            return False
        except requests.exceptions.ConnectionError:
            self.logger.error("Connection error sending metrics to server")
            return False
        except Exception as e:
            self.logger.error(f"Error sending metrics: {e}")
            return False
    
    def register_server(self) -> bool:
        """Register this server with the monitoring system."""
        try:
            server_config = self.config['server']
            url = f"{server_config['url']}/api/v1/register"
            
            # Get local IP address
            try:
                # Connect to a remote address to determine local IP
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
            except Exception:
                local_ip = "127.0.0.1"
            
            registration_data = {
                'server_id': self.server_id,
                'hostname': self.hostname,
                'ip_address': local_ip,
                'agent_version': '1.0.0',
                'os_info': {
                    'platform': sys.platform,
                    'architecture': os.uname().machine if hasattr(os, 'uname') else 'unknown'
                }
            }
            
            response = self.session.post(
                url,
                json=registration_data,
                timeout=server_config.get('timeout', 30)
            )
            
            if response.status_code in [200, 201]:
                self.logger.info("Server registered successfully")
                return True
            else:
                self.logger.warning(f"Server registration failed: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.logger.warning(f"Error registering server: {e}")
            return False
    
    def run(self):
        """Main agent loop."""
        self.logger.info("Starting monitoring agent...")
        
        # Try to register server on startup
        self.register_server()
        
        metrics_config = self.config['metrics']
        collection_interval = metrics_config.get('collection_interval', 60)
        
        self.logger.info(f"Collecting metrics every {collection_interval} seconds")
        
        while True:
            try:
                # Collect metrics
                metrics = self.collect_system_metrics()
                
                if metrics:
                    # Send metrics to server
                    success = self.send_metrics(metrics)
                    
                    if success:
                        self.logger.debug("Metrics collection and transmission successful")
                    else:
                        self.logger.warning("Failed to send metrics to server")
                else:
                    self.logger.warning("No metrics collected")
                
                # Wait for next collection interval
                time.sleep(collection_interval)
                
            except KeyboardInterrupt:
                self.logger.info("Received interrupt signal, shutting down...")
                break
            except Exception as e:
                self.logger.error(f"Unexpected error in main loop: {e}")
                time.sleep(10)  # Wait before retrying
        
        self.logger.info("Monitoring agent stopped")


def main():
    """Main entry point."""
    # Check if running as root (required for some system metrics)
    if os.geteuid() != 0:
        print("Warning: Running as non-root user. Some metrics may not be available.")
    
    # Get configuration file path from environment or use default
    config_file = os.getenv('MONITORING_CONFIG_FILE', '/etc/monitoring-agent/config.yaml')
    
    try:
        agent = MonitoringAgent(config_file)
        agent.run()
    except KeyboardInterrupt:
        print("\nShutdown requested by user")
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()