/**
 * Utility functions for handling mobile screen orientation and full-screen requests.
 */

export async function requestFullscreenAndLandscape(): Promise<boolean> {
  let fullscreenSuccess = false;
  let orientationSuccess = false;

  // 1. Request Fullscreen (required on most mobile browsers before orientation lock)
  try {
    const docEl = document.documentElement as any;
    if (!document.fullscreenElement && !docEl.webkitFullscreenElement) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen().catch(() => {});
        fullscreenSuccess = true;
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen().catch(() => {});
        fullscreenSuccess = true;
      }
    } else {
      fullscreenSuccess = true;
    }
  } catch (err) {
    console.debug('Fullscreen request error:', err);
  }

  // 2. Lock Screen Orientation to Landscape
  try {
    const screenOrientation = window.screen.orientation as any;
    if (screenOrientation && typeof screenOrientation.lock === 'function') {
      await screenOrientation.lock('landscape').catch(() => {
        // Retry with landscape-primary
        return screenOrientation.lock('landscape-primary').catch(() => {});
      });
      orientationSuccess = true;
    } else if (typeof (window.screen as any).lockOrientation === 'function') {
      (window.screen as any).lockOrientation('landscape');
      orientationSuccess = true;
    } else if (typeof (window.screen as any).webkitLockOrientation === 'function') {
      (window.screen as any).webkitLockOrientation('landscape');
      orientationSuccess = true;
    } else if (typeof (window.screen as any).mozLockOrientation === 'function') {
      (window.screen as any).mozLockOrientation('landscape');
      orientationSuccess = true;
    }
  } catch (err) {
    console.debug('Screen orientation lock error:', err);
  }

  return fullscreenSuccess || orientationSuccess;
}

export function isMobileOrTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 1024;
  return hasTouch && isSmallScreen;
}
