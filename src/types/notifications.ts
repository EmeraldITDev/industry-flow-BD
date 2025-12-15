export type NotificationType = 'task_assigned' | 'status_change' | 'deadline_approaching' | 'deadline_overdue' | 'comment' | 'stage_change' | 'inactivity_reminder';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
}
