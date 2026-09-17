export const REPOSITORY_DOCUMENT_TYPES = [
  'Capability Deck',
  'Other',
] as const;

export const OPPORTUNITY_DOCUMENT_TYPES = [
  'RFQ',
  'Supplier Quote/Proposal',
  'Deal Recap',
  'Emerald Proposal',
  'Purchase Order',
  'Equipment Data',
  'Other',
] as const;

export const ACCEPTED_DOCUMENT_EXTENSIONS = '.pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg';
export const ACCEPTED_DOCUMENT_MIME_HINT =
  'PDF, DOCX, XLSX, PPTX, PNG, or JPG (max 25MB)';
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isAcceptedDocumentFile(file: File): boolean {
  if (file.size > MAX_DOCUMENT_BYTES) return false;
  const name = file.name.toLowerCase();
  return /\.(pdf|docx|xlsx|pptx|png|jpe?g)$/.test(name);
}
