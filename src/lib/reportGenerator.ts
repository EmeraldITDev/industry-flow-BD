import { jsPDF } from 'jspdf';
import { Project, Task, PIPELINE_STAGES } from '@/types';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PAGE_W = 1190;
const PAGE_H = 842;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ROW_H = 28;
const HEADER_ROW_H = 32;

function fmtNum(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtCurrency(n: number | undefined | null, prefix = 'USD '): string {
  if (n == null || isNaN(n)) return '—';
  // jsPDF default fonts don't support ₦; always use text prefixes
  return `${prefix}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDateValue(value: string | undefined | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function truncate(str: string, max: number): string {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function addReportHeader(pdf: jsPDF, title: string, filterSummary: string, recordCount: number, yStart: number): number {
  let y = yStart;
  
  // Title
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(title, MARGIN, y);
  y += 30;

  // Date
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, MARGIN, y);
  y += 18;

  // Filter summary
  if (filterSummary) {
    pdf.setFontSize(11);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Filters: ${filterSummary}`, MARGIN, y);
    y += 16;
  }

  // Record count
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Total Records: ${recordCount}`, MARGIN, y);
  y += 20;

  // Divider
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  return y;
}

function drawTableHeader(pdf: jsPDF, columns: { label: string; x: number; w: number }[], y: number): number {
  // Header background
  pdf.setFillColor(241, 245, 249);
  pdf.rect(MARGIN, y - 4, CONTENT_W, HEADER_ROW_H, 'F');

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);

  columns.forEach(col => {
    pdf.text(col.label, col.x, y + 14);
  });

  return y + HEADER_ROW_H + 4;
}

function checkPageBreak(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    pdf.addPage();
    return MARGIN + 10;
  }
  return y;
}

/* ------------------------------------------------------------------ */
/* Projects Report                                                     */
/* ------------------------------------------------------------------ */

export interface ProjectFilterSummary {
  businessVerticals?: string[];
  sectors?: string[];
  statuses?: string[];
  pipelineStages?: string[];
  search?: string;
  clientNames?: string[];
  projectLeads?: string[];
  [key: string]: any;
}

function buildFilterString(filters: ProjectFilterSummary): string {
  const parts: string[] = [];
  if (filters.search) parts.push(`Search: "${filters.search}"`);
  if (filters.businessVerticals?.length) parts.push(`Business Verticals: ${filters.businessVerticals.join(', ')}`);
  if (filters.sectors?.length) parts.push(`Sectors: ${filters.sectors.join(', ')}`);
  if (filters.statuses?.length) parts.push(`Status: ${filters.statuses.join(', ')}`);
  if (filters.pipelineStages?.length) parts.push(`Stages: ${filters.pipelineStages.join(', ')}`);
  if (filters.clientNames?.length) parts.push(`Clients: ${filters.clientNames.join(', ')}`);
  if (filters.projectLeads?.length) parts.push(`Leads: ${filters.projectLeads.join(', ')}`);
  return parts.length ? parts.join(' | ') : 'No filters applied';
}

export function generateProjectsReport(
  projects: Project[],
  filters: ProjectFilterSummary,
  title = 'Projects Report'
): void {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PAGE_W, PAGE_H] });

  const filterStr = buildFilterString(filters);
  let y = addReportHeader(pdf, title, filterStr, projects.length, MARGIN + 10);

  // Column definitions
  const colDefs: { label: string; pct: number }[] = [
  { label: 'Project Name',      pct: 0.13 },
  { label: 'Description',       pct: 0.16 },
  { label: 'Client',            pct: 0.10 },
  { label: 'Channel Partner',   pct: 0.09 },
  { label: 'Business Vertical', pct: 0.09 },
  { label: 'Sector',            pct: 0.07 },
  { label: 'Stage',             pct: 0.07 },
  { label: 'Status',            pct: 0.06 },
  { label: 'Value (USD)',       pct: 0.09 },
  { label: 'Value (NGN)',       pct: 0.10 },
  { label: 'Margin %',          pct: 0.04 },
  { label: 'Probability',       pct: 0.06 },
];
const cols = colDefs.reduce<{ label: string; x: number; w: number }[]>((acc, c) => {
  const prev = acc[acc.length - 1];
  const x = prev ? prev.x + prev.w : MARGIN;
  const w = c.pct * CONTENT_W;
  acc.push({ label: c.label, x, w });
  return acc;
}, []);

  y = drawTableHeader(pdf, cols, y);

  projects.forEach((p, idx) => {
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');

  const stageLabel = PIPELINE_STAGES.find(s => s.value === p.pipelineStage)?.label || p.pipelineStage || '—';
  const marginPct = (p.marginPercentUSD && p.marginPercentUSD !== 0)
    ? p.marginPercentUSD
    : (p.marginPercentNGN && p.marginPercentNGN !== 0 ? p.marginPercentNGN : null);

  const cellValues = [
    p.name || '—',
    p.description || '—',
    p.clientName || '—',
    p.channelPartner || '—',
    p.businessVertical || '—',
    p.sector || '—',
    stageLabel,
    p.status || '—',
    fmtCurrency(p.contractValueUSD, 'USD '),
    fmtCurrency(p.contractValueNGN, 'NGN '),
    marginPct != null ? `${marginPct}%` : '—',
    p.dealProbability || '—',
  ];

  // Wrap every column, not just name/description
  const wrappedCells = cellValues.map((val, i) =>
    pdf.splitTextToSize(val, cols[i].w - 6) as string[]
  );
  const LINE_H = 11;
  const maxLines = Math.max(...wrappedCells.map((lines) => lines.length));
  const rowH = Math.max(ROW_H, maxLines * LINE_H + 10);

  y = checkPageBreak(pdf, y, rowH + 4);
  if (y < MARGIN + 20) {
    y = drawTableHeader(pdf, cols, y);
  }

  if (idx % 2 === 0) {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(MARGIN, y - 4, CONTENT_W, rowH, 'F');
  }

  pdf.setTextColor(30, 41, 59);
  wrappedCells.forEach((lines, i) => {
    pdf.text(lines, cols[i].x, y + 14);
  });

  y += rowH;
});

  // Summary totals
  y = checkPageBreak(pdf, y, 40);
  y += 8;
  pdf.setDrawColor(203, 213, 225);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;

  const totalUSD = projects.reduce((s, p) => s + (Number(p.contractValueUSD) || 0), 0);
  const totalNGN = projects.reduce((s, p) => s + (Number(p.contractValueNGN) || 0), 0);

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Total Contract Value (USD): ${fmtCurrency(totalUSD, 'USD ')}`, MARGIN, y);
  y += 18;
  pdf.text(`Total Contract Value (NGN): ${fmtCurrency(totalNGN, 'NGN ')}`, MARGIN, y);

  const safeName = title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  pdf.save(`${safeName}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Single Project Report                                               */
/* ------------------------------------------------------------------ */

export async function generateSingleProjectReport(project: Project, teamMap?: Record<string, string>): Promise<void> {
  /* Use 'pt' units — 'px' applies a 96/72 scale that shrinks content */
  const pw = 595.28;
  const ph = 841.89;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [pw, ph] });
  const m = 40;                       // ~14mm margins → 515pt usable width
  const contentW = pw - m * 2;
  let y = 0;

  /* ---- Colour palette ---- */
  const ACCENT = { r: 16, g: 185, b: 129 };   // emerald-500
  const DARK = { r: 15, g: 23, b: 42 };        // slate-900
  const HEADER_BG = { r: 30, g: 41, b: 59 };   // slate-800
  const MID = { r: 71, g: 85, b: 105 };        // slate-600
  const LIGHT = { r: 148, g: 163, b: 184 };    // slate-400
  const BORDER = { r: 226, g: 232, b: 240 };   // slate-200
  const ROW_ALT = { r: 243, g: 244, b: 246 };  // gray-100
  const WHITE = { r: 255, g: 255, b: 255 };

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  /* ---- Image normaliser ---- */
  const normalizeProjectImageForPdf = async (source?: string): Promise<{ dataUrl: string; width: number; height: number } | null> => {
    if (!source) return null;
    let src = source.trim();
    if (!src) return null;
    if (!src.startsWith('data:') && !/^https?:\/\//i.test(src)) {
      src = `data:image/png;base64,${src}`;
    }
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) { resolve(null); return; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve({ dataUrl: canvas.toDataURL('image/png', 1), width: w, height: h }); }
        catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  /* ---- Page header bar (dark) ---- */
  const drawPageHeader = () => {
    pdf.setFillColor(HEADER_BG.r, HEADER_BG.g, HEADER_BG.b);
    pdf.rect(0, 0, pw, 36, 'F');
    // Emerald accent line under header
    pdf.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    pdf.rect(0, 36, pw, 2.5, 'F');

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(WHITE.r, WHITE.g, WHITE.b);
    pdf.text('PROJECT REPORT', m, 23);

    // Full generated timestamp right-aligned
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(200, 210, 220);
    const dateText = `Generated: ${generatedDate}`;
    const dateW = pdf.getTextWidth(dateText);
    pdf.text(dateText, pw - m - dateW, 23);
  };

  /* ---- Page footer ---- */
  const drawPageFooter = (pageNum: number, totalPages: number) => {
    pdf.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    pdf.setLineWidth(0.5);
    pdf.line(m, ph - 28, pw - m, ph - 28);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(LIGHT.r, LIGHT.g, LIGHT.b);
    const footerText = `Page ${pageNum}  ·  Confidential  ·  Project Management System`;
    const footerW = pdf.getTextWidth(footerText);
    pdf.text(footerText, (pw - footerW) / 2, ph - 16);
  };

  /* ---- Ensure space ---- */
  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 46) {
      pdf.addPage();
      drawPageHeader();
      y = 54;
    }
  };

  /* ---- Section title with accent bar ---- */
  const drawSectionTitle = (title: string) => {
    y += y > 54 ? 10 : 4;
    ensureSpace(26);
    pdf.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    pdf.roundedRect(m, y + 1, 3, 12, 1.5, 1.5, 'F');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    pdf.text(title, m + 10, y + 11);
    pdf.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    pdf.setLineWidth(0.5);
    pdf.line(m, y + 17, pw - m, y + 17);
    y += 22;
  };

  /* ---- Two-column field rows with alternating backgrounds ---- */
  const labelW = 110;
  const valueX = m + labelW + 10;

  const drawFieldRows = (
    rows: Array<{ label: string; value: string | undefined | null }>,
    options?: { showAll?: boolean; emptyMessage?: string; valueBold?: boolean }
  ) => {
    const visibleRows = options?.showAll
      ? rows.map(r => ({ ...r, value: r.value ?? '—' }))
      : rows.filter(r => {
          const v = String(r.value ?? '').trim();
          return v !== '' && v !== '—';
        });

    if (!visibleRows.length) {
      ensureSpace(20);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(LIGHT.r, LIGHT.g, LIGHT.b);
      pdf.text(options?.emptyMessage || 'No information available.', m + 6, y + 12);
      y += 24;
      return;
    }

    visibleRows.forEach(({ label, value }, idx) => {
      const textValue = String(value);
      const valueLines = pdf.splitTextToSize(textValue, pw - m - valueX - 4);
      const rowH = Math.max(18, valueLines.length * 11 + 6);
      ensureSpace(rowH + 2);

      if (idx % 2 === 0) {
        pdf.setFillColor(ROW_ALT.r, ROW_ALT.g, ROW_ALT.b);
        pdf.rect(m, y - 2, contentW, rowH, 'F');
      }

      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(MID.r, MID.g, MID.b);
      pdf.text(label, m + 6, y + 10);

      pdf.setFontSize(options?.valueBold ? 9 : 8.5);
      pdf.setFont('helvetica', options?.valueBold ? 'bold' : 'normal');
      pdf.setTextColor(DARK.r, DARK.g, DARK.b);
      valueLines.forEach((line: string, li: number) => {
        pdf.text(line, valueX, y + 10 + li * 11);
      });

      y += rowH + 1;
    });
  };

  /* ---- Financial two-column grid (USD left, NGN right) ---- */
  const drawFinancialGrid = () => {
    const gap = 12;
    const colW = (contentW - gap) / 2;
    const leftX = m;
    const rightX = m + colW + gap;

    const usdRows = [
      { label: 'Contract Value', value: fmtCurrency(project.contractValueUSD, 'USD ') },
      { label: 'Margin Value', value: fmtCurrency(project.marginValueUSD, 'USD ') },
      { label: 'Margin %', value: project.marginPercentUSD != null ? `${project.marginPercentUSD}%` : '—' },
    ];
    const ngnRows = [
      { label: 'Contract Value', value: fmtCurrency(project.contractValueNGN, 'NGN ') },
      { label: 'Margin Value', value: fmtCurrency(project.marginValueNGN, 'NGN ') },
      { label: 'Margin %', value: project.marginPercentNGN != null ? `${project.marginPercentNGN}%` : '—' },
    ];

    const gridRowH = 22;
    const headerH = 20;
    const totalH = headerH + gridRowH * 3 + 4;
    ensureSpace(totalH + 6);

    // Column headers
    const drawColHeader = (x: number, w: number, title: string) => {
      pdf.setFillColor(236, 253, 245); // emerald-50
      pdf.rect(x, y, w, headerH, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
      pdf.text(title, x + 8, y + 13);
    };
    drawColHeader(leftX, colW, 'USD Values');
    drawColHeader(rightX, colW, 'NGN Values');
    const headerY = y;
    y += headerH;

    for (let i = 0; i < 3; i++) {
      const rowY = y + i * gridRowH;

      if (i % 2 === 0) {
        pdf.setFillColor(ROW_ALT.r, ROW_ALT.g, ROW_ALT.b);
        pdf.rect(leftX, rowY, colW, gridRowH, 'F');
        pdf.rect(rightX, rowY, colW, gridRowH, 'F');
      }

      const drawCell = (x: number, label: string, value: string) => {
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(MID.r, MID.g, MID.b);
        pdf.text(label, x + 8, rowY + 14);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(DARK.r, DARK.g, DARK.b);
        // Right-align value within column
        const valW = pdf.getTextWidth(value);
        pdf.text(value, x + colW - valW - 8, rowY + 14);
      };

      drawCell(leftX, usdRows[i].label, usdRows[i].value);
      drawCell(rightX, ngnRows[i].label, ngnRows[i].value);
    }

    // Outer borders
    const gridH = headerH + gridRowH * 3;
    pdf.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    pdf.setLineWidth(0.5);
    pdf.rect(leftX, headerY, colW, gridH, 'S');
    pdf.rect(rightX, headerY, colW, gridH, 'S');
    // Header separator
    pdf.line(leftX, headerY + headerH, leftX + colW, headerY + headerH);
    pdf.line(rightX, headerY + headerH, rightX + colW, headerY + headerH);

    y += gridRowH * 3 + 8;
  };

  /* ---- Progress & Completion section ---- */
  const drawProgressSection = () => {
    const pct = Math.max(0, Math.min(100, Number(project.progress) || 0));
    const statusLabel = pct === 0 ? 'Not started yet' : pct === 100 ? 'Completed' : 'In progress';

    // "Current Status" row
    ensureSpace(60);
    pdf.setFillColor(ROW_ALT.r, ROW_ALT.g, ROW_ALT.b);
    pdf.rect(m, y - 2, contentW, 20, 'F');
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(MID.r, MID.g, MID.b);
    pdf.text('Current Status', m + 6, y + 10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    pdf.text(statusLabel, valueX, y + 10);
    y += 24;

    // "Overall Completion" label + percentage on same line
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(MID.r, MID.g, MID.b);
    pdf.text('Overall Completion', m + 6, y + 8);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    const pctText = `${pct}%`;
    const pctW = pdf.getTextWidth(pctText);
    pdf.text(pctText, pw - m - pctW, y + 8);
    y += 14;

    // Full-width progress bar track
    const barW = contentW;
    const barH = 10;
    pdf.setFillColor(BORDER.r, BORDER.g, BORDER.b);
    pdf.roundedRect(m, y, barW, barH, 5, 5, 'F');

    const fillW = Math.max(0, (pct / 100) * barW);
    if (fillW > 0) {
      pdf.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
      if (fillW > 10) {
        pdf.roundedRect(m, y, fillW, barH, 5, 5, 'F');
      } else {
        pdf.rect(m, y, fillW, barH, 'F');
      }
    }

    pdf.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(m, y, barW, barH, 5, 5, 'S');

    y += barH + 8;
  };

  /* ---- Notes & Support side-by-side ---- */
  const drawNotesSection = () => {
    const hasComments = !!project.projectLeadComments;
    const hasSupport = !!project.supportNeeded;
    if (!hasComments && !hasSupport) return;

    drawSectionTitle('Notes & Support');

    const colW = (contentW - 10) / 2;
    const leftX = m;
    const rightX = m + colW + 10;
    const headerH = 20;
    const bodyPad = 6;

    const leftText = project.projectLeadComments || '—';
    const rightText = project.supportNeeded || '—';
    const leftLines = pdf.splitTextToSize(leftText, colW - 16);
    const rightLines = pdf.splitTextToSize(rightText, colW - 16);
    const bodyH = Math.max(leftLines.length * 13 + 14, rightLines.length * 13 + 14, 32);

    ensureSpace(headerH + bodyH + 8);

    // Left column header
    pdf.setFillColor(236, 253, 245);  // emerald-50
    pdf.rect(leftX, y, colW, headerH, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(MID.r, MID.g, MID.b);
    pdf.text('Project Lead Comments', leftX + 10, y + 15);

    // Right column header
    pdf.setFillColor(236, 253, 245);
    pdf.rect(rightX, y, colW, headerH, 'F');
    pdf.text('Support Needed', rightX + 10, y + 15);

    y += headerH;

    // Left column body
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    leftLines.forEach((line: string, i: number) => {
      pdf.text(line, leftX + 10, y + bodyPad + 10 + i * 13);
    });

    // Right column body
    rightLines.forEach((line: string, i: number) => {
      pdf.text(line, rightX + 10, y + bodyPad + 10 + i * 13);
    });

    // Borders around both columns (header + body)
    pdf.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    pdf.setLineWidth(0.5);
    pdf.rect(leftX, y - headerH, colW, headerH + bodyH, 'S');
    pdf.rect(rightX, y - headerH, colW, headerH + bodyH, 'S');
    // Separator between header and body
    pdf.line(leftX, y, leftX + colW, y);
    pdf.line(rightX, y, rightX + colW, y);

    y += bodyH + 10;
  };

  /* ==================================================================
     BUILD THE PDF
     ================================================================== */

  drawPageHeader();
  y = 52;

  const projectImageAsset = await normalizeProjectImageForPdf(project.projectImage);

  /* ---- Title row with optional small logo beside it ---- */
  const titleStartX = m;
  let logoDrawW = 0;
  let logoDrawH = 0;
  const maxLogoH = 40;
  const maxLogoW = 40;

  if (projectImageAsset) {
    const imgScale = Math.min(maxLogoW / projectImageAsset.width, maxLogoH / projectImageAsset.height, 1);
    logoDrawW = projectImageAsset.width * imgScale;
    logoDrawH = projectImageAsset.height * imgScale;
  }

  const titleX = projectImageAsset ? titleStartX + logoDrawW + 14 : titleStartX;
  const titleMaxW = contentW - (projectImageAsset ? logoDrawW + 14 : 0);

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(DARK.r, DARK.g, DARK.b);
  const titleLines = pdf.splitTextToSize(project.name, titleMaxW);
  const titleBlockH = titleLines.length * 20;
  pdf.text(titleLines, titleX, y + 18);

  // Draw logo beside title
  if (projectImageAsset) {
    const logoY = y + 10 + (titleBlockH - logoDrawH) / 2 - 6;
    pdf.addImage(projectImageAsset.dataUrl, 'PNG', titleStartX, Math.max(y + 2, logoY), logoDrawW, logoDrawH, undefined, 'FAST');
  }

  y += Math.max(titleBlockH, logoDrawH) + 16;

  /* ---- Status pill + pipeline (fix: set font BEFORE measuring) ---- */
  const stageLabel = PIPELINE_STAGES.find(s => s.value === project.pipelineStage)?.label || project.pipelineStage || '—';
  const statusText = (project.status || '—').toUpperCase();
  const statusColors: Record<string, { r: number; g: number; b: number }> = {
    active: { r: 16, g: 185, b: 129 },
    completed: { r: 59, g: 130, b: 246 },
    'on-hold': { r: 245, g: 158, b: 11 },
    inactive: { r: 148, g: 163, b: 184 },
  };
  const pillColor = statusColors[project.status] || LIGHT;

  // MUST set font before measuring width
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  const statusW = pdf.getTextWidth(statusText) + 16;

  pdf.setFillColor(pillColor.r, pillColor.g, pillColor.b);
  pdf.roundedRect(m, y - 9, statusW, 16, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusText, m + 8, y + 1);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(MID.r, MID.g, MID.b);
  pdf.setFontSize(10);
  pdf.text(`Pipeline: ${stageLabel}`, m + statusW + 8, y + 1);
  y += 16;

  /* ---- Separator ---- */
  pdf.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  pdf.setLineWidth(0.5);
  pdf.line(m, y, pw - m, y);
  y += 6;

  /* ---- Project Overview ---- */
  const leadName = project.projectLeadId && teamMap
    ? (teamMap[String(project.projectLeadId)] || String(project.projectLeadId))
    : undefined;

  drawSectionTitle('Project Overview');
  drawFieldRows([
    { label: 'Business Vertical', value: project.businessVertical },
    { label: 'Sector', value: project.sector },
    { label: 'Business Segment', value: project.businessSegment },
    { label: 'Client', value: project.clientName },
    { label: 'Client Contact', value: project.clientContact },
    { label: 'Location', value: project.location },
    { label: 'OEM', value: project.oem },
    { label: 'Product', value: project.product },
    { label: 'Sub Product', value: project.subProduct },
    { label: 'Channel Partner', value: project.channelPartner },
    { label: 'Sales Lead', value: project.salesLead },
    { label: 'Project Lead', value: leadName },
    { label: 'Deal Probability', value: project.dealProbability },
  ]);

  /* ---- Timeline ---- */
  drawSectionTitle('Timeline');

  // Calculate duration
  let durationStr = '—';
  if (project.startDate && project.endDate) {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs > 0) {
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      durationStr = days > 30 ? `${Math.round(days / 30)} months` : `${days} days`;
    }
  }

  drawFieldRows([
    { label: 'Start Date', value: fmtDateValue(project.startDate) },
    { label: 'End Date', value: fmtDateValue(project.endDate) },
    { label: 'Duration', value: durationStr },
    { label: 'Expected Close', value: fmtDateValue(project.expectedCloseDate) },
    { label: 'Pipeline Intake', value: fmtDateValue(project.pipelineIntakeDate) },
  ], { showAll: true });

  /* ---- Financial Summary (two-column grid) ---- */
  console.log('[PDF Export] Financial fields:', {
    contractValueNGN: project.contractValueNGN,
    contractValueUSD: project.contractValueUSD,
    marginPercentNGN: project.marginPercentNGN,
    marginPercentUSD: project.marginPercentUSD,
    marginValueNGN: project.marginValueNGN,
    marginValueUSD: project.marginValueUSD,
  });
  drawSectionTitle('Financial Summary');
  drawFinancialGrid();

  /* ---- Progress & Completion ---- */
  drawSectionTitle('Progress & Completion');
  drawProgressSection();

  /* ---- Notes & Support ---- */
  drawNotesSection();

  /* ---- Add footers to all pages ---- */
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    drawPageFooter(i, pageCount);
  }

  const safeName = `project-${project.name}`.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  pdf.save(`${safeName}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Tasks Report                                                        */
/* ------------------------------------------------------------------ */

export interface TaskFilterSummary {
  search?: string;
  status?: string;
  priority?: string;
  project?: string;
  assignee?: string;
}

function buildTaskFilterString(filters: TaskFilterSummary): string {
  const parts: string[] = [];
  if (filters.search) parts.push(`Search: "${filters.search}"`);
  if (filters.status && filters.status !== 'all') parts.push(`Status: ${filters.status}`);
  if (filters.priority && filters.priority !== 'all') parts.push(`Priority: ${filters.priority}`);
  if (filters.project && filters.project !== 'all') parts.push(`Project: ${filters.project}`);
  if (filters.assignee && filters.assignee !== 'all') parts.push(`Assignee: ${filters.assignee}`);
  return parts.length ? parts.join(' | ') : 'No filters applied';
}

export function generateTasksReport(
  tasks: Task[],
  filters: TaskFilterSummary,
  projectMap: Record<string, { name: string }>,
  teamMap: Record<string, string>,
): void {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PAGE_W, PAGE_H] });

  const filterStr = buildTaskFilterString(filters);
  let y = addReportHeader(pdf, 'Tasks Report', filterStr, tasks.length, MARGIN + 10);

  const cols = [
    { label: 'Task Title', x: MARGIN, w: 300 },
    { label: 'Project', x: MARGIN + 300, w: 240 },
    { label: 'Status', x: MARGIN + 540, w: 90 },
    { label: 'Priority', x: MARGIN + 630, w: 80 },
    { label: 'Assignee', x: MARGIN + 710, w: 180 },
    { label: 'Due Date', x: MARGIN + 890, w: 100 },
  ];

  y = drawTableHeader(pdf, cols, y);

  tasks.forEach((t, idx) => {
    y = checkPageBreak(pdf, y, ROW_H + 4);
    if (y < MARGIN + 20) y = drawTableHeader(pdf, cols, y);

    if (idx % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(MARGIN, y - 4, CONTENT_W, ROW_H, 'F');
    }

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);

    const projName = projectMap[t.projectId]?.name || '—';
    const assignee = t.assigneeId ? (teamMap[String(t.assigneeId)] || (typeof t.assignee === 'string' ? t.assignee : 'Unassigned')) : 'Unassigned';
    const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—';

    
    pdf.text(t.status || '—', cols[2].x, y + 14);
    pdf.text(t.priority || '—', cols[3].x, y + 14);
    pdf.text(dueDate, cols[5].x, y + 14);

    y += ROW_H;
  });

  // Summary
  y = checkPageBreak(pdf, y, 40);
  y += 8;
  pdf.setDrawColor(203, 213, 225);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;

  const byStatus: Record<string, number> = {};
  tasks.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Status Summary:', MARGIN, y);
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  Object.entries(byStatus).forEach(([status, count]) => {
    pdf.text(`  ${status}: ${count}`, MARGIN, y);
    y += 12;
  });

  pdf.save('tasks-report.pdf');
}
