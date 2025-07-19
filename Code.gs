/**
 * Etsy API Integration for Google Sheets
 * Main entry point and menu initialization
 */

// Menu creation on sheet open
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Etsy API Tools')
    .addItem('Test Connection', 'testConnection')
    .addItem('Connect to Etsy', 'startOAuthFlow')
    .addSeparator()
    .addSubMenu(ui.createMenu('Import Data')
      .addItem('Import Shop Info', 'importShopInfo')
      .addItem('Import Listings', 'importListings')
      .addItem('Import Recent Orders', 'importOrders')
      .addItem('Import All Data', 'importAllData'))
    .addSubMenu(ui.createMenu('Refresh Data')
      .addItem('Refresh Listings', 'refreshListings')
      .addItem('Refresh Orders', 'refreshOrders'))
    .addSeparator()
    .addItem('Settings', 'showSettingsSidebar')
    .addItem('Help', 'showHelp')
    .addToUi();
  
  // Initialize sheets if needed
  initializeSheets();
}

// Initialize required sheets
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const requiredSheets = [
    'Dashboard',
    'Settings',
    'Shops',
    'Listings',
    'Orders',
    'Inventory',
    'API Logs',
    'Data Dictionary'
  ];
  
  requiredSheets.forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      const sheet = ss.insertSheet(sheetName);
      setupSheet(sheet, sheetName);
    }
  });
  
  // Set Dashboard as active sheet
  ss.getSheetByName('Dashboard').activate();
}

// Setup sheet templates
function setupSheet(sheet, sheetName) {
  switch(sheetName) {
    case 'Dashboard':
      setupDashboard(sheet);
      break;
    case 'Settings':
      setupSettings(sheet);
      break;
    case 'Shops':
      setupShopsSheet(sheet);
      break;
    case 'Listings':
      setupListingsSheet(sheet);
      break;
    case 'Orders':
      setupOrdersSheet(sheet);
      break;
    case 'Inventory':
      setupInventorySheet(sheet);
      break;
    case 'API Logs':
      setupAPILogsSheet(sheet);
      break;
    case 'Data Dictionary':
      setupDataDictionary(sheet);
      break;
  }
}

// Dashboard setup
function setupDashboard(sheet) {
  const values = [
    ['ETSY API DASHBOARD'],
    [''],
    ['Connection Status:', 'Not Connected'],
    ['Last Update:', 'Never'],
    [''],
    ['Quick Stats'],
    ['Active Listings:', '0'],
    ['Pending Orders:', '0'],
    ['Today\'s Revenue:', '$0.00'],
    ['API Calls Today:', '0 / 10,000'],
    [''],
    ['Actions'],
    ['Click Etsy API Tools menu to get started']
  ];
  
  sheet.getRange(1, 1, values.length, 2).setValues(values);
  
  // Formatting
  sheet.getRange('A1:B1').merge()
    .setFontSize(18)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#1F2937');
    
  sheet.getRange('A6').setFontWeight('bold').setBackground('#E5E7EB');
  sheet.getRange('A12').setFontWeight('bold').setBackground('#E5E7EB');
  
  // Status formatting
  sheet.getRange('B3').setFontWeight('bold');
  
  // Column widths
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 300);
}

// Settings sheet setup
function setupSettings(sheet) {
  const values = [
    ['API Configuration'],
    [''],
    ['API Key:', ''],
    ['Shop ID:', ''],
    ['Auth Status:', 'Not Connected'],
    ['Token Expires:', ''],
    [''],
    ['Import Settings'],
    ['Auto-refresh:', 'FALSE'],
    ['Refresh Rate (minutes):', '15'],
    ['Max Records:', '100'],
    [''],
    ['OAuth Settings'],
    ['Client ID:', ''],
    ['Redirect URI:', ''],
    ['Scopes:', 'listings_r listings_w shops_r shops_w transactions_r']
  ];
  
  sheet.getRange(1, 1, values.length, 2).setValues(values);
  
  // Formatting
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold').setBackground('#1F2937');
  sheet.getRange('A8').setFontSize(14).setFontWeight('bold').setBackground('#E5E7EB');
  sheet.getRange('A13').setFontSize(14).setFontWeight('bold').setBackground('#E5E7EB');
  
  // Protect sensitive cells
  const protection = sheet.getRange('B3').protect();
  protection.setDescription('API Key - Protected');
  
  // Column widths
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 400);
  
  // Add data validation for boolean
  const booleanRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .build();
  sheet.getRange('B9').setDataValidation(booleanRule);
}

