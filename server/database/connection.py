"""
Database connection and session management for the monitoring system.

Provides SQLAlchemy engine, session factory, and connection utilities.
"""

import os
from typing import Generator, Optional
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
import logging

from .models import Base

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database connections and sessions."""
    
    def __init__(self, database_url: Optional[str] = None):
        """Initialize database manager with connection URL."""
        self.database_url = database_url or self._get_database_url()
        self._engine: Optional[Engine] = None
        self._session_factory: Optional[sessionmaker] = None
        
    def _get_database_url(self) -> str:
        """Get database URL from environment variables."""
        # Try different environment variable names
        url = (
            os.getenv("DATABASE_URL") or
            os.getenv("POSTGRES_URL") or
            os.getenv("DB_URL")
        )
        
        if not url:
            # Default to PostgreSQL for all environments
            url = "postgresql://monitoring_user:monitoring_pass@localhost:5432/monitoring"
            
        return url
    
    @property
    def engine(self) -> Engine:
        """Get or create database engine."""
        if self._engine is None:
            self._engine = create_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=os.getenv("SQL_DEBUG", "false").lower() == "true"
            )
            logger.info("Database engine created")
        return self._engine
    
    @property
    def session_factory(self) -> sessionmaker:
        """Get or create session factory."""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                bind=self.engine,
                autocommit=False,
                autoflush=False
            )
        return self._session_factory
    
    def create_tables(self) -> None:
        """Create all database tables."""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise
    
    def drop_tables(self) -> None:
        """Drop all database tables (use with caution)."""
        try:
            Base.metadata.drop_all(bind=self.engine)
            logger.info("Database tables dropped successfully")
        except Exception as e:
            logger.error(f"Failed to drop database tables: {e}")
            raise
    
    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """Get a database session with automatic cleanup."""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    def get_session_sync(self) -> Session:
        """Get a synchronous database session (manual cleanup required)."""
        return self.session_factory()
    
    def health_check(self) -> bool:
        """Check database connectivity."""
        try:
            from sqlalchemy import text
            with self.get_session() as session:
                session.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    def close(self) -> None:
        """Close database connections."""
        if self._engine:
            self._engine.dispose()
            logger.info("Database connections closed")


# Global database manager instance
db_manager = DatabaseManager()


def get_db_session() -> Generator[Session, None, None]:
    """Dependency function for FastAPI to get database sessions."""
    with db_manager.get_session() as session:
        yield session


def init_database(database_url: Optional[str] = None) -> DatabaseManager:
    """Initialize database with optional custom URL."""
    global db_manager
    if database_url:
        db_manager = DatabaseManager(database_url)
    db_manager.create_tables()
    return db_manager