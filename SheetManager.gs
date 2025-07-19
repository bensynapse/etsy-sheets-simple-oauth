/**
 * Sheet management utilities
 * Handles all spreadsheet operations and data formatting
 */

/**
 * Get or create a sheet with specified name
 */
function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupSheet(sheet, sheetName);
  }
  
  return sheet;
}

/**
 * Clear sheet data (preserving headers)
 */
function clearSheetData(sheetName, startRow = 2) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow >= startRow && lastCol > 0) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).clear();
  }
}

/**
 * Write data to sheet with formatting
 */
function writeDataToSheet(sheetName, data, startRow = 2, startCol = 1) {
  if (!data || data.length === 0) return;
  
  const sheet = getOrCreateSheet(sheetName);
  const numRows = data.length;
  const numCols = data[0].length;
  
  sheet.getRange(startRow, startCol, numRows, numCols).setValues(data);
  
  // Auto-resize columns
  for (let i = 1; i <= numCols; i++) {
    sheet.autoResizeColumn(i);
  }
}

/**
 * Apply conditional formatting to sheet
 */
function applyConditionalFormatting(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  
  switch(sheetName) {
    case 'Listings':
      applyListingsFormatting(sheet);
      break;
    case 'Orders':
      applyOrdersFormatting(sheet);
      break;
    case 'Inventory':
      applyInventoryFormatting(sheet);
      break;
  }
}

/**
 * Apply formatting to Listings sheet
 */
function applyListingsFormatting(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  // Highlight low quantity items (less than 5)
  const quantityRange = sheet.getRange(2, 6, lastRow - 1, 1); // Column F (Quantity)
  const lowQuantityRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(5)
    .setBackground('#FEE2E2') // Light red
    .setRanges([quantityRange])
    .build();
  
  // Highlight inactive listings
  const statusRange = sheet.getRange(2, 8, lastRow - 1, 1); // Column H (Status)
  const inactiveRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('inactive')
    .setBackground('#FEF3C7') // Light yellow
    .setRanges([statusRange])
    .build();
  
  const rules = sheet.getConditionalFormatRules();
  rules.push(lowQuantityRule, inactiveRule);
  sheet.setConditionalFormatRules(rules);
}

/**
 * Apply formatting to Orders sheet
 */
function applyOrdersFormatting(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  // Highlight pending orders
  const statusRange = sheet.getRange(2, 8, lastRow - 1, 1); // Column H (Status)
  const pendingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Paid')
    .setBackground('#DBEAFE') // Light blue
    .setRanges([statusRange])
    .build();
  
  // Highlight shipped orders
  const shippedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Shipped')
    .setBackground('#D1FAE5') // Light green
    .setRanges([statusRange])
    .build();
  
  const rules = sheet.getConditionalFormatRules();
  rules.push(pendingRule, shippedRule);
  sheet.setConditionalFormatRules(rules);
}

/**
 * Apply formatting to Inventory sheet
 */
function applyInventoryFormatting(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  // Highlight low inventory (less than 3)
  const quantityRange = sheet.getRange(2, 9, lastRow - 1, 1); // Column I (Quantity)
  const lowInventoryRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(3)
    .setBackground('#FEE2E2') // Light red
    .setFontColor('#991B1B') // Dark red
    .setRanges([quantityRange])
    .build();
  
  // Highlight disabled offerings
  const enabledRange = sheet.getRange(2, 10, lastRow - 1, 1); // Column J (Is Enabled)
  const disabledRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('FALSE')
    .setBackground('#F3F4F6') // Light gray
    .setRanges([enabledRange])
    .build();
  
  const rules = sheet.getConditionalFormatRules();
  rules.push(lowInventoryRule, disabledRule);
  sheet.setConditionalFormatRules(rules);
}

/**
 * Create data validation rules
 */
function createDataValidation(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  
  switch(sheetName) {
    case 'Settings':
      createSettingsValidation(sheet);
      break;
  }
}

/**
 * Create validation rules for Settings sheet
 */
function createSettingsValidation(sheet) {
  // Boolean validation for auto-refresh
  const booleanRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .setAllowInvalid(false)
    .build();
  sheet.getRange('B9').setDataValidation(booleanRule);
  
  // Number validation for refresh rate
  const refreshRateRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(5, 60)
    .setAllowInvalid(false)
    .setHelpText('Enter a value between 5 and 60 minutes')
    .build();
  sheet.getRange('B10').setDataValidation(refreshRateRule);
  
  // Number validation for max records
  const maxRecordsRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 1000)
    .setAllowInvalid(false)
    .setHelpText('Enter a value between 1 and 1000')
    .build();
  sheet.getRange('B11').setDataValidation(maxRecordsRule);
}

