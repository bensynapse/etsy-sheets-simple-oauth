# Complete Etsy API v3 Documentation: All Available Endpoints and Functions

## API Overview and Authentication

The Etsy API v3 is a REST API focusing on three core use cases with approximately 70 endpoints total. Released to replace the deprecated v2 API (sunset April 3, 2023), it provides programmatic access for listing management, post-purchase order management, and shop management operations.

### Base Configuration
- **Base URL**: `https://api.etsy.com/v3/application/`
- **Alternative URL**: `https://openapi.etsy.com/v3/` (equivalent)
- **Authentication**: OAuth 2.0 + API Key required
- **Required Headers**:
  - `Authorization: Bearer {oauth_token}`
  - `x-api-key: {api_key}`
- **Content-Type**: `application/json` or `application/x-www-form-urlencoded`
- **Rate Limits**: 10,000 requests/day, 10 requests/second

### OAuth 2.0 Implementation
```javascript
// Step 1: Direct user to authorization URL
const authUrl = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${redirect_uri}&scope=${scopes}&client_id=${client_id}&state=${state}&code_challenge=${code_challenge}&code_challenge_method=S256`;

// Step 2: Exchange authorization code for access token
const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    grant_type: 'authorization_code',
    client_id: client_id,
    redirect_uri: redirect_uri,
    code: auth_code,
    code_verifier: code_verifier
  })
});
```

## Shop Management Endpoints

### Update Shop
- **URL**: `PUT /shops/{shop_id}`
- **Purpose**: Update shop information including title and announcements
- **OAuth Scopes**: `shops_r shops_w`
- **Parameters**:
  - Required: `shop_id` (integer)
  - Optional: `title`, `announcement`, `sale_message`, `digital_sale_message`
- **Response**: Updated shop object

```javascript
const updateShop = async (shopId, updates) => {
  const response = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(updates)
  });
  return response.json();
};
```

### Shop Sections Management
- **Create Section**: `POST /shops/{shop_id}/sections`
- **Get Sections**: `GET /shops/{shop_id}/sections`
- **Update Section**: `PUT /shops/{shop_id}/sections/{shop_section_id}`
- **Delete Section**: `DELETE /shops/{shop_id}/sections/{shop_section_id}`

### Shop Financial Data
- **Get Receipts**: `GET /shops/{shop_id}/receipts`
- **Get Payments**: `GET /shops/{shop_id}/payments`
- **Get Ledger Entries**: `GET /shops/{shop_id}/payment-account/ledger-entries`

## Listing Management Endpoints

### Create Draft Listing
- **URL**: `POST /shops/{shop_id}/listings`
- **Purpose**: Create new product listing
- **OAuth Scopes**: `listings_w`
- **Required Parameters**:
  - `quantity`, `title`, `description`, `price`
  - `who_made`, `when_made`, `taxonomy_id`
- **Optional Parameters**:
  - `image_ids`, `is_digital`, `shipping_profile_id`, `section_id`

```javascript
const createDraftListing = async (shopId, listingData) => {
  const response = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/listings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(listingData)
  });
  return response.json();
};
```

### Update Listing
- **URL**: `PATCH /shops/{shop_id}/listings/{listing_id}`
- **Purpose**: Modify existing listing
- **OAuth Scopes**: `listings_w`
- **Parameters**: All listing fields are optional for updates

### Delete Listing
- **URL**: `DELETE /listings/{listing_id}`
- **OAuth Scopes**: `listings_d`

### Get Listings
- **By Shop**: `GET /shops/{shop_id}/listings`
- **By ID**: `GET /listings/{listing_id}`
- **Batch**: `GET /listings/batch?listing_ids=123,456,789`
- **Search All**: `GET /listings` (marketplace-wide search)

## Inventory and Variations

### Get Listing Inventory
- **URL**: `GET /listings/{listing_id}/inventory`
- **Purpose**: Retrieve product variations, SKUs, and quantities
- **Response Structure**:
```json
{
  "products": [{
    "product_id": 123,
    "sku": "PRODUCT-SKU",
    "offerings": [{
      "offering_id": 456,
      "quantity": 10,
      "price": {"amount": 2500, "divisor": 100, "currency_code": "USD"}
    }],
    "property_values": [{
      "property_id": 200,
      "property_name": "Color",
      "values": ["Red"],
      "value_ids": [1]
    }]
  }]
}
```

### Update Listing Inventory
- **URL**: `PUT /listings/{listing_id}/inventory`
- **Purpose**: Update variations, prices, and quantities
- **Important**: Must include ALL products when updating

```javascript
const updateListingInventory = async (listingId, inventoryData) => {
  const response = await fetch(`https://api.etsy.com/v3/application/listings/${listingId}/inventory`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(inventoryData)
  });
  return response.json();
};
```

## Media Management

### Image Operations
- **Upload Image**: `POST /shops/{shop_id}/listings/{listing_id}/images`
- **Delete Image**: `DELETE /shops/{shop_id}/listings/{listing_id}/images/{listing_image_id}`

```javascript
const uploadListingImage = async (shopId, listingId, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': apiKey
    },
    body: formData
  });
  return response.json();
};
```

### Digital File Operations
- **Upload File**: `POST /shops/{shop_id}/listings/{listing_id}/files`
- **Purpose**: Attach digital product files to listings

## Order and Transaction Management

### Receipt/Order Operations
- **Get Shop Receipts**: `GET /shops/{shop_id}/receipts`
- **Get Single Receipt**: `GET /shops/{shop_id}/receipts/{receipt_id}`
- **Purpose**: Retrieve order information including transactions

### Create Receipt Shipment (Tracking)
- **URL**: `POST /shops/{shop_id}/receipts/{receipt_id}/tracking`
- **Purpose**: Add tracking information to fulfill orders
- **Required**: `tracking_code`, `carrier_name`
- **Effect**: Triggers final payment calculations

```javascript
const addTracking = async (shopId, receiptId, trackingData) => {
  const response = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/receipts/${receiptId}/tracking`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tracking_code: trackingData.code,
      carrier_name: trackingData.carrier
    })
  });
  return response.json();
};
```

### Payment Information (Read-Only)
- **Get Payments**: `GET /shops/{shop_id}/payments`
- **Get Ledger Entries**: `GET /shops/{shop_id}/payment-account/ledger-entries`
- **Note**: No payment processing or refund endpoints available

## Shipping Configuration

### Shipping Profiles
- **Create Profile**: `POST /shops/{shop_id}/shipping-profiles`
- **Update Profile**: `PUT /shops/{shop_id}/shipping-profiles/{shipping_profile_id}`
- **Get Profiles**: `GET /shops/{shop_id}/shipping-profiles`

```javascript
const createShippingProfile = async (shopId, profileData) => {
  const response = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/shipping-profiles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: "US Standard Shipping",
      origin_country_iso: "US",
      primary_cost: 5.99,
      secondary_cost: 2.99,
      min_processing_time: 1,
      max_processing_time: 3
    })
  });
  return response.json();
};
```

### Shipping Carriers
- **Get Carriers**: `GET /shops/{shop_id}/shipping-carriers`
- **Supported**: 150+ carriers including USPS, FedEx, UPS, DHL, international posts

## Taxonomy and Categories

### Taxonomy Endpoints
- **Buyer Taxonomy**: `GET /buyer-taxonomy/nodes`
- **Seller Taxonomy**: `GET /seller-taxonomy/nodes`
- **Get Properties**: `GET /seller-taxonomy/nodes/{taxonomy_id}/properties`

The taxonomy system provides hierarchical category structures:
- **Buyer Taxonomy**: Simplified for customer navigation
- **Seller Taxonomy**: Detailed for listing organization

### Property Management
Properties enable product variations:
```javascript
// Get available properties for a category
const getProperties = async (taxonomyId) => {
  const response = await fetch(`https://api.etsy.com/v3/application/seller-taxonomy/nodes/${taxonomyId}/properties`, {
    headers: {'x-api-key': apiKey}
  });
  return response.json();
};
```

## User Management (Limited)

### Available User Endpoints
- **Get Current User**: `GET /users/me`
- **Get User Shops**: `GET /users/{user_id}/shops`
- **OAuth Scopes**: `email_r`, `shops_r`

### Removed from v3
- User reviews/feedback endpoints
- User favorites
- User-to-user messaging
- Social interaction features

## Utility and Search

### Ping Test
- **URL**: `GET /public/ping`
- **Purpose**: Test API connectivity
- **Authentication**: Only requires API key

```javascript
const testConnection = async () => {
  const response = await fetch('https://api.etsy.com/v3/public/ping', {
    headers: {'x-api-key': apiKey}
  });
  return response.json();
};
```

### Marketplace Search
- **URL**: `GET /listings`
- **Parameters**: `keywords`, `min_price`, `max_price`, `taxonomy_id`, `location`
- **Pagination**: `limit` (max 100), `offset` (max 50,000)

## Critical Limitations

### Not Available in v3
1. **Webhooks**: Must use polling for updates
2. **Shopping Cart/Checkout**: No API access
3. **Payment Processing**: Read-only access
4. **Refunds**: Manual process only
5. **Reviews/Feedback**: Endpoints removed
6. **Analytics/Statistics**: No API access
7. **Return Policies**: Web interface only

### Rate Limiting
Monitor response headers:
- `X-Limit-Per-Second`: 10
- `X-Remaining-This-Second`
- `X-Limit-Per-Day`: 10,000
- `X-Remaining-Today`

## Common Implementation Patterns

### Error Handling
```javascript
const apiRequest = async (url, options) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': apiKey,
        ...options.headers
      }
    });
    
    if (response.status === 429) {
      // Handle rate limiting
      const retryAfter = response.headers.get('Retry-After');
      await sleep(retryAfter * 1000);
      return apiRequest(url, options);
    }
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};
```

### Pagination Handler
```javascript
const getAllResults = async (endpoint, params = {}) => {
  let allResults = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const response = await apiRequest(`${endpoint}?${new URLSearchParams({...params, limit, offset})}`);
    allResults = allResults.concat(response.results);
    
    if (response.results.length < limit) break;
    offset += limit;
  }
  
  return allResults;
};
```

## Migration from v2

Key changes requiring code updates:
1. **OAuth 2.0 only** - Update authentication flow
2. **Endpoint paths** - New URL structure
3. **Response format** - Standardized with `count` and `results`
4. **Removed endpoints** - 40+ endpoints retired
5. **Field visibility** - No partial field selection
6. **Required headers** - Always include x-api-key

The Etsy API v3 represents a significant shift toward core commerce functionality, removing many social and community features while strengthening listing management, order processing, and shop operations. Developers should plan migrations carefully, as many v2 features have no direct replacements in v3.