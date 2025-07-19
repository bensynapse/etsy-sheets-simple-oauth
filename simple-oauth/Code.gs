/**
 * Simple Etsy API with OAuth - No Web App Required
 * Uses manual OAuth flow with copy/paste
 */

const ETSY_API_BASE = 'https://api.etsy.com/v3/application';
const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

// Menu setup
function onOpen(e) {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Etsy API')
      .addItem('Open Control Panel', 'showSidebar')
      .addItem('Test Connection', 'quickTest')
      .addToUi();
  } catch (error) {
    // This error occurs when running in script editor
    console.log('Menu will be created when spreadsheet is opened');
  }
}

// Show sidebar
function showSidebar() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Etsy API Control')
      .setWidth(350);
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (error) {
    throw new Error('Please run this function from the spreadsheet menu, not the script editor');
  }
}

// Test function for script editor
function testSetup() {
  console.log('Setup test:');
  console.log('- Script is ready');
  console.log('- Open your spreadsheet and use the "Etsy API" menu');
  
  const status = getStatus();
  console.log('- API Key set:', status.hasApiKey);
  console.log('- Authenticated:', status.isAuthenticated);
}

// Quick connection test
function quickTest() {
  const result = testConnection();
  SpreadsheetApp.getUi().alert(
    result.success ? 'Connected!' : 'Not Connected',
    result.message,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// Save credentials
function saveCredentials(apiKey, clientId) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ETSY_API_KEY', apiKey);
  // For Etsy v3, the API key IS the client ID
  props.setProperty('ETSY_CLIENT_ID', apiKey);
  return { success: true };
}

// Generate PKCE verifier and challenge
function generatePKCE() {
  const verifier = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
  const challenge = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier)
  ).replace(/=+$/, '');
  
  PropertiesService.getUserProperties().setProperty('pkce_verifier', verifier);
  
  return { verifier, challenge };
}

// Build OAuth URL
function getAuthUrl() {
  const props = PropertiesService.getScriptProperties();
  const clientId = props.getProperty('ETSY_CLIENT_ID');
  
  if (!clientId) {
    throw new Error('Please set Client ID first');
  }
  
  const pkce = generatePKCE();
  const state = Utilities.getUuid();
  
  const params = {
    response_type: 'code',
    redirect_uri: 'http://localhost',
    scope: 'listings_r listings_w listings_d shops_r shops_w transactions_r email_r',
    client_id: clientId,
    state: state,
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256'
  };
  
  const url = ETSY_AUTH_URL + '?' + Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
    
  return { url, state };
}

