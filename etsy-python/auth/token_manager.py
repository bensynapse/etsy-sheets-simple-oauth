"""
Token management module.
Handles token storage, retrieval, and automatic refresh.
"""

import time
from typing import Dict, Optional, Any
import logging
from config.settings import ConfigManager
from auth.oauth_handler import EtsyOAuthHandler

logger = logging.getLogger(__name__)


class TokenManager:
    """Manages OAuth tokens with automatic refresh."""
    
    def __init__(self, config_manager: Optional[ConfigManager] = None):
        """Initialize token manager.
        
        Args:
            config_manager: Configuration manager instance
        """
        self.config = config_manager or ConfigManager()
        self._oauth_handler = None
        
    def set_oauth_handler(self, oauth_handler: EtsyOAuthHandler):
        """Set OAuth handler for token refresh.
        
        Args:
            oauth_handler: OAuth handler instance
        """
        self._oauth_handler = oauth_handler
        
    def save_tokens(self, token_data: Dict[str, Any]):
        """Save OAuth tokens from response.
        
        Args:
            token_data: Token response from OAuth server
        """
        self.config.save_tokens(token_data)
        logger.info("Saved OAuth tokens")
        
    def get_access_token(self) -> Optional[str]:
        """Get current access token, refreshing if needed.
        
        Returns:
            Access token or None if not authenticated
            
        Raises:
            Exception: If token refresh fails
        """
        if self.needs_refresh():
            if self._oauth_handler:
                self.refresh()
            else:
                logger.warning("Token needs refresh but no OAuth handler set")
                
        tokens = self.config.get_tokens()
        return tokens.get('access_token')
        
    def get_refresh_token(self) -> Optional[str]:
        """Get current refresh token.
        
        Returns:
            Refresh token or None
        """
        tokens = self.config.get_tokens()
        return tokens.get('refresh_token')
        
    def get_token_expiry(self) -> float:
        """Get token expiry timestamp.
        
        Returns:
            Unix timestamp of token expiry, or 0 if not set
        """
        tokens = self.config.get_tokens()
        try:
            return float(tokens.get('token_expires', 0))
        except (ValueError, TypeError):
            return 0.0
            
    def needs_refresh(self) -> bool:
        """Check if token needs refresh.
        
        Tokens are refreshed if they expire in less than 5 minutes.
        
        Returns:
            True if token needs refresh
        """
        expiry = self.get_token_expiry()
        if expiry == 0:
            return False
            
        # Refresh if expires in less than 5 minutes (300 seconds)
        return time.time() > (expiry - 300)
        
    def is_authenticated(self) -> bool:
        """Check if user is authenticated.
        
        Returns:
            True if valid access token exists
        """
        access_token = self.config.get('access_token')
        return bool(access_token)
        
    def refresh(self) -> bool:
        """Refresh the access token.
        
        Returns:
            True if refresh successful
            
        Raises:
            Exception: If refresh fails
        """
        if not self._oauth_handler:
            raise Exception("OAuth handler not set")
            
        refresh_token = self.get_refresh_token()
        if not refresh_token:
            raise Exception("No refresh token available")
            
        logger.info("Refreshing access token")
        
        try:
            # Refresh the token
            token_data = self._oauth_handler.refresh_token(refresh_token)
            
            # Save new tokens
            self.save_tokens(token_data)
            
            logger.info("Successfully refreshed access token")
            return True
            
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            raise
            
    def clear_tokens(self):
        """Clear all stored tokens (logout)."""
        self.config.delete('access_token')
        self.config.delete('refresh_token')
        self.config.delete('token_expires')
        logger.info("Cleared all tokens")
        
    def get_time_until_expiry(self) -> int:
        """Get seconds until token expires.
        
        Returns:
            Seconds until expiry, or -1 if expired/not set
        """
        expiry = self.get_token_expiry()
        if expiry == 0:
            return -1
            
        remaining = expiry - time.time()
        return int(remaining) if remaining > 0 else -1
        
    def format_expiry_time(self) -> str:
        """Get human-readable time until expiry.
        
        Returns:
            Formatted string like "2 hours 15 minutes"
        """
        seconds = self.get_time_until_expiry()
        
        if seconds < 0:
            return "Expired"
        elif seconds == 0:
            return "Not set"
            
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        
        parts = []
        if hours > 0:
            parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
        if minutes > 0:
            parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
            
        return " ".join(parts) if parts else "Less than a minute"