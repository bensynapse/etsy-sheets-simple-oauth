"""
Etsy Shop Manager - Streamlit UI
Single page interface with no sidebar
"""

import streamlit as st
import pandas as pd
import logging
from pathlib import Path
import sys
import os
import time

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import ConfigManager
from auth.oauth_handler import EtsyOAuthHandler
from auth.token_manager import TokenManager
from api.client import EtsyAPIClient
from api.endpoints import EtsyAPI
from services import (
    ShopService, ListingService, UploadService, 
    SupportService, OrderService
)
from data.manager import DataManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page configuration - WIDE layout, NO sidebar
st.set_page_config(
    page_title="Etsy Shop Manager",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="collapsed"  # Hide sidebar
)

# Hide the sidebar completely
st.markdown("""
<style>
    /* Hide sidebar */
    section[data-testid="stSidebar"] {
        display: none;
    }
    
    /* Button styling */
    .stButton > button {
        background-color: #F1641E;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        font-weight: bold;
        margin: 0.25rem;
    }
    
    .stButton > button:hover {
        background-color: #d14a0a;
    }
    
    /* Make data editor full width */
    .stDataFrame {
        width: 100%;
    }
    
    /* Success/Error styling */
    .success-box {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 1rem;
        border-radius: 5px;
        margin: 1rem 0;
    }
    
    .error-box {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 1rem;
        border-radius: 5px;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)


class EtsyShopManager:
    """Main application class - simplified single page UI."""
    
    def __init__(self):
        """Initialize the application."""
        # Initialize session state
        if 'initialized' not in st.session_state:
            st.session_state.initialized = True
            st.session_state.authenticated = False
            st.session_state.uploaded_products = pd.DataFrame()
            st.session_state.api_key_set = False
            
        # Initialize components
        self.config = ConfigManager()
        self.token_manager = TokenManager(self.config)
        self.data_manager = DataManager()
        
        # Check authentication status
        if self.token_manager.is_authenticated():
            st.session_state.authenticated = True
            self._initialize_api()
        
        # Check if API key exists
        if self.config.get_api_key():
            st.session_state.api_key_set = True
            
    def _initialize_api(self):
        """Initialize API and services."""
        api_key = self.config.get_api_key()
        if not api_key:
            return
            
        # Initialize OAuth handler
        self.oauth_handler = EtsyOAuthHandler(api_key)
        self.token_manager.set_oauth_handler(self.oauth_handler)
        
        # Initialize API client
        self.api_client = EtsyAPIClient(api_key, self.token_manager)
        self.api = EtsyAPI(self.api_client)
        
        # Initialize services
        self.shop_service = ShopService(self.api, self.config)
        self.support_service = SupportService(self.api)
        self.listing_service = ListingService(self.api, self.shop_service)
        self.upload_service = UploadService(
            self.api, self.shop_service, 
            self.listing_service, self.support_service
        )
        self.order_service = OrderService(self.api, self.shop_service)
        
    def run(self):
        """Run the main application."""
        # Header
        st.title("🛍️ Etsy Shop Manager")
        
        # Authentication section
        self._show_auth_section()
        
        # Only show main content if authenticated
        if st.session_state.authenticated:
            st.divider()
            self._show_operations_section()
            st.divider()
            self._show_product_management()
        
    def _show_auth_section(self):
        """Show authentication section at top of page."""
        col1, col2, col3 = st.columns([2, 2, 1])
        
        with col1:
            if st.session_state.authenticated:
                st.success("✅ **Connected to Etsy**")
                # Load shop info if not already loaded
                if 'shop_info' not in st.session_state:
                    try:
                        result = self.shop_service.import_shop_data()
                        if result['success'] and 'data' in result:
                            st.session_state.shop_info = result['data']
                    except:
                        pass
            else:
                st.error("❌ **Not Connected**")
                
        with col2:
            if not st.session_state.api_key_set:
                # API Key input
                api_key = st.text_input(
                    "Enter Etsy API Key",
                    type="password",
                    placeholder="Your API key from developers.etsy.com",
                    label_visibility="collapsed"
                )
                if st.button("Set API Key"):
                    if api_key:
                        self.config.set_api_key(api_key)
                        st.session_state.api_key_set = True
                        st.rerun()
                    else:
                        st.error("Please enter API key")
                        
            elif not st.session_state.authenticated:
                # OAuth connection
                if st.button("🔗 Connect to Etsy"):
                    st.session_state.show_oauth = True
                    
        with col3:
            if st.session_state.authenticated:
                if st.button("🔌 Disconnect"):
                    self.shop_service.clear_auth()
                    st.session_state.authenticated = False
                    st.session_state.uploaded_products = pd.DataFrame()
                    # Clear shop info
                    if 'shop_info' in st.session_state:
                        del st.session_state.shop_info
                    st.rerun()
                    
        # OAuth flow (if needed)
        if getattr(st.session_state, 'show_oauth', False) and not st.session_state.authenticated:
            self._show_oauth_flow()
            
        # Show shop info if connected
        if st.session_state.authenticated and 'shop_info' in st.session_state:
            self._show_shop_info()
            
    def _show_oauth_flow(self):
        """Show OAuth authorization flow."""
        st.divider()
        st.subheader("🔐 Connect to Etsy")
        
        # Initialize OAuth handler
        api_key = self.config.get_api_key()
        oauth_handler = EtsyOAuthHandler(api_key)
        
        # Generate auth URL and store in session
        if 'oauth_auth_data' not in st.session_state:
            auth_data = oauth_handler.get_auth_url()
            st.session_state.oauth_auth_data = auth_data
        else:
            auth_data = st.session_state.oauth_auth_data
        
        col1, col2 = st.columns([3, 1])
        
        with col1:
            st.text_area(
                "1️⃣ Copy this URL and paste in your browser:",
                value=auth_data['url'],
                height=100,
                disabled=True
            )
            
            auth_code_url = st.text_input(
                "2️⃣ After authorizing, paste the ENTIRE redirect URL here:"
            )
            
        with col2:
            st.write("")  # Spacer
            st.write("")
            
            if st.button("✅ Submit", type="primary", use_container_width=True):
                if auth_code_url:
                    try:
                        # Extract code
                        code = oauth_handler.extract_code_from_url(auth_code_url)
                        
                        # Exchange for token using stored verifier
                        token_data = oauth_handler.exchange_code_for_token(
                            code, st.session_state.oauth_auth_data['verifier']
                        )
                        
                        # Save tokens
                        self.token_manager.save_tokens(token_data)
                        
                        st.success("Successfully connected to Etsy!")
                        st.session_state.authenticated = True
                        st.session_state.show_oauth = False
                        # Clear OAuth data
                        if 'oauth_auth_data' in st.session_state:
                            del st.session_state.oauth_auth_data
                        # Initialize API to load shop info
                        self._initialize_api()
                        time.sleep(1)
                        st.rerun()
                        
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
                else:
                    st.error("Please paste the redirect URL")
                    
    def _show_shop_info(self):
        """Display shop information in a nice info box."""
        shop_df = st.session_state.shop_info
        
        # Extract key values from the DataFrame
        shop_values = {}
        for _, row in shop_df.iterrows():
            if 'Field' in row and 'Value' in row and row['Field'] and row['Value']:
                shop_values[row['Field']] = row['Value']
        
        # Create compact info box
        info_parts = []
        if 'Shop Name' in shop_values:
            info_parts.append(f"🏪 **{shop_values['Shop Name']}**")
        if 'Shop ID' in shop_values:
            info_parts.append(f"ID: {shop_values['Shop ID']}")
        if 'Currency' in shop_values:
            info_parts.append(f"💰 {shop_values['Currency']}")
        if 'Active Listings' in shop_values:
            info_parts.append(f"📦 {shop_values['Active Listings']} listings")
        if 'Created' in shop_values:
            info_parts.append(f"Since {shop_values['Created']}")
            
        if info_parts:
            st.info(" | ".join(info_parts))
                    
    def _show_operations_section(self):
        """Show main operations buttons."""
        st.subheader("📊 Import Data")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            if st.button("🏪 Import My Shop", use_container_width=True):
                with st.spinner("Importing shop data..."):
                    try:
                        result = self.shop_service.import_shop_data()
                        if result['success']:
                            st.success(result['message'])
                        else:
                            st.error(result['message'])
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
                        
        with col2:
            if st.button("📦 Import Listings", use_container_width=True):
                with st.spinner("Importing listings..."):
                    try:
                        result = self.listing_service.import_listings()
                        if result['success']:
                            st.success(result['message'])
                            # Store imported listings in session state
                            if 'data' in result and not result['data'].empty:
                                # Convert imported listings to match uploaded products format
                                imported_df = result['data'].copy()
                                imported_df['source'] = 'Import'
                                imported_df['delete'] = False
                                # Rename columns to match
                                imported_df = imported_df.rename(columns={
                                    'Listing ID': 'listing_id',
                                    'Title': 'title',
                                    'Price': 'price',
                                    'Quantity': 'quantity',
                                    'Status': 'status'
                                })
                                # Add missing columns
                                if 'sku' not in imported_df.columns:
                                    imported_df['sku'] = ''
                                
                                # Store or append to existing products
                                if 'uploaded_products' not in st.session_state or st.session_state.uploaded_products.empty:
                                    st.session_state.uploaded_products = imported_df
                                else:
                                    # Remove duplicates - keep imported version if listing_id already exists
                                    existing_df = st.session_state.uploaded_products
                                    existing_ids = set(existing_df['listing_id'].tolist())
                                    imported_ids = set(imported_df['listing_id'].tolist())
                                    
                                    # Remove duplicates from existing
                                    duplicate_ids = existing_ids.intersection(imported_ids)
                                    if duplicate_ids:
                                        existing_df = existing_df[~existing_df['listing_id'].isin(duplicate_ids)]
                                    
                                    # Merge
                                    st.session_state.uploaded_products = pd.concat([
                                        existing_df,
                                        imported_df
                                    ], ignore_index=True)
                                st.rerun()
                        else:
                            st.error(result['message'])
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
                        
        with col3:
            if st.button("💰 Import Orders", use_container_width=True):
                with st.spinner("Importing orders..."):
                    try:
                        result = self.order_service.import_orders()
                        if result['success']:
                            st.success(result['message'])
                        else:
                            st.error(result['message'])
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
                        
        with col4:
            if st.button("📝 Create Template", use_container_width=True):
                template_df = self.data_manager.create_product_template()
                st.success("Created product_upload_template.csv")
                
    def _show_product_management(self):
        """Show product upload and management section."""
        st.subheader("📤 Upload Products")
        
        # File uploader
        uploaded_file = st.file_uploader(
            "Choose a CSV file to upload products",
            type=['csv'],
            help="Use the template created with 'Create Template' button"
        )
        
        if uploaded_file:
            df = pd.read_csv(uploaded_file)
            st.caption(f"Found {len(df)} rows in file")
            
            if st.button("🚀 Start Upload", type="primary"):
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                def update_progress(current, total, message):
                    progress = current / total
                    progress_bar.progress(progress)
                    status_text.text(f"{message} ({current}/{total})")
                    
                # Upload products
                result = self.upload_service.upload_products(
                    df, 
                    progress_callback=update_progress
                )
                
                progress_bar.empty()
                status_text.empty()
                
                if result['success']:
                    st.success(f"✅ Upload complete! {result['successful']} succeeded, {result['failed']} failed")
                    
                    # Save results to session state
                    if result.get('results'):
                        results_df = pd.DataFrame(result['results'])
                        successful_df = results_df[results_df['success'] == True].copy()
                        
                        if not successful_df.empty:
                            # Add source column to indicate these are uploaded
                            successful_df['source'] = 'Upload'
                            # Store ALL columns for editing
                            st.session_state.uploaded_products = successful_df.reset_index(drop=True)
                            st.rerun()  # Refresh to show the editable table
                else:
                    st.error(result['message'])
                    
        # Show editable product table if products exist
        if not st.session_state.uploaded_products.empty:
            st.divider()
            self._show_editable_products()
            
    def _show_editable_products(self):
        """Show the editable product table."""
        df = st.session_state.uploaded_products
        
        # Count by source
        source_counts = df['source'].value_counts() if 'source' in df.columns else {}
        title_parts = []
        if 'Upload' in source_counts:
            title_parts.append(f"{source_counts['Upload']} Uploaded")
        if 'Import' in source_counts:
            title_parts.append(f"{source_counts['Import']} Imported")
            
        st.subheader(f"📝 Manage {len(df)} Products ({', '.join(title_parts)})")
        
        # Instructions
        st.info("💡 **Click any cell** to edit Price or Quantity. Check 'delete' box to mark for deletion.")
        
        # Create editable dataframe with ALL columns
        df = st.session_state.uploaded_products.copy()
        
        # Ensure delete column exists
        if 'delete' not in df.columns:
            df['delete'] = False
            
        # Configure which columns are editable
        column_config = {
            "listing_id": st.column_config.NumberColumn("Listing ID", disabled=True),
            "title": st.column_config.TextColumn("Title", disabled=True, width="large"),
            "price": st.column_config.NumberColumn(
                "Price", 
                min_value=0.01,
                format="$%.2f",
                help="Click to edit"
            ),
            "quantity": st.column_config.NumberColumn(
                "Quantity",
                min_value=0,
                format="%d",
                help="Click to edit"
            ),
            "sku": st.column_config.TextColumn("SKU", disabled=True),
            "status": st.column_config.TextColumn("Status", disabled=True),
            "source": st.column_config.TextColumn("Source", disabled=True),
            "delete": st.column_config.CheckboxColumn(
                "Delete?",
                help="Check to mark for deletion"
            )
        }
        
        # Only configure columns that exist
        configured_columns = {k: v for k, v in column_config.items() if k in df.columns}
        
        # Show the editable dataframe
        edited_df = st.data_editor(
            df,
            column_config=configured_columns,
            use_container_width=True,
            num_rows="fixed",
            hide_index=True,
            key="main_product_editor"
        )
        
        # Action buttons
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            if st.button("💾 Update Prices & Inventory", type="primary", use_container_width=True):
                # Find changed items
                changes = []
                for idx in range(len(df)):
                    original_price = float(df.iloc[idx]['price'])
                    original_qty = int(df.iloc[idx]['quantity'])
                    edited_price = float(edited_df.iloc[idx]['price'])
                    edited_qty = int(edited_df.iloc[idx]['quantity'])
                    
                    if (edited_price != original_price or edited_qty != original_qty):
                        changes.append({
                            'listing_id': edited_df.iloc[idx]['listing_id'],
                            'title': edited_df.iloc[idx]['title'],
                            'price': edited_price,
                            'quantity': edited_qty
                        })
                        
                if changes:
                    progress_text = st.empty()
                    updated = 0
                    failed = 0
                    
                    for i, row in enumerate(changes):
                        progress_text.text(f"Updating {i+1}/{len(changes)}...")
                        try:
                            shop_id = self.shop_service.find_user_shop_id()
                            # Convert pandas types to Python native types
                            self.listing_service.update_listing(
                                shop_id, int(row['listing_id']),
                                {
                                    'price': float(row['price']), 
                                    'quantity': int(row['quantity'])
                                }
                            )
                            updated += 1
                        except Exception as e:
                            failed += 1
                            st.error(f"Failed to update {row['title']}: {str(e)}")
                            
                    progress_text.empty()
                    
                    if updated > 0:
                        st.success(f"✅ Updated {updated} products!")
                        # Save changes
                        st.session_state.uploaded_products = edited_df.copy()
                        
                    if failed > 0:
                        st.error(f"❌ Failed to update {failed} products")
                else:
                    st.info("No changes detected")
                    
        with col2:
            # Delete marked items
            marked_for_deletion = edited_df[edited_df['delete'] == True]
            delete_count = len(marked_for_deletion)
            
            # Show delete button
            if st.button(f"🗑️ Delete {delete_count} Items", 
                        use_container_width=True,
                        disabled=delete_count == 0,
                        key="delete_button"):
                if delete_count > 0:
                    st.session_state.confirm_delete = True
                    st.session_state.items_to_delete = marked_for_deletion.copy()
                            
        with col3:
            # Export to CSV
            if st.button("📥 Export CSV", use_container_width=True):
                csv = edited_df.to_csv(index=False)
                st.download_button(
                    label="Download",
                    data=csv,
                    file_name=f"etsy_products_{len(edited_df)}_items.csv",
                    mime="text/csv"
                )
                
        with col4:
            # Refresh data
            if st.button("🔄 Clear Table", use_container_width=True):
                st.session_state.uploaded_products = pd.DataFrame()
                st.rerun()
        
        # Show deletion confirmation dialog outside of columns
        if st.session_state.get('confirm_delete', False) and 'items_to_delete' in st.session_state:
            st.divider()
            st.warning(f"⚠️ **Confirm Deletion**")
            st.caption(f"About to permanently delete {len(st.session_state.items_to_delete)} listings")
            
            confirm_col1, confirm_col2, confirm_col3 = st.columns([1, 1, 2])
            
            with confirm_col1:
                if st.button("✅ Yes, Delete", type="primary", use_container_width=True, key="confirm_delete_yes"):
                    # Execute deletion
                    progress_text = st.empty()
                    deleted = 0
                    failed = 0
                    items_to_delete = st.session_state.items_to_delete
                    
                    for i, (_, row) in enumerate(items_to_delete.iterrows()):
                        progress_text.text(f"Deleting {i+1}/{len(items_to_delete)}...")
                        try:
                            self.listing_service.delete_listing(int(row['listing_id']))
                            deleted += 1
                        except Exception as e:
                            failed += 1
                            st.error(f"Failed to delete listing {row['listing_id']}: {str(e)}")
                            
                    progress_text.empty()
                    
                    if deleted > 0:
                        st.success(f"✅ Deleted {deleted} listings!")
                        # Remove deleted items from the dataframe
                        deleted_ids = items_to_delete['listing_id'].tolist()
                        st.session_state.uploaded_products = st.session_state.uploaded_products[
                            ~st.session_state.uploaded_products['listing_id'].isin(deleted_ids)
                        ].reset_index(drop=True)
                        
                    if failed > 0:
                        st.error(f"❌ Failed to delete {failed} listings")
                        
                    # Clear confirmation state
                    st.session_state.confirm_delete = False
                    if 'items_to_delete' in st.session_state:
                        del st.session_state.items_to_delete
                    time.sleep(1)
                    st.rerun()
            
            with confirm_col2:
                if st.button("❌ Cancel", use_container_width=True, key="confirm_delete_cancel"):
                    st.session_state.confirm_delete = False
                    if 'items_to_delete' in st.session_state:
                        del st.session_state.items_to_delete
                    st.rerun()


def main():
    """Main entry point."""
    app = EtsyShopManager()
    app.run()


if __name__ == "__main__":
    main()