import type { Task } from '@/types';

type TaskLinkSource = {
  id?: string | number | null;
  projectId?: string | number | null;
  partnerId?: string | number | null;
  project_id?: string | number | null;
  partner_id?: string | number | null;
};

/**
 * Build an in-app path that opens the task on its parent project or partner page.
 * Returns null when the parent cannot be determined (avoids 404 routes).
 */
export function getTaskDeepLink(
  task: TaskLinkSource | Task | null | undefined,
  taskIdOverride?: string | number | null,
): string | null {
  if (!task && (taskIdOverride == null || taskIdOverride === '')) return null;

  const taskId = String(taskIdOverride ?? task?.id ?? '').trim();
  if (!taskId) return null;

  const projectId = task?.projectId ?? task?.project_id;
  if (projectId != null && String(projectId).trim() !== '') {
    return `/projects/${projectId}?taskId=${encodeURIComponent(taskId)}`;
  }

  const partnerId = task?.partnerId ?? task?.partner_id;
  if (partnerId != null && String(partnerId).trim() !== '') {
    return `/partners/${partnerId}?taskId=${encodeURIComponent(taskId)}`;
  }

  return null;
}
