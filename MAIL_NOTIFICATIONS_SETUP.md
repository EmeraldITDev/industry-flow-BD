# Email Notification System Setup Guide

## Overview

The email notification system automatically sends email notifications to team members when they are:
- Assigned to a project (as project lead or assignee)
- Assigned a new task
- Approaching task deadlines (when configured)

## Features

✅ **Automatic Project Assignment Notifications** - Sent when someone is assigned as a project lead or team member  
✅ **Automatic Task Assignment Notifications** - Sent when someone is assigned a task  
✅ **Customizable Email Templates** - Project assigned, task assigned, deadline reminders  
✅ **Admin Configuration Panel** - Easy setup from the web interface  
✅ **Test Email Functionality** - Send test emails to verify configuration  
✅ **SMTP Support** - Use custom SMTP servers (Gmail, Sendgrid, AWS SES, etc.)  
✅ **Enable/Disable Toggle** - Turn notifications on/off globally  

## Backend Setup (Laravel)

### 1. Install Dependencies

```bash
composer require symfony/mailer
composer require symfony/amazon-ses-mailer # if using AWS SES
```

### 2. Environment Configuration

Add to your `.env` file:

```env
# Default Mail Driver (log, sendmail, smtp, mailgun, postmark, ses, resend)
MAIL_DRIVER=smtp

# SMTP Configuration (for local or custom SMTP servers)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password  # Use app-specific password for Gmail
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@industryflow.com
MAIL_FROM_NAME="Industry Flow"

# Alternative: Mailgun Configuration
MAILGUN_DOMAIN=your-domain.mailgun.org
MAILGUN_SECRET=your-mailgun-api-key

# Alternative: SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
```

### 3. Create API Endpoints

Create these endpoints in your Laravel backend:

#### GET `/api/mail/config`
Returns current mail configuration

```php
Route::middleware('auth:sanctum')->get('/mail/config', function () {
    return response()->json([
        'from_email' => config('mail.from.address'),
        'from_name' => config('mail.from.name'),
        'reply_to_email' => config('mail.reply_to.address'),
        'notification_enabled' => config('mail.notifications_enabled', true),
        'smtp_host' => config('mail.mailers.smtp.host'),
        'smtp_port' => config('mail.mailers.smtp.port'),
        'smtp_username' => config('mail.mailers.smtp.username'),
    ]);
});
```

#### POST `/api/mail/send`
Send an email notification

```php
Route::middleware('auth:sanctum')->post('/mail/send', function (Request $request) {
    $validated = $request->validate([
        'recipientEmail' => 'required|email',
        'recipientName' => 'required|string',
        'template' => 'required|in:project_assigned,task_assigned,deadline_reminder',
        'subject' => 'required|string',
        'data' => 'required|array',
        'priority' => 'in:high,normal,low',
        'scheduledFor' => 'nullable|date_format:Y-m-d\TH:i:s\Z',
    ]);

    try {
        // Dispatch mail job (should use queue for async sending)
        Mail::send('emails.' . $validated['template'], $validated['data'], function ($message) use ($validated) {
            $message->to($validated['recipientEmail'], $validated['recipientName'])
                    ->subject($validated['subject'])
                    ->from(config('mail.from.address'), config('mail.from.name'));
        });

        return response()->json([
            'success' => true,
            'messageId' => uniqid(),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
        ], 500);
    }
});
```

#### POST `/api/mail/config`
Update mail configuration (admin only)

```php
Route::middleware('auth:sanctum', 'admin')->post('/mail/config', function (Request $request) {
    $validated = $request->validate([
        'from_email' => 'required|email',
        'from_name' => 'required|string',
        'reply_to_email' => 'nullable|email',
        'notification_enabled' => 'boolean',
        'smtp_host' => 'nullable|string',
        'smtp_port' => 'nullable|integer',
        'smtp_username' => 'nullable|string',
    ]);

    // Update configuration file or database
    // This example updates .env file (not recommended for production)
    config(['mail.from.address' => $validated['from_email']]);
    config(['mail.from.name' => $validated['from_name']]);
    
    return response()->json(['success' => true]);
});
```

### 4. Create Email Templates

Create Blade template files in `resources/views/emails/`:

#### `emails/project_assigned.blade.php`
```blade
<h1>You've been assigned to a project</h1>

<p>Hello {{ $recipientName }},</p>

<p>{{ $assignerName }} has assigned you to the project <strong>{{ $projectName }}</strong>.</p>

<p>
  <a href="{{ $projectUrl }}">View Project →</a>
</p>

<hr>

<p>Best regards,<br>{{ config('mail.from.name') }} Team</p>
```

#### `emails/task_assigned.blade.php`
```blade
<h1>You've been assigned a task</h1>

<p>Hello {{ $recipientName }},</p>

<p>{{ $assignerName }} has assigned you the task <strong>{{ $taskTitle }}</strong> in project <strong>{{ $projectName }}</strong>.</p>

<p><strong>Due Date:</strong> {{ $dueDate }}</p>

<p>
  <a href="{{ $taskUrl }}">View Task →</a>
</p>

<hr>

<p>Best regards,<br>{{ config('mail.from.name') }} Team</p>
```

