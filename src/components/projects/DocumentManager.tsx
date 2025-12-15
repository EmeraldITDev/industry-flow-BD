import { useState } from 'react';
import { ProjectDocument, DocumentType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  File, 
  Trash2, 
  Download,
  Cloud,
  HardDrive,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DocumentManagerProps {
  documents: ProjectDocument[];
  onDocumentsChange: (documents: ProjectDocument[]) => void;
  readonly?: boolean;
}

const documentTypeLabels: Record<DocumentType, string> = {
  rfq: 'RFQ',
  proposal: 'Proposal',
  contract: 'Contract',
  supporting: 'Supporting Doc',
};

const documentTypeColors: Record<DocumentType, string> = {
  rfq: 'bg-chart-1/20 text-chart-1',
  proposal: 'bg-chart-2/20 text-chart-2',
  contract: 'bg-chart-3/20 text-chart-3',
  supporting: 'bg-chart-4/20 text-chart-4',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-5 h-5 text-destructive" />;
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-5 h-5 text-chart-2" />;
  if (['doc', 'docx'].includes(ext || '')) return <FileText className="w-5 h-5 text-chart-1" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

export function DocumentManager({ documents, onDocumentsChange, readonly = false }: DocumentManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'supporting' as DocumentType,
    source: 'local' as 'local' | 'onedrive',
  });

  const handleAddDocument = () => {
    if (!newDocument.name) {
      toast.error('Please enter a document name');
      return;
    }

    const doc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      name: newDocument.name,
      type: newDocument.type,
      url: '#',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Current User',
      size: Math.floor(Math.random() * 5000000) + 100000,
      source: newDocument.source,
    };

    onDocumentsChange([...documents, doc]);
    setNewDocument({ name: '', type: 'supporting', source: 'local' });
    setIsDialogOpen(false);
    toast.success('Document added successfully');
  };

  const handleRemoveDocument = (id: string) => {
    onDocumentsChange(documents.filter(d => d.id !== id));
    toast.success('Document removed');
  };

  const handleConnectOneDrive = () => {
    toast.info('OneDrive connection coming soon. This is a placeholder for Microsoft Graph API integration.');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Documents</CardTitle>
        {!readonly && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleConnectOneDrive}
            >
              <Cloud className="w-4 h-4 mr-2" />
              OneDrive
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Document Name</Label>
                    <Input
                      value={newDocument.name}
                      onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                      placeholder="e.g., RFQ-2024-001.pdf"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select
                      value={newDocument.type}
                      onValueChange={(value: DocumentType) => 
                        setNewDocument({ ...newDocument, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rfq">RFQ</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="supporting">Supporting Document</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={newDocument.source}
                      onValueChange={(value: 'local' | 'onedrive') => 
                        setNewDocument({ ...newDocument, source: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local Upload</SelectItem>
                        <SelectItem value="onedrive">OneDrive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop or click to upload
                    </p>
                  </div>
                  <Button onClick={handleAddDocument} className="w-full">
                    Add Document
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents attached</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(doc.name)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span>{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className={documentTypeColors[doc.type]}>
                    {documentTypeLabels[doc.type]}
                  </Badge>
                  {doc.source === 'onedrive' ? (
                    <Cloud className="w-4 h-4 text-chart-1" />
                  ) : (
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="w-4 h-4" />
                  </Button>
                  {!readonly && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveDocument(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
