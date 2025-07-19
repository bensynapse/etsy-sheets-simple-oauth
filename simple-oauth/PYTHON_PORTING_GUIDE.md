# Python Porting Guide for Etsy API Simple OAuth

This guide provides detailed instructions for porting the Google Apps Script implementation to Python, maintaining the same functionality and user experience.

## Table of Contents
1. [Architecture Translation](#architecture-translation)
2. [Required Libraries](#required-libraries)
3. [OAuth Implementation](#oauth-implementation)
4. [Storage Solutions](#storage-solutions)
5. [API Client Implementation](#api-client-implementation)
6. [UI Alternatives](#ui-alternatives)
7. [Data Management](#data-management)
8. [Complete Code Examples](#complete-code-examples)

## Architecture Translation

### Google Apps Script → Python Equivalents

| GAS Component | Python Equivalent | Purpose |
|--------------|-------------------|---------|
| PropertiesService | Config file / Environment vars | Store credentials |
| UrlFetchApp | requests library | HTTP requests |
| SpreadsheetApp | pandas + CSV/Excel | Data management |
| HtmlService | Flask/Streamlit/Tkinter | User interface |
| Utilities | hashlib, base64, time | Crypto and utilities |

### Project Structure
```
etsy-shop-manager/
├── config/
│   ├── __init__.py
│   └── settings.py
├── auth/
│   ├── __init__.py
│   └── oauth_handler.py
├── api/
│   ├── __init__.py
│   ├── client.py
│   └── endpoints.py
├── data/
│   ├── __init__.py
│   └── sheet_manager.py
├── ui/
│   ├── __init__.py
│   └── app.py
├── main.py
├── requirements.txt
└── .env.example
```

## Required Libraries

```txt
# requirements.txt
requests>=2.31.0
pandas>=2.0.0
openpyxl>=3.1.0
python-dotenv>=1.0.0
cryptography>=41.0.0
streamlit>=1.28.0  # or flask>=3.0.0 for web UI
tkinter  # for desktop UI (usually pre-installed)
pillow>=10.0.0  # for image handling
aiohttp>=3.8.0  # optional for async operations
```

## OAuth Implementation

### PKCE Flow in Python

```python
# auth/oauth_handler.py
import hashlib
import base64
import secrets
import webbrowser
from urllib.parse import urlencode, parse_qs, urlparse
import requests
from typing import Dict, Optional

class EtsyOAuthHandler:
    def __init__(self, api_key: str, redirect_uri: str = "http://localhost"):
        self.api_key = api_key
        self.redirect_uri = redirect_uri
        self.auth_base = "https://www.etsy.com/oauth/connect"
        self.token_url = "https://api.etsy.com/v3/public/oauth/token"
        self.scopes = "listings_r listings_w listings_d shops_r shops_w transactions_r email_r"
        
    def generate_pkce(self) -> Dict[str, str]:
        """Generate PKCE verifier and challenge"""
        # Generate random verifier (43-128 characters)
        verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        
        # Generate challenge
        challenge_bytes = hashlib.sha256(verifier.encode('utf-8')).digest()
        challenge = base64.urlsafe_b64encode(challenge_bytes).decode('utf-8').rstrip('=')
        
        return {
            'verifier': verifier,
            'challenge': challenge
        }
    
    def get_auth_url(self) -> Dict[str, str]:
        """Build authorization URL"""
        pkce = self.generate_pkce()
        state = secrets.token_urlsafe(16)
        
        params = {
            'response_type': 'code',
            'redirect_uri': self.redirect_uri,
            'scope': self.scopes,
            'client_id': self.api_key,
            'state': state,
            'code_challenge': pkce['challenge'],
            'code_challenge_method': 'S256'
        }
        
        auth_url = f"{self.auth_base}?{urlencode(params)}"
        
        return {
            'url': auth_url,
            'state': state,
            'verifier': pkce['verifier']
        }
    
    def exchange_code_for_token(self, code: str, verifier: str) -> Dict[str, any]:
        """Exchange authorization code for access token"""
        data = {
            'grant_type': 'authorization_code',
            'client_id': self.api_key,
            'redirect_uri': self.redirect_uri,
            'code': code,
            'code_verifier': verifier
        }
        
        response = requests.post(self.token_url, json=data)
        response.raise_for_status()
        
        return response.json()
    
    def refresh_token(self, refresh_token: str) -> Dict[str, any]:
        """Refresh access token"""
        data = {
            'grant_type': 'refresh_token',
            'client_id': self.api_key,
            'refresh_token': refresh_token
        }
        
        response = requests.post(self.token_url, json=data)
        response.raise_for_status()
        
        return response.json()
```

### Manual OAuth Flow

```python
# auth/manual_flow.py
def perform_manual_oauth(oauth_handler: EtsyOAuthHandler) -> Dict[str, str]:
    """Perform manual OAuth flow similar to GAS implementation"""
    # Step 1: Generate auth URL
    auth_data = oauth_handler.get_auth_url()
    
    # Step 2: Open browser
    print(f"Opening browser for authorization...")
    webbrowser.open(auth_data['url'])
    
    # Step 3: Get code from user
    print("\nAfter authorizing, you'll be redirected to localhost.")
    print("Copy the URL from your browser's address bar.")
    redirect_url = input("Paste the full URL here: ")
    
    # Step 4: Extract code
    parsed = urlparse(redirect_url)
    params = parse_qs(parsed.query)
    
    if 'code' not in params:
        raise ValueError("No authorization code found in URL")
    
    code = params['code'][0]
    
    # Step 5: Exchange for token
    token_data = oauth_handler.exchange_code_for_token(
        code, 
        auth_data['verifier']
    )
    
    return token_data
```

## Storage Solutions

### Configuration Management

```python
# config/settings.py
import os
import json
from pathlib import Path
from typing import Dict, Optional
from cryptography.fernet import Fernet

class ConfigManager:
    def __init__(self, config_path: str = "config.json"):
        self.config_path = Path(config_path)
        self.key_path = Path(".key")
        self._ensure_encryption_key()
        
    def _ensure_encryption_key(self):
        """Create encryption key if not exists"""
        if not self.key_path.exists():
            key = Fernet.generate_key()
            self.key_path.write_bytes(key)
            self.key_path.chmod(0o600)  # Restricted permissions
            
    def _get_cipher(self) -> Fernet:
        """Get encryption cipher"""
        key = self.key_path.read_bytes()
        return Fernet(key)
        
    def save_credentials(self, data: Dict[str, str]):
        """Save encrypted credentials"""
        cipher = self._get_cipher()
        encrypted_data = {}
        
        for key, value in data.items():
            if value:
                encrypted_data[key] = cipher.encrypt(value.encode()).decode()
                
        with open(self.config_path, 'w') as f:
            json.dump(encrypted_data, f)
            
    def load_credentials(self) -> Dict[str, str]:
        """Load and decrypt credentials"""
        if not self.config_path.exists():
            return {}
            
        cipher = self._get_cipher()
        
        with open(self.config_path, 'r') as f:
            encrypted_data = json.load(f)
            
        decrypted_data = {}
        for key, value in encrypted_data.items():
            decrypted_data[key] = cipher.decrypt(value.encode()).decode()
            
        return decrypted_data
```

### Token Management

```python
# auth/token_manager.py
import time
from typing import Optional

class TokenManager:
    def __init__(self, config_manager: ConfigManager):
        self.config = config_manager
        
    def save_tokens(self, token_data: Dict[str, any]):
        """Save OAuth tokens"""
        expires_at = time.time() + token_data['expires_in']
        
        self.config.save_credentials({
            'access_token': token_data['access_token'],
            'refresh_token': token_data['refresh_token'],
            'token_expires': str(expires_at)
        })
        
    def get_access_token(self) -> Optional[str]:
        """Get current access token"""
        creds = self.config.load_credentials()
        return creds.get('access_token')
        
    def needs_refresh(self) -> bool:
        """Check if token needs refresh"""
        creds = self.config.load_credentials()
        expires_at = float(creds.get('token_expires', 0))
        
        # Refresh if expires in less than 5 minutes
        return time.time() > (expires_at - 300)
```

## API Client Implementation

### Core API Client

```python
# api/client.py
import requests
import time
from typing import Dict, Optional, Any
from urllib.parse import urlencode

class EtsyAPIClient:
    def __init__(self, api_key: str, token_manager: TokenManager, oauth_handler: EtsyOAuthHandler):
        self.api_key = api_key
        self.token_manager = token_manager
        self.oauth_handler = oauth_handler
        self.base_url = "https://api.etsy.com/v3/application"
        self.rate_limit_delay = 0.5  # 500ms between requests
        self.last_request_time = 0
        
    def _get_headers(self) -> Dict[str, str]:
        """Get required headers"""
        # Refresh token if needed
        if self.token_manager.needs_refresh():
            self._refresh_token()
            
        token = self.token_manager.get_access_token()
        
        return {
            'Authorization': f'Bearer {token}',
            'x-api-key': self.api_key
        }
        
    def _refresh_token(self):
        """Refresh access token"""
        creds = self.token_manager.config.load_credentials()
        refresh_token = creds.get('refresh_token')
        
        if not refresh_token:
            raise ValueError("No refresh token available")
            
        token_data = self.oauth_handler.refresh_token(refresh_token)
        self.token_manager.save_tokens(token_data)
        
    def _rate_limit(self):
        """Implement rate limiting"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        self.last_request_time = time.time()
        
    def request(self, method: str, endpoint: str, 
                data: Optional[Dict] = None, 
                json_data: Optional[Dict] = None,
                files: Optional[Dict] = None) -> Any:
        """Make API request with error handling"""
        self._rate_limit()
        
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers()
        
        # Handle different content types
        if json_data:
            headers['Content-Type'] = 'application/json'
            response = requests.request(method, url, headers=headers, json=json_data)
        elif files:
            # Don't set Content-Type for multipart
            response = requests.request(method, url, headers=headers, files=files, data=data)
        elif data:
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
            # Convert arrays properly
            form_data = self._encode_form_data(data)
            response = requests.request(method, url, headers=headers, data=form_data)
        else:
            response = requests.request(method, url, headers=headers)
            
        # Handle rate limiting
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            print(f"Rate limited. Waiting {retry_after} seconds...")
            time.sleep(retry_after)
            return self.request(method, endpoint, data, json_data, files)
            
        response.raise_for_status()
        
        if response.content:
            return response.json()
        return None
        
    def _encode_form_data(self, data: Dict) -> str:
        """Encode form data with array support"""
        parts = []
        
        for key, value in data.items():
            if isinstance(value, list):
                for item in value:
                    parts.append(f"{key}[]={requests.utils.quote(str(item))}")
            else:
                parts.append(f"{key}={requests.utils.quote(str(value))}")
                
        return '&'.join(parts)
```

### API Endpoints

```python
# api/endpoints.py
from typing import List, Dict, Optional, Any

class EtsyAPI:
    def __init__(self, client: EtsyAPIClient):
        self.client = client
        
    # User endpoints
    def get_current_user(self) -> Dict:
        """Get current authenticated user"""
        return self.client.request('GET', '/users/me')
        
    def get_user_shops(self) -> Dict:
        """Get user's shops"""
        return self.client.request('GET', '/users/me/shops')
        
    # Shop endpoints
    def get_shop(self, shop_id: int) -> Dict:
        """Get shop details"""
        return self.client.request('GET', f'/shops/{shop_id}')
        
    def update_shop(self, shop_id: int, data: Dict) -> Dict:
        """Update shop information"""
        return self.client.request('PUT', f'/shops/{shop_id}', data=data)
        
    # Listing endpoints
    def get_shop_listings(self, shop_id: int, state: str = 'active', 
                         limit: int = 25, offset: int = 0) -> Dict:
        """Get shop listings"""
        params = {'state': state, 'limit': limit, 'offset': offset}
        endpoint = f'/shops/{shop_id}/listings?{urlencode(params)}'
        return self.client.request('GET', endpoint)
        
    def create_listing(self, shop_id: int, listing_data: Dict) -> Dict:
        """Create new listing"""
        return self.client.request('POST', f'/shops/{shop_id}/listings', 
                                 data=listing_data)
        
    def update_listing(self, shop_id: int, listing_id: int, 
                      updates: Dict) -> Dict:
        """Update listing"""
        return self.client.request('PATCH', 
                                 f'/shops/{shop_id}/listings/{listing_id}', 
                                 data=updates)
        
    def delete_listing(self, listing_id: int) -> None:
        """Delete listing"""
        self.client.request('DELETE', f'/listings/{listing_id}')
        
    # Inventory endpoints
    def get_listing_inventory(self, listing_id: int) -> Dict:
        """Get listing inventory"""
        return self.client.request('GET', f'/listings/{listing_id}/inventory')
        
    def update_listing_inventory(self, listing_id: int, 
                               inventory_data: Dict) -> Dict:
        """Update listing inventory"""
        return self.client.request('PUT', f'/listings/{listing_id}/inventory', 
                                 json_data=inventory_data)
        
    # Image endpoints
    def upload_listing_image(self, shop_id: int, listing_id: int, 
                           image_path: str, rank: int = 1) -> Dict:
        """Upload image to listing"""
        with open(image_path, 'rb') as f:
            files = {'image': f}
            data = {'rank': str(rank)}
            
        return self.client.request('POST', 
                                 f'/shops/{shop_id}/listings/{listing_id}/images',
                                 data=data, files=files)
                                 
    def upload_listing_image_from_url(self, shop_id: int, listing_id: int,
                                    image_url: str, rank: int = 1) -> Optional[Dict]:
        """Upload image from URL"""
        try:
            # Download image
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            # Check content type
            content_type = response.headers.get('content-type', '')
            if not content_type.startswith('image/'):
                print(f"Skipping non-image URL: {image_url}")
                return None
                
            # Upload to Etsy
            files = {'image': (f'image_{rank}.jpg', response.content)}
            data = {'rank': str(rank)}
            
            return self.client.request('POST',
                                     f'/shops/{shop_id}/listings/{listing_id}/images',
                                     data=data, files=files)
        except Exception as e:
            print(f"Error uploading image from {image_url}: {e}")
            return None
```

## UI Alternatives

### Option 1: Streamlit Web UI

```python
# ui/streamlit_app.py
import streamlit as st
import pandas as pd
from typing import Dict, List

class EtsyShopManager:
    def __init__(self, api: EtsyAPI):
        self.api = api
        
    def run(self):
        st.set_page_config(page_title="Etsy Shop Manager", layout="wide")
        st.title("Etsy Shop Manager")
        
        # Sidebar for authentication
        with st.sidebar:
            self.auth_section()
            
        # Main content
        if st.session_state.get('authenticated', False):
            self.main_section()
        else:
            st.info("Please authenticate in the sidebar to continue.")
            
    def auth_section(self):
        st.header("Authentication")
        
        # Step 1: API Key
        api_key = st.text_input("API Key", type="password")
        
        if st.button("Save API Key"):
            st.session_state['api_key'] = api_key
            st.success("API Key saved!")
            
        # Step 2: OAuth
        if st.session_state.get('api_key'):
            if st.button("Connect to Etsy"):
                # Generate auth URL
                auth_data = self.generate_auth_url()
                st.session_state['auth_data'] = auth_data
                
                # Show URL
                st.code(auth_data['url'])
                st.info("Click the URL above, authorize, then paste the code below")
                
            # Code input
            if st.session_state.get('auth_data'):
                code = st.text_input("Authorization Code")
                
                if st.button("Submit Code"):
                    # Exchange for token
                    self.exchange_code(code)
                    st.session_state['authenticated'] = True
                    st.success("Connected!")
                    
    def main_section(self):
        tab1, tab2, tab3 = st.tabs(["Shop Data", "Product Upload", "Inventory"])
        
        with tab1:
            self.shop_data_tab()
            
        with tab2:
            self.product_upload_tab()
            
        with tab3:
            self.inventory_tab()
            
    def product_upload_tab(self):
        st.header("Product Upload")
        
        # File upload
        uploaded_file = st.file_uploader("Choose a CSV file", type="csv")
        
        if uploaded_file:
            df = pd.read_csv(uploaded_file)
            st.dataframe(df)
            
            if st.button("Upload Products"):
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                results = []
                for idx, row in df.iterrows():
                    # Update progress
                    progress = (idx + 1) / len(df)
                    progress_bar.progress(progress)
                    status_text.text(f"Uploading {idx + 1}/{len(df)}")
                    
                    # Upload product
                    result = self.upload_product(row)
                    results.append(result)
                    
                # Show results
                st.success(f"Upload complete! {sum(r['success'] for r in results)} succeeded")
                st.dataframe(pd.DataFrame(results))
```

### Option 2: Desktop GUI with Tkinter

```python
# ui/desktop_app.py
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import threading

class EtsyDesktopApp:
    def __init__(self, api: EtsyAPI):
        self.api = api
        self.root = tk.Tk()
        self.root.title("Etsy Shop Manager")
        self.root.geometry("800x600")
        
        self.setup_ui()
        
    def setup_ui(self):
        # Create notebook for tabs
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill='both', expand=True)
        
        # Auth tab
        auth_frame = ttk.Frame(notebook)
        notebook.add(auth_frame, text="Authentication")
        self.setup_auth_tab(auth_frame)
        
        # Upload tab
        upload_frame = ttk.Frame(notebook)
        notebook.add(upload_frame, text="Product Upload")
        self.setup_upload_tab(upload_frame)
        
    def setup_auth_tab(self, parent):
        # API Key section
        ttk.Label(parent, text="API Key:").grid(row=0, column=0, padx=5, pady=5)
        self.api_key_entry = ttk.Entry(parent, width=50, show="*")
        self.api_key_entry.grid(row=0, column=1, padx=5, pady=5)
        
        ttk.Button(parent, text="Save API Key", 
                  command=self.save_api_key).grid(row=0, column=2, padx=5, pady=5)
        
        # OAuth section
        ttk.Button(parent, text="Connect to Etsy", 
                  command=self.start_oauth).grid(row=1, column=0, padx=5, pady=5)
        
        ttk.Label(parent, text="Auth Code:").grid(row=2, column=0, padx=5, pady=5)
        self.auth_code_entry = ttk.Entry(parent, width=50)
        self.auth_code_entry.grid(row=2, column=1, padx=5, pady=5)
        
        ttk.Button(parent, text="Submit Code", 
                  command=self.submit_code).grid(row=2, column=2, padx=5, pady=5)
        
        # Status
        self.status_label = ttk.Label(parent, text="Not connected")
        self.status_label.grid(row=3, column=0, columnspan=3, pady=10)
        
    def setup_upload_tab(self, parent):
        # File selection
        ttk.Button(parent, text="Select CSV File", 
                  command=self.select_file).pack(pady=10)
        
        self.file_label = ttk.Label(parent, text="No file selected")
        self.file_label.pack()
        
        # Upload button
        self.upload_button = ttk.Button(parent, text="Upload Products", 
                                       command=self.upload_products, 
                                       state='disabled')
        self.upload_button.pack(pady=10)
        
        # Progress
        self.progress = ttk.Progressbar(parent, length=400, mode='determinate')
        self.progress.pack(pady=10)
        
        self.progress_label = ttk.Label(parent, text="")
        self.progress_label.pack()
        
        # Results
        self.results_text = tk.Text(parent, height=20, width=80)
        self.results_text.pack(pady=10)
        
    def run(self):
        self.root.mainloop()
```

## Data Management

### CSV/Excel Handling

```python
# data/sheet_manager.py
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime

class SheetManager:
    def __init__(self):
        self.template_columns = [
            'Title*', 'Description*', 'Price*', 'Quantity*', 
            'SKU', 'Tags (comma separated)', 'Materials (comma separated)',
            'Who Made*', 'When Made*', 'Taxonomy ID*', 
            'Image URLs (comma separated)', 'Status', 'Result', 'Delete?'
        ]
        
    def create_product_template(self, filename: str = 'product_upload_template.csv'):
        """Create product upload template"""
        # Sample products
        sample_products = [
            {
                'Title*': 'Handmade Blue Ceramic Coffee Mug',
                'Description*': 'Beautiful handcrafted ceramic mug...',
                'Price*': 24.99,
                'Quantity*': 15,
                'SKU': 'MUG-BLUE-001',
                'Tags (comma separated)': 'ceramic,handmade,mug,coffee',
                'Materials (comma separated)': 'ceramic,glaze',
                'Who Made*': 'i_did',
                'When Made*': '2020_2024',
                'Taxonomy ID*': 1633,
                'Image URLs (comma separated)': 'https://picsum.photos/800/600?random=1',
                'Status': '',
                'Result': '',
                'Delete?': ''
            }
            # Add more sample products...
        ]
        
        df = pd.DataFrame(sample_products)
        df.to_csv(filename, index=False)
        print(f"Template created: {filename}")
        
    def read_product_data(self, filename: str) -> pd.DataFrame:
        """Read product data from CSV"""
        df = pd.read_csv(filename)
        
        # Filter out instruction rows
        df = df[~df['Title*'].str.startswith('INSTRUCTIONS', na=False)]
        df = df[df['Title*'].notna()]
        
        return df
        
    def update_product_status(self, filename: str, row_index: int, 
                            status: str, result: str):
        """Update product status in CSV"""
        df = pd.read_csv(filename)
        df.loc[row_index, 'Status'] = status
        df.loc[row_index, 'Result'] = result
        df.to_csv(filename, index=False)
        
    def export_results(self, results: List[Dict], 
                      filename: str = 'upload_results.xlsx'):
        """Export results to Excel"""
        df = pd.DataFrame(results)
        
        with pd.ExcelWriter(filename) as writer:
            # Summary sheet
            summary_df = pd.DataFrame([{
                'Total': len(results),
                'Successful': sum(1 for r in results if r.get('success')),
                'Failed': sum(1 for r in results if not r.get('success')),
                'Timestamp': datetime.now()
            }])
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            # Detailed results
            df.to_excel(writer, sheet_name='Results', index=False)
            
            # Failed items
            failed_df = df[~df['success']]
            if not failed_df.empty:
                failed_df.to_excel(writer, sheet_name='Failed', index=False)
                
        print(f"Results exported to: {filename}")
```

## Complete Code Examples

### Main Application

```python
# main.py
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from config.settings import ConfigManager
from auth.oauth_handler import EtsyOAuthHandler
from auth.token_manager import TokenManager
from api.client import EtsyAPIClient
from api.endpoints import EtsyAPI
from data.sheet_manager import SheetManager
from ui.streamlit_app import EtsyShopManager

def main():
    # Initialize components
    config = ConfigManager()
    
    # Load or get API key
    creds = config.load_credentials()
    api_key = creds.get('api_key')
    
    if not api_key:
        api_key = input("Enter your Etsy API key: ")
        config.save_credentials({'api_key': api_key})
    
    # Initialize OAuth and API
    oauth_handler = EtsyOAuthHandler(api_key)
    token_manager = TokenManager(config)
    api_client = EtsyAPIClient(api_key, token_manager, oauth_handler)
    api = EtsyAPI(api_client)
    
    # Initialize UI
    app = EtsyShopManager(api)
    app.run()

if __name__ == "__main__":
    main()
```

### Bulk Upload Script

```python
# scripts/bulk_upload.py
import asyncio
import aiohttp
from typing import List, Dict
import pandas as pd

class AsyncBulkUploader:
    def __init__(self, api: EtsyAPI, max_concurrent: int = 5):
        self.api = api
        self.semaphore = asyncio.Semaphore(max_concurrent)
        
    async def upload_product_async(self, session: aiohttp.ClientSession, 
                                 shop_id: int, product: Dict) -> Dict:
        """Upload single product asynchronously"""
        async with self.semaphore:
            try:
                # Create listing
                listing_data = self.prepare_listing_data(product)
                listing = await self.create_listing_async(session, shop_id, listing_data)
                
                # Upload images
                if product.get('image_urls'):
                    await self.upload_images_async(session, shop_id, 
                                                 listing['listing_id'], 
                                                 product['image_urls'])
                
                # Publish listing
                await self.publish_listing_async(session, shop_id, 
                                               listing['listing_id'])
                
                return {'success': True, 'listing_id': listing['listing_id']}
                
            except Exception as e:
                return {'success': False, 'error': str(e), 
                       'product': product.get('title')}
                       
    async def bulk_upload(self, shop_id: int, products: List[Dict]) -> List[Dict]:
        """Upload multiple products concurrently"""
        async with aiohttp.ClientSession() as session:
            tasks = [
                self.upload_product_async(session, shop_id, product)
                for product in products
            ]
            
            results = []
            for f in asyncio.as_completed(tasks):
                result = await f
                results.append(result)
                print(f"Progress: {len(results)}/{len(products)}")
                
        return results
```

### Command Line Interface

```python
# cli.py
import click
import pandas as pd
from pathlib import Path

@click.group()
def cli():
    """Etsy Shop Manager CLI"""
    pass

@cli.command()
@click.option('--api-key', prompt=True, hide_input=True)
def setup(api_key):
    """Initial setup"""
    config = ConfigManager()
    config.save_credentials({'api_key': api_key})
    click.echo("API key saved!")
    
@cli.command()
def auth():
    """Authenticate with Etsy"""
    # Perform OAuth flow
    click.echo("Opening browser for authentication...")
    # ... OAuth implementation
    
@cli.command()
@click.argument('csv_file', type=click.Path(exists=True))
@click.option('--shop-id', required=True, type=int)
def upload(csv_file, shop_id):
    """Upload products from CSV"""
    df = pd.read_csv(csv_file)
    click.echo(f"Uploading {len(df)} products...")
    
    with click.progressbar(df.iterrows(), length=len(df)) as rows:
        for idx, row in rows:
            # Upload product
            pass
            
@cli.command()
def template():
    """Create product upload template"""
    sheet_manager = SheetManager()
    sheet_manager.create_product_template()
    click.echo("Template created: product_upload_template.csv")

if __name__ == '__main__':
    cli()
```

## Migration Checklist

1. **Authentication**
   - [ ] Implement PKCE flow
   - [ ] Token storage and refresh
   - [ ] Manual OAuth process

2. **API Client**
   - [ ] Request handling with proper headers
   - [ ] Form encoding with array support
   - [ ] Rate limiting
   - [ ] Error handling and retries

3. **Data Management**
   - [ ] CSV/Excel reading and writing
   - [ ] Progress tracking
   - [ ] Result logging

4. **Features**
   - [ ] Shop data import
   - [ ] Product upload with images
   - [ ] Inventory updates
   - [ ] Bulk deletion

5. **UI Options**
   - [ ] Choose UI framework
   - [ ] Implement 3-step process
   - [ ] Progress indicators
   - [ ] Error display

## Performance Optimizations

1. **Async Operations**: Use aiohttp for concurrent uploads
2. **Batch Processing**: Process in chunks to avoid memory issues
3. **Caching**: Cache rarely-changing data (shipping profiles, policies)
4. **Connection Pooling**: Reuse HTTP connections
5. **Progress Streaming**: Update UI in real-time

## Security Considerations

1. **Credential Storage**: Always encrypt sensitive data
2. **Token Handling**: Never log or expose tokens
3. **Input Validation**: Validate all user input
4. **HTTPS Only**: Ensure all requests use HTTPS
5. **Scope Limitation**: Only request necessary OAuth scopes

This guide provides everything needed to port the Google Apps Script implementation to Python while maintaining the same functionality and user experience.