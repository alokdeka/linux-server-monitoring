#!/usr/bin/env python3
"""
Simple script to send test metrics for registered servers.
This simulates monitoring agents sending data to the server.
"""

import requests
import json
import time
import random
from datetime import datetime

# Configuration
SERVER_URL = "http://localhost:8000"
API_KEYS = [
    "9PIvy1SLjXTm1RX7nXHKWChrdZd_MSxXw2mT9QVhHbo",  # test-server-001
    "tnzE1lbYR8JIpK5gq_8DqZNKbKJYk9k8hjd9VNJuXFw"   # test-server-002
]

def generate_mock_metrics(server_id):
    """Generate realistic mock metrics data."""
    memory_total = 8589934592  # 8GB in bytes
    memory_used = random.randint(2000000000, 6000000000)  # 2-6GB used
    
    disk_total = 107374182400  # 100GB
    disk_used = random.randint(20000000000, 80000000000)  # 20-80GB used
    
    return {
        "server_id": server_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "cpu_usage": round(random.uniform(10, 85), 2),
        "memory": {
            "total": memory_total,
            "used": memory_used,
            "percentage": round((memory_used / memory_total) * 100, 2)
        },
        "disk_usage": [
            {
                "mountpoint": "/",
                "total": disk_total,
                "used": disk_used,
                "percentage": round((disk_used / disk_total) * 100, 2)
            }
        ],
        "load_average": {
            "one_min": round(random.uniform(0.1, 2.0), 2),
            "five_min": round(random.uniform(0.1, 1.8), 2),
            "fifteen_min": round(random.uniform(0.1, 1.5), 2)
        },
        "uptime": random.randint(86400, 2592000),  # 1 day to 30 days
        "failed_services": []
    }

def send_metrics(api_key, server_id):
    """Send metrics data to the server."""
    metrics = generate_mock_metrics(server_id)
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{SERVER_URL}/api/v1/metrics",
            headers=headers,
            json=metrics,
            timeout=10
        )
        
        if response.status_code == 201:  # 201 Created for successful metrics submission
            print(f"✅ Sent metrics for {server_id} - CPU: {metrics['cpu_usage']}%, Memory: {metrics['memory']['percentage']}%")
        else:
            print(f"❌ Failed to send metrics for {server_id}: {response.status_code} - {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error sending metrics for {server_id}: {e}")

def main():
    """Main function to send test metrics."""
    print("🚀 Starting test metrics sender...")
    print("📊 This will send mock metrics data for registered test servers")
    print("⏹️  Press Ctrl+C to stop\n")
    
    server_ids = ["test-server-001", "test-server-002"]
    
    try:
        while True:
            for i, api_key in enumerate(API_KEYS):
                send_metrics(api_key, server_ids[i])
            
            print(f"⏰ Waiting 30 seconds before next update...\n")
            time.sleep(30)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping metrics sender...")
        print("✅ Done!")

if __name__ == "__main__":
    main()