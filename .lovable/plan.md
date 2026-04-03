

# Full Implementation Plan

## Overview
Nine deliverables: build error fix, "Support Needed" field (full stack), filtered PDF report exports for Projects/Tasks, dashboard chart label improvements, dashboard PDF export with numeric summaries, and replacing Pipeline by Sales Lead with a table layout.

---

## 1. Fix Build Error in `dashboardExport.ts`

**File:** `src/lib/dashboardExport.ts`

Cast SVG elements before accessing `.style`:
- `querySelectorAll('svg rect')` → cast each to `SVGElement` (or `HTMLElement`) before `.style` access
- Same for `svg path` and `svg circle` selectors
- Use `(rect as SVGElement).style.setProperty(...)` pattern

---

## 2. "Support Needed" — Full Stack

### Backend

**New migration** (`database/migrations/2026_03_17_000002_add_support_needed_to_projects.php`):
- Add nullable `text` column `support_needed` to `projects` table

**`app/Models/Project.php`:**
- Add `'support_needed'` to `$fillable`

**`app/Http/Controllers/ProjectController.php`:**
- Add `'support_needed' => 'nullable|string'` to `store()` validation rules
- Add same validation to `update()` method (currently has no validation — add `support_needed` to accepted fields via `convertCamelCaseToSnakeCase` which already handles this automatically)

### Frontend

**`src/types/index.ts`:**
- Add `supportNeeded?: string` to `Project` interface

**`src/services/projects.ts`:**
- Add `supportNeeded?: string` to `CreateProjectData` and `UpdateProjectData`
- Add to `normalizeProject`: `supportNeeded: project.supportNeeded ?? project.support_needed ?? ''`

**`src/pages/NewProject.tsx`:**
- Add `supportNeeded: ''` to form state
- Add Textarea field after "Project Lead Comments" card, labeled "Support Needed"
- Include in submit payload: `supportNeeded: formData.supportNeeded || undefined`

**`src/pages/EditProject.tsx`:**
- Add `supportNeeded: ''` to form state
- Load from existing data: `supportNeeded: data.supportNeeded ?? data.support_needed ?? ''`
- Add same Textarea after Project Lead Comments
- Include in submit payload

**`src/pages/ProjectDetail.tsx`:**
- Display "Support Needed" below "Project Lead Comments" in the About card, same pattern (conditional render)

---

## 3. Project PDF Report Export

**New file:** `src/lib/reportGenerator.ts`

Shared utility using `jsPDF` (already installed) to generate structured PDF reports:
- Functions: `generateProjectsReport(projects, filters, title)` and `generateTasksReport(tasks, filters)`
- Report structure: title, date, filter summary, record count, paginated table
- Table columns for projects: Name, Client, Sector, Stage, Status, Contract Value USD, Contract Value NGN, Deal Probability
- Proper alignment, alternating row backgrounds, number formatting with commas, page breaks
- Helper: `addTablePage()` for pagination when rows exceed page height

**`src/pages/Projects.tsx`:**
- Add "Generate Report" button (with `FileText` icon) in header toolbar next to existing buttons
- On click, call `generateProjectsReport()` with `filteredProjects` and current `filters` state
- Filter summary in PDF shows which filters are active

**`src/pages/ProjectDetail.tsx`:**
- Add a "Generate Report" button on the individual project view
- Generates a single-project PDF with all project details laid out cleanly

---

## 4. Task PDF Report Export

**`src/pages/AllTasks.tsx`:**
- Add "Generate Report" button in the header area
- On click, call `generateTasksReport()` with currently filtered tasks
- PDF table columns: Title, Project, Status, Priority, Assignee, Due Date
- Filter summary shows active status/priority/project/assignee filters

---

## 5. Dashboard Chart Values — Visible on Screen

Add Recharts `LabelList` to show values directly on charts:

**`src/components/dashboard/TopClientsByValue.tsx`:**
- Add `<LabelList>` to the `<Bar>` component showing dollar values at end of each bar

**`src/components/dashboard/SegmentBreakdown.tsx`:**
- Add `<LabelList>` showing count on top of each bar

**`src/components/dashboard/ProbabilityMixDonut.tsx`:**
- Add a summary table below the donut: columns for color swatch, stage name, count
- Use Recharts `label` prop on `<Pie>` to show count on larger slices

**`src/components/dashboard/ProductCategoryMixDonut.tsx`:**
- Same approach: label on pie slices + summary table below

---

## 6. Replace Pipeline by Sales Lead

**`src/components/dashboard/PipelineBySalesLead.tsx`:**
- Remove the horizontal bar chart entirely
- Replace with a styled data table matching the reference image layout:
  - Columns: Account (client name), Location, Account Owner (sales lead), Total Opportunities (count)
  - Summary row at bottom with total count
  - Clean table styling with alternating rows, header row, proper borders

**`src/pages/Dashboard.tsx`:**
- Update the data passed to `PipelineBySalesLead` — instead of `{ lead, value }[]`, pass the full project-level data grouped by client:
  - Group `filteredProjects` by `clientName`
  - For each client: resolve location, account owner (lead name), and opportunity count
- Update the props interface accordingly

---

## 7. Dashboard PDF Export Enhancement

**`src/components/dashboard/DashboardVisualExport.tsx`:**
- Update the PDF export flow to append a numeric summary page after the chart screenshot
- For each visual type, include a written legend/summary:
  - Bar charts: list each bar label + exact value
  - Donut charts: list each segment name, color hex, count/value
- This ensures PDF exports remain readable even without hover

**`src/lib/dashboardExport.ts`:**
- After the existing html2canvas capture, add a second page to the jsPDF with structured text summaries
- Accept optional `summaryData` parameter for chart metadata

---

## Files Modified Summary

| File | Action |
|------|--------|
| `src/lib/dashboardExport.ts` | Fix TS casts; add summary page support |
| `src/lib/reportGenerator.ts` | **New** — shared PDF report utility |
| `src/types/index.ts` | Add `supportNeeded` |
| `src/services/projects.ts` | Add `supportNeeded` to types + normalizer |
| `src/pages/NewProject.tsx` | Add Support Needed field |
| `src/pages/EditProject.tsx` | Add Support Needed field |
| `src/pages/ProjectDetail.tsx` | Display Support Needed + single-project report button |
| `src/pages/Projects.tsx` | Add Generate Report button |
| `src/pages/AllTasks.tsx` | Add Generate Report button |
| `src/components/dashboard/TopClientsByValue.tsx` | Add LabelList |
| `src/components/dashboard/SegmentBreakdown.tsx` | Add LabelList |
| `src/components/dashboard/ProbabilityMixDonut.tsx` | Add labels + summary table |
| `src/components/dashboard/ProductCategoryMixDonut.tsx` | Add labels + summary table |
| `src/components/dashboard/PipelineBySalesLead.tsx` | Replace chart with data table |
| `src/components/dashboard/DashboardVisualExport.tsx` | Enhance PDF with summaries |
| `src/pages/Dashboard.tsx` | Update data shape for new Sales Lead table |
| `app/Models/Project.php` | Add `support_needed` to fillable |
| `app/Http/Controllers/ProjectController.php` | Add `support_needed` to validation |
| `database/migrations/...` | **New** — add `support_needed` column |

