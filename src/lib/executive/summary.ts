import type { ExecutiveSummary } from './analytics';

export interface AttentionTaskLike {
  id: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string | null;
  projectId?: string;
  projectName?: string;
  client?: string;
  businessVertical?: string;
  assignee?: string;
}

function emptySummary(): ExecutiveSummary {
  return {
    kpiMovements: [],
    attentionOpportunities: [],
    chairmanTasks: [],
    strategicAccountUpdates: [],
    recentWindowDays: 7,
  };
}

export function attentionOpportunitiesFromTasks(
  tasks: AttentionTaskLike[]
): ExecutiveSummary['attentionOpportunities'] {
  const byProject = new Map<string, AttentionTaskLike[]>();
  for (const task of tasks) {
    if (!task.projectId) continue;
    const list = byProject.get(task.projectId) ?? [];
    list.push(task);
    byProject.set(task.projectId, list);
  }

  return Array.from(byProject.entries())
    .map(([projectId, projectTasks]) => {
      const sorted = [...projectTasks].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      const first = sorted[0];
      const dueTask = sorted.find((t) => t.dueDate);
      return {
        projectId,
        projectName: first.projectName || 'Untitled opportunity',
        client: first.client ?? null,
        businessVertical: first.businessVertical ?? null,
        openTaskCount: projectTasks.length,
        earliestDueDate: dueTask?.dueDate ?? null,
        topTaskTitle: first.title ?? null,
        topTaskPriority: first.priority ?? null,
      };
    })
    .sort((a, b) => {
      if (!a.earliestDueDate && !b.earliestDueDate) return 0;
      if (!a.earliestDueDate) return 1;
      if (!b.earliestDueDate) return -1;
      return a.earliestDueDate.localeCompare(b.earliestDueDate);
    })
    .slice(0, 6);
}

function tasksToChairmanRows(tasks: AttentionTaskLike[]): ExecutiveSummary['chairmanTasks'] {
  return tasks.slice(0, 8).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    projectId: t.projectId,
    projectName: t.projectName,
    client: t.client,
    businessVertical: t.businessVertical,
    assignee: t.assignee,
  }));
}

/** Normalize API / fallback summary; hydrate attention lists from Phase 3.3 tasks when missing. */
export function normalizeExecutiveSummary(
  raw: unknown,
  attentionFallback: AttentionTaskLike[] = []
): ExecutiveSummary {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ...emptySummary(),
      attentionOpportunities: attentionOpportunitiesFromTasks(attentionFallback),
      chairmanTasks: tasksToChairmanRows(attentionFallback),
    };
  }

  const data = raw as Record<string, unknown>;
  const attentionOpportunities = Array.isArray(data.attentionOpportunities)
    ? (data.attentionOpportunities as ExecutiveSummary['attentionOpportunities'])
    : attentionOpportunitiesFromTasks(attentionFallback);
  const chairmanTasks = Array.isArray(data.chairmanTasks)
    ? (data.chairmanTasks as ExecutiveSummary['chairmanTasks'])
    : tasksToChairmanRows(attentionFallback);

  return {
    kpiMovements: Array.isArray(data.kpiMovements)
      ? (data.kpiMovements as ExecutiveSummary['kpiMovements'])
      : [],
    attentionOpportunities,
    chairmanTasks,
    strategicAccountUpdates: Array.isArray(data.strategicAccountUpdates)
      ? (data.strategicAccountUpdates as ExecutiveSummary['strategicAccountUpdates'])
      : [],
    recentWindowDays: Number(data.recentWindowDays ?? 7) || 7,
  };
}
