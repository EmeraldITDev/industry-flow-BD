import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { onedriveService } from '@/services/onedrive';
import { Upload, Cloud, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OneDriveUploadProps {
  onFileUploaded: (fileInfo: {
    name: string;
    size: number;
    url: string;
    uploadedAt: string;
    source: 'onedrive';
    onedriveId?: string;
  }) => void;
  projectName?: string;
}

export function OneDriveUpload({ onFileUploaded, projectName }: OneDriveUploadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(onedriveService.isAuthenticated());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Check if OneDrive is configured
  const isConfigured = onedriveService.isConfigured();

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      const success = await onedriveService.login();
      if (success) {
        setIsAuthenticated(true);
        toast.success('Successfully connected to OneDrive');
      } else {
        toast.error('Failed to connect to OneDrive');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to OneDrive');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const folderPath = projectName ? `IndustryFlow/${projectName}` : 'IndustryFlow';
      const result = await onedriveService.uploadFile(selectedFile, folderPath);

      // Notify parent component
      onFileUploaded({
        name: result.name,
        size: result.size,
        url: result.webUrl,
        uploadedAt: result.createdDateTime,
        source: 'onedrive',
        onedriveId: result.id,
      });

      toast.success('File uploaded to OneDrive successfully');
      setIsDialogOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file to OneDrive');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isConfigured) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900">
          OneDrive integration is not configured. Please contact your administrator to set up Microsoft Client ID.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="gap-2"
      >
        <Cloud className="h-4 w-4 text-blue-600" />
        Upload to OneDrive
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              Upload to OneDrive
            </DialogTitle>
            <DialogDescription>
              {isAuthenticated
                ? 'Select a file to upload to your OneDrive'
                : 'Connect your Microsoft account to upload files'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isAuthenticated ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need to authenticate with your Microsoft account to upload files to OneDrive.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleLogin}
                  disabled={isAuthenticating}
                  className="w-full"
                >
                  {isAuthenticating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect to Microsoft OneDrive
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="onedrive-file"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  <label htmlFor="onedrive-file" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">
                      {selectedFile ? selectedFile.name : 'Click to select a file'}
                    </p>
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </label>
                </div>

                {selectedFile && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isUploading ? 'Uploading...' : 'Upload to OneDrive'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFile(null)}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Files will be saved to: {projectName ? `IndustryFlow/${projectName}` : 'IndustryFlow'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
