import { Project, Task } from './index';

export type NotificationType = 
  | 'task_assigned' 
  | 'status_change' 
  | 'deadline_approaching' 
  | 'comment' 
  | 'stage_change';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  projectId: number | null;
  taskId: number | null;
  metadata: Record<string, any> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  task?: Task;
}
