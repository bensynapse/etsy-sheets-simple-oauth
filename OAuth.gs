/**
 * OAuth 2.0 with PKCE implementation for Etsy API v3
 * Handles authentication flow and token management
 */

// OAuth configuration
const OAUTH_CONFIG = {
  authorizationBaseUrl: 'https://www.etsy.com/oauth/connect',
  tokenUrl: 'https://api.etsy.com/v3/public/oauth/token',
  scopes: 'listings_r listings_w shops_r shops_w transactions_r',
  responseType: 'code',
  codeChallengeMethod: 'S256'
};

/**
 * Start OAuth 2.0 flow with PKCE
 */
function startOAuthFlow() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Get client ID from settings
    const clientId = getClientId();
    if (!clientId) {
      ui.alert('Setup Required', 'Please configure your Etsy App Client ID in the Settings sheet.', ui.ButtonSet.OK);
      return;
    }
    
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    PropertiesService.getUserProperties().setProperty('code_verifier', codeVerifier);
    
    // Get redirect URI
    const redirectUri = getRedirectUri();
    
    // Generate state for CSRF protection
    const state = Utilities.getUuid();
    PropertiesService.getUserProperties().setProperty('oauth_state', state);
    
    // Build authorization URL
    const authUrl = buildAuthorizationUrl(clientId, redirectUri, state, codeChallenge);
    
    // Show authorization dialog
    const htmlTemplate = HtmlService.createTemplate(`
      <div style="padding: 20px;">
        <h3>Connect to Etsy</h3>
        <p>Click the button below to authorize this application to access your Etsy shop:</p>
        <br>
        <button onclick="window.open('<?= authUrl ?>', '_blank'); checkAuthStatus();" 
                style="background-color: #F1641E; color: white; padding: 10px 20px; 
                       border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
          Connect to Etsy
        </button>
        <br><br>
        <p style="font-size: 12px; color: #666;">
          After authorizing, copy the authorization code from the redirect page and paste it below:
        </p>
        <input type="text" id="authCode" placeholder="Paste authorization code here" 
               style="width: 100%; padding: 8px; margin: 10px 0;">
        <button onclick="submitAuthCode()" 
                style="background-color: #059669; color: white; padding: 8px 16px; 
                       border: none; border-radius: 4px; cursor: pointer;">
          Submit Code
        </button>
        <div id="status" style="margin-top: 10px;"></div>
      </div>
      
      <script>
        function checkAuthStatus() {
          document.getElementById('status').innerHTML = 
            '<p style="color: #059669;">Authorization window opened. Please complete the authorization and paste the code above.</p>';
        }
        
        function submitAuthCode() {
          const code = document.getElementById('authCode').value;
          if (!code) {
            alert('Please enter the authorization code');
            return;
          }
          
          document.getElementById('status').innerHTML = '<p>Processing...</p>';
          
          google.script.run
            .withSuccessHandler(function(result) {
              if (result.success) {
                document.getElementById('status').innerHTML = 
                  '<p style="color: #059669;">✓ Successfully connected to Etsy!</p>';
                setTimeout(function() {
                  google.script.host.close();
                }, 2000);
              } else {
                document.getElementById('status').innerHTML = 
                  '<p style="color: #DC2626;">Error: ' + result.error + '</p>';
              }
            })
            .withFailureHandler(function(error) {
              document.getElementById('status').innerHTML = 
                '<p style="color: #DC2626;">Error: ' + error + '</p>';
            })
            .handleAuthorizationCode(code);
        }
      </script>
    `);
    
    htmlTemplate.authUrl = authUrl;
    const html = htmlTemplate.evaluate()
      .setWidth(400)
      .setHeight(400);
    
    ui.showModalDialog(html, 'Connect to Etsy');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('OAuth Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Handle authorization code from OAuth callback
 */
function handleAuthorizationCode(code) {
  try {
    const codeVerifier = PropertiesService.getUserProperties().getProperty('code_verifier');
    const clientId = getClientId();
    const redirectUri = getRedirectUri();
    
    if (!codeVerifier) {
      throw new Error('Code verifier not found. Please restart the authorization process.');
    }
    
    // Exchange authorization code for tokens
    const tokenResponse = exchangeCodeForToken(code, codeVerifier, clientId, redirectUri);
    
    if (tokenResponse.access_token) {
      // Store tokens securely
      storeTokens(tokenResponse);
      
      // Update settings sheet
      updateAuthStatus('Connected', tokenResponse.expires_in);
      
      // Get and store shop info
      fetchAndStoreShopInfo();
      
      return { success: true };
    } else {
      throw new Error('Failed to obtain access token');
    }
    
  } catch (error) {
    console.error('Authorization error:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Exchange authorization code for access token
 */
function exchangeCodeForToken(code, codeVerifier, clientId, redirectUri) {
  const payload = {
    'grant_type': 'authorization_code',
    'client_id': clientId,
    'redirect_uri': redirectUri,
    'code': code,
    'code_verifier': codeVerifier
  };
  
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  const response = UrlFetchApp.fetch(OAUTH_CONFIG.tokenUrl, options);
  const result = JSON.parse(response.getContentText());
  
  if (response.getResponseCode() !== 200) {
    throw new Error(result.error_description || 'Token exchange failed');
  }
  
  return result;
}

/**
 * Refresh access token using refresh token
 */
function refreshAccessToken() {
  try {
    const refreshToken = PropertiesService.getUserProperties().getProperty('etsy_refresh_token');
    const clientId = getClientId();
    
    if (!refreshToken) {
      throw new Error('No refresh token found. Please re-authenticate.');
    }
    
    const payload = {
      'grant_type': 'refresh_token',
      'client_id': clientId,
      'refresh_token': refreshToken
    };
    
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(OAUTH_CONFIG.tokenUrl, options);
    const result = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200) {
      storeTokens(result);
      return true;
    } else {
      console.error('Token refresh failed:', result);
      return false;
    }
    
  } catch (error) {
    console.error('Refresh token error:', error);
    return false;
  }
}

/**
 * Store OAuth tokens securely
 */
function storeTokens(tokenResponse) {
  const userProperties = PropertiesService.getUserProperties();
  
  userProperties.setProperties({
    'etsy_access_token': tokenResponse.access_token,
    'etsy_refresh_token': tokenResponse.refresh_token,
    'etsy_token_expires': new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString()
  });
}

/**
 * Get valid access token (refresh if needed)
 */
function getAccessToken() {
  const userProperties = PropertiesService.getUserProperties();
  const accessToken = userProperties.getProperty('etsy_access_token');
  const expiresAt = userProperties.getProperty('etsy_token_expires');
  
  if (!accessToken) {
    throw new Error('Not authenticated. Please connect to Etsy first.');
  }
  
  // Check if token is expired or about to expire (5 minutes buffer)
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (expiryTime - now < fiveMinutes) {
    // Token expired or about to expire, refresh it
    if (refreshAccessToken()) {
      return userProperties.getProperty('etsy_access_token');
    } else {
      throw new Error('Failed to refresh token. Please re-authenticate.');
    }
  }
  
  return accessToken;
}

/**
 * Test OAuth connection status
 */
function testOAuthConnection() {
  try {
    const accessToken = PropertiesService.getUserProperties().getProperty('etsy_access_token');
    const expiresAt = PropertiesService.getUserProperties().getProperty('etsy_token_expires');
    
    if (!accessToken) {
      return { connected: false, rateLimits: 'Not authenticated' };
    }
    
    const expiryTime = new Date(expiresAt);
    const now = new Date();
    
    if (expiryTime < now) {
      // Try to refresh
      if (refreshAccessToken()) {
        return { connected: true, rateLimits: 'Token refreshed' };
      } else {
        return { connected: false, rateLimits: 'Token expired' };
      }
    }
    
    return { 
      connected: true, 
      rateLimits: `Token valid until ${expiryTime.toLocaleString()}` 
    };
    
  } catch (error) {
    return { connected: false, rateLimits: error.toString() };
  }
}

/**
 * Clear OAuth tokens (logout)
 */
function clearOAuthTokens() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('etsy_access_token');
  userProperties.deleteProperty('etsy_refresh_token');
  userProperties.deleteProperty('etsy_token_expires');
  userProperties.deleteProperty('code_verifier');
  userProperties.deleteProperty('oauth_state');
  
  updateAuthStatus('Not Connected', '');
}

// PKCE Helper Functions

/**
 * Generate code verifier for PKCE
 */
function generateCodeVerifier() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  for (let i = 0; i < 128; i++) {
    verifier += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return verifier;
}

/**
 * Generate code challenge from verifier
 */
function generateCodeChallenge(verifier) {
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier);
  return Utilities.base64EncodeWebSafe(hash).replace(/=+$/, '');
}

/**
 * Build OAuth authorization URL
 */
function buildAuthorizationUrl(clientId, redirectUri, state, codeChallenge) {
  const params = {
    'response_type': OAUTH_CONFIG.responseType,
    'redirect_uri': redirectUri,
    'scope': OAUTH_CONFIG.scopes,
    'client_id': clientId,
    'state': state,
    'code_challenge': codeChallenge,
    'code_challenge_method': OAUTH_CONFIG.codeChallengeMethod
  };
  
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
    
  return `${OAUTH_CONFIG.authorizationBaseUrl}?${queryString}`;
}

// Helper functions

/**
 * Get client ID from settings
 */
function getClientId() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  return settingsSheet.getRange('B14').getValue() || 
         PropertiesService.getScriptProperties().getProperty('ETSY_CLIENT_ID');
}

