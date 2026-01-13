# OneDrive Integration - Quick Installation

## Installation Steps

### 1. Install Required Package

Run the following command in your project directory:

```bash
npm install @azure/msal-browser
```

Or if you use yarn:

```bash
yarn add @azure/msal-browser
```

### 2. Set Up Azure App Registration

Follow the detailed instructions in `ONEDRIVE_SETUP.md` to:
1. Create an Azure App Registration
2. Get your Client ID
3. Configure API permissions

### 3. Add Environment Variable

Create or update `.env` file in your project root:

```env
VITE_ONEDRIVE_CLIENT_ID=your-client-id-from-azure
```

### 4. Restart Development Server

```bash
npm run dev
```

Or:

```bash
yarn dev
```

## Verification

1. Navigate to any project in your application
2. Look for the "OneDrive" button in the Documents section
3. Click it to test the login flow

## Next Steps

- Read `ONEDRIVE_SETUP.md` for detailed setup instructions
- Test uploading a document to OneDrive
- Verify files appear in your OneDrive under "IndustryFlow" folder

## Need Help?

Refer to the complete setup guide: `ONEDRIVE_SETUP.md`
