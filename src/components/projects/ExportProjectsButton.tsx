import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Project } from '@/types';
import { PIPELINE_STAGES } from '@/types';
import { projectsService } from '@/services/projects';

const PREVIEW_ROWS = 10;

type Column = { header: string; get: (p: Project) => string };

const stageLabel = (stage?: string) =>
  PIPELINE_STAGES.find((s) => s.value === stage)?.label || stage || '';

const num = (v?: number) => (v === undefined || v === null ? '' : String(v));
const list = (v?: string[], legacy?: string) =>
  v && v.length ? v.join('; ') : legacy || '';
const date = (v?: string) => (v ? String(v).split('T')[0] : '');

const COLUMNS: Column[] = [
  { header: 'Project Name', get: (p) => p.name || '' },
  { header: 'Description', get: (p) => p.description || '' },
  { header: 'Business Vertical', get: (p) => p.businessVertical || '' },
  { header: 'Sector', get: (p) => p.sector || '' },
  { header: 'Business Segment', get: (p) => p.businessSegment || '' },
  { header: 'Status', get: (p) => p.status || '' },
  { header: 'Pipeline Stage', get: (p) => stageLabel(p.pipelineStage) },
  { header: 'Progress (%)', get: (p) => num(p.progress) },
  { header: 'Deal Probability', get: (p) => p.dealProbability || '' },
  { header: 'Client Name', get: (p) => p.clientName || '' },
  { header: 'Client Contact', get: (p) => p.clientContact || '' },
  { header: 'Channel Partner', get: (p) => p.channelPartner || '' },
  { header: 'OEM', get: (p) => p.oem || '' },
  { header: 'Location', get: (p) => p.location || '' },
  { header: 'Products', get: (p) => list(p.products, p.product) },
  { header: 'Sub-products', get: (p) => list(p.subproducts, p.subProduct) },
  { header: 'Sales Lead', get: (p) => p.salesLead || '' },
  { header: 'Contract Value (NGN)', get: (p) => num(p.contractValueNGN) },
  { header: 'Contract Value (USD)', get: (p) => num(p.contractValueUSD) },
  { header: 'Margin % (NGN)', get: (p) => num(p.marginPercentNGN) },
  { header: 'Margin % (USD)', get: (p) => num(p.marginPercentUSD) },
  { header: 'Margin Value (NGN)', get: (p) => num(p.marginValueNGN) },
  { header: 'Margin Value (USD)', get: (p) => num(p.marginValueUSD) },
  { header: 'Team Size', get: (p) => num(p.teamSize) },
  { header: 'Tasks Total', get: (p) => num(p.tasksCount ?? p.tasks?.length) },
  { header: 'Tasks Completed', get: (p) => num(p.completedTasksCount) },
  { header: 'Pipeline Intake Date', get: (p) => date(p.pipelineIntakeDate) },
  { header: 'Start Date', get: (p) => date(p.startDate) },
  { header: 'End Date', get: (p) => date(p.endDate) },
  { header: 'Expected Close Date', get: (p) => date(p.expectedCloseDate) },
  { header: 'Project Lead Comments', get: (p) => p.projectLeadComments || '' },
  { header: 'Support Needed', get: (p) => p.supportNeeded || '' },
];

const escapeCell = (value: string) => {
  const clean = value.replace(/\r?\n/g, ' ').trim();
  return /[",;]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
};

function buildCsv(projects: Project[]) {
  const rows = [
    COLUMNS.map((c) => escapeCell(c.header)).join(','),
    ...projects.map((p) => COLUMNS.map((c) => escapeCell(c.get(p))).join(',')),
  ];
  // BOM so Excel reads UTF-8 (₦, accents) correctly
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

interface ExportProjectsButtonProps {
  /** In-memory rows (e.g. metric drill already loaded the full set). */
  projects?: Project[];
  /**
   * When set, fetch the full filtered dataset from the API on open
   * (pagination does not limit the export).
   */
  fetchParams?: Record<string, unknown>;
  /** Optional count hint shown while the full set is loading. */
  totalHint?: number;
}

export function ExportProjectsButton({
  projects: pageProjects = [],
  fetchParams,
  totalHint,
}: ExportProjectsButtonProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exportProjects, setExportProjects] = useState<Project[]>(pageProjects);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      if (!fetchParams) {
        setExportProjects(pageProjects);
        return;
      }
      setIsLoading(true);
      try {
        const rows = await projectsService.getAllMatching(fetchParams);
        if (!cancelled) setExportProjects(rows);
      } catch (error) {
        console.error('Failed to load projects for export:', error);
        if (!cancelled) {
          toast.error('Could not load the full project list for export');
          setExportProjects(pageProjects);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, fetchParams, pageProjects]);

  const previewRows = useMemo(
    () => exportProjects.slice(0, PREVIEW_ROWS),
    [exportProjects]
  );

  const canOpen = (totalHint ?? pageProjects.length) > 0 || pageProjects.length > 0;

  const handleDownload = () => {
    setIsExporting(true);
    try {
      const blob = new Blob([buildCsv(exportProjects)], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = window.URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];

      const link = document.createElement('a');
      link.href = url;
      link.download = `BD_Portal_Projects_${today}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${exportProjects.length} projects to CSV`);
      setOpen(false);
    } catch (error) {
      console.error('Failed to export projects:', error);
      toast.error(
        `Could not build the CSV file: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={!canOpen}
      >
        <Download className="w-4 h-4 mr-2" />
        Export All
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Export all matching projects</DialogTitle>
            <DialogDescription>
              {isLoading
                ? `Loading full dataset${totalHint ? ` (~${totalHint} projects)` : ''}…`
                : `${exportProjects.length} project${exportProjects.length === 1 ? '' : 's'} · ${COLUMNS.length} columns across the current view (all pages). Showing the first ${previewRows.length} row${previewRows.length === 1 ? '' : 's'} of the file.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded-md border relative min-h-[160px]">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching all matching projects…
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((c) => (
                      <TableHead key={c.header} className="whitespace-nowrap text-xs">
                        {c.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((p) => (
                    <TableRow key={p.id}>
                      {COLUMNS.map((c) => (
                        <TableCell
                          key={c.header}
                          className="text-xs max-w-[220px] truncate"
                          title={c.get(p)}
                        >
                          {c.get(p) || '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isExporting || isLoading || exportProjects.length === 0}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isExporting
                ? 'Preparing...'
                : `Download CSV (${exportProjects.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
