"""
Product upload service.
Handles bulk uploads, images, and inventory updates.
"""

from typing import Dict, List, Optional, Any, Tuple
import logging
import pandas as pd
import time
from api.endpoints import EtsyAPI
from services.shop_service import ShopService
from services.listing_service import ListingService
from services.support_service import SupportService

logger = logging.getLogger(__name__)


class UploadService:
    """Service for product upload operations."""
    
    def __init__(self, api: EtsyAPI, shop_service: ShopService,
                 listing_service: ListingService, support_service: SupportService):
        """Initialize upload service.
        
        Args:
            api: Etsy API instance
            shop_service: Shop service instance
            listing_service: Listing service instance
            support_service: Support service instance
        """
        self.api = api
        self.shop_service = shop_service
        self.listing_service = listing_service
        self.support_service = support_service
        
    def upload_products(self, df: pd.DataFrame, 
                       progress_callback: Optional[callable] = None) -> Dict[str, Any]:
        """Upload products from DataFrame (uploadProducts).
        
        Args:
            df: Product DataFrame
            progress_callback: Function to call with progress updates
            
        Returns:
            Upload results
        """
        try:
            shop_id = self.shop_service.find_user_shop_id()
            if not shop_id:
                raise Exception("Shop not found. Please import shop data first.")
                
            # Filter valid products
            products = self._filter_valid_products(df)
            
            if len(products) == 0:
                raise Exception("No products found to upload")
                
            # Ensure shipping profile exists
            shipping_profile_id = self._ensure_shipping_profile(shop_id)
            
            # Ensure return policy exists
            return_policy_id = self._ensure_return_policy(shop_id)
            
            results = []
            
            for idx, (_, product) in enumerate(products.iterrows()):
                try:
                    # Update progress
                    if progress_callback:
                        progress_callback(idx, len(products), f"Uploading {product['Title*']}")
                        
                    # Create listing
                    listing_data = self._prepare_listing_data(
                        product, shipping_profile_id, return_policy_id
                    )
                    listing = self.listing_service.create_listing(shop_id, listing_data)
                    
                    # Upload images
                    images_uploaded = 0
                    if pd.notna(product.get('Image URLs (comma separated)')):
                        if progress_callback:
                            progress_callback(idx, len(products), "Uploading images...")
                            
                        images_uploaded = self._upload_images(
                            shop_id, listing['listing_id'], 
                            product['Image URLs (comma separated)']
                        )
                        
                    # Publish if images uploaded
                    if images_uploaded > 0:
                        if progress_callback:
                            progress_callback(idx, len(products), "Publishing...")
                            
                        self.listing_service.publish_listing(shop_id, listing['listing_id'])
                        status = '✓ Published'
                    else:
                        status = '✓ Draft (no images)'
                        
                    results.append({
                        'success': True,
                        'title': product['Title*'],
                        'listing_id': listing['listing_id'],
                        'price': float(product['Price*']),
                        'quantity': int(product['Quantity*']),
                        'sku': product.get('SKU', ''),
                        'description': product['Description*'][:100] + '...' if len(product['Description*']) > 100 else product['Description*'],
                        'tags': product.get('Tags (comma separated)', ''),
                        'materials': product.get('Materials (comma separated)', ''),
                        'images_uploaded': images_uploaded,
                        'status': status,
                        'delete': False  # For marking deletion
                    })
                    
                except Exception as error:
                    logger.error(f"Failed to upload {product['Title*']}: {error}")
                    results.append({
                        'success': False,
                        'title': product['Title*'],
                        'error': str(error),
                        'status': '✗ Failed'
                    })
                    
                # Rate limiting
                time.sleep(1)
                
            return {
                'success': True,
                'total': len(products),
                'successful': sum(1 for r in results if r['success']),
                'failed': sum(1 for r in results if not r['success']),
                'results': results
            }
            
        except Exception as error:
            return {'success': False, 'message': str(error)}
            
    def _filter_valid_products(self, df: pd.DataFrame) -> pd.DataFrame:
        """Filter out instruction rows and invalid products.
        
        Args:
            df: Raw DataFrame
            
        Returns:
            Filtered DataFrame
        """
        # Filter conditions
        valid = (
            df['Title*'].notna() &
            ~df['Title*'].str.startswith('INSTRUCTIONS', na=False) &
            ~df['Title*'].str.startswith('Who Made', na=False) &
            ~df['Title*'].str.startswith('When Made', na=False) &
            ~df['Title*'].str.contains('Delete example', na=False)
        )
        
        return df[valid].copy()
        
    def _ensure_shipping_profile(self, shop_id: int) -> int:
        """Ensure shipping profile exists.
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Shipping profile ID
        """
        profiles = self.support_service.get_shipping_profiles(shop_id)
        
        if profiles.get('results') and len(profiles['results']) > 0:
            profile_id = profiles['results'][0]['shipping_profile_id']
            logger.info(f"Using shipping profile ID: {profile_id}")
            return profile_id
        else:
            logger.info("No shipping profiles found! Creating one...")
            new_profile = self.support_service.create_shipping_profile(shop_id)
            logger.info(f"Created shipping profile ID: {new_profile['shipping_profile_id']}")
            return new_profile['shipping_profile_id']
            
    def _ensure_return_policy(self, shop_id: int) -> int:
        """Ensure return policy exists.
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Return policy ID
        """
        policies = self.support_service.get_return_policies(shop_id)
        
        if policies.get('results') and len(policies['results']) > 0:
            policy_id = policies['results'][0]['return_policy_id']
            logger.info(f"Using return policy ID: {policy_id}")
            return policy_id
        else:
            logger.info("No return policies found! Creating one...")
            new_policy = self.support_service.create_return_policy(shop_id)
            logger.info(f"Created return policy ID: {new_policy['return_policy_id']}")
            return new_policy['return_policy_id']
            
    def _prepare_listing_data(self, product: pd.Series, 
                            shipping_profile_id: int,
                            return_policy_id: int) -> Dict[str, Any]:
        """Prepare listing data from product row.
        
        Args:
            product: Product data
            shipping_profile_id: Shipping profile to use
            return_policy_id: Return policy to use
            
        Returns:
            Listing data dict
        """
        listing_data = {
            'quantity': int(product['Quantity*']),
            'title': product['Title*'],
            'description': product['Description*'],
            'price': float(product['Price*']),
            'who_made': product['Who Made*'],
            'when_made': product['When Made*'],
            'taxonomy_id': int(product['Taxonomy ID*']),
            'state': 'draft',
            'shipping_profile_id': shipping_profile_id,
            'return_policy_id': return_policy_id
        }
        
        # Add optional fields
        if pd.notna(product.get('SKU')):
            listing_data['sku'] = [str(product['SKU'])]
            
        if pd.notna(product.get('Tags (comma separated)')):
            tags = [t.strip() for t in str(product['Tags (comma separated)']).split(',')]
            listing_data['tags'] = tags[:13]  # Max 13 tags
            
        if pd.notna(product.get('Materials (comma separated)')):
            materials = [m.strip() for m in str(product['Materials (comma separated)']).split(',')]
            listing_data['materials'] = materials[:13]  # Max 13 materials
            
        return listing_data
        
    def _upload_images(self, shop_id: int, listing_id: int, image_urls_str: str) -> int:
        """Upload images from URLs.
        
        Args:
            shop_id: Shop identifier
            listing_id: Listing identifier
            image_urls_str: Comma-separated image URLs
            
        Returns:
            Number of images uploaded
        """
        image_urls = [url.strip() for url in str(image_urls_str).split(',') if url.strip()]
        uploaded = 0
        
        for idx, url in enumerate(image_urls[:10]):  # Max 10 images
            result = self.api.upload_listing_image_from_url(
                shop_id, listing_id, url, rank=idx + 1
            )
            if result:
                uploaded += 1
            time.sleep(0.5)  # Rate limit for image uploads
            
        logger.info(f"Uploaded {uploaded} of {len(image_urls)} images for listing {listing_id}")
        return uploaded
        
    def update_inventory_and_price(self, df: pd.DataFrame,
                                 progress_callback: Optional[callable] = None) -> Dict[str, Any]:
        """Update inventory and prices from DataFrame (updateInventoryAndPrice).
        
        Args:
            df: Product DataFrame with updates
            progress_callback: Progress callback function
            
        Returns:
            Update results
        """
        try:
            shop_id = self.shop_service.find_user_shop_id()
            if not shop_id:
                raise Exception("Shop not found. Please import shop data first.")
                
            updated = 0
            failed = 0
            skipped = 0
            
            # Process each row
            for idx, (_, row) in enumerate(df.iterrows()):
                # Skip invalid rows
                if pd.isna(row.get('Title*')) or \
                   str(row.get('Title*', '')).startswith('INSTRUCTIONS'):
                    continue
                    
                # Extract listing ID from Result column
                result_text = str(row.get('Result', ''))
                if 'ID:' not in result_text:
                    skipped += 1
                    continue
                    
                listing_id = result_text.split('ID:')[1].split()[0].strip()
                
                try:
                    price = float(row['Price*'])
                    quantity = int(row['Quantity*'])
                    
                    if progress_callback:
                        progress_callback(idx, len(df), f"Updating listing {listing_id}")
                        
                    result = self.listing_service.update_listing(
                        shop_id, listing_id,
                        {'price': price, 'quantity': quantity}
                    )
                    
                    if result['success']:
                        updated += 1
                    else:
                        failed += 1
                        
                except Exception as e:
                    logger.error(f"Failed to update listing {listing_id}: {e}")
                    failed += 1
                    
                # Rate limiting
                time.sleep(0.5)
                
            return {
                'success': True,
                'message': f"Update complete: {updated} updated, {failed} failed, {skipped} skipped",
                'updated': updated,
                'failed': failed,
                'skipped': skipped
            }
            
        except Exception as error:
            return {'success': False, 'message': str(error)}
            
    def delete_marked_listings(self, df: pd.DataFrame,
                             progress_callback: Optional[callable] = None) -> Dict[str, Any]:
        """Delete listings marked for deletion (deleteMarkedListings).
        
        Args:
            df: Product DataFrame
            progress_callback: Progress callback function
            
        Returns:
            Deletion results
        """
        try:
            shop_id = self.shop_service.find_user_shop_id()
            if not shop_id:
                raise Exception("Shop not found. Please import shop data first.")
                
            deleted = 0
            failed = 0
            skipped = 0
            
            for idx, (_, row) in enumerate(df.iterrows()):
                # Skip invalid rows
                if pd.isna(row.get('Title*')) or \
                   str(row.get('Title*', '')).startswith('INSTRUCTIONS'):
                    continue
                    
                # Check if marked for deletion
                delete_marker = str(row.get('Delete?', '')).strip().upper()
                if delete_marker != 'X':
                    skipped += 1
                    continue
                    
                # Extract listing ID
                result_text = str(row.get('Result', ''))
                if 'ID:' not in result_text:
                    skipped += 1
                    continue
                    
                listing_id = result_text.split('ID:')[1].split()[0].strip()
                
                if progress_callback:
                    progress_callback(idx, len(df), f"Deleting listing {listing_id}")
                    
                try:
                    self.listing_service.delete_listing(int(listing_id))
                    deleted += 1
                except Exception as e:
                    logger.error(f"Failed to delete listing {listing_id}: {e}")
                    failed += 1
                    
                # Rate limiting
                time.sleep(0.5)
                
            return {
                'success': True,
                'message': f"Delete complete: {deleted} deleted, {failed} failed, {skipped} not marked for deletion",
                'deleted': deleted,
                'failed': failed,
                'skipped': skipped
            }
            
        except Exception as error:
            return {'success': False, 'message': str(error)}