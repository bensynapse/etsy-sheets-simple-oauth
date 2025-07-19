"""
Shop management service.
Implements all shop-related functions from GAS version.
"""

from typing import Dict, List, Optional, Any, Union
import logging
import pandas as pd
from datetime import datetime
from api.endpoints import EtsyAPI
from config.settings import ConfigManager

logger = logging.getLogger(__name__)


class ShopService:
    """Service for shop management operations."""
    
    def __init__(self, api: EtsyAPI, config: Optional[ConfigManager] = None):
        """Initialize shop service.
        
        Args:
            api: Etsy API instance
            config: Configuration manager
        """
        self.api = api
        self.config = config or ConfigManager()
        
    def test_connection(self) -> Dict[str, Any]:
        """Test API connection (testConnection).
        
        Returns:
            Connection status with details
        """
        return self.api.client.test_connection()
        
    def quick_test(self) -> Dict[str, Any]:
        """Quick connection test (quickTest).
        
        Returns:
            Simple success/message dict
        """
        result = self.test_connection()
        return {
            'success': result['success'],
            'message': result['message']
        }
        
    def get_current_user(self) -> Dict[str, Any]:
        """Get current authenticated user (getCurrentUser).
        
        Returns:
            User object
        """
        return self.api.get_current_user()
        
    def get_user_shops(self) -> Union[Dict, List]:
        """Get user's shops (getUserShops).
        
        Returns:
            Shop data - array or single object
        """
        return self.api.get_user_shops()
        
    def get_user_info(self) -> Dict[str, Any]:
        """Get formatted user info for UI (getUserInfo).
        
        Returns:
            Formatted user information
        """
        try:
            user = self.get_current_user()
            
            # Check if seller
            is_seller = user.get('is_seller', False)
            
            # Try to get shop info
            shop_name = None
            shop_id = None
            
            if user.get('shop_id'):
                shop_id = user['shop_id']
                try:
                    shop = self.api.get_shop(shop_id)
                    shop_name = shop.get('shop_name')
                except:
                    logger.warning("Could not get shop name")
                    
            return {
                'success': True,
                'user': {
                    'login_name': user.get('login_name', 'Not available'),
                    'email': user.get('primary_email', 'Not available'),
                    'user_id': user['user_id'],
                    'is_seller': is_seller,
                    'shop_id': shop_id,
                    'shop_name': shop_name
                }
            }
        except Exception as e:
            return {'success': False, 'message': str(e)}
            
    def find_user_shop_id(self) -> Optional[int]:
        """Find user's shop ID from various sources (findUserShopId).
        
        Returns:
            Shop ID or None
        """
        # Check manual shop ID first
        manual_shop_id = self.config.get_shop_id()
        if manual_shop_id:
            return int(manual_shop_id)
            
        try:
            # Method 1: Check user object
            user = self.get_current_user()
            if user.get('shop_id'):
                logger.info(f"Found shop ID in user object: {user['shop_id']}")
                return user['shop_id']
        except Exception as e:
            logger.debug(f"Method 1 failed: {e}")
            
        try:
            # Method 2: Get user shops
            shops = self.get_user_shops()
            if isinstance(shops, dict) and shops.get('results'):
                if len(shops['results']) > 0:
                    shop_id = shops['results'][0]['shop_id']
                    logger.info(f"Found shop ID from shops endpoint: {shop_id}")
                    return shop_id
        except Exception as e:
            logger.debug(f"Method 2 failed: {e}")
            
        return None
        
    def save_manual_shop_id(self, shop_id: Union[str, int]) -> Dict[str, bool]:
        """Save manual shop ID override (saveManualShopId).
        
        Args:
            shop_id: Shop ID to save
            
        Returns:
            Success status
        """
        self.config.set_shop_id(str(shop_id))
        return {'success': True}
        
    def debug_check_shops(self) -> Dict[str, Any]:
        """Debug function to check shop detection (debugCheckShops).
        
        Returns:
            Debug information
        """
        try:
            user = self.get_current_user()
            logger.info(f"User: {user}")
            
            shops = self.get_user_shops()
            logger.info(f"Shops response: {shops}")
            
            # Try alternative endpoint
            shops_alt = None
            if user.get('user_id'):
                try:
                    shops_alt = self.api.client.get(f"/users/{user['user_id']}/shops")
                    logger.info(f"Shops (alt endpoint): {shops_alt}")
                except:
                    pass
                    
            return {
                'user': user,
                'shops': shops,
                'shopsAlt': shops_alt
            }
        except Exception as error:
            logger.error(f"Debug error: {error}")
            return {'error': str(error)}
            
    def import_shop_data(self) -> Dict[str, Any]:
        """Import shop data to DataFrame (importShopData).
        
        Returns:
            Status with shop data DataFrame
        """
        try:
            shop_id = self.find_user_shop_id()
            if not shop_id:
                raise Exception(
                    "No shops found. You may need to: "
                    "1) Create a shop on Etsy first, "
                    "2) Wait a few minutes for API sync, or "
                    "3) Use 'Import Any Shop' with a shop ID."
                )
                
            # Get shop details
            shop = self.api.get_shop(shop_id)
            
            # Create DataFrame with shop info
            shop_data = {
                'Field': [
                    'Shop Information',
                    'Shop ID',
                    'Shop Name', 
                    'Title',
                    'Currency',
                    'Active Listings',
                    'Created',
                    ''
                ],
                'Value': [
                    '',
                    shop['shop_id'],
                    shop.get('shop_name', ''),
                    shop.get('title', ''),
                    shop.get('currency_code', ''),
                    shop.get('listing_active_count', 0),
                    datetime.fromtimestamp(shop.get('create_date', 0)).strftime('%Y-%m-%d'),
                    ''
                ]
            }
            
            df = pd.DataFrame(shop_data)
            
            return {
                'success': True,
                'message': 'Shop data imported!',
                'shopId': shop['shop_id'],
                'data': df
            }
            
        except Exception as error:
            return {'success': False, 'message': str(error)}
            
    def import_any_shop_data(self, shop_id: Union[str, int]) -> Dict[str, Any]:
        """Import any public shop's data (importAnyShopData).
        
        Args:
            shop_id: Target shop ID
            
        Returns:
            Status with shop data
        """
        try:
            # Get shop details
            shop = self.api.get_shop(int(shop_id))
            
            # Create DataFrame
            shop_data = {
                'Field': [
                    'Shop Information',
                    'Shop ID',
                    'Shop Name',
                    'Title', 
                    'Currency',
                    'Active Listings',
                    'Created',
                    ''
                ],
                'Value': [
                    '',
                    shop['shop_id'],
                    shop.get('shop_name', ''),
                    shop.get('title', ''),
                    shop.get('currency_code', ''),
                    shop.get('listing_active_count', 0),
                    datetime.fromtimestamp(shop.get('create_date', 0)).strftime('%Y-%m-%d'),
                    ''
                ]
            }
            
            df = pd.DataFrame(shop_data)
            
            return {
                'success': True,
                'message': f"Imported shop: {shop.get('shop_name', 'Unknown')}",
                'data': df
            }
            
        except Exception as error:
            return {'success': False, 'message': str(error)}
            
    def get_status(self) -> Dict[str, Any]:
        """Get current configuration status (getStatus).
        
        Returns:
            Status information
        """
        api_key = self.config.get_api_key()
        tokens = self.config.get_tokens()
        
        return {
            'hasApiKey': bool(api_key),
            'hasClientId': bool(api_key),  # Same as API key for v3
            'isAuthenticated': bool(tokens.get('access_token')),
            'tokenExpires': tokens.get('token_expires'),
            'savedShopId': self.config.get_shop_id()
        }
        
    def clear_auth(self) -> Dict[str, bool]:
        """Clear authentication data (clearAuth).
        
        Returns:
            Success status
        """
        # Clear tokens
        self.config.delete('access_token')
        self.config.delete('refresh_token')
        self.config.delete('token_expires')
        
        logger.info("Cleared authentication")
        return {'success': True}