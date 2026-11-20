import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PARTNER_REPORT_COLUMN_KEYS,
  FULL_PARTNER_REPORT_COLUMN_KEYS,
  PARTNER_REPORT_COLUMNS,
  type PartnerReportColumn,
  generatePartnersReport,
  primaryPartnerContact,
} from '@/lib/reportGenerator';
import { partnersService } from '@/services/partners';
import type { Partner, PartnerFilters } from '@/types/partners';

/** Rows mounted at once in the preview table; the rest stay selected but hidden. */
const MAX_PREVIEW_ROWS = 200;

interface PartnerReportButtonProps {
  /** Rows on the current page — used as a fallback if the full fetch fails. */
  partners?: Partner[];
  /** Current page filters (without page/per_page); the full matching set is fetched on open. */
  filters: PartnerFilters;
  /** Human-readable filter description printed in the PDF header. */
  filterSummary: string;
  totalHint?: number;
  defaultTitle?: string;
  canViewFinancialFields: boolean;
  /** When set (e.g. from page Select mode), only these partners start included. */
  preselectedPartnerIds?: Iterable<string>;
}

function buildInitialExcludedIds(
  partners: Partner[],
  preselectedPartnerIds?: Iterable<string>
): Set<string> {
  if (!preselectedPartnerIds) return new Set();
  const selected = new Set(preselectedPartnerIds);
  if (selected.size === 0) return new Set();
  return new Set(partners.filter((p) => !selected.has(p.id)).map((p) => p.id));
}

