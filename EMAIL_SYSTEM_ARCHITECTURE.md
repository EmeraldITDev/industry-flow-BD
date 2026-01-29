# Email Notification System - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/TypeScript)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐        ┌──────────────────────┐      │
│  │  Settings Page       │        │ Project/Task Pages   │      │
│  │  (Email Config UI)   │        │ (Assignment Forms)   │      │
│  └──────────────────────┘        └──────────────────────┘      │
│           │                                    │                │
│           │                                    │                │
│           └──────────────┬─────────────────────┘                │
│                          │                                      │
│                          ▼                                      │
│           ┌──────────────────────────────┐                     │
│           │  Services Layer              │                     │
│           ├──────────────────────────────┤                     │
│           │ - projects.ts                │                     │
│           │ - tasks.ts                   │                     │
│           │ - mail.ts (new)              │                     │
│           │ - notificationHelper.ts (new)│                     │
│           └──────────────────────────────┘                     │
│                          │                                      │
│                          ▼                                      │
│           ┌──────────────────────────────┐                     │
│           │  API Client (Axios)          │                     │
│           │  + Auth Token Interceptor    │                     │
│           └──────────────────────────────┘                     │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           │ HTTP Requests
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      BACKEND (Laravel)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ API Routes                                                 │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ POST /api/mail/send          ← Send email notification    │ │
│  │ GET  /api/mail/config        ← Get mail settings          │ │
│  │ POST /api/mail/config        ← Update mail settings       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Mail Service                                               │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ - Queue job or immediate send                             │ │
│  │ - Build email from template                               │ │
│  │ - Log transaction                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Email Templates (Blade)                                    │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ - project_assigned.blade.php                              │ │
│  │ - task_assigned.blade.php                                 │ │
│  │ - deadline_reminder.blade.php                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Mail Driver (SMTP/Mailgun/SendGrid/etc)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          │                                        │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           │ SMTP / API
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              EMAIL SERVICE (Gmail/Mailgun/etc)                   │
├──────────────────────────────────────────────────────────────────┤
│ Delivers email to recipient inbox                                │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### 1. Configuration Flow
```
User in Settings (Email tab)
  ↓
Fill configuration form
  ↓
Click "Save Settings"
  ↓
mailService.getConfig() → GET /api/mail/config
  ↓
Display current settings
  ↓
User updates fields
  ↓
POST /api/mail/config with new settings
  ↓
Backend updates config
  ↓
Success toast message
```

### 2. Notification Trigger Flow
```
User creates/edits Project or Task with assignment
  ↓
projectsService.create(data)
  or
projectsService.update(id, data, originalProject)
  or
tasksService.create(data)
  or
tasksService.update(id, data, originalTask)
  ↓
API returns successful response
  ↓
notifyAssignment() called automatically
  ↓
Check if assignee changed or newly assigned
  ↓
Build notification object
  ↓
mailService.send(notification)
  ↓
POST /api/mail/send with email details
  ↓
Backend queues email job
  ↓
Mail driver (SMTP) delivers email
  ↓
Recipient receives notification
```

### 3. Test Email Flow
```
User in Settings (Email tab)
  ↓
Click "Send Test Email"
  ↓
mailService.send({
  recipientEmail: fromEmail,
  template: 'project_assigned',
  subject: 'Test Email - Industry Flow'
})
  ↓
POST /api/mail/send
  ↓
Backend renders template
  ↓
Sends test email to configured address
  ↓
Success/Error response
  ↓
Toast notification to user
```

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────┐
│           Settings Page                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  MailNotificationSettings Component (NEW)        │  │
│  │                                                   │  │
│  │  - Load config on mount                         │  │
│  │  - Show form with enable toggle                 │  │
│  │  - Email/SMTP configuration inputs              │  │
│  │  - Save/Test/Reset buttons                      │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│          ┌────────────────────────────┐                │
│          │   mailService              │                │
│          ├────────────────────────────┤                │
│          │ - getConfig()              │                │
│          │ - send()                   │                │
│          │ - sendBulk()               │                │
│          │ - notifyProjectAssignment()│                │
│          │ - notifyTaskAssignment()   │                │
│          │ - notifyDeadlineReminder() │                │
│          └────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           Project/Task Pages                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  EditProject / EditTask / NewProject / NewTask   │  │
│  │                                                   │  │
│  │  - Fill form with project/task details          │  │
│  │  - Select assignee                              │  │
│  │  - Submit form                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│        ┌──────────────────────────────────┐            │
│        │  projectsService / tasksService  │            │
│        ├──────────────────────────────────┤            │
│        │ - create()                       │            │
│        │ - update()                       │            │
│        │ - assign()                       │            │
│        │  ↓ calls notifyAssignment()      │            │
│        │  ↓ on assignment change          │            │
│        └──────────────────────────────────┘            │
│                          │                              │
│                          ▼                              │
│       ┌────────────────────────────────┐               │
│       │  notificationHelper (NEW)      │               │
│       ├────────────────────────────────┤               │
│       │ - notifyAssignment()           │               │
│       │ - notifyMultiple()             │               │
│       │ - Fetch team member details    │               │
│       │ - Call mailService             │               │
│       └────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

