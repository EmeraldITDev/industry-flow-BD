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
  const cols = [
    { label: 'Project Name', x: MARGIN, w: 200 },
    { label: 'Client', x: MARGIN + 200, w: 140 },
    { label: 'Sector', x: MARGIN + 340, w: 100 },
    { label: 'Stage', x: MARGIN + 440, w: 90 },
    { label: 'Status', x: MARGIN + 530, w: 65 },
    { label: 'Value (USD)', x: MARGIN + 595, w: 120 },
    { label: 'Value (NGN)', x: MARGIN + 715, w: 140 },
    { label: 'Margin %', x: MARGIN + 855, w: 60 },
    { label: 'Probability', x: MARGIN + 915, w: 70 },
    { label: 'Location', x: MARGIN + 985, w: 80 },
  ];

  y = drawTableHeader(pdf, cols, y);

  projects.forEach((p, idx) => {
    y = checkPageBreak(pdf, y, ROW_H + 4);

    // If we just started a new page, redraw headers
    if (y < MARGIN + 20) {
      y = drawTableHeader(pdf, cols, y);
    }

    // Alternating row bg
    if (idx % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(MARGIN, y - 4, CONTENT_W, ROW_H, 'F');
    }

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);

    const stageLabel = PIPELINE_STAGES.find(s => s.value === p.pipelineStage)?.label || p.pipelineStage || '—';

    pdf.text(truncate(p.name, 34), cols[0].x, y + 14);
    pdf.text(truncate(p.clientName || '', 22), cols[1].x, y + 14);
    pdf.text(truncate(p.sector || '', 16), cols[2].x, y + 14);
    pdf.text(truncate(stageLabel, 14), cols[3].x, y + 14);
    pdf.text(p.status || '—', cols[4].x, y + 14);
    pdf.text(fmtCurrency(p.contractValueUSD, 'USD '), cols[5].x, y + 14);
    pdf.text(fmtCurrency(p.contractValueNGN, 'NGN '), cols[6].x, y + 14);
    pdf.text(p.marginPercentUSD ? `${p.marginPercentUSD}%` : '—', cols[7].x, y + 14);
    pdf.text(p.dealProbability || '—', cols[8].x, y + 14);
    pdf.text(truncate(p.location || '', 14), cols[9].x, y + 14);

    y += ROW_H;
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
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pw = 595;
  const ph = 842;
  const m = 44;
  const contentW = pw - m * 2;
  const labelX = m;
  const labelW = 138;
  const valueX = labelX + labelW + 24;
  const valueW = pw - m - valueX - 6;
  let y = 34;

  const ACCENT = { r: 16, g: 185, b: 129 };
  const DARK = { r: 15, g: 23, b: 42 };
  const MID = { r: 71, g: 85, b: 105 };
  const LIGHT = { r: 148, g: 163, b: 184 };
  const BORDER = { r: 226, g: 232, b: 240 };
  const SOFT = { r: 248, g: 250, b: 252 };

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
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) {
          resolve(null);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          resolve({ dataUrl: canvas.toDataURL('image/png', 1), width, height });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const drawPageAccent = () => {
    pdf.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    pdf.rect(0, 0, pw, 5, 'F');
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 46) {
      pdf.addPage();
      drawPageAccent();
      y = 34;
    }
  };

  const hasVisibleValue = (value: string | number | undefined | null) => {
    if (value == null) return false;
    const normalized = String(value).trim();
    return normalized !== '' && normalized !== '—';
  };

  const drawSectionTitle = (title: string) => {
    y += y > 42 ? 18 : 10;
    ensureSpace(42);
    pdf.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    pdf.roundedRect(labelX, y + 1, 4, 18, 2, 2, 'F');
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    pdf.text(title, labelX + 16, y + 14);
    pdf.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    pdf.setLineWidth(0.6);
    pdf.line(labelX, y + 26, pw - m, y + 26);
    y += 40;
  };

  const drawFieldRows = (
    rows: Array<{ label: string; value: string | undefined | null }>,
    options?: { align?: 'left' | 'right'; valueBold?: boolean; emptyMessage?: string }
  ) => {
    const visibleRows = rows.filter((row) => hasVisibleValue(row.value));

    if (!visibleRows.length) {
      ensureSpace(20);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(LIGHT.r, LIGHT.g, LIGHT.b);
      pdf.text(options?.emptyMessage || 'No information available.', labelX + 6, y + 12);
      y += 24;
      return;
    }

    visibleRows.forEach(({ label, value }) => {
      const textValue = String(value);
      const valueLines = pdf.splitTextToSize(textValue, valueW);
      const rowHeight = Math.max(22, valueLines.length * 12 + 4);
      ensureSpace(rowHeight + 10);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(MID.r, MID.g, MID.b);
      pdf.text(label, labelX + 6, y + 12);

      pdf.setFontSize(options?.valueBold ? 11 : 10.5);
      pdf.setFont('helvetica', options?.valueBold ? 'bold' : 'normal');
      pdf.setTextColor(DARK.r, DARK.g, DARK.b);

      valueLines.forEach((line: string, index: number) => {
        const lineY = y + 12 + index * 12;
        if (options?.align === 'right') {
          pdf.text(line, pw - m - 6, lineY, { align: 'right' });
        } else {
          pdf.text(line, valueX, lineY);
        }
      });

      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.5);
      pdf.line(labelX + 4, y + rowHeight, pw - m, y + rowHeight);
      y += rowHeight + 8;
    });
  };

  const drawParagraphBlock = (label: string, text: string) => {
    ensureSpace(38);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(MID.r, MID.g, MID.b);
    pdf.text(label, labelX + 6, y + 12);
    y += 20;

    const lines = pdf.splitTextToSize(text, contentW - 12);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);

    lines.forEach((line: string) => {
      ensureSpace(14);
      pdf.text(line, labelX + 6, y + 10);
      y += 13;
    });

    y += 6;
  };

  drawPageAccent();

  const projectImageAsset = await normalizeProjectImageForPdf(project.projectImage);

  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(DARK.r, DARK.g, DARK.b);
  const titleLines = pdf.splitTextToSize(project.name, contentW);
  pdf.text(titleLines, m, y + 22);
  y += 18 + titleLines.length * 28;

  const stageLabel = PIPELINE_STAGES.find(s => s.value === project.pipelineStage)?.label || project.pipelineStage || '—';
  const statusText = (project.status || '—').toUpperCase();
  const statusColors: Record<string, { r: number; g: number; b: number }> = {
    active: { r: 16, g: 185, b: 129 },
    completed: { r: 59, g: 130, b: 246 },
    'on-hold': { r: 245, g: 158, b: 11 },
    inactive: { r: 148, g: 163, b: 184 },
  };
  const pillColor = statusColors[project.status] || LIGHT;
  const statusW = pdf.getTextWidth(statusText) + 16;

  pdf.setFontSize(9.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(pillColor.r, pillColor.g, pillColor.b);
  pdf.roundedRect(m, y - 10, statusW, 18, 4, 4, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusText, m + 8, y + 2);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(MID.r, MID.g, MID.b);
  pdf.setFontSize(11);
  pdf.text(`Pipeline: ${stageLabel}`, m + statusW + 10, y + 2);
  y += 24;

  pdf.setFontSize(9.5);
  pdf.setTextColor(LIGHT.r, LIGHT.g, LIGHT.b);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, m, y);
  y += 20;

  pdf.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  pdf.setLineWidth(0.6);
  pdf.line(m, y, pw - m, y);
  y += 12;

  if (projectImageAsset) {
    drawSectionTitle('Project Image');
    const maxImageW = 120;
    const maxImageH = 90;
    const scale = Math.min(maxImageW / projectImageAsset.width, maxImageH / projectImageAsset.height, 1);
    const drawW = projectImageAsset.width * scale;
    const drawH = projectImageAsset.height * scale;
    const pad = 8;
    const frameW = drawW + pad * 2;
    const frameH = drawH + pad * 2;
    ensureSpace(frameH + 8);
    const frameX = m + (contentW - frameW) / 2;
    const frameY = y;

    pdf.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(frameX, frameY, frameW, frameH, 4, 4, 'S');
    pdf.addImage(projectImageAsset.dataUrl, 'PNG', frameX + pad, frameY + pad, drawW, drawH, undefined, 'FAST');
    y += frameH + 8;
  }

  const leadName = project.projectLeadId && teamMap
    ? (teamMap[String(project.projectLeadId)] || String(project.projectLeadId))
    : undefined;

  drawSectionTitle('Project Overview');
  drawFieldRows([
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

  drawSectionTitle('Timeline');
  drawFieldRows([
    { label: 'Start Date', value: fmtDateValue(project.startDate) },
    { label: 'End Date', value: fmtDateValue(project.endDate) },
    { label: 'Expected Close', value: fmtDateValue(project.expectedCloseDate) },
    { label: 'Pipeline Intake', value: fmtDateValue(project.pipelineIntakeDate) },
  ]);

  drawSectionTitle('Financial Details');
  drawFieldRows(
    [
      { label: 'Contract Value (USD)', value: fmtCurrency(project.contractValueUSD, 'USD ') },
      { label: 'Margin % (USD)', value: project.marginPercentUSD != null ? `${project.marginPercentUSD}%` : undefined },
      { label: 'Margin Value (USD)', value: fmtCurrency(project.marginValueUSD, 'USD ') },
      { label: 'Contract Value (NGN)', value: fmtCurrency(project.contractValueNGN, 'NGN ') },
      { label: 'Margin % (NGN)', value: project.marginPercentNGN != null ? `${project.marginPercentNGN}%` : undefined },
      { label: 'Margin Value (NGN)', value: fmtCurrency(project.marginValueNGN, 'NGN ') },
    ],
    { align: 'right', valueBold: true, emptyMessage: 'No financial data available for this project.' }
  );

  if (project.progress != null) {
    drawSectionTitle('Progress');
    ensureSpace(54);
    const pct = Math.max(0, Math.min(100, Number(project.progress) || 0));
    const rowTop = y;
    const barW = 160;
    const barH = 8;
    const barX = valueX;
    const barY = rowTop + 14;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(MID.r, MID.g, MID.b);
    pdf.text('Completion', labelX + 6, rowTop + 12);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    pdf.text(`${pct}%`, pw - m - 6, rowTop + 12, { align: 'right' });

    pdf.setFillColor(BORDER.r, BORDER.g, BORDER.b);
    pdf.roundedRect(barX, barY, barW, barH, 6, 6, 'F');

    const fillW = (pct / 100) * barW;
    if (fillW > 0) {
      pdf.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
      if (fillW > 10) {
        pdf.roundedRect(barX, barY, fillW, barH, 6, 6, 'F');
      } else {
        pdf.rect(barX, barY, fillW, barH, 'F');
      }
    }

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(MID.r, MID.g, MID.b);
    pdf.text(pct === 0 ? 'Not started yet' : pct === 100 ? 'Completed' : 'In progress', valueX, barY + 20);

    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.5);
    pdf.line(labelX + 4, rowTop + 34, pw - m, rowTop + 34);
    y = rowTop + 42;
  }

  if (project.projectLeadComments || project.supportNeeded) {
    drawSectionTitle('Notes & Support');

    if (project.projectLeadComments) {
      drawParagraphBlock('Project Lead Comments', project.projectLeadComments);
    }

    if (project.supportNeeded) {
      drawParagraphBlock('Support Needed', project.supportNeeded);
    }
  }

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFillColor(SOFT.r, SOFT.g, SOFT.b);
    pdf.rect(0, 836, pw, 6, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(LIGHT.r, LIGHT.g, LIGHT.b);
    pdf.text(`${project.name} — Project Report`, m, 830);
    pdf.text(`Page ${i} of ${pageCount}`, pw - m - 50, 830);
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

    pdf.text(truncate(t.title, 50), cols[0].x, y + 14);
    pdf.text(truncate(projName, 40), cols[1].x, y + 14);
    pdf.text(t.status || '—', cols[2].x, y + 14);
    pdf.text(t.priority || '—', cols[3].x, y + 14);
    pdf.text(truncate(assignee, 30), cols[4].x, y + 14);
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
