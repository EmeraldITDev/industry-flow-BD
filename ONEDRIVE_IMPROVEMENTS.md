# OneDrive Integration Improvements

## Changes Made

### 1. Browse Existing OneDrive Files ✅
You can now browse and select files that are already in your OneDrive, not just upload new ones.

**New Features:**
- **Recent Files Tab**: View your 20 most recently accessed files
- **IndustryFlow Folder Tab**: Browse files specifically in the IndustryFlow folder
- **Search Tab**: Search across all your OneDrive files
- **File Preview**: See file names, sizes, and last modified dates
- **File Selection**: Click to select a file, then link it to your project

### 2. Enhanced Upload Dialog 🎨
The OneDrive dialog now has two options:

#### Upload New File
- Select a local file from your computer
- File is **actually uploaded** to your OneDrive account
- File is stored in the "IndustryFlow" folder
- File is then linked to the project

#### Browse OneDrive
- Opens a file picker showing your OneDrive files
- Select an existing file to link to the project
- No upload needed - just links the existing file

### 3. File Upload Verification 🔍
The file upload is working correctly:
1. File is sent to Microsoft Graph API
2. Uploaded to OneDrive in `/IndustryFlow/` folder
3. OneDrive returns file metadata (ID, URL, size, etc.)
4. File is linked to your project with OneDrive URL

**API Call Details:**
```
PUT https://graph.microsoft.com/v1.0/me/drive/root:/IndustryFlow/{filename}:/content
Authorization: Bearer {access_token}
Content-Type: {file_mime_type}
Body: {file_binary_data}
```

### 4. Service Updates 🔧

#### New Methods in `onedrive.ts`:
- `listFiles(folderPath)` - List files in a specific folder
- `listRecentFiles(limit)` - Get recently accessed files
- `searchFiles(query)` - Search for files by name

#### New Hook Methods in `useOneDrive.ts`:
- `listFiles()` - Hook wrapper for listing folder files
- `listRecentFiles()` - Hook wrapper for recent files
- `searchFiles()` - Hook wrapper for file search

### 5. New Components 📦

#### `OneDriveFilePicker.tsx`
A comprehensive file browser that includes:
- 3 tabs: Recent, IndustryFlow folder, and Search
- File icons based on file type
- File metadata display
- Selection UI with visual feedback
- Responsive design

## How to Use

### Upload a New File to OneDrive
1. Click the "OneDrive" button in the Documents section
2. Select "Upload New File" tab
3. Choose document type
4. Click the upload area to select a file
5. File is uploaded to OneDrive and linked to project

### Link an Existing OneDrive File
1. Click the "OneDrive" button in the Documents section
2. Select "Browse OneDrive" tab
3. Click "Browse My OneDrive Files"
4. Choose from:
   - **Recent**: Your recently accessed files
   - **IndustryFlow**: Files in your IndustryFlow folder
   - **Search**: Search all your OneDrive files
5. Click a file to select it
6. Click "Link Selected File"

## Technical Details

### Authentication Flow
1. User clicks OneDrive button
2. If not logged in, MSAL popup opens
3. User authenticates with Microsoft
4. Access token is obtained
5. Token is used for all Graph API calls

### File Storage
- All uploaded files go to: `/IndustryFlow/` folder in OneDrive
- Folder is created automatically if it doesn't exist
- Files linked from browsing stay in their original location

### File Metadata Stored
```typescript
{
  id: string;              // OneDrive file ID
  name: string;            // File name
  type: DocumentType;      // rfq | proposal | contract | supporting
  url: string;             // OneDrive web URL
  uploadedAt: string;      // Upload timestamp
  uploadedBy: string;      // User name
  size: number;            // File size in bytes
  source: 'onedrive';      // Source indicator
}
```

## Troubleshooting

### Files Not Uploading?
- Check MSAL initialization (should be automatic now)
- Verify `VITE_MICROSOFT_CLIENT_ID` is set in `.env`
- Check browser console for errors
- Ensure you're logged in (user info appears at top of dialog)

### Can't See Files When Browsing?
- Ensure you have files in OneDrive
- Check the IndustryFlow folder specifically
- Try the Recent tab to see recently accessed files
- Use Search to find specific files

### File Not Appearing in OneDrive?
- Check the `/IndustryFlow/` folder in your OneDrive
- Verify upload completed successfully (check for success toast)
- Check network tab in browser dev tools for API responses

## Next Steps

You can now:
✅ Upload new files to OneDrive
✅ Browse and link existing OneDrive files
✅ Search for specific files
✅ View recent files
✅ Link files to projects with proper metadata

All files are actually stored in OneDrive and accessible via the OneDrive web URL!
