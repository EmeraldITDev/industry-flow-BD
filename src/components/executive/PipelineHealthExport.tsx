import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { fmtPercent } from '@/lib/executive/format';
import emeraldLogo from '@/assets/emerald-logo.png';

/** PDF-safe currency: Helvetica has no ₦ glyph (renders as ¦). */
function pdfMoney(value: number, currency: 'USD' | 'NGN'): string {
  const abs = Math.abs(value || 0);
  const sign = value < 0 ? '-' : '';
  const prefix = currency === 'USD' ? 'USD ' : 'NGN ';
  if (!value) return `${prefix}0`;
  if (abs >= 1_000_000_000) return `${sign}${prefix}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${prefix}${Math.round(abs).toLocaleString()}`;
}

function loadImageDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Export the on-screen Pipeline Health stage rows (exact displayed set). */
export async function exportPipelineHealthPdf(data: ExecutiveIntelligence) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const contentW = pageW - margin * 2;
  let y = margin;

  const logoData = await loadImageDataUrl(emeraldLogo);
  if (logoData) {
    try {
      pdf.addImage(logoData, 'PNG', margin, y, 72, 22, undefined, 'FAST');
    } catch {
      // Logo optional — continue without it.
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Pipeline Health', margin + (logoData ? 84 : 0), y + 16);
  y += 36;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  const asOf = new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const period = data.window?.label || 'Current Snapshot';
  pdf.text(`Commercial position as of ${asOf}  ·  Review period: ${period}`, margin, y);
  y += 14;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Generated ${new Date().toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    margin,
    y
  );
  y += 18;

  pdf.setDrawColor(16, 185, 129);
  pdf.setLineWidth(1.5);
  pdf.line(margin, y, pageW - margin, y);
  y += 16;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(data.health.verdict, margin, y);
  y += 14;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  const narrative = pdf.splitTextToSize(data.health.narrative, contentW);
  pdf.text(narrative, margin, y);
  y += narrative.length * 11 + 18;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Stage distribution', margin, y);
  y += 10;

  const cols = [
    { label: 'Stage', x: margin, w: 110 },
    { label: 'Count', x: margin + 120, w: 50 },
    { label: 'Share', x: margin + 180, w: 55 },
    { label: 'USD', x: margin + 250, w: 110 },
    { label: 'NGN', x: margin + 380, w: 120 },
    { label: 'Avg prob.', x: margin + 520, w: 70 },
  ];
  const rowH = 22;
  const headerH = 24;

  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, y, contentW, headerH, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  cols.forEach((col) => {
    pdf.text(col.label, col.x + 6, y + 15);
  });
  y += headerH;

  data.stages.forEach((stage, index) => {
    if (y + rowH > pageH - margin) {
      pdf.addPage();
      y = margin;
      pdf.setFillColor(15, 23, 42);
      pdf.rect(margin, y, contentW, headerH, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      cols.forEach((col) => {
        pdf.text(col.label, col.x + 6, y + 15);
      });
      y += headerH;
    }

    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, contentW, rowH, 'F');
    }

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.4);
    pdf.line(margin, y + rowH, pageW - margin, y + rowH);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(stage.label, cols[0].x + 6, y + 14);
    pdf.text(String(stage.count), cols[1].x + 6, y + 14);
    pdf.text(fmtPercent(stage.share), cols[2].x + 6, y + 14);
    pdf.text(pdfMoney(stage.usd, 'USD'), cols[3].x + 6, y + 14);
    pdf.text(pdfMoney(stage.ngn, 'NGN'), cols[4].x + 6, y + 14);
    pdf.text(fmtPercent(stage.avgProbability), cols[5].x + 6, y + 14);
    y += rowH;
  });

  y += 16;
  if (y > pageH - margin - 20) {
    pdf.addPage();
    y = margin;
  }
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    'Emerald BD Portal  ·  Figures match the on-screen Pipeline Health query for this review period.',
    margin,
    y
  );

  pdf.save(`pipeline-health-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success('Pipeline Health exported');
}

export function PipelineHealthExportButton({ data }: { data: ExecutiveIntelligence }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void exportPipelineHealthPdf(data).catch(() => {
          toast.error('Could not export Pipeline Health PDF');
        });
      }}
    >
      <Download className="w-4 h-4 mr-1.5" />
      Export PDF
    </Button>
  );
}
