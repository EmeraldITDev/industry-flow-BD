import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Cloud, Mail, Link2, Unlink, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface IntegrationSettingsProps {
  oneDriveConnected?: boolean;
  outlookConnected?: boolean;
}

export function IntegrationSettings({ 
  oneDriveConnected = false, 
  outlookConnected = false 
}: IntegrationSettingsProps) {
  const [oneDrive, setOneDrive] = useState(oneDriveConnected);
  const [outlook, setOutlook] = useState(outlookConnected);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectOneDrive = async () => {
    setIsConnecting(true);
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setOneDrive(true);
    setIsConnecting(false);
    toast.success('OneDrive connected successfully (Mock)');
  };

  const handleDisconnectOneDrive = () => {
    setOneDrive(false);
    toast.info('OneDrive disconnected');
  };

  const handleConnectOutlook = async () => {
    setIsConnecting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setOutlook(true);
    setIsConnecting(false);
    toast.success('Outlook connected successfully (Mock)');
  };

  const handleDisconnectOutlook = () => {
    setOutlook(false);
    toast.info('Outlook disconnected');
  };

  return (
    <div className="space-y-6">
      {/* OneDrive Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-1/20">
                <Cloud className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <CardTitle className="text-lg">OneDrive</CardTitle>
                <CardDescription>Store and access documents from Microsoft OneDrive</CardDescription>
              </div>
            </div>
            <Badge variant={oneDrive ? 'default' : 'outline'} className="gap-1">
              {oneDrive ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {oneDrive ? (
                <p>Your OneDrive is connected. Documents can be synced automatically.</p>
              ) : (
                <p>Connect OneDrive to store project documents in the cloud.</p>
              )}
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant={oneDrive ? 'outline' : 'default'}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    'Connecting...'
                  ) : oneDrive ? (
                    <>
                      <Unlink className="w-4 h-4 mr-2" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {oneDrive ? 'Disconnect OneDrive' : 'Connect to OneDrive'}
                  </DialogTitle>
                  <DialogDescription>
                    {oneDrive 
                      ? 'Are you sure you want to disconnect OneDrive? Existing synced documents will remain accessible.'
                      : 'This will connect your Microsoft OneDrive account to enable cloud document storage.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    variant={oneDrive ? 'destructive' : 'default'}
                    onClick={oneDrive ? handleDisconnectOneDrive : handleConnectOneDrive}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Processing...' : oneDrive ? 'Disconnect' : 'Connect OneDrive'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Outlook Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-3/20">
                <Mail className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <CardTitle className="text-lg">Outlook</CardTitle>
                <CardDescription>Send email notifications via Microsoft Outlook</CardDescription>
              </div>
            </div>
            <Badge variant={outlook ? 'default' : 'outline'} className="gap-1">
              {outlook ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {outlook ? (
                <p>Your Outlook is connected. Email notifications will be sent via your account.</p>
              ) : (
                <p>Connect Outlook to receive email notifications for project updates.</p>
              )}
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant={outlook ? 'outline' : 'default'}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    'Connecting...'
                  ) : outlook ? (
                    <>
                      <Unlink className="w-4 h-4 mr-2" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {outlook ? 'Disconnect Outlook' : 'Connect to Outlook'}
                  </DialogTitle>
                  <DialogDescription>
                    {outlook 
                      ? 'Are you sure you want to disconnect Outlook? You will no longer receive email notifications.'
                      : 'This will connect your Microsoft Outlook account to enable email notifications.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    variant={outlook ? 'destructive' : 'default'}
                    onClick={outlook ? handleDisconnectOutlook : handleConnectOutlook}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Processing...' : outlook ? 'Disconnect' : 'Connect Outlook'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {outlook && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive emails for stage changes, task assignments, and reminders
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Microsoft Integration Note</p>
              <p className="mt-1">
                These integrations are currently in mock mode. To enable full functionality, 
                you would need to set up Microsoft Azure AD app registration and configure 
                the appropriate OAuth scopes for OneDrive and Outlook APIs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
