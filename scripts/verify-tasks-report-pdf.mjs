/**
 * Verify Tasks Report PDF mapping against TaskResource + normalizeTask shapes.
 * Writes scripts/tasks-report-verify.pdf and asserts extracted text.
 */
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');
const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, 'tasks-report-verify.pdf');

const PAGE_W = 1190;
const PAGE_H = 842;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ROW_H = 28;
const HEADER_ROW_H = 32;
const CELL_PAD_LEFT = 4;
const CELL_PAD_RIGHT = 8;

const cellTextWidth = (w) => Math.max(12, w - CELL_PAD_LEFT - CELL_PAD_RIGHT);
const normalizeCellText = (t) => (t || '—').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim() || '—';

function truncateLineToWidth(pdf, line, maxWidth) {
  if (pdf.getTextWidth(line) <= maxWidth) return line;
  const ellipsis = '…';
  let truncated = line;
  while (truncated.length > 0 && pdf.getTextWidth(truncated + ellipsis) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.length > 0 ? truncated + ellipsis : ellipsis;
}

function wrapCellText(pdf, text, maxWidth, maxLines = 8) {
  let lines = pdf.splitTextToSize(normalizeCellText(text), maxWidth);
  lines = lines
    .flatMap((line) =>
      pdf.getTextWidth(line) <= maxWidth ? [line] : pdf.splitTextToSize(line, maxWidth * 0.92)
    )
    .map((line) => truncateLineToWidth(pdf, line, maxWidth));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = truncateLineToWidth(pdf, lines[maxLines - 1].replace(/\u2026$/, ''), maxWidth);
  }
  return lines.length > 0 ? lines : ['—'];
}

function drawCellLines(pdf, lines, x, y, lineHeight, firstLineOffset = 14) {
  lines.forEach((line, index) => {
    pdf.text(line, x + CELL_PAD_LEFT, y + firstLineOffset + index * lineHeight);
  });
}

