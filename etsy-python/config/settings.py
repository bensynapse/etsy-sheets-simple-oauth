"""
Configuration and credential management module.
Handles secure storage of API keys and tokens.
"""

import os
import json
from pathlib import Path
from typing import Dict, Optional, Any
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)


class ConfigManager:
    """Manages encrypted configuration and credentials storage."""
    
    def __init__(self, config_dir: Optional[str] = None):
        """Initialize configuration manager.
        
        Args:
            config_dir: Directory to store config files. Defaults to ~/.etsy-python/
        """
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            self.config_dir = Path.home() / '.etsy-python'
            
        self.config_dir.mkdir(exist_ok=True)
        self.config_path = self.config_dir / 'config.json'
        self.key_path = self.config_dir / '.key'
        
        self._ensure_encryption_key()
        
    def _ensure_encryption_key(self):
        """Create encryption key if not exists."""
        if not self.key_path.exists():
            key = Fernet.generate_key()
            self.key_path.write_bytes(key)
            # Restrict permissions on Unix-like systems
            try:
                self.key_path.chmod(0o600)
            except:
                pass  # Windows doesn't support chmod
            logger.info("Created new encryption key")
            
    def _get_cipher(self) -> Fernet:
        """Get encryption cipher."""
        key = self.key_path.read_bytes()
        return Fernet(key)
        
    def save_credentials(self, data: Dict[str, str]):
        """Save encrypted credentials.
        
        Args:
            data: Dictionary of credentials to save
        """
        cipher = self._get_cipher()
        encrypted_data = {}
        
        for key, value in data.items():
            if value:
                encrypted_data[key] = cipher.encrypt(value.encode()).decode()
                
        # Load existing data to preserve other values
        existing_data = {}
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    existing_data = json.load(f)
            except:
                pass
                
        # Merge new data
        existing_data.update(encrypted_data)
        
        with open(self.config_path, 'w') as f:
            json.dump(existing_data, f, indent=2)
            
        logger.info(f"Saved {len(data)} credential(s)")
            
    def load_credentials(self) -> Dict[str, str]:
        """Load and decrypt credentials.
        
        Returns:
            Dictionary of decrypted credentials
        """
        if not self.config_path.exists():
            return {}
            
        cipher = self._get_cipher()
        
        try:
            with open(self.config_path, 'r') as f:
                encrypted_data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return {}
            
        decrypted_data = {}
        for key, value in encrypted_data.items():
            try:
                decrypted_data[key] = cipher.decrypt(value.encode()).decode()
            except Exception as e:
                logger.error(f"Failed to decrypt {key}: {e}")
                
        return decrypted_data
        
    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get a specific credential value.
        
        Args:
            key: Credential key
            default: Default value if not found
            
        Returns:
            Credential value or default
        """
        creds = self.load_credentials()
        return creds.get(key, default)
        
    def set(self, key: str, value: str):
        """Set a specific credential value.
        
        Args:
            key: Credential key
            value: Credential value
        """
        self.save_credentials({key: value})
        
    def delete(self, key: str):
        """Delete a specific credential.
        
        Args:
            key: Credential key to delete
        """
        creds = self.load_credentials()
        if key in creds:
            del creds[key]
            # Re-save without the deleted key
            self.config_path.unlink()
            self.save_credentials(creds)
            
    def clear_all(self):
        """Clear all stored credentials."""
        if self.config_path.exists():
            self.config_path.unlink()
        logger.info("Cleared all credentials")
        
    def get_api_key(self) -> Optional[str]:
        """Get API key from environment or storage.
        
        First checks ETSY_API_KEY environment variable,
        then falls back to encrypted storage.
        """
        # Check environment variable first (like .env file)
        env_key = os.getenv('ETSY_API_KEY')
        if env_key:
            return env_key
            
        # Fall back to encrypted storage
        return self.get('api_key')
        
    def set_api_key(self, api_key: str):
        """Store API key."""
        self.set('api_key', api_key)
        
    def get_tokens(self) -> Dict[str, str]:
        """Get OAuth tokens."""
        return {
            'access_token': self.get('access_token'),
            'refresh_token': self.get('refresh_token'),
            'token_expires': self.get('token_expires')
        }
        
    def save_tokens(self, token_data: Dict[str, Any]):
        """Save OAuth tokens from response.
        
        Args:
            token_data: Token response from OAuth server
        """
        import time
        
        expires_at = time.time() + token_data.get('expires_in', 3600)
        
        self.save_credentials({
            'access_token': token_data['access_token'],
            'refresh_token': token_data.get('refresh_token', ''),
            'token_expires': str(expires_at)
        })
        
    def get_shop_id(self) -> Optional[str]:
        """Get manually saved shop ID."""
        return self.get('manual_shop_id')
        
    def set_shop_id(self, shop_id: str):
        """Set manual shop ID."""
        self.set('manual_shop_id', shop_id)
        
    def is_authenticated(self) -> bool:
        """Check if user is authenticated."""
        tokens = self.get_tokens()
        return bool(tokens.get('access_token'))


# Global instance
config = ConfigManager()