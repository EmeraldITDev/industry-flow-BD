import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { PWA_NAME } from '@/lib/pwaConfig';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { InstallAppDialog } from '@/components/pwa/InstallAppDialog';

/** Auto banner — shown on first visits until dismissed (7 days). */
export function InstallPrompt() {
  const {
    platform,
    swReady,
    canNativePrompt,
    showAutoBanner,
    install,
    dismiss,
    instructions,
  } = usePwaInstall();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (!showAutoBanner) return null;

  const handleInstallClick = async () => {
    if (canNativePrompt) {
      setIsInstalling(true);
      try {
        const outcome = await install();
        if (outcome === 'unavailable') {
          setDialogOpen(true);
        }
      } finally {
        setIsInstalling(false);
      }
      return;
    }
    setDialogOpen(true);
  };

  const handleDismiss = () => {
    dismiss();
  };

  return (
    <>
      <div className="fixed bottom-[4.5rem] left-1/2 z-[100] w-[min(100%,28rem)] -translate-x-1/2 px-3 sm:bottom-4">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold text-foreground">Install {PWA_NAME}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {canNativePrompt
                ? 'Add to your home screen for quick access and offline viewing of your last-synced data.'
                : 'Install this app on your device — we will show the steps for your browser.'}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={handleInstallClick} disabled={isInstalling}>
                {isInstalling ? 'Installing…' : 'Install App'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Not now
              </Button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss install prompt"
            onClick={handleDismiss}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <InstallAppDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform={platform}
        instructions={instructions}
        canNativePrompt={canNativePrompt}
        swReady={swReady}
        onInstall={install}
        isInstalling={isInstalling}
      />
    </>
  );
}

/** User-menu entry — always available when not already installed. */
export function InstallAppDropdownItem() {
  const { standalone, platform, swReady, canNativePrompt, install, instructions } = usePwaInstall();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (standalone) return null;

  const openFlow = async () => {
    if (canNativePrompt) {
      setIsInstalling(true);
      try {
        const outcome = await install();
        if (outcome === 'unavailable') setDialogOpen(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      setDialogOpen(true);
    }
  };

  return (
    <>
      <DropdownMenuItem onClick={openFlow} className="cursor-pointer" disabled={isInstalling}>
        <Download className="mr-2 h-4 w-4" />
        {isInstalling ? 'Installing…' : 'Install App'}
      </DropdownMenuItem>

      <InstallAppDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform={platform}
        instructions={instructions}
        canNativePrompt={canNativePrompt}
        swReady={swReady}
        onInstall={install}
        isInstalling={isInstalling}
      />
    </>
  );
}