/**
 * Get redirect URI
 */
function getRedirectUri() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  let redirectUri = settingsSheet.getRange('B15').getValue();
  
  if (!redirectUri) {
    // Use script URL as default redirect URI
    redirectUri = 'https://script.google.com/macros/s/' + ScriptApp.getScriptId() + '/usercallback';
    settingsSheet.getRange('B15').setValue(redirectUri);
  }
  
  return redirectUri;
}

/**
 * Update authentication status in settings sheet
 */
function updateAuthStatus(status, expiresIn) {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  settingsSheet.getRange('B5').setValue(status);
  
  if (expiresIn) {
    const expiryDate = new Date(Date.now() + (expiresIn * 1000));
    settingsSheet.getRange('B6').setValue(expiryDate.toLocaleString());
  } else {
    settingsSheet.getRange('B6').setValue('');
  }
  
  // Update dashboard status
  updateDashboardStatus(status, new Date().toLocaleString());
}

/**
 * Fetch and store shop info after successful auth
 */
function fetchAndStoreShopInfo() {
  try {
    // This will be implemented in EtsyAPI.gs
    // For now, just log the success
    console.log('OAuth successful, ready to fetch shop info');
  } catch (error) {
    console.error('Error fetching shop info:', error);
  }
}

/**
 * Web app doGet function for OAuth callback
 * This handles the redirect from Etsy after authorization
 */
function doGet(e) {
  const code = e.parameter.code;
  const state = e.parameter.state;
  const error = e.parameter.error;
  
  const htmlTemplate = HtmlService.createTemplate(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            text-align: center;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 500px;
            margin: 0 auto;
          }
          .code-box {
            background-color: #f0f0f0;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
          }
          .error {
            color: #dc2626;
          }
          .success {
            color: #059669;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Etsy Authorization</h2>
          <? if (error) { ?>
            <p class="error">Authorization failed: <?= error ?></p>
          <? } else if (code) { ?>
            <p class="success">Authorization successful!</p>
            <p>Copy this authorization code and paste it in the Google Sheets dialog:</p>
            <div class="code-box"><?= code ?></div>
            <p style="font-size: 14px; color: #666;">
              You can close this window after copying the code.
            </p>
          <? } else { ?>
            <p class="error">No authorization code received.</p>
          <? } ?>
        </div>
      </body>
    </html>
  `);
  
  htmlTemplate.code = code;
  htmlTemplate.error = error;
  
  return htmlTemplate.evaluate()
    .setTitle('Etsy OAuth Callback')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}