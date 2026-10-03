'use client';

import { useEffect } from 'react';

/** A panel that needs the mouse (typing, buttons): give the pointer back while it's open. */
export function useFreePointer(active = true) {
  useEffect(() => {
    if (active && typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
  }, [active]);
}
