'use client';

import { useSyncExternalStore } from 'react';

/**
 * What a hand is doing at a direct-manipulation bench (microscope, circuits, …), for the HUD:
 * which control the hand is on, its value, and the keys/gestures that apply right now.
 */
export interface BenchHandUI {
  station: string | null;
  /** The control a hand is on (a knob, a turret, a slider). */
  control: null | { id: string; name: string; side: 'left' | 'right'; value: number; detail: string | null };
  hints: string[];
}

let state: BenchHandUI = { station: null, control: null, hints: [] };
const listeners = new Set<() => void>();

export const benchUI = {
  get: () => state,
  set(next: BenchHandUI) {
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useBenchUI<T>(sel: (s: BenchHandUI) => T): T {
  return useSyncExternalStore(benchUI.subscribe, () => sel(state), () => sel(state));
}

/** Continuous turn rate from a touch lever (-1..1) and letting go of the control. */
export interface BenchHandControls {
  setRate(v: number): void;
  letGo(): void;
}
let controls: BenchHandControls | null = null;
export const benchControls = {
  register: (c: BenchHandControls | null) => (controls = c),
  get: () => controls,
};