// Exchange code for token
function exchangeCodeForToken(code) {
  const props = PropertiesService.getScriptProperties();
  const clientId = props.getProperty('ETSY_CLIENT_ID');
  const verifier = PropertiesService.getUserProperties().getProperty('pkce_verifier');
  
  if (!clientId || !verifier) {
    throw new Error('Missing credentials or PKCE verifier');
  }
  
  const payload = {
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: 'http://localhost',
    code: code,
    code_verifier: verifier
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(ETSY_TOKEN_URL, options);
  const data = JSON.parse(response.getContentText());
  
  if (response.getResponseCode() === 200) {
    // Save tokens
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty('access_token', data.access_token);
    userProps.setProperty('refresh_token', data.refresh_token);
    userProps.setProperty('token_expires', new Date(Date.now() + data.expires_in * 1000).toISOString());
    
    return { success: true, message: 'Successfully connected to Etsy!' };
  } else {
    throw new Error(data.error_description || 'Failed to get token');
  }
}

// Refresh token if needed
function refreshTokenIfNeeded() {
  const userProps = PropertiesService.getUserProperties();
  const expires = userProps.getProperty('token_expires');
  const refreshToken = userProps.getProperty('refresh_token');
  
  if (!expires || !refreshToken) return false;
  
  const expiryTime = new Date(expires).getTime();
  const now = Date.now();
  
  if (now < expiryTime - 300000) return true; // 5 min buffer
  
  // Refresh the token
  const clientId = PropertiesService.getScriptProperties().getProperty('ETSY_CLIENT_ID');
  
  const payload = {
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(ETSY_TOKEN_URL, options);
  const data = JSON.parse(response.getContentText());
  
  if (response.getResponseCode() === 200) {
    userProps.setProperty('access_token', data.access_token);
    userProps.setProperty('refresh_token', data.refresh_token);
    userProps.setProperty('token_expires', new Date(Date.now() + data.expires_in * 1000).toISOString());
    return true;
  }
  
  return false;
}

// Make authenticated API request
function makeRequest(endpoint, method = 'GET', payload = null) {
  if (!refreshTokenIfNeeded()) {
    throw new Error('Not authenticated. Please connect to Etsy first.');
  }
  
  const props = PropertiesService.getScriptProperties();
  const userProps = PropertiesService.getUserProperties();
  
  const options = {
    method: method,
    headers: {
      'x-api-key': props.getProperty('ETSY_API_KEY'),
      'Authorization': 'Bearer ' + userProps.getProperty('access_token')
    },
    muteHttpExceptions: true
  };
  
  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  
  const response = UrlFetchApp.fetch(ETSY_API_BASE + endpoint, options);
  const data = JSON.parse(response.getContentText());
  
  if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
    return data;
  } else {
    throw new Error(data.error || 'API request failed');
  }
}

// Test connection
function testConnection() {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY');
    if (!apiKey) {
      return { success: false, message: 'API Key not set' };
    }
    
    // Test API key
    const response = UrlFetchApp.fetch(ETSY_API_BASE + '/openapi-ping', {
      headers: { 'x-api-key': apiKey },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      return { success: false, message: 'Invalid API key' };
    }
    
    // Test OAuth
    try {
      const user = makeRequest('/users/me');
      return { success: true, message: `Connected as: ${user.login_name}` };
    } catch (e) {
      return { success: true, message: 'API key valid, OAuth not connected' };
    }
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Get current user
function getCurrentUser() {
  return makeRequest('/users/me');
}

// Get user shops
function getUserShops() {
  try {
    const user = getCurrentUser();
    // If user has shop_id directly, return it in expected format
    if (user.shop_id) {
      const shop = makeRequest(`/shops/${user.shop_id}`);
      return { results: [shop], count: 1 };
    }
    
    // Otherwise try the shops endpoint
    const shops = makeRequest(`/users/${user.user_id}/shops`);
    
    // If single shop returned (not in results array), wrap it
    if (shops && shops.shop_id && !shops.results) {
      return { results: [shops], count: 1 };
    }
    
    return shops;
  } catch (e) {
    console.error('Error getting shops:', e);
    return { results: [], count: 0 };
  }
}

// Get shop receipts (orders)
function getShopReceipts(shopId, limit = 25) {
  return makeRequest(`/shops/${shopId}/receipts?limit=${limit}`);
}

// Get shop listings
function getShopListings(shopId, state = 'active', limit = 25) {
  return makeRequest(`/shops/${shopId}/listings?state=${state}&limit=${limit}`);
}

// Get shop shipping profiles
function getShippingProfiles(shopId) {
  try {
    return makeRequest(`/shops/${shopId}/shipping-profiles`);
  } catch (e) {
    console.error('Error getting shipping profiles:', e);
    return { results: [], count: 0 };
  }
}

// Get shop return policies
function getReturnPolicies(shopId) {
  try {
    return makeRequest(`/shops/${shopId}/policies/return`);
  } catch (e) {
    console.error('Error getting return policies:', e);
    return { results: [], count: 0 };
  }
}

// Create a basic return policy
function createReturnPolicy(shopId) {
  try {
    const policyData = {
      accepts_returns: true,
      accepts_exchanges: true,
      return_deadline: 30  // 30 days
    };
    
    const formData = Object.keys(policyData).map(key => {
      return `${key}=${encodeURIComponent(policyData[key])}`;
    }).join('&');
    
    const options = {
      'method': 'POST',
      'headers': {
        'Authorization': 'Bearer ' + getAccessToken(),
        'x-api-key': PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      'payload': formData,
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(`${ETSY_API_BASE}/shops/${shopId}/policies/return`, options);
    const result = JSON.parse(response.getContentText());
    
    console.log('Create return policy response:', response.getResponseCode());
    console.log('Result:', JSON.stringify(result));
    
    if (response.getResponseCode() === 201 || response.getResponseCode() === 200) {
      return result;
    } else {
      throw new Error(result.error || 'Failed to create return policy');
    }
  } catch (e) {
    console.error('Error creating return policy:', e);
    throw e;
  }
}

// Test shipping profiles directly
function testShippingProfiles() {
  try {
    const shopId = findUserShopId();
    if (!shopId) {
      console.log('No shop found');
      return;
    }
    
    console.log('Shop ID:', shopId);
    const profiles = getShippingProfiles(shopId);
    console.log('Shipping profiles:', JSON.stringify(profiles, null, 2));
    
    if (profiles.results && profiles.results.length > 0) {
      console.log('First profile ID:', profiles.results[0].shipping_profile_id);
    } else {
      console.log('No shipping profiles found');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

// Test return policies directly
function testReturnPolicies() {
  try {
    const shopId = findUserShopId();
    if (!shopId) {
      console.log('No shop found');
      return;
    }
    
    console.log('Shop ID:', shopId);
    const policies = getReturnPolicies(shopId);
    console.log('Return policies:', JSON.stringify(policies, null, 2));
    
    if (policies.results && policies.results.length > 0) {
      console.log('First policy ID:', policies.results[0].return_policy_id);
    } else {
      console.log('No return policies found');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

// Create a basic shipping profile
function createShippingProfile(shopId) {
  try {
    // Create a basic shipping profile with standard shipping
    const profileData = {
      title: 'Standard Shipping',
      origin_country_iso: 'US',
      primary_cost: '5.00',
      secondary_cost: '2.00',
      min_processing_days: 1,
      max_processing_days: 3
    };
    
    const formData = Object.keys(profileData).map(key => {
      return `${key}=${encodeURIComponent(profileData[key])}`;
    }).join('&');
    
    const options = {
      'method': 'POST',
      'headers': {
        'Authorization': 'Bearer ' + getAccessToken(),
        'x-api-key': PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      'payload': formData,
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(`${ETSY_API_BASE}/shops/${shopId}/shipping-profiles`, options);
    const result = JSON.parse(response.getContentText());
    
    console.log('Create shipping profile response:', response.getResponseCode());
    console.log('Result:', JSON.stringify(result));
    
    if (response.getResponseCode() === 201 || response.getResponseCode() === 200) {
      return result;
    } else {
      throw new Error(result.error || 'Failed to create shipping profile');
    }
  } catch (e) {
    console.error('Error creating shipping profile:', e);
    throw e;
  }
}

// Import any shop by ID (public data)
function importAnyShopData(shopId) {
  try {
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty('ETSY_API_KEY');
    
    const response = UrlFetchApp.fetch(`${ETSY_API_BASE}/shops/${shopId}`, {
      headers: { 'x-api-key': apiKey },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error('Shop not found or invalid shop ID');
    }
    
    const shop = JSON.parse(response.getContentText());
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Create or clear sheet
    let sheet = ss.getSheetByName('Shop Data') || ss.insertSheet('Shop Data');
    sheet.clear();
    
    // Add shop info
    const shopData = [
      ['Shop Information', ''],
      ['Shop ID', shop.shop_id],
      ['Shop Name', shop.shop_name],
      ['Title', shop.title],
      ['Currency', shop.currency_code],
      ['Active Listings', shop.listing_active_count],
      ['Created', new Date(shop.create_date * 1000).toLocaleDateString()],
      ['URL', shop.url]
    ];
    
    sheet.getRange(1, 1, shopData.length, 2).setValues(shopData);
    sheet.getRange('A1:B1').merge().setFontWeight('bold').setBackground('#f0f0f0');
    
    return { success: true, message: `Imported shop: ${shop.shop_name}` };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Get current user info
function getUserInfo() {
  try {
    const user = getCurrentUser();
    // Debug: log the full response
    console.log('User API Response:', JSON.stringify(user));
    
    // Check if user has a shop_id - that means they're a seller
    const isSeller = !!user.shop_id || user.is_seller || false;
    
    // Try to get shop name if they have a shop
    let shopName = null;
    if (user.shop_id) {
      try {
        const shop = makeRequest(`/shops/${user.shop_id}`);
        shopName = shop.shop_name;
      } catch (e) {
        console.log('Could not get shop name');
      }
    }
    
    return {
      success: true,
      user: {
        login_name: user.login_name || 'Not available',
        email: user.primary_email || 'Not available',
        user_id: user.user_id,
        is_seller: isSeller,
        shop_id: user.shop_id || null,
        shop_name: shopName
      }
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Debug function to check shops
function debugCheckShops() {
  try {
    const user = getCurrentUser();
    console.log('User:', JSON.stringify(user));
    
    const shops = getUserShops();
    console.log('Shops response:', JSON.stringify(shops));
    
    // Try alternative endpoint
    const shopsAlt = makeRequest(`/users/${user.user_id}/shops`);
    console.log('Shops (alt endpoint):', JSON.stringify(shopsAlt));
    
    return {
      user: user,
      shops: shops,
      shopsAlt: shopsAlt
    };
  } catch (error) {
    console.error('Debug error:', error);
    return { error: error.toString() };
  }
}

// Get shop ID from various sources
function findUserShopId() {
  // Check manual shop ID first
  const manualShopId = PropertiesService.getScriptProperties().getProperty('MANUAL_SHOP_ID');
  if (manualShopId) {
    return manualShopId;
  }
  
  try {
    // Method 1: Check if user object has shop_id directly
    const user = getCurrentUser();
    if (user.shop_id) {
      console.log('Found shop ID in user object:', user.shop_id);
      return user.shop_id;
    }
  } catch (e) {
    console.log('Method 1 failed:', e);
  }
  
  try {
    // Method 2: Get user shops
    const shops = getUserShops();
    if (shops.results && shops.results.length > 0) {
      console.log('Found shop ID from shops endpoint:', shops.results[0].shop_id);
      return shops.results[0].shop_id;
    }
  } catch (e) {
    console.log('Method 2 failed:', e);
  }
  
  return null;
}

// Import shop data to sheet
function importShopData() {
  try {
    const shopId = findUserShopId();
    if (!shopId) {
      throw new Error('No shops found. You may need to: 1) Create a shop on Etsy first, 2) Wait a few minutes for API sync, or 3) Use "Import Any Shop" with a shop ID.');
    }
    
    // Get shop details
    const shop = makeRequest(`/shops/${shopId}`);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Create or clear sheet
    let sheet = ss.getSheetByName('Shop Data') || ss.insertSheet('Shop Data');
    sheet.clear();
    
    // Add shop info
    const shopData = [
      ['Shop Information', ''],
      ['Shop ID', shop.shop_id],
      ['Shop Name', shop.shop_name],
      ['Title', shop.title],
      ['Currency', shop.currency_code],
      ['Active Listings', shop.listing_active_count],
      ['Created', new Date(shop.create_date * 1000).toLocaleDateString()],
      ['', '']
    ];
    
    sheet.getRange(1, 1, shopData.length, 2).setValues(shopData);
    sheet.getRange('A1:B1').merge().setFontWeight('bold').setBackground('#f0f0f0');
    
    return { success: true, message: 'Shop data imported!', shopId: shop.shop_id };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Import listings
function importListings() {
  try {
    const shopId = findUserShopId();
    if (!shopId) {
      throw new Error('No shops found. Please use "Import Any Shop" feature instead.');
    }
    const listings = getShopListings(shopId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Listings') || ss.insertSheet('Listings');
    sheet.clear();
    
    // Headers
    const headers = ['Listing ID', 'Title', 'Price', 'Quantity', 'Status', 'Views', 'Created'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#f0f0f0');
    
    // Data
    if (listings.results && listings.results.length > 0) {
      const data = listings.results.map(listing => [
        listing.listing_id,
        listing.title,
        listing.price.amount / listing.price.divisor,
        listing.quantity,
        listing.state,
        listing.views,
        new Date(listing.created_timestamp * 1000).toLocaleDateString()
      ]);
      
      sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
      sheet.getRange(2, 3, data.length, 1).setNumberFormat('$#,##0.00');
    }
    
    sheet.autoResizeColumns(1, headers.length);
    return { success: true, message: `Imported ${listings.results.length} listings!` };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Import orders
function importOrders() {
  try {
    const shopId = findUserShopId();
    if (!shopId) {
      throw new Error('No shops found. Orders require shop ownership.');
    }
    const receipts = getShopReceipts(shopId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
    sheet.clear();
    
    // Headers
    const headers = ['Order ID', 'Date', 'Buyer', 'Total', 'Status', 'Items', 'Ship To'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#f0f0f0');
    
    // Data
    if (receipts.results && receipts.results.length > 0) {
      const data = receipts.results.map(receipt => [
        receipt.receipt_id,
        new Date(receipt.created_timestamp * 1000).toLocaleDateString(),
        receipt.name,
        receipt.grandtotal.amount / receipt.grandtotal.divisor,
        receipt.status,
        receipt.transactions ? receipt.transactions.length : 0,
        receipt.formatted_address ? receipt.formatted_address.city + ', ' + receipt.formatted_address.country_name : ''
      ]);
      
      sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
      sheet.getRange(2, 4, data.length, 1).setNumberFormat('$#,##0.00');
    }
    
    sheet.autoResizeColumns(1, headers.length);
    return { success: true, message: `Imported ${receipts.results.length} orders!` };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Get status
function getStatus() {
  const props = PropertiesService.getScriptProperties();
  const userProps = PropertiesService.getUserProperties();
  
  return {
    hasApiKey: !!props.getProperty('ETSY_API_KEY'),
    hasClientId: !!props.getProperty('ETSY_CLIENT_ID'),
    isAuthenticated: !!userProps.getProperty('access_token'),
    tokenExpires: userProps.getProperty('token_expires'),
    savedShopId: props.getProperty('MANUAL_SHOP_ID')
  };
}

// Save manual shop ID
function saveManualShopId(shopId) {
  PropertiesService.getScriptProperties().setProperty('MANUAL_SHOP_ID', shopId);
  return { success: true };
}

// Clear auth
function clearAuth() {
  const userProps = PropertiesService.getUserProperties();
  userProps.deleteProperty('access_token');
  userProps.deleteProperty('refresh_token');
  userProps.deleteProperty('token_expires');
  userProps.deleteProperty('pkce_verifier');
  return { success: true };
}

// Create product upload template sheet
function createProductTemplate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Product Upload') || ss.insertSheet('Product Upload');
  sheet.clear();
  
  // Headers with required and optional fields
  const headers = [
    'Title*', 'Description*', 'Price*', 'Quantity*', 
    'SKU', 'Tags (comma separated)', 'Materials (comma separated)',
    'Who Made*', 'When Made*', 'Taxonomy ID*', 
    'Image URLs (comma separated)', 'Status', 'Result', 'Delete?'
  ];
  
  // Add headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#f0f0f0');
  
  // Add 10 test products with different categories and variations
  const testProducts = [
    // 1. Ceramic Mug - Kitchen & Dining
    [
      'Handmade Blue Ceramic Coffee Mug',
      'Beautiful handcrafted ceramic mug with a stunning blue glaze. Perfect for your morning coffee or evening tea. Dishwasher and microwave safe. Holds 12oz of your favorite beverage.',
      '24.99',
      '15',
      'MUG-BLUE-001',
      'ceramic, handmade, mug, coffee, blue, kitchen, dishwasher safe',
      'ceramic, glaze',
      'i_did',
      '2020_2024',
      '1633', // Mugs category
      'https://picsum.photos/800/600?random=1',
      '',
      '',
      ''
    ],
    
    // 2. Wooden Cutting Board - different who_made
    [
      'Rustic Wood Cutting Board - Walnut',
      'Handcrafted walnut cutting board perfect for your kitchen. Each board is unique with natural wood grain patterns. Treated with food-safe mineral oil. Makes a great wedding gift!',
      '45.00',
      '8',
      'BOARD-WAL-002',
      'cutting board, wood, walnut, kitchen, handmade, rustic, wedding gift',
      'walnut, mineral oil',
      'collective',
      'made_to_order',
      '1625', // Cutting Boards category
      'https://picsum.photos/800/600?random=2',
      '',
      '',
      ''
    ],
    
    // 3. Knitted Scarf - Clothing
    [
      'Cozy Hand Knit Winter Scarf - Burgundy',
      'Soft and warm hand-knitted scarf in beautiful burgundy color. Made from premium merino wool. Perfect for cold winter days. Measures 70 inches long by 8 inches wide.',
      '38.50',
      '12',
      'SCARF-BURG-003',
      'scarf, knitted, winter, burgundy, merino wool, handmade, cozy, warm',
      'merino wool',
      'i_did',
      '2020_2024',
      '166', // Scarves category
      'https://picsum.photos/800/600?random=3',
      '',
      '',
      ''
    ],
    
    // 4. Vintage Jewelry - someone_else made
    [
      'Vintage Sterling Silver Locket Necklace',
      'Beautiful vintage sterling silver locket from the 1960s. Features intricate floral engravings. Chain length 18 inches. Perfect condition, professionally cleaned and polished.',
      '125.00',
      '3',
      'LOCKET-VINT-004',
      'vintage, locket, sterling silver, necklace, jewelry, 1960s, antique',
      'sterling silver',
      'someone_else',
      'before_2005',
      '1875', // Lockets category
      'https://picsum.photos/800/600?random=4',
      '',
      '',
      ''
    ],
    
    // 5. Digital Art Print - Digital product
    [
      'Modern Abstract Wall Art Print - Instant Download',
      'Instant download digital art print. Modern abstract design perfect for home or office decor. High resolution 300 DPI. Includes 5 sizes: 8x10, 11x14, 16x20, 18x24, 24x30 inches.',
      '12.99',
      '999',
      'PRINT-ABST-005',
      'digital print, wall art, abstract, instant download, printable, modern art',
      'digital file',
      'i_did',
      '2020_2024',
      '2079', // Digital Prints category
      'https://picsum.photos/800/600?random=5',
      '',
      '',
      ''
    ],
    
    // 6. Handmade Soap - Bath & Beauty
    [
      'Lavender Goat Milk Soap - Natural & Organic',
      'Luxurious handmade soap with lavender essential oil and goat milk. Gentle on sensitive skin. Each bar is approximately 4oz. Wrapped in eco-friendly packaging.',
      '8.99',
      '25',
      'SOAP-LAV-006',
      'soap, handmade, lavender, goat milk, natural, organic, bath, skincare',
      'goat milk, lavender oil, coconut oil, shea butter',
      'i_did',
      '2020_2024',
      '316', // Bar Soaps category
      'https://picsum.photos/800/600?random=6',
      '',
      '',
      ''
    ],
    
    // 7. Leather Wallet - Made to order
    [
      'Personalized Leather Bifold Wallet',
      'Handcrafted genuine leather bifold wallet. Can be personalized with initials. Features 6 card slots, 2 bill compartments. Available in brown or black. Makes a perfect gift!',
      '55.00',
      '20',
      'WALLET-LEATH-007',
      'wallet, leather, personalized, mens wallet, bifold, gift for him',
      'genuine leather, brass hardware',
      'i_did',
      'made_to_order',
      '1811', // Wallets category
      'https://picsum.photos/800/600?random=7',
      '',
      '',
      ''
    ],
    
    // 8. Plant Pot - Home Decor
    [
      'Minimalist Concrete Planter with Drainage',
      'Modern concrete planter perfect for succulents or small plants. Features drainage hole and cork pad. Hand-poured and sealed. Available in 4 inch diameter.',
      '18.50',
      '30',
      'PLANTER-CONC-008',
      'planter, concrete, succulent, minimalist, modern, home decor, plants',
      'concrete, cork',
      'i_did',
      '2020_2024',
      '1633', // Use a known working category (same as mug)
      'https://picsum.photos/800/600?random=8',
      '',
      '',
      ''
    ],
    
    // 9. Vintage Book - Collectible
    [
      'Rare First Edition Poetry Book 1952',
      'First edition poetry collection from 1952. Good vintage condition with some wear to dust jacket. All pages intact. A wonderful addition to any book collection.',
      '75.00',
      '1',
      'BOOK-POET-009',
      'vintage book, poetry, first edition, 1952, collectible, rare book',
      'paper, cloth binding',
      'someone_else',
      'before_2005',
      '161', // Books category
      'https://picsum.photos/800/600?random=9',
      '',
      '',
      ''
    ],
    
    // 10. Candle Set - Different category
    [
      'Soy Candle Gift Set - Spring Collection',
      'Set of 3 hand-poured soy candles in spring scents: Cherry Blossom, Fresh Linen, and Garden Mint. Each candle burns for 20+ hours. Comes in beautiful gift box.',
      '42.00',
      '18',
      'CANDLE-SET-010',
      'candles, soy candle, gift set, spring, aromatherapy, home fragrance',
      'soy wax, cotton wick, essential oils',
      'i_did',
      '2020_2024',
      '337', // Container Candles category
      'https://picsum.photos/800/600?random=10',
      '',
      '',
      ''
    ]
  ];
  
  // Add test products to sheet
  sheet.getRange(2, 1, testProducts.length, headers.length).setValues(testProducts);
  
  // Add instructions below the products
  const instructions = [
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['INSTRUCTIONS:', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['1. These are test products with real image URLs from Unsplash', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['2. Review and modify the products as needed before uploading', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['3. Who Made options: i_did, someone_else, collective', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['4. When Made options: made_to_order, 2020_2025, 2010_2019, 2006_2009, before_2005', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['5. Delete these instruction rows before uploading', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['6. Check Status and Result columns after upload for success/errors', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['7. To delete listings, put "X" or "x" in the Delete? column and click Delete Marked Listings', '', '', '', '', '', '', '', '', '', '', '', '', '']
  ];
  
  const instructionStartRow = 2 + testProducts.length + 1;
  sheet.getRange(instructionStartRow, 1, instructions.length, headers.length).setValues(instructions);
  sheet.getRange(instructionStartRow + 1, 1).setFontWeight('bold');
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  
  return { success: true, message: 'Product template created!' };
}

// Upload image from URL to listing
function uploadImageToListing(shopId, listingId, imageUrl, rank = 1) {
  try {
    // Fetch URL with muteHttpExceptions to handle all responses
    const response = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
    
    // Check if fetch was successful
    if (response.getResponseCode() !== 200) {
      console.log(`Skipping URL ${imageUrl} - returned status ${response.getResponseCode()}`);
      return null;
    }
    
    // Check content type
    const headers = response.getHeaders();
    const contentType = headers['Content-Type'] || headers['content-type'] || '';
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    
    const isImage = validImageTypes.some(type => contentType.toLowerCase().includes(type));
    
    // Also check if it's a placeholder service that we know returns images
    const knownImageServices = ['placeholder.com', 'placehold.it', 'dummyimage.com', 'placekitten.com', 'picsum.photos'];
    const isKnownImageService = knownImageServices.some(service => imageUrl.includes(service));
    
    if (!isImage && !isKnownImageService) {
      console.log(`Skipping URL ${imageUrl} - not an image (content-type: ${contentType})`);
      return null;
    }
    
    const blob = response.getBlob();
    
    // Prepare multipart form data
    const formData = {
      'image': blob,
      'rank': rank.toString()
    };
    
    const options = {
      'method': 'post',
      'headers': {
        'Authorization': 'Bearer ' + getAccessToken(),
        'x-api-key': PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY')
      },
      'payload': formData,
      'muteHttpExceptions': true
    };
    
    const uploadResponse = UrlFetchApp.fetch(
      `${ETSY_API_BASE}/shops/${shopId}/listings/${listingId}/images`,
      options
    );
    
    if (uploadResponse.getResponseCode() === 201) {
      console.log(`Successfully uploaded image from ${imageUrl}`);
      return JSON.parse(uploadResponse.getContentText());
    } else {
      console.log(`Failed to upload image to Etsy: ${uploadResponse.getContentText()}`);
      return null;
    }
  } catch (error) {
    console.log(`Error processing image URL ${imageUrl}: ${error.toString()}`);
    return null;
  }
}

// Get access token with proper error handling
function getAccessToken() {
  const token = PropertiesService.getUserProperties().getProperty('access_token');
  if (!token) {
    throw new Error('Not authenticated. Please connect to Etsy first.');
  }
  return token;
}

// Upload products from sheet
function uploadProducts() {
  try {
    const shopId = findUserShopId();
    if (!shopId) {
      throw new Error('Shop not found. Please import shop data first.');
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Product Upload');
    if (!sheet) {
      throw new Error('Product Upload sheet not found. Create template first.');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const products = data.slice(1).filter(row => 
      row[0] && 
      !row[0].toString().startsWith('INSTRUCTIONS') && 
      !row[0].toString().startsWith('Who Made') &&
      !row[0].toString().startsWith('When Made') &&
      !row[0].toString().includes('Delete example')
    );
    
    if (products.length === 0) {
      throw new Error('No products found to upload');
    }
    
    // Get shipping profiles for physical products
    const shippingProfiles = getShippingProfiles(shopId);
    let defaultShippingProfileId = null;
    
    console.log('Shipping profiles response:', JSON.stringify(shippingProfiles));
    
    if (shippingProfiles.results && shippingProfiles.results.length > 0) {
      // Use the first shipping profile as default
      defaultShippingProfileId = shippingProfiles.results[0].shipping_profile_id;
      console.log('Using shipping profile ID:', defaultShippingProfileId);
    } else {
      console.log('No shipping profiles found! Creating one...');
      // Create a default shipping profile
      try {
        const newProfile = createShippingProfile(shopId);
        defaultShippingProfileId = newProfile.shipping_profile_id;
        console.log('Created shipping profile ID:', defaultShippingProfileId);
      } catch (e) {
        console.error('Failed to create shipping profile:', e);
        throw new Error('No shipping profiles found and failed to create one. Please set up shipping in your Etsy shop.');
      }
    }
    
    // Get return policies
    const returnPolicies = getReturnPolicies(shopId);
    let defaultReturnPolicyId = null;
    
    console.log('Return policies response:', JSON.stringify(returnPolicies));
    
    if (returnPolicies.results && returnPolicies.results.length > 0) {
      // Use the first return policy as default
      defaultReturnPolicyId = returnPolicies.results[0].return_policy_id;
      console.log('Using return policy ID:', defaultReturnPolicyId);
    } else {
      console.log('No return policies found! Creating one...');
      // Create a default return policy
      try {
        const newPolicy = createReturnPolicy(shopId);
        defaultReturnPolicyId = newPolicy.return_policy_id;
        console.log('Created return policy ID:', defaultReturnPolicyId);
      } catch (e) {
        console.error('Failed to create return policy:', e);
        throw new Error('No return policies found and failed to create one. Please set up a return policy in your Etsy shop.');
      }
    }
    
    const results = [];
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const statusCell = sheet.getRange(i + 2, 12); // Status column
      const resultCell = sheet.getRange(i + 2, 13); // Result column
      
      try {
        statusCell.setValue('Creating listing...');
        SpreadsheetApp.flush();
        
        // Create listing as draft
        const listingData = {
          quantity: parseInt(product[3]),
          title: product[0],
          description: product[1],
          price: parseFloat(product[2]),
          who_made: product[7],
          when_made: product[8],
          taxonomy_id: parseInt(product[9]),
          state: 'draft'
        };
        
        // Add optional fields
        if (product[4]) listingData.sku = [product[4]]; // SKU as array
        if (product[5]) listingData.tags = product[5].split(',').map(t => t.trim()).slice(0, 13); // Max 13 tags
        if (product[6]) listingData.materials = product[6].split(',').map(m => m.trim()).slice(0, 13); // Max 13 materials
        
        // Add shipping profile for all products
        if (defaultShippingProfileId) {
          listingData.shipping_profile_id = defaultShippingProfileId;
        }
        
        // Add return policy for all products
        if (defaultReturnPolicyId) {
          listingData.return_policy_id = defaultReturnPolicyId;
        }
        
        console.log('Creating listing with data:', JSON.stringify(listingData));
        const listing = createListing(shopId, listingData);
        
        // Upload images if provided
        let imagesUploaded = 0;
        if (product[10]) {
          statusCell.setValue('Uploading images...');
          SpreadsheetApp.flush();
          
          const imageUrls = product[10].split(',').map(url => url.trim()).filter(url => url);
          for (let j = 0; j < imageUrls.length && j < 10; j++) { // Max 10 images
            const uploadResult = uploadImageToListing(shopId, listing.listing_id, imageUrls[j], j + 1);
            if (uploadResult) {
              imagesUploaded++;
            }
            Utilities.sleep(500); // Rate limiting for image uploads
          }
          
          console.log(`Uploaded ${imagesUploaded} of ${imageUrls.length} images for listing ${listing.listing_id}`);
        }
        
        // Only publish if at least one image was uploaded
        if (imagesUploaded > 0) {
          statusCell.setValue('Publishing...');
          SpreadsheetApp.flush();
          
          const published = publishListing(shopId, listing.listing_id);
          
          statusCell.setValue('✓ Published');
          statusCell.setBackground('#d4edda');
          resultCell.setValue(`ID: ${listing.listing_id}`);
        } else {
          statusCell.setValue('✓ Draft (no images)');
          statusCell.setBackground('#fff3cd');
          resultCell.setValue(`Draft ID: ${listing.listing_id} - Add images to publish`);
        }
        
        results.push({ 
          success: true, 
          title: product[0], 
          listing_id: listing.listing_id 
        });
        
      } catch (error) {
        statusCell.setValue('✗ Failed');
        statusCell.setBackground('#f8d7da');
        resultCell.setValue(error.toString().substring(0, 100));
        
        results.push({ 
          success: false, 
          title: product[0], 
          error: error.toString() 
        });
      }
      
      // Rate limiting
      Utilities.sleep(1000);
    }
    
    return {
      success: true,
      total: products.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };
    
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Create a draft listing
function createListing(shopId, data) {
  // Convert data to form-encoded format
  const formData = Object.keys(data).map(key => {
    const value = data[key];
    if (Array.isArray(value)) {
      return value.map(v => `${key}=${encodeURIComponent(v)}`).join('&');
    }
    return `${key}=${encodeURIComponent(value)}`;
  }).join('&');
  
  const options = {
    'method': 'POST',
    'headers': {
      'Authorization': 'Bearer ' + getAccessToken(),
      'x-api-key': PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    'payload': formData,
    'muteHttpExceptions': true
  };
  
  console.log('Sending form data:', formData);
  
  const response = UrlFetchApp.fetch(`${ETSY_API_BASE}/shops/${shopId}/listings`, options);
  const result = JSON.parse(response.getContentText());
  
  console.log('Response code:', response.getResponseCode());
  console.log('Response:', JSON.stringify(result));
  
  if (response.getResponseCode() === 201) {
    return result;
  } else {
    throw new Error(result.error || 'Failed to create listing');
  }
}

// Publish listing (change from draft to active)
function publishListing(shopId, listingId) {
  const formData = 'state=active';
  
  const options = {
    'method': 'PATCH',
    'headers': {
      'Authorization': 'Bearer ' + getAccessToken(),
      'x-api-key': PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    'payload': formData,
    'muteHttpExceptions': true
  };
  
  const response = UrlFetchApp.fetch(`${ETSY_API_BASE}/shops/${shopId}/listings/${listingId}`, options);
  const result = JSON.parse(response.getContentText());
  
  console.log('Publish response code:', response.getResponseCode());
  console.log('Publish response:', JSON.stringify(result));
  
  if (response.getResponseCode() === 200) {
    return result;
  } else {
    throw new Error(result.error || 'Failed to publish listing');
  }
}

// Update listing price and quantity using inventory endpoint
function updateListing(shopId, listingId, updates) {
  try {
    // First, get current inventory
    const getOptions = {
      'method': 'GET',
      'headers': {
        'Authorization': 'Bearer ' + getAccessToken(),
        'x-api-key': PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY')
      },
      'muteHttpExceptions': true
    };
    
    const inventoryResponse = UrlFetchApp.fetch(`${ETSY_API_BASE}/listings/${listingId}/inventory`, getOptions);
    
    if (inventoryResponse.getResponseCode() !== 200) {
      throw new Error('Failed to get inventory');
    }
    
    const inventory = JSON.parse(inventoryResponse.getContentText());
    
    // Update the offerings within products with new price and quantity
    if (inventory.products && inventory.products.length > 0) {
      inventory.products.forEach(product => {
        if (product.offerings && product.offerings.length > 0) {
          product.offerings.forEach(offering => {
            if (updates.quantity !== undefined) {
              offering.quantity = updates.quantity;
            }
            if (updates.price !== undefined) {
              // Price should be a simple float value
              offering.price = updates.price;
            }
          });
        }
      });
    }
    
    // Clean read-only fields and prepare update data
    const cleanedInventory = {
      products: inventory.products.map(product => {
        const cleanedProduct = {
          sku: product.sku || '',
          property_values: product.property_values || []
        };
        
        // Clean offerings
        if (product.offerings && product.offerings.length > 0) {
          cleanedProduct.offerings = product.offerings.map(offering => {
            const cleanedOffering = {
              quantity: offering.quantity,
              is_enabled: offering.is_enabled !== false, // default to true
              price: offering.price
            };
            // Remove read-only fields
            // offering_id is read-only, so we don't include it
            return cleanedOffering;
          });
        }
        
        return cleanedProduct;
      }),
      price_on_property: inventory.price_on_property || [],
      quantity_on_property: inventory.quantity_on_property || [],
      sku_on_property: inventory.sku_on_property || []
    };
    
    console.log(`Updating listing ${listingId} inventory with:`, JSON.stringify(cleanedInventory));
    
    // Update inventory
    const updateOptions = {
      'method': 'PUT',
      'headers': {
        'Authorization': 'Bearer ' + getAccessToken(),
        'x-api-key': PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY'),
        'Content-Type': 'application/json'
      },
      'payload': JSON.stringify(cleanedInventory),
      'muteHttpExceptions': true
    };
    
    const updateResponse = UrlFetchApp.fetch(`${ETSY_API_BASE}/listings/${listingId}/inventory`, updateOptions);
    const updateResult = JSON.parse(updateResponse.getContentText());
    
    console.log(`Update response code: ${updateResponse.getResponseCode()}`);
    
    if (updateResponse.getResponseCode() === 200) {
      return { success: true, data: updateResult };
    } else {
      console.log('Update error:', updateResult);
      return { success: false, error: updateResult.error || 'Failed to update inventory' };
    }
    
  } catch (error) {
    console.error('Error updating listing:', error);
    return { success: false, error: error.toString() };
  }
}

// Get upload progress
function getUploadProgress() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Product Upload');
  if (!sheet || sheet.getLastRow() < 2) return { total: 0, completed: 0, failed: 0 };
  
  const statusColumn = sheet.getRange(2, 12, sheet.getLastRow() - 1, 1).getValues();
  
  let completed = 0;
  let failed = 0;
  let processing = 0;
  
  statusColumn.forEach(row => {
    const status = row[0];
    if (status === '✓ Published') completed++;
    else if (status === '✗ Failed') failed++;
    else if (status && status !== '') processing++;
  });
  
  return {
    total: statusColumn.filter(row => row[0] !== '').length,
    completed: completed,
    failed: failed,
    processing: processing
  };
}

// Update inventory and price for existing listings
function updateInventoryAndPrice() {
  try {
    const shopId = findUserShopId();
    if (!shopId) {
      throw new Error('Shop not found. Please import shop data first.');
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Product Upload');
    if (!sheet) {
      throw new Error('Product Upload sheet not found.');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    console.log('Total rows in sheet:', data.length);
    console.log('Headers:', headers);
    
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process each row starting from row 2
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const statusCell = sheet.getRange(i + 1, 12); // Status column
      const resultCell = sheet.getRange(i + 1, 13); // Result column
      
      // Skip instruction rows
      if (!row[0] || row[0].toString().startsWith('INSTRUCTIONS') || 
          row[0].toString().startsWith('Who Made') || 
          row[0].toString().startsWith('When Made') ||
          row[0].toString().includes('Delete example')) {
        continue;
      }
      
      const resultText = row[12] || ''; // Result column (0-indexed)
      
      console.log(`Row ${i + 1} - Result text: "${resultText}"`);
      
      // Extract listing ID from result column
      const idMatch = resultText.toString().match(/ID:\s*(\d+)/);
      if (!idMatch) {
        console.log(`Row ${i + 1} - No ID found in result column`);
        skipped++;
        continue;
      }
      
      const listingId = idMatch[1];
      const price = parseFloat(row[2]); // Price column
      const quantity = parseInt(row[3]); // Quantity column
      
      console.log(`Row ${i + 1} - Listing ID: ${listingId}, Price: ${price}, Quantity: ${quantity}`);
      
      if (isNaN(price) || isNaN(quantity)) {
        console.log(`Skipping row ${i + 1}: Invalid price or quantity`);
        skipped++;
        continue;
      }
      
      statusCell.setValue('Updating...');
      SpreadsheetApp.flush();
      
      const updateResult = updateListing(shopId, listingId, {
        price: price,
        quantity: quantity
      });
      
      console.log(`Update result for listing ${listingId}:`, updateResult);
      
      if (updateResult.success) {
        statusCell.setValue('✓ Updated');
        statusCell.setBackground('#d4edda');
        SpreadsheetApp.flush(); // Force update to show in sheet
        updated++;
      } else {
        statusCell.setValue('✗ Update failed');
        statusCell.setBackground('#f8d7da');
        resultCell.setValue(resultCell.getValue() + ' | Error: ' + updateResult.error);
        SpreadsheetApp.flush(); // Force update to show in sheet
        failed++;
      }
      
      // Rate limiting
      Utilities.sleep(500);
    }
    
    console.log(`Update complete: ${updated} updated, ${failed} failed, ${skipped} skipped`);
    
    return {
      success: true,
      message: `Update complete: ${updated} updated, ${failed} failed, ${skipped} skipped`,
      updated: updated,
      failed: failed,
      skipped: skipped
    };
    
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Delete marked listings from Product Upload sheet
function deleteMarkedListings() {
  try {
    const shopId = findUserShopId();
    if (!shopId) {
      throw new Error('Shop not found. Please import shop data first.');
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Product Upload');
    if (!sheet) {
      throw new Error('Product Upload sheet not found.');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    console.log('Total rows in sheet:', data.length);
    console.log('Headers:', headers);
    
    let deleted = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process each row starting from row 2
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const statusCell = sheet.getRange(i + 1, 12); // Status column
      const resultCell = sheet.getRange(i + 1, 13); // Result column
      const deleteCell = sheet.getRange(i + 1, 14); // Delete? column
      
      // Skip instruction rows
      if (!row[0] || row[0].toString().startsWith('INSTRUCTIONS') || 
          row[0].toString().startsWith('Who Made') || 
          row[0].toString().startsWith('When Made') ||
          row[0].toString().includes('Delete example')) {
        continue;
      }
      
      // Check if marked for deletion
      const deleteMarker = row[13] || ''; // Delete? column (0-indexed)
      if (!deleteMarker || (deleteMarker.toString().toUpperCase() !== 'X')) {
        console.log(`Row ${i + 1} - Not marked for deletion`);
        skipped++;
        continue;
      }
      
      const resultText = row[12] || ''; // Result column (0-indexed)
      
      console.log(`Row ${i + 1} - Result text: "${resultText}"`);
      
      // Extract listing ID from result column
      const idMatch = resultText.toString().match(/ID:\s*(\d+)/);
      if (!idMatch) {
        console.log(`Row ${i + 1} - No ID found in result column`);
        skipped++;
        continue;
      }
      
      const listingId = idMatch[1];
      
      console.log(`Row ${i + 1} - Deleting listing ID: ${listingId}`);
      
      statusCell.setValue('Deleting...');
      SpreadsheetApp.flush();
      
      try {
        // Delete the listing
        const options = {
          'method': 'DELETE',
          'headers': {
            'Authorization': 'Bearer ' + getAccessToken(),
            'x-api-key': PropertiesService.getScriptProperties().getProperty('ETSY_API_KEY')
          },
          'muteHttpExceptions': true
        };
        
        const response = UrlFetchApp.fetch(`${ETSY_API_BASE}/listings/${listingId}`, options);
        
        console.log(`Delete response code for listing ${listingId}: ${response.getResponseCode()}`);
        
        if (response.getResponseCode() === 204 || response.getResponseCode() === 200) {
          statusCell.setValue('✗ Deleted');
          statusCell.setBackground('#d3d3d3');
          resultCell.setValue('Listing deleted');
          deleteCell.setValue(''); // Clear the deletion marker
          SpreadsheetApp.flush();
          deleted++;
        } else {
          const result = JSON.parse(response.getContentText());
          statusCell.setValue('✗ Delete failed');
          statusCell.setBackground('#f8d7da');
          resultCell.setValue(resultCell.getValue() + ' | Error: ' + (result.error || 'Unknown error'));
          SpreadsheetApp.flush();
          failed++;
        }
      } catch (error) {
        statusCell.setValue('✗ Delete failed');
        statusCell.setBackground('#f8d7da');
        resultCell.setValue(resultCell.getValue() + ' | Error: ' + error.toString());
        SpreadsheetApp.flush();
        failed++;
      }
      
      // Rate limiting
      Utilities.sleep(500);
    }
    
    console.log(`Delete complete: ${deleted} deleted, ${failed} failed, ${skipped} skipped`);
    
    return {
      success: true,
      message: `Delete complete: ${deleted} deleted, ${failed} failed, ${skipped} not marked for deletion`,
      deleted: deleted,
      failed: failed,
      skipped: skipped
    };
    
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}