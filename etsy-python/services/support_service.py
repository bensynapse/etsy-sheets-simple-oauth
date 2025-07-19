"""
Support service for shipping profiles and return policies.
Implements support functions from GAS version.
"""

from typing import Dict, List, Optional, Any
import logging
from api.endpoints import EtsyAPI

logger = logging.getLogger(__name__)


class SupportService:
    """Service for shipping profiles and return policies."""
    
    def __init__(self, api: EtsyAPI):
        """Initialize support service.
        
        Args:
            api: Etsy API instance
        """
        self.api = api
        
    def get_shipping_profiles(self, shop_id: int) -> Dict[str, Any]:
        """Get shop shipping profiles (getShippingProfiles).
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Shipping profiles response
        """
        return self.api.get_shipping_profiles(shop_id)
        
    def create_shipping_profile(self, shop_id: int, 
                              profile_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create shipping profile (createShippingProfile).
        
        Matches GAS implementation defaults.
        
        Args:
            shop_id: Shop identifier
            profile_data: Optional profile configuration
            
        Returns:
            Created shipping profile
        """
        # Default values from GAS implementation
        defaults = {
            'title': 'US Standard Shipping',
            'origin_country_iso': 'US',
            'primary_cost': 5.99,
            'secondary_cost': 2.99,
            'min_processing_time': 1,
            'max_processing_time': 3,
            'shipping_carrier_id': 0,
            'mail_class': None,
            'min_delivery_days': 3,
            'max_delivery_days': 7
        }
        
        if profile_data:
            defaults.update(profile_data)
            
        logger.info(f"Creating shipping profile: {defaults['title']}")
        
        return self.api.create_shipping_profile(shop_id, defaults)
        
    def test_shipping_profiles(self, shop_id: int) -> Dict[str, Any]:
        """Test shipping profiles functionality (testShippingProfiles).
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Test results
        """
        try:
            # Get existing profiles
            profiles = self.get_shipping_profiles(shop_id)
            logger.info(f"Found {profiles.get('count', 0)} shipping profiles")
            
            # Create test profile if none exist
            if not profiles.get('results'):
                logger.info("Creating test shipping profile...")
                new_profile = self.create_shipping_profile(shop_id, {
                    'title': 'Test Shipping Profile'
                })
                return {
                    'success': True,
                    'message': 'Created test shipping profile',
                    'profile': new_profile
                }
            else:
                return {
                    'success': True,
                    'message': f"Found {len(profiles['results'])} existing profiles",
                    'profiles': profiles['results']
                }
                
        except Exception as error:
            logger.error(f"Shipping profile test failed: {error}")
            return {
                'success': False,
                'error': str(error)
            }
            
    def get_return_policies(self, shop_id: int) -> Dict[str, Any]:
        """Get shop return policies (getReturnPolicies).
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Return policies response
        """
        return self.api.get_return_policies(shop_id)
        
    def create_return_policy(self, shop_id: int,
                           policy_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create return policy (createReturnPolicy).
        
        Matches GAS implementation defaults.
        
        Args:
            shop_id: Shop identifier
            policy_data: Optional policy configuration
            
        Returns:
            Created return policy
        """
        # Default values from GAS implementation
        defaults = {
            'accepts_returns': True,
            'accepts_exchanges': True,
            'return_deadline': 30  # 30 days
        }
        
        if policy_data:
            defaults.update(policy_data)
            
        logger.info(f"Creating return policy: {defaults['return_deadline']} days")
        
        return self.api.create_return_policy(shop_id, defaults)
        
    def test_return_policies(self, shop_id: int) -> Dict[str, Any]:
        """Test return policies functionality (testReturnPolicies).
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Test results
        """
        try:
            # Get existing policies
            policies = self.get_return_policies(shop_id)
            logger.info(f"Found {policies.get('count', 0)} return policies")
            
            # Create test policy if none exist
            if not policies.get('results'):
                logger.info("Creating test return policy...")
                new_policy = self.create_return_policy(shop_id, {
                    'return_deadline': 14  # 14 days for test
                })
                return {
                    'success': True,
                    'message': 'Created test return policy',
                    'policy': new_policy
                }
            else:
                return {
                    'success': True,
                    'message': f"Found {len(policies['results'])} existing policies",
                    'policies': policies['results']
                }
                
        except Exception as error:
            logger.error(f"Return policy test failed: {error}")
            return {
                'success': False,
                'error': str(error)
            }
            
    def ensure_required_policies(self, shop_id: int) -> Dict[str, int]:
        """Ensure both shipping profile and return policy exist.
        
        Creates defaults if missing.
        
        Args:
            shop_id: Shop identifier
            
        Returns:
            Dictionary with shipping_profile_id and return_policy_id
        """
        # Check shipping profiles
        shipping_profiles = self.get_shipping_profiles(shop_id)
        if shipping_profiles.get('results'):
            shipping_profile_id = shipping_profiles['results'][0]['shipping_profile_id']
        else:
            new_profile = self.create_shipping_profile(shop_id)
            shipping_profile_id = new_profile['shipping_profile_id']
            
        # Check return policies
        return_policies = self.get_return_policies(shop_id)
        if return_policies.get('results'):
            return_policy_id = return_policies['results'][0]['return_policy_id']
        else:
            new_policy = self.create_return_policy(shop_id)
            return_policy_id = new_policy['return_policy_id']
            
        return {
            'shipping_profile_id': shipping_profile_id,
            'return_policy_id': return_policy_id
        }
        
    def get_shipping_carriers(self, origin_country_iso: str) -> List[Dict[str, Any]]:
        """Get available shipping carriers for country.
        
        Args:
            origin_country_iso: 2-letter country code
            
        Returns:
            List of carrier options
        """
        # This would need to be implemented if the API provides it
        # For now, return common carriers
        carriers = {
            'US': [
                {'id': 1, 'name': 'USPS'},
                {'id': 2, 'name': 'FedEx'},
                {'id': 3, 'name': 'UPS'},
                {'id': 4, 'name': 'DHL'},
                {'id': 5, 'name': 'Other'}
            ],
            'CA': [
                {'id': 6, 'name': 'Canada Post'},
                {'id': 2, 'name': 'FedEx'},
                {'id': 3, 'name': 'UPS'},
                {'id': 5, 'name': 'Other'}
            ],
            'GB': [
                {'id': 7, 'name': 'Royal Mail'},
                {'id': 2, 'name': 'FedEx'},
                {'id': 3, 'name': 'UPS'},
                {'id': 4, 'name': 'DHL'},
                {'id': 5, 'name': 'Other'}
            ]
        }
        
        return carriers.get(origin_country_iso, [
            {'id': 5, 'name': 'Other'}
        ])