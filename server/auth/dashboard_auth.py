"""
Dashboard authentication service for user management and JWT token handling.

This module provides authentication functionality specifically for the web dashboard,
including user registration, login, session management, and JWT token operations.
"""

import secrets
import hashlib
import jwt
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from server.database.models import DashboardUser, DashboardSession, DashboardSettings


class DashboardAuthService:
    """
    Service for managing dashboard user authentication and sessions.
    
    Provides secure user registration, login, JWT token management,
    and session handling for the web dashboard interface.
    """
    
    def __init__(self, db_session: Session, jwt_secret: str, jwt_algorithm: str = "HS256"):
        """
        Initialize the dashboard authentication service.
        
        Args:
            db_session: SQLAlchemy database session for persistence operations
            jwt_secret: Secret key for JWT token signing
            jwt_algorithm: JWT algorithm to use for token signing
        """
        self.db_session = db_session
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = jwt_algorithm
        self.access_token_expire_minutes = 60  # 1 hour
        self.refresh_token_expire_days = 7     # 7 days
    
    def create_user(self, username: str, password: str, email: Optional[str] = None,
                   full_name: Optional[str] = None, is_admin: bool = False) -> Optional[DashboardUser]:
        """
        Create a new dashboard user account.
        
        Args:
            username: Unique username for the account
            password: Plain text password (will be hashed)
            email: Optional email address
            full_name: Optional full name
            is_admin: Whether the user should have admin privileges
            
        Returns:
            DashboardUser record if created successfully, None otherwise
        """
        try:
            # Check if username already exists
            existing_user = self.db_session.query(DashboardUser).filter(
                DashboardUser.username == username
            ).first()
            
            if existing_user:
                return None
            
            # Check if email already exists (if provided)
            if email:
                existing_email = self.db_session.query(DashboardUser).filter(
                    DashboardUser.email == email
                ).first()
                
                if existing_email:
                    return None
            
            # Hash the password
            password_hash = self._hash_password(password)
            
            # Create user record
            user = DashboardUser(
                username=username,
                email=email,
                password_hash=password_hash,
                full_name=full_name,
                is_admin=is_admin,
                created_at=datetime.utcnow()
            )
            
            self.db_session.add(user)
            self.db_session.flush()
            
            # Create default settings for the user
            settings = DashboardSettings(
                user_id=user.id,
                created_at=datetime.utcnow()
            )
            
            self.db_session.add(settings)
            self.db_session.commit()
            
            return user
            
        except Exception as e:
            self.db_session.rollback()
            return None
    
    def authenticate_user(self, username: str, password: str) -> Optional[DashboardUser]:
        """
        Authenticate a user with username and password.
        
        Args:
            username: Username to authenticate
            password: Plain text password to verify
            
        Returns:
            DashboardUser record if authentication successful, None otherwise
        """
        user = self.db_session.query(DashboardUser).filter(
            DashboardUser.username == username,
            DashboardUser.is_active == True
        ).first()
        
        if not user:
            return None
        
        if not self._verify_password(password, user.password_hash):
            return None
        
        # Update login statistics
        user.last_login = datetime.utcnow()
        user.login_count += 1
        self.db_session.commit()
        
        return user
    
    def create_session(self, user: DashboardUser, ip_address: Optional[str] = None,
                      user_agent: Optional[str] = None) -> Tuple[str, str]:
        """
        Create a new session with access and refresh tokens.
        
        Args:
            user: DashboardUser to create session for
            ip_address: Optional client IP address
            user_agent: Optional client user agent string
            
        Returns:
            Tuple of (access_token, refresh_token)
        """
        now = datetime.utcnow()
        
        # Generate session tokens
        session_token = secrets.token_urlsafe(32)
        refresh_token = secrets.token_urlsafe(32)
        
        # Calculate expiration times
        access_expires = now + timedelta(minutes=self.access_token_expire_minutes)
        refresh_expires = now + timedelta(days=self.refresh_token_expire_days)
        
        # Create session record
        session = DashboardSession(
            user_id=user.id,
            session_token=session_token,
            refresh_token=refresh_token,
            expires_at=access_expires,
            refresh_expires_at=refresh_expires,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            last_activity=now
        )
        
        self.db_session.add(session)
        self.db_session.commit()
        
        # Create JWT access token
        access_token_payload = {
            "sub": str(user.id),
            "username": user.username,
            "session_id": str(session.id),
            "exp": access_expires,
            "iat": now,
            "type": "access"
        }
        
        access_token = jwt.encode(
            access_token_payload,
            self.jwt_secret,
            algorithm=self.jwt_algorithm
        )
        
        return access_token, refresh_token
    
    def validate_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate a JWT access token and return payload if valid.
        
        Args:
            token: JWT access token to validate
            
        Returns:
            Token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm]
            )
            
            # Verify token type
            if payload.get("type") != "access":
                return None
            
            # Check if session is still active
            session_id = payload.get("session_id")
            if session_id:
                session = self.db_session.query(DashboardSession).filter(
                    DashboardSession.id == int(session_id),
                    DashboardSession.is_active == True,
                    DashboardSession.expires_at > datetime.utcnow()
                ).first()
                
                if not session:
                    return None
                
                # Update last activity
                session.last_activity = datetime.utcnow()
                self.db_session.commit()
            
            return payload
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Tuple[str, str]]:
        """
        Refresh an access token using a refresh token.
        
        Args:
            refresh_token: Refresh token to use for generating new access token
            
        Returns:
            Tuple of (new_access_token, new_refresh_token) if successful, None otherwise
        """
        # Find active session with this refresh token
        session = self.db_session.query(DashboardSession).filter(
            DashboardSession.refresh_token == refresh_token,
            DashboardSession.is_active == True,
            DashboardSession.refresh_expires_at > datetime.utcnow()
        ).first()
        
        if not session:
            return None
        
        # Get user
        user = self.db_session.query(DashboardUser).filter(
            DashboardUser.id == session.user_id,
            DashboardUser.is_active == True
        ).first()
        
        if not user:
            return None
        
        # Generate new tokens
        now = datetime.utcnow()
        new_session_token = secrets.token_urlsafe(32)
        new_refresh_token = secrets.token_urlsafe(32)
        
        # Update session with new tokens and expiration
        session.session_token = new_session_token
        session.refresh_token = new_refresh_token
        session.expires_at = now + timedelta(minutes=self.access_token_expire_minutes)
        session.refresh_expires_at = now + timedelta(days=self.refresh_token_expire_days)
        session.last_activity = now
        
        self.db_session.commit()
        
        # Create new JWT access token
        access_token_payload = {
            "sub": str(user.id),
            "username": user.username,
            "session_id": str(session.id),
            "exp": session.expires_at,
            "iat": now,
            "type": "access"
        }
        
        access_token = jwt.encode(
            access_token_payload,
            self.jwt_secret,
            algorithm=self.jwt_algorithm
        )
        
        return access_token, new_refresh_token
    
    def logout_session(self, session_id: int) -> bool:
        """
        Logout a specific session by marking it as inactive.
        
        Args:
            session_id: ID of the session to logout
            
        Returns:
            True if session was found and logged out, False otherwise
        """
        session = self.db_session.query(DashboardSession).filter(
            DashboardSession.id == session_id
        ).first()
        
        if not session:
            return False
        
        session.is_active = False
        self.db_session.commit()
        
        return True
    
    def logout_all_sessions(self, user_id: int) -> int:
        """
        Logout all sessions for a user.
        
        Args:
            user_id: ID of the user to logout all sessions for
            
        Returns:
            Number of sessions that were logged out
        """
        updated_count = self.db_session.query(DashboardSession).filter(
            DashboardSession.user_id == user_id,
            DashboardSession.is_active == True
        ).update({"is_active": False})
        
        self.db_session.commit()
        
        return updated_count
    
    def get_user_by_id(self, user_id: int) -> Optional[DashboardUser]:
        """
        Get a user by their ID.
        
        Args:
            user_id: ID of the user to retrieve
            
        Returns:
            DashboardUser record if found, None otherwise
        """
        return self.db_session.query(DashboardUser).filter(
            DashboardUser.id == user_id,
            DashboardUser.is_active == True
        ).first()
    
    def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions by marking them as inactive.
        
        Returns:
            Number of sessions that were cleaned up
        """
        now = datetime.utcnow()
        
        expired_count = self.db_session.query(DashboardSession).filter(
            DashboardSession.refresh_expires_at < now,
            DashboardSession.is_active == True
        ).update({"is_active": False})
        
        self.db_session.commit()
        
        return expired_count
    
    def _hash_password(self, password: str) -> str:
        """
        Hash a password for secure storage.
        
        Args:
            password: Plain text password to hash
            
        Returns:
            Hashed password suitable for database storage
        """
        # Generate a random salt
        salt = secrets.token_bytes(32)
        
        # Hash the password with the salt
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        
        # Return salt + hash as hex string
        return (salt + password_hash).hex()
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """
        Verify a password against a stored hash.
        
        Args:
            password: Plain text password to verify
            password_hash: Stored hash to verify against
            
        Returns:
            True if password matches hash, False otherwise
        """
        try:
            # Decode the stored hash
            stored_bytes = bytes.fromhex(password_hash)
            
            # Extract salt (first 32 bytes) and hash (remaining bytes)
            salt = stored_bytes[:32]
            stored_hash = stored_bytes[32:]
            
            # Hash the provided password with the same salt
            computed_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
            
            # Compare hashes using constant-time comparison
            return secrets.compare_digest(computed_hash, stored_hash)
        except (ValueError, IndexError):
            return False