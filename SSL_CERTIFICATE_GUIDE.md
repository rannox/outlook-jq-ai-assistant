# SSL Certificate Guide for JQuad AI Assistant Development

## 🔐 Certificate Issue Resolution

The error "Das Add-In ist gesperrt, weil es nicht mit einem gültigen Sicherheitszertifikat signiert ist" occurs because Outlook requires trusted HTTPS connections.

## 🚀 Quick Fix (Development)

### Step 1: Accept Development Certificate
1. Open your browser
2. Go to: `https://localhost:3000`
3. Accept the security warning:
   - **Chrome/Edge**: Click "Advanced" → "Proceed to localhost (unsafe)"
   - **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
4. Verify the page loads

### Step 2: Trust Certificate in Windows (Optional)
For a cleaner development experience:

1. **Open Certificate Manager**:
   ```
   Windows Key + R → certmgr.msc
   ```

2. **Import Development Certificate**:
   - Navigate to "Personal" → "Certificates"
   - Right-click → "All Tasks" → "Import"
   - Import the webpack dev server certificate

3. **Move to Trusted Root**:
   - Copy the certificate to "Trusted Root Certification Authorities"

## 🔧 Alternative Solutions

### Option 1: Use HTTP for Development
Update `webpack.config.js`:
```javascript
devServer: {
  // Remove: server: 'https',
  // Add: server: 'http',
  port: 3000,
  // ... rest of config
}
```

**Note**: This requires updating manifest URLs to use `http://` instead of `https://`

### Option 2: Generate Trusted Certificate
Install office-addin-dev-certs:
```bash
npm install -g office-addin-dev-certs
office-addin-dev-certs install
```

## 🎯 Testing Steps After Certificate Fix

1. **Refresh** the add-in in Outlook
2. **Click** "Neu starten" (Restart) if prompted
3. **Verify** the task pane loads without certificate errors
4. **Test** the JQuad AI Assistant functionality

## ⚠️ Production Deployment

For production deployment:
- Use a valid SSL certificate from a trusted CA
- Deploy to a proper HTTPS server
- Update manifest URLs to production endpoints

## 🔍 Troubleshooting

### If certificate issues persist:
1. Clear browser cache
2. Restart Outlook
3. Try incognito/private browsing mode
4. Check Windows certificate store

### Certificate validation in different browsers:
- **Chrome**: More strict about self-signed certificates
- **Edge**: Similar to Chrome (Chromium-based)
- **Firefox**: Has its own certificate store