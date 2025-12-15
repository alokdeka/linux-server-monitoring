#!/usr/bin/env python3
"""
Example script demonstrating how to use the FastAPI server endpoints.

This script shows how to:
1. Start the FastAPI server
2. Register an agent
3. Submit metrics
4. Check server health

Run this script after setting up the database and starting the server.
"""

import requests
import json
from datetime import datetime


def main():
    """Demonstrate API usage."""
    base_url = "http://localhost:8000"
    
    print("Linux Server Health Monitoring API Usage Example")
    print("=" * 50)
    
    # 1. Check server health
    print("\n1. Checking server health...")
    try:
        response = requests.get(f"{base_url}/api/v1/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to server. Make sure the server is running.")
        return
    
    # 2. Register an agent
    print("\n2. Registering an agent...")
    registration_data = {
        "server_id": "example-server-001",
        "hostname": "example-host",
        "ip_address": "192.168.1.100"
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/register", json=registration_data)
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            registration_result = response.json()
            print(f"Response: {json.dumps(registration_result, indent=2)}")
            api_key = registration_result.get("api_key")
            
            # 3. Submit metrics using the API key
            if api_key:
                print("\n3. Submitting metrics...")
                metrics_data = {
                    "server_id": "example-server-001",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "cpu_usage": 45.2,
                    "memory": {
                        "total": 8589934592,
                        "used": 4294967296,
                        "percentage": 50.0
                    },
                    "disk_usage": [
                        {
                            "mountpoint": "/",
                            "total": 107374182400,
                            "used": 53687091200,
                            "percentage": 50.0
                        }
                    ],
                    "load_average": {
                        "one_min": 1.2,
                        "five_min": 1.1,
                        "fifteen_min": 0.9
                    },
                    "uptime": 86400,
                    "failed_services": [
                        {
                            "name": "nginx",
                            "status": "failed",
                            "since": "2024-12-15T09:15:00Z"
                        }
                    ]
                }
                
                headers = {"Authorization": f"Bearer {api_key}"}
                response = requests.post(f"{base_url}/api/v1/metrics", 
                                       json=metrics_data, 
                                       headers=headers)
                print(f"Status: {response.status_code}")
                print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Registration failed: {response.text}")
    
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "=" * 50)
    print("Example completed!")
    print("\nTo start the server, run:")
    print("  python server/main.py")
    print("\nOr with uvicorn:")
    print("  uvicorn server.main:app --host 0.0.0.0 --port 8000")


if __name__ == "__main__":
    main()