import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Search } from 'lucide-react';
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
  DEFAULT_PROJECT_REPORT_COLUMN_KEYS,
  FULL_PROJECT_REPORT_COLUMN_KEYS,
  PROJECT_REPORT_COLUMNS,
  ProjectFilterSummary,
  generateProjectsReport,
} from '@/lib/reportGenerator';
import { projectsService } from '@/services/projects';
import type { Project } from '@/types';

/** Rows mounted at once in the preview table; the rest stay selected but hidden. */
const MAX_PREVIEW_ROWS = 200;

interface GenerateReportButtonProps {
  /** In-memory rows (e.g. metric drill already loaded the full set). */
  projects?: Project[];
  /**
   * When set, fetch the full filtered dataset from the API on open
   * (pagination does not limit the report).
   */
  fetchParams?: Record<string, unknown>;
  /** Optional count hint shown while the full set is loading. */
  totalHint?: number;
  filters: ProjectFilterSummary;
  defaultTitle: string;
  /** When set (e.g. from page Select mode), only these projects start included. */
  preselectedProjectIds?: Iterable<string>;
}

function buildInitialExcludedIds(
  projects: Project[],
  preselectedProjectIds?: Iterable<string>
): Set<string> {
  if (!preselectedProjectIds) return new Set();

  const selected = new Set(preselectedProjectIds);
  if (selected.size === 0) return new Set();

  return new Set(projects.filter((p) => !selected.has(p.id)).map((p) => p.id));
}

