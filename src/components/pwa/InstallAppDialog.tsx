import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { PWA_NAME } from '@/lib/pwaConfig';
import type { PwaPlatform } from '@/hooks/usePwaInstall';

interface InstallAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: PwaPlatform;
  instructions: string[];
  canNativePrompt: boolean;
  swReady: boolean;
  onInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  isInstalling?: boolean;
}

export function InstallAppDialog({
  open,
  onOpenChange,
  platform,
  instructions,
  canNativePrompt,
  swReady,
  onInstall,
  isInstalling = false,
}: InstallAppDialogProps) {
  const handleInstall = async () => {
    const outcome = await onInstall();
    if (outcome === 'accepted') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Install {PWA_NAME}
          </DialogTitle>
          <DialogDescription>
            {canNativePrompt
              ? 'Install the app on your device for quick access and offline viewing of your last-synced data.'
              : 'Your browser does not expose a one-click install here — follow the steps below.'}
          </DialogDescription>
        </DialogHeader>

        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
          {instructions.map((step) => (
            <li key={step} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ol>

        {!swReady && import.meta.env.PROD && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Service worker is not active yet. Hard-refresh the page (Ctrl+Shift+R) or confirm the
            latest deployment includes the PWA build, then try again.
          </p>
        )}

        {platform === 'chromium' && !canNativePrompt && (
          <p className="text-xs text-muted-foreground">
            Tip: Chrome may need two visits a few minutes apart before the install option appears.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canNativePrompt && (
            <Button onClick={handleInstall} disabled={isInstalling}>
              {isInstalling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Install now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
