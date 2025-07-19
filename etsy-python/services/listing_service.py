"""
Listing management service.
Implements all listing-related functions from GAS version.
"""

from typing import Dict, List, Optional, Any, Union
import logging
import pandas as pd
from datetime import datetime
from api.endpoints import EtsyAPI
from services.shop_service import ShopService

logger = logging.getLogger(__name__)


class ListingService:
    """Service for listing management operations."""
    
    def __init__(self, api: EtsyAPI, shop_service: ShopService):
        """Initialize listing service.
        
        Args:
            api: Etsy API instance
            shop_service: Shop service instance
        """
        self.api = api
        self.shop_service = shop_service
        
    def get_shop_listings(self, shop_id: int, state: str = 'active', 
                         limit: int = 25) -> Dict[str, Any]:
        """Get shop listings (getShopListings).
        
        Args:
            shop_id: Shop identifier
            state: Listing state
            limit: Max results
            
        Returns:
            Listings response
        """
        return self.api.get_shop_listings(shop_id, state, limit)
        
    def import_listings(self) -> Dict[str, Any]:
        """Import listings to DataFrame (importListings).
        
        Returns:
            Status with listings DataFrame
        """
        try:
            shop_id = self.shop_service.find_user_shop_id()
            if not shop_id:
                raise Exception("No shops found. Please use 'Import Any Shop' feature instead.")
                
            # Get ALL listings by paginating through results
            all_listings = []
            offset = 0
            limit = 100  # Max allowed by API
            
            while True:
                response = self.api.get_shop_listings(shop_id, state='active', limit=limit, offset=offset)
                if response.get('results'):
                    all_listings.extend(response['results'])
                    if len(response['results']) < limit:
                        # No more pages
                        break
                    offset += limit
                else:
                    break
                    
            # Create DataFrame
            if all_listings:
                data = []
                for listing in all_listings:
                    # Extract SKU from inventory endpoint
                    sku = ''
                    try:
                        inventory = self.api.get_listing_inventory(listing['listing_id'])
                        
                        if inventory and 'products' in inventory:
                            # Get SKU from products array
                            products = inventory['products']
                            for product in products:
                                # Get SKU - it's valid to have empty string SKUs in Etsy
                                if 'sku' in product:
                                    # Extract whatever value is there, even if empty
                                    sku = str(product['sku']) if product['sku'] is not None else ''
                                    break
                        else:
                            logger.warning(f"No inventory products found for listing {listing['listing_id']}")
                    except Exception as e:
                        # Log error but continue processing
                        logger.error(f"Error fetching SKU for listing {listing['listing_id']}: {e}")
                    
                    data.append({
                        'Listing ID': listing['listing_id'],
                        'Title': listing['title'],
                        'Price': listing['price']['amount'] / listing['price']['divisor'],
                        'Quantity': listing['quantity'],
                        'Status': listing['state'],
                        'SKU': sku,
                        'Views': listing.get('views', 0),
                        'Created': datetime.fromtimestamp(
                            listing.get('created_timestamp', 0)
                        ).strftime('%Y-%m-%d')
                    })
                    
                df = pd.DataFrame(data)
                
                # Log summary
                non_empty_skus = df[df['SKU'] != '']['SKU'].count()
                logger.info(f"Imported {len(df)} listings, {non_empty_skus} have SKUs")
                
                return {
                    'success': True,
                    'message': f"Imported {len(data)} listings!",
                    'data': df
                }
            else:
                return {
                    'success': True,
                    'message': "No listings found",
                    'data': pd.DataFrame()
                }
                
        except Exception as error:
            return {'success': False, 'message': str(error)}
            
    def create_listing(self, shop_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new listing (createListing).
        
        Args:
            shop_id: Shop identifier
            data: Listing data
            
        Returns:
            Created listing
        """
        # Convert arrays to proper format if needed
        if 'sku' in data and isinstance(data['sku'], str):
            data['sku'] = [data['sku']]
            
        logger.info(f"Creating listing with data: {data}")
        
        listing = self.api.create_listing(shop_id, data)
        
        logger.info(f"Created listing {listing['listing_id']}")
        
        # If SKU was provided, update it via inventory (Etsy doesn't set it during creation)
        if 'sku' in data and data['sku']:
            try:
                sku_value = data['sku'][0] if isinstance(data['sku'], list) else data['sku']
                if sku_value:
                    logger.info(f"Setting SKU '{sku_value}' via inventory update...")
                    inventory = self.api.get_listing_inventory(listing['listing_id'])
                    
                    # Update SKU in first product
                    if inventory and 'products' in inventory and inventory['products']:
                        inventory['products'][0]['sku'] = sku_value
                        
                        # Prepare minimal update data - only SKU and required fields
                        # Build offerings with minimal fields
                        offerings = []
                        for offering in inventory['products'][0]['offerings']:
                            price_value = float(offering['price']['amount']) / float(offering['price']['divisor'])
                            offerings.append({
                                'quantity': int(offering.get('quantity', 0)),
                                'is_enabled': bool(offering.get('is_enabled', True)),
                                'price': price_value
                            })
                        
                        update_data = {
                            'products': [{
                                'sku': str(sku_value),
                                'offerings': offerings,
                                'property_values': []  # Empty array if no variations
                            }],
                            'price_on_property': [],
                            'quantity_on_property': [],
                            'sku_on_property': []
                        }
                        
                        self.api.update_listing_inventory(listing['listing_id'], update_data)
                        logger.info(f"SKU '{sku_value}' set successfully")
            except Exception as e:
                logger.warning(f"Could not set SKU: {e}")
        
        return listing
        
    def publish_listing(self, shop_id: int, listing_id: int) -> Dict[str, Any]:
        """Publish draft listing (publishListing).
        
        Args:
            shop_id: Shop identifier
            listing_id: Listing identifier
            
        Returns:
            Updated listing
        """
        logger.info(f"Publishing listing {listing_id}")
        
        return self.api.publish_listing(shop_id, listing_id)
        
    def update_listing(self, shop_id: int, listing_id: int, 
                      updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update listing inventory (updateListing).
        
        Uses inventory endpoint for price/quantity updates.
        
        Args:
            shop_id: Shop identifier  
            listing_id: Listing identifier
            updates: Fields to update (price, quantity)
            
        Returns:
            Update result
        """
        try:
            # Get current inventory
            inventory = self.api.get_listing_inventory(listing_id)
            
            # Update offerings with new values
            if inventory.get('products'):
                for product in inventory['products']:
                    if product.get('offerings'):
                        for offering in product['offerings']:
                            if 'quantity' in updates:
                                # Convert numpy int64 to regular int
                                offering['quantity'] = int(updates['quantity'])
                            if 'price' in updates:
                                # IMPORTANT: Price must be float, not object
                                # Convert numpy float64 to regular float
                                offering['price'] = float(updates['price'])
                                
            # Clean inventory for update
            cleaned_inventory = self._clean_inventory_for_update(inventory)
            
            logger.info(f"Updating listing {listing_id} inventory")
            
            # Update inventory
            result = self.api.update_listing_inventory(listing_id, cleaned_inventory)
            
            return {'success': True, 'data': result}
            
        except Exception as error:
            logger.error(f"Error updating listing: {error}")
            return {'success': False, 'error': str(error)}
            
    def _clean_inventory_for_update(self, inventory: Dict[str, Any]) -> Dict[str, Any]:
        """Clean inventory data for update request.
        
        Removes read-only fields and ensures proper structure.
        
        Args:
            inventory: Raw inventory data
            
        Returns:
            Cleaned inventory
        """
        cleaned = {
            'products': [],
            'price_on_property': inventory.get('price_on_property', []),
            'quantity_on_property': inventory.get('quantity_on_property', []),
            'sku_on_property': inventory.get('sku_on_property', [])
        }
        
        for product in inventory.get('products', []):
            cleaned_product = {
                'sku': product.get('sku', ''),
                'property_values': product.get('property_values', [])
            }
            
            # Clean offerings
            if product.get('offerings'):
                cleaned_product['offerings'] = []
                for offering in product['offerings']:
                    cleaned_offering = {
                        'quantity': offering['quantity'],
                        'is_enabled': offering.get('is_enabled', True),
                        'price': offering['price']  # Already a float
                    }
                    # Don't include offering_id (read-only)
                    cleaned_product['offerings'].append(cleaned_offering)
                    
            cleaned['products'].append(cleaned_product)
            
        return cleaned
        
    def delete_listing(self, listing_id: int) -> None:
        """Delete listing permanently.
        
        Args:
            listing_id: Listing identifier
        """
        logger.info(f"Deleting listing {listing_id}")
        try:
            result = self.api.delete_listing(listing_id)
            logger.info(f"Successfully deleted listing {listing_id}")
            return result
        except Exception as e:
            logger.error(f"Failed to delete listing {listing_id}: {str(e)}")
            raise
        
    def get_listing_progress(self, df: pd.DataFrame) -> Dict[str, int]:
        """Get upload progress from DataFrame (getUploadProgress).
        
        Args:
            df: Product upload DataFrame
            
        Returns:
            Progress statistics
        """
        if df.empty or 'Status' not in df.columns:
            return {'total': 0, 'completed': 0, 'failed': 0, 'processing': 0}
            
        # Filter out instruction rows
        df_filtered = df[
            ~df['Title*'].str.startswith('INSTRUCTIONS', na=False) &
            df['Title*'].notna()
        ]
        
        status_counts = df_filtered['Status'].value_counts()
        
        return {
            'total': len(df_filtered),
            'completed': status_counts.get('✓ Published', 0) + status_counts.get('✓ Draft (no images)', 0),
            'failed': status_counts.get('✗ Failed', 0),
            'processing': df_filtered['Status'].notna().sum() - 
                         status_counts.get('✓ Published', 0) - 
                         status_counts.get('✓ Draft (no images)', 0) -
                         status_counts.get('✗ Failed', 0)
        }