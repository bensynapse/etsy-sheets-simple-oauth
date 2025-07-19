"""
Data models for Etsy API responses.
Provides type hints and structure documentation.
"""

from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Price:
    """Price representation in Etsy API."""
    amount: int
    divisor: int
    currency_code: str
    
    @property
    def value(self) -> float:
        """Get price as float value."""
        return self.amount / self.divisor
        
    @classmethod
    def from_float(cls, value: float, currency: str = 'USD') -> 'Price':
        """Create Price from float value."""
        return cls(
            amount=int(value * 100),
            divisor=100,
            currency_code=currency
        )


@dataclass
class User:
    """User object from API."""
    user_id: int
    login_name: Optional[str] = None
    primary_email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_seller: bool = False
    shop_id: Optional[int] = None
    birth_month: Optional[int] = None
    birth_day: Optional[int] = None
    transaction_buy_count: int = 0
    transaction_sold_count: int = 0


@dataclass
class Shop:
    """Shop object from API."""
    shop_id: int
    shop_name: str
    user_id: int
    title: Optional[str] = None
    announcement: Optional[str] = None
    currency_code: str = 'USD'
    language: str = 'en-US'
    listing_active_count: int = 0
    digital_listing_count: int = 0
    create_date: Optional[int] = None
    create_date_formatted: Optional[str] = None
    update_date: Optional[int] = None
    update_date_formatted: Optional[str] = None
    

@dataclass
class Listing:
    """Listing object from API."""
    listing_id: int
    state: str
    user_id: int
    title: str
    description: str
    price: Dict[str, Any]
    quantity: int
    url: Optional[str] = None
    num_favorers: int = 0
    is_taxable: bool = True
    is_customizable: bool = False
    is_personalizable: bool = False
    personalization_is_required: bool = False
    personalization_char_count_max: Optional[int] = None
    personalization_instructions: Optional[str] = None
    listing_type: str = 'physical'
    tags: List[str] = field(default_factory=list)
    materials: List[str] = field(default_factory=list)
    shop_section_id: Optional[int] = None
    featured_rank: int = -1
    views: int = 0
    skus: List[str] = field(default_factory=list)
    has_variations: bool = False
    shipping_profile_id: Optional[int] = None
    return_policy_id: Optional[int] = None
    processing_min: Optional[int] = None
    processing_max: Optional[int] = None
    who_made: Optional[str] = None
    when_made: Optional[str] = None
    is_supply: bool = False
    item_weight: Optional[float] = None
    item_weight_unit: Optional[str] = None
    item_length: Optional[float] = None
    item_width: Optional[float] = None
    item_height: Optional[float] = None
    item_dimensions_unit: Optional[str] = None
    taxonomy_id: Optional[int] = None
    style: List[str] = field(default_factory=list)
    file_data: Optional[str] = None
    language: str = 'en-US'
    created_timestamp: Optional[int] = None
    updated_timestamp: Optional[int] = None
    state_timestamp: Optional[int] = None
    

@dataclass
class InventoryProduct:
    """Product in inventory structure."""
    product_id: Optional[int] = None
    sku: str = ''
    offerings: List[Dict[str, Any]] = field(default_factory=list)
    property_values: List[Dict[str, Any]] = field(default_factory=list)


@dataclass 
class InventoryOffering:
    """Offering within a product."""
    offering_id: Optional[int] = None
    price: Union[float, Dict[str, Any]] = 0.0  # Float for updates, dict for reads
    quantity: int = 0
    is_enabled: bool = True


@dataclass
class Receipt:
    """Order/Receipt object from API."""
    receipt_id: int
    receipt_type: int
    seller_user_id: int
    seller_email: Optional[str] = None
    buyer_user_id: int
    buyer_email: Optional[str] = None
    name: str
    status: str
    is_shipped: bool = False
    created_timestamp: int
    updated_timestamp: int
    is_paid: bool = True
    is_dead: bool = False
    discount_amt: Optional[Dict[str, Any]] = None
    grandtotal: Dict[str, Any] = field(default_factory=dict)
    subtotal: Dict[str, Any] = field(default_factory=dict)
    total_price: Dict[str, Any] = field(default_factory=dict)
    total_shipping_cost: Dict[str, Any] = field(default_factory=dict)
    total_tax_cost: Dict[str, Any] = field(default_factory=dict)
    total_vat_cost: Dict[str, Any] = field(default_factory=dict)
    transactions: List[Dict[str, Any]] = field(default_factory=list)
    message_from_buyer: Optional[str] = None
    message_from_seller: Optional[str] = None
    is_gift: bool = False
    gift_message: Optional[str] = None
    

@dataclass
class ShippingProfile:
    """Shipping profile object."""
    shipping_profile_id: int
    title: str
    user_id: int
    min_processing_days: int
    max_processing_days: int
    processing_days_display_label: str
    origin_country_iso: str
    origin_postal_code: Optional[str] = None
    profile_type: str = 'manual'
    domestic_handling_fee: float = 0.0
    international_handling_fee: float = 0.0
    

@dataclass
class ReturnPolicy:
    """Return policy object."""
    return_policy_id: int
    accepts_returns: bool
    accepts_exchanges: bool
    return_deadline: Optional[int] = None


class ListingImage:
    """Listing image object."""
    listing_image_id: int
    listing_id: int
    rank: int
    url_75x75: str
    url_170x135: str 
    url_570xN: str
    url_fullxfull: str
    full_height: Optional[int] = None
    full_width: Optional[int] = None
    alt_text: Optional[str] = None
    

# Enums as constants (matching GAS implementation)

class ListingState:
    """Listing state values."""
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    DRAFT = 'draft'
    EXPIRED = 'expired'
    SOLD_OUT = 'sold_out'
    

class WhoMade:
    """Who made enum values."""
    I_DID = 'i_did'
    SOMEONE_ELSE = 'someone_else'
    COLLECTIVE = 'collective'
    

class WhenMade:
    """When made enum values."""
    MADE_TO_ORDER = 'made_to_order'
    YEAR_2020_2025 = '2020_2025'
    YEAR_2020_2024 = '2020_2024'  # Alternate
    YEAR_2010_2019 = '2010_2019'
    YEAR_2006_2009 = '2006_2009' 
    YEAR_2005 = '2005'
    BEFORE_2005 = 'before_2005'
    YEAR_2000_2004 = '2000_2004'
    YEAR_1990S = '1990s'
    YEAR_1980S = '1980s'
    YEAR_1970S = '1970s'
    YEAR_1960S = '1960s'
    BEFORE_1960 = 'before_1960'
    

class ListingType:
    """Listing type values."""
    PHYSICAL = 'physical'
    DOWNLOAD = 'download'
    BOTH = 'both'