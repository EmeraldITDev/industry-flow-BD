import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectsService, CreateProjectData } from '@/services/projects';
import {
  autoMapColumns,
  ColumnMapping,
  PROJECT_FIELDS,
  validateRows,
  ValidationIssue,
  detectHeaderRow,
} from '@/lib/excelColumnMap';

type Step = 'upload' | 'mapping' | 'preview';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Validation
  const { validated, issues } = useMemo(() => {
    if (rawRows.length === 0 || mappings.length === 0) return { validated: [], issues: [] };
    return validateRows(rawRows, mappings);
  }, [rawRows, mappings]);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const validRowCount = validated.filter((_, idx) => !issues.some((i) => i.row === idx + 1 && i.severity === 'error')).length;

  // ---- File handling ----
  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (json.length < 2) {
          toast.error('File must have a header row and at least one data row');
          return;
        }

        // Detect actual header row (skip title/banner rows)
        const headerIdx = detectHeaderRow(json);
        const hdrs = (json[headerIdx] as string[]).map((h) => String(h).trim()).filter(Boolean);
        const rows = json.slice(headerIdx + 1).filter((r) => r.some((c: any) => c !== '')).map((r) => {
          const obj: Record<string, any> = {};
          hdrs.forEach((h, i) => {
            obj[h] = r[i];
          });
          return obj;
        });

        setHeaders(hdrs);
        setRawRows(rows);
        setMappings(autoMapColumns(hdrs));
        setStep('mapping');
      } catch (err) {
        console.error('Parse error:', err);
        toast.error('Failed to parse file. Ensure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // ---- Mapping change ----
  const updateMapping = (idx: number, field: string | null) => {
    setMappings((prev) => {
      const updated = [...prev];
      const meta = PROJECT_FIELDS.find((f) => f.key === field);
      updated[idx] = { ...updated[idx], projectField: field, label: meta?.label ?? 'Unmapped' };
      return updated;
    });
  };

  // ---- Import ----
  const handleImport = async () => {
    setIsImporting(true);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < validated.length; i++) {
      const row = validated[i];
      // Skip rows with errors
      if (issues.some((issue) => issue.row === i + 1 && issue.severity === 'error')) {
        failed++;
        continue;
      }

      try {
        await projectsService.create(row as CreateProjectData);
        success++;
      } catch (err: any) {
        console.error(`Failed to import row ${i + 1}:`, err);
        failed++;
      }
    }

    setImportResults({ success, failed });
    setIsImporting(false);
    queryClient.invalidateQueries({ queryKey: ['projects'] });

    if (success > 0) {
      toast.success(`${success} project(s) imported successfully${failed > 0 ? `, ${failed} failed` : ''}`);
    } else {
      toast.error('No projects were imported');
    }
  };

  // ---- Reset ----
  const reset = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setMappings([]);
    setImportResults(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  // ---- Issue lookup per row ----
  const getRowIssues = (rowIdx: number) => issues.filter((i) => i.row === rowIdx + 1);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Projects from Excel / CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a file to begin importing projects.'}
            {step === 'mapping' && 'Review how columns map to project fields, then continue to preview.'}
            {step === 'preview' && 'Review the data and fix any issues before importing.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={step === 'upload' ? 'default' : 'secondary'} className="text-xs">1. Upload</Badge>
          <ArrowRight className="w-3 h-3" />
          <Badge variant={step === 'mapping' ? 'default' : 'secondary'} className="text-xs">2. Map Columns</Badge>
          <ArrowRight className="w-3 h-3" />
          <Badge variant={step === 'preview' ? 'default' : 'secondary'} className="text-xs">3. Preview & Import</Badge>
        </div>

        <Separator />

        {/* ---- STEP: Upload ---- */}
        {step === 'upload' && (
          <div
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 transition-colors cursor-pointer ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="font-medium">Drop your Excel or CSV file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-3">Supported: .xlsx, .xls, .csv</p>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* ---- STEP: Mapping ---- */}
        {step === 'mapping' && (
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-1 p-1">
              <p className="text-sm text-muted-foreground mb-3">
                File: <span className="font-medium text-foreground">{fileName}</span> — {rawRows.length} row(s) detected
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Excel Column</TableHead>
                    <TableHead className="w-[10%]">→</TableHead>
                    <TableHead>System Field</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{m.excelHeader}</TableCell>
                      <TableCell>
                        {m.projectField ? (
                          <CheckCircle2 className="w-4 h-4 text-chart-2" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={m.projectField ?? '__unmapped__'}
                          onValueChange={(val) => updateMapping(idx, val === '__unmapped__' ? null : val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unmapped__">— Skip this column —</SelectItem>
                            {PROJECT_FIELDS.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label} {f.required ? '*' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}

        {/* ---- STEP: Preview ---- */}
        {step === 'preview' && !importResults && (
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-3 p-1">
              {/* Summary badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {validRowCount} valid
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" /> {errorCount} error(s)
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge className="gap-1 bg-chart-4/20 text-chart-4 hover:bg-chart-4/30">
                    <AlertTriangle className="w-3 h-3" /> {warningCount} warning(s)
                  </Badge>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Value (NGN)</TableHead>
                    <TableHead className="w-12">Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validated.map((row, idx) => {
                    const rowIssues = getRowIssues(idx);
                    const hasError = rowIssues.some((i) => i.severity === 'error');

                    return (
                      <TableRow key={idx} className={hasError ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {row.name || <span className="text-destructive italic">Missing</span>}
                        </TableCell>
                        <TableCell>
                          {row.sector ? (
                            <Badge variant="outline" className="text-xs">{row.sector}</Badge>
                          ) : (
                            <span className="text-destructive italic text-xs">Missing</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.pipelineStage ?? '—'}</TableCell>
                        <TableCell className="text-xs">{row.status ?? '—'}</TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {row.contractValueNGN ? Number(row.contractValueNGN).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          {rowIssues.length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  {hasError ? (
                                    <XCircle className="w-4 h-4 text-destructive" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-chart-4" />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <ul className="text-xs space-y-1">
                                    {rowIssues.map((issue, i) => (
                                      <li key={i} className={issue.severity === 'error' ? 'text-destructive' : 'text-chart-4'}>
                                        <strong>{issue.field}:</strong> {issue.message}
                                      </li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-chart-2" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}

        {/* ---- Import Results ---- */}
        {importResults && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-chart-2" />
            <div className="text-center">
              <p className="font-semibold text-lg">Import Complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                {importResults.success} project(s) created
                {importResults.failed > 0 && `, ${importResults.failed} failed`}
              </p>
            </div>
            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        )}

        {/* ---- Footer nav ---- */}
        {!importResults && (
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div>
              {step !== 'upload' && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
                  disabled={isImporting}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleClose(false)} disabled={isImporting}>
                Cancel
              </Button>
              {step === 'mapping' && (
                <Button onClick={() => setStep('preview')}>
                  Preview Data <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === 'preview' && (
                <Button onClick={handleImport} disabled={isImporting || validRowCount === 0}>
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...
                    </>
                  ) : (
                    `Import ${validRowCount} Project(s)`
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
