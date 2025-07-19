# Etsy API v3 Reference - Simple OAuth Implementation

This document provides detailed API endpoint documentation as used in the simple OAuth implementation. It covers request formats, response structures, and important implementation notes.

## Table of Contents
1. [API Configuration](#api-configuration)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Endpoints](#user-endpoints)
4. [Shop Endpoints](#shop-endpoints)
5. [Listing Endpoints](#listing-endpoints)
6. [Inventory Endpoints](#inventory-endpoints)
7. [Image Endpoints](#image-endpoints)
8. [Order/Receipt Endpoints](#orderreceipt-endpoints)
9. [Shipping Profile Endpoints](#shipping-profile-endpoints)
10. [Return Policy Endpoints](#return-policy-endpoints)
11. [Request Formats](#request-formats)
12. [Error Responses](#error-responses)

## API Configuration

### Base URLs
```
Production: https://api.etsy.com/v3/application
Auth Base: https://www.etsy.com/oauth
Token URL: https://api.etsy.com/v3/public/oauth/token
```

### Required Headers
```javascript
{
  'Authorization': 'Bearer {access_token}',
  'x-api-key': '{api_key}',
  'Content-Type': 'application/x-www-form-urlencoded' // or application/json
}
```

### Rate Limits
- 10,000 requests per day
- 10 requests per second
- Monitor headers: `X-Limit-Per-Second`, `X-Remaining-This-Second`

## Authentication Endpoints

### Authorization URL
```
GET https://www.etsy.com/oauth/connect
```

**Query Parameters:**
```javascript
{
  response_type: 'code',
  redirect_uri: 'http://localhost',
  scope: 'listings_r listings_w listings_d shops_r shops_w transactions_r email_r',
  client_id: '{api_key}',
  state: '{random_uuid}',
  code_challenge: '{base64_sha256_of_verifier}',
  code_challenge_method: 'S256'
}
```

### Token Exchange
```
POST https://api.etsy.com/v3/public/oauth/token
```

**Request Body (JSON):**
```javascript
{
  grant_type: 'authorization_code',
  client_id: '{api_key}',
  redirect_uri: 'http://localhost',
  code: '{authorization_code}',
  code_verifier: '{pkce_verifier}'
}
```

**Response:**
```javascript
{
  access_token: 'string',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'string'
}
```

### Token Refresh
```
POST https://api.etsy.com/v3/public/oauth/token
```

**Request Body (JSON):**
```javascript
{
  grant_type: 'refresh_token',
  client_id: '{api_key}',
  refresh_token: '{refresh_token}'
}
```

## User Endpoints

### Get Current User
```
GET /users/me
```

**Response:**
```javascript
{
  user_id: 123456,
  login_name: 'username',
  primary_email: 'email@example.com',
  first_name: 'John',
  last_name: 'Doe',
  is_seller: true,
  shop_id: 654321  // May be present
}
```

### Get User Shops
```
GET /users/me/shops
```

**Response:**
```javascript
{
  count: 1,
  results: [{
    shop_id: 654321,
    shop_name: 'MyShop',
    title: 'My Awesome Shop',
    currency_code: 'USD',
    listing_active_count: 42
  }]
}
```

## Shop Endpoints

### Get Shop
```
GET /shops/{shop_id}
```

**Response:**
```javascript
{
  shop_id: 654321,
  shop_name: 'MyShop',
  user_id: 123456,
  title: 'My Awesome Shop',
  announcement: 'Welcome to my shop!',
  currency_code: 'USD',
  language: 'en-US',
  listing_active_count: 42,
  digital_listing_count: 5,
  create_date: 1640995200,
  policy_updated_tsz: 1640995200
}
```

### Update Shop
```
PUT /shops/{shop_id}
```

**Request (Form-encoded):**
```
title=New+Shop+Title&announcement=New+announcement
```

## Listing Endpoints

### Get Shop Listings
```
GET /shops/{shop_id}/listings
```

**Query Parameters:**
- `state`: active, inactive, draft, expired (default: active)
- `limit`: 1-100 (default: 25)
- `offset`: pagination offset

**Response:**
```javascript
{
  count: 150,
  results: [{
    listing_id: 1234567890,
    state: 'active',
    user_id: 123456,
    title: 'Product Title',
    description: 'Product description...',
    price: {
      amount: 2499,
      divisor: 100,
      currency_code: 'USD'
    },
    quantity: 10,
    views: 234,
    num_favorers: 45,
    created_timestamp: 1640995200,
    updated_timestamp: 1641081600
  }]
}
```

### Create Listing
```
POST /shops/{shop_id}/listings
```

**Request (Form-encoded):**
```
quantity=10&
title=Product+Title&
description=Product+description&
price=24.99&
who_made=i_did&
when_made=2020_2024&
taxonomy_id=1633&
state=draft&
shipping_profile_id=12345&
return_policy_id=67890&
sku[]=SKU001&
tags[]=tag1&tags[]=tag2&
materials[]=material1&materials[]=material2
```

**Important Notes:**
- Arrays use `param[]=value` syntax
- All text must be URL-encoded
- Price is decimal (24.99, not 2499)
- State defaults to 'draft'

**Response:**
```javascript
{
  listing_id: 1234567890,
  state: 'draft',
  // ... full listing object
}
```

### Update Listing State
```
PATCH /shops/{shop_id}/listings/{listing_id}
```

**Request (Form-encoded):**
```
state=active
```

**Use Case:** Publish draft listing

### Delete Listing
```
DELETE /listings/{listing_id}
```

**Response:** 204 No Content

**Required Scope:** listings_d

## Inventory Endpoints

### Get Listing Inventory
```
GET /listings/{listing_id}/inventory
```

**Response:**
```javascript
{
  products: [{
    product_id: 123,
    sku: 'SKU001',
    offerings: [{
      offering_id: 456,
      price: 24.99,  // In v3, this is a float
      quantity: 10,
      is_enabled: true
    }],
    property_values: []
  }],
  price_on_property: [],
  quantity_on_property: [],
  sku_on_property: []
}
```

### Update Listing Inventory
```
PUT /listings/{listing_id}/inventory
```

**Request (JSON):**
```javascript
{
  products: [{
    sku: 'SKU001',
    offerings: [{
      price: 29.99,      // Simple float, not object!
      quantity: 15,
      is_enabled: true
    }],
    property_values: []
  }],
  price_on_property: [],
  quantity_on_property: [],
  sku_on_property: []
}
```

**Critical Notes:**
1. Must include complete inventory structure
2. Price is a float, NOT an object
3. Don't include read-only fields (product_id, offering_id)
4. All products must be included

## Image Endpoints

### Upload Listing Image
```
POST /shops/{shop_id}/listings/{listing_id}/images
```

**Request (Multipart Form):**
```javascript
// Google Apps Script example
const formData = {
  'image': imageBlob,
  'rank': '1'  // String, not number
};
```

**Process:**
1. Fetch image from URL
2. Check content-type is image/*
3. Convert to blob
4. Send as multipart/form-data

**Response:**
```javascript
{
  listing_image_id: 987654321,
  listing_id: 1234567890,
  rank: 1,
  url_75x75: 'https://...',
  url_170x135: 'https://...',
  url_570xN: 'https://...',
  url_fullxfull: 'https://...'
}
```

## Order/Receipt Endpoints

### Get Shop Receipts
```
GET /shops/{shop_id}/receipts
```

**Query Parameters:**
- `limit`: 1-100 (default: 25)
- `offset`: pagination

**Response:**
```javascript
{
  count: 250,
  results: [{
    receipt_id: 123456789,
    receipt_type: 1,
    seller_user_id: 123456,
    seller_email: 'seller@example.com',
    buyer_user_id: 789012,
    buyer_email: 'buyer@example.com',
    name: 'John Doe',
    status: 'Paid',
    is_shipped: false,
    created_timestamp: 1640995200,
    grandtotal: {
      amount: 3499,
      divisor: 100,
      currency_code: 'USD'
    },
    transactions: [/* transaction objects */]
  }]
}
```

## Shipping Profile Endpoints

### Get Shipping Profiles
```
GET /shops/{shop_id}/shipping-profiles
```

**Response:**
```javascript
{
  count: 3,
  results: [{
    shipping_profile_id: 12345,
    title: 'US Standard Shipping',
    user_id: 123456,
    min_processing_days: 1,
    max_processing_days: 3,
    processing_days_display_label: '1-3 business days',
    origin_country_iso: 'US'
  }]
}
```

### Create Shipping Profile
```
POST /shops/{shop_id}/shipping-profiles
```

**Request (JSON):**
```javascript
{
  title: 'US Standard Shipping',
  origin_country_iso: 'US',
  primary_cost: 5.99,
  secondary_cost: 2.99,
  min_processing_time: 1,
  max_processing_time: 3
}
```

## Return Policy Endpoints

### Get Return Policies
```
GET /shops/{shop_id}/policies/return
```

**Response:**
```javascript
{
  count: 1,
  results: [{
    return_policy_id: 67890,
    accepts_returns: true,
    accepts_exchanges: true,
    return_deadline: 30  // days
  }]
}
```

### Create Return Policy
```
POST /shops/{shop_id}/policies/return
```

**Request (JSON):**
```javascript
{
  accepts_returns: true,
  accepts_exchanges: true,
  return_deadline: 30
}
```

## Request Formats

### Form-Encoded Requests
Used for most endpoints:
```javascript
// Google Apps Script
const formData = Object.keys(data).map(key => {
  const value = data[key];
  if (Array.isArray(value)) {
    return value.map(v => `${key}[]=${encodeURIComponent(v)}`).join('&');
  }
  return `${key}=${encodeURIComponent(value)}`;
}).join('&');
```

### JSON Requests
Used for inventory updates and some policy endpoints:
```javascript
const options = {
  'method': 'POST',
  'headers': {
    'Content-Type': 'application/json',
    // ... other headers
  },
  'payload': JSON.stringify(data)
};
```

### Multipart Requests
Used for image uploads:
```javascript
const options = {
  'method': 'POST',
  'headers': {
    'Authorization': 'Bearer ' + token,
    'x-api-key': apiKey
    // NO Content-Type header!
  },
  'payload': formData  // Object with blobs
};
```

## Error Responses

### Standard Error Format
```javascript
{
  error: 'invalid_request',
  error_description: 'Detailed error message'
}
```

### Common Error Codes

**400 Bad Request**
```javascript
{
  error: 'Type mismatch for parameter price...'
}
```
Fix: Check data types and format

**401 Unauthorized**
```javascript
{
  error: 'invalid_token'
}
```
Fix: Refresh token or re-authenticate

**403 Forbidden**
```javascript
{
  error: 'insufficient_scope'
}
```
Fix: Request additional OAuth scopes

**404 Not Found**
```javascript
{
  error: 'Resource not found'
}
```
Fix: Verify IDs and endpoints

**429 Too Many Requests**
Headers:
```
Retry-After: 60
X-RateLimit-Remaining: 0
```
Fix: Wait and retry

## Implementation Best Practices

1. **Always check response codes** before parsing JSON
2. **Use muteHttpExceptions: true** for proper error handling
3. **Log request/response** for debugging (remove sensitive data)
4. **Implement exponential backoff** for retries
5. **Cache rarely-changing data** (shipping profiles, policies)
6. **Batch operations** when possible to reduce API calls
7. **Validate data client-side** before API requests
8. **Handle partial failures** in bulk operations

## Key Differences from v2

1. **OAuth 2.0 only** - No API key-only access
2. **Required headers** - Both Authorization and x-api-key
3. **Price format** - Simple float in inventory, not object
4. **Array syntax** - Use `param[]` for form-encoded arrays
5. **Scope requirements** - More granular permissions
6. **No partial responses** - Can't select fields
7. **Standardized pagination** - count/results format

This API reference covers all endpoints used in the simple OAuth implementation, providing the exact formats and structures needed for a Python port or any other implementation.