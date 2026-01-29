import { mailService } from './mail';
import { teamService } from './team';

export interface NotificationEvent {
  type: 'project_assigned' | 'task_assigned' | 'project_updated' | 'task_status_changed';
  userId?: string | null;
  userName?: string;
  userEmail?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  taskStatus?: string;
  dueDate?: string;
  message?: string;
}

/**
 * Send notifications to assigned team member
 * Handles both in-app and email notifications
 */
export const notifyAssignment = async (event: NotificationEvent) => {
  try {
    // Skip if no user or user already created the assignment
    if (!event.userId || !event.userEmail) {
      console.log('[Notifications Helper] Skipping notification: no userId or userEmail');
      return;
    }

    // Get user details if not provided
    let recipientName = event.userName;
    let recipientEmail = event.userEmail;

    if (!recipientName) {
      try {
        const teamMember = await teamService.getById(event.userId);
        recipientName = teamMember.name || teamMember.email;
        recipientEmail = teamMember.email || event.userEmail;
      } catch (err) {
        console.warn('[Notifications Helper] Could not fetch team member details:', err);
        recipientName = recipientEmail;
      }
    }

    const currentUser = localStorage.getItem('currentUserName') || 'A team member';

    if (event.type === 'project_assigned') {
      await mailService.notifyProjectAssignment(
        recipientEmail,
        recipientName || event.userEmail,
        event.projectName || 'Untitled Project',
        event.projectId || '',
        currentUser
      );
      console.log('[Notifications Helper] Sent project assignment notification to:', recipientEmail);
    }

    if (event.type === 'task_assigned') {
      await mailService.notifyTaskAssignment(
        recipientEmail,
        recipientName || event.userEmail,
        event.taskTitle || 'Untitled Task',
        event.taskId || '',
        event.projectName || 'Untitled Project',
        event.projectId || '',
        event.dueDate,
        currentUser
      );
      console.log('[Notifications Helper] Sent task assignment notification to:', recipientEmail);
    }
  } catch (error: any) {
    console.error('[Notifications Helper] Error sending notification:', error.message);
    // Don't throw - notifications should not block main operations
  }
};

/**
 * Notify multiple team members of an event
 */
export const notifyMultiple = async (teamMemberIds: string[], event: Omit<NotificationEvent, 'userId'>) => {
  try {
    const notifications = teamMemberIds.map(id => ({
      ...event,
      userId: id,
    }));

    // Send all notifications in parallel (with error handling)
    const results = await Promise.allSettled(
      notifications.map(notif => notifyAssignment(notif as NotificationEvent))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[Notifications Helper] Sent ${successful}/${teamMemberIds.length} notifications`);
  } catch (error: any) {
    console.error('[Notifications Helper] Error notifying team members:', error.message);
  }
};
