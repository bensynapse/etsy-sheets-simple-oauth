/**
 * Simple Etsy API Tester for Google Sheets
 * Just API key authentication - no OAuth needed for public endpoints
 */

const ETSY_API_BASE = 'https://api.etsy.com/v3/application';

// Menu setup
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Etsy API')
    .addItem('Open Control Panel', 'showSidebar')
    .addItem('Test Connection', 'testConnection')
    .addToUi();
    
  initializeSheet();
}

// Initialize sheet
function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Etsy Data');
  
  if (!sheet) {
    sheet = ss.insertSheet('Etsy Data');
    sheet.getRange('A1:E1').setValues([['Timestamp', 'Endpoint', 'Status', 'Data', 'Error']]);
    sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#f0f0f0');
    sheet.setFrozenRows(1);
  }
}

// Show sidebar
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Etsy API Tester')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Test API connection
function testConnection() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY');
  
  if (!apiKey) {
    return { success: false, error: 'API Key not set. Use the sidebar to add it.' };
  }
  
  try {
    const response = UrlFetchApp.fetch(`${ETSY_API_BASE}/openapi-ping`, {
      headers: { 'x-api-key': apiKey },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      logToSheet('/openapi-ping', 'Success', 'Connection successful');
      return { success: true, message: 'Connection successful!' };
    } else {
      logToSheet('/openapi-ping', 'Failed', '', response.getContentText());
      return { success: false, error: 'Invalid API key or connection failed' };
    }
  } catch (error) {
    logToSheet('/openapi-ping', 'Error', '', error.toString());
    return { success: false, error: error.toString() };
  }
}

// Save API key
function saveApiKey(apiKey) {
  if (!apiKey) throw new Error('API key cannot be empty');
  PropertiesService.getScriptProperties().setProperty('ETSY_API_KEY', apiKey);
  return { success: true };
}

// Get shop by ID (public endpoint)
function getShop(shopId) {
  if (!shopId) throw new Error('Shop ID is required');
  
  const apiKey = PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY');
  if (!apiKey) throw new Error('API Key not set');
  
  try {
    const response = UrlFetchApp.fetch(`${ETSY_API_BASE}/shops/${shopId}`, {
      headers: { 'x-api-key': apiKey },
      muteHttpExceptions: true
    });
    
    const data = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200) {
      logToSheet(`/shops/${shopId}`, 'Success', JSON.stringify(data));
      return { success: true, data: data };
    } else {
      logToSheet(`/shops/${shopId}`, 'Failed', '', data.error || 'Unknown error');
      return { success: false, error: data.error || 'Failed to get shop' };
    }
  } catch (error) {
    logToSheet(`/shops/${shopId}`, 'Error', '', error.toString());
    return { success: false, error: error.toString() };
  }
}

// Get active listings by shop (public endpoint)
function getListingsByShop(shopId, limit = 10) {
  if (!shopId) throw new Error('Shop ID is required');
  
  const apiKey = PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY');
  if (!apiKey) throw new Error('API Key not set');
  
  try {
    const response = UrlFetchApp.fetch(
      `${ETSY_API_BASE}/shops/${shopId}/listings/active?limit=${limit}`, 
      {
        headers: { 'x-api-key': apiKey },
        muteHttpExceptions: true
      }
    );
    
    const data = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200) {
      logToSheet(`/shops/${shopId}/listings/active`, 'Success', `Found ${data.count} listings`);
      return { success: true, data: data };
    } else {
      logToSheet(`/shops/${shopId}/listings/active`, 'Failed', '', data.error || 'Unknown error');
      return { success: false, error: data.error || 'Failed to get listings' };
    }
  } catch (error) {
    logToSheet(`/shops/${shopId}/listings/active`, 'Error', '', error.toString());
    return { success: false, error: error.toString() };
  }
}

