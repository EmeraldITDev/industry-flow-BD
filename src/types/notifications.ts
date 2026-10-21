import { Project, Task } from './index';

export type NotificationType = 
  | 'task_assigned' 
  | 'status_change' 
  | 'deadline_approaching' 
  | 'comment' 
  | 'stage_change'
  | 'staff_added_to_project'
  | 'project_tagged';

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
  /** Lightweight task summary from the API (may include parent ids for deep links). */
  task?: Pick<Task, 'id' | 'title'> & {
    projectId?: number | string | null;
    partnerId?: number | string | null;
  };
}
