"""
Unit tests for server authentication functionality.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from server.database.models import Base, ApiKey, Server
from server.auth.service import AuthenticationService


@pytest.fixture
def in_memory_db():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


@pytest.fixture
def auth_service(in_memory_db):
    """Create an AuthenticationService instance with test database."""
    return AuthenticationService(in_memory_db)


@pytest.fixture
def sample_server(in_memory_db):
    """Create a sample server for testing."""
    server = Server(
        server_id="test-server-001",
        hostname="test-host",
        ip_address="192.168.1.100"
    )
    in_memory_db.add(server)
    in_memory_db.commit()
    return server


class TestAuthenticationService:
    """Test cases for AuthenticationService."""
    
    def test_generate_api_key_basic(self, auth_service):
        """Test basic API key generation."""
        raw_key, key_id = auth_service.generate_api_key()
        
        # Verify key properties
        assert raw_key is not None
        assert len(raw_key) > 0
        assert key_id is not None
        
        # Verify key is stored in database
        stored_key = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id)
        ).first()
        
        assert stored_key is not None
        assert stored_key.is_active is True
        assert stored_key.key_hash is not None
        assert stored_key.key_hash != raw_key  # Should be hashed
    
    def test_generate_api_key_with_server(self, auth_service, sample_server):
        """Test API key generation with server association."""
        raw_key, key_id = auth_service.generate_api_key(
            server_id=sample_server.server_id,
            description="Test key for server"
        )
        
        stored_key = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id)
        ).first()
        
        assert stored_key.server_id == sample_server.server_id
        assert stored_key.description == "Test key for server"
    
    def test_generate_api_key_with_expiration(self, auth_service):
        """Test API key generation with expiration."""
        raw_key, key_id = auth_service.generate_api_key(expires_days=30)
        
        stored_key = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id)
        ).first()
        
        assert stored_key.expires_at is not None
        # Should expire approximately 30 days from now
        expected_expiry = datetime.utcnow() + timedelta(days=30)
        time_diff = abs((stored_key.expires_at - expected_expiry).total_seconds())
        assert time_diff < 60  # Within 1 minute
    
    def test_validate_api_key_valid(self, auth_service):
        """Test validation of a valid API key."""
        raw_key, key_id = auth_service.generate_api_key()
        
        # Validate the key
        validated_key = auth_service.validate_api_key(raw_key)
        
        assert validated_key is not None
        assert validated_key.id == int(key_id)
        assert validated_key.last_used is not None
    
    def test_validate_api_key_invalid(self, auth_service):
        """Test validation of an invalid API key."""
        result = auth_service.validate_api_key("invalid-key")
        assert result is None
    
    def test_validate_api_key_empty(self, auth_service):
        """Test validation of empty API key."""
        result = auth_service.validate_api_key("")
        assert result is None
        
        result = auth_service.validate_api_key(None)
        assert result is None
    
    def test_validate_api_key_expired(self, auth_service):
        """Test validation of expired API key."""
        # Create an expired key by setting expires_at in the past
        raw_key, key_id = auth_service.generate_api_key()
        
        stored_key = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id)
        ).first()
        stored_key.expires_at = datetime.utcnow() - timedelta(days=1)
        auth_service.db_session.commit()
        
        # Should return None for expired key
        result = auth_service.validate_api_key(raw_key)
        assert result is None
    
    def test_validate_api_key_inactive(self, auth_service):
        """Test validation of inactive API key."""
        raw_key, key_id = auth_service.generate_api_key()
        
        # Deactivate the key
        stored_key = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id)
        ).first()
        stored_key.is_active = False
        auth_service.db_session.commit()
        
        # Should return None for inactive key
        result = auth_service.validate_api_key(raw_key)
        assert result is None
    
    def test_revoke_api_key(self, auth_service):
        """Test API key revocation."""
        raw_key, key_id = auth_service.generate_api_key()
        
        # Revoke the key
        result = auth_service.revoke_api_key(key_id)
        assert result is True
        
        # Verify key is inactive
        stored_key = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id)
        ).first()
        assert stored_key.is_active is False
        
        # Should not validate anymore
        validation_result = auth_service.validate_api_key(raw_key)
        assert validation_result is None
    
    def test_revoke_nonexistent_key(self, auth_service):
        """Test revoking a non-existent API key."""
        result = auth_service.revoke_api_key("999999")
        assert result is False
    
    def test_list_api_keys(self, auth_service, sample_server):
        """Test listing API keys."""
        # Create multiple keys
        raw_key1, key_id1 = auth_service.generate_api_key(
            server_id=sample_server.server_id,
            description="Key 1"
        )
        raw_key2, key_id2 = auth_service.generate_api_key(
            description="Key 2"
        )
        
        # List all keys
        all_keys = auth_service.list_api_keys(active_only=False)
        assert len(all_keys) == 2
        
        # List keys for specific server
        server_keys = auth_service.list_api_keys(server_id=sample_server.server_id)
        assert len(server_keys) == 1
        assert server_keys[0].server_id == sample_server.server_id
    
    def test_cleanup_expired_keys(self, auth_service):
        """Test cleanup of expired API keys."""
        # Create keys with different expiration states
        raw_key1, key_id1 = auth_service.generate_api_key()  # No expiration
        raw_key2, key_id2 = auth_service.generate_api_key(expires_days=30)  # Future expiration
        raw_key3, key_id3 = auth_service.generate_api_key()  # Will be expired manually
        
        # Manually expire one key
        expired_key = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id3)
        ).first()
        expired_key.expires_at = datetime.utcnow() - timedelta(days=1)
        auth_service.db_session.commit()
        
        # Run cleanup
        cleaned_count = auth_service.cleanup_expired_keys()
        assert cleaned_count == 1
        
        # Verify expired key is inactive
        expired_key = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id3)
        ).first()
        assert expired_key.is_active is False
    
    def test_extract_api_key_from_header_bearer(self, auth_service):
        """Test extracting API key from Bearer authorization header."""
        header = "Bearer test-api-key-123"
        key = AuthenticationService.extract_api_key_from_header(header)
        assert key == "test-api-key-123"
    
    def test_extract_api_key_from_header_apikey(self, auth_service):
        """Test extracting API key from ApiKey authorization header."""
        header = "ApiKey test-api-key-456"
        key = AuthenticationService.extract_api_key_from_header(header)
        assert key == "test-api-key-456"
    
    def test_extract_api_key_from_header_invalid(self, auth_service):
        """Test extracting API key from invalid headers."""
        # Invalid format
        assert AuthenticationService.extract_api_key_from_header("InvalidFormat") is None
        assert AuthenticationService.extract_api_key_from_header("") is None
        assert AuthenticationService.extract_api_key_from_header(None) is None
        
        # Invalid scheme
        assert AuthenticationService.extract_api_key_from_header("Basic user:pass") is None
    
    def test_get_server_for_api_key(self, auth_service, sample_server):
        """Test getting server associated with API key."""
        raw_key, key_id = auth_service.generate_api_key(server_id=sample_server.server_id)
        
        api_key_record = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id)
        ).first()
        
        server = auth_service.get_server_for_api_key(api_key_record)
        assert server is not None
        assert server.server_id == sample_server.server_id
    
    def test_get_server_for_api_key_no_server(self, auth_service):
        """Test getting server for API key with no associated server."""
        raw_key, key_id = auth_service.generate_api_key()  # No server_id
        
        api_key_record = auth_service.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id)
        ).first()
        
        server = auth_service.get_server_for_api_key(api_key_record)
        assert server is None
    
    def test_key_entropy_requirements(self, auth_service):
        """Test that generated keys meet entropy requirements."""
        raw_key, key_id = auth_service.generate_api_key()
        
        # Key should be long enough to provide sufficient entropy
        # URL-safe base64 encoding of 32 bytes should be at least 43 characters
        assert len(raw_key) >= 43
        
        # Generate multiple keys and verify they're different
        keys = set()
        for _ in range(10):
            key, _ = auth_service.generate_api_key()
            keys.add(key)
        
        # All keys should be unique
        assert len(keys) == 10
    
    def test_hash_security(self, auth_service):
        """Test that API key hashing is secure."""
        raw_key = "test-key-123"
        
        # Hash the same key multiple times
        hash1 = auth_service._hash_api_key(raw_key)
        hash2 = auth_service._hash_api_key(raw_key)
        
        # Hashes should be different due to salt
        assert hash1 != hash2
        assert hash1 != raw_key
        assert hash2 != raw_key
        
        # But both should verify correctly
        assert auth_service._verify_key_hash(raw_key, hash1)
        assert auth_service._verify_key_hash(raw_key, hash2)
        
        # Wrong key should not verify
        assert not auth_service._verify_key_hash("wrong-key", hash1)