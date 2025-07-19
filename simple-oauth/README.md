# Simple Etsy API with OAuth for Google Sheets

A powerful Google Apps Script that connects to Etsy API v3 using OAuth 2.0 WITHOUT requiring web app deployment. This implementation provides full shop management capabilities with a simple copy-paste setup.

## 🚀 Key Features

### Core Functionality
- ✅ **Simple OAuth Flow** - No web app deployment needed
- ✅ **Full Shop Management** - Import and manage your Etsy shop data
- ✅ **Product Upload** - Bulk upload products with images
- ✅ **Inventory Management** - Update prices and quantities in bulk
- ✅ **Listing Deletion** - Bulk delete marked listings
- ✅ **Order Management** - Import and track orders
- ✅ **Progress Tracking** - Real-time progress bars for bulk operations

### Technical Features
- 🔐 Secure token storage using Google's PropertiesService
- 🔄 Automatic token refresh before expiration
- ⏱️ Built-in rate limiting to respect API limits
- 📊 Comprehensive error handling and logging
- 🎨 Clean, intuitive sidebar UI

## How It Works

Uses manual OAuth flow with PKCE (Proof Key for Code Exchange):
1. Opens Etsy authorization in browser with localhost redirect
2. You copy the authorization code from URL
3. Paste it back in Google Sheets sidebar
4. Done! Full API access with all necessary scopes

## Quick Start

### 1. Create Etsy App
- Go to https://www.etsy.com/developers/
- Create new app
- Add redirect URI: `http://localhost`
- Save your **API Key** (Keystring)

### 2. Setup Google Sheets
- Create new Google Sheet
- Go to Extensions → Apps Script
- Delete default code
- Create these files:
  - **Code.gs** - Copy the Code.gs content
  - **Sidebar** (HTML file) - Copy the Sidebar.html content
- Save project (Ctrl+S or Cmd+S)

### 3. Use the Script
- Reload Google Sheet
- Click "Etsy API" menu → "Open Control Panel"
- Follow the 3 steps in sidebar:
  1. Enter API Key
  2. Click "Connect to Etsy" and authorize
  3. Start managing your shop!

## Complete Feature List

### Shop Operations
- **Import My Shop** - Get shop details and statistics
- **Import My Listings** - Import all active product listings
- **Import My Orders** - Get recent orders with customer details
- **Import Any Shop** - View public data from any shop ID

### Product Management
- **Create Upload Template** - Generate template with 10 sample products
- **Upload Products** - Bulk create listings with:
  - Automatic image upload from URLs
  - Tag and material management
  - SKU tracking
  - Automatic shipping profile creation
  - Automatic return policy creation
  - Draft/Active state management
  
### Inventory Operations
- **Update Price & Inventory** - Bulk update existing listings
- **Delete Marked Listings** - Bulk delete with safety confirmation
- **Real-time Progress** - Visual progress bars for all operations

### Data Structure
Product template includes 14 columns:
1. Title* (max 140 characters)
2. Description* (max 10,000 characters)
3. Price* (numeric)
4. Quantity* (0-999)
5. SKU (optional)
6. Tags (comma separated, max 13)
7. Materials (comma separated, max 13)
8. Who Made* (i_did, someone_else, collective)
9. When Made* (made_to_order, 2020_2025, etc.)
10. Taxonomy ID* (category ID)
11. Image URLs (comma separated)
12. Status (auto-filled)
13. Result (auto-filled with listing ID)
14. Delete? (mark with "X" to delete)

## OAuth Scopes

The integration requests these permissions:
- `listings_r` - Read your listings
- `listings_w` - Create and update listings
- `listings_d` - Delete listings
- `shops_r` - Read shop information
- `shops_w` - Update shop settings
- `transactions_r` - Read orders and receipts
- `email_r` - Get user email for identification

## API Endpoints Used

### Authentication
- `GET /v3/public/oauth/token` - Token exchange
- `POST /v3/public/oauth/token` - Token refresh

### Shop Management
- `GET /v3/application/users/me` - Current user info
- `GET /v3/application/shops/{shop_id}` - Shop details
- `PUT /v3/application/shops/{shop_id}` - Update shop

### Listing Operations
- `POST /v3/application/shops/{shop_id}/listings` - Create listing
- `PATCH /v3/application/shops/{shop_id}/listings/{listing_id}` - Update listing
- `DELETE /v3/application/listings/{listing_id}` - Delete listing
- `GET /v3/application/shops/{shop_id}/listings` - Get listings

### Inventory Management
- `GET /v3/application/listings/{listing_id}/inventory` - Get inventory
- `PUT /v3/application/listings/{listing_id}/inventory` - Update inventory

### Image Management
- `POST /v3/application/shops/{shop_id}/listings/{listing_id}/images` - Upload image

### Supporting Operations
- `GET /v3/application/shops/{shop_id}/shipping-profiles` - Get shipping
- `POST /v3/application/shops/{shop_id}/shipping-profiles` - Create shipping
- `GET /v3/application/shops/{shop_id}/policies/return` - Get return policies
- `POST /v3/application/shops/{shop_id}/policies/return` - Create return policy

## Error Handling

The script handles common issues automatically:
- **Missing Shipping Profile** - Creates default profile
- **Missing Return Policy** - Creates default policy
- **Invalid Image URLs** - Skips and continues, saves as draft
- **Rate Limiting** - Built-in delays between requests
- **Token Expiration** - Automatic refresh

## Rate Limits

- 10,000 requests per day
- 10 requests per second
- Script includes 500ms-1s delays between operations
- Progress tracking shows current status

## Security

- API keys stored in ScriptProperties (app-level)
- OAuth tokens stored in UserProperties (user-level)
- Tokens never exposed in UI or logs
- Automatic token refresh before expiration

## Files

Just 2 simple files needed:
- **Code.gs** - Complete implementation (1627 lines)
- **Sidebar.html** - Clean UI interface (509 lines)

## Troubleshooting

### Connection Issues
- Verify API key is correct (not Client ID)
- Ensure redirect URI is exactly `http://localhost`
- Copy full authorization code including any trailing characters

### Upload Issues
- Check image URLs are accessible
- Verify taxonomy IDs are valid
- Ensure required fields are filled
- Check for special characters in text fields

### Permission Issues
- Disconnect and reconnect if scopes changed
- Ensure all requested permissions were approved
- Check API key has appropriate app permissions

## Why This Approach?

- **No Deployment Needed** - Works immediately after copy-paste
- **No Complex URLs** - Uses simple localhost redirect
- **User-Friendly** - Clear 3-step process
- **Fully Featured** - All shop management capabilities
- **Secure** - Follows OAuth 2.0 + PKCE best practices
- **Maintainable** - Clean, documented code

That's it! Simple OAuth without the complexity, but with all the power you need to manage your Etsy shop.