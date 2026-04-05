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
  if (n == null || isNaN(n) || n === 0) return '—';
  // jsPDF default fonts don't support ₦; always use text prefixes
  return `${prefix}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export function generateSingleProjectReport(project: Project, teamMap?: Record<string, string>): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pw = 595;
  const m = 44;
  const contentW = pw - m * 2;
  let y = m;

  const ACCENT = { r: 16, g: 185, b: 129 }; // emerald-500
  const DARK = { r: 15, g: 23, b: 42 };
  const MID = { r: 71, g: 85, b: 105 };
  const LIGHT = { r: 148, g: 163, b: 184 };

  const ensureSpace = (needed: number) => {
    if (y + needed > 800) { pdf.addPage(); y = m; }
  };

  /* ---- Top accent bar ---- */
  pdf.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
  pdf.rect(0, 0, pw, 6, 'F');

  y = 30;

  console.log('Project image available:', !!project.projectImage, project.projectImage ? `(${project.projectImage.substring(0, 30)}..., length: ${project.projectImage.length})` : 'none');
  /* ---- Project Image (top-right) ---- */
  const imgSize = 90;
  let titleMaxW = contentW;
  let imageEmbedded = false;
  if (project.projectImage && project.projectImage.length > 20) {
    try {
      let imgData = project.projectImage;
      // Ensure it's a proper data URL
      if (!imgData.startsWith('data:')) {
        imgData = `data:image/png;base64,${imgData}`;
      }
      // Detect format from data URL
      let imgFormat = 'PNG';
      if (imgData.match(/data:image\/(jpeg|jpg)/i)) imgFormat = 'JPEG';
      else if (imgData.match(/data:image\/gif/i)) imgFormat = 'GIF';
      
      const imgX = pw - m - imgSize;
      const imgY = y;
      pdf.addImage(imgData, imgFormat, imgX, imgY, imgSize, imgSize, undefined, 'FAST');
      // Border on top
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(imgX - 1, imgY - 1, imgSize + 2, imgSize + 2, 4, 4, 'S');
      titleMaxW = contentW - imgSize - 16;
      imageEmbedded = true;
    } catch (e) {
      console.warn('Failed to embed project image in PDF:', e);
    }
  }
  // If image exists but failed to embed, draw a placeholder
  if (project.projectImage && !imageEmbedded) {
    const imgX = pw - m - imgSize;
    const imgY = y;
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(imgX, imgY, imgSize, imgSize, 4, 4, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(imgX, imgY, imgSize, imgSize, 4, 4, 'S');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(LIGHT.r, LIGHT.g, LIGHT.b);
    pdf.text('Image', imgX + imgSize / 2, imgY + imgSize / 2, { align: 'center' });
    titleMaxW = contentW - imgSize - 16;
  }

  /* ---- Title ---- */
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(DARK.r, DARK.g, DARK.b);
  const titleLines = pdf.splitTextToSize(project.name, titleMaxW);
  pdf.text(titleLines, m, y + 18);
  y += 18 + titleLines.length * 24;

  /* ---- Subtitle line: Status badge + Stage ---- */
  const stageLabel = PIPELINE_STAGES.find(s => s.value === project.pipelineStage)?.label || project.pipelineStage || '—';

  // Status pill
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const statusText = (project.status || '—').toUpperCase();
  const statusW = pdf.getTextWidth(statusText) + 16;
  const statusColors: Record<string, { r: number; g: number; b: number }> = {
    active: { r: 16, g: 185, b: 129 },
    completed: { r: 59, g: 130, b: 246 },
    'on-hold': { r: 245, g: 158, b: 11 },
    inactive: { r: 148, g: 163, b: 184 },
  };
  const pillColor = statusColors[project.status] || LIGHT;
  pdf.setFillColor(pillColor.r, pillColor.g, pillColor.b);
  pdf.roundedRect(m, y - 10, statusW, 18, 4, 4, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusText, m + 8, y + 2);

  // Stage text next to pill
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(MID.r, MID.g, MID.b);
  pdf.setFontSize(11);
  pdf.text(`Pipeline: ${stageLabel}`, m + statusW + 10, y + 2);
  y += 20;

  /* ---- Generated date ---- */
  pdf.setFontSize(9);
  pdf.setTextColor(LIGHT.r, LIGHT.g, LIGHT.b);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, m, y);
  y += 16;

  /* ---- Divider ---- */
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(m, y, pw - m, y);
  y += 14;

  /* ---- Section helper ---- */
  const drawSectionTitle = (title: string) => {
    ensureSpace(30);
    // Left accent bar (3px wide emerald stripe)
    pdf.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    pdf.rect(m, y - 2, 3, 20, 'F');
    // Section title text
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    pdf.text(title, m + 12, y + 12);
    // Subtle underline
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(m, y + 20, pw - m, y + 20);
    y += 30;
  };

  /* ---- Field row helper (two-column key:value) ---- */
  const fieldLabelW = 150;
  const addField = (label: string, value: string | undefined | null) => {
    if (!value || value === '—') return;
    ensureSpace(18);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(MID.r, MID.g, MID.b);
    pdf.text(label, m + 8, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    const valLines = pdf.splitTextToSize(String(value), contentW - fieldLabelW - 16);
    pdf.text(valLines, m + fieldLabelW, y);
    y += Math.max(valLines.length * 13, 15);
  };

  /* ---- Financial field with emphasis ---- */
  const addFinanceField = (label: string, value: string | undefined | null) => {
    if (!value || value === '—') return;
    ensureSpace(20);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(MID.r, MID.g, MID.b);
    pdf.text(label, m + 8, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    pdf.setFontSize(11);
    pdf.text(String(value), m + fieldLabelW, y);
    y += 17;
  };

  /* ======== PROJECT OVERVIEW SECTION ======== */
  drawSectionTitle('Project Overview');

  const leadName = project.projectLeadId && teamMap
    ? (teamMap[String(project.projectLeadId)] || String(project.projectLeadId))
    : undefined;

  addField('Sector', project.sector);
  addField('Business Segment', project.businessSegment);
  addField('Client', project.clientName);
  addField('Client Contact', project.clientContact);
  addField('Location', project.location);
  addField('OEM', project.oem);
  addField('Product', project.product);
  addField('Sub Product', project.subProduct);
  addField('Channel Partner', project.channelPartner);
  addField('Sales Lead', project.salesLead);
  addField('Project Lead', leadName);
  addField('Deal Probability', project.dealProbability);
  y += 4;

  /* ======== TIMELINE SECTION ======== */
  drawSectionTitle('Timeline');
  addField('Start Date', project.startDate);
  addField('End Date', project.endDate);
  addField('Expected Close', project.expectedCloseDate);
  addField('Pipeline Intake', project.pipelineIntakeDate);
  y += 4;

  /* ======== FINANCIAL DETAILS SECTION ======== */
  drawSectionTitle('Financial Details');

  // USD block
  const hasUSD = project.contractValueUSD || project.marginPercentUSD || project.marginValueUSD;
  const hasNGN = project.contractValueNGN || project.marginPercentNGN || project.marginValueNGN;

  if (hasUSD) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
    pdf.text('USD Values', m + 8, y);
    y += 15;
    addFinanceField('Contract Value', fmtCurrency(project.contractValueUSD, 'USD '));
    addFinanceField('Margin %', project.marginPercentUSD ? `${project.marginPercentUSD}%` : undefined);
    addFinanceField('Margin Value', fmtCurrency(project.marginValueUSD, 'USD '));
    y += 6;
  }

  if (hasNGN) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
    pdf.text('NGN Values', m + 8, y);
    y += 15;
    addFinanceField('Contract Value', fmtCurrency(project.contractValueNGN, 'NGN '));
    addFinanceField('Margin %', project.marginPercentNGN ? `${project.marginPercentNGN}%` : undefined);
    addFinanceField('Margin Value', fmtCurrency(project.marginValueNGN, 'NGN '));
    y += 6;
  }

  if (!hasUSD && !hasNGN) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(LIGHT.r, LIGHT.g, LIGHT.b);
    pdf.text('No financial data available for this project.', m + 8, y);
    y += 16;
  }

  /* ======== PROGRESS SECTION ======== */
  if (project.progress != null) {
    ensureSpace(50);
    drawSectionTitle('Progress');
    const pct = Number(project.progress) || 0;
    const barW = contentW - 16;
    const barH = 20;
    const barX = m + 8;
    const barY = y;

    // Background track
    pdf.setFillColor(226, 232, 240);
    pdf.roundedRect(barX, barY, barW, barH, 6, 6, 'F');

    // Filled portion
    const fillW = Math.max((pct / 100) * barW, 0);
    if (fillW > 8) {
      pdf.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
      pdf.roundedRect(barX, barY, fillW, barH, 6, 6, 'F');
    }

    // Percentage text (to the right of bar)
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    pdf.text(`${pct}% Complete`, barX, barY + barH + 16);
    y = barY + barH + 26;
  }

  /* ======== COMMENTS & SUPPORT ======== */
  if (project.projectLeadComments || project.supportNeeded) {
    drawSectionTitle('Notes & Support');

    if (project.projectLeadComments) {
      ensureSpace(30);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(MID.r, MID.g, MID.b);
      pdf.text('Project Lead Comments', m + 8, y);
      y += 14;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(DARK.r, DARK.g, DARK.b);
      const lines = pdf.splitTextToSize(project.projectLeadComments, contentW - 16);
      lines.forEach((line: string) => {
        ensureSpace(13);
        pdf.text(line, m + 8, y);
        y += 12;
      });
      y += 6;
    }

    if (project.supportNeeded) {
      ensureSpace(30);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(MID.r, MID.g, MID.b);
      pdf.text('Support Needed', m + 8, y);
      y += 14;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(DARK.r, DARK.g, DARK.b);
      const lines = pdf.splitTextToSize(project.supportNeeded, contentW - 16);
      lines.forEach((line: string) => {
        ensureSpace(13);
        pdf.text(line, m + 8, y);
        y += 12;
      });
      y += 6;
    }
  }

  /* ---- Footer on every page ---- */
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    // Bottom accent bar
    pdf.setFillColor(241, 245, 249);
    pdf.rect(0, 836, pw, 6, 'F');
    // Footer text
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
