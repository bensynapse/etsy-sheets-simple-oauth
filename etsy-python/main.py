#!/usr/bin/env python3
"""
Etsy Shop Manager - Main Entry Point
Python implementation matching Google Apps Script functionality
"""

import sys
import os
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from ui.app import main

if __name__ == "__main__":
    # Run the Streamlit app
    main()