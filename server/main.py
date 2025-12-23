"""
Main application entry point for the Linux Server Health Monitoring System.

This module provides the FastAPI application instance and can be used to run
the server with uvicorn or other ASGI servers.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
import os

from server.api.metrics import metrics_api
from server.api.dashboard import dashboard_router
from server.websocket.dashboard_websocket import websocket_endpoint
from server.database.connection import db_manager, get_db_session

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
    
    # Initialize database connection and create tables
    try:
        # Create database tables
        db_manager.create_tables()
        logger.info("Database tables created/verified successfully")
        
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

# Add dashboard API routes
app.include_router(dashboard_router)

# Add WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_route(websocket: WebSocket, token: str = None, 
                         db_session: Session = Depends(get_db_session)):
    """WebSocket endpoint for dashboard real-time updates."""
    await websocket_endpoint(websocket, token, db_session)


# Add install script endpoint
@app.get("/install-agent.sh", response_class=PlainTextResponse)
async def get_install_script():
    """Serve the agent installation script."""
    try:
        script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "install-agent.sh")
        with open(script_path, "r") as f:
            content = f.read()
        return content
    except FileNotFoundError:
        logger.error("Install script not found")
        return "#!/bin/bash\necho 'Install script not found'\nexit 1"
    except Exception as e:
        logger.error(f"Error serving install script: {e}")
        return "#!/bin/bash\necho 'Error loading install script'\nexit 1"

# Update CORS settings to allow dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],  # Add common dev ports
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)


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