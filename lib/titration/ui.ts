'use client';

import { useSyncExternalStore } from 'react';

/**
 * What the student's hands are doing right now, for the HUD (hand slots, contextual buttons,
 * key hints, the reading lens). Written by the titration bench, read by React.
 */

export type HeldKind = 'bottle' | 'flask' | 'funnel' | 'pipette' | 'dropper' | 'beaker' | null;

export interface HandsUI {
  held: { id: string; name: string; kind: HeldKind } | null;
  /** What the held thing is over / in (e.g. "over the funnel", "tip in the HCl"). */
  over: string | null;
  tilt: number; // rad
  pouring: boolean;
  splashing: boolean;
  onTap: boolean;
  valve: number;
  swirling: boolean;
  lift: number; // m above the bench
  reading: null | { kind: 'burette' | 'pipette'; eye: number };
  sheetOpen: boolean;
  /** Short line under the hands, e.g. "Set it on the tile under the burette". */
  hint: string | null;
}

let state: HandsUI = {
  held: null,
  over: null,
  tilt: 0,
  pouring: false,
  splashing: false,
  onTap: false,
  valve: 0,
  swirling: false,
  lift: 0,
  reading: null,
  sheetOpen: false,
  hint: null,
};
const listeners = new Set<() => void>();

export const handsUI = {
  get: () => state,
  set(patch: Partial<HandsUI>) {
    let changed = false;
    for (const k of Object.keys(patch) as (keyof HandsUI)[]) {
      const a = state[k];
      const b = patch[k];
      if (typeof a === 'number' && typeof b === 'number') {
        if (Math.abs(a - b) > 0.01) changed = true;
      } else if (JSON.stringify(a) !== JSON.stringify(b)) changed = true;
    }
    if (!changed) return;
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useHandsUI<T>(selector: (s: HandsUI) => T): T {
  return useSyncExternalStore(handsUI.subscribe, () => selector(state), () => selector(state));
}

/**
 * The controls the HUD buttons, the keyboard and Dr. Curie all use. The bench registers itself;
 * calls are ignored until it exists.
 */
export interface TitrationControls {
  grab(id: string): void;
  setDown(): void;
  /** Continuous inputs: set every frame by whatever is pressing them (-1..1). */
  setInput(name: 'tilt' | 'lift' | 'lever' | 'eye', value: number): void;
  setTilt(rad: number): void;
  tiltBy(rad: number): void;
  liftBy(m: number): void;
  valveBy(d: number): void;
  setValve(v: number): void;
  toggleTap(on?: boolean): void;
  swirl(on: boolean): void;
  squeeze(): void;
  read(on?: boolean): void;
  eyeBy(m: number): void;
  /** Move what is held to a named place (used by Dr. Curie and tests). */
  carryTo(place: string): void;
  /** True once what's held has reached where it was sent (or nothing is held). */
  settled(): boolean;
}

let controls: TitrationControls | null = null;
export const titrationControls = {
  register(c: TitrationControls | null) {
    controls = c;
  },
  get: () => controls,
};
