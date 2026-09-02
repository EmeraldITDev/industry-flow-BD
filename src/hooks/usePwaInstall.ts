import { useCallback, useEffect, useState } from 'react';
import {
  PWA_INSTALL_DISMISS_DAYS,
  PWA_INSTALL_DISMISS_KEY,
} from '@/lib/pwaConfig';

export type PwaPlatform = 'chromium' | 'firefox' | 'safari-ios' | 'safari-mac' | 'unknown';

export function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isInstallDismissedRecently(): boolean {
  const raw = localStorage.getItem(PWA_INSTALL_DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < PWA_INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(PWA_INSTALL_DISMISS_KEY, String(Date.now()));
}

export function detectPwaPlatform(): PwaPlatform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'safari-ios';
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua)) return 'safari-mac';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/Chrome|Chromium|Edg|OPR|Brave/i.test(ua)) return 'chromium';
  return 'unknown';
}

export function getInstallInstructions(platform: PwaPlatform): string[] {
  switch (platform) {
    case 'safari-ios':
      return [
        'Tap the Share button at the bottom of Safari.',
        'Scroll down and tap "Add to Home Screen".',
        'Tap "Add" to confirm.',
      ];
    case 'safari-mac':
      return [
        'In Safari, open the File menu.',
        'Choose "Add to Dock" (macOS Sonoma or later).',
        'Alternatively, click Share → "Add to Dock".',
      ];
    case 'firefox':
      return [
        'Open the browser menu (☰) in the toolbar.',
        'Look for "Install" or "Install this site as an app".',
        'If it is not listed, Firefox may not support installing this site on your platform yet — try Chrome or Edge.',
      ];
    case 'chromium':
      return [
        'Click the install icon (⊕ or monitor) in the address bar, if shown.',
        'Or open the browser menu (⋮) → "Install Emerald BDPortal…" / "Save and share" → "Install page as app".',
        'If neither appears, visit the site again after a minute — Chrome requires a short engagement period before offering install.',
      ];
    default:
      return [
        'Use your browser menu to look for "Install app" or "Add to Home Screen".',
        'Chrome, Edge, and Safari on mobile support installing this app.',
      ];
  }
}

/**
 * Captures `beforeinstallprompt` (Chromium) and exposes a single install()
 * entry point. Browsers without that event still get manual instructions.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [swReady, setSwReady] = useState(false);
  const platform = detectPwaPlatform();
  const standalone = isStandaloneMode();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(() => setSwReady(true)).catch(() => setSwReady(false));
  }, []);

  useEffect(() => {
    if (standalone) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [standalone]);

  const canNativePrompt = Boolean(deferredPrompt);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return outcome;
    } catch (error) {
      console.error('PWA install prompt failed:', error);
      setDeferredPrompt(null);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  const showAutoBanner =
    !standalone &&
    !isInstallDismissedRecently() &&
    (canNativePrompt || platform === 'firefox' || platform === 'safari-mac' || platform === 'safari-ios');

  return {
    platform,
    standalone,
    swReady,
    canNativePrompt,
    showAutoBanner,
    install,
    dismiss: dismissInstallPrompt,
    instructions: getInstallInstructions(platform),
  };
}
