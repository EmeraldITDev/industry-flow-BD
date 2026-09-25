import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Eye, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { renderAsync } from 'docx-preview';
import {
  fetchDocumentBlob,
  parseCsvText,
  resolveDocumentPreviewKind,
  type DocumentPreviewKind,
} from '@/lib/documentPreview';
import { cn } from '@/lib/utils';

export type DocumentPreviewTarget = {
  id: string;
  title: string;
  fileName: string;
  mimeType?: string | null;
  /** Fresh signed URL resolver — called when the modal opens. */
  resolveUrl: () => Promise<string | null>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentPreviewTarget | null;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; kind: DocumentPreviewKind; objectUrl?: string; csvRows?: string[][] }
  | { status: 'unavailable'; reason: string; downloadUrl?: string | null }
  | { status: 'error'; message: string };

export function DocumentPreviewModal({ open, onOpenChange, document: doc }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const docxHostRef = useRef<HTMLDivElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const docxBufferRef = useRef<ArrayBuffer | null>(null);

  const kind = useMemo(
    () =>
      doc
        ? resolveDocumentPreviewKind(doc.fileName || doc.title, doc.mimeType)
        : 'unsupported',
    [doc]
  );

  useEffect(() => {
    if (!open || !doc) {
      setState({ status: 'idle' });
      setDownloadUrl(null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      docxBufferRef.current = null;
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState({ status: 'loading' });
      try {
        const url = await doc.resolveUrl();
        if (cancelled) return;
        if (!url) {
          setState({
            status: 'unavailable',
            reason: 'Download URL unavailable for this document.',
          });
          return;
        }
        setDownloadUrl(url);

        if (kind === 'pptx' || kind === 'unsupported') {
          setState({
            status: 'unavailable',
            reason:
              kind === 'pptx'
                ? 'Preview not available for PowerPoint (.pptx) files in-app. Download to open locally.'
                : 'Preview not available for this file type.',
            downloadUrl: url,
          });
          return;
        }

        // PDF + images: blob URL avoids Content-Disposition: attachment downloads.
        if (kind === 'pdf' || kind === 'image') {
          try {
            const blob = await fetchDocumentBlob(url);
            if (cancelled) return;
            const typed =
              kind === 'pdf'
                ? new Blob([blob], { type: 'application/pdf' })
                : blob.type.startsWith('image/')
                  ? blob
                  : new Blob([blob], { type: guessImageMime(doc.fileName) });
            const objectUrl = URL.createObjectURL(typed);
            objectUrlRef.current = objectUrl;
            setState({ status: 'ready', kind, objectUrl });
          } catch {
            if (cancelled) return;
            setState({ status: 'ready', kind, objectUrl: url });
          }
          return;
        }

        let blob: Blob;
        try {
          blob = await fetchDocumentBlob(url);
        } catch {
          if (cancelled) return;
          setState({
            status: 'unavailable',
            reason:
              'Preview not available — the file could not be loaded for in-app rendering (often a CORS restriction). Download instead.',
            downloadUrl: url,
          });
          return;
        }
        if (cancelled) return;

        if (kind === 'csv') {
          const text = await blob.text();
          if (cancelled) return;
          setState({ status: 'ready', kind, csvRows: parseCsvText(text).slice(0, 500) });
          return;
        }

        if (kind === 'xlsx') {
          const buffer = await blob.arrayBuffer();
          if (cancelled) return;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            setState({
              status: 'unavailable',
              reason: 'This workbook has no sheets to preview.',
              downloadUrl: url,
            });
            return;
          }
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
            header: 1,
            defval: '',
            blankrows: false,
          }) as unknown as string[][];
          const limited = rows.slice(0, 200).map((r) =>
            (Array.isArray(r) ? r : []).slice(0, 40).map((c) => String(c ?? ''))
          );
          setState({ status: 'ready', kind, csvRows: limited });
          return;
        }

        if (kind === 'docx') {
          docxBufferRef.current = await blob.arrayBuffer();
          if (cancelled) return;
          setState({ status: 'ready', kind });
          return;
        }

        setState({
          status: 'unavailable',
          reason: 'Preview not available for this file type.',
          downloadUrl: url,
        });
      } catch (err: any) {
        if (cancelled) return;
        setState({
          status: 'error',
          message: err?.message || 'Could not open preview.',
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      docxBufferRef.current = null;
    };
  }, [open, doc, kind]);

  useEffect(() => {
    if (state.status !== 'ready' || state.kind !== 'docx') return;
    const buffer = docxBufferRef.current;
    if (!buffer) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const host = docxHostRef.current;
      if (!host || cancelled) return;
      host.innerHTML = '';
      void (async () => {
        try {
          await renderAsync(buffer, host, undefined, {
            className: 'docx-preview-body',
            inWrapper: true,
            ignoreWidth: false,
            breakPages: true,
          });
        } catch {
          if (!cancelled) {
            setState({
              status: 'unavailable',
              reason:
                'Preview not available for this Word file — the document could not be rendered cleanly.',
              downloadUrl,
            });
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (docxHostRef.current) docxHostRef.current.innerHTML = '';
    };
  }, [state, downloadUrl]);

  const handleDownload = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden !grid-cols-none">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0 space-y-1">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Eye className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{doc?.title || 'Document preview'}</span>
          </DialogTitle>
          <DialogDescription className="truncate">
            {doc?.fileName}
            {kind !== 'unsupported' ? ` · ${kind.toUpperCase()} preview` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/20">
          {state.status === 'loading' || state.status === 'idle' ? (
            <div className="h-full flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading preview…
            </div>
          ) : null}

          {state.status === 'error' ? (
            <Unavailable
              message={state.message}
              onDownload={downloadUrl ? handleDownload : undefined}
            />
          ) : null}

          {state.status === 'unavailable' ? (
            <Unavailable
              message={state.reason}
              onDownload={
                state.downloadUrl || downloadUrl
                  ? () =>
                      window.open(
                        state.downloadUrl || downloadUrl || '',
                        '_blank',
                        'noopener,noreferrer'
                      )
                  : undefined
              }
            />
          ) : null}

          {state.status === 'ready' && state.kind === 'pdf' && state.objectUrl ? (
            <iframe
              title={doc?.title || 'PDF preview'}
              src={state.objectUrl}
              className="w-full h-full border-0 bg-background"
            />
          ) : null}

          {state.status === 'ready' && state.kind === 'image' && state.objectUrl ? (
            <div className="h-full w-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={state.objectUrl}
                alt={doc?.title || 'Image preview'}
                className="max-w-full max-h-full object-contain rounded-md shadow-sm"
              />
            </div>
          ) : null}

          {state.status === 'ready' &&
          (state.kind === 'csv' || state.kind === 'xlsx') &&
          state.csvRows ? (
            <ScrollArea className="h-full">
              <div className="p-4">
                <TablePreview rows={state.csvRows} />
                {state.csvRows.length >= 200 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Showing first {state.csvRows.length} rows — download for the full file.
                  </p>
                )}
              </div>
            </ScrollArea>
          ) : null}

          {state.status === 'ready' && state.kind === 'docx' ? (
            <ScrollArea className="h-full">
              <div
                ref={docxHostRef}
                className={cn(
                  'p-4 bg-background text-foreground',
                  '[&_.docx-preview-body]:bg-white [&_.docx-preview-body]:text-black',
                  '[&_.docx-wrapper]:bg-white'
                )}
              />
            </ScrollArea>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleDownload} disabled={!downloadUrl}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Unavailable({
  message,
  onDownload,
}: {
  message: string;
  onDownload?: () => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
      <Eye className="h-10 w-10 text-muted-foreground/50" />
      <div className="space-y-1 max-w-md">
        <p className="font-medium">Preview not available for this file type</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onDownload && (
        <Button type="button" variant="outline" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      )}
    </div>
  );
}

function TablePreview({ rows }: { rows: string[][] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">This file has no rows to show.</p>;
  }
  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/60">
            {Array.from({ length: colCount }).map((_, i) => (
              <th
                key={i}
                className="border-b border-border px-3 py-2 text-left font-semibold whitespace-nowrap"
              >
                {header[i] ?? ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="odd:bg-background even:bg-muted/20">
              {Array.from({ length: colCount }).map((_, ci) => (
                <td
                  key={ci}
                  className="border-b border-border/60 px-3 py-1.5 align-top whitespace-pre-wrap max-w-[20rem]"
                >
                  {row[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function guessImageMime(fileName: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/*';
}
