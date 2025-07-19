/**
 * Configuration constants and settings
 */

// API Configuration
const CONFIG = {
  // Etsy API endpoints
  API: {
    BASE_URL: 'https://api.etsy.com/v3/application',
    PING_URL: 'https://api.etsy.com/v3/application/openapi-ping',
    AUTH_URL: 'https://www.etsy.com/oauth/connect',
    TOKEN_URL: 'https://api.etsy.com/v3/public/oauth/token'
  },
  
  // OAuth settings
  OAUTH: {
    SCOPES: 'listings_r listings_w shops_r shops_w transactions_r',
    RESPONSE_TYPE: 'code',
    CODE_CHALLENGE_METHOD: 'S256',
    TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000 // 5 minutes in milliseconds
  },
  
  // Rate limiting
  RATE_LIMITS: {
    DAILY_LIMIT: 10000,
    PER_SECOND_LIMIT: 10,
    REQUEST_DELAY: 100, // milliseconds between requests
    RETRY_DELAY: 1000, // base delay for retries
    MAX_RETRIES: 3
  },
  
  // Sheet names
  SHEETS: {
    DASHBOARD: 'Dashboard',
    SETTINGS: 'Settings',
    SHOPS: 'Shops',
    LISTINGS: 'Listings',
    ORDERS: 'Orders',
    INVENTORY: 'Inventory',
    API_LOGS: 'API Logs',
    DATA_DICTIONARY: 'Data Dictionary'
  },
  
  // Default values
  DEFAULTS: {
    MAX_RECORDS: 100,
    REFRESH_RATE: 15, // minutes
    BATCH_SIZE: 50,
    DESCRIPTION_LENGTH: 500 // characters to show in sheets
  },
  
  // Column indices (1-based for Sheets API)
  COLUMNS: {
    LISTINGS: {
      ID: 1,
      TITLE: 2,
      DESCRIPTION: 3,
      PRICE: 4,
      CURRENCY: 5,
      QUANTITY: 6,
      SKU: 7,
      STATUS: 8,
      URL: 9,
      TAGS: 10,
      MATERIALS: 11,
      SECTION_ID: 12,
      FEATURED_RANK: 13,
      VIEWS: 14,
      FAVORITES: 15,
      CREATED: 16,
      UPDATED: 17
    },
    ORDERS: {
      ID: 1,
      DATE: 2,
      CUSTOMER_NAME: 3,
      CUSTOMER_EMAIL: 4,
      ITEMS: 5,
      TOTAL: 6,
      CURRENCY: 7,
      STATUS: 8,
      PAYMENT_METHOD: 9,
      SHIPPED_DATE: 10,
      TRACKING_CODE: 11,
      TRACKING_URL: 12,
      SHIP_TO_NAME: 13,
      SHIP_TO_ADDRESS: 14,
      NOTE: 15,
      GIFT_MESSAGE: 16
    },
    INVENTORY: {
      LISTING_ID: 1,
      PRODUCT_ID: 2,
      SKU: 3,
      PROP1_NAME: 4,
      PROP1_VALUE: 5,
      PROP2_NAME: 6,
      PROP2_VALUE: 7,
      PRICE: 8,
      QUANTITY: 9,
      ENABLED: 10,
      DELETED: 11,
      UPDATED: 12
    }
  },
  
  // Error messages
  ERRORS: {
    NO_API_KEY: 'API Key not configured. Please set up in Settings sheet.',
    NO_SHOP_ID: 'Shop ID not found. Please import shop info first.',
    NOT_AUTHENTICATED: 'Not authenticated. Please connect to Etsy first.',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
    INVALID_TOKEN: 'Invalid or expired token. Please re-authenticate.',
    NO_SHOPS: 'No shops found for this user.',
    IMPORT_FAILED: 'Failed to import data. Check API Logs for details.'
  },
  
  // Success messages
  SUCCESS: {
    CONNECTION_TEST: 'Successfully connected to Etsy API',
    OAUTH_CONNECTED: 'Successfully connected to Etsy',
    DATA_IMPORTED: 'Data imported successfully',
    SETTINGS_SAVED: 'Settings saved successfully',
    BACKUP_CREATED: 'Backup created successfully'
  },
  
  // Colors for formatting
  COLORS: {
    HEADER_BG: '#F3F4F6',
    TITLE_BG: '#1F2937',
    SECTION_BG: '#E5E7EB',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#3B82F6',
    LOW_STOCK: '#FEE2E2',
    PENDING: '#DBEAFE',
    SHIPPED: '#D1FAE5',
    INACTIVE: '#FEF3C7',
    DISABLED: '#F3F4F6'
  }
};

