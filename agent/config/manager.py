"""
Configuration management for the monitoring agent.

This module provides the ConfigManager class that handles YAML configuration files,
environment variable overrides, and secure credential management.
"""

import os
import yaml
from typing import Dict, Any, Optional, Union
from pathlib import Path
import logging
from dataclasses import dataclass, field

from shared.interfaces import ConfigManagerInterface


logger = logging.getLogger(__name__)


@dataclass
class AgentConfig:
    """Agent configuration data structure."""
    server_url: str = "http://localhost:8000"
    api_key: str = ""
    collection_interval: int = 60
    retry_attempts: int = 3
    retry_backoff: float = 2.0
    server_id: Optional[str] = None
    log_level: str = "INFO"
    config_file: Optional[str] = None
    
    # Additional fields for validation
    _required_fields: list = field(default_factory=lambda: ["server_url", "api_key"])


class ConfigManager(ConfigManagerInterface):
    """
    Manages configuration loading from YAML files and environment variables.
    
    Environment variables take precedence over YAML configuration values.
    Supports secure credential management through environment variables.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize ConfigManager.
        
        Args:
            config_path: Path to YAML configuration file. If None, uses default locations.
        """
        self._config_data: Dict[str, Any] = {}
        self._config_path = config_path
        self._env_prefix = "MONITORING_"
        
        # Default configuration values
        self._defaults = {
            "server_url": "http://localhost:8000",
            "api_key": "",
            "collection_interval": 60,
            "retry_attempts": 3,
            "retry_backoff": 2.0,
            "log_level": "INFO"
        }
        
        # Load configuration on initialization
        self._load_configuration()
    
    def load_config(self, config_path: str) -> Dict[str, Any]:
        """
        Load configuration from YAML file.
        
        Args:
            config_path: Path to the YAML configuration file
            
        Returns:
            Dictionary containing configuration data
            
        Raises:
            FileNotFoundError: If config file doesn't exist
            yaml.YAMLError: If YAML parsing fails
        """
        try:
            config_file = Path(config_path)
            if not config_file.exists():
                logger.warning(f"Configuration file not found: {config_path}")
                return {}
            
            with open(config_file, 'r', encoding='utf-8') as f:
                config_data = yaml.safe_load(f) or {}
            
            logger.info(f"Loaded configuration from {config_path}")
            return config_data
            
        except yaml.YAMLError as e:
            logger.error(f"Failed to parse YAML configuration: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to load configuration file {config_path}: {e}")
            raise
    
    def get_setting(self, key: str, default=None) -> Any:
        """
        Get configuration setting with environment variable override support.
        
        Environment variables are checked first with the format MONITORING_<KEY>.
        If not found, checks the loaded configuration data.
        If still not found, returns the provided default or built-in default.
        
        Args:
            key: Configuration key to retrieve
            default: Default value if key is not found
            
        Returns:
            Configuration value
        """
        # Check environment variable first (with prefix)
        env_key = f"{self._env_prefix}{key.upper()}"
        env_value = os.getenv(env_key)
        
        if env_value is not None:
            # Try to convert to appropriate type based on defaults
            return self._convert_env_value(key, env_value)
        
        # Check loaded configuration data
        if key in self._config_data:
            return self._config_data[key]
        
        # Check built-in defaults first
        built_in_default = self._defaults.get(key)
        if built_in_default is not None:
            return built_in_default
        
        # Return provided default if no built-in default exists
        if default is not None:
            return default
        
        return None
    
    def get_agent_config(self) -> AgentConfig:
        """
        Get complete agent configuration as AgentConfig object.
        
        Returns:
            AgentConfig object with all configuration values
        """
        return AgentConfig(
            server_url=self.get_setting("server_url"),
            api_key=self.get_setting("api_key"),
            collection_interval=self.get_setting("collection_interval"),
            retry_attempts=self.get_setting("retry_attempts"),
            retry_backoff=self.get_setting("retry_backoff"),
            server_id=self.get_setting("server_id"),
            log_level=self.get_setting("log_level"),
            config_file=self._config_path
        )
    
    def validate_config(self) -> tuple[bool, list[str]]:
        """
        Validate the current configuration.
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        config = self.get_agent_config()
        
        # Check required fields
        for field_name in config._required_fields:
            value = getattr(config, field_name)
            if not value or (isinstance(value, str) and not value.strip()):
                errors.append(f"Required field '{field_name}' is missing or empty")
        
        # Validate data types and ranges
        if config.collection_interval <= 0:
            errors.append("collection_interval must be positive")
        
        if config.retry_attempts < 0:
            errors.append("retry_attempts must be non-negative")
        
        if config.retry_backoff <= 0:
            errors.append("retry_backoff must be positive")
        
        # Validate server URL format
        if config.server_url and not (config.server_url.startswith('http://') or 
                                     config.server_url.startswith('https://')):
            errors.append("server_url must start with http:// or https://")
        
        # Validate log level
        valid_log_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if config.log_level.upper() not in valid_log_levels:
            errors.append(f"log_level must be one of: {', '.join(valid_log_levels)}")
        
        return len(errors) == 0, errors
    
    def _load_configuration(self):
        """Load configuration from file and environment variables."""
        # Try to find configuration file if not specified
        if self._config_path is None:
            self._config_path = self._find_config_file()
        
        # Load from YAML file if it exists
        if self._config_path:
            try:
                self._config_data = self.load_config(self._config_path)
            except Exception as e:
                logger.warning(f"Failed to load configuration file: {e}")
                self._config_data = {}
        else:
            logger.info("No configuration file found, using defaults and environment variables")
            self._config_data = {}
    
    def _find_config_file(self) -> Optional[str]:
        """
        Find configuration file in standard locations.
        
        Returns:
            Path to configuration file or None if not found
        """
        # Standard configuration file locations
        possible_paths = [
            "agent_config.yaml",
            "agent_config.yml",
            "/etc/monitoring/agent.yaml",
            "/etc/monitoring/agent.yml",
            os.path.expanduser("~/.monitoring/agent.yaml"),
            os.path.expanduser("~/.monitoring/agent.yml")
        ]
        
        for path in possible_paths:
            if Path(path).exists():
                logger.info(f"Found configuration file: {path}")
                return path
        
        return None
    
    def _convert_env_value(self, key: str, value: str) -> Union[str, int, float, bool]:
        """
        Convert environment variable string to appropriate type.
        
        Args:
            key: Configuration key name
            value: String value from environment variable
            
        Returns:
            Converted value with appropriate type
        """
        # Get expected type from defaults
        default_value = self._defaults.get(key)
        
        if default_value is None:
            return value
        
        try:
            if isinstance(default_value, bool):
                return value.lower() in ('true', '1', 'yes', 'on')
            elif isinstance(default_value, int):
                return int(value)
            elif isinstance(default_value, float):
                return float(value)
            else:
                return value
        except (ValueError, TypeError):
            logger.warning(f"Failed to convert environment variable {key}={value}, using as string")
            return value
    
    def reload_config(self):
        """Reload configuration from file and environment variables."""
        self._load_configuration()
        logger.info("Configuration reloaded")
    
    def get_sensitive_setting(self, key: str, default=None) -> Optional[str]:
        """
        Get sensitive configuration setting (like API keys) from environment variables only.
        
        This method only checks environment variables for security reasons.
        Sensitive values should never be stored in configuration files.
        
        Args:
            key: Configuration key to retrieve
            default: Default value if key is not found
            
        Returns:
            Configuration value from environment variable or default
        """
        env_key = f"{self._env_prefix}{key.upper()}"
        return os.getenv(env_key, default)