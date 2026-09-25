/** Helpers for in-app document preview kind detection and fetching. */

export type DocumentPreviewKind =
  | 'pdf'
  | 'image'
  | 'csv'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'unsupported';

export function extensionOf(fileName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return m ? m[1].toLowerCase() : '';
}

export function resolveDocumentPreviewKind(
  fileName: string,
  mimeType?: string | null
): DocumentPreviewKind {
  const ext = extensionOf(fileName);
  const mime = (mimeType || '').toLowerCase();

  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return 'image';
  }
  if (ext === 'csv' || mime === 'text/csv' || mime === 'application/csv') return 'csv';
  if (
    ext === 'docx' ||
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (
    ext === 'xlsx' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'
  ) {
    return 'xlsx';
  }
  if (
    ext === 'pptx' ||
    mime ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx';
  }
  return 'unsupported';
}

/** Fetch a remote file as Blob. Falls back carefully for CORS failures. */
export async function fetchDocumentBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) {
    throw new Error(`Could not load file (${res.status})`);
  }
  return res.blob();
}

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n' || (ch === '\r' && next === '\n')) {
      if (ch === '\r') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (ch === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}
