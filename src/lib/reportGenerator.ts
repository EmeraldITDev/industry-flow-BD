import { jsPDF } from 'jspdf';
import { Project, Task, PIPELINE_STAGES } from '@/types';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PAGE_W = 1190; // A3 landscape for more room
const PAGE_H = 842;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ROW_H = 22;
const HEADER_ROW_H = 26;

function fmtNum(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtCurrency(n: number | undefined | null, symbol = '$'): string {
  if (n == null || isNaN(n) || n === 0) return '—';
  return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function truncate(str: string, max: number): string {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function addReportHeader(pdf: jsPDF, title: string, filterSummary: string, recordCount: number, yStart: number): number {
  let y = yStart;
  
  // Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(title, MARGIN, y);
  y += 24;

  // Date
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, MARGIN, y);
  y += 14;

  // Filter summary
  if (filterSummary) {
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Filters: ${filterSummary}`, MARGIN, y);
    y += 12;
  }

  // Record count
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Total Records: ${recordCount}`, MARGIN, y);
  y += 16;

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

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);

  columns.forEach(col => {
    pdf.text(col.label, col.x, y + 10);
  });

  return y + HEADER_ROW_H + 2;
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
    { label: 'Project Name', x: MARGIN, w: 140 },
    { label: 'Client', x: MARGIN + 140, w: 100 },
    { label: 'Sector', x: MARGIN + 240, w: 80 },
    { label: 'Stage', x: MARGIN + 320, w: 70 },
    { label: 'Status', x: MARGIN + 390, w: 55 },
    { label: 'Value (USD)', x: MARGIN + 445, w: 85 },
    { label: 'Value (NGN)', x: MARGIN + 530, w: 95 },
    { label: 'Margin %', x: MARGIN + 625, w: 50 },
    { label: 'Probability', x: MARGIN + 675, w: 55 },
    { label: 'Location', x: MARGIN + 730, w: 60 },
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

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);

    const stageLabel = PIPELINE_STAGES.find(s => s.value === p.pipelineStage)?.label || p.pipelineStage || '—';

    pdf.text(truncate(p.name, 28), cols[0].x, y + 8);
    pdf.text(truncate(p.clientName || '', 20), cols[1].x, y + 8);
    pdf.text(truncate(p.sector || '', 16), cols[2].x, y + 8);
    pdf.text(truncate(stageLabel, 14), cols[3].x, y + 8);
    pdf.text(p.status || '—', cols[4].x, y + 8);
    pdf.text(fmtCurrency(p.contractValueUSD), cols[5].x, y + 8);
    pdf.text(fmtCurrency(p.contractValueNGN, '₦'), cols[6].x, y + 8);
    pdf.text(p.marginPercentUSD ? `${p.marginPercentUSD}%` : '—', cols[7].x, y + 8);
    pdf.text(p.dealProbability || '—', cols[8].x, y + 8);
    pdf.text(truncate(p.location || '', 12), cols[9].x, y + 8);

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

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Total Contract Value (USD): ${fmtCurrency(totalUSD)}`, MARGIN, y);
  y += 14;
  pdf.text(`Total Contract Value (NGN): ${fmtCurrency(totalNGN, '₦')}`, MARGIN, y);

  const safeName = title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  pdf.save(`${safeName}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Single Project Report                                               */
/* ------------------------------------------------------------------ */

export function generateSingleProjectReport(project: Project, teamMap?: Record<string, string>): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pw = 595;
  const m = 40;
  let y = m + 10;

  // Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(project.name, m, y);
  y += 22;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, m, y);
  y += 20;

  // Detail rows
  const addField = (label: string, value: string | undefined | null) => {
    if (!value) return;
    if (y > 780) { pdf.addPage(); y = m + 10; }
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text(label, m, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);
    pdf.text(String(value), m + 130, y);
    y += 16;
  };

  const stageLabel = PIPELINE_STAGES.find(s => s.value === project.pipelineStage)?.label || project.pipelineStage;
  const leadName = project.projectLeadId && teamMap ? (teamMap[String(project.projectLeadId)] || String(project.projectLeadId)) : undefined;

  addField('Status', project.status);
  addField('Pipeline Stage', stageLabel);
  addField('Sector', project.sector);
  addField('Business Segment', project.businessSegment);
  addField('Client', project.clientName);
  addField('Client Contact', project.clientContact);
  addField('Location', project.location);
  addField('OEM', project.oem);
  addField('Product', project.product);
  addField('Sub Product', project.subProduct);
  addField('Channel Partner', project.channelPartner);
  addField('Project Lead', leadName);
  addField('Deal Probability', project.dealProbability);
  addField('Start Date', project.startDate);
  addField('End Date', project.endDate);
  addField('Expected Close', project.expectedCloseDate);

  y += 6;
  pdf.setDrawColor(203, 213, 225);
  pdf.line(m, y, pw - m, y);
  y += 14;

  // Financial
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Financial Details', m, y);
  y += 18;

  addField('Contract Value (USD)', fmtCurrency(project.contractValueUSD));
  addField('Contract Value (NGN)', fmtCurrency(project.contractValueNGN, '₦'));
  addField('Margin % (USD)', project.marginPercentUSD ? `${project.marginPercentUSD}%` : undefined);
  addField('Margin Value (USD)', fmtCurrency(project.marginValueUSD));
  addField('Margin % (NGN)', project.marginPercentNGN ? `${project.marginPercentNGN}%` : undefined);
  addField('Margin Value (NGN)', fmtCurrency(project.marginValueNGN, '₦'));

  // Comments & Support Needed
  if (project.projectLeadComments) {
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Project Lead Comments', m, y);
    y += 14;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(project.projectLeadComments, pw - m * 2);
    pdf.text(lines, m, y);
    y += lines.length * 11 + 8;
  }

  if (project.supportNeeded) {
    if (y > 780) { pdf.addPage(); y = m + 10; }
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Support Needed', m, y);
    y += 14;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(project.supportNeeded, pw - m * 2);
    pdf.text(lines, m, y);
    y += lines.length * 11 + 8;
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
    { label: 'Task Title', x: MARGIN, w: 200 },
    { label: 'Project', x: MARGIN + 200, w: 160 },
    { label: 'Status', x: MARGIN + 360, w: 80 },
    { label: 'Priority', x: MARGIN + 440, w: 70 },
    { label: 'Assignee', x: MARGIN + 510, w: 130 },
    { label: 'Due Date', x: MARGIN + 640, w: 100 },
  ];

  y = drawTableHeader(pdf, cols, y);

  tasks.forEach((t, idx) => {
    y = checkPageBreak(pdf, y, ROW_H + 4);
    if (y < MARGIN + 20) y = drawTableHeader(pdf, cols, y);

    if (idx % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(MARGIN, y - 4, CONTENT_W, ROW_H, 'F');
    }

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);

    const projName = projectMap[t.projectId]?.name || '—';
    const assignee = t.assigneeId ? (teamMap[String(t.assigneeId)] || (typeof t.assignee === 'string' ? t.assignee : 'Unassigned')) : 'Unassigned';
    const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—';

    pdf.text(truncate(t.title, 40), cols[0].x, y + 8);
    pdf.text(truncate(projName, 30), cols[1].x, y + 8);
    pdf.text(t.status || '—', cols[2].x, y + 8);
    pdf.text(t.priority || '—', cols[3].x, y + 8);
    pdf.text(truncate(assignee, 24), cols[4].x, y + 8);
    pdf.text(dueDate, cols[5].x, y + 8);

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

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Status Summary:', MARGIN, y);
  y += 14;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  Object.entries(byStatus).forEach(([status, count]) => {
    pdf.text(`  ${status}: ${count}`, MARGIN, y);
    y += 12;
  });

  pdf.save('tasks-report.pdf');
}
