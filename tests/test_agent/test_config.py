"""
Tests for agent configuration management functionality.
"""

import pytest
import os
import tempfile
import yaml
from pathlib import Path
from unittest.mock import patch, mock_open

from agent.config.manager import ConfigManager, AgentConfig


class TestConfigManager:
    """Test cases for ConfigManager class."""

    def setup_method(self):
        """Set up test fixtures."""
        # Clear any existing environment variables that might interfere
        self.original_env = {}
        for key in list(os.environ.keys()):
            if key.startswith('MONITORING_'):
                self.original_env[key] = os.environ.pop(key)

    def teardown_method(self):
        """Clean up after tests."""
        # Restore original environment variables
        for key, value in self.original_env.items():
            os.environ[key] = value
        
        # Clear any test environment variables
        for key in list(os.environ.keys()):
            if key.startswith('MONITORING_'):
                os.environ.pop(key, None)

    def test_init_with_defaults(self):
        """Test ConfigManager initialization with default values."""
        config_manager = ConfigManager()
        
        assert config_manager.get_setting("server_url") == "http://localhost:8000"
        assert config_manager.get_setting("collection_interval") == 60
        assert config_manager.get_setting("retry_attempts") == 3
        assert config_manager.get_setting("retry_backoff") == 2.0
        assert config_manager.get_setting("log_level") == "INFO"

    def test_load_config_from_yaml_file(self):
        """Test loading configuration from YAML file."""
        config_data = {
            "server_url": "https://test.example.com",
            "collection_interval": 30,
            "retry_attempts": 5,
            "log_level": "DEBUG"
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config_data, f)
            temp_path = f.name
        
        try:
            config_manager = ConfigManager(temp_path)
            
            assert config_manager.get_setting("server_url") == "https://test.example.com"
            assert config_manager.get_setting("collection_interval") == 30
            assert config_manager.get_setting("retry_attempts") == 5
            assert config_manager.get_setting("log_level") == "DEBUG"
        finally:
            os.unlink(temp_path)

    def test_environment_variable_override(self):
        """Test that environment variables override YAML configuration."""
        config_data = {
            "server_url": "https://yaml.example.com",
            "collection_interval": 30
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config_data, f)
            temp_path = f.name
        
        try:
            # Set environment variables
            os.environ['MONITORING_SERVER_URL'] = 'https://env.example.com'
            os.environ['MONITORING_COLLECTION_INTERVAL'] = '120'
            
            config_manager = ConfigManager(temp_path)
            
            # Environment variables should override YAML values
            assert config_manager.get_setting("server_url") == "https://env.example.com"
            assert config_manager.get_setting("collection_interval") == 120
        finally:
            os.unlink(temp_path)

    def test_get_setting_with_custom_default(self):
        """Test get_setting with custom default value."""
        config_manager = ConfigManager()
        
        # Non-existent key should return custom default
        assert config_manager.get_setting("nonexistent_key", "custom_default") == "custom_default"
        
        # Key with built-in default should use built-in default, ignoring custom default
        assert config_manager.get_setting("server_url", "custom_default") == "http://localhost:8000"
        
        # Key with no built-in default should use custom default
        assert config_manager.get_setting("unknown_setting", "custom_default") == "custom_default"
        
        # Key with no built-in default and no custom default should return None
        assert config_manager.get_setting("another_unknown_setting") is None

    def test_get_agent_config(self):
        """Test getting complete agent configuration as AgentConfig object."""
        os.environ['MONITORING_API_KEY'] = 'test-api-key'
        os.environ['MONITORING_SERVER_ID'] = 'test-server'
        
        config_manager = ConfigManager()
        agent_config = config_manager.get_agent_config()
        
        assert isinstance(agent_config, AgentConfig)
        assert agent_config.server_url == "http://localhost:8000"
        assert agent_config.api_key == "test-api-key"
        assert agent_config.server_id == "test-server"
        assert agent_config.collection_interval == 60
        assert agent_config.retry_attempts == 3
        assert agent_config.retry_backoff == 2.0
        assert agent_config.log_level == "INFO"

    def test_validate_config_success(self):
        """Test configuration validation with valid configuration."""
        os.environ['MONITORING_API_KEY'] = 'valid-api-key'
        
        config_manager = ConfigManager()
        is_valid, errors = config_manager.validate_config()
        
        assert is_valid is True
        assert len(errors) == 0

    def test_validate_config_missing_required_fields(self):
        """Test configuration validation with missing required fields."""
        config_manager = ConfigManager()
        is_valid, errors = config_manager.validate_config()
        
        assert is_valid is False
        assert any("api_key" in error for error in errors)

    def test_validate_config_invalid_values(self):
        """Test configuration validation with invalid values."""
        os.environ['MONITORING_API_KEY'] = 'valid-api-key'
        os.environ['MONITORING_COLLECTION_INTERVAL'] = '-1'
        os.environ['MONITORING_RETRY_ATTEMPTS'] = '-5'
        os.environ['MONITORING_RETRY_BACKOFF'] = '0'
        os.environ['MONITORING_SERVER_URL'] = 'invalid-url'
        os.environ['MONITORING_LOG_LEVEL'] = 'INVALID'
        
        config_manager = ConfigManager()
        is_valid, errors = config_manager.validate_config()
        
        assert is_valid is False
        assert len(errors) >= 5  # Should have multiple validation errors

    def test_convert_env_value_types(self):
        """Test environment variable type conversion."""
        config_manager = ConfigManager()
        
        # Test integer conversion
        assert config_manager._convert_env_value("collection_interval", "120") == 120
        
        # Test float conversion
        assert config_manager._convert_env_value("retry_backoff", "3.5") == 3.5
        
        # Test string (no conversion needed)
        assert config_manager._convert_env_value("server_url", "https://test.com") == "https://test.com"
        
        # Test invalid conversion (should return string)
        assert config_manager._convert_env_value("collection_interval", "invalid") == "invalid"

    def test_get_sensitive_setting(self):
        """Test getting sensitive settings from environment variables only."""
        config_data = {
            "api_key": "yaml-api-key"  # This should be ignored
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config_data, f)
            temp_path = f.name
        
        try:
            os.environ['MONITORING_API_KEY'] = 'env-api-key'
            
            config_manager = ConfigManager(temp_path)
            
            # Should only get from environment, not YAML
            assert config_manager.get_sensitive_setting("api_key") == "env-api-key"
            
            # Should return None if not in environment
            del os.environ['MONITORING_API_KEY']
            assert config_manager.get_sensitive_setting("api_key") is None
            
            # Should return default if provided
            assert config_manager.get_sensitive_setting("api_key", "default") == "default"
        finally:
            os.unlink(temp_path)

    def test_load_config_file_not_found(self):
        """Test loading configuration when file doesn't exist."""
        config_manager = ConfigManager("/nonexistent/path/config.yaml")
        
        # Should use defaults when file doesn't exist
        assert config_manager.get_setting("server_url") == "http://localhost:8000"

    def test_load_config_invalid_yaml(self):
        """Test loading configuration with invalid YAML."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("invalid: yaml: content: [")
            temp_path = f.name
        
        try:
            # ConfigManager handles YAML errors gracefully and uses defaults
            config_manager = ConfigManager(temp_path)
            # Should fall back to defaults when YAML is invalid
            assert config_manager.get_setting("server_url") == "http://localhost:8000"
        finally:
            os.unlink(temp_path)

    def test_load_config_method_invalid_yaml(self):
        """Test load_config method directly with invalid YAML raises exception."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("invalid: yaml: content: [")
            temp_path = f.name
        
        try:
            config_manager = ConfigManager()
            with pytest.raises(yaml.YAMLError):
                config_manager.load_config(temp_path)
        finally:
            os.unlink(temp_path)

    def test_reload_config(self):
        """Test configuration reloading."""
        config_data = {
            "server_url": "https://original.example.com"
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config_data, f)
            temp_path = f.name
        
        try:
            config_manager = ConfigManager(temp_path)
            assert config_manager.get_setting("server_url") == "https://original.example.com"
            
            # Update the file
            updated_config = {
                "server_url": "https://updated.example.com"
            }
            with open(temp_path, 'w') as f:
                yaml.dump(updated_config, f)
            
            # Reload and check
            config_manager.reload_config()
            assert config_manager.get_setting("server_url") == "https://updated.example.com"
        finally:
            os.unlink(temp_path)

    @patch('pathlib.Path.exists')
    def test_find_config_file(self, mock_exists):
        """Test automatic configuration file discovery."""
        # Mock that the first standard location exists
        mock_exists.side_effect = lambda: True
        
        config_manager = ConfigManager()
        # Should find the first available config file
        # The actual path depends on the mocking, but it should not be None
        assert config_manager._config_path is not None or config_manager._config_path == "agent_config.yaml"


class TestAgentConfig:
    """Test cases for AgentConfig dataclass."""

    def test_agent_config_defaults(self):
        """Test AgentConfig default values."""
        config = AgentConfig()
        
        assert config.server_url == "http://localhost:8000"
        assert config.api_key == ""
        assert config.collection_interval == 60
        assert config.retry_attempts == 3
        assert config.retry_backoff == 2.0
        assert config.server_id is None
        assert config.log_level == "INFO"
        assert config.config_file is None

    def test_agent_config_custom_values(self):
        """Test AgentConfig with custom values."""
        config = AgentConfig(
            server_url="https://custom.example.com",
            api_key="custom-key",
            collection_interval=30,
            server_id="custom-server"
        )
        
        assert config.server_url == "https://custom.example.com"
        assert config.api_key == "custom-key"
        assert config.collection_interval == 30
        assert config.server_id == "custom-server"
        # Defaults should still be used for unspecified fields
        assert config.retry_attempts == 3
        assert config.log_level == "INFO"