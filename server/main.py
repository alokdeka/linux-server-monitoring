"""
Main application entry point for the Linux Server Health Monitoring System.

This module provides the FastAPI application instance and can be used to run
the server with uvicorn or other ASGI servers.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from server.api.metrics import metrics_api
from server.database.connection import db_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown events.
    
    Handles database initialization and cleanup.
    """
    # Startup
    logger.info("Starting Linux Server Health Monitoring System")
    
    # Initialize database connection
    try:
        # Test database connection
        if db_manager.health_check():
            logger.info("Database connection established successfully")
        else:
            logger.warning("Database connection check failed")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Linux Server Health Monitoring System")


# Get the FastAPI app with lifespan events
app = metrics_api.get_app()
app.router.lifespan_context = lifespan


if __name__ == "__main__":
    import uvicorn
    
    # Configuration from environment variables
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    log_level = os.getenv("LOG_LEVEL", "info")
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        "server.main:app",
        host=host,
        port=port,
        log_level=log_level,
        reload=False  # Set to True for development
    )