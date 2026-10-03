'use client';

import { useEffect } from 'react';

/** Registers the service worker (production only) so LabBridge installs and loads fast offline. */
export default function PwaSetup() {
  useEffect(() => {
    if ((process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_TEST_HOOKS === '1') || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* PWA features are optional; the site works without them */
    });
  }, []);
  return null;
}
