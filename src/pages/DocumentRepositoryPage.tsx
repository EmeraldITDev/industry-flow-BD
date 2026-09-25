import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { businessVerticals } from '@/data/mockData';
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  ACCEPTED_DOCUMENT_MIME_HINT,
  formatFileSize,
  isAcceptedDocumentFile,
  REPOSITORY_DOCUMENT_TYPES,
} from '@/data/documentConstants';
import {
  repositoryDocumentsService,
  type RepositoryDocument,
} from '@/services/documents';
import { toast } from 'sonner';
import {
  Download,
  Eye,
  FileStack,
  Info,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { safeFormatDate } from '@/lib/dateUtils';
import {
  DocumentPreviewModal,
  type DocumentPreviewTarget,
} from '@/components/documents/DocumentPreviewModal';

const PER_PAGE = 50;

type UploadForm = {
  title: string;
  documentType: string;
  vertical: string;
  client: string;
  description: string;
  file: File | null;
};

const emptyUpload: UploadForm = {
  title: '',
  documentType: '',
  vertical: '',
  client: '',
  description: '',
  file: null,
};

export default function DocumentRepositoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedClient, setDebouncedClient] = useState('');
  const [verticalFilter, setVerticalFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<RepositoryDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<RepositoryDocument | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadForm>(emptyUpload);
  const [editForm, setEditForm] = useState({
    title: '',
    documentType: '',
    vertical: '',
    client: '',
    description: '',
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<DocumentPreviewTarget | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedClient(clientFilter.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [clientFilter]);

  const filters = useMemo(
    () => ({
      vertical: verticalFilter === 'all' ? undefined : verticalFilter,
      documentType: typeFilter === 'all' ? undefined : typeFilter,
      client: debouncedClient || undefined,
      search: debouncedSearch || undefined,
      per_page: PER_PAGE,
    }),
    [verticalFilter, typeFilter, debouncedClient, debouncedSearch]
  );

  const {
    data: listPages,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['repository-documents', filters],
    queryFn: ({ pageParam = 1 }) =>
      repositoryDocumentsService.list({ ...filters, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.lastPage ? last.page + 1 : undefined,
    staleTime: 30 * 1000,
  });

  const documents = useMemo(
    () => listPages?.pages.flatMap((p) => p.documents) ?? [],
    [listPages]
  );
  const totalCount = listPages?.pages[0]?.total ?? documents.length;

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const resetUpload = () => {
    setUploadForm(emptyUpload);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!uploadForm.title.trim() || !uploadForm.documentType || !uploadForm.vertical || !uploadForm.file) {
      toast.error('Title, document type, vertical, and file are required');
      return;
    }
    if (!isAcceptedDocumentFile(uploadForm.file)) {
      toast.error(`Invalid file. ${ACCEPTED_DOCUMENT_MIME_HINT}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      await repositoryDocumentsService.upload(
        {
          title: uploadForm.title.trim(),
          documentType: uploadForm.documentType,
          vertical: uploadForm.vertical,
          client: uploadForm.client.trim() || undefined,
          description: uploadForm.description.trim() || undefined,
          file: uploadForm.file,
        },
        setUploadProgress
      );
      toast.success('Document uploaded');
      setUploadOpen(false);
      resetUpload();
      queryClient.invalidateQueries({ queryKey: ['repository-documents'] });
    } catch (err: any) {
      const validationErrors = err?.response?.data?.errors;
      const firstValidation =
        validationErrors &&
        (Object.values(validationErrors).flat()[0] as string | undefined);
      toast.error(
        firstValidation ||
          err?.response?.data?.message ||
          (!err?.response
            ? 'Upload failed — connection dropped or file exceeds server limits (try under 25MB).'
            : 'Upload failed')
      );
    } finally {
      setIsUploading(false);
    }
  };

  const openEdit = (doc: RepositoryDocument) => {
    setEditDoc(doc);
    setEditForm({
      title: doc.title,
      documentType: doc.documentType,
      vertical: doc.vertical,
      client: doc.client ?? '',
      description: doc.description ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    if (!editForm.title.trim() || !editForm.documentType || !editForm.vertical) {
      toast.error('Title, document type, and vertical are required');
      return;
    }
    setIsSaving(true);
    try {
      await repositoryDocumentsService.update(editDoc.id, {
        title: editForm.title.trim(),
        documentType: editForm.documentType,
        vertical: editForm.vertical,
        client: editForm.client.trim() || null,
        description: editForm.description.trim() || null,
      });
      toast.success('Document updated');
      setEditDoc(null);
      queryClient.invalidateQueries({ queryKey: ['repository-documents'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setIsDeleting(true);
    try {
      await repositoryDocumentsService.delete(deleteDoc.id);
      toast.success('Document deleted');
      setDeleteDoc(null);
      queryClient.invalidateQueries({ queryKey: ['repository-documents'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = useCallback(async (doc: RepositoryDocument) => {
    setDownloadingId(doc.id);
    try {
      const fresh = await repositoryDocumentsService.getById(doc.id);
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
  }, []);

  const openPreview = useCallback((doc: RepositoryDocument) => {
    setPreviewTarget({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName || doc.title,
      mimeType: doc.mimeType,
      resolveUrl: async () => {
        const fresh = await repositoryDocumentsService.getById(doc.id);
        return fresh.url;
      },
    });
  }, []);

  useEffect(() => {
    if (!uploadOpen) resetUpload();
  }, [uploadOpen]);

  return (
    <AppLayout>
      <div className="min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <FileStack className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Document Repository</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Shared BD team library — not tied to a specific project
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {isLoading ? 'Loading…' : `${totalCount} documents found`}
              </p>
            </div>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        <Alert className="border-primary/20 bg-primary/5">
          <Users className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Library documents (Capability Deck / Other) are shared across the BD team.
            Project-specific uploads live on each opportunity page and are not listed here.
          </AlertDescription>
        </Alert>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-base sm:text-lg">Library</CardTitle>
              <CardDescription>
                Search across title, client, vertical, and document type
              </CardDescription>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, client…"
                  className="pl-9"
                />
              </div>
              <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All verticals</SelectItem>
                  {businessVerticals.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {REPOSITORY_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                placeholder="Filter by client"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading documents…
              </div>
            ) : isError ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-muted-foreground">Could not load documents.</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-2">
                <Info className="h-8 w-8 mx-auto opacity-50" />
                <p>No documents found. Upload the first shared file for the team.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-lg border border-border p-4"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium truncate">{doc.title}</h3>
                        <Badge variant="secondary">{doc.documentType}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {doc.vertical}
                        {doc.client ? ` · ${doc.client}` : ''}
                        {' · '}
                        {formatFileSize(doc.fileSize)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded by {doc.uploader?.name || 'Unknown'} ·{' '}
                        {safeFormatDate(doc.createdAt) || '—'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPreview(doc)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="ml-2">Preview</span>
                      </Button>
                      <Button
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
                      <Button size="sm" variant="outline" onClick={() => openEdit(doc)}>
                        <Pencil className="h-4 w-4" />
                        <span className="ml-2">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDoc(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-2">Delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
                <div ref={loadMoreRef} className="h-4" />
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more…
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
            <DialogDescription>
              Shared with the entire BD team. {ACCEPTED_DOCUMENT_MIME_HINT}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="repo-title">Title *</Label>
              <Input
                id="repo-title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document type *</Label>
                <Select
                  value={uploadForm.documentType}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, documentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPOSITORY_DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vertical *</Label>
                <Select
                  value={uploadForm.vertical}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, vertical: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vertical" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessVerticals.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo-client">Client (optional)</Label>
              <Input
                id="repo-client"
                value={uploadForm.client}
                onChange={(e) => setUploadForm({ ...uploadForm, client: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo-desc">Description (optional)</Label>
              <Textarea
                id="repo-desc"
                rows={3}
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo-file">File *</Label>
              <Input
                id="repo-file"
                type="file"
                accept={ACCEPTED_DOCUMENT_EXTENSIONS}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, file: e.target.files?.[0] ?? null })
                }
              />
              {uploadForm.file && (
                <p className="text-xs text-muted-foreground">
                  {uploadForm.file.name} · {formatFileSize(uploadForm.file.size)}
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
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit metadata */}
      <Dialog open={!!editDoc} onOpenChange={(open) => !open && setEditDoc(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
            <DialogDescription>Metadata only — the file cannot be replaced here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document type *</Label>
                <Select
                  value={editForm.documentType}
                  onValueChange={(v) => setEditForm({ ...editForm, documentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPOSITORY_DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vertical *</Label>
                <Select
                  value={editForm.vertical}
                  onValueChange={(v) => setEditForm({ ...editForm, vertical: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {businessVerticals.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Input
                value={editForm.client}
                onChange={(e) => setEditForm({ ...editForm, client: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoc(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{deleteDoc?.title}” from the shared repository and from
              storage. This cannot be undone.
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

      <DocumentPreviewModal
        open={!!previewTarget}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null);
        }}
        document={previewTarget}
      />
    </AppLayout>
  );
}
