"""
Core API client for Etsy API v3.
Handles requests, rate limiting, and error handling.
"""

import requests
import time
import json
from typing import Dict, Optional, Any, Union
from urllib.parse import urlencode, quote
import logging
from auth.token_manager import TokenManager

logger = logging.getLogger(__name__)


class EtsyAPIClient:
    """Main API client with rate limiting and error handling."""
    
    def __init__(self, api_key: str, token_manager: TokenManager):
        """Initialize API client.
        
        Args:
            api_key: Etsy API key
            token_manager: Token manager instance
        """
        self.api_key = api_key
        self.token_manager = token_manager
        self.base_url = "https://api.etsy.com/v3/application"
        
        # Rate limiting
        self.rate_limit_delay = 0.5  # 500ms between requests (safe for 10/sec limit)
        self.last_request_time = 0
        
        # Rate limit tracking
        self.requests_per_second = 0
        self.requests_today = 0
        self.rate_limit_reset = 0
        
        # Session for connection pooling
        self.session = requests.Session()
        
    def _get_headers(self) -> Dict[str, str]:
        """Get required headers for API request.
        
        Returns:
            Headers dictionary with auth and API key
            
        Raises:
            Exception: If not authenticated
        """
        access_token = self.token_manager.get_access_token()
        
        if not access_token:
            raise Exception("Not authenticated. Please connect to Etsy first.")
            
        return {
            'Authorization': f'Bearer {access_token}',
            'x-api-key': self.api_key
        }
        
    def _rate_limit(self):
        """Implement rate limiting between requests."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - elapsed
            logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)
        self.last_request_time = time.time()
        
    def _encode_form_data(self, data: Dict[str, Any]) -> str:
        """Encode form data with proper array handling.
        
        Matches the Google Apps Script implementation for arrays.
        
        Args:
            data: Dictionary to encode
            
        Returns:
            URL-encoded form data string
        """
        parts = []
        
        for key, value in data.items():
            if value is None:
                continue
                
            if isinstance(value, list):
                # Handle arrays with bracket notation
                for item in value:
                    parts.append(f"{key}[]={quote(str(item), safe='')}")
            else:
                parts.append(f"{key}={quote(str(value), safe='')}")
                
        return '&'.join(parts)
        
    def request(self, 
                method: str, 
                endpoint: str, 
                data: Optional[Dict] = None, 
                json_data: Optional[Dict] = None,
                files: Optional[Dict] = None,
                params: Optional[Dict] = None) -> Any:
        """Make API request with error handling and rate limiting.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE, PATCH)
            endpoint: API endpoint (e.g., '/shops/123')
            data: Form data for request body
            json_data: JSON data for request body
            files: Files for multipart upload
            params: URL query parameters
            
        Returns:
            Parsed JSON response or None
            
        Raises:
            requests.RequestException: On API errors
        """
        # Apply rate limiting
        self._rate_limit()
        
        # Build full URL
        url = f"{self.base_url}{endpoint}"
        if params:
            url += f"?{urlencode(params)}"
            
        # Get headers
        headers = self._get_headers()
        
        # Prepare request based on content type
        kwargs = {
            'method': method,
            'url': url,
            'headers': headers
        }
        
        if json_data:
            # JSON request
            headers['Content-Type'] = 'application/json'
            kwargs['data'] = json.dumps(json_data)
        elif files:
            # Multipart form data (don't set Content-Type)
            kwargs['files'] = files
            if data:
                kwargs['data'] = data
        elif data:
            # Form-encoded data
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
            kwargs['data'] = self._encode_form_data(data)
            
        # Log request details (without sensitive data)
        logger.debug(f"{method} {endpoint}")
        
        # Make request
        try:
            response = self.session.request(**kwargs)
            
            # Track rate limits from headers
            self._update_rate_limits(response.headers)
            
            # Handle rate limiting (429)
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                logger.warning(f"Rate limited. Waiting {retry_after} seconds...")
                time.sleep(retry_after)
                # Retry the request
                return self.request(method, endpoint, data, json_data, files, params)
                
            # Check for errors
            if response.status_code >= 400:
                self._handle_error_response(response)
                
            # Return parsed response
            if response.content:
                return response.json()
            return None
            
        except requests.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise
            
    def _update_rate_limits(self, headers: Dict[str, str]):
        """Update rate limit tracking from response headers.
        
        Args:
            headers: Response headers
        """
        # Per-second limits
        if 'X-Limit-Per-Second' in headers:
            self.requests_per_second = int(headers['X-Limit-Per-Second'])
        if 'X-Remaining-This-Second' in headers:
            remaining_second = int(headers['X-Remaining-This-Second'])
            
        # Daily limits  
        if 'X-Limit-Per-Day' in headers:
            daily_limit = int(headers['X-Limit-Per-Day'])
        if 'X-Remaining-Today' in headers:
            self.requests_today = int(headers['X-Remaining-Today'])
            
    def _handle_error_response(self, response: requests.Response):
        """Handle API error responses.
        
        Args:
            response: Error response
            
        Raises:
            requests.RequestException: With error details
        """
        try:
            error_data = response.json()
            error = error_data.get('error', 'Unknown error')
            error_desc = error_data.get('error_description', '')
            message = f"{error}: {error_desc}" if error_desc else error
        except:
            message = f"HTTP {response.status_code}: {response.text}"
            
        # Add specific error handling
        if response.status_code == 400:
            raise requests.RequestException(f"Bad Request - {message}")
        elif response.status_code == 401:
            raise requests.RequestException(f"Unauthorized - {message}")
        elif response.status_code == 403:
            if 'insufficient_scope' in message:
                raise requests.RequestException(
                    f"Insufficient permissions - {message}. "
                    "Please reconnect with required scopes."
                )
            raise requests.RequestException(f"Forbidden - {message}")
        elif response.status_code == 404:
            raise requests.RequestException(f"Not Found - {message}")
        else:
            raise requests.RequestException(f"API Error - {message}")
            
    def get(self, endpoint: str, params: Optional[Dict] = None) -> Any:
        """Make GET request.
        
        Args:
            endpoint: API endpoint
            params: Query parameters
            
        Returns:
            Response data
        """
        return self.request('GET', endpoint, params=params)
        
    def post(self, endpoint: str, data: Optional[Dict] = None, 
             json_data: Optional[Dict] = None, files: Optional[Dict] = None) -> Any:
        """Make POST request.
        
        Args:
            endpoint: API endpoint
            data: Form data
            json_data: JSON data
            files: Files for upload
            
        Returns:
            Response data
        """
        return self.request('POST', endpoint, data=data, json_data=json_data, files=files)
        
    def put(self, endpoint: str, data: Optional[Dict] = None, 
            json_data: Optional[Dict] = None) -> Any:
        """Make PUT request.
        
        Args:
            endpoint: API endpoint
            data: Form data
            json_data: JSON data
            
        Returns:
            Response data
        """
        return self.request('PUT', endpoint, data=data, json_data=json_data)
        
    def patch(self, endpoint: str, data: Optional[Dict] = None) -> Any:
        """Make PATCH request.
        
        Args:
            endpoint: API endpoint
            data: Form data
            
        Returns:
            Response data
        """
        return self.request('PATCH', endpoint, data=data)
        
    def delete(self, endpoint: str) -> Any:
        """Make DELETE request.
        
        Args:
            endpoint: API endpoint
            
        Returns:
            Response data
        """
        return self.request('DELETE', endpoint)
        
    def test_connection(self) -> Dict[str, Any]:
        """Test API connection (matches GAS testConnection).
        
        Returns:
            Connection status dictionary
        """
        result = {
            'success': False,
            'message': 'Unknown error',
            'apiKeyValid': False,
            'authenticated': False
        }
        
        # Test 1: Check API key with ping endpoint
        try:
            ping_url = "https://api.etsy.com/v3/application/openapi-ping"
            response = self.session.get(
                ping_url,
                headers={'x-api-key': self.api_key}
            )
            
            if response.status_code == 200:
                result['apiKeyValid'] = True
                result['message'] = 'API key is valid'
            else:
                result['message'] = 'Invalid API key'
                return result
                
        except Exception as e:
            result['message'] = f'Network error: {str(e)}'
            return result
            
        # Test 2: Check authentication
        if not self.token_manager.is_authenticated():
            result['message'] = 'API key valid but not authenticated. Please connect to Etsy.'
            return result
            
        # Test 3: Try authenticated request
        try:
            user_data = self.get('/users/me')
            result['authenticated'] = True
            result['success'] = True
            result['message'] = f"Connected as {user_data.get('login_name', 'Unknown User')}"
        except Exception as e:
            result['message'] = f'Authentication failed: {str(e)}'
            
        return result
        
    def get_rate_limit_status(self) -> Dict[str, Any]:
        """Get current rate limit status.
        
        Returns:
            Rate limit information
        """
        return {
            'requests_today': self.requests_today,
            'daily_limit': 10000,
            'requests_per_second': self.requests_per_second,
            'second_limit': 10
        }