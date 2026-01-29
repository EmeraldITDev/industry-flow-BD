import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { mailService, MailConfig } from '@/services/mail';
import { Mail, Loader2 } from 'lucide-react';

export default function MailNotificationSettings() {
  const [config, setConfig] = useState<MailConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<MailConfig | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const mailConfig = await mailService.getConfig();
      setConfig(mailConfig);
      setFormData(mailConfig);
    } catch (error: any) {
      console.error('Failed to load mail config:', error);
      toast.error('Failed to load mail settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;
    
    setIsSaving(true);
    try {
      // Call backend to update config
      await fetch('/api/mail/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(formData),
      });
      
      setConfig(formData);
      toast.success('Mail settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save mail config:', error);
      toast.error('Failed to save mail settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!formData?.from_email) {
      toast.error('Please configure the from email first');
      return;
    }

    setIsSaving(true);
    try {
      const result = await mailService.send({
        recipientEmail: formData.from_email,
        recipientName: 'Test',
        template: 'project_assigned',
        subject: 'Test Email - Industry Flow',
        data: {
          projectName: 'Test Project',
          assignerName: 'System Administrator',
          recipientName: 'Test Recipient',
        },
      });

      if (result.success) {
        toast.success('Test email sent successfully');
      } else {
        toast.error(result.error || 'Failed to send test email');
      }
    } catch (error: any) {
      toast.error('Error sending test email');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Email Notification Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure email notifications for project and task assignments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic email configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Turn on/off email notifications for team member assignments
              </p>
            </div>
            <Switch
              checked={formData?.notification_enabled ?? false}
              onCheckedChange={(checked) =>
                setFormData(prev => prev ? { ...prev, notification_enabled: checked } : null)
              }
            />
          </div>

          {formData?.notification_enabled && (
            <>
              {/* From Email */}
              <div className="space-y-2">
                <Label htmlFor="from_email">From Email Address *</Label>
                <Input
                  id="from_email"
                  type="email"
                  value={formData.from_email || ''}
                  onChange={(e) =>
                    setFormData(prev => prev ? { ...prev, from_email: e.target.value } : null)
                  }
                  placeholder="noreply@industryflow.com"
                />
                <p className="text-xs text-muted-foreground">
                  This email address will appear as the sender of notification emails
                </p>
              </div>

              {/* From Name */}
              <div className="space-y-2">
                <Label htmlFor="from_name">From Name *</Label>
                <Input
                  id="from_name"
                  value={formData.from_name || ''}
                  onChange={(e) =>
                    setFormData(prev => prev ? { ...prev, from_name: e.target.value } : null)
                  }
                  placeholder="Industry Flow"
                />
                <p className="text-xs text-muted-foreground">
                  Display name for notification emails
                </p>
              </div>

              {/* Reply To Email */}
              <div className="space-y-2">
                <Label htmlFor="reply_to_email">Reply-To Email (Optional)</Label>
                <Input
                  id="reply_to_email"
                  type="email"
                  value={formData.reply_to_email || ''}
                  onChange={(e) =>
                    setFormData(prev => prev ? { ...prev, reply_to_email: e.target.value } : null)
                  }
                  placeholder="support@industryflow.com"
                />
                <p className="text-xs text-muted-foreground">
                  Where replies to notification emails should go
                </p>
              </div>

              {/* SMTP Settings */}
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">SMTP Configuration (Optional)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure custom SMTP settings if you're not using the default mail service
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_host">SMTP Host</Label>
                    <Input
                      id="smtp_host"
                      value={formData.smtp_host || ''}
                      onChange={(e) =>
                        setFormData(prev => prev ? { ...prev, smtp_host: e.target.value } : null)
                      }
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">SMTP Port</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      value={formData.smtp_port || ''}
                      onChange={(e) =>
                        setFormData(prev => prev ? { ...prev, smtp_port: parseInt(e.target.value) } : null)
                      }
                      placeholder="587"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="smtp_username">SMTP Username</Label>
                    <Input
                      id="smtp_username"
                      value={formData.smtp_username || ''}
                      onChange={(e) =>
                        setFormData(prev => prev ? { ...prev, smtp_username: e.target.value } : null)
                      }
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Templates Info */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>Available notification templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <h4 className="font-semibold text-sm">Project Assignment</h4>
              <p className="text-sm text-muted-foreground">
                Sent when a team member is assigned as project lead or assignee
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <h4 className="font-semibold text-sm">Task Assignment</h4>
              <p className="text-sm text-muted-foreground">
                Sent when a team member is assigned a new task
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <h4 className="font-semibold text-sm">Deadline Reminder</h4>
              <p className="text-sm text-muted-foreground">
                Sent as a reminder when task deadlines are approaching
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || !formData}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
        
        {formData?.notification_enabled && (
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Test Email'
            )}
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={loadConfig}
          disabled={isSaving}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
