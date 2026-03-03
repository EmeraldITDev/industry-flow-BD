/**
 * Maps Excel/CSV column headers to our Project model fields.
 * Uses fuzzy matching so users don't need exact header names.
 */

import { PipelineStage, Sector, BusinessSegment, RiskLevel } from '@/types';

export interface ColumnMapping {
  excelHeader: string;
  projectField: string | null;
  label: string;
}

// Canonical project fields the system knows about
export const PROJECT_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: 'name', label: 'Project Name', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'sector', label: 'Sector', required: true },
  { key: 'status', label: 'Status', required: false },
  { key: 'pipelineStage', label: 'Pipeline Stage', required: false },
  { key: 'clientName', label: 'Client Name', required: false },
  { key: 'clientContact', label: 'Client Contact', required: false },
  { key: 'oem', label: 'OEM', required: false },
  { key: 'location', label: 'Location', required: false },
  { key: 'product', label: 'Product', required: false },
  { key: 'subProduct', label: 'Sub Product', required: false },
  { key: 'businessSegment', label: 'Business Segment', required: false },
  { key: 'channelPartner', label: 'Channel Partner', required: false },
  { key: 'projectLead', label: 'Project Lead', required: false },
  { key: 'startDate', label: 'Start Date', required: false },
  { key: 'endDate', label: 'End Date', required: false },
  { key: 'expectedCloseDate', label: 'Expected Close Date', required: false },
  { key: 'pipelineIntakeDate', label: 'Pipeline Intake Date', required: false },
  { key: 'contractValueNGN', label: 'Contract Value (NGN)', required: false },
  { key: 'contractValueUSD', label: 'Contract Value (USD)', required: false },
  { key: 'marginPercentNGN', label: 'Margin % (NGN)', required: false },
  { key: 'marginPercentUSD', label: 'Margin % (USD)', required: false },
  { key: 'marginValueNGN', label: 'Margin Value (NGN)', required: false },
  { key: 'marginValueUSD', label: 'Margin Value (USD)', required: false },
  { key: 'dealProbability', label: 'Deal Probability', required: false },
  { key: 'projectLeadComments', label: 'Project Lead Comments', required: false },
];

// Known header keywords used to detect the real header row
const HEADER_KEYWORDS = ['project name', 'name', 'sector', 'pipeline stage', 'stage', 'client', 'description', 'product', 'oem', 'location', 'contract', 'margin'];

/**
 * Detect the actual header row index by scoring each row against known keywords.
 * Skips title/banner rows that often appear at the top of corporate spreadsheets.
 */
