import type { User } from '@/types/auth';
import type { Task } from '@/types';

const normalizeComparable = (value: unknown) => String(value ?? '').trim().toLowerCase();

/**
 * Whether a task belongs to the given user (assignee match by id / name / email).
 * Tasks have no created_by column; assignee is the ownership signal available.
 */
export function isTaskOwnedByUser(task: Task | null | undefined, user: User | null | undefined): boolean {
  if (!task || !user) return false;

  const userId = normalizeComparable(user.id);
  const userName = normalizeComparable(user.name);
  const userEmail = normalizeComparable(user.email);

  const raw = task as Task & {
    assignee_id?: string | number;
    assignee_name?: string;
    assignee_email?: string;
    assigned_to?: string | number;
    assigned_to_name?: string;
    assigned_to_email?: string;
    created_by?: string | number;
    createdBy?: string | number;
    creator_id?: string | number;
    creatorId?: string | number;
  };

  const idCandidates = [
    task.assigneeId,
    ...(task.assigneeIds ?? []),
    raw.assignee_id,
    raw.assigned_to,
    raw.created_by,
    raw.createdBy,
    raw.creator_id,
    raw.creatorId,
  ]
    .map(normalizeComparable)
    .filter(Boolean);

  if (userId && idCandidates.some((c) => c === userId)) return true;

  const nameCandidates = [task.assignee, raw.assignee_name, raw.assigned_to_name]
    .map(normalizeComparable)
    .filter(Boolean);

  if (userName && nameCandidates.some((c) => c === userName)) return true;

  const emailCandidates = [raw.assignee_email, raw.assigned_to_email]
    .map(normalizeComparable)
    .filter(Boolean);

  if (userEmail && emailCandidates.some((c) => c === userEmail)) return true;

  // Nested assignee object / multi-assignee list from API
  const nested = (task as any).assignee;
  if (nested && typeof nested === 'object') {
    if (userId && normalizeComparable(nested.id) === userId) return true;
    if (userEmail && normalizeComparable(nested.email) === userEmail) return true;
    if (userName && normalizeComparable(nested.name) === userName) return true;
  }

  const assignees = task.assignees ?? [];
  for (const a of assignees) {
    if (typeof a === 'string') {
      if (userName && normalizeComparable(a) === userName) return true;
      continue;
    }
    if (userId && normalizeComparable(a.id) === userId) return true;
    if (userEmail && normalizeComparable(a.email) === userEmail) return true;
    if (userName && normalizeComparable(a.name) === userName) return true;
  }

  return false;
}

export function isProjectOwnedByUser(
  project: {
    projectLeadId?: string | number | null;
    assigneeId?: string | number | null;
    project_lead_id?: string | number | null;
    assignee_id?: string | number | null;
    salesLead?: string | null;
  },
  user: User | null | undefined
): boolean {
  if (!user) return false;
  const userId = normalizeComparable(user.id);
  const userName = normalizeComparable(user.name);

  const leadIds = [project.projectLeadId, project.project_lead_id, project.assigneeId, project.assignee_id]
    .map(normalizeComparable)
    .filter(Boolean);

  if (userId && leadIds.some((c) => c === userId)) return true;
  if (userName && normalizeComparable(project.salesLead) === userName) return true;
  return false;
}