// Shops sheet setup
function setupShopsSheet(sheet) {
  const headers = [
    'Shop ID', 'Shop Name', 'Currency', 'Title', 'Announcement',
    'Sale Message', 'Digital Sale Message', 'Listing Active Count',
    'Digital Listing Count', 'Login Name', 'Created Date', 'Updated Date'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold')
    .setBackground('#F3F4F6');
    
  sheet.setFrozenRows(1);
}

// Listings sheet setup
function setupListingsSheet(sheet) {
  const headers = [
    'Listing ID', 'Title', 'Description', 'Price', 'Currency', 'Quantity',
    'SKU', 'Status', 'URL', 'Tags', 'Materials', 'Section ID',
    'Featured Rank', 'Views', 'Favorites', 'Created', 'Updated'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold')
    .setBackground('#F3F4F6');
    
  sheet.setFrozenRows(1);
}

// Orders sheet setup
function setupOrdersSheet(sheet) {
  const headers = [
    'Receipt ID', 'Order Date', 'Customer Name', 'Customer Email',
    'Items Count', 'Order Total', 'Currency', 'Status', 'Payment Method',
    'Shipped Date', 'Tracking Code', 'Tracking URL', 'Ship To Name',
    'Ship To Address', 'Note to Seller', 'Gift Message'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold')
    .setBackground('#F3F4F6');
    
  sheet.setFrozenRows(1);
}

// Inventory sheet setup
function setupInventorySheet(sheet) {
  const headers = [
    'Listing ID', 'Product ID', 'SKU', 'Property 1 Name', 'Property 1 Value',
    'Property 2 Name', 'Property 2 Value', 'Price', 'Quantity', 'Is Enabled',
    'Is Deleted', 'Last Updated'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold')
    .setBackground('#F3F4F6');
    
  sheet.setFrozenRows(1);
}

// API Logs sheet setup
function setupAPILogsSheet(sheet) {
  const headers = [
    'Timestamp', 'Endpoint', 'Method', 'Status', 'Response Time (ms)',
    'Error Message', 'Rate Limit Remaining'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold')
    .setBackground('#F3F4F6');
    
  sheet.setFrozenRows(1);
}

// Data Dictionary setup
function setupDataDictionary(sheet) {
  const data = [
    ['Field Name', 'Description', 'Data Type', 'Example'],
    ['listing_id', 'Unique identifier for a listing', 'Integer', '1234567890'],
    ['title', 'Title of the listing', 'String', 'Handmade Ceramic Mug'],
    ['price', 'Price in shop currency', 'Float', '25.99'],
    ['quantity', 'Available quantity', 'Integer', '10'],
    ['sku', 'Stock keeping unit', 'String', 'MUG-BLUE-001'],
    ['state', 'Listing state', 'String', 'active, inactive, sold_out, expired'],
    ['receipt_id', 'Unique order identifier', 'Integer', '9876543210'],
    ['shipped_date', 'Date order was shipped', 'Timestamp', '2024-01-19T10:30:00Z']
  ];
  
  sheet.getRange(1, 1, data.length, 4).setValues(data);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#F3F4F6');
  sheet.setFrozenRows(1);
  
  // Column widths
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 200);
}

// Test connection function
function testConnection() {
  try {
    showLoadingDialog('Testing Connection...');
    
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API Key not configured. Please set up in Settings sheet.');
    }
    
    // Test with ping endpoint
    const response = testApiConnection();
    
    if (response.success) {
      // Update dashboard
      updateDashboardStatus('Connected', new Date().toLocaleString());
      
      // Test OAuth if available
      const authStatus = testOAuthConnection();
      
      SpreadsheetApp.getUi().alert(
        'Connection Test Results',
        `API Key: ✓ Valid\n` +
        `OAuth: ${authStatus.connected ? '✓ Connected' : '✗ Not Connected'}\n` +
        `Rate Limits: ${authStatus.rateLimits || 'N/A'}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Connection Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  } finally {
    closeLoadingDialog();
  }
}

// Import all data
function importAllData() {
  try {
    showLoadingDialog('Importing all data...');
    
    importShopInfo();
    Utilities.sleep(1000); // Respect rate limits
    
    importListings();
    Utilities.sleep(1000);
    
    importOrders();
    
    SpreadsheetApp.getUi().alert('Success', 'All data imported successfully!', SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Import Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  } finally {
    closeLoadingDialog();
  }
}

// Helper functions
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY') || 
         SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings').getRange('B3').getValue();
}

function updateDashboardStatus(status, lastUpdate) {
  const dashboard = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dashboard');
  dashboard.getRange('B3').setValue(status);
  dashboard.getRange('B4').setValue(lastUpdate);
  
  // Color code status
  const color = status === 'Connected' ? '#10B981' : '#EF4444';
  dashboard.getRange('B3').setFontColor(color);
}

function showLoadingDialog(message) {
  const html = HtmlService.createHtmlOutput(`
    <div style="padding: 20px; text-align: center;">
      <p>${message}</p>
      <img src="https://www.gstatic.com/images/branding/product/2x/apps_script_48dp.png" />
    </div>
  `).setWidth(250).setHeight(150);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Processing');
}

function closeLoadingDialog() {
  const html = HtmlService.createHtmlOutput('<script>google.script.host.close();</script>');
  SpreadsheetApp.getUi().showModalDialog(html, 'Complete');
}

// OAuth flow starter (placeholder - implemented in OAuth.gs)
function startOAuthFlow() {
  // This will be implemented in OAuth.gs
  SpreadsheetApp.getUi().alert('OAuth flow will be implemented in OAuth.gs');
}

// Import functions (placeholders - implemented in EtsyAPI.gs)
function importShopInfo() {
  // Implemented in EtsyAPI.gs
  logApiCall('Import Shop Info', 'Started');
}

function importListings() {
  // Implemented in EtsyAPI.gs
  logApiCall('Import Listings', 'Started');
}

function importOrders() {
  // Implemented in EtsyAPI.gs
  logApiCall('Import Orders', 'Started');
}

function refreshListings() {
  importListings();
}

function refreshOrders() {
  importOrders();
}

// Settings sidebar
function showSettingsSidebar() {
  const html = HtmlService.createTemplateFromFile('SettingsSidebar')
    .evaluate()
    .setTitle('Etsy API Settings')
    .setWidth(300);
    
  SpreadsheetApp.getUi().showSidebar(html);
}

// Help dialog
function showHelp() {
  const helpText = `
Etsy API Integration Help

1. First Time Setup:
   - Add your API Key in Settings sheet
   - Click "Connect to Etsy" to authenticate
   - Test connection to verify setup

2. Importing Data:
   - Use Import Data menu to fetch data
   - Data will populate respective sheets
   - Check API Logs for any errors

3. Rate Limits:
   - 10,000 requests per day
   - 10 requests per second
   - Monitor usage in Dashboard

4. Troubleshooting:
   - Check API Logs sheet for errors
   - Verify API key is correct
   - Ensure OAuth is connected

For more help, visit:
https://developers.etsy.com/documentation/
  `;
  
  SpreadsheetApp.getUi().alert('Help', helpText, SpreadsheetApp.getUi().ButtonSet.OK);
}

// Logging function
function logApiCall(endpoint, status, errorMessage = '', responseTime = 0, rateLimitRemaining = '') {
  const logsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('API Logs');
  const timestamp = new Date();
  
  logsSheet.appendRow([
    timestamp,
    endpoint,
    'GET',
    status,
    responseTime,
    errorMessage,
    rateLimitRemaining
  ]);
}

// Placeholder functions for API testing
function testApiConnection() {
  // This will be implemented in EtsyAPI.gs
  return { success: true };
}

function testOAuthConnection() {
  // This will be implemented in OAuth.gs
  return { connected: false, rateLimits: 'Not available without OAuth' };
}