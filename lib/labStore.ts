'use client';

import { useSyncExternalStore } from 'react';
import { SPECIMEN_CATALOG } from '@/lib/specimenGenerator';

/**
 * Single source of truth for all experiment state.
 * The 3D scene, the HUD and Dr. Curie all read and write through this store,
 * so what the student sees, what the UI shows and what Curie "knows" never disagree.
 */

export type Station = 'biology' | 'chemistry' | 'physics' | 'research' | 'hood';
export type Objective = '4x' | '10x' | '40x' | '100x';

/** Salts on the flame-test spotting tile. */
export type SaltKey = 'li' | 'na' | 'k' | 'ca' | 'cu';
export const SALTS: Record<SaltKey, { name: string; colour: string; hex: string; nm: number }> = {
  li: { name: 'Lithium chloride', colour: 'crimson', hex: '#ff1a3c', nm: 671 },
  na: { name: 'Sodium chloride', colour: 'intense yellow-orange', hex: '#ffb300', nm: 589 },
  k: { name: 'Potassium chloride', colour: 'lilac', hex: '#c58cff', nm: 766 },
  ca: { name: 'Calcium chloride', colour: 'brick red', hex: '#ff5a1f', nm: 622 },
  cu: { name: 'Copper(II) chloride', colour: 'blue-green', hex: '#18e6b4', nm: 510 },
};

export interface LabState {
  player: { station: Station | null; seated: boolean; goggles: boolean };
  biology: {
    slideIndex: number;
    objective: Objective;
    coarseFocus: number;
    fineFocus: number;
    lightIntensity: number;
    immersionOil: boolean;
    /** Mechanical stage position (-1..1) set by the stage knobs. */
    stageX: number;
    stageY: number;
  };
  chemistry: {
    /** NaOH currently in the burette (mL); 50 = filled to the 0.00 mark. */
    buretteML: number;
    /** HCl poured into the flask (mL). */
    flaskAcidML: number;
    buretteOpen: boolean;
    dispensedML: number;
    stirrerRPM: number;
    indicatorAdded: boolean;
    phValue: number;
  };
  physics: {
    switchClosed: boolean;
    resistance: number;
    voltage: number;
  };
  flame: {
    gasOn: boolean;
    lit: boolean;
    /** Air hole open: hot blue non-luminous flame. Closed: yellow luminous (sooty) flame. */
    airOpen: boolean;
    /** What's on the wire loop: clean, wet with acid, a salt, or burnt residue. */
    loop: 'clean' | 'acid' | 'dirty' | SaltKey;
    /** Fume hood sash lowered to the safe working height. */
    sashDown: boolean;
  };
  research: {
    doorsOpen: boolean;
    /** True mass on the pan (g), including the empty weighing boat. */
    massOnPan: number;
    /** Mass zeroed by the last TARE press. */
    tareOffset: number;
    /** Displayed reading (g): massOnPan - tareOffset, drifting with air currents while the shield is open. */
    balanceWeight: number;
    centrifugeRunning: boolean;
    centrifugeLidOpen: boolean;
    /** Which of the 8 rotor positions hold a tube (index 0 = front, going round). */
    rotorSlots: boolean[];
  };
}

const initialState: LabState = {
  player: { station: null, seated: false, goggles: false },
  biology: { slideIndex: 0, objective: '10x', coarseFocus: 0.5, fineFocus: 0.5, lightIntensity: 1.0, immersionOil: false, stageX: 0, stageY: 0 },
  chemistry: { buretteML: 50, flaskAcidML: 25, buretteOpen: false, dispensedML: 0, stirrerRPM: 0, indicatorAdded: false, phValue: 1.0 },
  physics: { switchClosed: false, resistance: 25, voltage: 12.0 },
  flame: { gasOn: false, lit: false, airOpen: false, loop: 'clean', sashDown: false },
  research: { doorsOpen: false, massOnPan: 1.2034, tareOffset: 0, balanceWeight: 1.2034, centrifugeRunning: false, centrifugeLidOpen: false, rotorSlots: [false, false, false, false, false, false, false, false] },
};

let state: LabState = initialState;
const listeners = new Set<() => void>();

export const labStore = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  update<K extends keyof LabState>(key: K, patch: Partial<LabState[K]> | ((prev: LabState[K]) => Partial<LabState[K]>)) {
    const prev = state[key];
    const next = typeof patch === 'function' ? patch(prev) : patch;
    state = { ...state, [key]: { ...prev, ...next } };
    listeners.forEach((l) => l());
  },
  /** Put one part of the lab back to its starting state (clean glassware, switches off). */
  resetKey(key: keyof LabState) {
    state = { ...state, [key]: initialState[key] };
    listeners.forEach((l) => l());
  },
  reset() {
    state = initialState;
    listeners.forEach((l) => l());
  },
};

export function useLab<T>(selector: (s: LabState) => T): T {
  return useSyncExternalStore(labStore.subscribe, () => selector(state), () => selector(initialState));
}

