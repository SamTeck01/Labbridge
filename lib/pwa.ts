'use client';

import { useEffect, useState } from 'react';
import { isMobileOrTouchDevice } from '@/lib/orientation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own Install button instead of the browser mini-bar
    deferred = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('labbridge:installable'));
  });
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** 'prompt': Chrome/Android can install with one tap. 'ios': show Add to Home Screen instructions. null: installed / unsupported. */
export function useInstall() {
  const [mode, setMode] = useState<'prompt' | 'ios' | null>(null);
  useEffect(() => {
    const update = () => {
      if (isStandalone()) setMode(null);
      else if (deferred) setMode('prompt');
      else if (isIOS()) setMode('ios');
    };
    update();
    window.addEventListener('labbridge:installable', update);
    return () => window.removeEventListener('labbridge:installable', update);
  }, []);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    setMode(null);
  };
  return { mode, install };
}

/**
 * On phones, entering the lab goes fullscreen and locks landscape like a mobile game.
 * Must be called from a tap handler (browsers require a user gesture). Desktop: no-op.
 */
export async function enterImmersive() {
  if (typeof document === 'undefined' || !isMobileOrTouchDevice()) return;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation.lock?.('landscape');
  } catch {
    /* iOS Safari can't lock orientation; the rotate-your-phone prompt covers it */
  }
}