export function detectHeaderRow(rows: any[][]): number {
  let bestIdx = 0;
  let bestScore = 0;
  const limit = Math.min(rows.length, 10); // only check first 10 rows
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const score = row.reduce((acc: number, cell: any) => {
      const val = String(cell ?? '').toLowerCase().trim();
      return acc + (HEADER_KEYWORDS.some((kw) => val.includes(kw)) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// Pattern map: lowercased substrings/patterns → field key
const HEADER_PATTERNS: [RegExp, string][] = [
  [/project\s*name|^name$/i, 'name'],
  [/descri/i, 'description'],
  [/^sector$/i, 'sector'],
  [/^status$/i, 'status'],
  [/pipeline\s*stage|^stage$/i, 'pipelineStage'],
  [/^client$|client\s*name|customer\s*name|end\s*user/i, 'clientName'],
  [/client\s*contact|customer\s*contact/i, 'clientContact'],
  [/^oem$/i, 'oem'],
  [/location|city|country/i, 'location'],
  [/^product$|product\s*category/i, 'product'],
  [/sub\s*product/i, 'subProduct'],
  [/business\s*segment|^segment$/i, 'businessSegment'],
  [/channel\s*partner|partner/i, 'channelPartner'],
  [/project\s*lead|sales\s*lead|lead/i, 'projectLead'],
  [/start\s*date/i, 'startDate'],
  [/end\s*date/i, 'endDate'],
  [/expected\s*close|close\s*date/i, 'expectedCloseDate'],
  [/intake\s*date|pipeline\s*intake/i, 'pipelineIntakeDate'],
  // Financial columns — flexible matching for ₦/NGN/Naira and $/USD/Dollar
  [/contract.*value.*(\u20a6|ngn|naira|\(.*\u20a6)/i, 'contractValueNGN'],
  [/contract.*value.*(\$|usd|dollar|\(.*\$)/i, 'contractValueUSD'],
  [/(po|contract).*value.*(\u20a6|ngn|naira|\(.*\u20a6)/i, 'contractValueNGN'],
  [/(po|contract).*value.*(\$|usd|dollar|\(.*\$)/i, 'contractValueUSD'],
  [/margin\s*%.*(\u20a6|ngn|\(.*\u20a6)/i, 'marginPercentNGN'],
  [/margin\s*%.*(\$|usd|\(.*\$)/i, 'marginPercentUSD'],
  [/margin.*(commi|value).*(\u20a6|ngn|\(.*\u20a6)/i, 'marginValueNGN'],
  [/margin.*(commi|value).*(\$|usd|\(.*\$)/i, 'marginValueUSD'],
  [/prob\s*%|deal\s*prob|probability/i, 'dealProbability'],
  [/next\s*action/i, '__nextAction'],
  [/status\s*[\/\\&]\s*comment|status\s*comment/i, '__statusComments'],
  [/comment|remark|note/i, 'projectLeadComments'],
];

export function autoMapColumns(headers: string[]): ColumnMapping[] {
  const usedFields = new Set<string>();

  return headers.map((header) => {
    const trimmed = header.trim();
    for (const [pattern, field] of HEADER_PATTERNS) {
      if (pattern.test(trimmed) && !usedFields.has(field)) {
        usedFields.add(field);
        const meta = PROJECT_FIELDS.find((f) => f.key === field);
        return { excelHeader: trimmed, projectField: field, label: meta?.label ?? field };
      }
    }
    return { excelHeader: trimmed, projectField: null, label: 'Unmapped' };
  });
}

// ---- Value normalization ----

/**
 * Parse a number that may contain currency symbols, thousand separators, or locale-specific formats.
 * Handles: $1,234.56  |  ₦1,500,000  |  1.234,56 (European)  |  89%  |  plain numbers
 */
function parseLocalizedNumber(raw: any): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let cleaned = String(raw).trim();
  if (cleaned === '') return null;

  // Accounting negatives: (1,234.56)
  const isNegativeByParens = /^\(.*\)$/.test(cleaned);
  cleaned = cleaned.replace(/[()]/g, '');

  // Remove currency words/symbols and spacing
  cleaned = cleaned
    .replace(/(?:\bngn\b|\busd\b|\bnaira\b|\bdollar(?:s)?\b|\u20A6|\$|€|£|¥)/gi, '')
    .replace(/[\u00A0\s]/g, '')
    .replace(/%$/, '')
    // Keep only number-related characters after stripping labels
    .replace(/[^\d.,-]/g, '');

  if (cleaned === '' || cleaned === '-') return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) {
    const n = parseFloat(cleaned);
    if (isNaN(n)) return null;
    return isNegativeByParens ? -Math.abs(n) : n;
  }

  if (lastComma > lastDot) {
    // European: 1.234,56 → comma is decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US/UK: 1,234.56 → dot is decimal
    cleaned = cleaned.replace(/,/g, '');
  }

  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return isNegativeByParens ? -Math.abs(n) : n;
}

const VALID_SECTORS: Sector[] = ['EMR_OGP', 'EMR_MFG', 'EMR_Services', 'BEDS_Services', 'EMR_Healthcare', 'EMR_Renewables', 'EMR_Trading'];
const VALID_STAGES: PipelineStage[] = ['cold', 'initiation', 'qualification', 'proposal', 'negotiation', 'approval', 'execution', 'closure', 'lost'];
const VALID_STATUSES = ['active', 'on-hold', 'completed'] as const;
const VALID_PROBABILITIES: RiskLevel[] = ['low', 'medium', 'high', 'critical', 'uncertain'];

export interface ValidationIssue {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function normalizeValue(field: string, raw: any): { value: any; issue?: string } {
  if (raw == null || raw === '') return { value: undefined };

  const str = String(raw).trim();

  // Dates
  if (['startDate', 'endDate', 'expectedCloseDate', 'pipelineIntakeDate'].includes(field)) {
    const d = new Date(str);
    if (isNaN(d.getTime())) {
      const parts = str.split(/[\/\-\.]/);
      if (parts.length === 3) {
        const attempt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(attempt.getTime())) return { value: attempt.toISOString() };
      }
      return { value: undefined, issue: `Invalid date: "${str}"` };
    }
    return { value: d.toISOString() };
  }

  // Numbers — use locale-aware parser
  if (['contractValueNGN', 'contractValueUSD', 'marginPercentNGN', 'marginPercentUSD', 'marginValueNGN', 'marginValueUSD'].includes(field)) {
    const num = parseLocalizedNumber(raw);
    if (num === null) return { value: undefined, issue: `Invalid number: "${str}"` };
    return { value: num };
  }

  // Enums
  if (field === 'sector') {
    const match = VALID_SECTORS.find((s) => s.toLowerCase() === str.toLowerCase());
    if (match) return { value: match };
    // Partial match
    const partial = VALID_SECTORS.find((s) => s.toLowerCase().includes(str.toLowerCase()) || str.toLowerCase().includes(s.toLowerCase()));
    if (partial) return { value: partial, issue: `Interpreted "${str}" as "${partial}"` };
    return { value: str, issue: `Unknown sector: "${str}"` };
  }

  if (field === 'pipelineStage') {
    const lower = str.toLowerCase();
    // Map common aliases
    if (lower === 'won') return { value: 'closure' };
    if (lower === 'lost' || lower === 'dead') return { value: 'lost' };
    const match = VALID_STAGES.find((s) => s.toLowerCase() === lower);
    if (match) return { value: match };
    // Partial match
    const partial = VALID_STAGES.find((s) => lower.includes(s.toLowerCase()));
    if (partial) return { value: partial, issue: `Interpreted "${str}" as "${partial}"` };
    return { value: 'cold', issue: `Unknown stage: "${str}", defaulting to "Cold"` };
  }

  if (field === 'status') {
    const lower = str.toLowerCase();
    const match = VALID_STATUSES.find((s) => s === lower);
    if (match) return { value: match };
    if (lower.includes('hold')) return { value: 'on-hold' };
    if (lower.includes('complet') || lower.includes('done')) return { value: 'completed' };
    return { value: 'active', issue: `Unknown status: "${str}", defaulting to "active"` };
  }

  if (field === 'dealProbability') {
    const lower = str.toLowerCase();
    const match = VALID_PROBABILITIES.find((p) => p === lower);
    if (match) return { value: match };
    return { value: 'low', issue: `Unknown probability: "${str}", defaulting to "low"` };
  }

  return { value: str };
}

export function validateRows(
  rows: Record<string, any>[],
  mappings: ColumnMapping[]
): { validated: Record<string, any>[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const seenNames = new Set<string>();

  const validated = rows.map((row, idx) => {
    const result: Record<string, any> = {};

    for (const mapping of mappings) {
      if (!mapping.projectField) continue;
      const rawValue = row[mapping.excelHeader];
      const { value, issue } = normalizeValue(mapping.projectField, rawValue);
      if (value !== undefined) result[mapping.projectField] = value;
      if (issue) {
        issues.push({ row: idx + 1, field: mapping.projectField, message: issue, severity: 'warning' });
      }
    }

    // Merge __nextAction and __statusComments into projectLeadComments
    const parts: string[] = [];
    if (result['__nextAction']) parts.push(String(result['__nextAction']));
    if (result['__statusComments']) parts.push(String(result['__statusComments']));
    if (parts.length > 0) {
      const existing = result.projectLeadComments ? String(result.projectLeadComments) + ' ' : '';
      result.projectLeadComments = existing + parts.join(' ');
    }
    delete result['__nextAction'];
    delete result['__statusComments'];

    // Required field checks
    if (!result.name) {
      issues.push({ row: idx + 1, field: 'name', message: 'Project name is required', severity: 'error' });
    }
    if (!result.sector) {
      issues.push({ row: idx + 1, field: 'sector', message: 'Sector is required', severity: 'error' });
    }

    // Duplicate check
    if (result.name) {
      const lower = String(result.name).toLowerCase();
      if (seenNames.has(lower)) {
        issues.push({ row: idx + 1, field: 'name', message: `Duplicate project name: "${result.name}"`, severity: 'warning' });
      }
      seenNames.add(lower);
    }

    // Defaults
    if (!result.status) result.status = 'active';
    if (!result.pipelineStage) result.pipelineStage = 'cold';
    if (!result.startDate) result.startDate = new Date().toISOString();
    if (!result.description) result.description = result.name ? `Project: ${result.name}` : 'Imported project';

    return result;
  });

  return { validated, issues };
}
