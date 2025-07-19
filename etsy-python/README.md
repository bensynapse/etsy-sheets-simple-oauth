# Etsy Shop Manager - Python Version

A complete Python implementation of the Etsy Shop Manager, matching all functionality from the Google Apps Script version. This application provides a Streamlit-based UI for managing your Etsy shop, including product uploads, inventory management, and order tracking.

## Features

All 42 functions from the GAS implementation are included:

### Shop Management (11 functions)
- Get user info and shops
- Import shop data (your shop or any shop)
- Get shop sections and policies
- Find shipping profiles
- OAuth management and authentication

### Listing Management (12 functions)
- Create new listings with full details
- Update existing listings
- Import listings to CSV/Excel
- Get listing details and variations
- Manage listing images
- Delete listings

### Upload & Images (9 functions)
- Bulk product upload from CSV
- Update prices and inventory
- Delete marked listings
- Upload product images
- Create and manage image variations

### Support Functions (6 functions)
- Shipping profile management
- Return policy handling
- Production partner management
- Taxonomy search and validation

### Order Management (4 functions)
- Import orders/receipts
- Get order details
- Add tracking information
- Order summary statistics

## Prerequisites

- Python 3.8 or higher
- Etsy seller account
- Etsy API credentials (get from https://www.etsy.com/developers/your-apps)

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd etsy-python
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy environment variables:
```bash
cp .env.example .env
```

5. Edit `.env` and add your Etsy API key

## Configuration

### Required Settings

1. **Etsy API Key**: Get from https://www.etsy.com/developers/your-apps
   - Also called "Keystring" or "Client ID" in Etsy's interface
   - Add to `.env` file as `ETSY_API_KEY`

2. **OAuth Scopes**: The app requests these permissions:
   - `listings_r` - Read listings
   - `listings_w` - Write/update listings  
   - `listings_d` - Delete listings
   - `shops_r` - Read shop info
   - `shops_w` - Write shop info
   - `transactions_r` - Read orders
   - `email_r` - Read email (for user info)

## Running the Application

### Option 1: Using the run script
```bash
chmod +x run.sh
./run.sh
```

### Option 2: Direct Streamlit command
```bash
streamlit run ui/app.py
```

### Option 3: Using main.py
```bash
python main.py
```

The app will open in your browser at http://localhost:8501

## Usage Guide

### First-Time Setup

1. **Step 1 - API Credentials**
   - Enter your Etsy API Key
   - Click "Save API Key"

2. **Step 2 - OAuth Connection**  
   - Click "Connect to Etsy"
   - Copy the authorization URL
   - Paste in browser and authorize
   - Copy the ENTIRE redirect URL
   - Paste back in the app
   - Click "Submit Code"

3. **Step 3 - Operations**
   - You're now connected!
   - Import your shop data
   - Start managing products

### Product Upload

1. Click "Create Upload Template" to generate a sample CSV
2. Edit the CSV with your products
3. Required fields:
   - Title, Description, Price, Quantity
   - Who Made (i_did, someone_else, collective)
   - When Made (made_to_order, 2020_2024, etc.)
   - Taxonomy ID (use search to find)
4. Click "Upload Products" and select your CSV
5. Monitor progress and check results

### Inventory Updates

1. Export current listings first
2. Update Price and Quantity columns
3. Use "Update Price & Inventory" button
4. Changes are applied immediately

### Deleting Listings

1. Mark listings with "X" in Delete? column
2. Click "Delete Marked Listings"
3. Confirm deletion (permanent!)

## Data Storage

- **Credentials**: Encrypted and stored locally
- **OAuth Tokens**: Encrypted with auto-refresh
- **Product Data**: CSV/Excel files in working directory
- **No Cloud Storage**: All data stays on your machine

## Important Notes

1. **OAuth Flow**: Uses PKCE without web server (localhost redirect)
2. **Rate Limits**: 10,000 requests/day, 10 requests/second
3. **Images**: Upload after listing creation
4. **Inventory**: Uses complete data replacement
5. **Variations**: Limited to 2 property types per listing

## Differences from GAS Version

- Uses Streamlit instead of Google Sheets sidebar
- Local file storage instead of Google Drive
- Pandas DataFrames instead of SpreadsheetApp
- Encrypted local storage instead of PropertiesService
- Progress bars and real-time updates

## Troubleshooting

### "insufficient_scope" Error
- Disconnect and reconnect to grant missing permissions
- Check that all required scopes are included

### Rate Limiting
- App includes automatic rate limiting
- Wait 1 minute if you hit limits

### Image Upload Failures
- Ensure images are JPEG, PNG, or GIF
- Maximum 10 images per listing
- Check file size (max 10MB)

### OAuth Issues
- Make sure to copy the ENTIRE redirect URL
- Don't include any extra spaces
- Token expires after 1 hour (auto-refreshes)

## Development

### Project Structure
```
etsy-python/
├── auth/           # OAuth and token management
├── api/            # Etsy API client and endpoints
├── services/       # Business logic for each feature
├── data/           # CSV/Excel data management
├── ui/             # Streamlit user interface
├── config/         # Settings and configuration
├── utils/          # Helper functions
└── main.py         # Entry point
```

### Running Tests
```bash
pytest tests/
```

### Code Style
```bash
black .
flake8 .
mypy .
```

## License

This project is provided as-is for educational and commercial use.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Etsy API documentation
3. Ensure your API credentials are correct

## Credits

Python implementation of the original Google Apps Script Etsy Shop Manager. Maintains complete feature parity with all 42 original functions.