"""
Etsy API v3 endpoint implementations.
All API methods matching the Google Apps Script version.
"""

from typing import List, Dict, Optional, Any, Union
import requests
import logging
from api.client import EtsyAPIClient

logger = logging.getLogger(__name__)


class EtsyAPI:
    """High-level API methods for all Etsy operations."""
    
    def __init__(self, client: EtsyAPIClient):
        """Initialize API with client.
        
        Args:
            client: Configured API client
        """
        self.client = client
        
    # ===== User Endpoints =====
    
    def get_current_user(self) -> Dict[str, Any]:
        """Get current authenticated user (getCurrentUser).
        
        Returns:
            User object with user_id, login_name, email, etc.
        """
        return self.client.get('/users/me')
        
    def get_user_shops(self) -> Union[Dict, List]:
        """Get shops owned by current user (getUserShops).
        
        Returns:
            Shop data - either array or single shop object
        """
        try:
            # Try standard endpoint
            result = self.client.get('/users/me/shops')
            return result
        except:
            # Fallback to user object shop_id
            user = self.get_current_user()
            if user.get('shop_id'):
                return {'results': [{'shop_id': user['shop_id']}]}
            return {'results': []}
            
    # ===== Shop Endpoints =====
    
    def get_shop(self, shop_id: int) -> Dict[str, Any]:
        """Get shop details by ID.
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Shop object
        """
        return self.client.get(f'/shops/{shop_id}')
        
    def update_shop(self, shop_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update shop information.
        
        Args:
            shop_id: Shop identifier
            data: Fields to update (title, announcement, etc.)
            
        Returns:
            Updated shop object
        """
        return self.client.put(f'/shops/{shop_id}', data=data)
        
    # ===== Listing Endpoints =====
    
    def get_shop_listings(self, shop_id: int, state: str = 'active', 
                         limit: int = 25, offset: int = 0) -> Dict[str, Any]:
        """Get shop listings (getShopListings).
        
        Args:
            shop_id: Shop identifier
            state: Listing state (active, inactive, draft, expired)
            limit: Results per page (max 100)
            offset: Pagination offset
            
        Returns:
            Paginated listing results
        """
        params = {
            'state': state,
            'limit': limit,
            'offset': offset
        }
        return self.client.get(f'/shops/{shop_id}/listings', params=params)
        
    def get_listing(self, listing_id: int) -> Dict[str, Any]:
        """Get single listing by ID.
        
        Args:
            listing_id: Listing identifier
            
        Returns:
            Listing object
        """
        return self.client.get(f'/listings/{listing_id}')
        
    def create_listing(self, shop_id: int, listing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new listing (createListing).
        
        Args:
            shop_id: Shop identifier
            listing_data: Listing fields (title, description, price, etc.)
            
        Returns:
            Created listing object
        """
        return self.client.post(f'/shops/{shop_id}/listings', data=listing_data)
        
    def update_listing(self, shop_id: int, listing_id: int, 
                      updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update listing (PATCH).
        
        Args:
            shop_id: Shop identifier
            listing_id: Listing identifier
            updates: Fields to update
            
        Returns:
            Updated listing object
        """
        return self.client.patch(f'/shops/{shop_id}/listings/{listing_id}', 
                                data=updates)
        
    def publish_listing(self, shop_id: int, listing_id: int) -> Dict[str, Any]:
        """Publish draft listing (publishListing).
        
        Args:
            shop_id: Shop identifier
            listing_id: Listing identifier
            
        Returns:
            Updated listing object
        """
        return self.update_listing(shop_id, listing_id, {'state': 'active'})
        
    def delete_listing(self, listing_id: int) -> None:
        """Delete listing permanently.
        
        Args:
            listing_id: Listing identifier
        """
        self.client.delete(f'/listings/{listing_id}')
        
    # ===== Inventory Endpoints =====
    
    def get_listing_inventory(self, listing_id: int) -> Dict[str, Any]:
        """Get listing inventory with variations.
        
        Args:
            listing_id: Listing identifier
            
        Returns:
            Inventory object with products and offerings
        """
        return self.client.get(f'/listings/{listing_id}/inventory')
        
    def update_listing_inventory(self, listing_id: int, 
                               inventory_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update listing inventory (updateListing).
        
        IMPORTANT: Price must be a float, not an object!
        
        Args:
            listing_id: Listing identifier
            inventory_data: Complete inventory structure
            
        Returns:
            Updated inventory object
        """
        return self.client.put(f'/listings/{listing_id}/inventory', 
                              json_data=inventory_data)
        
    # ===== Image Endpoints =====
    
    def upload_listing_image(self, shop_id: int, listing_id: int, 
                           image_data: bytes, filename: str = 'image.jpg',
                           rank: int = 1) -> Dict[str, Any]:
        """Upload image to listing.
        
        Args:
            shop_id: Shop identifier
            listing_id: Listing identifier
            image_data: Image bytes
            filename: Image filename
            rank: Display order (1-10)
            
        Returns:
            Image object with URLs
        """
        files = {
            'image': (filename, image_data, 'image/jpeg')
        }
        data = {
            'rank': str(rank)  # Must be string
        }
        
        return self.client.post(
            f'/shops/{shop_id}/listings/{listing_id}/images',
            data=data,
            files=files
        )
        
    def upload_listing_image_from_url(self, shop_id: int, listing_id: int,
                                    image_url: str, rank: int = 1) -> Optional[Dict[str, Any]]:
        """Upload image from URL (uploadImageToListing).
        
        Matches GAS implementation with content-type checking.
        
        Args:
            shop_id: Shop identifier
            listing_id: Listing identifier
            image_url: Image URL to download
            rank: Display order (1-10)
            
        Returns:
            Image object or None if failed
        """
        try:
            # Download image with timeout
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            # Check content type
            content_type = response.headers.get('content-type', '').lower()
            valid_types = ['image/jpeg', 'image/jpg', 'image/png', 
                          'image/gif', 'image/webp', 'image/svg+xml']
            
            # Check known image services
            known_services = ['placeholder.com', 'placehold.it', 'dummyimage.com',
                            'placekitten.com', 'picsum.photos']
            is_known_service = any(service in image_url for service in known_services)
            
            if not any(t in content_type for t in valid_types) and not is_known_service:
                logger.warning(f"Skipping non-image URL: {image_url} (type: {content_type})")
                return None
                
            # Upload to Etsy
            return self.upload_listing_image(
                shop_id, listing_id, 
                response.content,
                f'image_{rank}.jpg',
                rank
            )
            
        except Exception as e:
            logger.error(f"Error uploading image from {image_url}: {e}")
            return None
            
    def delete_listing_image(self, shop_id: int, listing_id: int, 
                           listing_image_id: int) -> None:
        """Delete listing image.
        
        Args:
            shop_id: Shop identifier
            listing_id: Listing identifier
            listing_image_id: Image identifier
        """
        self.client.delete(
            f'/shops/{shop_id}/listings/{listing_id}/images/{listing_image_id}'
        )
        
    # ===== Order/Receipt Endpoints =====
    
    def get_shop_receipts(self, shop_id: int, limit: int = 25, 
                         offset: int = 0) -> Dict[str, Any]:
        """Get shop receipts/orders (getShopReceipts).
        
        Args:
            shop_id: Shop identifier
            limit: Results per page
            offset: Pagination offset
            
        Returns:
            Paginated receipt results
        """
        params = {
            'limit': limit,
            'offset': offset
        }
        return self.client.get(f'/shops/{shop_id}/receipts', params=params)
        
    def get_receipt(self, shop_id: int, receipt_id: int) -> Dict[str, Any]:
        """Get single receipt by ID.
        
        Args:
            shop_id: Shop identifier
            receipt_id: Receipt identifier
            
        Returns:
            Receipt object with transactions
        """
        return self.client.get(f'/shops/{shop_id}/receipts/{receipt_id}')
        
    def create_receipt_shipment(self, shop_id: int, receipt_id: int,
                              tracking_code: str, carrier_name: str,
                              send_bcc: bool = False) -> Dict[str, Any]:
        """Add tracking to fulfill order.
        
        Args:
            shop_id: Shop identifier
            receipt_id: Receipt identifier
            tracking_code: Tracking number
            carrier_name: Shipping carrier
            send_bcc: Send BCC email
            
        Returns:
            Shipment object
        """
        data = {
            'tracking_code': tracking_code,
            'carrier_name': carrier_name,
            'send_bcc': send_bcc
        }
        return self.client.post(
            f'/shops/{shop_id}/receipts/{receipt_id}/tracking',
            json_data=data
        )
        
    # ===== Shipping Profile Endpoints =====
    
    def get_shipping_profiles(self, shop_id: int) -> Dict[str, Any]:
        """Get shop shipping profiles (getShippingProfiles).
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Shipping profiles array
        """
        return self.client.get(f'/shops/{shop_id}/shipping-profiles')
        
    def create_shipping_profile(self, shop_id: int, 
                              profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create shipping profile (createShippingProfile).
        
        Args:
            shop_id: Shop identifier
            profile_data: Profile configuration
            
        Returns:
            Created shipping profile
        """
        # Default values matching GAS implementation
        defaults = {
            'title': 'US Standard Shipping',
            'origin_country_iso': 'US',
            'primary_cost': 5.99,
            'secondary_cost': 2.99,
            'min_processing_time': 1,
            'max_processing_time': 3
        }
        defaults.update(profile_data)
        
        return self.client.post(
            f'/shops/{shop_id}/shipping-profiles',
            json_data=defaults
        )
        
    def update_shipping_profile(self, shop_id: int, shipping_profile_id: int,
                              updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update shipping profile.
        
        Args:
            shop_id: Shop identifier
            shipping_profile_id: Profile identifier
            updates: Fields to update
            
        Returns:
            Updated shipping profile
        """
        return self.client.put(
            f'/shops/{shop_id}/shipping-profiles/{shipping_profile_id}',
            json_data=updates
        )
        
    def delete_shipping_profile(self, shop_id: int, 
                              shipping_profile_id: int) -> None:
        """Delete shipping profile.
        
        Args:
            shop_id: Shop identifier
            shipping_profile_id: Profile identifier
        """
        self.client.delete(
            f'/shops/{shop_id}/shipping-profiles/{shipping_profile_id}'
        )
        
    # ===== Return Policy Endpoints =====
    
    def get_return_policies(self, shop_id: int) -> Dict[str, Any]:
        """Get shop return policies (getReturnPolicies).
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Return policies array
        """
        return self.client.get(f'/shops/{shop_id}/policies/return')
        
    def create_return_policy(self, shop_id: int, 
                           policy_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create return policy (createReturnPolicy).
        
        Args:
            shop_id: Shop identifier
            policy_data: Policy configuration
            
        Returns:
            Created return policy
        """
        # Default values matching GAS implementation
        defaults = {
            'accepts_returns': True,
            'accepts_exchanges': True,
            'return_deadline': 30  # days
        }
        
        if policy_data:
            defaults.update(policy_data)
            
        return self.client.post(
            f'/shops/{shop_id}/policies/return',
            json_data=defaults
        )
        
    # ===== Utility Endpoints =====
    
    def ping(self) -> Dict[str, Any]:
        """Test API connectivity (public endpoint).
        
        Returns:
            Ping response
        """
        # This endpoint only needs API key, not OAuth
        response = requests.get(
            'https://api.etsy.com/v3/application/openapi-ping',
            headers={'x-api-key': self.client.api_key}
        )
        response.raise_for_status()
        return response.json()
        
    def get_seller_taxonomy_nodes(self) -> Dict[str, Any]:
        """Get seller taxonomy for categories.
        
        Returns:
            Taxonomy tree
        """
        return self.client.get('/seller-taxonomy/nodes')
        
    def get_buyer_taxonomy_nodes(self) -> Dict[str, Any]:
        """Get buyer taxonomy for categories.
        
        Returns:
            Taxonomy tree
        """
        return self.client.get('/buyer-taxonomy/nodes')
        
    def search_listings(self, keywords: str, limit: int = 25, 
                       offset: int = 0, **filters) -> Dict[str, Any]:
        """Search marketplace listings.
        
        Args:
            keywords: Search terms
            limit: Results per page
            offset: Pagination offset
            **filters: Additional filters (min_price, max_price, etc.)
            
        Returns:
            Search results
        """
        params = {
            'keywords': keywords,
            'limit': limit,
            'offset': offset
        }
        params.update(filters)
        
        return self.client.get('/listings', params=params)