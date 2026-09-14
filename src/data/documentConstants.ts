export type CategoryMappingRow = {
  legacyLabel: string;
  businessVertical: string;
  productCategory: string;
};

/** Read-only reference standard for vertical / product category assignments */
export const CATEGORY_MAPPING_ROWS: CategoryMappingRow[] = [
  { legacyLabel: 'EMR_OGP', businessVertical: 'EMR_Aftermarket Services', productCategory: 'Capital Parts' },
  { legacyLabel: 'EMR_OGP', businessVertical: 'EMR_Aftermarket Services', productCategory: 'Consumables' },
  { legacyLabel: 'EMR_OGP', businessVertical: 'EMR_Aftermarket Services', productCategory: 'Repairs / Upgrades / Services' },
  { legacyLabel: 'EMR_OGP', businessVertical: 'EMR_Special Projects', productCategory: 'NPD / NMI' },
  { legacyLabel: 'EMR_OGP', businessVertical: 'EMR_O&M', productCategory: 'Repairs / Upgrades / Services' },
  { legacyLabel: 'EMR_MFG', businessVertical: 'EMR_Manufacturing', productCategory: 'Capital Parts' },
  { legacyLabel: 'EMR_MFG', businessVertical: 'EMR_Manufacturing', productCategory: 'Repairs / Upgrades / Services' },
  { legacyLabel: 'EMR_Services', businessVertical: 'EMR_Aftermarket Services', productCategory: 'Repairs / Upgrades / Services' },
  { legacyLabel: 'BEDS_Services', businessVertical: 'EMR_Aftermarket Services', productCategory: 'Repairs / Upgrades / Services' },
  { legacyLabel: 'EMR_Healthcare', businessVertical: 'EMR_Aftermarket Services', productCategory: 'Capital Parts' },
  { legacyLabel: 'EMR_Renewables', businessVertical: 'EMR_Special Projects', productCategory: 'NPD / NMI' },
  { legacyLabel: 'EMR_Trading', businessVertical: 'EMR_Trading', productCategory: 'N/A - Trading Commodity' },
  { legacyLabel: 'Internal / Non-commercial', businessVertical: 'N/A', productCategory: 'N/A - Internal / Non-commercial' },
];

export const REPOSITORY_DOCUMENT_TYPES = [
  'Capability Deck',
  'Proposal Template',
  'Partnership Rationale',
  'NDA',
  'GT Equipment Database',
  'Partner List',
  'Other',
] as const;

export const OPPORTUNITY_DOCUMENT_TYPES = [
  'RFQ',
  'Quote',
  'Deal Recap',
  'EMR Proposal',
  'Purchase Order',
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
