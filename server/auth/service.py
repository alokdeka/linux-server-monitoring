"""
Authentication service for API key management and validation.

This module provides secure API key generation, hashing, and validation
functionality for the Linux Server Health Monitoring System.
"""

import secrets
import hashlib
from typing import Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from server.database.models import ApiKey, Server


class AuthenticationService:
    """
    Service for managing API key authentication and security.
    
    Provides secure API key generation using cryptographic randomness,
    secure hashing for storage, and validation logic for incoming requests.
    """
    
    # Minimum entropy for API keys (32 bytes = 256 bits)
    MIN_KEY_ENTROPY_BYTES = 32
    
    def __init__(self, db_session: Session):
        """
        Initialize the authentication service.
        
        Args:
            db_session: SQLAlchemy database session for persistence operations
        """
        self.db_session = db_session
    
    def generate_api_key(self, server_id: Optional[str] = None, 
                        description: Optional[str] = None,
                        expires_days: Optional[int] = None) -> Tuple[str, str]:
        """
        Generate a new API key with cryptographic randomness.
        
        Uses secrets module for cryptographically secure random generation
        to ensure sufficient entropy for security.
        
        Args:
            server_id: Optional server ID to associate with the key
            description: Optional description for the key
            expires_days: Optional expiration in days from now
            
        Returns:
            Tuple of (raw_key, key_id) where raw_key should be given to client
            and key_id is the database identifier
            
        Raises:
            ValueError: If entropy requirements are not met
        """
        # Generate cryptographically secure random key
        # Using URL-safe base64 encoding for easy transmission
        raw_key = secrets.token_urlsafe(self.MIN_KEY_ENTROPY_BYTES)
        
        # Verify entropy (should be at least 32 bytes when decoded)
        if len(secrets.token_bytes(self.MIN_KEY_ENTROPY_BYTES)) < self.MIN_KEY_ENTROPY_BYTES:
            raise ValueError("Generated key does not meet minimum entropy requirements")
        
        # Hash the key for secure storage
        key_hash = self._hash_api_key(raw_key)
        
        # Calculate expiration if specified
        expires_at = None
        if expires_days is not None:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)
        
        # Create database record
        api_key_record = ApiKey(
            key_hash=key_hash,
            server_id=server_id,
            description=description,
            expires_at=expires_at,
            created_at=datetime.utcnow(),
            is_active=True
        )
        
        self.db_session.add(api_key_record)
        self.db_session.commit()
        
        return raw_key, str(api_key_record.id)
    
    def validate_api_key(self, raw_key: str) -> Optional[ApiKey]:
        """
        Validate an API key and return the associated record if valid.
        
        Performs secure hash comparison and checks expiration and active status.
        Updates last_used timestamp on successful validation.
        
        Args:
            raw_key: The raw API key to validate
            
        Returns:
            ApiKey record if valid, None if invalid or expired
        """
        if not raw_key:
            return None
        
        # Get all active API key records and check each one
        active_keys = self.db_session.query(ApiKey).filter(
            ApiKey.is_active == True
        ).all()
        
        for api_key_record in active_keys:
            # Verify the key against this record's hash
            if self._verify_key_hash(raw_key, api_key_record.key_hash):
                # Check expiration
                if api_key_record.expires_at and api_key_record.expires_at < datetime.utcnow():
                    return None
                
                # Update last used timestamp
                api_key_record.last_used = datetime.utcnow()
                self.db_session.commit()
                
                return api_key_record
        
        return None
    
    def revoke_api_key(self, key_id: str) -> bool:
        """
        Revoke an API key by marking it as inactive.
        
        Args:
            key_id: Database ID of the API key to revoke
            
        Returns:
            True if key was found and revoked, False otherwise
        """
        api_key_record = self.db_session.query(ApiKey).filter(
            ApiKey.id == int(key_id)
        ).first()
        
        if not api_key_record:
            return False
        
        api_key_record.is_active = False
        self.db_session.commit()
        
        return True
    
    def list_api_keys(self, server_id: Optional[str] = None, 
                     active_only: bool = True) -> list[ApiKey]:
        """
        List API keys, optionally filtered by server and active status.
        
        Args:
            server_id: Optional server ID to filter by
            active_only: Whether to only return active keys
            
        Returns:
            List of ApiKey records matching the criteria
        """
        query = self.db_session.query(ApiKey)
        
        if server_id:
            query = query.filter(ApiKey.server_id == server_id)
        
        if active_only:
            query = query.filter(ApiKey.is_active == True)
        
        return query.order_by(ApiKey.created_at.desc()).all()
    
    def cleanup_expired_keys(self) -> int:
        """
        Clean up expired API keys by marking them as inactive.
        
        Returns:
            Number of keys that were deactivated
        """
        expired_keys = self.db_session.query(ApiKey).filter(
            ApiKey.expires_at < datetime.utcnow(),
            ApiKey.is_active == True
        ).all()
        
        count = 0
        for key in expired_keys:
            key.is_active = False
            count += 1
        
        if count > 0:
            self.db_session.commit()
        
        return count
    
    def _hash_api_key(self, raw_key: str) -> str:
        """
        Hash an API key for secure storage.
        
        Uses SHA-256 with a random salt for secure hashing.
        
        Args:
            raw_key: The raw API key to hash
            
        Returns:
            Hashed key suitable for database storage (salt + hash)
        """
        # Generate a random salt
        salt = secrets.token_bytes(32)
        
        # Hash the key with the salt
        key_hash = hashlib.pbkdf2_hmac('sha256', raw_key.encode('utf-8'), salt, 100000)
        
        # Return salt + hash as hex string
        return (salt + key_hash).hex()
    
    def _verify_key_hash(self, raw_key: str, key_hash: str) -> bool:
        """
        Verify a raw key against a stored hash.
        
        Args:
            raw_key: The raw API key to verify
            key_hash: The stored hash to verify against (salt + hash as hex)
            
        Returns:
            True if the key matches the hash, False otherwise
        """
        try:
            # Decode the stored hash
            stored_bytes = bytes.fromhex(key_hash)
            
            # Extract salt (first 32 bytes) and hash (remaining bytes)
            salt = stored_bytes[:32]
            stored_hash = stored_bytes[32:]
            
            # Hash the provided key with the same salt
            computed_hash = hashlib.pbkdf2_hmac('sha256', raw_key.encode('utf-8'), salt, 100000)
            
            # Compare hashes using constant-time comparison
            return secrets.compare_digest(computed_hash, stored_hash)
        except (ValueError, IndexError):
            return False
    
    @staticmethod
    def extract_api_key_from_header(authorization_header: str) -> Optional[str]:
        """
        Extract API key from Authorization header.
        
        Supports both "Bearer <key>" and "ApiKey <key>" formats.
        
        Args:
            authorization_header: The Authorization header value
            
        Returns:
            Extracted API key or None if invalid format
        """
        if not authorization_header:
            return None
        
        parts = authorization_header.split()
        if len(parts) != 2:
            return None
        
        scheme, key = parts
        if scheme.lower() not in ['bearer', 'apikey']:
            return None
        
        return key
    
    def get_server_for_api_key(self, api_key_record: ApiKey) -> Optional[Server]:
        """
        Get the server associated with an API key.
        
        Args:
            api_key_record: The API key record
            
        Returns:
            Server record if found, None otherwise
        """
        if not api_key_record.server_id:
            return None
        
        return self.db_session.query(Server).filter(
            Server.server_id == api_key_record.server_id
        ).first()