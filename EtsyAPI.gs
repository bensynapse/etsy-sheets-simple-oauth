/**
 * Etsy API v3 wrapper functions
 * Handles all API calls to Etsy endpoints
 */

const ETSY_API_BASE = 'https://api.etsy.com/v3/application';

/**
 * Make authenticated API request to Etsy
 */
function makeEtsyRequest(endpoint, method = 'GET', payload = null) {
  const startTime = new Date().getTime();
  
  try {
    const apiKey = getApiKey();
    const accessToken = getAccessToken();
    
    const options = {
      'method': method,
      'headers': {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      'muteHttpExceptions': true
    };
    
    if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.headers['Content-Type'] = 'application/json';
      options.payload = JSON.stringify(payload);
    }
    
    const response = UrlFetchApp.fetch(`${ETSY_API_BASE}${endpoint}`, options);
    const responseTime = new Date().getTime() - startTime;
    
    // Get rate limit info from headers
    const rateLimitRemaining = response.getHeaders()['x-remaining-today'] || '';
    
    // Log API call
    const status = response.getResponseCode();
    logApiCall(endpoint, status, '', responseTime, rateLimitRemaining);
    
    if (status === 200 || status === 201) {
      return JSON.parse(response.getContentText());
    } else {
      const error = JSON.parse(response.getContentText());
      throw new Error(error.error || `API Error: ${status}`);
    }
    
  } catch (error) {
    const responseTime = new Date().getTime() - startTime;
    logApiCall(endpoint, 'Error', error.toString(), responseTime);
    throw error;
  }
}

/**
 * Test API connection with ping endpoint
 */