function fmtDateValue(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// --- Mirrors reportGenerator.ts resolvers + normalizeTask output ---
function normalizeTask(task) {
  const assigneesRaw = task.assignees ?? [];
  const assigneeIdsFromList = Array.isArray(assigneesRaw)
    ? assigneesRaw.map((a) => String(a.id ?? a.user_id ?? a)).filter(Boolean)
    : [];
  const assigneeIdsRaw = task.assigneeIds ?? task.assignee_ids ?? assigneeIdsFromList;
  const assigneeIds = (Array.isArray(assigneeIdsRaw) ? assigneeIdsRaw : [])
    .map((id) => String(id))
    .filter(Boolean);
  const primaryAssigneeId = task.assignee_id || task.assigneeId || assigneeIds[0];
  if (primaryAssigneeId && !assigneeIds.includes(String(primaryAssigneeId))) {
    assigneeIds.unshift(String(primaryAssigneeId));
  }
  const nestedAssignee = task.assignee;
  const assigneeLabel =
    typeof nestedAssignee === 'string'
      ? nestedAssignee
      : nestedAssignee?.name ||
        (Array.isArray(assigneesRaw)
          ? assigneesRaw.map((a) => a.name).filter(Boolean).join(', ')
          : undefined);
  return {
    ...task,
    id: String(task.id),
    title: task.title,
    status: task.status === 'in_progress' ? 'in-progress' : task.status === 'in_review' ? 'review' : task.status,
    projectId: task.project_id != null || task.projectId != null ? String(task.project_id ?? task.projectId) : undefined,
    partnerId: task.partner_id != null || task.partnerId != null ? String(task.partner_id ?? task.partnerId) : undefined,
    assigneeId: primaryAssigneeId != null && primaryAssigneeId !== '' ? String(primaryAssigneeId) : undefined,
    assigneeIds,
    assignee: assigneeLabel,
    assignees: Array.isArray(assigneesRaw)
      ? assigneesRaw.map((a) => ({ id: String(a.id ?? ''), name: a.name, email: a.email }))
      : undefined,
    dueDate: task.due_date || task.dueDate,
    priority: task.priority,
  };
}

function resolveTaskTitle(task) {
  const title = typeof task.title === 'string' ? task.title.trim() : '';
  return title || '—';
}

function resolveTaskProjectName(task, projectMap, partnerMap = {}) {
  if (task.projectId != null && String(task.projectId) !== '') {
    return projectMap[String(task.projectId)]?.name || 'No project';
  }
  if (task.partnerId != null && String(task.partnerId) !== '' && partnerMap) {
    return partnerMap[String(task.partnerId)] || 'No project';
  }
  return 'No project';
}

function resolveTaskAssigneeName(task, teamMap) {
  const assigneeIds = [
    ...(task.assigneeIds ?? []),
    ...(task.assigneeId != null && String(task.assigneeId) !== '' ? [String(task.assigneeId)] : []),
  ].filter((id, index, arr) => id && arr.indexOf(id) === index);

  if (assigneeIds.length > 0) {
    const names = assigneeIds
      .map((id) => teamMap[String(id)])
      .filter((name) => Boolean(name && name.trim()));
    if (names.length > 0) return names.join(', ');
  }
  if (typeof task.assignee === 'string' && task.assignee.trim()) return task.assignee.trim();
  const fromAssignees = (task.assignees ?? [])
    .map((entry) => (typeof entry === 'string' ? entry : entry?.name))
    .filter((name) => Boolean(name && String(name).trim()))
    .map((name) => String(name).trim());
  if (fromAssignees.length > 0) return fromAssignees.join(', ');
  return 'Unassigned';
}

// Representative RAW TaskResource payloads (before normalizeTask)
const rawApiTasks = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  title:
    i === 0
      ? 'Very long task title that should wrap across multiple lines in the Task Title column of the PDF report'
      : `Task Title ${i + 1}: Prepare commercial proposal`,
  status: ['todo', 'in_progress', 'in_review', 'completed'][i % 4],
  priority: ['low', 'medium', 'high', 'urgent'][i % 4],
  projectId: i % 7 === 0 ? null : (i % 5) + 1,
  partnerId: i % 7 === 0 ? 91 : null,
  assigneeId: i % 6 === 0 ? null : (i % 4) + 10,
  assigneeIds: i % 6 === 0 ? [] : [(i % 4) + 10],
  dueDate: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
  assignee:
    i % 6 === 0
      ? null
      : {
          id: (i % 4) + 10,
          name: ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson'][i % 4],
          email: 'user@example.test',
        },
  assignees:
    i % 6 === 0
      ? []
      : [
          {
            id: (i % 4) + 10,
            name: ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson'][i % 4],
            email: 'user@example.test',
          },
        ],
}));

const tasks = rawApiTasks.map(normalizeTask);
const sampleObject = tasks[1];
console.log('--- SAMPLE NORMALIZED TASK (index 1) ---');
console.log(JSON.stringify(sampleObject, null, 2));
console.log('--- MAPPED CELLS ---');
const projectMap = {
  '1': { name: 'Alpha Power Plant' },
  '2': { name: 'Beta Grid Upgrade' },
  '3': { name: 'Gamma Substation' },
  '4': { name: 'Delta Transmission' },
  '5': { name: 'Epsilon Distribution' },
};
const partnerMap = { '91': 'Partner Co' };
const teamMap = {
  '10': 'Ada Lovelace',
  '11': 'Grace Hopper',
  '12': 'Alan Turing',
  '13': 'Katherine Johnson',
};
console.log({
  title: resolveTaskTitle(sampleObject),
  project: resolveTaskProjectName(sampleObject, projectMap, partnerMap),
  status: sampleObject.status,
  priority: sampleObject.priority,
  assignee: resolveTaskAssigneeName(sampleObject, teamMap),
  dueDate: sampleObject.dueDate ? fmtDateValue(sampleObject.dueDate) : '—',
});

