/**
 * Utility functions and helpers
 */

/**
 * Format currency value
 */
function formatCurrency(amount, currencyCode = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  });
  
  return formatter.format(amount);
}

/**
 * Parse Etsy price object to decimal
 */
function parseEtsyPrice(priceObject) {
  if (!priceObject || !priceObject.amount || !priceObject.divisor) {
    return 0;
  }
  
  return priceObject.amount / priceObject.divisor;
}

/**
 * Convert decimal price to Etsy format
 */
function toEtsyPrice(decimalPrice, currencyCode = 'USD') {
  return {
    amount: Math.round(decimalPrice * 100),
    divisor: 100,
    currency_code: currencyCode
  };
}

/**
 * Convert Unix timestamp to Date
 */
function timestampToDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp * 1000);
}

/**
 * Format date for display
 */
function formatDate(date, format = 'yyyy-MM-dd HH:mm') {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return format
    .replace('yyyy', year)
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes);
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Clean text for CSV export
 */
function cleanForCSV(text) {
  if (!text) return '';
  
  // Convert to string and remove line breaks
  let cleaned = String(text).replace(/[\r\n]+/g, ' ');
  
  // Escape quotes
  cleaned = cleaned.replace(/"/g, '""');
  
  // Wrap in quotes if contains comma
  if (cleaned.includes(',')) {
    cleaned = `"${cleaned}"`;
  }
  
  return cleaned;
}

/**
 * Validate email address
 */
function isValidEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * Generate unique ID
 */
function generateUniqueId() {
  return Utilities.getUuid();
}

/**
 * Sleep with exponential backoff
 */
function sleepWithBackoff(attemptNumber, baseDelay = 1000) {
  const delay = baseDelay * Math.pow(2, attemptNumber - 1);
  Utilities.sleep(Math.min(delay, 30000)); // Max 30 seconds
}

/**
 * Batch array into chunks
 */
function batchArray(array, batchSize) {
  const batches = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Parse URL parameters
 */
function parseUrlParams(url) {
  const params = {};
  const queryString = url.split('?')[1];
  
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      params[key] = decodeURIComponent(value);
    });
  }
  
  return params;
}

/**
 * Build URL with parameters
 */
function buildUrl(baseUrl, params) {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = Object.keys(params)
    .filter(key => params[key] !== null && params[key] !== undefined)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
    
  return `${baseUrl}?${queryString}`;
}

/**
 * Calculate percentage
 */
function calculatePercentage(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate SKU format
 */
function isValidSKU(sku) {
  if (!sku) return true; // SKU is optional
  
  // Check length
  if (sku.length > VALIDATION.INVENTORY.SKU_MAX_LENGTH) {
    return false;
  }
  
  // Check for valid characters (alphanumeric, dash, underscore)
  const pattern = /^[a-zA-Z0-9_-]+$/;
  return pattern.test(sku);
}

/**
 * Extract numbers from string
 */
function extractNumbers(text) {
  if (!text) return null;
  
  const numbers = text.match(/\d+\.?\d*/g);
  return numbers ? numbers.map(n => parseFloat(n)) : null;
}

/**
 * Remove HTML tags
 */
function stripHtmlTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Convert object to form data string
 */
function objectToFormData(obj) {
  return Object.keys(obj)
    .filter(key => obj[key] !== null && obj[key] !== undefined)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
}

/**
 * Deep clone object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * Merge objects (shallow)
 */
function mergeObjects(...objects) {
  return Object.assign({}, ...objects);
}

/**
 * Check if value is empty
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Get elapsed time string
 */
function getElapsedTime(startTime) {
  const elapsed = Date.now() - startTime;
  
  if (elapsed < 1000) return `${elapsed}ms`;
  if (elapsed < 60000) return `${(elapsed / 1000).toFixed(1)}s`;
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ${Math.floor((elapsed % 60000) / 1000)}s`;
  
  return `${Math.floor(elapsed / 3600000)}h ${Math.floor((elapsed % 3600000) / 60000)}m`;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}

/**
 * Get sheet by name with error handling
 */
function getSheetSafely(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    return sheet;
  } catch (error) {
    console.error(`Error accessing sheet ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Retry function with error handling
 */
function retryOperation(operation, maxRetries = CONFIG.RATE_LIMITS.MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        sleepWithBackoff(attempt);
      }
    }
  }
  
  throw lastError;
}

/**
 * Cache with TTL
 */
class SimpleCache {
  constructor() {
    this.cache = {};
  }
  
  set(key, value, ttlMinutes = 60) {
    this.cache[key] = {
      value: value,
      expires: Date.now() + (ttlMinutes * 60 * 1000)
    };
  }
  
  get(key) {
    const item = this.cache[key];
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      delete this.cache[key];
      return null;
    }
    
    return item.value;
  }
  
  clear() {
    this.cache = {};
  }
}

// Create global cache instance
const globalCache = new SimpleCache();