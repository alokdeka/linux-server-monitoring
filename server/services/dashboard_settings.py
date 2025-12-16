"""
Dashboard settings service for managing user preferences and configuration.

This module provides functionality for managing dashboard user settings,
including display preferences, alert thresholds, and notification configuration.
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from server.database.models import DashboardSettings, DashboardUser


class DashboardSettingsService:
    """
    Service for managing dashboard user settings and preferences.
    
    Provides functionality for retrieving, updating, and resetting
    user-specific dashboard configuration settings.
    """
    
    def __init__(self, db_session: Session):
        """
        Initialize the dashboard settings service.
        
        Args:
            db_session: SQLAlchemy database session for persistence operations
        """
        self.db_session = db_session
    
    def get_user_settings(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get settings for a specific user.
        
        Args:
            user_id: ID of the user to get settings for
            
        Returns:
            Dictionary containing user settings, None if user not found
        """
        settings = self.db_session.query(DashboardSettings).filter(
            DashboardSettings.user_id == user_id
        ).first()
        
        if not settings:
            return None
        
        return {
            "display": {
                "theme": settings.theme,
                "refresh_interval": settings.refresh_interval,
                "compact_mode": settings.compact_mode,
                "charts_enabled": settings.charts_enabled
            },
            "alert_thresholds": {
                "cpu": settings.cpu_threshold,
                "memory": settings.memory_threshold,
                "disk": settings.disk_threshold
            },
            "notifications": {
                "enabled": settings.notifications_enabled,
                "webhook_urls": settings.webhook_urls or [],  # Ensure it's always a list
                "email_notifications": settings.email_notifications
            }
        }
    
    def update_user_settings(self, user_id: int, settings_data: Dict[str, Any]) -> bool:
        """
        Update settings for a specific user.
        
        Args:
            user_id: ID of the user to update settings for
            settings_data: Dictionary containing settings to update
            
        Returns:
            True if settings were updated successfully, False otherwise
        """
        try:
            settings = self.db_session.query(DashboardSettings).filter(
                DashboardSettings.user_id == user_id
            ).first()
            
            if not settings:
                return False
            
            # Update display settings
            if "display" in settings_data:
                display = settings_data["display"]
                if "theme" in display:
                    settings.theme = display["theme"]
                if "refresh_interval" in display:
                    settings.refresh_interval = display["refresh_interval"]
                if "compact_mode" in display:
                    settings.compact_mode = display["compact_mode"]
                if "charts_enabled" in display:
                    settings.charts_enabled = display["charts_enabled"]
            
            # Update alert thresholds
            if "alert_thresholds" in settings_data:
                thresholds = settings_data["alert_thresholds"]
                if "cpu" in thresholds:
                    settings.cpu_threshold = thresholds["cpu"]
                if "memory" in thresholds:
                    settings.memory_threshold = thresholds["memory"]
                if "disk" in thresholds:
                    settings.disk_threshold = thresholds["disk"]
            
            # Update notification settings
            if "notifications" in settings_data:
                notifications = settings_data["notifications"]
                if "enabled" in notifications:
                    settings.notifications_enabled = notifications["enabled"]
                if "webhook_urls" in notifications:
                    settings.webhook_urls = notifications["webhook_urls"]
                if "email_notifications" in notifications:
                    settings.email_notifications = notifications["email_notifications"]
            
            self.db_session.commit()
            return True
            
        except Exception as e:
            self.db_session.rollback()
            return False
    
    def reset_user_settings(self, user_id: int) -> bool:
        """
        Reset user settings to default values.
        
        Args:
            user_id: ID of the user to reset settings for
            
        Returns:
            True if settings were reset successfully, False otherwise
        """
        try:
            settings = self.db_session.query(DashboardSettings).filter(
                DashboardSettings.user_id == user_id
            ).first()
            
            if not settings:
                return False
            
            # Reset to default values
            settings.theme = 'light'
            settings.refresh_interval = 30  # 30 seconds
            settings.compact_mode = False
            settings.charts_enabled = True
            settings.cpu_threshold = 80.0
            settings.memory_threshold = 85.0
            settings.disk_threshold = 90.0
            settings.notifications_enabled = True
            settings.webhook_urls = []
            settings.email_notifications = False
            
            self.db_session.commit()
            return True
            
        except Exception as e:
            self.db_session.rollback()
            return False
    
    def get_alert_thresholds(self, user_id: int) -> Optional[Dict[str, float]]:
        """
        Get alert thresholds for a specific user.
        
        Args:
            user_id: ID of the user to get thresholds for
            
        Returns:
            Dictionary containing alert thresholds, None if user not found
        """
        settings = self.db_session.query(DashboardSettings).filter(
            DashboardSettings.user_id == user_id
        ).first()
        
        if not settings:
            return None
        
        return {
            "cpu": settings.cpu_threshold,
            "memory": settings.memory_threshold,
            "disk": settings.disk_threshold
        }
    
    def update_alert_thresholds(self, user_id: int, thresholds: Dict[str, float]) -> bool:
        """
        Update alert thresholds for a specific user.
        
        Args:
            user_id: ID of the user to update thresholds for
            thresholds: Dictionary containing threshold values
            
        Returns:
            True if thresholds were updated successfully, False otherwise
        """
        try:
            settings = self.db_session.query(DashboardSettings).filter(
                DashboardSettings.user_id == user_id
            ).first()
            
            if not settings:
                return False
            
            if "cpu" in thresholds:
                settings.cpu_threshold = thresholds["cpu"]
            if "memory" in thresholds:
                settings.memory_threshold = thresholds["memory"]
            if "disk" in thresholds:
                settings.disk_threshold = thresholds["disk"]
            
            self.db_session.commit()
            return True
            
        except Exception as e:
            self.db_session.rollback()
            return False
    
    def get_notification_settings(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get notification settings for a specific user.
        
        Args:
            user_id: ID of the user to get notification settings for
            
        Returns:
            Dictionary containing notification settings, None if user not found
        """
        settings = self.db_session.query(DashboardSettings).filter(
            DashboardSettings.user_id == user_id
        ).first()
        
        if not settings:
            return None
        
        return {
            "enabled": settings.notifications_enabled,
            "webhook_urls": settings.webhook_urls,
            "email_notifications": settings.email_notifications
        }
    
    def update_notification_settings(self, user_id: int, notification_settings: Dict[str, Any]) -> bool:
        """
        Update notification settings for a specific user.
        
        Args:
            user_id: ID of the user to update notification settings for
            notification_settings: Dictionary containing notification settings
            
        Returns:
            True if settings were updated successfully, False otherwise
        """
        try:
            settings = self.db_session.query(DashboardSettings).filter(
                DashboardSettings.user_id == user_id
            ).first()
            
            if not settings:
                return False
            
            if "enabled" in notification_settings:
                settings.notifications_enabled = notification_settings["enabled"]
            if "webhook_urls" in notification_settings:
                settings.webhook_urls = notification_settings["webhook_urls"]
            if "email_notifications" in notification_settings:
                settings.email_notifications = notification_settings["email_notifications"]
            
            self.db_session.commit()
            return True
            
        except Exception as e:
            self.db_session.rollback()
            return False
    
    def create_default_settings(self, user_id: int) -> bool:
        """
        Create default settings for a new user.
        
        Args:
            user_id: ID of the user to create settings for
            
        Returns:
            True if settings were created successfully, False otherwise
        """
        try:
            # Check if settings already exist
            existing_settings = self.db_session.query(DashboardSettings).filter(
                DashboardSettings.user_id == user_id
            ).first()
            
            if existing_settings:
                return True  # Settings already exist
            
            # Create default settings
            settings = DashboardSettings(
                user_id=user_id,
                theme='light',
                refresh_interval=30,  # 30 seconds
                compact_mode=False,
                charts_enabled=True,
                cpu_threshold=80.0,
                memory_threshold=85.0,
                disk_threshold=90.0,
                notifications_enabled=True,
                webhook_urls=[],
                email_notifications=False
            )
            
            self.db_session.add(settings)
            self.db_session.commit()
            return True
            
        except Exception as e:
            self.db_session.rollback()
            return False