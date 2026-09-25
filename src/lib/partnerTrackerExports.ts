import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import emeraldLogo from '@/assets/emerald-logo.png';
import type {
  PartnerTrackerDataGapField,
  PartnerTrackerMetrics,
  PartnerTrackerOwnerBreakdown,
} from '@/services/partners';

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

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')].concat(
    rows.map((r) => r.map(escape).join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

async function withPdfChrome(
  title: string,
  subtitle: string,
  drawBody: (pdf: jsPDF, y: number, margin: number, contentW: number, pageH: number) => number
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
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
      // optional
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42);
  pdf.text(title, margin + (logoData ? 84 : 0), y + 16);
  y += 36;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  const lines = pdf.splitTextToSize(subtitle, contentW);
  pdf.text(lines, margin, y);
  y += lines.length * 11 + 8;

  pdf.setDrawColor(16, 185, 129);
  pdf.setLineWidth(1.5);
  pdf.line(margin, y, pageW - margin, y);
  y += 16;

  y = drawBody(pdf, y, margin, contentW, pageH);
  pdf.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stamp()}.pdf`);
}

function ensureSpace(
  pdf: jsPDF,
  y: number,
  need: number,
  margin: number,
  pageH: number,
  redrawHeader?: () => number
): number {
  if (y + need <= pageH - margin) return y;
  pdf.addPage();
  return redrawHeader ? redrawHeader() : margin;
}

/** Active Partners with 0 linked opportunities — PDF. */
export async function exportActiveZeroPdf(data: PartnerTrackerMetrics['activeWithZeroOpportunities']) {
  const owners = data.byOwner ?? [];
  const partners = data.partners ?? [];

  await withPdfChrome(
    'Active Partners — 0 linked opportunities',
    `${data.count} Active Partners with no Partner Tracker links. Breakdown by relationship owner. Generated ${new Date().toLocaleString()}.`,
    (pdf, y, margin, contentW, pageH) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(data.count), margin, y);
      y += 14;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text('active partners with no linked opportunities', margin, y);
      y += 20;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('By relationship owner', margin, y);
      y += 14;

      owners.forEach((row) => {
        y = ensureSpace(pdf, y, 18, margin, pageH);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`${row.ownerName}`, margin, y);
        pdf.text(`${row.count}  (${row.pct}%)`, margin + contentW - 70, y, { align: 'left' });
        y += 6;
        const barW = Math.max(2, (contentW * Math.min(row.pct, 100)) / 100);
        pdf.setFillColor(226, 232, 240);
        pdf.rect(margin, y, contentW, 6, 'F');
        pdf.setFillColor(16, 185, 129);
        pdf.rect(margin, y, barW, 6, 'F');
        y += 16;
      });

      y += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Full list', margin, y);
      y += 14;

      partners.forEach((p) => {
        y = ensureSpace(pdf, y, 14, margin, pageH);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        const ownersLabel = (p.ownerNames ?? p.owners?.map((o) => o.name) ?? []).join(', ') || 'Unassigned';
        const line = pdf.splitTextToSize(`${p.companyName} — ${ownersLabel}`, contentW);
        pdf.text(line, margin, y);
        y += line.length * 11 + 2;
      });

      return y;
    }
  );
  toast.success('Active Partners (0 links) PDF exported');
}

/** Active Partners with 0 linked opportunities — CSV. */
export function exportActiveZeroCsv(data: PartnerTrackerMetrics['activeWithZeroOpportunities']) {
  downloadCsv(
    `active-partners-zero-links-${stamp()}.csv`,
    ['Company', 'Relationship Stage', 'Owners', 'Owner Count'],
    (data.partners ?? []).map((p) => {
      const names = p.ownerNames ?? p.owners?.map((o) => o.name) ?? [];
      return [
        p.companyName,
        p.relationshipStage ?? '',
        names.join('; ') || 'Unassigned',
        String(names.length),
      ];
    })
  );
  toast.success('Active Partners (0 links) CSV exported');
}

/** Incomplete profiles (Tracker badge) + data-gap inventory — PDF. */
export async function exportIncompletePdf(
  incomplete: PartnerTrackerMetrics['incompleteProfiles'],
  dataGaps: PartnerTrackerMetrics['dataGaps']
) {
  await withPdfChrome(
    'Incomplete partner profiles',
    `Headline count matches Partner Tracker Incomplete badge (missing contact person and/or email). Data-gap inventory is a separate scan across all ${dataGaps.partnersScanned} partners. Generated ${new Date().toLocaleString()}.`,
    (pdf, y, margin, contentW, pageH) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(incomplete.count), margin, y);
      y += 14;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text('incomplete profiles (contact person and/or email missing)', margin, y);
      y += 22;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`Data gaps across all ${dataGaps.partnersScanned} partners`, margin, y);
      y += 14;

      (dataGaps.fields ?? []).forEach((field: PartnerTrackerDataGapField) => {
        y = ensureSpace(pdf, y, 18, margin, pageH);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text(field.label, margin, y);
        pdf.text(`${field.count}  (${field.pct}%)`, margin + contentW - 80, y);
        y += 6;
        const barW = Math.max(2, (contentW * Math.min(field.pct, 100)) / 100);
        pdf.setFillColor(226, 232, 240);
        pdf.rect(margin, y, contentW, 6, 'F');
        pdf.setFillColor(16, 185, 129);
        pdf.rect(margin, y, barW, 6, 'F');
        y += 16;
      });

      y += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Incomplete profiles — full list', margin, y);
      y += 14;

      (incomplete.partners ?? []).forEach((p) => {
        y = ensureSpace(pdf, y, 14, margin, pageH);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        const missing = (p.missingFields ?? []).join(', ') || 'contact/email';
        const line = pdf.splitTextToSize(`${p.companyName} — missing: ${missing}`, contentW);
        pdf.text(line, margin, y);
        y += line.length * 11 + 2;
      });

      return y;
    }
  );
  toast.success('Incomplete profiles PDF exported');
}

/** Incomplete profiles + data-gap summary — CSV (two sections as labeled rows). */
export function exportIncompleteCsv(
  incomplete: PartnerTrackerMetrics['incompleteProfiles'],
  dataGaps: PartnerTrackerMetrics['dataGaps']
) {
  const rows: string[][] = [];
  rows.push(['SECTION', 'Incomplete profiles (Tracker badge)']);
  rows.push(['Headline count', String(incomplete.count)]);
  rows.push([]);
  rows.push(['Company', 'Stage', 'Missing fields', 'Contact', 'Email', 'Owners']);
  (incomplete.partners ?? []).forEach((p) => {
    rows.push([
      p.companyName,
      p.relationshipStage ?? '',
      (p.missingFields ?? []).join('; '),
      p.contactPerson ?? '',
      p.email ?? '',
      (p.owners ?? []).map((o) => o.name).join('; '),
    ]);
  });
  rows.push([]);
  rows.push(['SECTION', `Data gaps across all ${dataGaps.partnersScanned} partners`]);
  rows.push(['Field', 'Count', 'Pct of all partners']);
  (dataGaps.fields ?? []).forEach((f) => {
    rows.push([f.label, String(f.count), String(f.pct)]);
  });

  downloadCsv(`incomplete-partner-profiles-${stamp()}.csv`, ['Col1', 'Col2', 'Col3', 'Col4', 'Col5', 'Col6'], rows);
  toast.success('Incomplete profiles CSV exported');
}

/** Owner breakdown helper for typed imports. */
export type { PartnerTrackerOwnerBreakdown };
