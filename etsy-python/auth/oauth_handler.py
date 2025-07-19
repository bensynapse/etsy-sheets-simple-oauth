"""
OAuth 2.0 + PKCE implementation for Etsy API v3.
Handles authorization flow without web app deployment.
"""

import hashlib
import base64
import secrets
import webbrowser
from urllib.parse import urlencode, parse_qs, urlparse
import requests
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class EtsyOAuthHandler:
    """Handles OAuth 2.0 + PKCE flow for Etsy API."""
    
    def __init__(self, api_key: str, redirect_uri: str = "http://localhost"):
        """Initialize OAuth handler.
        
        Args:
            api_key: Etsy API key (also used as client_id)
            redirect_uri: OAuth redirect URI (default: http://localhost)
        """
        self.api_key = api_key
        self.redirect_uri = redirect_uri
        self.auth_base_url = "https://www.etsy.com/oauth/connect"
        self.token_url = "https://api.etsy.com/v3/public/oauth/token"
        
        # Same scopes as Google Apps Script version
        self.scopes = "listings_r listings_w listings_d shops_r shops_w transactions_r email_r"
        
        # Store PKCE values for the session
        self._verifier = None
        self._state = None
        
    def generate_pkce(self) -> Dict[str, str]:
        """Generate PKCE verifier and challenge.
        
        Returns:
            Dictionary with 'verifier' and 'challenge'
        """
        # Generate random verifier (43-128 characters)
        # Using 96 characters (3 x 32 bytes) to match GAS implementation
        verifier_bytes = secrets.token_bytes(96)
        verifier = base64.urlsafe_b64encode(verifier_bytes).decode('utf-8').rstrip('=')
        
        # Generate challenge using SHA-256
        challenge_bytes = hashlib.sha256(verifier.encode('utf-8')).digest()
        challenge = base64.urlsafe_b64encode(challenge_bytes).decode('utf-8').rstrip('=')
        
        logger.debug(f"Generated PKCE verifier length: {len(verifier)}")
        logger.debug(f"Generated PKCE challenge length: {len(challenge)}")
        
        return {
            'verifier': verifier,
            'challenge': challenge
        }
    
    def get_auth_url(self) -> Dict[str, str]:
        """Build authorization URL with PKCE.
        
        Returns:
            Dictionary with:
                - url: Authorization URL to open
                - state: State parameter for CSRF protection
                - verifier: PKCE verifier (store for token exchange)
        """
        # Generate PKCE values
        pkce = self.generate_pkce()
        self._verifier = pkce['verifier']
        
        # Generate state for CSRF protection
        self._state = secrets.token_urlsafe(16)
        
        # Build authorization URL parameters
        params = {
            'response_type': 'code',
            'redirect_uri': self.redirect_uri,
            'scope': self.scopes,
            'client_id': self.api_key,
            'state': self._state,
            'code_challenge': pkce['challenge'],
            'code_challenge_method': 'S256'
        }
        
        auth_url = f"{self.auth_base_url}?{urlencode(params)}"
        
        logger.info(f"Generated authorization URL with client_id: {self.api_key[:8]}...{self.api_key[-4:] if len(self.api_key) > 12 else ''}")
        
        return {
            'url': auth_url,
            'state': self._state,
            'verifier': self._verifier
        }
    
    def extract_code_from_url(self, redirect_url: str) -> str:
        """Extract authorization code from redirect URL.
        
        Args:
            redirect_url: Full redirect URL with code parameter
            
        Returns:
            Authorization code
            
        Raises:
            ValueError: If code not found or state mismatch
        """
        parsed = urlparse(redirect_url)
        params = parse_qs(parsed.query)
        
        # Check for error
        if 'error' in params:
            error = params['error'][0]
            error_desc = params.get('error_description', ['Unknown error'])[0]
            raise ValueError(f"OAuth error: {error} - {error_desc}")
        
        # Extract code
        if 'code' not in params:
            raise ValueError("No authorization code found in URL")
            
        code = params['code'][0]
        
        # Verify state if available
        if 'state' in params and self._state:
            if params['state'][0] != self._state:
                raise ValueError("State parameter mismatch - possible CSRF attack")
        
        return code
    
    def exchange_code_for_token(self, code: str, verifier: Optional[str] = None) -> Dict[str, any]:
        """Exchange authorization code for access token.
        
        Args:
            code: Authorization code from OAuth flow
            verifier: PKCE verifier (uses stored value if not provided)
            
        Returns:
            Token response with access_token, refresh_token, expires_in
            
        Raises:
            requests.RequestException: On API errors
        """
        if not verifier:
            verifier = self._verifier
            
        if not verifier:
            raise ValueError("PKCE verifier not found. Call get_auth_url() first.")
        
        # Prepare token request
        data = {
            'grant_type': 'authorization_code',
            'client_id': self.api_key,
            'redirect_uri': self.redirect_uri,
            'code': code,
            'code_verifier': verifier
        }
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        logger.info("Exchanging authorization code for token")
        
        response = requests.post(self.token_url, json=data, headers=headers)
        
        if response.status_code != 200:
            error_data = response.json()
            error = error_data.get('error', 'Unknown error')
            error_desc = error_data.get('error_description', 'No description')
            raise requests.RequestException(f"Token exchange failed: {error} - {error_desc}")
        
        token_data = response.json()
        
        # Clear stored values after successful exchange
        self._verifier = None
        self._state = None
        
        logger.info("Successfully obtained access token")
        
        return token_data
    
    def refresh_token(self, refresh_token: str) -> Dict[str, any]:
        """Refresh an expired access token.
        
        Args:
            refresh_token: Refresh token from previous authorization
            
        Returns:
            New token response
            
        Raises:
            requests.RequestException: On API errors
        """
        data = {
            'grant_type': 'refresh_token',
            'client_id': self.api_key,
            'refresh_token': refresh_token
        }
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        logger.info("Refreshing access token")
        
        response = requests.post(self.token_url, json=data, headers=headers)
        
        if response.status_code != 200:
            error_data = response.json()
            error = error_data.get('error', 'Unknown error')
            error_desc = error_data.get('error_description', 'No description')
            raise requests.RequestException(f"Token refresh failed: {error} - {error_desc}")
        
        logger.info("Successfully refreshed access token")
        
        return response.json()
    
    def perform_manual_oauth(self) -> Dict[str, str]:
        """Perform manual OAuth flow (matching GAS implementation).
        
        This opens the browser and prompts user to paste the redirect URL.
        
        Returns:
            Token data with access_token, refresh_token, expires_in
        """
        # Step 1: Generate auth URL
        auth_data = self.get_auth_url()
        
        # Step 2: Open browser
        print("\n" + "="*60)
        print("ETSY OAUTH AUTHORIZATION")
        print("="*60)
        print("\nOpening browser for authorization...")
        print(f"\nIf browser doesn't open, visit this URL:")
        print(f"\n{auth_data['url']}\n")
        
        webbrowser.open(auth_data['url'])
        
        # Step 3: Get redirect URL from user
        print("After authorizing, you'll be redirected to localhost.")
        print("Copy the ENTIRE URL from your browser's address bar.\n")
        redirect_url = input("Paste the full URL here: ").strip()
        
        # Step 4: Extract code
        try:
            code = self.extract_code_from_url(redirect_url)
            print(f"\nAuthorization code extracted successfully")
        except ValueError as e:
            print(f"\nError: {e}")
            raise
        
        # Step 5: Exchange for token
        try:
            token_data = self.exchange_code_for_token(code)
            print(f"\nSuccess! Access token obtained.")
            return token_data
        except Exception as e:
            print(f"\nError exchanging code: {e}")
            raise
    
    def revoke_token(self, token: str) -> bool:
        """Revoke an access or refresh token.
        
        Note: Etsy API v3 doesn't have a revoke endpoint,
        so this just returns True for compatibility.
        
        Args:
            token: Token to revoke
            
        Returns:
            True (tokens expire naturally)
        """
        logger.info("Token revocation requested (tokens will expire naturally)")
        return True