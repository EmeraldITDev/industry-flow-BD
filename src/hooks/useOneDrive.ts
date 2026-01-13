import { useState, useCallback } from 'react';
import { onedriveService, OneDriveFile } from '@/services/onedrive';
import { toast } from 'sonner';

export function useOneDrive() {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(onedriveService.isLoggedIn());
  const [currentUser, setCurrentUser] = useState<any>(null);

  const login = useCallback(async () => {
    try {
      const account = await onedriveService.login();
      setIsLoggedIn(true);
      
      // Get user info
      const user = await onedriveService.getCurrentUser();
      setCurrentUser(user);
      
      toast.success(`Logged in to OneDrive as ${user.displayName || user.mail}`);
      return account;
    } catch (error: any) {
      console.error('OneDrive login error:', error);
      toast.error(error.message || 'Failed to login to OneDrive');
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await onedriveService.logout();
      setIsLoggedIn(false);
      setCurrentUser(null);
      toast.success('Logged out from OneDrive');
    } catch (error: any) {
      console.error('OneDrive logout error:', error);
      toast.error('Failed to logout from OneDrive');
    }
  }, []);

  const uploadFile = useCallback(async (
    file: File,
    folderPath?: string
  ): Promise<OneDriveFile | null> => {
    if (!isLoggedIn) {
      toast.error('Please login to OneDrive first');
      return null;
    }

    setIsUploading(true);
    try {
      const uploadedFile = await onedriveService.uploadFile(file, folderPath);
      toast.success(`"${file.name}" uploaded to OneDrive successfully`);
      return uploadedFile;
    } catch (error: any) {
      console.error('OneDrive upload error:', error);
      toast.error(error.message || 'Failed to upload file to OneDrive');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [isLoggedIn]);

  const uploadMultipleFiles = useCallback(async (
    files: File[],
    folderPath?: string
  ): Promise<OneDriveFile[]> => {
    if (!isLoggedIn) {
      toast.error('Please login to OneDrive first');
      return [];
    }

    setIsUploading(true);
    const uploadedFiles: OneDriveFile[] = [];
    const errors: string[] = [];

    try {
      for (const file of files) {
        try {
          const uploadedFile = await onedriveService.uploadFile(file, folderPath);
          uploadedFiles.push(uploadedFile);
        } catch (error: any) {
          errors.push(file.name);
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      if (uploadedFiles.length > 0) {
        toast.success(`${uploadedFiles.length} file(s) uploaded to OneDrive`);
      }
      
      if (errors.length > 0) {
        toast.error(`Failed to upload: ${errors.join(', ')}`);
      }

      return uploadedFiles;
    } finally {
      setIsUploading(false);
    }
  }, [isLoggedIn]);

  const getFileInfo = useCallback(async (fileId: string): Promise<OneDriveFile | null> => {
    try {
      return await onedriveService.getFileInfo(fileId);
    } catch (error: any) {
      console.error('Failed to get file info:', error);
      toast.error('Failed to get file information');
      return null;
    }
  }, []);

  const getDownloadUrl = useCallback(async (fileId: string): Promise<string | null> => {
    try {
      return await onedriveService.getDownloadUrl(fileId);
    } catch (error: any) {
      console.error('Failed to get download URL:', error);
      toast.error('Failed to get download link');
      return null;
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      await onedriveService.deleteFile(fileId);
      toast.success('File deleted from OneDrive');
      return true;
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file from OneDrive');
      return false;
    }
  }, []);

  const listFiles = useCallback(async (folderPath?: string): Promise<OneDriveFile[]> => {
    try {
      return await onedriveService.listFiles(folderPath);
    } catch (error: any) {
      console.error('Failed to list files:', error);
      return [];
    }
  }, []);

  const listRecentFiles = useCallback(async (limit?: number): Promise<OneDriveFile[]> => {
    try {
      return await onedriveService.listRecentFiles(limit);
    } catch (error: any) {
      console.error('Failed to list recent files:', error);
      return [];
    }
  }, []);

  const searchFiles = useCallback(async (query: string): Promise<OneDriveFile[]> => {
    try {
      return await onedriveService.searchFiles(query);
    } catch (error: any) {
      console.error('Failed to search files:', error);
      return [];
    }
  }, []);

  return {
    isConfigured: onedriveService.isConfigured(),
    isLoggedIn,
    isUploading,
    currentUser,
    login,
    logout,
    uploadFile,
    uploadMultipleFiles,
    listFiles,
    listRecentFiles,
    searchFiles,
    getFileInfo,
    getDownloadUrl,
    deleteFile,
  };
}