function drawTableHeader(pdf, columns, y, fontSize = 13) {
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'bold');
  const lineH = fontSize * 1.2;
  const wrapped = columns.map((col) => wrapCellText(pdf, col.label, cellTextWidth(col.w), 3));
  const maxLines = Math.max(1, ...wrapped.map((lines) => lines.length));
  const rowH = Math.max(HEADER_ROW_H, maxLines * lineH + 12);
  pdf.setFillColor(241, 245, 249);
  pdf.rect(MARGIN, y - 4, CONTENT_W, rowH, 'F');
  pdf.setTextColor(51, 65, 85);
  wrapped.forEach((lines, i) => drawCellLines(pdf, lines, columns[i].x, y, lineH, fontSize));
  return y + rowH + 4;
}

function checkPageBreak(pdf, y, needed) {
  if (y + needed > PAGE_H - MARGIN) {
    pdf.addPage();
    return MARGIN + 10;
  }
  return y;
}

const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PAGE_W, PAGE_H] });
let y = MARGIN + 10;
pdf.setFontSize(24);
pdf.setFont('helvetica', 'bold');
pdf.text('Tasks Report', MARGIN, y);
y += 40;

const cols = [
  { label: 'Task Title', x: MARGIN, w: 280 },
  { label: 'Project', x: MARGIN + 280, w: 220 },
  { label: 'Status', x: MARGIN + 500, w: 100 },
  { label: 'Priority', x: MARGIN + 600, w: 90 },
  { label: 'Assignee', x: MARGIN + 690, w: 200 },
  { label: 'Due Date', x: MARGIN + 890, w: 110 },
];
const bodyFont = 11;
const lineH = bodyFont * 1.3;
y = drawTableHeader(pdf, cols, y);

tasks.forEach((t, idx) => {
  pdf.setFontSize(bodyFont);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);
  const cellValues = [
    resolveTaskTitle(t),
    resolveTaskProjectName(t, projectMap, partnerMap),
    t.status || '—',
    t.priority || '—',
    resolveTaskAssigneeName(t, teamMap),
    t.dueDate ? fmtDateValue(t.dueDate) : '—',
  ];
  const wrappedCells = cellValues.map((value, i) =>
    wrapCellText(pdf, value, cellTextWidth(cols[i].w), i === 0 || i === 1 || i === 4 ? 3 : 2)
  );
  const maxLines = Math.max(1, ...wrappedCells.map((lines) => lines.length));
  const rowH = Math.max(ROW_H, maxLines * lineH + 10);
  y = checkPageBreak(pdf, y, rowH + 4);
  if (y < MARGIN + 20) {
    y = drawTableHeader(pdf, cols, y);
    pdf.setFontSize(bodyFont);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);
  }
  if (idx % 2 === 0) {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(MARGIN, y - 4, CONTENT_W, rowH, 'F');
  }
  wrappedCells.forEach((lines, i) => {
    drawCellLines(pdf, lines, cols[i].x, y, lineH, bodyFont + 3);
  });
  y += rowH;
});

writeFileSync(outPath, Buffer.from(pdf.output('arraybuffer')));
console.log('Wrote', outPath);

const py = `
from pypdf import PdfReader
path = r"${outPath}"
reader = PdfReader(path)
text = "\\n".join((page.extract_text() or "") for page in reader.pages)
print(text[:3500])
print("---CHECKS---")
import json
checks = {
  "pages": len(reader.pages),
  "rows": 50,
  "has_long_title": "Very long task title" in text,
  "has_title_2": "Task Title 2" in text,
  "has_project": "Beta Grid Upgrade" in text,
  "has_assignee": "Grace Hopper" in text,
  "has_status": "in-progress" in text,
  "has_priority": "medium" in text,
  "has_due": "Nov" in text,
  "has_unassigned": "Unassigned" in text,
  "title_count": text.count("Task Title"),
}
print(json.dumps(checks))
failed = [k for k, ok in {
  "title": checks["has_long_title"] and checks["has_title_2"],
  "project": checks["has_project"],
  "assignee": checks["has_assignee"],
  "status": checks["has_status"],
  "priority": checks["has_priority"],
}.items() if not ok]
raise SystemExit("FAILED " + ",".join(failed) if failed else "PASSED")
`;
const result = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exit(result.status ?? 1);