#### `emails/deadline_reminder.blade.php`
```blade
<h1>Task deadline reminder</h1>

<p>Hello {{ $recipientName }},</p>

<p>This is a reminder that your task <strong>{{ $taskTitle }}</strong> is due on <strong>{{ $dueDate }}</strong>.</p>

<p>
  <a href="{{ $projectUrl }}">View Task →</a>
</p>

<hr>

<p>Best regards,<br>{{ config('mail.from.name') }} Team</p>
```

### 5. Configure Mailing in Project/Task Creation

Update your project and task creation endpoints to trigger notifications:

```php
// In ProjectController.php
public function store(StoreProjectRequest $request)
{
    $project = Project::create($request->validated());
    
    // Send notification email if project lead assigned
    if ($project->project_lead_id) {
        $lead = User::find($project->project_lead_id);
        Mail::queue('emails.project_assigned', [
            'projectName' => $project->name,
            'assignerName' => auth()->user()->name,
            'recipientName' => $lead->name,
            'projectUrl' => config('app.url') . '/projects/' . $project->id,
        ], function ($message) use ($lead) {
            $message->to($lead->email);
        });
    }
    
    return response()->json($project);
}
```

## Frontend Setup

### 1. Access Mail Settings

Navigate to **Settings → Mail Notifications** to configure email settings.

### 2. Enable Notifications

1. Toggle "Enable Notifications" to ON
2. Enter "From Email Address" (e.g., noreply@industryflow.com)
3. Enter "From Name" (e.g., Industry Flow)
4. (Optional) Configure SMTP settings for custom mail server
5. Click "Save Settings"
6. Click "Send Test Email" to verify configuration

### 3. Usage

The system automatically sends emails when:

**Project Assignment:**
- User creates a project and assigns a project lead → Email sent to project lead
- User edits a project and changes the assignee → Email sent to new assignee

**Task Assignment:**
- User creates a task and assigns it → Email sent to assignee
- User edits a task and changes the assignee → Email sent to new assignee
- User uses assign endpoint → Email sent to assignee

## Email Service Providers

### Gmail (Gmail Account)
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password  # Create App Password
MAIL_ENCRYPTION=tls
```

### Gmail (Google Workspace)
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@company.com
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
```

### SendGrid
```env
MAIL_DRIVER=sendgrid
SENDGRID_API_KEY=your-api-key
MAIL_FROM_ADDRESS=noreply@industryflow.com
```

### Mailgun
```env
MAIL_DRIVER=mailgun
MAILGUN_DOMAIN=your-domain.mailgun.org
MAILGUN_SECRET=your-secret-key
```

### AWS SES
```env
MAIL_DRIVER=ses
AWS_DEFAULT_REGION=us-east-1
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Postmark
```env
MAIL_DRIVER=postmark
POSTMARK_TOKEN=your-token
```

## File Structure

```
Frontend:
  src/services/
    ├── mail.ts                    # Mail service with send/config methods
    └── notificationHelper.ts      # Helper for sending notifications on assignment
  
  src/components/settings/
    └── MailNotificationSettings.tsx  # Admin configuration UI
  
  src/pages/
    └── Settings.tsx               # Add Mail Settings tab

Backend (Laravel):
  routes/api.php
    ├── POST /api/mail/send        # Send email notification
    ├── GET /api/mail/config       # Get mail configuration
    └── POST /api/mail/config      # Update mail configuration
  
  resources/views/emails/
    ├── project_assigned.blade.php
    ├── task_assigned.blade.php
    └── deadline_reminder.blade.php
```

## Troubleshooting

### Test email not sending
1. Check that "Enable Notifications" is toggled ON
2. Verify "From Email Address" is filled in
3. Check browser console for errors (F12 → Console)
4. Check server logs: `tail -f storage/logs/laravel.log`

### Emails going to spam
1. Configure DKIM and SPF records for your domain
2. Use "From Email Address" that matches your mail server
3. Consider using SendGrid or Mailgun for better deliverability

### Authentication errors with Gmail
1. Create an "App Password" (not your Gmail password)
2. Enable "Less secure app access" if using regular Gmail account
3. For Google Workspace, use your regular email and password

### SMTP Connection timeout
1. Check firewall allows outbound SMTP (port 587 or 465)
2. Try different port: 25 (unencrypted), 587 (TLS), 465 (SSL)
3. Verify SMTP host is accessible: `telnet smtp.gmail.com 587`

## Testing

### Send test email from settings:
1. Go to Settings → Mail Notifications
2. Configure all required fields
3. Click "Send Test Email"
4. Check your email inbox

### Check Laravel logs:
```bash
tail -f storage/logs/laravel.log
```

### Queue jobs (if using async):
```bash
php artisan queue:work
```

## Security Notes

- Never commit `.env` with real credentials
- Use app-specific passwords for Gmail
- Store SMTP credentials in environment variables only
- Restrict `/api/mail/config` endpoint to admin users only
- Sanitize user data in email templates

## Future Enhancements

- [ ] Scheduled deadline reminders (email X days before due date)
- [ ] Unsubscribe links in email templates
- [ ] Email notification preferences per user
- [ ] Bulk notification sending for teams
- [ ] Notification history/audit log
- [ ] Custom email templates per organization
- [ ] Multi-language email templates