/**
 * Protect sensitive cells
 */
function protectSensitiveCells() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  if (!settingsSheet) return;
  
  // Protect API key cell
  const apiKeyRange = settingsSheet.getRange('B3');
  const protection = apiKeyRange.protect();
  protection.setDescription('API Key - Protected');
  protection.setWarningOnly(true);
}

/**
 * Create summary statistics
 */
function updateSummaryStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('Dashboard');
  
  // Count active listings
  const listingsSheet = ss.getSheetByName('Listings');
  if (listingsSheet && listingsSheet.getLastRow() > 1) {
    const activeListings = listingsSheet.getRange(2, 8, listingsSheet.getLastRow() - 1, 1)
      .getValues()
      .filter(row => row[0] === 'active')
      .length;
    dashboard.getRange('B7').setValue(activeListings);
  }
  
  // Count pending orders
  const ordersSheet = ss.getSheetByName('Orders');
  if (ordersSheet && ordersSheet.getLastRow() > 1) {
    const pendingOrders = ordersSheet.getRange(2, 8, ordersSheet.getLastRow() - 1, 1)
      .getValues()
      .filter(row => row[0] === 'Paid')
      .length;
    dashboard.getRange('B8').setValue(pendingOrders);
  }
  
  // Update last refresh time
  dashboard.getRange('B4').setValue(new Date().toLocaleString());
}

/**
 * Export sheet data to CSV
 */
function exportSheetToCSV(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  let csv = '';
  
  for (let row of data) {
    csv += row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma
      let value = cell.toString();
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    }).join(',') + '\n';
  }
  
  return csv;
}

/**
 * Create backup of all data
 */
function createDataBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backupFolder = DriveApp.createFolder(`Etsy Backup ${new Date().toISOString()}`);
  
  const sheetsToBackup = ['Shops', 'Listings', 'Orders', 'Inventory'];
  
  sheetsToBackup.forEach(sheetName => {
    const csv = exportSheetToCSV(sheetName);
    if (csv) {
      backupFolder.createFile(`${sheetName}.csv`, csv, MimeType.CSV);
    }
  });
  
  return backupFolder.getUrl();
}

/**
 * Format currency values
 */
function formatCurrency(sheet, columns) {
  columns.forEach(col => {
    const range = sheet.getRange(2, col, sheet.getLastRow() - 1, 1);
    range.setNumberFormat('$#,##0.00');
  });
}

/**
 * Format date columns
 */
function formatDates(sheet, columns) {
  columns.forEach(col => {
    const range = sheet.getRange(2, col, sheet.getLastRow() - 1, 1);
    range.setNumberFormat('yyyy-mm-dd hh:mm');
  });
}

/**
 * Create charts for dashboard
 */
function createDashboardCharts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('Dashboard');
  const ordersSheet = ss.getSheetByName('Orders');
  
  if (!ordersSheet || ordersSheet.getLastRow() < 2) return;
  
  // Clear existing charts
  const charts = dashboard.getCharts();
  charts.forEach(chart => dashboard.removeChart(chart));
  
  // Create order status pie chart
  const statusRange = ordersSheet.getRange(2, 8, ordersSheet.getLastRow() - 1, 1);
  const chart = dashboard.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(statusRange)
    .setPosition(15, 1, 0, 0)
    .setOption('title', 'Order Status Distribution')
    .setOption('width', 400)
    .setOption('height', 300)
    .build();
  
  dashboard.insertChart(chart);
}

/**
 * Set up triggers for auto-refresh
 */
function setupAutoRefresh() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  const autoRefresh = settingsSheet.getRange('B9').getValue();
  const refreshRate = settingsSheet.getRange('B10').getValue() || 15;
  
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoRefreshData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger if auto-refresh is enabled
  if (autoRefresh) {
    ScriptApp.newTrigger('autoRefreshData')
      .timeBased()
      .everyMinutes(refreshRate)
      .create();
  }
}

/**
 * Auto-refresh data function
 */
function autoRefreshData() {
  try {
    importListings();
    Utilities.sleep(2000);
    importOrders();
    updateSummaryStats();
  } catch (error) {
    console.error('Auto-refresh error:', error);
  }
}