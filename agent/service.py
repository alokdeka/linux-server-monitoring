"""
Agent service orchestrator for the Linux Server Health Monitoring System.

This module implements the AgentService class that coordinates all agent components
and provides periodic metric collection scheduling.
"""

import time
import logging
import threading
from datetime import datetime
from typing import Optional
import signal
import sys

from agent.metrics.collector import MetricsCollector
from agent.metrics.systemd_monitor import SystemdMonitor
from agent.transport.http_transmitter import HTTPTransmitter
from agent.config.manager import ConfigManager, AgentConfig
from shared.models import SystemMetrics, MemoryInfo, DiskUsage, LoadAverage


logger = logging.getLogger(__name__)


class AgentService:
    """
    Main service coordinator for the monitoring agent.
    
    Orchestrates all agent components and provides:
    - Periodic metric collection scheduling
    - Component integration and lifecycle management
    - Graceful shutdown handling
    - Error recovery and logging
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the agent service.
        
        Args:
            config_path: Optional path to configuration file
        """
        self._running = False
        self._collection_thread: Optional[threading.Thread] = None
        self._shutdown_event = threading.Event()
        
        # Initialize configuration manager
        self.config_manager = ConfigManager(config_path)
        self.config: AgentConfig = self.config_manager.get_agent_config()
        
        # Validate configuration
        is_valid, errors = self.config_manager.validate_config()
        if not is_valid:
            error_msg = f"Configuration validation failed: {'; '.join(errors)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Initialize components
        self.metrics_collector = MetricsCollector()
        self.systemd_monitor = SystemdMonitor()
        self.http_transmitter = HTTPTransmitter(
            server_url=self.config.server_url,
            max_retries=self.config.retry_attempts,
            backoff_factor=self.config.retry_backoff
        )
        
        # Set up logging level
        logging.getLogger().setLevel(getattr(logging, self.config.log_level.upper()))
        
        logger.info(f"Agent service initialized for server: {self.config.server_id or 'auto-generated'}")
        logger.info(f"Collection interval: {self.config.collection_interval} seconds")
        logger.info(f"Server URL: {self.config.server_url}")

    def start(self) -> None:
        """
        Start the agent service and begin metric collection.
        
        This method starts the periodic metric collection in a background thread
        and sets up signal handlers for graceful shutdown.
        """
        if self._running:
            logger.warning("Agent service is already running")
            return
        
        logger.info("Starting agent service...")
        
        # Test authentication before starting
        if not self._test_authentication():
            logger.error("Authentication test failed - cannot start service")
            raise RuntimeError("Authentication failed")
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Start the collection thread
        self._running = True
        self._collection_thread = threading.Thread(
            target=self._collection_loop,
            name="MetricsCollectionThread",
            daemon=False
        )
        self._collection_thread.start()
        
        logger.info("Agent service started successfully")

    def stop(self) -> None:
        """
        Stop the agent service gracefully.
        
        This method signals the collection thread to stop and waits for it to finish.
        """
        if not self._running:
            logger.warning("Agent service is not running")
            return
        
        logger.info("Stopping agent service...")
        
        # Signal shutdown
        self._running = False
        self._shutdown_event.set()
        
        # Wait for collection thread to finish
        if self._collection_thread and self._collection_thread.is_alive():
            logger.info("Waiting for collection thread to finish...")
            self._collection_thread.join(timeout=10)
            
            if self._collection_thread.is_alive():
                logger.warning("Collection thread did not stop gracefully")
        
        # Clean up HTTP transmitter
        self.http_transmitter.close()
        
        logger.info("Agent service stopped")

    def run(self) -> None:
        """
        Run the agent service and block until shutdown.
        
        This method starts the service and blocks the main thread until
        a shutdown signal is received or an error occurs.
        """
        try:
            self.start()
            
            # Block main thread until shutdown
            while self._running:
                time.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt")
        except Exception as e:
            logger.error(f"Unexpected error in agent service: {e}")
            raise
        finally:
            self.stop()

    def collect_and_send_metrics(self) -> bool:
        """
        Collect system metrics and send them to the central server.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            logger.debug("Starting metrics collection...")
            
            # Collect all metrics
            cpu_usage = self.metrics_collector.collect_cpu_usage()
            memory_data = self.metrics_collector.collect_memory_usage()
            disk_data = self.metrics_collector.collect_disk_usage()
            load_data = self.metrics_collector.collect_load_average()
            uptime = self.metrics_collector.collect_uptime()
            failed_services = self.systemd_monitor.get_failed_services()
            
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
                server_id=self.config.server_id or self._generate_server_id(),
                timestamp=datetime.utcnow().isoformat() + "Z",
                cpu_usage=cpu_usage,
                memory=memory,
                disk_usage=disk_usage,
                load_average=load_average,
                uptime=uptime,
                failed_services=failed_services
            )
            
            logger.debug(f"Collected metrics: CPU={cpu_usage:.1f}%, Memory={memory.percentage:.1f}%, "
                        f"Disks={len(disk_usage)}, Failed Services={len(failed_services)}")
            
            # Send metrics to server
            success = self.http_transmitter.send_with_exponential_backoff(
                metrics, 
                self.config.api_key
            )
            
            if success:
                logger.info("Metrics sent successfully")
            else:
                logger.error("Failed to send metrics after all retry attempts")
            
            return success
            
        except Exception as e:
            logger.error(f"Error during metrics collection and transmission: {e}")
            return False

    def _collection_loop(self) -> None:
        """
        Main collection loop that runs in a background thread.
        
        This method runs continuously, collecting and sending metrics
        at the configured interval until shutdown is requested.
        """
        logger.info("Metrics collection loop started")
        
        while self._running and not self._shutdown_event.is_set():
            try:
                # Collect and send metrics
                self.collect_and_send_metrics()
                
                # Wait for next collection interval or shutdown signal
                if self._shutdown_event.wait(timeout=self.config.collection_interval):
                    # Shutdown was signaled
                    break
                    
            except Exception as e:
                logger.error(f"Error in collection loop: {e}")
                # Continue running even if individual collection fails
                
                # Wait a bit before retrying to avoid tight error loops
                if self._shutdown_event.wait(timeout=min(30, self.config.collection_interval)):
                    break
        
        logger.info("Metrics collection loop stopped")

    def _test_authentication(self) -> bool:
        """
        Test authentication with the central server.
        
        Returns:
            bool: True if authentication successful, False otherwise
        """
        try:
            logger.info("Testing authentication with central server...")
            return self.http_transmitter.authenticate(self.config.api_key)
        except Exception as e:
            logger.error(f"Authentication test failed: {e}")
            return False

    def _generate_server_id(self) -> str:
        """
        Generate a server ID if not configured.
        
        Returns:
            str: Generated server ID based on hostname
        """
        import socket
        hostname = socket.gethostname()
        return f"agent-{hostname}"

    def _signal_handler(self, signum: int, frame) -> None:
        """
        Handle shutdown signals.
        
        Args:
            signum: Signal number
            frame: Current stack frame
        """
        signal_names = {
            signal.SIGINT: "SIGINT",
            signal.SIGTERM: "SIGTERM"
        }
        signal_name = signal_names.get(signum, f"Signal {signum}")
        
        logger.info(f"Received {signal_name}, initiating graceful shutdown...")
        self.stop()

    def get_status(self) -> dict:
        """
        Get current service status information.
        
        Returns:
            dict: Status information including running state and configuration
        """
        return {
            "running": self._running,
            "server_id": self.config.server_id or self._generate_server_id(),
            "server_url": self.config.server_url,
            "collection_interval": self.config.collection_interval,
            "retry_attempts": self.config.retry_attempts,
            "log_level": self.config.log_level,
            "thread_alive": self._collection_thread.is_alive() if self._collection_thread else False
        }

    def reload_config(self) -> None:
        """
        Reload configuration from file and environment variables.
        
        Note: This requires a service restart to take effect for most settings.
        """
        logger.info("Reloading configuration...")
        self.config_manager.reload_config()
        self.config = self.config_manager.get_agent_config()
        
        # Validate new configuration
        is_valid, errors = self.config_manager.validate_config()
        if not is_valid:
            logger.error(f"Configuration validation failed after reload: {'; '.join(errors)}")
            return
        
        # Update logging level immediately
        logging.getLogger().setLevel(getattr(logging, self.config.log_level.upper()))
        
        logger.info("Configuration reloaded successfully")
        logger.warning("Service restart required for most configuration changes to take effect")


def main():
    """
    Main entry point for running the agent service.
    
    This function can be used to run the agent as a standalone service.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Linux Server Health Monitoring Agent")
    parser.add_argument(
        "--config", 
        type=str, 
        help="Path to configuration file"
    )
    parser.add_argument(
        "--log-level",
        type=str,
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        help="Override log level"
    )
    
    args = parser.parse_args()
    
    # Set up basic logging
    logging.basicConfig(
        level=getattr(logging, args.log_level or 'INFO'),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    try:
        # Create and run agent service
        service = AgentService(config_path=args.config)
        service.run()
    except Exception as e:
        logger.error(f"Failed to start agent service: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()