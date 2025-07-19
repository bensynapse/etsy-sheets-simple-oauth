"""
Main Streamlit application for Etsy Shop Manager.
Provides UI matching the Google Apps Script sidebar.
"""

import streamlit as st
import logging
from pathlib import Path
import sys
import os

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

# Page configuration
st.set_page_config(
    page_title="Etsy Shop Manager",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS to match GAS sidebar styling
st.markdown("""
<style>
    .stButton > button {
        width: 100%;
        background-color: #F1641E;
        color: white;
        border: none;
        padding: 0.5rem;
        border-radius: 3px;
        margin: 0.25rem 0;
    }
    .stButton > button:hover {
        background-color: #d14a0a;
    }
    .secondary {
        background-color: #666 !important;
    }
    .success {
        background-color: #28a745 !important;
    }
    .danger {
        background-color: #dc3545 !important;
    }
    .status-connected {
        background-color: #d4edda;
        color: #155724;
        padding: 0.5rem;
        border-radius: 5px;
        font-weight: bold;
        margin-bottom: 1rem;
    }
    .status-disconnected {
        background-color: #f8d7da;
        color: #721c24;
        padding: 0.5rem;
        border-radius: 5px;
        font-weight: bold;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)


class EtsyShopManagerApp:
    """Main application class."""
    
    def __init__(self):
        """Initialize the application."""
        # Initialize session state
        if 'initialized' not in st.session_state:
            st.session_state.initialized = True
            st.session_state.authenticated = False
            st.session_state.auth_data = None
            st.session_state.current_step = 1
            
        # Initialize components
        self.config = ConfigManager()
        self.token_manager = TokenManager(self.config)
        self.data_manager = DataManager()
        
        # Initialize API components if authenticated
        if self.token_manager.is_authenticated():
            self._initialize_api()
            st.session_state.authenticated = True
            st.session_state.current_step = 3
        elif self.config.get_api_key():
            st.session_state.current_step = 2
            
    def _initialize_api(self):
        """Initialize API and services."""
        api_key = self.config.get_api_key()
        
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
        # Title
        st.title("🛍️ Etsy Shop Manager")
        
        # Sidebar for authentication
        with st.sidebar:
            st.header("Etsy API Control Panel")
            
            # Show connection status
            self._show_status()
            
            # Show appropriate step
            if st.session_state.current_step == 1:
                self._show_step1_credentials()
            elif st.session_state.current_step == 2:
                self._show_step2_oauth()
            elif st.session_state.current_step == 3:
                self._show_step3_operations()
                
        # Main content area
        if st.session_state.authenticated:
            self._show_main_content()
        else:
            st.info("👈 Please complete authentication in the sidebar to continue.")
            
    def _show_status(self):
        """Show connection status."""
        if st.session_state.authenticated:
            st.markdown(
                '<div class="status-connected">✓ Connected to Etsy</div>',
                unsafe_allow_html=True
            )
            
            # Show user info
            try:
                user_info = self.shop_service.get_user_info()
                if user_info['success']:
                    user = user_info['user']
                    st.caption(f"**User:** {user['login_name']}")
                    if user.get('shop_name'):
                        st.caption(f"**Shop:** {user['shop_name']}")
            except:
                pass
        else:
            st.markdown(
                '<div class="status-disconnected">○ Not connected</div>',
                unsafe_allow_html=True
            )
            
    def _show_step1_credentials(self):
        """Show Step 1: API Credentials."""
        st.subheader("Step 1: API Credentials")
        st.caption("Get these from your Etsy App at developers.etsy.com")
        
        # Check if API key is already available from environment
        existing_key = self.config.get_api_key()
        if existing_key and os.getenv('ETSY_API_KEY'):
            st.success("✓ API Key loaded from .env file")
            st.caption(f"Key: {existing_key[:8]}...{existing_key[-4:]}")
            if st.button("Continue to OAuth", key="continue_oauth"):
                st.session_state.current_step = 2
                st.rerun()
            st.divider()
            st.caption("Or enter a different API key below:")
        
        api_key = st.text_input(
            "API Key (Keystring)",
            type="password",
            help="For Etsy v3, your API Key is also your Client ID"
        )
        
        if st.button("Save API Key", key="save_api_key"):
            if api_key:
                self.config.set_api_key(api_key)
                st.success("API Key saved!")
                st.session_state.current_step = 2
                st.rerun()
            else:
                st.error("Please enter your API Key")
                
    def _show_step2_oauth(self):
        """Show Step 2: OAuth Connection."""
        st.subheader("Step 2: Connect to Etsy")
        st.caption("Click below to authorize this app")
        
        if st.button("Connect to Etsy", key="start_oauth"):
            api_key = self.config.get_api_key()
            self.oauth_handler = EtsyOAuthHandler(api_key)
            
            # Generate auth URL
            auth_data = self.oauth_handler.get_auth_url()
            st.session_state.auth_data = auth_data
            
            # Show authorization instructions
            st.info("**Authorization Instructions:**")
            st.code(auth_data['url'])
            st.caption(
                "1. Click the URL above or copy it to your browser\n"
                "2. Authorize the application\n"
                "3. Copy the ENTIRE URL from your browser after redirect\n"
                "4. Paste it below"
            )
            
        # Show code input if auth started
        if st.session_state.auth_data:
            auth_code_url = st.text_input(
                "Paste the full redirect URL here:",
                key="auth_code_input"
            )
            
            if st.button("Submit Code", key="submit_code"):
                if auth_code_url:
                    try:
                        # Re-create OAuth handler since it's not persisted across reruns
                        api_key = self.config.get_api_key()
                        oauth_handler = EtsyOAuthHandler(api_key)
                        
                        # Extract code
                        code = oauth_handler.extract_code_from_url(auth_code_url)
                        
                        # Exchange for token
                        token_data = oauth_handler.exchange_code_for_token(
                            code, 
                            st.session_state.auth_data['verifier']
                        )
                        
                        # Save tokens
                        self.token_manager.save_tokens(token_data)
                        
                        st.success("Successfully connected to Etsy!")
                        st.session_state.authenticated = True
                        st.session_state.current_step = 3
                        st.session_state.auth_data = None
                        st.rerun()
                        
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
                else:
                    st.error("Please paste the redirect URL")
                    
    def _show_step3_operations(self):
        """Show Step 3: Operations."""
        # User info is shown in status section
        
        st.subheader("Import Your Shop Data")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("Import My Shop", key="import_shop"):
                with st.spinner("Importing shop data..."):
                    result = self.shop_service.import_shop_data()
                    if result['success']:
                        st.success(result['message'])
                        st.session_state.shop_data = result.get('data')
                    else:
                        st.error(result['message'])
                        
        with col2:
            if st.button("Import My Listings", key="import_listings"):
                with st.spinner("Importing listings..."):
                    result = self.listing_service.import_listings()
                    if result['success']:
                        st.success(result['message'])
                        st.session_state.listings_data = result.get('data')
                    else:
                        st.error(result['message'])
                        
        with col3:
            if st.button("Import My Orders", key="import_orders"):
                with st.spinner("Importing orders..."):
                    result = self.order_service.import_orders()
                    if result['success']:
                        st.success(result['message'])
                        st.session_state.orders_data = result.get('data')
                    else:
                        st.error(result['message'])
                        
        st.divider()
        
        # Import any shop
        st.subheader("Import Any Shop (by ID)")
        
        col1, col2 = st.columns([3, 1])
        with col1:
            shop_id = st.text_input("Enter any shop ID", key="any_shop_id")
        with col2:
            st.write("")  # Spacer
            if st.button("Import Shop Info", key="import_any_shop"):
                if shop_id:
                    with st.spinner("Importing shop data..."):
                        result = self.shop_service.import_any_shop_data(shop_id)
                        if result['success']:
                            st.success(result['message'])
                            st.session_state.any_shop_data = result.get('data')
                        else:
                            st.error(result['message'])
                else:
                    st.error("Please enter a shop ID")
                    
        st.divider()
        
        # Product upload section
        st.subheader("Product Upload")
        
        if st.button("Create Upload Template", key="create_template"):
            template_df = self.data_manager.create_product_template()
            st.success("Product template created! Check 'product_upload_template.csv'")
            st.session_state.template_created = True
            
        if st.button("Upload Products", key="upload_products", type="primary"):
            # This will be handled in the main content area
            st.session_state.show_upload = True
            
        if st.button("Update Price & Inventory", key="update_inventory"):
            st.session_state.show_update = True
            
        if st.button("Delete Marked Listings", key="delete_listings", 
                     help="Delete listings marked with 'X' in the Delete? column"):
            st.session_state.show_delete = True
            
        st.divider()
        
        # Disconnect button
        if st.button("Disconnect", key="disconnect"):
            if st.confirm("Are you sure you want to disconnect?"):
                self.shop_service.clear_auth()
                st.session_state.authenticated = False
                st.session_state.current_step = 2
                st.success("Disconnected successfully")
                st.rerun()
                
    def _show_main_content(self):
        """Show main content area."""
        # Create tabs
        tabs = st.tabs(["📊 Dashboard", "📦 Products", "💰 Orders", "📈 Analytics"])
        
        with tabs[0]:
            self._show_dashboard()
            
        with tabs[1]:
            self._show_products()
            
        with tabs[2]:
            self._show_orders()
            
        with tabs[3]:
            self._show_analytics()
            
    def _show_dashboard(self):
        """Show dashboard tab."""
        st.header("Dashboard")
        
        # Show imported data
        if hasattr(st.session_state, 'shop_data'):
            st.subheader("Shop Information")
            st.dataframe(st.session_state.shop_data, use_container_width=True)
            
        if hasattr(st.session_state, 'listings_data'):
            st.subheader("Recent Listings")
            st.dataframe(st.session_state.listings_data, use_container_width=True)
            
        if hasattr(st.session_state, 'orders_data'):
            st.subheader("Recent Orders")
            st.dataframe(st.session_state.orders_data, use_container_width=True)
            
    def _show_products(self):
        """Show products tab."""
        st.header("Product Management")
        
        # Upload section
        if getattr(st.session_state, 'show_upload', False):
            self._handle_product_upload()
            
        # Update section
        elif getattr(st.session_state, 'show_update', False):
            self._handle_inventory_update()
            
        # Delete section
        elif getattr(st.session_state, 'show_delete', False):
            self._handle_deletion()
            
        else:
            st.info("Use the sidebar buttons to manage products")
            
    def _handle_product_upload(self):
        """Handle product upload."""
        st.subheader("Upload Products")
        
        uploaded_file = st.file_uploader(
            "Choose a CSV file",
            type=['csv'],
            help="Use the template created with 'Create Upload Template'"
        )
        
        if uploaded_file:
            import pandas as pd
            df = pd.read_csv(uploaded_file)
            
            st.write("Preview:")
            st.dataframe(df.head(), use_container_width=True)
            
            if st.button("Start Upload", type="primary"):
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                def update_progress(current, total, message):
                    progress = current / total
                    progress_bar.progress(progress)
                    status_text.text(f"{message} ({current}/{total})")
                    
                with st.spinner("Uploading products..."):
                    result = self.upload_service.upload_products(
                        df, 
                        progress_callback=update_progress
                    )
                    
                if result['success']:
                    st.success(
                        f"Upload complete! "
                        f"{result['successful']} succeeded, "
                        f"{result['failed']} failed"
                    )
                    
                    # Show results
                    if result.get('results'):
                        results_df = pd.DataFrame(result['results'])
                        st.dataframe(results_df, use_container_width=True)
                else:
                    st.error(result['message'])
                    
    def _handle_inventory_update(self):
        """Handle inventory update."""
        st.subheader("Update Price & Inventory")
        
        uploaded_file = st.file_uploader(
            "Choose updated product file",
            type=['csv'],
            key="update_file"
        )
        
        if uploaded_file:
            import pandas as pd
            df = pd.read_csv(uploaded_file)
            
            st.write("Updates to apply:")
            st.dataframe(df[['Title*', 'Price*', 'Quantity*', 'Result']].head(), 
                        use_container_width=True)
            
            if st.button("Apply Updates", type="primary"):
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                def update_progress(current, total, message):
                    progress = current / total
                    progress_bar.progress(progress)
                    status_text.text(f"{message} ({current}/{total})")
                    
                with st.spinner("Updating inventory..."):
                    result = self.upload_service.update_inventory_and_price(
                        df,
                        progress_callback=update_progress
                    )
                    
                if result['success']:
                    st.success(result['message'])
                else:
                    st.error(result['message'])
                    
    def _handle_deletion(self):
        """Handle listing deletion."""
        st.subheader("Delete Marked Listings")
        
        st.warning(
            "⚠️ **Warning**: Deletion is permanent! "
            "Only listings marked with 'X' in the Delete? column will be deleted."
        )
        
        uploaded_file = st.file_uploader(
            "Choose product file with deletion marks",
            type=['csv'],
            key="delete_file"
        )
        
        if uploaded_file:
            import pandas as pd
            df = pd.read_csv(uploaded_file)
            
            # Show items marked for deletion
            if 'Delete?' in df.columns:
                marked = df[df['Delete?'].str.upper() == 'X']
                st.write(f"Items marked for deletion: {len(marked)}")
                
                if len(marked) > 0:
                    st.dataframe(
                        marked[['Title*', 'Result', 'Delete?']], 
                        use_container_width=True
                    )
                    
                    if st.button("Delete Marked Listings", type="primary"):
                        if st.checkbox("I understand this is permanent"):
                            progress_bar = st.progress(0)
                            status_text = st.empty()
                            
                            def update_progress(current, total, message):
                                progress = current / total
                                progress_bar.progress(progress)
                                status_text.text(f"{message} ({current}/{total})")
                                
                            with st.spinner("Deleting listings..."):
                                result = self.upload_service.delete_marked_listings(
                                    df,
                                    progress_callback=update_progress
                                )
                                
                            if result['success']:
                                st.success(result['message'])
                            else:
                                st.error(result['message'])
                else:
                    st.info("No items marked for deletion")
            else:
                st.error("Delete? column not found in file")
                
    def _show_orders(self):
        """Show orders tab."""
        st.header("Order Management")
        
        if hasattr(st.session_state, 'orders_data') and not st.session_state.orders_data.empty:
            st.dataframe(st.session_state.orders_data, use_container_width=True)
            
            # Order summary
            try:
                shop_id = self.shop_service.find_user_shop_id()
                if shop_id:
                    summary = self.order_service.get_order_summary(shop_id)
                    
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Total Orders", summary['total_orders'])
                    with col2:
                        st.metric("Total Revenue", f"${summary['total_revenue']:,.2f}")
                    with col3:
                        st.metric("Average Order", f"${summary['average_order']:,.2f}")
                    with col4:
                        st.metric("Orders by Status", 
                                 len(summary.get('orders_by_status', {})))
            except:
                pass
        else:
            st.info("Import orders from the sidebar to see them here")
            
    def _show_analytics(self):
        """Show analytics tab."""
        st.header("Analytics")
        st.info("Analytics features coming soon!")
        
        # Placeholder for future analytics
        if hasattr(st.session_state, 'listings_data'):
            st.subheader("Listing Performance")
            # Could add charts here using plotly or matplotlib
            

def main():
    """Main entry point."""
    app = EtsyShopManagerApp()
    app.run()


if __name__ == "__main__":
    main()