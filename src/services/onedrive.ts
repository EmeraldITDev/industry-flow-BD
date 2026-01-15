import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';

// OneDrive file type
export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  downloadUrl?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

// Microsoft Graph API configuration
const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';

// MSAL configuration - these should come from environment variables
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

// Scopes for OneDrive access
const loginRequest = {
  scopes: ['User.Read', 'Files.ReadWrite', 'Files.ReadWrite.All'],
};

// Initialize MSAL instance
let msalInstance: PublicClientApplication | null = null;
let initializationPromise: Promise<PublicClientApplication | null> | null = null;

const initializeMsal = async (): Promise<PublicClientApplication | null> => {
  if (!msalConfig.auth.clientId) {
    console.error('MSAL not configured. Please set VITE_MICROSOFT_CLIENT_ID.');
    return null;
  }

  // If already initialized, return it
  if (msalInstance) {
  return msalInstance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      return msalInstance;
    } catch (error) {
      console.error('Failed to initialize MSAL:', error);
      msalInstance = null;
      initializationPromise = null;
      return null;
    }
  })();

  return initializationPromise;
};

// Get the access token
const getAccessToken = async (): Promise<string | null> => {
  const msal = await initializeMsal();
    if (!msal) {
    console.error('MSAL not initialized. Please configure Microsoft Client ID.');
    return null;
    }

  try {
    const accounts = msal.getAllAccounts();
    if (accounts.length === 0) {
      // No accounts, need to login
      const loginResponse = await msal.loginPopup(loginRequest);
      return loginResponse.accessToken;
    }

    // Get token silently
    const request = {
      ...loginRequest,
      account: accounts[0],
    };

    try {
      const response = await msal.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      // Silent token acquisition failed, try popup
      const response = await msal.acquireTokenPopup(request);
        return response.accessToken;
      }
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
    }
};

// Check if user is authenticated (alias for compatibility)
const isAuthenticated = (): boolean => {
  if (!msalInstance) return false;
  return msalInstance.getAllAccounts().length > 0;
};

const isLoggedIn = isAuthenticated;

  // Get current user info
const getCurrentUser = async (): Promise<any | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${GRAPH_API_ENDPOINT}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

// Login to OneDrive
const login = async (): Promise<any> => {
  const msal = await initializeMsal();
  if (!msal) {
    throw new Error('Microsoft Client ID not configured. Please set VITE_MICROSOFT_CLIENT_ID in your .env file.');
  }

  try {
    const result = await msal.loginPopup(loginRequest);
    return result.account;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Logout from OneDrive
const logout = async (): Promise<void> => {
  const msal = await initializeMsal();
  if (!msal) return;

  const accounts = msal.getAllAccounts();
  if (accounts.length > 0) {
    await msal.logoutPopup({ account: accounts[0] });
  }
};

  // Upload file to OneDrive
const uploadFile = async (file: File, folderPath: string = 'IndustryFlow'): Promise<OneDriveFile> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with OneDrive');
  }

  try {
    // Create folder if it doesn't exist
    const folderUrl = `${GRAPH_API_ENDPOINT}/me/drive/root:/${folderPath}`;
    
    try {
      await fetch(folderUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Folder doesn't exist, create it
      await fetch(`${GRAPH_API_ENDPOINT}/me/drive/root/children`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderPath,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }),
      });
    }

    // Upload file
    const uploadUrl = `${GRAPH_API_ENDPOINT}/me/drive/root:/${folderPath}/${file.name}:/content`;
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to OneDrive');
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      size: data.size,
      webUrl: data.webUrl,
      downloadUrl: data['@microsoft.graph.downloadUrl'],
      createdDateTime: data.createdDateTime,
      lastModifiedDateTime: data.lastModifiedDateTime,
    };
  } catch (error) {
    console.error('Error uploading file to OneDrive:', error);
    throw error;
  }
};

// Get file download URL
const getDownloadUrl = async (fileId: string): Promise<string | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${GRAPH_API_ENDPOINT}/me/drive/items/${fileId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data['@microsoft.graph.downloadUrl'] || data.webUrl;
  } catch (error) {
    console.error('Error getting download URL:', error);
    return null;
  }
};

// Delete file from OneDrive
const deleteFile = async (fileId: string): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const response = await fetch(`${GRAPH_API_ENDPOINT}/me/drive/items/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting file from OneDrive:', error);
    return false;
  }
};

// List files in a folder
const listFiles = async (folderPath: string = 'IndustryFlow'): Promise<OneDriveFile[]> => {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    // Get files from specific folder
    const folderUrl = `${GRAPH_API_ENDPOINT}/me/drive/root:/${folderPath}:/children`;
    
    const response = await fetch(folderUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Folder might not exist, return empty array
      return [];
    }

    const data = await response.json();
    const files = data.value || [];

    return files
      .filter((item: any) => item.file) // Only files, not folders
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        webUrl: item.webUrl,
        downloadUrl: item['@microsoft.graph.downloadUrl'],
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
      }));
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
};

// List all recent files
const listRecentFiles = async (limit: number = 20): Promise<OneDriveFile[]> => {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const response = await fetch(`${GRAPH_API_ENDPOINT}/me/drive/recent?$top=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const files = data.value || [];

    return files
      .filter((item: any) => item.file)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        webUrl: item.webUrl,
        downloadUrl: item['@microsoft.graph.downloadUrl'],
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
      }));
  } catch (error) {
    console.error('Error listing recent files:', error);
    return [];
  }
};

// Search files
const searchFiles = async (query: string): Promise<OneDriveFile[]> => {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const response = await fetch(`${GRAPH_API_ENDPOINT}/me/drive/root/search(q='${encodeURIComponent(query)}')`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const files = data.value || [];

    return files
      .filter((item: any) => item.file)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        webUrl: item.webUrl,
        downloadUrl: item['@microsoft.graph.downloadUrl'],
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
      }));
  } catch (error) {
    console.error('Error searching files:', error);
    return [];
  }
};

// Get file info
const getFileInfo = async (fileId: string): Promise<OneDriveFile | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${GRAPH_API_ENDPOINT}/me/drive/items/${fileId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      size: data.size,
      webUrl: data.webUrl,
      downloadUrl: data['@microsoft.graph.downloadUrl'],
      createdDateTime: data.createdDateTime,
      lastModifiedDateTime: data.lastModifiedDateTime,
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
    }
};

// Check if OneDrive is configured
const isConfigured = (): boolean => {
  return !!msalConfig.auth.clientId && msalConfig.auth.clientId !== '';
};

export const onedriveService = {
  isConfigured,
  isAuthenticated,
  isLoggedIn,
  getCurrentUser,
  login,
  logout,
  uploadFile,
  listFiles,
  listRecentFiles,
  searchFiles,
  getFileInfo,
  getDownloadUrl,
  deleteFile,
};
