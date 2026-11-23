'use client';

import { useEffect } from 'react';

/** A panel the student must click or type in releases the mouse from first-person look. */
export function useFreeCursor() {
  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);
}
