# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains a Google Apps Script implementation for the Etsy API v3. The main implementation is in the `simple-oauth` folder, which provides a complete shop management solution without requiring web app deployment.

## Main Implementation: simple-oauth

The `simple-oauth` folder contains the production-ready implementation with these features:
- OAuth 2.0 authentication without web app deployment
- Full shop management capabilities
- Product upload with image support
- Inventory and price management
- Bulk operations with progress tracking
- Listing deletion functionality

### Key Files
- `simple-oauth/Code.gs` - Complete server-side implementation (1627 lines)
- `simple-oauth/Sidebar.html` - Client-side UI (509 lines)
- `simple-oauth/README.md` - Setup instructions and feature list
- `simple-oauth/IMPLEMENTATION_GUIDE.md` - Detailed function documentation
- `simple-oauth/API_REFERENCE.md` - Complete API endpoint reference

## Other Folders

- `simple/` - Basic API testing implementation (no OAuth, limited features)
- Root directory files - Legacy implementations, refer to simple-oauth instead

## Important Implementation Details

### Authentication
- Uses OAuth 2.0 with PKCE flow
- Redirect URI: `http://localhost`
- Manual code copy/paste process
- Required scopes: `listings_r listings_w listings_d shops_r shops_w transactions_r email_r`

### API Configuration
- Base URL: `https://api.etsy.com/v3/application/`
- Required headers: Authorization (Bearer token) and x-api-key
- Rate limits: 10,000 requests/day, 10 requests/second

### Data Handling
- Form-encoded requests for most endpoints
- JSON for inventory updates and policies
- Multipart form data for image uploads
- Arrays use `param[]=value` syntax in form encoding

### Error Handling
- Automatic token refresh before expiration
- Shipping profile auto-creation if missing
- Return policy auto-creation if missing
- Graceful image upload failure handling
- Comprehensive error logging

## Development Guidelines

1. **Always use the simple-oauth implementation** as the reference
2. **Test with small batches** before bulk operations
3. **Monitor rate limits** using response headers
4. **Log errors comprehensively** for debugging
5. **Update UI in real-time** for long operations
6. **Validate data client-side** before API calls
7. **Handle partial failures** in bulk operations

## Common Issues and Solutions

1. **OAuth Scope Errors**: Disconnect and reconnect to add new scopes
2. **Image Upload Failures**: Check URLs are accessible and return image content
3. **Inventory Update Issues**: Ensure price is a float, not an object
4. **Token Expiration**: Automatic refresh handles this
5. **Rate Limiting**: Built-in delays prevent this

## Key API Constraints

1. **Complete Data Replacement**: The API uses complete data replacement rather than partial updates, especially for inventory management
2. **No Bulk Operations**: Most operations require individual API calls
3. **Permanent Deletion**: Deletions are permanent with no recovery options
4. **OAuth Scopes Required**:
   - `listings_r` and `listings_w` for reading/writing listings
   - `listings_d` for deleting listings
   - `shops_r` and `shops_w` for shop management
   - `transactions_r` for order management
   - `email_r` for user identification

## Documentation Files

1. `compass_artifact_wf_2a72a0a2_dc33_4fc7_9c24_3cbb034017d1_text_markdown.md` - Complete Etsy API v3 endpoints documentation
2. `compass_artifact_wf_42a13dbc_408e_4ddc_b987_09a3f25be2b3_text_markdown.md` - Implementation guide for listings management

## Working with This Repository

Since this is a Google Apps Script project:

- Focus on the simple-oauth implementation for all development
- Maintain the two-file structure (Code.gs and Sidebar.html)
- Test functionality through the Google Sheets UI
- Ensure code examples are correct and follow best practices
- Update documentation when adding features

## Important Commands

Since this is a Google Apps Script project, there are no build/test/lint commands. The development workflow is:
1. Copy code to Google Apps Script editor
2. Save project
3. Reload spreadsheet
4. Test functionality through the UI

## Python Port Considerations

When porting to Python:
- Replace PropertiesService with environment variables or config files
- Replace UrlFetchApp with requests library
- Replace SpreadsheetApp with pandas/CSV operations
- Implement PKCE manually (hashlib for SHA256)
- Use OAuth libraries like authlib or requests-oauthlib
- Consider async operations for bulk uploads

Remember: The simple-oauth implementation is the definitive version and should be used as the reference for all development work.