export function GenerateReportButton({
  projects: pageProjects = [],
  fetchParams,
  totalHint,
  filters,
  defaultTitle,
  preselectedProjectIds,
}: GenerateReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>(pageProjects);
  const [title, setTitle] = useState(defaultTitle);
  const [columnKeys, setColumnKeys] = useState<string[]>(DEFAULT_PROJECT_REPORT_COLUMN_KEYS);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [rowQuery, setRowQuery] = useState('');

  const gridSelectionCount = useMemo(() => {
    if (!preselectedProjectIds) return 0;
    return new Set(preselectedProjectIds).size;
  }, [preselectedProjectIds]);

  const seededFromGrid = gridSelectionCount > 0;

  // Load the full filtered set (all pages) when the dialog opens.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setTitle(defaultTitle);
      setRowQuery('');

      if (!fetchParams) {
        setProjects(pageProjects);
        setExcludedIds(buildInitialExcludedIds(pageProjects, preselectedProjectIds));
        return;
      }

      setIsLoading(true);
      try {
        const rows = await projectsService.getAllMatching({
          ...fetchParams,
          // Full fields — lean payloads historically omitted description.
          lean: 0,
        });
        if (cancelled) return;
        setProjects(rows);
        setExcludedIds(buildInitialExcludedIds(rows, preselectedProjectIds));
      } catch (error) {
        console.error('Failed to load projects for report:', error);
        if (!cancelled) {
          toast.error('Could not load the full project list for the report');
          setProjects(pageProjects);
          setExcludedIds(buildInitialExcludedIds(pageProjects, preselectedProjectIds));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, defaultTitle, fetchParams, pageProjects, preselectedProjectIds]);

  const columnSet = useMemo(() => new Set(columnKeys), [columnKeys]);
  const selectedColumns = useMemo(
    () => PROJECT_REPORT_COLUMNS.filter((c) => columnSet.has(c.key)),
    [columnSet]
  );

  const selectedProjects = useMemo(
    () => projects.filter((p) => !excludedIds.has(p.id)),
    [projects, excludedIds]
  );

  const matchingProjects = useMemo(() => {
    const q = rowQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.clientName, p.channelPartner, p.location, p.oem]
        .some((field) => field?.toLowerCase().includes(q))
    );
  }, [projects, rowQuery]);

  const visibleRows = useMemo(
    () => matchingProjects.slice(0, MAX_PREVIEW_ROWS),
    [matchingProjects]
  );
  const hiddenRowCount = matchingProjects.length - visibleRows.length;

  const allMatchingSelected =
    matchingProjects.length > 0 && matchingProjects.every((p) => !excludedIds.has(p.id));

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
      for (const p of matchingProjects) {
        if (allMatchingSelected) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      generateProjectsReport(
        selectedProjects,
        filters,
        title.trim() || defaultTitle,
        // Emit in registry order so the PDF layout stays predictable
        selectedColumns.map((c) => c.key)
      );
      toast.success(
        `PDF report generated · ${selectedProjects.length} project${selectedProjects.length === 1 ? '' : 's'}`
      );
      setOpen(false);
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error(
        `Could not build the PDF: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = selectedProjects.length > 0 && selectedColumns.length > 0 && !isLoading;
  const canOpen = (totalHint ?? pageProjects.length) > 0 || pageProjects.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={!canOpen}
      >
        <FileText className="w-4 h-4 mr-2" />
        Generate Full Report
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Full report preview</DialogTitle>
            <DialogDescription>
              {isLoading
                ? `Loading full dataset${totalHint ? ` (~${totalHint} projects)` : ''}…`
                : seededFromGrid
                  ? `Full filtered set loaded (${projects.length}). Starting with ${gridSelectionCount} project${gridSelectionCount === 1 ? '' : 's'} selected on the page — adjust rows and columns below.`
                  : `All ${projects.length} project${projects.length === 1 ? '' : 's'} matching the current view (every page). Choose columns and rows, then generate the PDF.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] flex-1 min-h-0">
            <div className="flex flex-col gap-3 min-h-0">
              <div className="space-y-1.5">
                <Label htmlFor="report-title">Report title</Label>
                <Input
                  id="report-title"
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
                    onClick={() => setColumnKeys(DEFAULT_PROJECT_REPORT_COLUMN_KEYS)}
                    disabled={isLoading}
                  >
                    Default
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setColumnKeys(FULL_PROJECT_REPORT_COLUMN_KEYS)}
                    disabled={isLoading}
                  >
                    Full
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setColumnKeys(PROJECT_REPORT_COLUMNS.map((c) => c.key))}
                    disabled={isLoading}
                  >
                    All
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto rounded-md border p-1">
                {PROJECT_REPORT_COLUMNS.map((column) => (
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
                  {selectedColumns.length} columns will print as separate sections (Overview,
                  Commercial, Delivery, Dates) so description and other fields stay readable.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 min-h-0 relative">
              {isLoading ? (
                <div className="flex-1 min-h-[200px] flex items-center justify-center gap-2 text-sm text-muted-foreground rounded-md border">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching all matching projects…
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={rowQuery}
                        onChange={(e) => setRowQuery(e.target.value)}
                        placeholder="Search projects to include..."
                        className="pl-8"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAllMatchingRows}
                      disabled={matchingProjects.length === 0}
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
                        {visibleRows.map((project) => {
                          const included = !excludedIds.has(project.id);
                          return (
                            <TableRow
                              key={project.id}
                              data-state={included ? undefined : 'excluded'}
                              className={cn(!included && 'opacity-40')}
                            >
                              <TableCell className="w-10">
                                <Checkbox
                                  checked={included}
                                  onCheckedChange={() => toggleRow(project.id)}
                                  aria-label={`Include ${project.name}`}
                                />
                              </TableCell>
                              {selectedColumns.map((c) => (
                                <TableCell
                                  key={c.key}
                                  className="text-xs max-w-[220px] truncate"
                                  title={c.get(project)}
                                >
                                  {c.get(project)}
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                        {visibleRows.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={selectedColumns.length + 1}
                              className="h-24 text-center text-sm text-muted-foreground"
                            >
                              No projects match “{rowQuery}”.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {hiddenRowCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Showing the first {visibleRows.length} of {matchingProjects.length} matches —
                      refine your search to review the rest. Rows outside this list keep their current
                      selection.
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
                : `${selectedProjects.length} of ${projects.length} project${projects.length === 1 ? '' : 's'} · ${selectedColumns.length} column${selectedColumns.length === 1 ? '' : 's'}`}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
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
