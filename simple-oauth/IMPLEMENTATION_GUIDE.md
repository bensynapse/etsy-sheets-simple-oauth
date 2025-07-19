# Etsy API Simple OAuth Implementation Guide

This guide provides comprehensive documentation of the simple OAuth implementation for Etsy API v3 in Google Apps Script. Every function is documented with its purpose, parameters, return values, and implementation details.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [Core Functions](#core-functions)
4. [UI Functions](#ui-functions)
5. [OAuth Functions](#oauth-functions)
6. [API Request Functions](#api-request-functions)
7. [Shop Management Functions](#shop-management-functions)
8. [Listing Functions](#listing-functions)
9. [Product Upload Functions](#product-upload-functions)
10. [Inventory Management Functions](#inventory-management-functions)
11. [Utility Functions](#utility-functions)
12. [Error Handling](#error-handling)

## Architecture Overview

The implementation consists of two main files:
- **Code.gs** - Server-side Google Apps Script containing all business logic
- **Sidebar.html** - Client-side HTML/CSS/JavaScript for the UI

Key design principles:
- No web app deployment required
- Manual OAuth flow with localhost redirect
- Secure token storage using PropertiesService
- Automatic token refresh
- Built-in rate limiting
- Comprehensive error handling

## Authentication Flow

### OAuth 2.0 + PKCE Implementation

1. **Generate PKCE Challenge**
   - Create random verifier (3 UUIDs concatenated)
   - Generate SHA-256 challenge
   - Store verifier in UserProperties

2. **Build Authorization URL**
   - Base: `https://www.etsy.com/oauth/connect`
   - Parameters: response_type, redirect_uri, scope, client_id, state, code_challenge, code_challenge_method

3. **User Authorization**
   - Open URL in new window
   - User approves permissions
   - Redirect to localhost with code

4. **Token Exchange**
   - POST to `/v3/public/oauth/token`
   - Exchange code for access/refresh tokens
   - Store tokens securely

## Core Functions

### Menu and UI Setup

```javascript
function onOpen(e)
```
- **Purpose**: Creates menu when spreadsheet opens
- **Parameters**: `e` - Event object (optional)
- **Creates**: "Etsy API" menu with options
- **Error Handling**: Catches errors when run from script editor

```javascript
function showSidebar()
```
- **Purpose**: Displays the control panel sidebar
- **Creates**: 350px wide sidebar with Etsy API controls
- **Error**: Throws if not run from spreadsheet

```javascript
function testSetup()
```
- **Purpose**: Debug function to test configuration
- **Logs**: Script status, API key presence, authentication state
- **Use**: Run from script editor for troubleshooting

```javascript
function quickTest()
```
- **Purpose**: Quick connection test from menu
- **Shows**: Alert dialog with connection status
- **Uses**: `testConnection()` internally

## OAuth Functions

### Credential Management

```javascript
function saveCredentials(apiKey, clientId)
```
- **Purpose**: Store Etsy API credentials
- **Parameters**: 
  - `apiKey` - Etsy API key (also used as client ID)
  - `clientId` - Not used (API key serves both purposes)
- **Storage**: ScriptProperties (app-level)
- **Returns**: `{success: true}`

### PKCE Generation

```javascript
function generatePKCE()
```
- **Purpose**: Generate PKCE verifier and challenge
- **Algorithm**: 
  - Verifier: 3 concatenated UUIDs
  - Challenge: Base64 URL-safe SHA-256 of verifier
- **Storage**: Verifier saved to UserProperties
- **Returns**: `{verifier, challenge}`

### Authorization URL

```javascript
function getAuthUrl()
```
- **Purpose**: Build OAuth authorization URL
- **Scopes**: listings_r, listings_w, listings_d, shops_r, shops_w, transactions_r, email_r
- **PKCE**: Includes code_challenge and method
- **Returns**: `{url: string, state: string}`

### Token Exchange

```javascript
function exchangeCodeForToken(code)
```
- **Purpose**: Exchange authorization code for tokens
- **Process**:
  1. Retrieve stored PKCE verifier
  2. POST to token endpoint with code
  3. Store access_token, refresh_token, expires_in
- **Error Cases**:
  - Missing verifier
  - Invalid code (400)
  - Network errors
- **Returns**: `{success: boolean, message: string}`

### Token Refresh

```javascript
function refreshTokenIfNeeded()
```
- **Purpose**: Automatically refresh expired tokens
- **Logic**:
  - Check if token expires within 5 minutes
  - Use refresh_token to get new access_token
  - Update stored tokens and expiry
- **Returns**: `boolean` - true if refreshed

## API Request Functions

### Core Request Handler

```javascript
function makeRequest(endpoint, method = 'GET', payload = null)
```
- **Purpose**: Central API request handler with auth
- **Features**:
  - Automatic token refresh
  - Rate limiting (10/sec, 10k/day)
  - Error handling with retries
  - Form-encoded payload support
- **Parameters**:
  - `endpoint` - API path (e.g., '/shops/123')
  - `method` - HTTP method
  - `payload` - Request body (object)
- **Returns**: Parsed JSON response
- **Throws**: On API errors with details

### Connection Test

```javascript
function testConnection()
```
- **Purpose**: Verify API connectivity
- **Process**:
  1. Check API key presence
  2. Test public ping endpoint
  3. Test authenticated user endpoint
- **Returns**: 
  ```javascript
  {
    success: boolean,
    message: string,
    apiKeyValid: boolean,
    authenticated: boolean
  }
  ```

## Shop Management Functions

### User Functions

```javascript
function getCurrentUser()
```
- **Purpose**: Get current authenticated user
- **Endpoint**: `/users/me`
- **Returns**: User object with user_id, email, etc.

```javascript
function getUserShops()
```
- **Purpose**: Get shops owned by user
- **Endpoint**: `/users/me/shops`
- **Fallback**: Checks user object for shop_id
- **Returns**: Shop array or single shop object

```javascript
function getUserInfo()
```
- **Purpose**: Get formatted user information for UI
- **Process**:
  1. Get user details
  2. Check seller status
  3. Get shop name if exists
- **Returns**: Formatted user info object

### Shop Discovery

```javascript
function findUserShopId()
```
- **Purpose**: Find user's shop ID from multiple sources
- **Priority**:
  1. Manual shop ID (if set)
  2. User object shop_id
  3. First shop from shops endpoint
- **Returns**: Shop ID or null

```javascript
function debugCheckShops()
```
- **Purpose**: Debug function to test shop detection
- **Logs**: User data, shops response, alternative endpoints
- **Returns**: Debug information object

### Shop Import

```javascript
function importShopData()
```
- **Purpose**: Import shop data to spreadsheet
- **Creates**: "Shop Data" sheet with:
  - Shop ID, name, title
  - Currency, listing count
  - Creation date
- **Error**: If no shop found
- **Returns**: Success status with shop ID

```javascript
function importAnyShopData(shopId)
```
- **Purpose**: Import any public shop's data
- **Parameters**: `shopId` - Target shop ID
- **Creates**: Same as importShopData but for any shop
- **Use Case**: Competitor research, marketplace analysis

## Listing Functions

### Listing Retrieval

```javascript
function getShopListings(shopId, state = 'active', limit = 25)
```
- **Purpose**: Get shop's listings
- **Parameters**:
  - `shopId` - Shop identifier
  - `state` - active, inactive, draft, expired
  - `limit` - Max results (default 25)
- **Endpoint**: `/shops/{shop_id}/listings`
- **Returns**: Listing array with pagination

```javascript
function importListings()
```
- **Purpose**: Import listings to spreadsheet
- **Creates**: "Listings" sheet with:
  - Listing ID, title, price
  - Quantity, status, views
  - Creation date
- **Format**: Currency formatting for prices
- **Returns**: Success with count

## Order Management

```javascript
function getShopReceipts(shopId, limit = 25)
```
- **Purpose**: Get shop's orders/receipts
- **Endpoint**: `/shops/{shop_id}/receipts`
- **Returns**: Receipt array with transaction details

```javascript
function importOrders()
```
- **Purpose**: Import orders to spreadsheet
- **Creates**: "Orders" sheet with:
  - Order ID, date, buyer
  - Total, status, item count
  - Shipping destination
- **Returns**: Success with count

## Product Upload Functions

### Template Creation

```javascript
function createProductTemplate()
```
- **Purpose**: Create product upload template
- **Creates**: "Product Upload" sheet with:
  - 14 columns for product data
  - 10 sample products
  - Instructions
  - Delete column for bulk deletion
- **Sample Products**: Diverse categories to test all features
- **Returns**: Success status

### Product Creation

```javascript
function createListing(shopId, data)
```
- **Purpose**: Create new product listing
- **Parameters**:
  - `shopId` - Shop identifier
  - `data` - Product data object
- **Encoding**: Form-encoded (not JSON)
- **Required Fields**:
  - quantity, title, description, price
  - who_made, when_made, taxonomy_id
- **Returns**: Created listing object

### Image Upload

```javascript
function uploadImageToListing(shopId, listingId, imageUrl, rank = 1)
```
- **Purpose**: Upload image from URL to listing
- **Process**:
  1. Fetch image from URL
  2. Check content-type
  3. Convert to blob
  4. Upload as multipart form
- **Error Handling**:
  - Invalid URLs (404)
  - Non-image content
  - Network failures
- **Returns**: Image object or null

### Publishing

```javascript
function publishListing(shopId, listingId)
```
- **Purpose**: Change listing from draft to active
- **Method**: PATCH with state=active
- **Requirement**: At least one image uploaded
- **Returns**: Updated listing object

### Bulk Upload

```javascript
function uploadProducts()
```
- **Purpose**: Bulk upload products from sheet
- **Process**:
  1. Read product data from sheet
  2. Check/create shipping profiles
  3. Check/create return policies
  4. Create each listing
  5. Upload images
  6. Publish if images exist
- **Features**:
  - Progress tracking
  - Error recovery
  - Status updates in sheet
  - Rate limiting
- **Returns**: Upload summary

## Inventory Management Functions

### Update Inventory

```javascript
function updateListing(shopId, listingId, updates)
```
- **Purpose**: Update listing price and quantity
- **Method**: PUT to inventory endpoint
- **Process**:
  1. GET current inventory structure
  2. Update offerings with new values
  3. PUT complete inventory back
- **Important**: Must send complete inventory structure
- **Returns**: Success status

### Bulk Updates

```javascript
function updateInventoryAndPrice()
```
- **Purpose**: Bulk update all products in sheet
- **Process**:
  1. Read sheet data
  2. Extract listing IDs from results
  3. Update each listing
  4. Track success/failure
- **UI Updates**: Real-time status in sheet
- **Returns**: Update summary

### Progress Tracking

```javascript
function getUploadProgress()
```
- **Purpose**: Get current upload/update progress
- **Reads**: Status column in sheet
- **Returns**: 
  ```javascript
  {
    total: number,
    completed: number,
    failed: number,
    processing: number
  }
  ```

## Deletion Functions

```javascript
function deleteMarkedListings()
```
- **Purpose**: Delete listings marked with "X"
- **Process**:
  1. Read Delete? column
  2. Find marked listings
  3. Extract listing IDs
  4. DELETE each listing
  5. Update sheet status
- **Safety**: Requires OAuth scope listings_d
- **Returns**: Deletion summary

## Supporting Functions

### Shipping Profiles

```javascript
function getShippingProfiles(shopId)
```
- **Purpose**: Get shop's shipping profiles
- **Endpoint**: `/shops/{shop_id}/shipping-profiles`
- **Returns**: Profile array

```javascript
function createShippingProfile(shopId)
```
- **Purpose**: Create default shipping profile
- **Creates**: US Standard Shipping profile
- **Settings**:
  - Origin: US
  - Primary cost: $5.99
  - Secondary cost: $2.99
  - Processing time: 1-3 days
- **Returns**: Created profile

### Return Policies

```javascript
function getReturnPolicies(shopId)
```
- **Purpose**: Get shop's return policies
- **Endpoint**: `/shops/{shop_id}/policies/return`
- **Returns**: Policy array

```javascript
function createReturnPolicy(shopId)
```
- **Purpose**: Create default return policy
- **Settings**:
  - Accepts returns: true
  - Window: 30 days
- **Returns**: Created policy

## Utility Functions

### Status Management

```javascript
function getStatus()
```
- **Purpose**: Get current configuration status
- **Checks**:
  - API key presence
  - Client ID presence
  - Authentication status
  - Token expiry
  - Saved shop ID
- **Returns**: Status object

### Token Access

```javascript
function getAccessToken()
```
- **Purpose**: Get current access token
- **Throws**: If not authenticated
- **Returns**: Access token string

### Authentication Clear

```javascript
function clearAuth()
```
- **Purpose**: Remove all authentication data
- **Clears**:
  - Access token
  - Refresh token
  - Token expiry
  - PKCE verifier
- **Returns**: Success status

### Manual Shop ID

```javascript
function saveManualShopId(shopId)
```
- **Purpose**: Override automatic shop detection
- **Use Case**: When shop detection fails
- **Storage**: ScriptProperties
- **Returns**: Success status

## Error Handling

### API Errors
- **400**: Bad request - Check parameters
- **401**: Unauthorized - Token expired or invalid
- **403**: Forbidden - Missing OAuth scope
- **404**: Not found - Invalid ID or endpoint
- **429**: Rate limited - Wait and retry
- **500**: Server error - Retry with backoff

### Common Issues and Solutions

1. **Missing Shipping Profile**
   - Automatically creates default profile
   - Logs creation for debugging

2. **Missing Return Policy**
   - Automatically creates default policy
   - Required for publishing

3. **Invalid Image URLs**
   - Skips invalid images
   - Saves listing as draft
   - Logs skipped URLs

4. **Token Expiration**
   - Automatic refresh before requests
   - 5-minute buffer before expiry

5. **Rate Limiting**
   - Built-in delays (500ms-1s)
   - Respects 10/sec limit
   - Tracks daily usage

## Data Storage

### Properties Service Usage

**ScriptProperties** (App-level):
- ETSY_API_KEY
- ETSY_CLIENT_ID
- MANUAL_SHOP_ID

**UserProperties** (User-level):
- access_token
- refresh_token
- token_expires
- pkce_verifier

### Sheet Structure

**Shop Data**:
- Shop information in key-value format
- Merged header cells
- Background colors for sections

**Listings**:
- Tabular format with headers
- Currency formatting
- Auto-resized columns

**Orders**:
- Order details with formatting
- Address information
- Transaction counts

**Product Upload**:
- 14 columns for product data
- Status tracking
- Result logging
- Frozen header row

## Best Practices

1. **Always check authentication** before API calls
2. **Handle rate limits** with delays and retries
3. **Validate data** before API requests
4. **Log errors** for debugging
5. **Update UI** for long operations
6. **Clean sensitive data** from logs
7. **Test with small batches** first
8. **Monitor API usage** to avoid limits

This implementation provides a robust, user-friendly solution for Etsy shop management without the complexity of web app deployment.