"""
Utility helper functions.
Common utilities used across the application.
"""

import hashlib
import base64
import secrets
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def generate_state() -> str:
    """Generate random state for OAuth CSRF protection.
    
    Returns:
        URL-safe random string
    """
    return secrets.token_urlsafe(16)


def generate_pkce_verifier() -> str:
    """Generate PKCE verifier.
    
    Returns:
        Base64 URL-safe encoded random string
    """
    # Generate 96 random bytes (matching GAS implementation)
    random_bytes = secrets.token_bytes(96)
    return base64.urlsafe_b64encode(random_bytes).decode('utf-8').rstrip('=')


def generate_pkce_challenge(verifier: str) -> str:
    """Generate PKCE challenge from verifier.
    
    Args:
        verifier: PKCE verifier string
        
    Returns:
        Base64 URL-safe encoded SHA-256 hash
    """
    challenge_bytes = hashlib.sha256(verifier.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(challenge_bytes).decode('utf-8').rstrip('=')


def format_currency(amount: float, currency_code: str = 'USD') -> str:
    """Format currency amount.
    
    Args:
        amount: Numeric amount
        currency_code: Currency code
        
    Returns:
        Formatted currency string
    """
    symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'CAD': 'C$',
        'AUD': 'A$'
    }
    
    symbol = symbols.get(currency_code, currency_code + ' ')
    return f"{symbol}{amount:,.2f}"


def format_timestamp(timestamp: int) -> str:
    """Format Unix timestamp to readable date.
    
    Args:
        timestamp: Unix timestamp
        
    Returns:
        Formatted date string
    """
    if timestamp:
        return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M')
    return 'N/A'


def clean_string_for_csv(text: str) -> str:
    """Clean string for CSV export.
    
    Args:
        text: Input text
        
    Returns:
        Cleaned text safe for CSV
    """
    if not text:
        return ''
        
    # Remove newlines and extra whitespace
    text = ' '.join(text.split())
    
    # Escape quotes
    text = text.replace('"', '""')
    
    return text


def parse_tags(tags_str: str, max_tags: int = 13) -> List[str]:
    """Parse comma-separated tags string.
    
    Args:
        tags_str: Comma-separated tags
        max_tags: Maximum number of tags (Etsy limit is 13)
        
    Returns:
        List of cleaned tags
    """
    if not tags_str:
        return []
        
    tags = [tag.strip() for tag in str(tags_str).split(',')]
    tags = [tag for tag in tags if tag]  # Remove empty
    
    return tags[:max_tags]


def validate_who_made(value: str) -> bool:
    """Validate who_made enum value.
    
    Args:
        value: Value to validate
        
    Returns:
        True if valid
    """
    valid_values = ['i_did', 'someone_else', 'collective']
    return value in valid_values


def validate_when_made(value: str) -> bool:
    """Validate when_made enum value.
    
    Args:
        value: Value to validate
        
    Returns:
        True if valid
    """
    valid_values = [
        'made_to_order', '2020_2025', '2020_2024', '2010_2019',
        '2006_2009', '2005', 'before_2005', '2000_2004',
        '1990s', '1980s', '1970s', '1960s', 'before_1960'
    ]
    return value in valid_values


def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """Split list into chunks.
    
    Args:
        lst: List to chunk
        chunk_size: Size of each chunk
        
    Returns:
        List of chunks
    """
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for saving.
    
    Args:
        filename: Original filename
        
    Returns:
        Safe filename
    """
    # Remove invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
        
    # Limit length
    name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
    if len(name) > 200:
        name = name[:200]
        
    return f"{name}.{ext}" if ext else name


def get_image_extension(content_type: str) -> Optional[str]:
    """Get file extension from content type.
    
    Args:
        content_type: MIME content type
        
    Returns:
        File extension or None
    """
    mime_to_ext = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg'
    }
    
    return mime_to_ext.get(content_type.lower())


def calculate_etsy_fees(price: float, is_digital: bool = False) -> Dict[str, float]:
    """Calculate Etsy fees for a listing.
    
    Args:
        price: Item price
        is_digital: Whether item is digital
        
    Returns:
        Dictionary of fees
    """
    # Etsy fee structure (as of 2024)
    listing_fee = 0.20
    transaction_fee_rate = 0.065  # 6.5%
    payment_processing_rate = 0.03  # 3% + $0.25
    payment_processing_fixed = 0.25
    
    transaction_fee = price * transaction_fee_rate
    payment_fee = (price * payment_processing_rate) + payment_processing_fixed
    
    total_fees = listing_fee + transaction_fee + payment_fee
    
    return {
        'listing_fee': listing_fee,
        'transaction_fee': round(transaction_fee, 2),
        'payment_processing_fee': round(payment_fee, 2),
        'total_fees': round(total_fees, 2),
        'net_amount': round(price - total_fees, 2)
    }


def format_error_message(error: Exception) -> str:
    """Format error message for display.
    
    Args:
        error: Exception object
        
    Returns:
        User-friendly error message
    """
    error_str = str(error)
    
    # Handle common API errors
    if 'insufficient_scope' in error_str:
        return "Permission denied. Please reconnect with required permissions."
    elif '429' in error_str or 'rate limit' in error_str.lower():
        return "Rate limit exceeded. Please wait a moment and try again."
    elif '401' in error_str or 'unauthorized' in error_str.lower():
        return "Authentication expired. Please reconnect to Etsy."
    elif '404' in error_str:
        return "Item not found. It may have been deleted."
    elif 'network' in error_str.lower() or 'connection' in error_str.lower():
        return "Network error. Please check your internet connection."
    else:
        # Return first 200 chars of error
        return error_str[:200] + '...' if len(error_str) > 200 else error_str