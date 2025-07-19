"""
Order/Receipt management service.
Handles order imports and tracking.
"""

from typing import Dict, List, Optional, Any
import logging
import pandas as pd
from datetime import datetime
from api.endpoints import EtsyAPI
from services.shop_service import ShopService

logger = logging.getLogger(__name__)


class OrderService:
    """Service for order/receipt management."""
    
    def __init__(self, api: EtsyAPI, shop_service: ShopService):
        """Initialize order service.
        
        Args:
            api: Etsy API instance
            shop_service: Shop service instance
        """
        self.api = api
        self.shop_service = shop_service
        
    def get_shop_receipts(self, shop_id: int, limit: int = 25) -> Dict[str, Any]:
        """Get shop receipts/orders (getShopReceipts).
        
        Args:
            shop_id: Shop identifier
            limit: Max results
            
        Returns:
            Receipts response
        """
        return self.api.get_shop_receipts(shop_id, limit)
        
    def import_orders(self) -> Dict[str, Any]:
        """Import orders to DataFrame (importOrders).
        
        Returns:
            Status with orders DataFrame
        """
        try:
            shop_id = self.shop_service.find_user_shop_id()
            if not shop_id:
                raise Exception("No shops found. Orders require shop ownership.")
                
            receipts = self.get_shop_receipts(shop_id)
            
            # Create DataFrame
            if receipts.get('results'):
                data = []
                for receipt in receipts['results']:
                    # Format shipping address
                    ship_to = ''
                    if receipt.get('formatted_address'):
                        addr = receipt['formatted_address']
                        city = addr.get('city', '')
                        country = addr.get('country_name', '')
                        if city and country:
                            ship_to = f"{city}, {country}"
                        elif country:
                            ship_to = country
                            
                    data.append({
                        'Order ID': receipt['receipt_id'],
                        'Date': datetime.fromtimestamp(
                            receipt.get('created_timestamp', 0)
                        ).strftime('%Y-%m-%d'),
                        'Buyer': receipt.get('name', 'Unknown'),
                        'Total': receipt['grandtotal']['amount'] / receipt['grandtotal']['divisor'],
                        'Status': receipt.get('status', 'Unknown'),
                        'Items': len(receipt.get('transactions', [])),
                        'Ship To': ship_to
                    })
                    
                df = pd.DataFrame(data)
                
                return {
                    'success': True,
                    'message': f"Imported {len(data)} orders!",
                    'data': df
                }
            else:
                return {
                    'success': True,
                    'message': "No orders found",
                    'data': pd.DataFrame()
                }
                
        except Exception as error:
            return {'success': False, 'message': str(error)}
            
    def get_order_details(self, shop_id: int, receipt_id: int) -> Dict[str, Any]:
        """Get detailed order information.
        
        Args:
            shop_id: Shop identifier
            receipt_id: Receipt/Order ID
            
        Returns:
            Detailed receipt data
        """
        return self.api.get_receipt(shop_id, receipt_id)
        
    def add_tracking(self, shop_id: int, receipt_id: int,
                    tracking_code: str, carrier_name: str) -> Dict[str, Any]:
        """Add tracking information to order.
        
        Args:
            shop_id: Shop identifier
            receipt_id: Receipt/Order ID
            tracking_code: Tracking number
            carrier_name: Shipping carrier
            
        Returns:
            Shipment creation result
        """
        try:
            result = self.api.create_receipt_shipment(
                shop_id, receipt_id,
                tracking_code, carrier_name
            )
            
            return {
                'success': True,
                'message': 'Tracking added successfully',
                'shipment': result
            }
            
        except Exception as error:
            return {
                'success': False,
                'message': f"Failed to add tracking: {str(error)}"
            }
            
    def get_order_summary(self, shop_id: int, days: int = 30) -> Dict[str, Any]:
        """Get order summary statistics.
        
        Args:
            shop_id: Shop identifier
            days: Number of days to look back
            
        Returns:
            Summary statistics
        """
        try:
            # Get recent orders
            receipts = self.get_shop_receipts(shop_id, limit=100)
            
            if not receipts.get('results'):
                return {
                    'total_orders': 0,
                    'total_revenue': 0,
                    'average_order': 0,
                    'orders_by_status': {}
                }
                
            # Calculate stats
            total_revenue = 0
            orders_by_status = {}
            
            for receipt in receipts['results']:
                # Add to revenue
                total = receipt['grandtotal']['amount'] / receipt['grandtotal']['divisor']
                total_revenue += total
                
                # Count by status
                status = receipt.get('status', 'Unknown')
                orders_by_status[status] = orders_by_status.get(status, 0) + 1
                
            total_orders = len(receipts['results'])
            average_order = total_revenue / total_orders if total_orders > 0 else 0
            
            return {
                'total_orders': total_orders,
                'total_revenue': round(total_revenue, 2),
                'average_order': round(average_order, 2),
                'orders_by_status': orders_by_status
            }
            
        except Exception as error:
            logger.error(f"Failed to get order summary: {error}")
            return {
                'total_orders': 0,
                'total_revenue': 0,
                'average_order': 0,
                'orders_by_status': {},
                'error': str(error)
            }