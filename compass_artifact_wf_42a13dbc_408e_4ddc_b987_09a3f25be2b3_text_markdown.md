# Complete Etsy API v3 implementation guide for listings management

The Etsy API v3 provides robust endpoints for creating, updating, and deleting listings, but successful implementation requires careful attention to data structures, authentication, and specific API constraints. **All three operations require OAuth 2.0 authentication with appropriate scopes** (`listings_w` for create/update, `listings_d` for delete) and the mandatory `x-api-key` header. The API enforces strict rate limits of **10,000 requests per 24 hours and 10 requests per second**, with no native bulk operations available for inventory updates.

## Creating listings with full parameter control

Creating a listing through the Etsy API v3 involves the `POST /v3/application/shops/{shop_id}/listings` endpoint with seven required parameters that form the foundation of any listing. The required fields include **quantity** (integer), **title** (string), **description** (string), **price** (float in shop's currency), **who_made** (enum: "i_did", "someone_else", "collective"), **when_made** (enum like "2020_2024", "vintage"), and **taxonomy_id** (integer from Etsy's category hierarchy).

The image upload process follows a two-step pattern where images must be uploaded after the listing is created. The endpoint `POST /v3/application/shops/{shop_id}/listings/{listing_id}/images` accepts **JPEG and PNG formats** as multipart form-data. The first uploaded image automatically becomes the primary image, and subsequent images can be ordered using the rank parameter. For digital products, you must set both `is_digital: true` and `type: "download"` to properly configure the listing.

Draft listings start in a "draft" state and can be freely edited without being visible to customers. To transition to active status, you must have at least one image uploaded and use the `PATCH` endpoint to update the state to "active". The taxonomy system requires finding appropriate category IDs through the seller taxonomy endpoint at `/v3/application/seller-taxonomy/nodes`, which returns a hierarchical structure of categories with their associated property requirements.

Property values and variations follow a complex but flexible structure. Each product variation requires a separate entry in the products array, with **property_values** defining the characteristics. For a listing with 3 colors and 3 sizes, you need 9 product entries. Custom variations can use property IDs **513 and 514**, while standard properties like color (200) and size (100) have predefined IDs.

```python
# Example: Creating a listing with variations
inventory_data = {
    "products": [
        {
            "sku": "SHIRT-RED-S",
            "offerings": [{
                "price": 25.99,
                "quantity": 10,
                "is_enabled": true
            }],
            "property_values": [
                {"property_id": 200, "values": ["Red"], "value_ids": [1]},
                {"property_id": 100, "values": ["Small"], "value_ids": [10]}
            ]
        }
        # Additional products for each variation combination
    ],
    "price_on_property": [200],     # Color affects price
    "quantity_on_property": [100],  # Size affects quantity
    "sku_on_property": [100, 200]   # Both affect SKU
}
```

## Inventory and price management strategies

The inventory update system in Etsy API v3 operates on a **complete replacement model** through the `PUT /v3/application/listings/{listing_id}/inventory` endpoint. Unlike traditional APIs with partial updates, you must retrieve the entire inventory structure, modify it, and send back the complete data. This approach prevents accidental data loss but requires careful handling of the data structure.

Managing variations requires understanding the relationship between products and their properties. Each unique combination of property values needs its own product entry with associated SKU, price, and quantity. **Products sharing the same SKU must have identical quantities**, a constraint that helps maintain inventory consistency across variations. The SKU format accepts alphanumeric strings with reasonable length limits, typically using hyphens or underscores as separators.

The most critical aspect of inventory updates involves cleaning the data before submission. The API returns read-only fields like `product_id`, `offering_id`, `scale_name`, `is_deleted`, and `value_pairs` that must be removed before updating. Additionally, price data often comes in a divisor format (amount/divisor) that needs conversion to decimal values. Failing to clean these fields results in silent failures where the API returns success but doesn't update the data.

```python
def clean_inventory_data(inventory_data):
    """Remove read-only fields from inventory data"""
    cleaned_data = {
        "price_on_property": inventory_data.get("price_on_property", []),
        "quantity_on_property": inventory_data.get("quantity_on_property", []),
        "sku_on_property": inventory_data.get("sku_on_property", []),
        "products": []
    }
    
    for product in inventory_data["products"]:
        cleaned_product = {
            "sku": product["sku"],
            "offerings": [],
            "property_values": product.get("property_values", [])
        }
        
        for offering in product["offerings"]:
            price = offering["price"]
            if isinstance(price, dict):
                price = float(price["amount"]) / price["divisor"]
            
            cleaned_offering = {
                "price": price,
                "quantity": offering["quantity"],
                "is_enabled": offering["is_enabled"]
            }
            cleaned_product["offerings"].append(cleaned_offering)
        
        cleaned_data["products"].append(cleaned_product)
    
    return cleaned_data
```

