# Simple Etsy API Tester for Google Sheets

A straightforward Google Apps Script that tests Etsy API v3 connections and imports shop data into Google Sheets.

## Features
- Test API connection
- Get shop information
- Get shop listings
- Search listings
- Get categories (taxonomy)
- Import data directly to sheets

## Setup

1. **Get Etsy API Key**
   - Go to https://www.etsy.com/developers/
   - Create a new app
   - Copy your API Key (Keystring)

2. **Create Google Sheet**
   - Create a new Google Sheet
   - Go to Extensions → Apps Script
   - Delete default code
   - Copy `Code.gs` content into Code.gs
   - Create new HTML file: File → New → HTML file
   - Name it "Sidebar"
   - Copy `Sidebar.html` content

3. **Save and Use**
   - Save the project (Ctrl+S)
   - Reload the Google Sheet
   - Click "Etsy API" menu → "Open Control Panel"
   - Enter your API key and start testing!

## What You Can Do

### With Just API Key (No OAuth needed):
- View any public shop information
- See active listings from any shop
- Search all Etsy listings
- View category taxonomy

### Data Import:
- Import shop details to "Shop Info" sheet
- Import listings to "Listings" sheet
- All API calls logged to "Etsy Data" sheet

## That's It!
No complex OAuth, no web apps, no multiple files. Just simple API testing.