// Property keys for storage
const PROPERTY_KEYS = {
  // Script properties
  API_KEY: 'ETSY_API_KEY',
  CLIENT_ID: 'ETSY_CLIENT_ID',
  
  // User properties
  ACCESS_TOKEN: 'etsy_access_token',
  REFRESH_TOKEN: 'etsy_refresh_token',
  TOKEN_EXPIRES: 'etsy_token_expires',
  CODE_VERIFIER: 'code_verifier',
  OAUTH_STATE: 'oauth_state',
  
  // Cache keys
  SHOP_DATA: 'cached_shop_data',
  TAXONOMY_DATA: 'cached_taxonomy_data'
};

// Validation rules
const VALIDATION = {
  PRICE: {
    MIN: 0.20,
    MAX: 50000,
    CURRENCY_CODES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
  },
  LISTING: {
    TITLE_MAX_LENGTH: 140,
    DESCRIPTION_MAX_LENGTH: 13000,
    TAGS_MAX: 13,
    TAG_MAX_LENGTH: 20,
    MATERIALS_MAX: 13,
    MATERIAL_MAX_LENGTH: 45
  },
  INVENTORY: {
    SKU_MAX_LENGTH: 32,
    MAX_VARIATIONS: 70,
    MAX_IMAGES: 10
  }
};

// Etsy specific enums
const ETSY_ENUMS = {
  WHO_MADE: {
    I_DID: 'i_did',
    SOMEONE_ELSE: 'someone_else',
    COLLECTIVE: 'collective'
  },
  WHEN_MADE: {
    MADE_TO_ORDER: 'made_to_order',
    '2020_2024': '2020_2024',
    '2010_2019': '2010_2019',
    '2000_2009': '2000_2009',
    '1990_1999': '1990_1999',
    BEFORE_1990: 'before_1990',
    VINTAGE: 'vintage'
  },
  LISTING_STATE: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SOLD_OUT: 'sold_out',
    EXPIRED: 'expired'
  },
  RECIPIENT: {
    MEN: 'men',
    WOMEN: 'women',
    UNISEX_ADULTS: 'unisex_adults',
    TEEN_BOYS: 'teen_boys',
    TEEN_GIRLS: 'teen_girls',
    TEENS: 'teens',
    BOYS: 'boys',
    GIRLS: 'girls',
    CHILDREN: 'children',
    BABY_BOYS: 'baby_boys',
    BABY_GIRLS: 'baby_girls',
    BABIES: 'babies',
    BIRDS: 'birds',
    CATS: 'cats',
    DOGS: 'dogs',
    PETS: 'pets',
    NOT_SPECIFIED: 'not_specified'
  }
};

// Property IDs for variations
const PROPERTY_IDS = {
  CUSTOM_1: 513,
  CUSTOM_2: 514,
  SIZE: 100,
  COLOR: 200,
  DIMENSIONS: 300,
  MATERIAL: 52047899002,
  PATTERN: 52047912002,
  SCENT: 52047766902,
  STYLE: 52340281461,
  HEIGHT: 55583922986,
  LENGTH: 68046097094,
  WIDTH: 68039346534
};