import api from './api';

export type EmailTemplate = 
  | 'project_assigned' 
  | 'task_assigned' 
  | 'project_updated' 
  | 'task_completed' 
  | 'milestone_reached'
  | 'deadline_reminder';

export interface EmailNotification {
  id?: string;
  recipientEmail: string;
  recipientName?: string;
  template: EmailTemplate;
  subject: string;
  data: {
    [key: string]: any;
    projectName?: string;
    taskTitle?: string;
    assignerName?: string;
    dueDate?: string;
    projectUrl?: string;
    taskUrl?: string;
  };
  scheduledFor?: string; // ISO date string for delayed sending
  priority?: 'high' | 'normal' | 'low';
}

export interface MailConfig {
  from_email: string;
  from_name: string;
  reply_to_email?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  notification_enabled: boolean;
}

export const mailService = {
  // Send an email notification
  send: async (notification: EmailNotification): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
      console.log('[Mail Service] Sending email notification:', {
        to: notification.recipientEmail,
        template: notification.template,
        subject: notification.subject,
      });

      const response = await api.post('/api/mail/send', {
        recipientEmail: notification.recipientEmail,
        recipientName: notification.recipientName || notification.recipientEmail,
        template: notification.template,
        subject: notification.subject,
        data: notification.data,
        scheduledFor: notification.scheduledFor,
        priority: notification.priority || 'normal',
      });

      return {
        success: true,
        messageId: response.data?.messageId || response.data?.id,
      };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      console.error('[Mail Service] Failed to send email:', {
        to: notification.recipientEmail,
        template: notification.template,
        error: message,
      });
      return {
        success: false,
        error: message,
      };
    }
  },

  // Send bulk notifications to multiple recipients
  sendBulk: async (notifications: EmailNotification[]): Promise<{ successful: number; failed: number; errors: string[] }> => {
    const results = await Promise.allSettled(
      notifications.map(notif => mailService.send(notif))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || r.value?.success === false).length;
    const errors = results
      .filter(r => r.status === 'rejected' || r.value?.success === false)
      .map((r, idx) => {
        if (r.status === 'rejected') return `Notification ${idx}: ${r.reason?.message}`;
        return `Notification ${idx}: ${(r as PromiseFulfilledResult<any>).value?.error}`;
      });

    console.log('[Mail Service] Bulk send complete:', { successful, failed, total: notifications.length });
    return { successful, failed, errors };
  },

  // Get mail configuration
  getConfig: async (): Promise<MailConfig> => {
    try {
      const response = await api.get('/api/mail/config');
      return response.data?.data ?? response.data;
    } catch (error: any) {
      console.error('[Mail Service] Failed to get mail config:', error.message);
      return {
        from_email: 'noreply@industryflow.local',
        from_name: 'Industry Flow',
        notification_enabled: false,
      };
    }
  },

  // Check if notifications are enabled
  isEnabled: async (): Promise<boolean> => {
    try {
      const config = await mailService.getConfig();
      return config.notification_enabled === true;
    } catch {
      return false;
    }
  },

  // Send project assignment notification
  notifyProjectAssignment: async (
    recipientEmail: string,
    recipientName: string,
    projectName: string,
    projectId: string,
    assignerName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const isEnabled = await mailService.isEnabled();
    if (!isEnabled) {
      console.log('[Mail Service] Notifications disabled, skipping project assignment email');
      return { success: false, error: 'Notifications disabled' };
    }

    const projectUrl = `${window.location.origin}/projects/${projectId}`;
    return mailService.send({
      recipientEmail,
      recipientName,
      template: 'project_assigned',
      subject: `You've been assigned to project: ${projectName}`,
      data: {
        projectName,
        projectId,
        projectUrl,
        assignerName: assignerName || 'A team member',
        recipientName: recipientName || recipientEmail,
      },
      priority: 'high',
    });
  },

  // Send task assignment notification
  notifyTaskAssignment: async (
    recipientEmail: string,
    recipientName: string,
    taskTitle: string,
    taskId: string,
    projectName: string,
    projectId: string,
    dueDate?: string,
    assignerName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const isEnabled = await mailService.isEnabled();
    if (!isEnabled) {
      console.log('[Mail Service] Notifications disabled, skipping task assignment email');
      return { success: false, error: 'Notifications disabled' };
    }

    const projectUrl = `${window.location.origin}/projects/${projectId}`;
    const taskUrl = `${window.location.origin}/projects/${projectId}?taskId=${taskId}`;
    
    return mailService.send({
      recipientEmail,
      recipientName,
      template: 'task_assigned',
      subject: `New task assigned: ${taskTitle}`,
      data: {
        taskTitle,
        taskId,
        taskUrl,
        projectName,
        projectId,
        projectUrl,
        dueDate: dueDate || 'Not specified',
        assignerName: assignerName || 'A team member',
        recipientName: recipientName || recipientEmail,
      },
      priority: 'high',
    });
  },

  // Send deadline reminder
  notifyDeadlineReminder: async (
    recipientEmail: string,
    recipientName: string,
    taskTitle: string,
    dueDate: string,
    projectName: string,
    projectId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const isEnabled = await mailService.isEnabled();
    if (!isEnabled) {
      console.log('[Mail Service] Notifications disabled, skipping deadline reminder');
      return { success: false, error: 'Notifications disabled' };
    }

    const projectUrl = `${window.location.origin}/projects/${projectId}`;
    return mailService.send({
      recipientEmail,
      recipientName,
      template: 'deadline_reminder',
      subject: `Deadline reminder: ${taskTitle}`,
      data: {
        taskTitle,
        dueDate,
        projectName,
        projectId,
        projectUrl,
        recipientName: recipientName || recipientEmail,
      },
      priority: 'high',
    });
  },
};
