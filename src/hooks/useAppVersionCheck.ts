import { useCallback, useEffect, useRef, useState } from 'react';

const VERSION_URL = '/version.json';
const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}

/**
 * Polls /version.json (written at build time) and reports when the deployed
 * build differs from the one this tab loaded.
 */
export function useAppVersionCheck() {
  const loadedVersionRef = useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  const check = useCallback(async () => {
    const remote = await fetchVersion();
    if (!remote) return;
    if (loadedVersionRef.current === null) {
      loadedVersionRef.current = remote;
      return;
    }
    if (remote !== loadedVersionRef.current) {
      setUpdateAvailable(true);
      setCheckCount((c) => c + 1);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [check]);

  return { updateAvailable, checkCount };
}