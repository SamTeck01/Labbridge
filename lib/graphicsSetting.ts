'use client';

/** Student's graphics preference: 'auto' lets the quality manager decide; 'low'/'high' force it. */
export type GraphicsSetting = 'auto' | 'low' | 'high';
const KEY = 'labbridge.graphics';

export function getGraphics(): GraphicsSetting {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'low' || v === 'high' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function setGraphics(v: GraphicsSetting) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* not persisted */
  }
  window.dispatchEvent(new CustomEvent('labbridge:graphics', { detail: v }));
}
