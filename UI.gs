/**
 * UI helper functions for sidebar and dialog management
 */

/**
 * Get settings for sidebar
 */
function getSettings() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  const scriptProperties = PropertiesService.getScriptProperties();
  const userProperties = PropertiesService.getUserProperties();
  
  return {
    apiKey: scriptProperties.getProperty('ETSY_API_KEY') ? true : false,
    clientId: settingsSheet.getRange('B14').getValue(),
    redirectUri: settingsSheet.getRange('B15').getValue() || getDefaultRedirectUri(),
    autoRefresh: settingsSheet.getRange('B9').getValue(),
    refreshRate: settingsSheet.getRange('B10').getValue(),
    maxRecords: settingsSheet.getRange('B11').getValue(),
    isConnected: userProperties.getProperty('etsy_access_token') ? true : false
  };
}

/**
 * Save API key from sidebar
 */
function saveApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('API key cannot be empty');
  }
  
  PropertiesService.getScriptProperties().setProperty('ETSY_API_KEY', apiKey);
  
  // Also update settings sheet
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  settingsSheet.getRange('B3').setValue('••••••••••••');
  
  return true;
}

/**
 * Save OAuth settings from sidebar
 */
function saveOAuthSettings(clientId) {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  settingsSheet.getRange('B14').setValue(clientId);
  
  // Update redirect URI if needed
  const redirectUri = getDefaultRedirectUri();
  settingsSheet.getRange('B15').setValue(redirectUri);
  
  return true;
}

/**
 * Save import settings from sidebar
 */
function saveImportSettings(settings) {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  
  settingsSheet.getRange('B9').setValue(settings.autoRefresh);
  settingsSheet.getRange('B10').setValue(settings.refreshRate);
  settingsSheet.getRange('B11').setValue(settings.maxRecords);
  
  // Update auto-refresh trigger
  setupAutoRefresh();
  
  return true;
}

/**
 * Clear all imported data
 */
function clearAllImportedData() {
  const sheetsToC
= ['Shops', 'Listings', 'Orders', 'Inventory'];
  
  sheetsToC
ear.forEach(sheetName => {
    clearSheetData(sheetName);
  });
  
  // Reset dashboard stats
  const dashboard = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dashboard');
  dashboard.getRange('B7').setValue('0');
  dashboard.getRange('B8').setValue('0');
  dashboard.getRange('B9').setValue('$0.00');
  
  return true;
}

/**
 * Get default redirect URI
 */
function getDefaultRedirectUri() {
  return `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/usercallback`;
}

/**
 * Show custom dialog
 */
function showCustomDialog(title, message, buttons = SpreadsheetApp.getUi().ButtonSet.OK) {
  const ui = SpreadsheetApp.getUi();
  return ui.alert(title, message, buttons);
}

/**
 * Show HTML dialog
 */
function showHtmlDialog(html, title, width = 400, height = 300) {
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(width)
    .setHeight(height);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, title);
}

/**
 * Include HTML file content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Create progress indicator
 */
function showProgress(message, current, total) {
  const percent = Math.round((current / total) * 100);
  const progressBar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
  
  const html = `
    <div style="padding: 20px; text-align: center;">
      <p>${message}</p>
      <div style="font-family: monospace; margin: 20px 0;">
        [${progressBar}] ${percent}%
      </div>
      <p style="color: #6B7280; font-size: 12px;">
        ${current} of ${total} items processed
      </p>
    </div>
  `;
  
  showHtmlDialog(html, 'Processing', 350, 200);
}

/**
 * Show rate limit warning
 */
function showRateLimitWarning(remaining, limit) {
  const percent = (remaining / limit) * 100;
  
  if (percent < 10) {
    showCustomDialog(
      'Rate Limit Warning',
      `You have only ${remaining} API calls remaining out of ${limit} today.\n\n` +
      'Consider reducing the frequency of imports or waiting until tomorrow.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Create confirmation dialog
 */
function showConfirmation(title, message) {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(title, message, ui.ButtonSet.YES_NO);
  return response === ui.Button.YES;
}

/**
 * Show success notification
 */
function showSuccess(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Success', 3);
}

/**
 * Show error notification
 */
function showError(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Error', 5);
}

/**
 * Show info notification
 */
function showInfo(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Info', 3);
}

/**
 * Create input dialog
 */
function showInputDialog(title, prompt, defaultValue = '') {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(title, prompt, ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() === ui.Button.OK) {
    return response.getResponseText();
  }
  
  return null;
}

/**
 * Show bulk update dialog
 */
function showBulkUpdateDialog() {
  const html = HtmlService.createTemplateFromFile('BulkUpdateDialog')
    .evaluate()
    .setWidth(500)
    .setHeight(400);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Bulk Update Listings');
}

/**
 * Process bulk update
 */
function processBulkUpdate(updateType, updateValue, listingIds) {
  try {
    showProgress('Updating listings...', 0, listingIds.length);
    
    let successCount = 0;
    let errorCount = 0;
    
    listingIds.forEach((listingId, index) => {
      try {
        const shopId = getShopId();
        const updateData = {};
        
        switch(updateType) {
          case 'price':
            updateData.price = parseFloat(updateValue);
            break;
          case 'quantity':
            updateData.quantity = parseInt(updateValue);
            break;
          case 'state':
            updateData.state = updateValue;
            break;
        }
        
        updateListing(shopId, listingId, updateData);
        successCount++;
        
      } catch (error) {
        console.error(`Failed to update listing ${listingId}:`, error);
        errorCount++;
      }
      
      showProgress('Updating listings...', index + 1, listingIds.length);
      Utilities.sleep(100); // Rate limiting
    });
    
    closeLoadingDialog();
    
    showCustomDialog(
      'Bulk Update Complete',
      `Successfully updated: ${successCount} listings\n` +
      `Failed: ${errorCount} listings`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    // Refresh listings
    importListings();
    
  } catch (error) {
    closeLoadingDialog();
    showError('Bulk update failed: ' + error.toString());
  }
}