function testApiConnection() {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API Key not configured');
    }
    
    const options = {
      'method': 'GET',
      'headers': {
        'x-api-key': apiKey
      },
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch('https://api.etsy.com/v3/application/openapi-ping', options);
    
    if (response.getResponseCode() === 200) {
      return { success: true };
    } else {
      return { success: false, error: 'Invalid API key' };
    }
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get current user information
 */
function getCurrentUser() {
  return makeEtsyRequest('/users/me');
}

/**
 * Get user's shops
 */
function getUserShops() {
  try {
    const user = getCurrentUser();
    return makeEtsyRequest(`/users/${user.user_id}/shops`);
  } catch (error) {
    throw new Error('Failed to get user shops: ' + error.toString());
  }
}

/**
 * Import shop information to sheet
 */
function importShopInfo() {
  try {
    showLoadingDialog('Importing shop information...');
    
    // Get shops data
    const shopsData = getUserShops();
    
    if (!shopsData.results || shopsData.results.length === 0) {
      throw new Error('No shops found for this user');
    }
    
    // Clear existing data
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Shops');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
    }
    
    // Prepare data for sheet
    const shops = shopsData.results;
    const shopRows = shops.map(shop => [
      shop.shop_id,
      shop.shop_name,
      shop.currency_code,
      shop.title || '',
      shop.announcement || '',
      shop.sale_message || '',
      shop.digital_sale_message || '',
      shop.listing_active_count || 0,
      shop.digital_listing_count || 0,
      shop.login_name || '',
      shop.create_date ? new Date(shop.create_date * 1000) : '',
      shop.update_date ? new Date(shop.update_date * 1000) : ''
    ]);
    
    // Write to sheet
    if (shopRows.length > 0) {
      sheet.getRange(2, 1, shopRows.length, shopRows[0].length).setValues(shopRows);
    }
    
    // Store first shop ID in settings for convenience
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    settingsSheet.getRange('B4').setValue(shops[0].shop_id);
    
    // Update dashboard
    const dashboardSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dashboard');
    dashboardSheet.getRange('B7').setValue(shops[0].listing_active_count || 0);
    
    SpreadsheetApp.getUi().alert('Success', `Imported ${shops.length} shop(s)`, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Import Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  } finally {
    closeLoadingDialog();
  }
}

/**
 * Get shop listings
 */
function getShopListings(shopId, limit = 100, offset = 0) {
  return makeEtsyRequest(`/shops/${shopId}/listings?limit=${limit}&offset=${offset}&state=active`);
}

/**
 * Import listings to sheet
 */
function importListings() {
  try {
    showLoadingDialog('Importing listings...');
    
    // Get shop ID
    const shopId = getShopId();
    if (!shopId) {
      throw new Error('Shop ID not found. Please import shop info first.');
    }
    
    // Get settings
    const maxRecords = getMaxRecords();
    
    // Fetch listings
    let allListings = [];
    let offset = 0;
    const limit = Math.min(100, maxRecords);
    
    while (allListings.length < maxRecords) {
      const listingsData = getShopListings(shopId, limit, offset);
      
      if (!listingsData.results || listingsData.results.length === 0) {
        break;
      }
      
      allListings = allListings.concat(listingsData.results);
      
      if (listingsData.results.length < limit) {
        break;
      }
      
      offset += limit;
      Utilities.sleep(100); // Rate limiting
    }
    
    // Trim to max records
    allListings = allListings.slice(0, maxRecords);
    
    // Clear existing data
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Listings');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
    }
    
    // Prepare data for sheet
    const listingRows = allListings.map(listing => [
      listing.listing_id,
      listing.title,
      listing.description ? listing.description.substring(0, 500) : '', // Truncate long descriptions
      listing.price ? listing.price.amount / listing.price.divisor : 0,
      listing.price ? listing.price.currency_code : '',
      listing.quantity,
      listing.sku ? listing.sku.join(', ') : '',
      listing.state,
      listing.url,
      listing.tags ? listing.tags.join(', ') : '',
      listing.materials ? listing.materials.join(', ') : '',
      listing.shop_section_id || '',
      listing.featured_rank || '',
      listing.views || 0,
      listing.num_favorers || 0,
      listing.created_timestamp ? new Date(listing.created_timestamp * 1000) : '',
      listing.updated_timestamp ? new Date(listing.updated_timestamp * 1000) : ''
    ]);
    
    // Write to sheet
    if (listingRows.length > 0) {
      sheet.getRange(2, 1, listingRows.length, listingRows[0].length).setValues(listingRows);
    }
    
    // Update dashboard
    const dashboardSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dashboard');
    dashboardSheet.getRange('B7').setValue(allListings.length);
    
    // Also import inventory for these listings
    importInventoryForListings(allListings.slice(0, 10)); // Import inventory for first 10 listings
    
    SpreadsheetApp.getUi().alert('Success', `Imported ${allListings.length} listing(s)`, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Import Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  } finally {
    closeLoadingDialog();
  }
}

/**
 * Get listing inventory
 */
function getListingInventory(listingId) {
  return makeEtsyRequest(`/listings/${listingId}/inventory`);
}

/**
 * Import inventory for specific listings
 */
function importInventoryForListings(listings) {
  try {
    const inventorySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
    
    // Clear existing data
    const lastRow = inventorySheet.getLastRow();
    if (lastRow > 1) {
      inventorySheet.getRange(2, 1, lastRow - 1, inventorySheet.getLastColumn()).clear();
    }
    
    let allInventoryRows = [];
    
    for (const listing of listings) {
      try {
        const inventory = getListingInventory(listing.listing_id);
        
        if (inventory.products) {
          for (const product of inventory.products) {
            // Extract property values
            let prop1Name = '', prop1Value = '', prop2Name = '', prop2Value = '';
            
            if (product.property_values && product.property_values.length > 0) {
              prop1Name = product.property_values[0].property_name;
              prop1Value = product.property_values[0].values.join(', ');
              
              if (product.property_values.length > 1) {
                prop2Name = product.property_values[1].property_name;
                prop2Value = product.property_values[1].values.join(', ');
              }
            }
            
            // Get offering details
            const offering = product.offerings && product.offerings[0] ? product.offerings[0] : {};
            const price = offering.price ? offering.price.amount / offering.price.divisor : 0;
            
            allInventoryRows.push([
              listing.listing_id,
              product.product_id,
              product.sku || '',
              prop1Name,
              prop1Value,
              prop2Name,
              prop2Value,
              price,
              offering.quantity || 0,
              offering.is_enabled || false,
              product.is_deleted || false,
              new Date()
            ]);
          }
        }
        
        Utilities.sleep(100); // Rate limiting
        
      } catch (error) {
        console.error(`Failed to get inventory for listing ${listing.listing_id}:`, error);
      }
    }
    
    // Write to sheet
    if (allInventoryRows.length > 0) {
      inventorySheet.getRange(2, 1, allInventoryRows.length, allInventoryRows[0].length).setValues(allInventoryRows);
    }
    
  } catch (error) {
    console.error('Inventory import error:', error);
  }
}

/**
 * Get shop receipts (orders)
 */
function getShopReceipts(shopId, limit = 100, offset = 0) {
  return makeEtsyRequest(`/shops/${shopId}/receipts?limit=${limit}&offset=${offset}`);
}

/**
 * Import orders to sheet
 */
function importOrders() {
  try {
    showLoadingDialog('Importing orders...');
    
    // Get shop ID
    const shopId = getShopId();
    if (!shopId) {
      throw new Error('Shop ID not found. Please import shop info first.');
    }
    
    // Get settings
    const maxRecords = getMaxRecords();
    
    // Fetch receipts
    let allReceipts = [];
    let offset = 0;
    const limit = Math.min(100, maxRecords);
    
    while (allReceipts.length < maxRecords) {
      const receiptsData = getShopReceipts(shopId, limit, offset);
      
      if (!receiptsData.results || receiptsData.results.length === 0) {
        break;
      }
      
      allReceipts = allReceipts.concat(receiptsData.results);
      
      if (receiptsData.results.length < limit) {
        break;
      }
      
      offset += limit;
      Utilities.sleep(100); // Rate limiting
    }
    
    // Trim to max records
    allReceipts = allReceipts.slice(0, maxRecords);
    
    // Clear existing data
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
    }
    
    // Prepare data for sheet
    const orderRows = allReceipts.map(receipt => {
      // Count items in transactions
      const itemCount = receipt.transactions ? receipt.transactions.reduce((sum, t) => sum + t.quantity, 0) : 0;
      
      // Get tracking info from shipments
      let trackingCode = '', trackingUrl = '';
      if (receipt.shipments && receipt.shipments.length > 0) {
        trackingCode = receipt.shipments[0].tracking_code || '';
        trackingUrl = receipt.shipments[0].tracking_url || '';
      }
      
      return [
        receipt.receipt_id,
        receipt.created_timestamp ? new Date(receipt.created_timestamp * 1000) : '',
        receipt.name || '',
        receipt.buyer_email || '',
        itemCount,
        receipt.grandtotal ? receipt.grandtotal.amount / receipt.grandtotal.divisor : 0,
        receipt.grandtotal ? receipt.grandtotal.currency_code : '',
        receipt.status || '',
        receipt.payment_method || '',
        receipt.shipped_timestamp ? new Date(receipt.shipped_timestamp * 1000) : '',
        trackingCode,
        trackingUrl,
        receipt.formatted_address ? receipt.formatted_address.name : '',
        receipt.formatted_address ? 
          [receipt.formatted_address.first_line, 
           receipt.formatted_address.second_line,
           receipt.formatted_address.city,
           receipt.formatted_address.state,
           receipt.formatted_address.zip,
           receipt.formatted_address.country_name].filter(Boolean).join(', ') : '',
        receipt.message_from_buyer || '',
        receipt.gift_message || ''
      ];
    });
    
    // Write to sheet
    if (orderRows.length > 0) {
      sheet.getRange(2, 1, orderRows.length, orderRows[0].length).setValues(orderRows);
    }
    
    // Update dashboard
    const dashboardSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dashboard');
    const pendingOrders = allReceipts.filter(r => r.status === 'Paid').length;
    dashboardSheet.getRange('B8').setValue(pendingOrders);
    
    // Calculate today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime() / 1000;
    
    const todaysRevenue = allReceipts
      .filter(r => r.created_timestamp >= todayTimestamp)
      .reduce((sum, r) => sum + (r.grandtotal ? r.grandtotal.amount / r.grandtotal.divisor : 0), 0);
    
    dashboardSheet.getRange('B9').setValue(`$${todaysRevenue.toFixed(2)}`);
    
    SpreadsheetApp.getUi().alert('Success', `Imported ${allReceipts.length} order(s)`, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Import Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  } finally {
    closeLoadingDialog();
  }
}

/**
 * Get available Etsy endpoints for reference
 */
function getAvailableEndpoints() {
  return [
    // Shop Management
    '/shops/{shop_id}',
    '/shops/{shop_id}/sections',
    '/shops/{shop_id}/shipping-profiles',
    
    // Listing Management
    '/shops/{shop_id}/listings',
    '/listings/{listing_id}',
    '/listings/{listing_id}/inventory',
    '/listings/{listing_id}/images',
    '/listings/{listing_id}/files',
    
    // Order Management
    '/shops/{shop_id}/receipts',
    '/shops/{shop_id}/receipts/{receipt_id}',
    '/shops/{shop_id}/receipts/{receipt_id}/tracking',
    '/shops/{shop_id}/receipts/{receipt_id}/transactions',
    
    // Financial
    '/shops/{shop_id}/payments',
    '/shops/{shop_id}/payment-account/ledger-entries',
    
    // User
    '/users/me',
    '/users/{user_id}/shops',
    
    // Taxonomy
    '/seller-taxonomy/nodes',
    '/buyer-taxonomy/nodes',
    
    // Other
    '/regions',
    '/shipping-carriers'
  ];
}

// Helper functions

/**
 * Get shop ID from settings
 */
function getShopId() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  return settingsSheet.getRange('B4').getValue();
}

/**
 * Get max records setting
 */
function getMaxRecords() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  return settingsSheet.getRange('B11').getValue() || 100;
}

/**
 * Update inventory for a specific listing
 */
function updateListingInventory(listingId, inventoryData) {
  return makeEtsyRequest(`/listings/${listingId}/inventory`, 'PUT', inventoryData);
}

/**
 * Create a draft listing
 */
function createDraftListing(shopId, listingData) {
  return makeEtsyRequest(`/shops/${shopId}/listings`, 'POST', listingData);
}

/**
 * Update listing
 */
function updateListing(shopId, listingId, updateData) {
  return makeEtsyRequest(`/shops/${shopId}/listings/${listingId}`, 'PATCH', updateData);
}

/**
 * Get shipping carriers
 */
function getShippingCarriers(originCountryIso) {
  return makeEtsyRequest(`/shipping-carriers?origin_country_iso=${originCountryIso}`);
}