const escapeCsvCell = (value: string) => {
  const clean = value.replace(/\r?\n/g, ' ').trim();
  return /[",;]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
};

const csvValue = (column: PartnerReportColumn, partner: Partner) => {
  if (column.csv) return column.csv(partner);
  const value = column.get(partner);
  return value === '—' ? '' : value;
};

function buildCsv(partners: Partner[], columns: PartnerReportColumn[]) {
  const rows = [
    columns.map((c) => escapeCsvCell(c.label)).join(','),
    ...partners.map((p) => columns.map((c) => escapeCsvCell(csvValue(c, p))).join(',')),
  ];
  // BOM so Excel reads UTF-8 (₦, accents) correctly
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

export function PartnerReportButton({
  partners: pagePartners = [],
  filters,
  filterSummary,
  totalHint,
  defaultTitle = 'Partners Report',
  canViewFinancialFields,
  preselectedPartnerIds,
}: PartnerReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>(pagePartners);
  const [title, setTitle] = useState(defaultTitle);
  const [columnKeys, setColumnKeys] = useState<string[]>(DEFAULT_PARTNER_REPORT_COLUMN_KEYS);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [rowQuery, setRowQuery] = useState('');

  const availableColumns = useMemo(
    () => PARTNER_REPORT_COLUMNS.filter((c) => canViewFinancialFields || !c.financial),
    [canViewFinancialFields]
  );

  const gridSelectionCount = useMemo(() => {
    if (!preselectedPartnerIds) return 0;
    return new Set(preselectedPartnerIds).size;
  }, [preselectedPartnerIds]);
  const seededFromGrid = gridSelectionCount > 0;

  // Load the full filtered set (all pages) when the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setTitle(defaultTitle);
      setRowQuery('');
      setIsLoading(true);
      try {
        const rows = await partnersService.getAll(filters);
        if (cancelled) return;
        setPartners(rows);
        setExcludedIds(buildInitialExcludedIds(rows, preselectedPartnerIds));
      } catch (error) {
        console.error('Failed to load partners for report:', error);
        if (!cancelled) {
          toast.error('Could not load the full partner list — showing this page only');
          setPartners(pagePartners);
          setExcludedIds(buildInitialExcludedIds(pagePartners, preselectedPartnerIds));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // pagePartners / preselection are read only as the open-time snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTitle, filters]);

  const columnSet = useMemo(() => new Set(columnKeys), [columnKeys]);
  const selectedColumns = useMemo(
    () => availableColumns.filter((c) => columnSet.has(c.key)),
    [availableColumns, columnSet]
  );

  const selectedPartners = useMemo(
    () => partners.filter((p) => !excludedIds.has(p.id)),
    [partners, excludedIds]
  );

  const matchingPartners = useMemo(() => {
    const q = rowQuery.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => {
      const primary = primaryPartnerContact(p);
      return [
        p.companyName,
        primary?.name ?? p.contactPerson,
        primary?.email ?? p.email,
        p.location,
        p.relationshipStage,
        (p.verticals ?? []).join(' '),
      ].some((field) => field?.toLowerCase().includes(q));
    });
  }, [partners, rowQuery]);

  const visibleRows = useMemo(
    () => matchingPartners.slice(0, MAX_PREVIEW_ROWS),
    [matchingPartners]
  );
  const hiddenRowCount = matchingPartners.length - visibleRows.length;

  const allMatchingSelected =
    matchingPartners.length > 0 && matchingPartners.every((p) => !excludedIds.has(p.id));

  const toggleColumn = (key: string) => {
    setColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleRow = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllMatchingRows = () => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      for (const p of matchingPartners) {
        if (allMatchingSelected) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  };

  const reportTitle = title.trim() || defaultTitle;
  const countLabel = `${selectedPartners.length} partner${selectedPartners.length === 1 ? '' : 's'}`;

  const handleGeneratePdf = () => {
    setIsGenerating(true);
    try {
      generatePartnersReport(
        selectedPartners,
        filterSummary,
        reportTitle,
        selectedColumns.map((c) => c.key),
        canViewFinancialFields
      );
      toast.success(`PDF report generated · ${countLabel}`);
      setOpen(false);
    } catch (error) {
      console.error('Failed to generate partner report:', error);
      toast.error(
        `Could not build the PDF: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCsv = () => {
    try {
      const blob = new Blob([buildCsv(selectedPartners, selectedColumns)], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = window.URL.createObjectURL(blob);
      const safeName = reportTitle.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
      const today = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-${today}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${countLabel} to CSV`);
      setOpen(false);
    } catch (error) {
      console.error('Failed to export partners:', error);
      toast.error(
        `Could not build the CSV file: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  };

  const canExport = selectedPartners.length > 0 && selectedColumns.length > 0 && !isLoading;
  const canOpen = (totalHint ?? pagePartners.length) > 0 || pagePartners.length > 0;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={!canOpen}>
        <Download className="mr-2 h-4 w-4" />
        Export report
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Partner report preview</DialogTitle>
            <DialogDescription>
              {isLoading
                ? `Loading full dataset${totalHint ? ` (~${totalHint} partners)` : ''}…`
                : seededFromGrid
                  ? `Full filtered set loaded (${partners.length}). Starting with ${gridSelectionCount} partner${gridSelectionCount === 1 ? '' : 's'} selected on the page — adjust rows and columns below.`
                  : `All ${partners.length} partner${partners.length === 1 ? '' : 's'} matching the current view (every page). Choose columns and rows, then download a CSV or generate a PDF.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] flex-1 min-h-0">
            <div className="flex flex-col gap-3 min-h-0">
              <div className="space-y-1.5">
                <Label htmlFor="partner-report-title">Report title</Label>
                <Input
                  id="partner-report-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={defaultTitle}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Columns ({selectedColumns.length})</Label>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setColumnKeys(DEFAULT_PARTNER_REPORT_COLUMN_KEYS)}
                    disabled={isLoading}
                  >
                    Default
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setColumnKeys(FULL_PARTNER_REPORT_COLUMN_KEYS)}
                    disabled={isLoading}
                  >
                    Full
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setColumnKeys(availableColumns.map((c) => c.key))}
                    disabled={isLoading}
                  >
                    All
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto rounded-md border p-1">
                {availableColumns.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={columnSet.has(column.key)}
                      onCheckedChange={() => toggleColumn(column.key)}
                      disabled={isLoading}
                    />
                    <span className="truncate">{column.label}</span>
                  </label>
                ))}
              </div>

              {selectedColumns.length > 12 && (
                <p className="text-xs text-muted-foreground">
                  In the PDF, {selectedColumns.length} columns print as separate sections
                  (Overview, Contacts, Products &amp; opportunities, Activity &amp; notes) so
                  every field stays readable. The CSV keeps them in one sheet.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 min-h-0 relative">
              {isLoading ? (
                <div className="flex-1 min-h-[200px] flex items-center justify-center gap-2 text-sm text-muted-foreground rounded-md border">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching all matching partners…
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={rowQuery}
                        onChange={(e) => setRowQuery(e.target.value)}
                        placeholder="Search partners to include..."
                        className="pl-8"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAllMatchingRows}
                      disabled={matchingPartners.length === 0}
                    >
                      {allMatchingSelected ? 'Deselect' : 'Select'}
                      {rowQuery.trim() ? ' matching' : ' all'}
                    </Button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-background">
                        <TableRow>
                          <TableHead className="w-10">
                            <span className="sr-only">Include</span>
                          </TableHead>
                          {selectedColumns.map((c) => (
                            <TableHead key={c.key} className="whitespace-nowrap text-xs">
                              {c.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleRows.map((partner) => {
                          const included = !excludedIds.has(partner.id);
                          return (
                            <TableRow
                              key={partner.id}
                              data-state={included ? undefined : 'excluded'}
                              className={cn(!included && 'opacity-40')}
                            >
                              <TableCell className="w-10">
                                <Checkbox
                                  checked={included}
                                  onCheckedChange={() => toggleRow(partner.id)}
                                  aria-label={`Include ${partner.companyName}`}
                                />
                              </TableCell>
                              {selectedColumns.map((c) => {
                                const value = c.get(partner);
                                return (
                                  <TableCell
                                    key={c.key}
                                    className="text-xs max-w-[240px] truncate"
                                    title={value}
                                  >
                                    {value}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                        {visibleRows.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={selectedColumns.length + 1}
                              className="h-24 text-center text-sm text-muted-foreground"
                            >
                              {rowQuery.trim()
                                ? `No partners match “${rowQuery}”.`
                                : 'No partners match the current filters.'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {hiddenRowCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Showing the first {visibleRows.length} of {matchingPartners.length} matches —
                      refine your search to review the rest. Rows outside this list keep their
                      current selection.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <p className="text-sm text-muted-foreground self-center">
              {isLoading
                ? 'Loading…'
                : `${selectedPartners.length} of ${partners.length} partner${partners.length === 1 ? '' : 's'} · ${selectedColumns.length} column${selectedColumns.length === 1 ? '' : 's'}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleDownloadCsv} disabled={!canExport}>
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
              <Button onClick={handleGeneratePdf} disabled={!canExport || isGenerating}>
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'Generate PDF'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