// Search listings (public endpoint)
function searchListings(keywords, limit = 10) {
  if (!keywords) throw new Error('Keywords are required');
  
  const apiKey = PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY');
  if (!apiKey) throw new Error('API Key not set');
  
  try {
    const url = `${ETSY_API_BASE}/listings/active?keywords=${encodeURIComponent(keywords)}&limit=${limit}`;
    const response = UrlFetchApp.fetch(url, {
      headers: { 'x-api-key': apiKey },
      muteHttpExceptions: true
    });
    
    const data = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200) {
      logToSheet('/listings/active', 'Success', `Found ${data.count} listings for "${keywords}"`);
      return { success: true, data: data };
    } else {
      logToSheet('/listings/active', 'Failed', '', data.error || 'Unknown error');
      return { success: false, error: data.error || 'Failed to search listings' };
    }
  } catch (error) {
    logToSheet('/listings/active', 'Error', '', error.toString());
    return { success: false, error: error.toString() };
  }
}

// Get taxonomy (public endpoint)
function getTaxonomy() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY');
  if (!apiKey) throw new Error('API Key not set');
  
  try {
    const response = UrlFetchApp.fetch(`${ETSY_API_BASE}/seller-taxonomy/nodes`, {
      headers: { 'x-api-key': apiKey },
      muteHttpExceptions: true
    });
    
    const data = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200) {
      logToSheet('/seller-taxonomy/nodes', 'Success', `Found ${data.count} categories`);
      return { success: true, data: data };
    } else {
      logToSheet('/seller-taxonomy/nodes', 'Failed', '', data.error || 'Unknown error');
      return { success: false, error: data.error || 'Failed to get taxonomy' };
    }
  } catch (error) {
    logToSheet('/seller-taxonomy/nodes', 'Error', '', error.toString());
    return { success: false, error: error.toString() };
  }
}

// Import shop data to new sheet
function importShopToSheet(shopId) {
  const result = getShop(shopId);
  if (!result.success) throw new Error(result.error);
  
  const shop = result.data;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create or get shop sheet
  let sheet = ss.getSheetByName('Shop Info');
  if (!sheet) {
    sheet = ss.insertSheet('Shop Info');
  } else {
    sheet.clear();
  }
  
  // Add headers and data
  const data = [
    ['Field', 'Value'],
    ['Shop ID', shop.shop_id],
    ['Shop Name', shop.shop_name],
    ['Title', shop.title],
    ['Currency', shop.currency_code],
    ['Active Listings', shop.listing_active_count],
    ['Created', new Date(shop.create_date * 1000).toLocaleDateString()],
    ['Updated', new Date(shop.update_date * 1000).toLocaleDateString()],
    ['URL', shop.url],
    ['Announcement', shop.announcement || 'None'],
    ['Sale Message', shop.sale_message || 'None']
  ];
  
  sheet.getRange(1, 1, data.length, 2).setValues(data);
  sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#f0f0f0');
  sheet.autoResizeColumns(1, 2);
  
  return { success: true, message: 'Shop data imported!' };
}

// Import listings to sheet
function importListingsToSheet(shopId) {
  const result = getListingsByShop(shopId, 25);
  if (!result.success) throw new Error(result.error);
  
  const listings = result.data.results;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create or get listings sheet
  let sheet = ss.getSheetByName('Listings');
  if (!sheet) {
    sheet = ss.insertSheet('Listings');
  } else {
    sheet.clear();
  }
  
  // Add headers
  const headers = ['Listing ID', 'Title', 'Price', 'Currency', 'Quantity', 'State', 'Views', 'URL'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f0f0f0');
  
  // Add data
  if (listings && listings.length > 0) {
    const data = listings.map(listing => [
      listing.listing_id,
      listing.title,
      listing.price.amount / listing.price.divisor,
      listing.price.currency_code,
      listing.quantity,
      listing.state,
      listing.views,
      listing.url
    ]);
    
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
    sheet.setFrozenRows(1);
    
    // Format price column
    sheet.getRange(2, 3, data.length, 1).setNumberFormat('$#,##0.00');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);
  }
  
  return { success: true, message: `Imported ${listings.length} listings!` };
}

// Log to sheet
function logToSheet(endpoint, status, data, error) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Etsy Data');
  const timestamp = new Date();
  
  sheet.appendRow([
    timestamp,
    endpoint,
    status,
    data || '',
    error || ''
  ]);
  
  // Keep only last 100 entries
  if (sheet.getLastRow() > 101) {
    sheet.deleteRow(2);
  }
}

// Clear logs
function clearLogs() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Etsy Data');
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true, message: 'Logs cleared!' };
}

// Get current API key status
function getApiKeyStatus() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY');
  return { hasKey: !!apiKey };
}