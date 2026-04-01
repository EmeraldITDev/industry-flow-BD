import { useRef, useState, ReactNode } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { exportElementToPdf, exportElementToPng } from '@/lib/dashboardExport';
import { withExportFullNumbers, useDashboardExport } from '@/context/DashboardExportContext';
import { toast } from 'sonner';

interface DashboardVisualExportProps {
  children: ReactNode;
  /** Filename without extension */
  filename: string;
  className?: string;
  /** Extra classes on the capture root (white box for export) */
  contentClassName?: string;
}

export function DashboardVisualExport({
  children,
  filename,
  className,
  contentClassName,
}: DashboardVisualExportProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { setExportFullNumbers } = useDashboardExport();
  const [busy, setBusy] = useState(false);

  const run = async (kind: 'png' | 'pdf') => {
    const el = ref.current;
    if (!el) return;
    setBusy(true);
    try {
      await withExportFullNumbers(setExportFullNumbers, async () => {
        if (kind === 'png') await exportElementToPng(el, filename);
        else await exportElementToPdf(el, filename);
      });
      toast.success(kind === 'png' ? 'PNG downloaded' : 'PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Export failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="absolute right-2 top-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 shrink-0 bg-background/95 shadow-sm border border-border"
              disabled={busy}
              title="Download visual"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => run('png')}>Download PNG</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run('pdf')}>Download PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        ref={ref}
        data-dashboard-export-root
        className={cn('bg-card border border-border rounded-xl overflow-visible', contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
