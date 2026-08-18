import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';

export function UpdateAvailableBanner() {
  const { updateAvailable } = useAppVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  // Re-show on the next detection cycle after a dismiss.
  useEffect(() => {
    if (!updateAvailable) return;
    setDismissed(false);
  }, [updateAvailable]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 px-3">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary sm:text-sm"
        >
          <RefreshCw className="h-4 w-4 text-primary" />
          A new update is available — click to refresh
        </button>
        <button
          type="button"
          aria-label="Dismiss update notice"
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}