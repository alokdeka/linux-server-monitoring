"""
CLI command to create an admin user for the dashboard.

This script creates the first admin user for the web dashboard interface.
"""

import sys
import os
import getpass
from sqlalchemy.orm import Session

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from server.database.connection import db_manager
from server.auth.dashboard_auth import DashboardAuthService


def create_admin_user():
    """Create an admin user for the dashboard."""
    print("Creating admin user for the dashboard...")
    print("=" * 50)
    
    # Get user input
    username = input("Enter admin username: ").strip()
    if not username:
        print("Error: Username cannot be empty")
        return False
    
    email = input("Enter admin email (optional): ").strip()
    if not email:
        email = None
    
    full_name = input("Enter full name (optional): ").strip()
    if not full_name:
        full_name = None
    
    # Get password securely
    while True:
        password = getpass.getpass("Enter admin password: ")
        if len(password) < 8:
            print("Error: Password must be at least 8 characters long")
            continue
        
        password_confirm = getpass.getpass("Confirm admin password: ")
        if password != password_confirm:
            print("Error: Passwords do not match")
            continue
        
        break
    
    # Create the user
    try:
        with db_manager.get_session() as session:
            auth_service = DashboardAuthService(session, "temp-secret")
            
            user = auth_service.create_user(
                username=username,
                password=password,
                email=email,
                full_name=full_name,
                is_admin=True
            )
            
            if user:
                print(f"\nAdmin user '{username}' created successfully!")
                print(f"User ID: {user.id}")
                print(f"Email: {user.email or 'Not provided'}")
                print(f"Full Name: {user.full_name or 'Not provided'}")
                return True
            else:
                print("Error: Failed to create user. Username or email may already exist.")
                return False
                
    except Exception as e:
        print(f"Error creating admin user: {e}")
        return False


if __name__ == "__main__":
    success = create_admin_user()
    sys.exit(0 if success else 1)