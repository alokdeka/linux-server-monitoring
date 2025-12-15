#!/usr/bin/env python3
"""
Example script demonstrating how to use the AgentService.

This script shows how to:
1. Configure the agent via environment variables
2. Initialize and start the agent service
3. Handle graceful shutdown

Usage:
    export MONITORING_API_KEY="your-api-key"
    export MONITORING_SERVER_URL="https://your-server.com"
    python examples/agent_example.py
"""

import os
import sys
import time
import logging

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent import AgentService


def main():
    """Main function to demonstrate AgentService usage."""
    
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger(__name__)
    
    # Check required environment variables
    required_vars = ['MONITORING_API_KEY', 'MONITORING_SERVER_URL']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.info("Please set the following environment variables:")
        logger.info("  export MONITORING_API_KEY='your-api-key'")
        logger.info("  export MONITORING_SERVER_URL='https://your-server.com'")
        sys.exit(1)
    
    try:
        # Create agent service
        logger.info("Initializing agent service...")
        service = AgentService()
        
        # Display configuration
        status = service.get_status()
        logger.info(f"Agent Configuration:")
        logger.info(f"  Server ID: {status['server_id']}")
        logger.info(f"  Server URL: {status['server_url']}")
        logger.info(f"  Collection Interval: {status['collection_interval']} seconds")
        logger.info(f"  Retry Attempts: {status['retry_attempts']}")
        logger.info(f"  Log Level: {status['log_level']}")
        
        # Test single metrics collection
        logger.info("Testing single metrics collection...")
        success = service.collect_and_send_metrics()
        if success:
            logger.info("✓ Single metrics collection successful")
        else:
            logger.warning("✗ Single metrics collection failed")
        
        # Start the service for continuous monitoring
        logger.info("Starting continuous monitoring service...")
        logger.info("Press Ctrl+C to stop the service")
        
        # Run the service (this will block until interrupted)
        service.run()
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down...")
    except Exception as e:
        logger.error(f"Error running agent service: {e}")
        sys.exit(1)
    
    logger.info("Agent service stopped")


if __name__ == "__main__":
    main()