import { useMemo, useState } from 'react';
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
  projects: Project[];
}

export function ExportProjectsButton({ projects }: ExportProjectsButtonProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const previewRows = useMemo(() => projects.slice(0, PREVIEW_ROWS), [projects]);

  const handleDownload = () => {
    setIsExporting(true);
    try {
      const blob = new Blob([buildCsv(projects)], { type: 'text/csv;charset=utf-8;' });
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

      toast.success(`Exported ${projects.length} projects to CSV`);
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
        disabled={projects.length === 0}
      >
        <Download className="w-4 h-4 mr-2" />
        Export to CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Export preview</DialogTitle>
            <DialogDescription>
              {projects.length} project{projects.length === 1 ? '' : 's'} · {COLUMNS.length} columns.
              Showing the first {previewRows.length} row{previewRows.length === 1 ? '' : 's'} of the file.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded-md border">
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
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isExporting ? 'Preparing...' : 'Download CSV'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