## State Management

### MailNotificationSettings Component State
```
{
  config: MailConfig | null           // Current saved config
  isLoading: boolean                  // Loading from server
  isSaving: boolean                   // Saving to server
  formData: MailConfig | null         // Form being edited
}

MailConfig {
  from_email: string
  from_name: string
  reply_to_email?: string
  notification_enabled: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_username?: string
}
```

### Notification Trigger State
```
When assignment changes:
{
  originalTask/Project: Task | Project   // Before update
  newAssigneeId: string                  // New assignee
  userId: string                         // ID of new assignee
  userName: string                       // Name of new assignee
  userEmail: string                      // Email of new assignee
}
```

## Error Handling Flow

```
User Action
  ↓
try {
  ├─ API Call
  │  ├─ Success ✓ → Continue
  │  └─ Error
  │     ├─ 401 → Not authenticated
  │     ├─ 500 → Server error
  │     └─ Other → Show error message
  │
  ├─ Return Response
  └─ No throw (non-blocking)
} catch (error) {
  ├─ Log error
  ├─ Console error output
  ├─ Return { success: false, error: message }
  └─ Don't block main operation
}
```

## Notification Event Types

```
NotificationEvent {
  type: 'project_assigned'          // Project lead/assignee added
         'task_assigned'            // Task assignee added
         'project_updated'          // Project details changed
         'task_status_changed'      // Task status updated
  
  userId?: string                   // ID of recipient
  userName?: string                 // Name of recipient
  userEmail?: string                // Email of recipient
  
  projectId?: string                // Associated project
  projectName?: string              // Project display name
  
  taskId?: string                   // Associated task
  taskTitle?: string                // Task display name
  taskStatus?: string               // New task status
  
  dueDate?: string                  // Task due date
  message?: string                  // Custom message
}
```

## Email Template Variables

```
project_assigned.blade.php
├─ recipientName
├─ assignerName
├─ projectName
├─ projectUrl
└─ projectId

task_assigned.blade.php
├─ recipientName
├─ assignerName
├─ taskTitle
├─ projectName
├─ projectUrl
├─ taskUrl
├─ taskId
├─ dueDate
└─ projectId

deadline_reminder.blade.php
├─ recipientName
├─ taskTitle
├─ dueDate
├─ projectName
├─ projectUrl
└─ projectId
```

## Dependency Graph

```
Settings.tsx
  └─ MailNotificationSettings.tsx
      └─ mailService
          ├─ api (Axios)
          │  └─ AuthContext (Bearer token)
          ├─ teamService
          └─ notificationHelper

projectsService.ts
  ├─ api (Axios)
  ├─ notifyAssignment (from notificationHelper)
  └─ normalizeProject()

tasksService.ts
  ├─ api (Axios)
  ├─ notifyAssignment (from notificationHelper)
  └─ normalizeTask()

notificationHelper.ts
  ├─ mailService
  │  └─ api (Axios)
  └─ teamService
```

## Async Operation Flow

```
User submits form
  │
  ├─→ projectsService.update() [BLOCKING]
  │     └─→ api.put() [AWAITS]
  │
  ├─→ Response returned [UNBLOCK]
  │
  └─→ notifyAssignment() [NON-BLOCKING]
        └─→ mailService.send() [ASYNC/QUEUE]
              └─→ api.post() [FIRE & FORGET]
```

## Summary

The email notification system is built with:
- **Frontend:** React components + TypeScript services
- **Communication:** Axios HTTP client with token auth
- **Data Flow:** One-way from UI → Services → API
- **Error Handling:** Non-blocking with console logs
- **Async:** Notifications don't block main operations
- **Extensible:** Easy to add more notification types
- **Configurable:** All settings managed from admin panel

The system is **decoupled** so that notification failures don't affect core project/task operations.