// --- Pure simulation helpers (testable, no rendering) ---

/** A centrifuge is balanced when the loaded tubes' centre of mass sits on the spindle. */
export function rotorImbalance(slots: boolean[]): number {
  let x = 0;
  let y = 0;
  slots.forEach((on, i) => {
    if (!on) return;
    x += Math.cos((i * Math.PI) / 4);
    y += Math.sin((i * Math.PI) / 4);
  });
  return Math.hypot(x, y);
}

/** Image sharpness through the eyepieces, 0.02 (blurred) to 1 (crisp). Shared by the eyepiece view, experiments and Curie. */
export function microscopeSharpness(b: LabState['biology']): number {
  const specimen = SPECIMEN_CATALOG[b.slideIndex] || SPECIMEN_CATALOG[0];
  const effectiveFocus = b.coarseFocus * 0.8 + b.fineFocus * 0.2;
  const focusDistance = Math.abs(effectiveFocus - specimen.optimalFocusHeight);
  // Depth of field shrinks with magnification
  const sensitivity = b.objective === '100x' ? 18 : b.objective === '40x' ? 12 : b.objective === '10x' ? 6 : 3;
  let sharpness = Math.max(0.02, 1.0 - focusDistance * sensitivity);
  if (b.objective === '100x' && !b.immersionOil) sharpness *= 0.4; // refractive index mismatch without oil
  return sharpness;
}

/** pH of 25 mL 0.1 M HCl titrated with 0.1 M NaOH. Equivalence at 25 mL. */
export function titrationPH(naohML: number, acidML = 25, conc = 0.1): number {
  if (acidML <= 0 && naohML <= 0) return 7;
  const molAcid = acidML * conc;
  const molBase = naohML * conc;
  const vol = (acidML + naohML) / 1000;
  const diff = molAcid - molBase;
  if (Math.abs(diff) < 1e-9) return 7;
  if (diff > 0) return -Math.log10(diff / 1000 / vol);
  return 14 + Math.log10(-diff / 1000 / vol);
}

/** Ohm's law: current (A) and power (W) through the bulb circuit. */
export function circuit(voltage: number, resistance: number, closed: boolean) {
  const current = closed ? voltage / resistance : 0;
  return { current, power: current * voltage };
}

/** Compact human-readable snapshot sent to Dr. Curie with every message. */
export function describeLabState(s: LabState): string {
  const { current } = circuit(s.physics.voltage, s.physics.resistance, s.physics.switchClosed);
  return [
    `Student location: ${s.player.seated && s.player.station ? `at the ${s.player.station} bench` : 'walking in the lab'}; safety goggles ${s.player.goggles ? 'ON' : 'OFF'}.`,
    `Biology: microscope objective ${s.biology.objective}, slide "${SPECIMEN_CATALOG[s.biology.slideIndex]?.name}", image sharpness ${Math.round(microscopeSharpness(s.biology) * 100)}%, immersion oil ${s.biology.immersionOil ? 'applied' : 'none'}, coarse focus ${s.biology.coarseFocus.toFixed(2)}, fine focus ${s.biology.fineFocus.toFixed(2)}, lamp ${s.biology.lightIntensity > 0.5 ? 'bright' : 'dim'}.`,
    `Chemistry: burette holds ${s.chemistry.buretteML.toFixed(1)} mL NaOH and is ${s.chemistry.buretteOpen ? 'OPEN' : 'closed'}, ${s.chemistry.dispensedML.toFixed(1)} mL 0.1M NaOH dispensed into ${s.chemistry.flaskAcidML.toFixed(1)} mL 0.1M HCl, pH ${s.chemistry.phValue.toFixed(2)}, indicator ${s.chemistry.indicatorAdded ? 'added' : 'not added'}, stirrer ${s.chemistry.stirrerRPM} rpm.`,
    `Physics: switch ${s.physics.switchClosed ? 'closed' : 'open'}, ${s.physics.voltage} V, ${s.physics.resistance} ohm, current ${current.toFixed(3)} A.`,
    `Flame test (fume hood): gas ${s.flame.gasOn ? 'ON' : 'off'}, fume hood sash ${s.flame.sashDown ? 'lowered (safe)' : 'RAISED'}, burner ${s.flame.lit ? `lit with a ${s.flame.airOpen ? 'blue roaring' : 'yellow luminous'} flame` : 'not lit'}, wire loop ${s.flame.loop}.`,
    `Research: balance doors ${s.research.doorsOpen ? 'open' : 'closed'}, reading ${s.research.balanceWeight.toFixed(4)} g, centrifuge ${s.research.centrifugeRunning ? 'running' : 'stopped'}, lid ${s.research.centrifugeLidOpen ? 'open' : 'closed'}, tubes in slots [${s.research.rotorSlots.map((v, i) => (v ? i : '')).filter((v) => v !== '').join(',')}] (imbalance ${rotorImbalance(s.research.rotorSlots).toFixed(2)}).`,
  ].join('\n');
}
