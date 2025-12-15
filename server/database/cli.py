#!/usr/bin/env python3
"""
Database management CLI for the monitoring system.

Provides commands for database initialization, migration, and maintenance.
"""

import sys
import os
import argparse
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from server.database import init_database, db_manager
from server.database.operations import MetricOperations, AlertOperations


def init_db():
    """Initialize the database with all tables."""
    try:
        print("Initializing database...")
        init_database()
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Error initializing database: {e}")
        sys.exit(1)


def health_check():
    """Check database connectivity."""
    try:
        if db_manager.health_check():
            print("Database connection: OK")
        else:
            print("Database connection: FAILED")
            sys.exit(1)
    except Exception as e:
        print(f"Health check failed: {e}")
        sys.exit(1)


def cleanup_metrics(days: int):
    """Clean up old metrics data."""
    try:
        print(f"Cleaning up metrics older than {days} days...")
        with db_manager.get_session() as session:
            deleted_count = MetricOperations.cleanup_old_metrics(session, days)
            print(f"Deleted {deleted_count} old metric records")
    except Exception as e:
        print(f"Error cleaning up metrics: {e}")
        sys.exit(1)


def show_stats():
    """Show database statistics."""
    try:
        with db_manager.get_session() as session:
            from server.database.models import Server, Metric, Alert, HealthStatus
            
            server_count = session.query(Server).count()
            metric_count = session.query(Metric).count()
            alert_count = session.query(Alert).filter(Alert.is_resolved == False).count()
            health_count = session.query(HealthStatus).count()
            
            print("Database Statistics:")
            print(f"  Servers: {server_count}")
            print(f"  Metrics: {metric_count}")
            print(f"  Active Alerts: {alert_count}")
            print(f"  Health Records: {health_count}")
            
            # Show recent activity
            recent_metrics = (session.query(Metric)
                            .filter(Metric.timestamp >= datetime.utcnow() - timedelta(hours=1))
                            .count())
            print(f"  Metrics (last hour): {recent_metrics}")
            
    except Exception as e:
        print(f"Error getting statistics: {e}")
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Database management for monitoring system")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Init command
    subparsers.add_parser('init', help='Initialize database tables')
    
    # Health check command
    subparsers.add_parser('health', help='Check database connectivity')
    
    # Cleanup command
    cleanup_parser = subparsers.add_parser('cleanup', help='Clean up old data')
    cleanup_parser.add_argument('--days', type=int, default=30,
                               help='Delete metrics older than N days (default: 30)')
    
    # Stats command
    subparsers.add_parser('stats', help='Show database statistics')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    if args.command == 'init':
        init_db()
    elif args.command == 'health':
        health_check()
    elif args.command == 'cleanup':
        cleanup_metrics(args.days)
    elif args.command == 'stats':
        show_stats()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()