For bulk price updates, the API lacks native batch operations, requiring individual API calls for each listing. Efficient implementations should retrieve current inventory, update specific SKUs while preserving the structure, and implement rate limiting to avoid hitting the **10 requests per second limit**. Price values must fall between **$0.20 and $50,000 USD** (or equivalent in shop currency) and use decimal format with two decimal places.

## Safe listing deletion implementation

Deleting listings through the `DELETE /v3/application/listings/{listing_id}` endpoint appears straightforward but involves several important constraints. The API only permits deletion when listings are in specific states: **SOLD_OUT, DRAFT, EXPIRED, INACTIVE**, or ACTIVE with certain seller flags. Critically, **listings with active or pending orders cannot be deleted**, requiring order status verification before deletion attempts.

The deletion process is permanent with no soft delete option available. All associated data including inventory records, SKUs, variation information, and property values are **permanently removed** without recovery options. This makes pre-deletion data backup essential for any production implementation. As an alternative to deletion, many applications choose to deactivate listings by updating their state to "inactive", preserving the data while removing them from public view.

Error handling for deletions requires distinguishing between retryable and non-retryable failures. Client errors (400, 409) indicating invalid states or active orders should not be retried, while network or server errors may benefit from exponential backoff strategies. The most common deletion failures stem from attempting to delete listings with active orders or insufficient OAuth scopes.

```javascript
async function safeDeleteListing(listingId) {
    // Verify listing state before deletion
    const listing = await getListing(listingId);
    const deletableStates = ['SOLD_OUT', 'DRAFT', 'EXPIRED', 'INACTIVE'];
    
    if (!deletableStates.includes(listing.state)) {
        // Consider deactivating instead
        return await updateListingState(listingId, 'inactive');
    }
    
    try {
        const response = await fetch(
            `https://api.etsy.com/v3/application/listings/${listingId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'x-api-key': apiKey
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Deletion failed: ${response.statusText}`);
        }
        
        return { success: true, permanently_deleted: true };
    } catch (error) {
        console.error(`Failed to delete listing ${listingId}:`, error);
        throw error;
    }
}
```

## Critical technical considerations

Authentication forms the foundation of all Etsy API v3 operations, requiring proper OAuth 2.0 implementation with PKCE flow. Access tokens expire after **one hour**, necessitating refresh token management for long-running operations. The required scopes vary by operation: `listings_r` and `listings_w` for reading and writing, with additional `listings_d` scope required for deletions.

Rate limiting implementation proves essential for production applications. The API enforces both daily limits (10,000 requests per 24 hours) and per-second limits (10 requests). Effective implementations track request counts, implement exponential backoff for 429 responses, and distribute requests across time to avoid hitting limits. The 24-hour period uses a rolling window divided into 12 two-hour blocks for progressive rate limiting.

Several known issues require workarounds in production code. Using "lb" for weight units can make listings uneditable in Etsy's interface, so always use "oz" instead. Inventory updates may unlink variation images, a known bug requiring manual re-linking. The lack of bulk operations means complex inventory updates can quickly consume rate limits, requiring careful batching strategies.

Data validation before API calls prevents many common errors. Titles have character limits that vary by category, prices must be positive decimals, and at least one image is required for active listings. Digital products require specific flag combinations, and taxonomy IDs must match valid categories. Property values must align with the selected taxonomy's requirements.

## Key implementation takeaways

Successful Etsy API v3 implementation requires understanding three core principles that govern all operations. First, **the API uses complete data replacement rather than partial updates**, meaning every inventory update must include all products and variations. Second, **strict rate limits without bulk operations** necessitate efficient request management and potential architectural changes for large-scale operations. Third, **permanent deletion with no recovery options** makes data backup and alternative archiving strategies essential.

The most robust implementations follow a pattern of retrieving current data, applying minimal necessary changes, cleaning the data structure, and submitting complete updates. Error handling should distinguish between retryable server errors and non-retryable client errors, implementing appropriate backoff strategies. Production applications benefit from comprehensive logging, monitoring of rate limit usage, and graceful degradation when limits are approached. Consider implementing a caching layer for taxonomy data and property definitions to reduce API calls, and always validate data client-side before submission to avoid unnecessary failed requests.