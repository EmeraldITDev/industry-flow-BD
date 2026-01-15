# OneDrive Integration Setup Guide

This guide will help you set up OneDrive integration for the Industry Flow application.

## Prerequisites

- A Microsoft account (personal or work/school)
- Access to Azure Portal (or the ability to create a free account)
- Admin access to your application

## Step 1: Register Your Application in Azure

1. **Go to Azure Portal**
   - Visit [https://portal.azure.com](https://portal.azure.com)
   - Sign in with your Microsoft account

2. **Navigate to App Registrations**
   - Search for "App registrations" in the top search bar
   - Click on "App registrations" in the results

3. **Create a New Registration**
   - Click "+ New registration" button
   - Fill in the following details:
     - **Name**: `Industry Flow` (or your preferred name)
     - **Supported account types**: Choose one of:
       - **Personal Microsoft accounts only** - For personal OneDrive
       - **Accounts in any organizational directory and personal Microsoft accounts** - For both work and personal
     - **Redirect URI**: 
       - Platform: `Single-page application (SPA)`
       - URI: `http://localhost:5173` (for local development)
       - Add additional URIs for production (e.g., `https://yourdomain.com`)
   - Click "Register"

4. **Copy Your Client ID**
   - After registration, you'll see the "Overview" page
   - Copy the **Application (client) ID** - you'll need this later
   - Example: `12345678-1234-1234-1234-123456789012`

## Step 2: Configure API Permissions

1. **Add OneDrive Permissions**
   - In your app registration, click "API permissions" in the left sidebar
   - Click "+ Add a permission"
   - Select "Microsoft Graph"
   - Choose "Delegated permissions"
   - Search for and add the following permissions:
     - `User.Read` - Read user profile
     - `Files.ReadWrite` - Read and write user files
     - `Files.ReadWrite.All` - Read and write all user files
   - Click "Add permissions"

2. **Grant Admin Consent** (Optional but recommended)
   - Click "Grant admin consent for [Your Organization]"
   - Confirm by clicking "Yes"
   - This allows users to use the app without individual consent

## Step 3: Configure Your Application

1. **Create Environment File**
   - In your project root, create or edit `.env` file
   - Add the following line:
   ```env
   VITE_MICROSOFT_CLIENT_ID=your-client-id-here
   ```
   - Replace `your-client-id-here` with the Client ID you copied from Step 1

2. **Example `.env` file**
   ```env
   # Microsoft OneDrive Integration
   VITE_MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789012
   
   # Other environment variables...
   VITE_API_BASE_URL=http://localhost:8000
   ```

## Step 4: Install Required Packages

The OneDrive integration requires the Microsoft Authentication Library (MSAL):

```bash
npm install @azure/msal-browser
```

## Step 5: Test the Integration

1. **Start Your Development Server**
```bash
npm run dev
```

2. **Navigate to a Project**
   - Go to any project in your application
   - Look for the "Documents" section

3. **Click "OneDrive" Button**
   - Click the "OneDrive" button in the Documents section
   - You'll be prompted to sign in with your Microsoft account
   - Grant the requested permissions

4. **Upload a File**
   - After authentication, select a file to upload
   - The file will be uploaded to `IndustryFlow/[ProjectName]` folder in your OneDrive
   - The file link will be saved in your project

## Production Deployment

### Update Redirect URIs

1. Go back to Azure Portal → Your App Registration
2. Click "Authentication" in the left sidebar
3. Under "Single-page application", add your production URL:
   - Example: `https://yourdomain.com`
   - Example: `https://industry-flow.vercel.app`
4. Click "Save"

### Update Environment Variables

On your production server (Vercel, Netlify, etc.):

1. Go to your hosting provider's settings
2. Add environment variable:
   - Key: `VITE_MICROSOFT_CLIENT_ID`
   - Value: Your Client ID from Azure

## How It Works

1. **Authentication Flow**
   - User clicks "OneDrive" button
   - Browser opens Microsoft login popup
   - User signs in and grants permissions
   - App receives access token

2. **File Upload**
   - User selects a file
   - File is uploaded to OneDrive via Microsoft Graph API
   - File is saved to `IndustryFlow/ProjectName/` folder
   - File link and metadata are stored in your project

3. **File Access**
   - Clicking on a OneDrive file opens it in a new tab
   - File is accessed directly from OneDrive
   - Download links are generated on-demand

## Features

✅ **Secure Authentication** - Uses Microsoft's OAuth 2.0
✅ **Organized Storage** - Files are organized by project
✅ **Direct Links** - Files link directly to OneDrive
✅ **File Management** - View, download, and delete files
✅ **Mixed Storage** - Combine local uploads and OneDrive
✅ **User-Specific** - Each user accesses their own OneDrive

## Troubleshooting

### "OneDrive is not configured"
- Make sure `VITE_MICROSOFT_CLIENT_ID` is set in your `.env` file
- Restart your development server after adding the variable

### "Login failed" or "Authentication error"
- Check that your Redirect URI in Azure matches your application URL
- Make sure you've added all required API permissions
- Try clearing browser cache and cookies

### "Failed to upload file"
- Verify the user has granted all requested permissions
- Check browser console for detailed error messages
- Ensure the user has sufficient OneDrive storage space

### CORS errors
- Make sure your application URL is properly registered in Azure
- Check that you're using the correct redirect URI format

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use different Client IDs** for development and production
3. **Regularly review** API permissions in Azure Portal
4. **Monitor** authentication logs in Azure
5. **Implement** proper error handling for expired tokens

## Additional Resources

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [OneDrive API Reference](https://docs.microsoft.com/en-us/onedrive/developer/)

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Review Azure Portal logs
3. Verify all configuration steps were completed
4. Contact your system administrator

---

**Last Updated**: January 2026
