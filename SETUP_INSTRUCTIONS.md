# Etsy API Google Sheets Integration - Simple OAuth Setup

## Overview
This Google Apps Script integrates with Etsy API v3 using a simple OAuth flow that doesn't require web app deployment. Import shop data, manage listings, update inventory, and handle orders directly in Google Sheets.

## Key Features
- ✅ Simple OAuth without web app deployment
- ✅ Full shop management capabilities
- ✅ Product upload with images
- ✅ Inventory and price updates
- ✅ Bulk operations with progress tracking
- ✅ Listing deletion management

## Prerequisites
1. Google account with access to Google Sheets
2. Etsy seller account
3. Etsy developer account for API access

## Step 1: Create Etsy App
1. Go to https://www.etsy.com/developers/
2. Click "Create a New App"
3. Fill in app details:
   - Name: "My Shop Google Sheets Integration" (or your preferred name)
   - Description: Brief description of your integration
4. Add redirect URI: `http://localhost`
5. After creation, note down your **API Key** (Keystring)

## Step 2: Set Up Google Sheets
1. Create a new Google Sheet
2. Open Apps Script editor: Extensions → Apps Script
3. Delete any existing code
4. Create these files:
   - **Code.gs** - Copy from `simple-oauth/Code.gs`
   - **Sidebar** (HTML file) - Copy from `simple-oauth/Sidebar.html`
5. Save the project (Ctrl+S or Cmd+S)

## Step 3: Use the Integration
1. Reload your Google Sheet (refresh the page)
2. You'll see "Etsy API" menu in the menu bar
3. Click "Etsy API" → "Open Control Panel"
4. Follow the 3-step process in the sidebar

### Step-by-Step OAuth Process
1. **Enter Credentials**
   - Paste your API Key from Etsy
   - Click "Save API Key"

2. **Connect to Etsy**
   - Click "Connect to Etsy" button
   - A new window opens with Etsy authorization
   - Approve the permissions
   - Copy the code from the URL (after `code=`)
   - Paste it back in the sidebar
   - Click "Submit Code"

3. **Start Using**
   - Import your shop data
   - Create product upload templates
   - Manage inventory and pricing
   - Delete listings as needed

## Available Functions

### Shop Management
- **Import My Shop** - Get your shop information
- **Import My Listings** - Import all active listings
- **Import My Orders** - Get recent orders

### Product Management
- **Create Upload Template** - Generate a template with 10 sample products
- **Upload Products** - Bulk upload products with images
- **Update Price & Inventory** - Bulk update existing listings
- **Delete Marked Listings** - Delete selected listings

## Product Upload Template Structure
The template includes these columns:
1. Title* (required)
2. Description* (required)
3. Price* (required)
4. Quantity* (required)
5. SKU (optional)
6. Tags (comma separated, max 13)
7. Materials (comma separated)
8. Who Made* (i_did, someone_else, collective)
9. When Made* (made_to_order, 2020_2025, 2010_2019, 2006_2009, before_2005)
10. Taxonomy ID* (category ID)
11. Image URLs (comma separated)
12. Status (auto-filled)
13. Result (auto-filled)
14. Delete? (mark with "X" to delete)

## Required OAuth Scopes
The integration requests these permissions:
- `listings_r` - Read listings
- `listings_w` - Create/update listings
- `listings_d` - Delete listings
- `shops_r` - Read shop information
- `shops_w` - Update shop information
- `transactions_r` - Read orders
- `email_r` - Read email for user identification

## Rate Limits & Best Practices
- API allows 10,000 requests per day
- 10 requests per second maximum
- The script includes automatic rate limiting (500ms-1s delays)
- Progress bars show upload/update status

## Troubleshooting

### Connection Issues
- Verify API key is correct
- Make sure you copied the full authorization code
- Check that redirect URI is set to `http://localhost`

### Upload Failures
- Ensure shipping profiles exist (auto-created if missing)
- Verify return policies are set up (auto-created if missing)
- Check image URLs are valid and accessible
- Confirm taxonomy IDs are correct

### Permission Errors
- If deletion fails, disconnect and reconnect to get `listings_d` scope
- Make sure you approved all requested permissions during OAuth

## Security
- API keys and tokens are stored securely in Google's PropertiesService
- Tokens are user-specific (UserProperties)
- Never share your Script ID or API keys
- OAuth tokens auto-refresh when needed

## Data Storage
All data is stored directly in your Google Sheet:
- Shop Data tab - Shop information
- Listings tab - Product listings
- Orders tab - Recent orders
- Product Upload tab - Upload/management template

## Support Resources
- Implementation guide: See `simple-oauth/IMPLEMENTATION_GUIDE.md`
- API reference: See `simple-oauth/API_REFERENCE.md`
- Etsy API docs: https://developers.etsy.com/documentation/
- Google Apps Script: https://developers.google.com/apps-script

Remember to respect Etsy's API terms of service and rate limits when using this integration.