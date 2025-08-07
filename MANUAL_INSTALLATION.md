# Manual Installation Guide for JQuad AI Assistant

## 🔧 Alternative Installation Methods

Since automatic sideloading failed with a 401 error, here are manual installation methods:

### **Method 1: Outlook Web (Recommended)**

1. **Open Outlook Web**: Go to https://outlook.office.com
2. **Access Add-ins**: 
   - Click the settings gear (⚙️) in the top right
   - Select "View all Outlook settings"
   - Go to "General" → "Manage add-ins"
3. **Upload Manifest**:
   - Click "Add from file"
   - Upload the `manifest.xml` file from this project
   - Click "Install"

### **Method 2: Outlook Desktop**

1. **Open Outlook Desktop** (Microsoft 365 version)
2. **Access Add-ins**:
   - Go to "File" → "Manage Add-ins"
   - Or use the ribbon: "Home" → "Get Add-ins"
3. **Upload Manifest**:
   - Click "Upload from file"
   - Select the `manifest.xml` file
   - Follow the installation prompts

### **Method 3: Admin Center (For Organizations)**

If you have admin access:
1. Go to Microsoft 365 Admin Center
2. Navigate to "Settings" → "Integrated apps"
3. Upload the manifest for organization-wide deployment

## 🌐 Development Server

The development server is running at: **https://localhost:3000**

Make sure this is accessible before installing the add-in.

## 📁 Required Files

- `manifest.xml` - The add-in manifest (in project root)
- Dev server running on port 3000

## ⚠️ Troubleshooting

### SSL Certificate Issues
If you get SSL warnings:
1. Navigate to https://localhost:3000 in your browser
2. Accept the self-signed certificate
3. Then install the add-in

### 401 Authentication Errors
- Sign out and sign back into Microsoft 365
- Clear browser cache
- Try incognito/private browsing mode
- Use Outlook Web instead of desktop

### Add-in Not Loading
- Verify dev server is running: https://localhost:3000
- Check browser console for errors
- Ensure manifest.xml is valid (use `npm run validate`)

## 🎯 Testing the Add-in

Once installed:
1. Open any email in Outlook
2. Look for "JQuad AI" button in the ribbon
3. Click to open the task pane
4. The JQuad AI Assistant should load

## 🔄 Development Workflow

For development changes:
1. Make code changes
2. Run `npm run build`
3. Refresh the add-in in Outlook (no need to reinstall)