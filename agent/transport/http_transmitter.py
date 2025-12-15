"""
HTTP transmitter for secure communication with central server.

This module implements the HTTPTransmitter class that handles:
- Secure HTTP communication with API key authentication
- Exponential backoff retry mechanism for network failures
- JSON serialization of metrics data
"""

import time
import logging
from typing import Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from shared.interfaces import HTTPTransmitterInterface
from shared.models import SystemMetrics


logger = logging.getLogger(__name__)


class HTTPTransmitter(HTTPTransmitterInterface):
    """
    Handles secure HTTP communication with the central server.
    
    Features:
    - API key authentication via headers
    - Exponential backoff retry mechanism
    - JSON serialization of metrics
    - Configurable timeouts and retry attempts
    """

    def __init__(
        self,
        server_url: str,
        timeout: int = 30,
        max_retries: int = 3,
        backoff_factor: float = 2.0,
        verify_ssl: bool = True
    ):
        """
        Initialize HTTP transmitter.
        
        Args:
            server_url: Base URL of the central server
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            backoff_factor: Exponential backoff multiplier
            verify_ssl: Whether to verify SSL certificates
        """
        self.server_url = server_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.verify_ssl = verify_ssl
        
        # Create session with retry strategy
        self.session = requests.Session()
        
        # Configure retry strategy for connection errors, timeouts, and 5xx errors
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=backoff_factor,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST", "GET"]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'LinuxServerMonitor-Agent/1.0'
        })

    def send_metrics(self, data: SystemMetrics, api_key: str) -> bool:
        """
        Send metrics to central server with authentication.
        
        Args:
            data: SystemMetrics object to send
            api_key: API key for authentication
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Prepare headers with API key
            headers = {
                'Authorization': f'Bearer {api_key}',
                'X-API-Key': api_key  # Alternative header format
            }
            
            # Serialize metrics to JSON
            json_data = data.to_json()
            
            # Send POST request to metrics endpoint
            url = f"{self.server_url}/api/v1/metrics"
            
            logger.debug(f"Sending metrics to {url}")
            
            response = self.session.post(
                url,
                data=json_data,
                headers=headers,
                timeout=self.timeout,
                verify=self.verify_ssl
            )
            
            # Check response status
            if response.status_code == 200:
                logger.info("Metrics sent successfully")
                return True
            elif response.status_code == 401:
                logger.error("Authentication failed - invalid API key")
                return False
            elif response.status_code == 429:
                logger.warning("Rate limit exceeded")
                return False
            else:
                logger.error(f"Server returned status {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error: {e}")
            return False
        except requests.exceptions.Timeout as e:
            logger.error(f"Request timeout: {e}")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending metrics: {e}")
            return False

    def authenticate(self, api_key: str) -> bool:
        """
        Test authentication with the central server.
        
        Args:
            api_key: API key to validate
            
        Returns:
            bool: True if authentication successful, False otherwise
        """
        try:
            # Prepare headers with API key
            headers = {
                'Authorization': f'Bearer {api_key}',
                'X-API-Key': api_key
            }
            
            # Send GET request to health endpoint for authentication test
            url = f"{self.server_url}/api/v1/health"
            
            logger.debug(f"Testing authentication with {url}")
            
            response = self.session.get(
                url,
                headers=headers,
                timeout=self.timeout,
                verify=self.verify_ssl
            )
            
            if response.status_code == 200:
                logger.info("Authentication successful")
                return True
            elif response.status_code == 401:
                logger.error("Authentication failed - invalid API key")
                return False
            else:
                logger.warning(f"Unexpected response during authentication: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Authentication request failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during authentication: {e}")
            return False

    def send_with_exponential_backoff(
        self, 
        data: SystemMetrics, 
        api_key: str,
        max_attempts: Optional[int] = None
    ) -> bool:
        """
        Send metrics with custom exponential backoff retry logic.
        
        This method implements manual exponential backoff for cases where
        the built-in retry mechanism is not sufficient.
        
        Args:
            data: SystemMetrics object to send
            api_key: API key for authentication
            max_attempts: Override default max retry attempts
            
        Returns:
            bool: True if successful, False if all attempts failed
        """
        attempts = max_attempts or self.max_retries
        
        for attempt in range(attempts):
            success = self.send_metrics(data, api_key)
            
            if success:
                return True
                
            if attempt < attempts - 1:  # Don't sleep after last attempt
                # Calculate exponential backoff delay
                delay = self.backoff_factor ** attempt
                logger.info(f"Attempt {attempt + 1} failed, retrying in {delay:.1f} seconds...")
                time.sleep(delay)
            else:
                logger.error(f"All {attempts} attempts failed")
                
        return False

    def register_agent(self, server_id: str, metadata: dict = None) -> Optional[str]:
        """
        Register agent with central server and obtain API key.
        
        Args:
            server_id: Unique identifier for this server
            metadata: Optional metadata about the server
            
        Returns:
            str: API key if registration successful, None otherwise
        """
        try:
            registration_data = {
                'server_id': server_id,
                'metadata': metadata or {}
            }
            
            url = f"{self.server_url}/api/v1/register"
            
            logger.info(f"Registering agent with server ID: {server_id}")
            
            response = self.session.post(
                url,
                json=registration_data,
                timeout=self.timeout,
                verify=self.verify_ssl
            )
            
            if response.status_code == 200:
                result = response.json()
                api_key = result.get('api_key')
                if api_key:
                    logger.info("Agent registration successful")
                    return api_key
                else:
                    logger.error("Registration response missing API key")
                    return None
            else:
                logger.error(f"Registration failed with status {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Registration request failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during registration: {e}")
            return None

    def close(self):
        """Close the HTTP session and clean up resources."""
        if self.session:
            self.session.close()
            logger.debug("HTTP session closed")