# Complete Etsy API v3 Data Models Documentation

This document provides comprehensive data models for all major entities in the Etsy API v3, including all fields, types, constraints, and relationships.

## Table of Contents
1. [Listing Data Model](#1-listing-data-model)
2. [Inventory/Variation Model](#2-inventoryvariation-model)
3. [Order/Receipt Model](#3-orderreceipt-model)
4. [Shop Model](#4-shop-model)
5. [Authentication Model](#5-authentication-model)

---

## 1. Listing Data Model

The listing object represents a product for sale on Etsy. It contains all product information, metadata, and relationships to other entities.

### Complete Listing Object Structure

```json
{
  "listing_id": 1234567890,                    // integer, unique identifier (read-only)
  "user_id": 123456,                           // integer, owner's user ID (read-only)
  "shop_id": 654321,                           // integer, shop ID (read-only)
  "title": "Handmade Ceramic Coffee Mug",      // string, max 140 characters (required)
  "description": "Beautiful handcrafted...",    // string, max 10,000 characters (required)
  "state": "active",                           // enum: active, inactive, draft, expired, sold_out (required)
  "creation_timestamp": 1640995200,            // integer, Unix timestamp (read-only)
  "created_timestamp": 1640995200,             // integer, Unix timestamp (read-only)
  "ending_timestamp": 1672531200,              // integer, Unix timestamp (read-only)
  "original_creation_timestamp": 1640995200,   // integer, Unix timestamp (read-only)
  "last_modified_timestamp": 1641081600,       // integer, Unix timestamp (read-only)
  "updated_timestamp": 1641081600,             // integer, Unix timestamp (read-only)
  "state_timestamp": 1640995200,               // integer, Unix timestamp (read-only)
  "quantity": 10,                              // integer, 0-999 (required)
  "shop_section_id": 12345,                    // integer or null, shop section reference
  "featured_rank": 1,                          // integer, position in shop (-1 if not featured)
  "url": "https://www.etsy.com/listing/...",  // string, public URL (read-only)
  "num_favorers": 42,                          // integer, favorite count (read-only)
  "non_taxable": false,                       // boolean, tax exemption status
  "is_taxable": true,                          // boolean, taxable status
  "is_customizable": true,                     // boolean, accepts customization
  "is_personalizable": true,                   // boolean, accepts personalization
  "personalization_is_required": false,        // boolean, personalization requirement
  "personalization_char_count_max": 50,        // integer or null, max personalization length
  "personalization_instructions": "Enter name", // string or null, personalization guide
  "listing_type": "physical",                  // enum: physical, download, both
  "tags": ["ceramic", "mug", "coffee"],       // array of strings, max 13 tags
  "materials": ["ceramic", "glaze"],          // array of strings, material list
  "shipping_profile_id": 98765,               // integer, shipping profile reference
  "return_policy_id": 54321,                  // integer, return policy reference
  "processing_min": 1,                         // integer, min processing days
  "processing_max": 3,                         // integer, max processing days
  "who_made": "i_did",                        // enum: i_did, someone_else, collective (required)
  "when_made": "2020_2024",                   // enum: made_to_order, 2020_2024, 2010_2019, etc. (required)
  "is_supply": false,                         // boolean, craft supply indicator
  "item_weight": 16,                          // float or null, weight value
  "item_weight_unit": "oz",                   // enum: oz, lb, g, kg (use oz, not lb)
  "item_length": 4,                           // float or null, length value
  "item_width": 4,                            // float or null, width value
  "item_height": 5,                           // float or null, height value
  "item_dimensions_unit": "in",               // enum: in, ft, mm, cm, m
  "is_private": false,                        // boolean, private listing flag
  "file_data": "",                            // string, deprecated field
  "has_variations": true,                     // boolean, variation indicator (read-only)
  "should_auto_renew": true,                  // boolean, auto-renewal setting
  "language": "en-US",                        // string, listing language
  "price": {                                  // object, price information (required)
    "amount": 2599,                          // integer, price in cents
    "divisor": 100,                          // integer, divisor for amount
    "currency_code": "USD"                   // string, ISO 4217 currency code
  },
  "taxonomy_id": 1212,                        // integer, category ID (required)
  "production_partners": [],                  // array, production partner IDs
  "skus": ["SKU-001", "SKU-002"],           // array of strings, SKU list (read-only)
  "views": 156,                               // integer, view count (read-only)
  "is_digital": false,                        // boolean, digital product flag
  "type": "physical"                          // enum: physical, download
}
```

### Field Constraints and Validation Rules

#### Required Fields for Creation
- `quantity`: 0-999
- `title`: 1-140 characters
- `description`: 1-10,000 characters  
- `price`: 0.20-50,000 USD equivalent
- `who_made`: Must be valid enum value
- `when_made`: Must be valid enum value
- `taxonomy_id`: Must be valid category ID

#### Optional but Important Fields
- `shipping_profile_id`: Required for physical items
- `image_ids`: At least 1 required for active state
- `tags`: Maximum 13 tags, 20 characters each
- `materials`: Maximum 13 materials
- `processing_min/max`: 1-10 weeks
- `personalization_char_count_max`: 1-500 characters

### State Transitions
```
draft -> active (requires at least 1 image)
active -> inactive
inactive -> active
active -> sold_out (automatic when quantity = 0)
active -> expired (automatic after listing period)
```

---

## 2. Inventory/Variation Model

The inventory system manages product variations, SKUs, pricing, and quantities through a hierarchical structure.

### Complete Inventory Structure

```json
{
  "products": [
    {
      "product_id": 987654321,                // integer, unique ID (read-only)
      "sku": "MUG-BLUE-LARGE",               // string, stock keeping unit
      "is_deleted": false,                    // boolean, deletion flag (read-only)
      "offerings": [
        {
          "offering_id": 123456789,           // integer, unique ID (read-only)
          "quantity": 25,                     // integer, available quantity
          "is_enabled": true,                 // boolean, availability flag
          "is_deleted": false,                // boolean, deletion flag (read-only)
          "price": {                          // object, price information
            "amount": 2999,                   // integer, price in cents
            "divisor": 100,                   // integer, divisor
            "currency_code": "USD"            // string, ISO 4217 code
          }
        }
      ],
      "property_values": [
        {
          "property_id": 200,                 // integer, property identifier
          "property_name": "Primary color",   // string, property name (read-only)
          "scale_id": 1,                      // integer, scale identifier
          "scale_name": "Colors",             // string, scale name (read-only)
          "values": ["Blue"],                 // array of strings, selected values
          "value_ids": [1243]                 // array of integers, value IDs
        },
        {
          "property_id": 100,                 // integer, property identifier
          "property_name": "Size",            // string, property name (read-only)
          "scale_id": 2,                      // integer, scale identifier
          "scale_name": "Sizes",              // string, scale name (read-only)
          "values": ["Large"],                // array of strings, selected values
          "value_ids": [102]                  // array of integers, value IDs
        }
      ]
    }
  ],
  "price_on_property": [200],                 // array of integers, properties affecting price
  "quantity_on_property": [100],              // array of integers, properties affecting quantity
  "sku_on_property": [100, 200]               // array of integers, properties affecting SKU
}
```

### Property System

#### Standard Properties
```json
{
  "standard_properties": {
    "100": "Size",
    "200": "Primary color", 
    "52": "Secondary color",
    "55": "Tertiary color",
    "501": "Occasion",
    "502": "Holiday",
    "503": "Diameter",
    "504": "Dimensions",
    "505": "Fabric",
    "506": "Finish",
    "507": "Flavor",
    "508": "Gemstone",
    "509": "Height",
    "510": "Length",
    "511": "Material",
    "512": "Pattern",
    "513": "Custom Property 1",      // For custom variations
    "514": "Custom Property 2",      // For custom variations
    "515": "Scent",
    "516": "Shape",
    "517": "Style",
    "518": "Theme",
    "519": "Weight",
    "520": "Width",
    "521": "Device"
  }
}
```

### Inventory Update Rules

1. **Complete Replacement**: Must send entire inventory structure
2. **Clean Data**: Remove read-only fields before updating
3. **SKU Consistency**: Products with same SKU must have same quantity
4. **Price Conversion**: Convert price objects to decimal format
5. **Property Matching**: Property values must match taxonomy requirements

### Example: Multi-Variation Product

```json
{
  "products": [
    {
      "sku": "SHIRT-S-RED",
      "offerings": [{
        "price": 25.99,
        "quantity": 10,
        "is_enabled": true
      }],
      "property_values": [
        {"property_id": 100, "values": ["Small"], "value_ids": [101]},
        {"property_id": 200, "values": ["Red"], "value_ids": [1213]}
      ]
    },
    {
      "sku": "SHIRT-S-BLUE", 
      "offerings": [{
        "price": 25.99,
        "quantity": 15,
        "is_enabled": true
      }],
      "property_values": [
        {"property_id": 100, "values": ["Small"], "value_ids": [101]},
        {"property_id": 200, "values": ["Blue"], "value_ids": [1243]}
      ]
    },
    {
      "sku": "SHIRT-M-RED",
      "offerings": [{
        "price": 27.99,
        "quantity": 20,
        "is_enabled": true
      }],
      "property_values": [
        {"property_id": 100, "values": ["Medium"], "value_ids": [102]},
        {"property_id": 200, "values": ["Red"], "value_ids": [1213]}
      ]
    },
    {
      "sku": "SHIRT-M-BLUE",
      "offerings": [{
        "price": 27.99,
        "quantity": 25,
        "is_enabled": true
      }],
      "property_values": [
        {"property_id": 100, "values": ["Medium"], "value_ids": [102]},
        {"property_id": 200, "values": ["Blue"], "value_ids": [1243]}
      ]
    }
  ],
  "price_on_property": [100],      // Size affects price
  "quantity_on_property": [],      // No property affects quantity
  "sku_on_property": [100, 200]    // Both size and color affect SKU
}
```

---

## 3. Order/Receipt Model

Orders in Etsy are represented as receipts containing transactions for individual items.

### Complete Receipt Structure

```json
{
  "receipt_id": 2123456789,                   // integer, unique identifier
  "receipt_type": 0,                          // integer, receipt type
  "seller_user_id": 123456,                   // integer, seller's user ID
  "seller_email": "seller@example.com",       // string, seller email
  "buyer_user_id": 654321,                    // integer, buyer's user ID
  "buyer_email": "buyer@example.com",         // string, buyer email
  "name": "John Doe",                         // string, buyer name
  "first_line": "123 Main St",                // string, address line 1
  "second_line": "Apt 4B",                    // string or null, address line 2
  "city": "New York",                         // string, city
  "state": "NY",                              // string, state/province
  "zip": "10001",                             // string, postal code
  "status": "Paid",                           // enum: Paid, Shipped, Completed, Canceled
  "formatted_address": "John Doe\n123 Main...", // string, formatted address
  "country_iso": "US",                        // string, ISO country code
  "payment_method": "cc",                     // string, payment method
  "payment_email": "buyer@example.com",       // string, payment email
  "message_from_buyer": "Gift wrap please",   // string or null, buyer note
  "message_from_seller": "Thank you!",        // string or null, seller note
  "message_from_payment": "",                 // string, payment message
  "is_paid": true,                           // boolean, payment status
  "is_shipped": false,                       // boolean, shipment status
  "is_refunded": false,                      // boolean, refund status
  "is_gift": true,                           // boolean, gift indicator
  "gift_message": "Happy Birthday!",         // string or null, gift message
  "gift_wrap_price": {                       // object or null, gift wrap price
    "amount": 500,
    "divisor": 100,
    "currency_code": "USD"
  },
  "create_timestamp": 1641081600,            // integer, creation timestamp
  "created_timestamp": 1641081600,           // integer, creation timestamp
  "update_timestamp": 1641168000,            // integer, update timestamp
  "updated_timestamp": 1641168000,           // integer, update timestamp
  "grandtotal": {                            // object, total amount
    "amount": 3599,
    "divisor": 100,
    "currency_code": "USD"
  },
  "subtotal": {                              // object, subtotal amount
    "amount": 2999,
    "divisor": 100,
    "currency_code": "USD"
  },
  "total_price": {                           // object, total price
    "amount": 3599,
    "divisor": 100,
    "currency_code": "USD"
  },
  "total_shipping_cost": {                   // object, shipping cost
    "amount": 600,
    "divisor": 100,
    "currency_code": "USD"
  },
  "total_tax_cost": {                        // object, tax amount
    "amount": 0,
    "divisor": 100,
    "currency_code": "USD"
  },
  "total_vat_cost": {                        // object, VAT amount
    "amount": 0,
    "divisor": 100,
    "currency_code": "USD"
  },
  "discount_amt": {                          // object, discount amount
    "amount": 0,
    "divisor": 100,
    "currency_code": "USD"
  },
  "transactions": [                          // array, transaction list
    {
      "transaction_id": 3123456789,          // integer, unique ID
      "title": "Handmade Ceramic Coffee Mug", // string, listing title
      "description": "Blue ceramic mug...",   // string, listing description
      "seller_user_id": 123456,              // integer, seller ID
      "buyer_user_id": 654321,               // integer, buyer ID
      "create_timestamp": 1641081600,        // integer, creation time
      "created_timestamp": 1641081600,       // integer, creation time
      "paid_timestamp": 1641081600,          // integer, payment time
      "shipped_timestamp": null,             // integer or null, ship time
      "quantity": 1,                         // integer, quantity ordered
      "listing_image_id": 4123456789,        // integer, image ID
      "receipt_id": 2123456789,              // integer, receipt reference
      "is_digital": false,                   // boolean, digital indicator
      "file_data": "",                       // string, deprecated
      "listing_id": 1234567890,              // integer, listing reference
      "transaction_type": "listing",         // string, transaction type
      "product_id": 987654321,               // integer, product ID
      "sku": "MUG-BLUE-LARGE",              // string, SKU
      "price": {                             // object, unit price
        "amount": 2999,
        "divisor": 100,
        "currency_code": "USD"
      },
      "shipping_cost": {                     // object, shipping cost
        "amount": 600,
        "divisor": 100,
        "currency_code": "USD"
      },
      "variations": [                        // array, selected variations
        {
          "property_id": 200,
          "value_id": 1243,
          "formatted_name": "Primary color",
          "formatted_value": "Blue"
        },
        {
          "property_id": 100,
          "value_id": 102,
          "formatted_name": "Size",
          "formatted_value": "Large"
        }
      ],
      "product_data": [                      // array, product attributes
        {
          "property_id": 200,
          "property_name": "Primary color",
          "scale_id": 1,
          "scale_name": "Colors",
          "values": ["Blue"],
          "value_ids": [1243]
        }
      ],
      "shipping_profile_id": 98765,          // integer, shipping profile
      "min_processing_days": 1,              // integer, min processing
      "max_processing_days": 3,              // integer, max processing
      "shipping_method": "Standard",         // string, shipping method
      "shipping_upgrade": null,              // string or null, upgrade
      "expected_ship_date": 1641254400,      // integer, expected ship date
      "buyer_coupon": 0,                     // number, coupon amount
      "shop_coupon": 0                       // number, shop coupon
    }
  ],
  "shipments": [                             // array, shipment records
    {
      "receipt_shipping_id": 5123456789,     // integer, unique ID
      "shipment_notification_timestamp": 1641340800, // integer, notification time
      "carrier_name": "USPS",                // string, carrier name
      "tracking_code": "9400100000000000000000" // string, tracking number
    }
  ],
  "refunds": []                              // array, refund records
}
```

### Transaction States and Workflow

```
1. Paid -> Order placed, payment confirmed
2. Shipped -> Tracking added, buyer notified
3. Completed -> Delivered or time elapsed
4. Canceled -> Order canceled (rare)
```

### Shipment Tracking Structure

```json
{
  "tracking_code": "9400100000000000000000",  // string, tracking number (required)
  "carrier_name": "USPS",                     // string, carrier name (required)
  "send_bcc": false,                          // boolean, BCC seller on notification
  "note_to_buyer": "Your order has shipped!"  // string, optional message
}
```

### Payment Structure (Read-Only)

```json
{
  "payment_id": 6123456789,                   // integer, unique ID
  "buyer_user_id": 654321,                    // integer, buyer ID
  "shop_id": 789012,                          // integer, shop ID
  "receipt_id": 2123456789,                   // integer, receipt reference
  "amount": {                                 // object, payment amount
    "amount": 3599,
    "divisor": 100,
    "currency_code": "USD"
  },
  "currency": "USD",                          // string, currency code
  "create_timestamp": 1641081600,             // integer, creation time
  "created_timestamp": 1641081600,            // integer, creation time
  "update_timestamp": 1641081600,             // integer, update time
  "updated_timestamp": 1641081600             // integer, update time
}
```

---

## 4. Shop Model

The shop model represents a seller's storefront with all configuration and policy settings.

### Complete Shop Structure

```json
{
  "shop_id": 789012,                          // integer, unique identifier
  "shop_name": "CreativeHandmadeShop",        // string, URL slug
  "title": "Creative Handmade Shop",          // string, display name
  "first_line": "123 Craft Ave",              // string, address line 1
  "second_line": "Suite 100",                 // string or null, address line 2
  "city": "Brooklyn",                         // string, city
  "state": "NY",                              // string, state/province
  "zip": "11201",                             // string, postal code
  "country_iso": "US",                        // string, ISO country code
  "lat": 40.6937,                             // float, latitude
  "lon": -73.9859,                            // float, longitude
  "user_id": 123456,                          // integer, owner user ID
  "create_date": 1609459200,                  // integer, creation timestamp
  "created_timestamp": 1609459200,            // integer, creation timestamp
  "update_date": 1641081600,                  // integer, update timestamp
  "updated_timestamp": 1641081600,            // integer, update timestamp
  "currency_code": "USD",                     // string, shop currency
  "language": "en-US",                        // string, shop language
  "seller_info": {                            // object, seller details
    "email": "shop@example.com",
    "has_onboarded": true,
    "is_star_seller": true,
    "star_seller_date": 1635724800
  },
  "announcement": "Welcome to our shop!",      // string, shop announcement
  "sale_message": "20% off this week!",       // string, sale message
  "digital_sale_message": "Digital items 50% off", // string, digital sale message
  "policy_welcome": "Thank you for visiting",  // string, welcome message
  "policy_payment": "We accept all major...",  // string, payment policy
  "policy_shipping": "Items ship within...",   // string, shipping policy
  "policy_refunds": "We accept returns...",    // string, refund policy
  "policy_privacy": "Your privacy is...",      // string, privacy policy
  "policy_seller_info": "About us...",         // string, seller information
  "policy_additional": "Custom orders...",      // string, additional policies
  "vacation_autoreply": "We're on vacation",   // string, vacation message
  "vacation_on": false,                        // boolean, vacation mode
  "is_vacation": false,                        // boolean, vacation status
  "has_unstructured_policies": false,          // boolean, policy format
  "has_private_receipt_info": false,           // boolean, privacy setting
  "listing_active_count": 42,                  // integer, active listings
  "listing_inactive_count": 8,                 // integer, inactive listings
  "transaction_sold_count": 1523,              // integer, total sales
  "review_count": 245,                         // integer, review count
  "review_average": 4.8,                       // float, average rating
  "image_url_760x100": "https://...",         // string, banner image
  "icon_url_fullxfull": "https://...",        // string, shop icon
  "accepts_custom_requests": true,             // boolean, custom orders
  "custom_shops_state": 0,                     // integer, shop state
  "url": "https://www.etsy.com/shop/...",     // string, public URL
  "include_dispute_form_link": false,          // boolean, dispute setting
  "is_using_structured_policies": true,        // boolean, policy format
  "is_direct_checkout_onboarded": true,        // boolean, checkout setting
  "is_calculated_eligible": true,              // boolean, shipping calc
  "is_opted_in_to_buyer_promise": true,       // boolean, buyer promise
  "is_shop_location_protected": false,         // boolean, privacy setting
  "is_wholesale_only": false                   // boolean, wholesale flag
}
```

### Shop Section Structure

```json
{
  "shop_section_id": 12345,                    // integer, unique ID
  "shop_id": 789012,                           // integer, shop reference
  "title": "Mugs & Cups",                      // string, section name
  "rank": 1,                                   // integer, display order
  "user_id": 123456,                           // integer, owner ID
  "active_listing_count": 15                   // integer, active count
}
```

### Shipping Profile Structure

```json
{
  "shipping_profile_id": 98765,                // integer, unique ID
  "title": "Standard US Shipping",             // string, profile name
  "user_id": 123456,                          // integer, owner ID
  "min_processing_days": 1,                    // integer, min days
  "max_processing_days": 3,                    // integer, max days
  "processing_days_display_label": "1-3 business days", // string, display
  "origin_country_iso": "US",                  // string, origin country
  "origin_postal_code": "11201",               // string, origin zip
  "profile_type": "manual",                    // enum: manual, calculated
  "domestic_handling_fee": 0,                  // float, handling fee
  "international_handling_fee": 0,             // float, int'l handling
  "is_deleted": false,                         // boolean, deletion flag
  "shipping_profile_destinations": [           // array, destinations
    {
      "shipping_profile_destination_id": 111,   // integer, unique ID
      "shipping_profile_id": 98765,             // integer, profile ref
      "origin_country_iso": "US",               // string, origin
      "destination_country_iso": "US",          // string, destination
      "destination_region": "US",                // string, region
      "primary_cost": {                         // object, primary cost
        "amount": 599,
        "divisor": 100,
        "currency_code": "USD"
      },
      "secondary_cost": {                       // object, additional cost
        "amount": 299,
        "divisor": 100,
        "currency_code": "USD"
      },
      "shipping_carrier_id": 0,                 // integer, carrier ID
      "mail_class": "USPS First Class",        // string, mail class
      "min_delivery_days": 3,                   // integer, min delivery
      "max_delivery_days": 5                    // integer, max delivery
    }
  ],
  "shipping_profile_upgrades": [               // array, shipping upgrades
    {
      "shipping_profile_upgrade_id": 222,       // integer, unique ID
      "shipping_profile_id": 98765,             // integer, profile ref
      "upgrade_name": "Priority Mail",          // string, upgrade name
      "type": "DOMESTIC",                       // enum: DOMESTIC, INTERNATIONAL
      "rank": 0,                                // integer, display order
      "language": "en-US",                      // string, language
      "price": {                                // object, upgrade price
        "amount": 800,
        "divisor": 100,
        "currency_code": "USD"
      },
      "secondary_price": {                      // object, additional price
        "amount": 400,
        "divisor": 100,
        "currency_code": "USD"
      },
      "shipping_carrier_id": 1,                 // integer, carrier ID
      "mail_class": "USPS Priority",            // string, mail class
      "min_delivery_days": 1,                   // integer, min delivery
      "max_delivery_days": 3                    // integer, max delivery
    }
  ]
}
```

### Return Policy Structure

```json
{
  "return_policy_id": 54321,                   // integer, unique ID
  "shop_id": 789012,                           // integer, shop reference
  "accepts_returns": true,                     // boolean, returns accepted
  "accepts_exchanges": true,                   // boolean, exchanges accepted
  "return_deadline": 30,                       // integer, days to return
  "type": "full_refund",                       // enum: full_refund, partial_refund, exchange
  "policy_text": "We accept returns..."        // string, policy details
}
```

---

## 5. Authentication Model

Etsy API v3 uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for authentication.

### OAuth Token Structure

```json
{
  "access_token": "123456789.abcdefghijklmnop", // string, bearer token
  "token_type": "Bearer",                      // string, always "Bearer"
  "expires_in": 3600,                          // integer, seconds until expiry
  "refresh_token": "987654321.zyxwvutsrqponmlk" // string, refresh token
}
```

### Available OAuth Scopes

```json
{
  "scopes": {
    "address_r": "Read a member's shipping addresses",
    "address_w": "Write to a member's shipping addresses", 
    "billing_r": "Read a member's Etsy bill charges and payments",
    "cart_r": "Read the contents of a member's cart",
    "cart_w": "Write to a member's cart",
    "email_r": "Read a member's email address",
    "favorites_r": "Read a member's favorite listings and users",
    "favorites_w": "Write to a member's favorite listings and users",
    "feedback_r": "Read a member's purchase and sales feedback",
    "listings_d": "Delete a member's listings",
    "listings_r": "Read a member's listings",
    "listings_w": "Write to a member's listings",
    "profile_r": "Read a member's profile",
    "profile_w": "Write to a member's profile",
    "recommend_r": "Read a member's recommended listings",
    "recommend_w": "Write to a member's recommended listings",
    "shops_r": "Read a member's shops",
    "shops_w": "Write to a member's shops",
    "transactions_r": "Read a member's purchase and sales transactions",
    "transactions_w": "Write to a member's purchase and sales transactions"
  }
}
```

### User Data Model

```json
{
  "user_id": 123456,                          // integer, unique identifier
  "primary_email": "user@example.com",        // string, email (requires email_r)
  "first_name": "John",                       // string, first name
  "last_name": "Doe",                         // string, last name
  "display_name": "JohnD",                    // string, display name
  "nickname": "johndoe",                      // string, username
  "birth_month": 5,                           // integer, birth month
  "birth_day": 15,                            // integer, birth day
  "birth_year": 1985,                         // integer, birth year
  "bio": "Handmade crafts enthusiast",        // string, user bio
  "gender": "male",                           // string, gender
  "country_id": 209,                          // integer, country ID
  "region": "New York",                       // string, region/state
  "city": "Brooklyn",                         // string, city
  "location": "Brooklyn, NY",                 // string, formatted location
  "avatar_url": "https://...",                // string, profile image
  "is_seller": true,                          // boolean, seller status
  "transaction_buy_count": 42,                // integer, purchases
  "transaction_sold_count": 156               // integer, sales
}
```

### Authentication Flow Example

```javascript
// Step 1: Generate PKCE challenge
const generateCodeChallenge = () => {
  const verifier = generateRandomString(128);
  const challenge = base64URLEncode(sha256(verifier));
  return { verifier, challenge };
};

// Step 2: Authorization URL
const authParams = {
  response_type: 'code',
  redirect_uri: 'https://yourapp.com/callback',
  scope: 'listings_r listings_w shops_r shops_w',
  client_id: 'your_client_id',
  state: generateRandomString(32),
  code_challenge: pkce.challenge,
  code_challenge_method: 'S256'
};

const authUrl = `https://www.etsy.com/oauth/connect?${new URLSearchParams(authParams)}`;

// Step 3: Token exchange
const tokenRequest = {
  grant_type: 'authorization_code',
  client_id: 'your_client_id',
  redirect_uri: 'https://yourapp.com/callback',
  code: authorizationCode,
  code_verifier: pkce.verifier
};

const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(tokenRequest)
});

// Step 4: Token refresh
const refreshRequest = {
  grant_type: 'refresh_token',
  client_id: 'your_client_id',
  refresh_token: storedRefreshToken
};

const refreshResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(refreshRequest)
});
```

### Permission Relationships

```json
{
  "permission_hierarchy": {
    "listings": {
      "read": ["listings_r"],
      "write": ["listings_r", "listings_w"],
      "delete": ["listings_r", "listings_w", "listings_d"]
    },
    "shops": {
      "read": ["shops_r"],
      "write": ["shops_r", "shops_w"]
    },
    "transactions": {
      "read": ["transactions_r"],
      "write": ["transactions_r", "transactions_w"]
    },
    "user": {
      "basic": ["profile_r"],
      "email": ["email_r"],
      "full": ["profile_r", "email_r", "profile_w"]
    }
  }
}
```

### Token Management Best Practices

1. **Storage**: Store tokens securely (encrypted database or secure key management)
2. **Refresh Strategy**: Refresh tokens before expiry (e.g., at 50% of expires_in)
3. **Error Handling**: Handle 401 errors by attempting token refresh
4. **Scope Minimization**: Request only necessary scopes
5. **PKCE Implementation**: Always use PKCE for enhanced security

---

## API Response Metadata

All API responses include standard metadata:

```json
{
  "count": 42,                               // integer, total results
  "results": [...],                          // array, actual data
  "params": {                                // object, request parameters
    "limit": 25,
    "offset": 0
  },
  "type": "Listing",                         // string, result type
  "pagination": {                            // object, pagination info
    "effective_limit": 25,
    "effective_offset": 0,
    "next_offset": 25,
    "effective_page": 1,
    "next_page": 2
  }
}
```

## Error Response Structure

```json
{
  "error": "Invalid auth token",             // string, error message
  "error_description": "The token has expired", // string, detailed description
  "error_code": 401,                        // integer, HTTP status code
  "request_id": "abc123def456"              // string, request tracking ID
}
```

## Rate Limit Headers

```
X-Limit-Per-Second: 10
X-Remaining-This-Second: 8
X-Limit-Per-Day: 10000
X-Remaining-Today: 9523
Retry-After: 2
```

This documentation provides complete data models for all major Etsy API v3 entities with full field definitions, types, constraints, and relationships. Each model includes both required and optional fields, validation rules, and example JSON structures for implementation reference.