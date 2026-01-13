import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, FileText, File, CheckCircle2, Clock, FolderOpen } from 'lucide-react';
import { OneDriveFile } from '@/services/onedrive';
import { format } from 'date-fns';

interface OneDriveFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (file: OneDriveFile) => void;
  listFiles: (folderPath?: string) => Promise<OneDriveFile[]>;
  listRecentFiles: (limit?: number) => Promise<OneDriveFile[]>;
  searchFiles: (query: string) => Promise<OneDriveFile[]>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) return <FileText className="w-5 h-5 text-green-500" />;
  if (['doc', 'docx'].includes(ext || '')) return <FileText className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

export function OneDriveFilePicker({
  open,
  onOpenChange,
  onFileSelect,
  listFiles,
  listRecentFiles,
  searchFiles,
}: OneDriveFilePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recentFiles, setRecentFiles] = useState<OneDriveFile[]>([]);
  const [folderFiles, setFolderFiles] = useState<OneDriveFile[]>([]);
  const [searchResults, setSearchResults] = useState<OneDriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<OneDriveFile | null>(null);

  useEffect(() => {
    if (open) {
      loadRecentFiles();
      loadFolderFiles();
    }
  }, [open]);

  const loadRecentFiles = async () => {
    setIsLoading(true);
    try {
      const files = await listRecentFiles(20);
      setRecentFiles(files);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolderFiles = async () => {
    setIsLoading(true);
    try {
      const files = await listFiles('IndustryFlow');
      setFolderFiles(files);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const results = await searchFiles(searchQuery);
      setSearchResults(results);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (file: OneDriveFile) => {
    setSelectedFile(file);
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
      onOpenChange(false);
      setSelectedFile(null);
    }
  };

  const renderFileList = (files: OneDriveFile[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    if (files.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => handleFileClick(file)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedFile?.id === file.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
            >
              <div className="flex items-start gap-3">
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{format(new Date(file.lastModifiedDateTime), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                {selectedFile?.id === file.id && (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select File from OneDrive</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="industryflow" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              IndustryFlow
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-4">
            {renderFileList(recentFiles, 'No recent files found')}
          </TabsContent>

          <TabsContent value="industryflow" className="mt-4">
            {renderFileList(folderFiles, 'No files in IndustryFlow folder')}
          </TabsContent>

          <TabsContent value="search" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            {renderFileList(searchResults, 'Enter a search term to find files')}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedFile}>
            Link Selected File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
