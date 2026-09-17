import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { fmtNgn, fmtPercent, fmtUsd } from '@/lib/executive/format';

/** Export the on-screen Pipeline Health stage rows (exact displayed set). */
export function exportPipelineHealthPdf(data: ExecutiveIntelligence) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  pdf.setFontSize(16);
  pdf.text('Executive Pipeline Health', margin, y);
  y += 22;
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(data.health.verdict, margin, y);
  y += 16;
  const narrative = pdf.splitTextToSize(data.health.narrative, 720);
  pdf.text(narrative, margin, y);
  y += narrative.length * 12 + 16;
  pdf.setTextColor(0);

  pdf.setFontSize(11);
  pdf.text('Stage', margin, y);
  pdf.text('Count', margin + 140, y);
  pdf.text('Share', margin + 200, y);
  pdf.text('USD', margin + 280, y);
  pdf.text('NGN', margin + 400, y);
  pdf.text('Avg prob.', margin + 520, y);
  y += 8;
  pdf.setDrawColor(200);
  pdf.line(margin, y, 780, y);
  y += 16;

  data.stages.forEach((stage) => {
    if (y > 520) {
      pdf.addPage();
      y = margin;
    }
    pdf.setFontSize(10);
    pdf.text(stage.label, margin, y);
    pdf.text(String(stage.count), margin + 140, y);
    pdf.text(fmtPercent(stage.share), margin + 200, y);
    pdf.text(fmtUsd(stage.usd), margin + 280, y);
    pdf.text(fmtNgn(stage.ngn), margin + 400, y);
    pdf.text(fmtPercent(stage.avgProbability), margin + 520, y);
    y += 18;
  });

  pdf.save(`pipeline-health-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success('Pipeline Health exported');
}

export function PipelineHealthExportButton({ data }: { data: ExecutiveIntelligence }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportPipelineHealthPdf(data)}
    >
      <Download className="w-4 h-4 mr-1.5" />
      Export PDF
    </Button>
  );
}
