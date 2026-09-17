import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  ACCEPTED_DOCUMENT_MIME_HINT,
  formatFileSize,
  isAcceptedDocumentFile,
  OPPORTUNITY_DOCUMENT_TYPES,
} from '@/data/documentConstants';
import {
  opportunityDocumentsService,
  type OpportunityDocument,
} from '@/services/documents';
import { toast } from 'sonner';
import { Download, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { safeFormatDate } from '@/lib/dateUtils';

type Props = {
  projectId: string;
  canManage?: boolean;
};

export function ProjectDocumentsSection({ projectId, canManage = true }: Props) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<OpportunityDocument | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['opportunity-documents', projectId],
    queryFn: () => opportunityDocumentsService.getAll(projectId),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!uploadOpen) {
      setTitle('');
      setDocumentType('');
      setFile(null);
      setUploadProgress(0);
    }
  }, [uploadOpen]);

  const handleUpload = async () => {
    if (!title.trim() || !documentType || !file) {
      toast.error('Title, document type, and file are required');
      return;
    }
    if (!isAcceptedDocumentFile(file)) {
      toast.error(`Invalid file. ${ACCEPTED_DOCUMENT_MIME_HINT}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      await opportunityDocumentsService.upload(
        projectId,
        { title: title.trim(), documentType, file },
        setUploadProgress
      );
      toast.success('Document uploaded');
      setUploadOpen(false);
      queryClient.invalidateQueries({ queryKey: ['opportunity-documents', projectId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setIsDeleting(true);
    try {
      await opportunityDocumentsService.delete(projectId, deleteDoc.id);
      toast.success('Document deleted');
      setDeleteDoc(null);
      queryClient.invalidateQueries({ queryKey: ['opportunity-documents', projectId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = useCallback(
    async (doc: OpportunityDocument) => {
      setDownloadingId(doc.id);
      try {
        const fresh = await opportunityDocumentsService.getById(projectId, doc.id);
        if (!fresh.url) {
          toast.error('Download URL unavailable');
          return;
        }
        window.open(fresh.url, '_blank', 'noopener,noreferrer');
      } catch {
        toast.error('Could not get download link');
      } finally {
        setDownloadingId(null);
      }
    },
    [projectId]
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Project Documents
            </CardTitle>
            <CardDescription>
              Opportunity-only files (not shown in the central Document Repository) ·{' '}
              {ACCEPTED_DOCUMENT_MIME_HINT}
            </CardDescription>
          </div>
          {canManage && (
            <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading documents…
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No documents uploaded yet for this project
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">{doc.title}</span>
                      <Badge variant="secondary">{doc.documentType}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {doc.uploader?.name || 'Unknown'} · {safeFormatDate(doc.createdAt)} ·{' '}
                      {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      <span className="ml-2">Download</span>
                    </Button>
                    {canManage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDoc(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload project document</DialogTitle>
            <DialogDescription>{ACCEPTED_DOCUMENT_MIME_HINT}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="opp-doc-title">Title *</Label>
              <Input
                id="opp-doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Document type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-doc-file">File *</Label>
              <Input
                id="opp-doc-file"
                type="file"
                accept={ACCEPTED_DOCUMENT_EXTENSIONS}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} · {formatFileSize(file.size)}
                </p>
              )}
            </div>
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpload} disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{deleteDoc?.title}” from this project and from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
