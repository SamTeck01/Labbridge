'use client';

import { useSyncExternalStore } from 'react';
import { labStore, titrationPH } from '@/lib/labStore';

/**
 * The titration as a physical system. Everything the student sees (levels, drops, colour) and
 * everything that is marked comes from this state, never from a script:
 *
 *  - Burette: true meniscus reading (mL, 0 at the top mark), an air bubble in the jet after filling,
 *    a funnel that may still be in the top, and a tap (valve 0..1, flow ∝ valve²).
 *  - Flask: millimoles of acid and base, indicator drops, and a local pink "flash" where base lands
 *    that only fades as fast as the flask is swirled.
 *  - Pipette: 25.00 mL volumetric, filled with a pipette filler, delivered to wherever its tip is.
 *  - Runs: each rinse of the flask starts a new run with its own truth (pipetted volume, overshoot).
 *
 * Concentrations: both solutions 0.100 M, so the true titre equals the pipetted volume.
 */

export const CONC = 0.1; // mol/L = mmol/mL
export const DROP_ML = 0.05;
const MAX_FLOW = 2.4; // mL/s with the tap fully open
const FUNNEL_DRAIN = 3.0; // mL/s from the funnel into the burette
const FUNNEL_CAP = 8; // mL the funnel holds before it overflows
const BURETTE_TOP = -3; // reading at the very top of the tube (above the 0 mark)
const BUBBLE_ML = 0.3; // volume of the trapped air in the jet
const PIPETTE_LINE = 25.0;
const PIPETTE_MAX = 31; // above this the liquid goes into the filler

export type Under = 'flask' | 'waste' | null;
export type PourTarget = 'funnel' | 'burette' | 'flask' | 'waste' | 'stock' | 'sink' | null;

export interface Run {
  index: number;
  pipettedML: number; // acid actually delivered (truth)
  baseML: number; // base delivered into this flask (truth)
  indicatorDrops: number;
  swirlSeconds: number; // swirling while base was going in
  bubbleLeft: boolean; // the bubble came out of the jet during this run
  funnelLeft: boolean; // titrated with the funnel still in
  endpointAt: number | null; // base mL when the first permanent pink appeared
  maxPink: number;
}

export interface SheetCell {
  value: string;
  /** True burette reading at the moment the student wrote this (for marking). */
  truth: number | null;
}

export interface TitrationState {
  // Burette
  reading: number; // true meniscus reading (mL); 50 = empty to the 50 mark (and below = empty)
  hasLiquid: boolean;
  valve: number; // 0 closed .. 1 fully open
  bubble: boolean;
  bubbleFlush: number; // seconds of strong flow (clears the bubble at 0.5 s)
  funnelIn: boolean;
  funnelML: number;
  under: Under;
  // Flask
  flaskAt: 'tile' | 'bench' | 'held' | 'sink';
  acidMmol: number;
  baseMmol: number;
  waterML: number;
  indicatorDrops: number;
  flash: number; // 0..1 local pink where base lands
  swirl: number; // 0..1 swirling strength now
  // Pipette
  pipetteML: number;
  pipetteFillerFlooded: boolean;
  // Bookkeeping
  runs: Run[];
  spills: number;
  wasteML: number;
  /** Reading-related */
  sheet: { initial: SheetCell[]; final: SheetCell[]; ticked: boolean[]; handedIn: boolean };
}

const emptyCell = (): SheetCell => ({ value: '', truth: null });
const COLS = 4; // Rough, 1, 2, 3

function fresh(): TitrationState {
  return {
    reading: 50,
    hasLiquid: false,
    valve: 0,
    bubble: false,
    bubbleFlush: 0,
    funnelIn: true,
    funnelML: 0,
    under: 'flask',
    flaskAt: 'tile',
    acidMmol: 0,
    baseMmol: 0,
    waterML: 0,
    indicatorDrops: 0,
    flash: 0,
    swirl: 0,
    pipetteML: 0,
    pipetteFillerFlooded: false,
    runs: [newRun(0)],
    spills: 0,
    wasteML: 0,
    sheet: {
      initial: Array.from({ length: COLS }, emptyCell),
      final: Array.from({ length: COLS }, emptyCell),
      ticked: Array(COLS).fill(false),
      handedIn: false,
    },
  };
}

function newRun(index: number): Run {
  return { index, pipettedML: 0, baseML: 0, indicatorDrops: 0, swirlSeconds: 0, bubbleLeft: false, funnelLeft: false, endpointAt: null, maxPink: 0 };
}

let state: TitrationState = fresh();
const listeners = new Set<() => void>();
let notifyQueued = false;
let lastNotify = 0;

function notify() {
  // At most ~12 updates a second to React; the 3D view reads the state directly every frame
  if (notifyQueued) return;
  const wait = Math.max(0, 80 - (performance.now() - lastNotify));
  notifyQueued = true;
  setTimeout(() => {
    notifyQueued = false;
    lastNotify = performance.now();
    listeners.forEach((l) => l());
  }, wait);
}

function set(patch: Partial<TitrationState>) {
  state = { ...state, ...patch };
  notify();
}

/** For what the student types or ticks: React inputs must see the change at once. */
function setNow(patch: Partial<TitrationState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const run = () => state.runs[state.runs.length - 1];
function patchRun(p: Partial<Run>) {
  const runs = state.runs.slice();
  runs[runs.length - 1] = { ...run(), ...p };
  state = { ...state, runs };
}

/** Things that happened, for sound, Dr. Curie and marking. */
export type SimEvent =
  | { type: 'drop'; into: Under }
  | { type: 'spill'; what: string }
  | { type: 'bubbleCleared' }
  | { type: 'bubbleLeft' }
  | { type: 'funnelOverflow' }
  | { type: 'fillerFlooded' }
  | { type: 'endpoint'; run: number; baseML: number }
  | { type: 'overshoot'; run: number; past: number }
  | { type: 'noIndicator' }
  | { type: 'funnelLeft' }
  | { type: 'rinsed'; run: number };
const eventListeners = new Set<(e: SimEvent) => void>();
const emit = (e: SimEvent) => eventListeners.forEach((l) => l(e));

// ------------------------------------------------------------------------------------------
// Derived values
// ------------------------------------------------------------------------------------------

export function flaskML(s = state) {
  return s.acidMmol / CONC + s.baseMmol / CONC + s.waterML + s.indicatorDrops * DROP_ML;
}

export function flaskPH(s = state) {
  return titrationPH(s.baseMmol / CONC, s.acidMmol / CONC, CONC);
}

/** 0..1 permanent pink (phenolphthalein turns at pH ~8.2). */
export function permanentPink(s = state) {
  if (s.indicatorDrops <= 0) return 0;
  const ph = flaskPH(s);
  const k = Math.min(1, Math.max(0, (ph - 8.0) / 2.5));
  return k * Math.min(1, 0.4 + s.indicatorDrops * 0.2);
}

/** Flow out of the burette (mL/s). Quadratic so the first part of the turn is the fine control. */
export const flowFor = (valve: number) => MAX_FLOW * valve * valve;

/** Pour rate (mL/s) from a vessel tilted by `tilt` rad, `fill` 0..1 full. Starts later the emptier it is. */
export function pourRate(tilt: number, fill: number, capacityML: number) {
  if (fill <= 0) return 0;
  const start = THREE_DEG(78) - fill * THREE_DEG(66); // full: 12°, nearly empty: ~78°
  const over = tilt - start;
  if (over <= 0) return 0;
  return Math.min(capacityML * 0.6, 4 + over * 40) * Math.min(1, fill * 4);
}
function THREE_DEG(d: number) {
  return (d * Math.PI) / 180;
}

/** Above this tilt a pour glugs and splashes: some misses whatever it is aimed at. */
export const SPLASH_TILT = THREE_DEG(105);

// ------------------------------------------------------------------------------------------
// Ticking
// ------------------------------------------------------------------------------------------

let dropAccumulator = 0;
let overshootSaid = false;
let lastSpillSaid = 0;

function tick(dt: number) {
  let s = state;
  let changed = false;

  // Funnel drains into the burette
  if (s.funnelIn && s.funnelML > 0) {
    const room = Math.max(0, s.reading - BURETTE_TOP);
    const flow = Math.min(s.funnelML, FUNNEL_DRAIN * dt, room);
    s = { ...s, funnelML: s.funnelML - flow, reading: s.reading - flow, hasLiquid: s.hasLiquid || flow > 0 };
    if (flow > 0 && !state.hasLiquid) s.bubble = true; // a freshly filled burette traps air in the jet
    changed = true;
  }

  // Tap
  const available = s.hasLiquid ? Math.max(0, 50 + 1.2 - s.reading) : 0; // ~1.2 mL in the jet below the 50 mark
  if (s.valve > 0.001 && available > 0) {
    const flow = flowFor(s.valve);
    // The bubble: a strong flow pushes it out; a gentle flow carries it out partway through a run
    if (s.bubble) {
      const flush = flow > 0.8 ? s.bubbleFlush + dt : s.bubbleFlush;
      if (flush >= 0.5) {
        s = { ...s, bubble: false, bubbleFlush: 0, reading: s.reading + BUBBLE_ML * 0.2 };
        emit({ type: 'bubbleCleared' });
      } else s = { ...s, bubbleFlush: flush };
    }
    const out = Math.min(available, flow * dt);
    dropAccumulator += out;
    s = { ...s, reading: s.reading + out };
    state = s;
    // Deliver in whole drops so every drop is a real event (visual, colour flash)
    while (dropAccumulator >= DROP_ML) {
      dropAccumulator -= DROP_ML;
      deliverDrop();
    }
    s = state;
    changed = true;
  }

  // Swirling mixes the flash away; the closer to the endpoint, the longer each flash lingers
  if (s.flash > 0) {
    const remaining = Math.max(0, s.acidMmol - s.baseMmol); // mmol of acid still to neutralise
    const mix = 0.12 + s.swirl * 2.2;
    const k = mix * (0.15 + remaining * 60);
    s = { ...s, flash: Math.max(0, s.flash - k * dt) };
    changed = true;
  }
  if (s.swirl > 0 && s.valve > 0.001) {
    state = s;
    patchRun({ swirlSeconds: run().swirlSeconds + dt * s.swirl });
    s = state;
  }

  // Endpoint and overshoot, per run
  const pink = permanentPink(s);
  const r = s.runs[s.runs.length - 1];
  if (pink > r.maxPink + 0.02) {
    state = s;
    patchRun({ maxPink: pink });
    if (r.endpointAt === null && pink > 0.15) {
      patchRun({ endpointAt: r.baseML });
      emit({ type: 'endpoint', run: r.index, baseML: r.baseML });
    }
    s = state;
  }
  if (r.endpointAt !== null && r.baseML - r.endpointAt > 0.6 && !overshootSaid) {
    overshootSaid = true;
    emit({ type: 'overshoot', run: r.index, past: r.baseML - r.endpointAt });
  }

  if (changed) set(s);
}

function deliverDrop() {
  const s = state;
  if (s.bubble && s.under === 'flask' && run().baseML > 2) {
    // The trapped air finally leaves: the reading jumps with no liquid delivered
    state = { ...s, bubble: false, reading: s.reading + BUBBLE_ML };
    patchRun({ bubbleLeft: true });
    emit({ type: 'bubbleLeft' });
  }
  if (state.funnelIn) {
    // Liquid clinging to the funnel stem drips down: the reading creeps back
    state = { ...state, reading: state.reading - 0.004 };
    if (!run().funnelLeft && state.under === 'flask') {
      patchRun({ funnelLeft: true });
      emit({ type: 'funnelLeft' });
    }
  }
  const under = state.under;
  if (under === 'flask') {
    const molPerDrop = DROP_ML * CONC;
    if (state.indicatorDrops === 0 && run().baseML < 0.2) emit({ type: 'noIndicator' });
    const flash = state.indicatorDrops > 0 ? Math.min(1, state.flash + 0.45) : 0;
    state = { ...state, baseMmol: state.baseMmol + molPerDrop, flash };
    patchRun({ baseML: run().baseML + DROP_ML });
  } else if (under === 'waste') {
    state = { ...state, wasteML: state.wasteML + DROP_ML };
  } else {
    // Nothing under the tip: straight onto the bench (spill size in the same units as pouring: ~1 per 5 mL)
    state = { ...state, spills: state.spills + DROP_ML * 0.2 };
    const now = Date.now();
    if (now - lastSpillSaid > 4000) {
      lastSpillSaid = now;
      emit({ type: 'spill', what: 'NaOH from the burette' });
    }
  }
  emit({ type: 'drop', into: under });
}

let timer: ReturnType<typeof setInterval> | null = null;
let last = 0;
function ensureRunning() {
  if (timer || typeof window === 'undefined') return;
  last = performance.now();
  timer = setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    tick(dt);
  }, 40);
  // Legacy consumers (Dr. Curie's context, sound loops) read labStore.chemistry
  setInterval(syncLegacy, 250);
}

function syncLegacy() {
  const s = state;
  const c = labStore.get().chemistry;
  const buretteML = s.hasLiquid ? Math.max(0, 50 - s.reading) : 0;
  const next = {
    buretteML: Math.round(buretteML * 100) / 100,
    flaskAcidML: Math.round((s.acidMmol / CONC) * 100) / 100,
    buretteOpen: s.valve > 0.02,
    dispensedML: Math.round(run().baseML * 100) / 100,
    indicatorAdded: s.indicatorDrops > 0,
    phValue: Math.round(flaskPH(s) * 100) / 100,
  };
  if (Object.entries(next).some(([k, v]) => (c as Record<string, unknown>)[k] !== v)) labStore.update('chemistry', next);
}

// ------------------------------------------------------------------------------------------
// Actions (called by the bench's hands, the HUD and Dr. Curie: the same verbs for everyone)
// ------------------------------------------------------------------------------------------

export const titration = {
  get: () => state,
  subscribe(fn: () => void) {
    ensureRunning();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  onEvent(fn: (e: SimEvent) => void) {
    eventListeners.add(fn);
    return () => eventListeners.delete(fn);
  },
  start() {
    ensureRunning();
  },
  reset() {
    state = fresh();
    dropAccumulator = 0;
    overshootSaid = false;
    notify();
  },

  setValve(v: number) {
    set({ valve: Math.max(0, Math.min(1, v)) });
  },
  setSwirl(v: number) {
    if (Math.abs(v - state.swirl) > 0.01) set({ swirl: Math.max(0, Math.min(1, v)) });
  },
  setUnder(u: Under) {
    if (u !== state.under) set({ under: u });
  },
  setFlaskAt(at: TitrationState['flaskAt']) {
    if (at !== state.flaskAt) set({ flaskAt: at });
  },
  setFunnelIn(on: boolean) {
    // Taking the funnel out takes its film of liquid with it
    set({ funnelIn: on, funnelML: on ? state.funnelML : 0 });
  },

  /** Pour `ml` of NaOH (from the bottle) at `target`. `splash` 0..1 of it misses. Returns ml accepted. */
  pourBase(ml: number, target: PourTarget, splash: number) {
    const miss = ml * splash;
    const into = ml - miss;
    if (miss > 0.01) set({ spills: state.spills + miss * 0.2 });
    if (target === 'funnel' && state.funnelIn) {
      const funnelML = state.funnelML + into;
      if (funnelML > FUNNEL_CAP) {
        set({ funnelML: FUNNEL_CAP, spills: state.spills + 1 });
        emit({ type: 'funnelOverflow' });
      } else set({ funnelML });
    } else if (target === 'burette' && !state.funnelIn) {
      // Pouring straight into a 1 cm tube without a funnel: most of it runs down the outside
      const room = Math.max(0, state.reading - BURETTE_TOP);
      const inTube = Math.min(room, into * 0.35);
      set({ reading: state.reading - inTube, hasLiquid: true, bubble: state.hasLiquid ? state.bubble : true, spills: state.spills + 1 });
      emit({ type: 'spill', what: 'NaOH down the outside of the burette' });
    } else if (target === 'flask') {
      set({ baseMmol: state.baseMmol + into * CONC, flash: state.indicatorDrops ? 1 : state.flash });
      patchRun({ baseML: run().baseML + into });
      emit({ type: 'spill', what: 'NaOH poured straight into the flask' });
    } else if (target === 'waste' || target === 'sink') {
      set({ wasteML: state.wasteML + into });
    } else if (target !== 'stock') {
      // Spill size counts in mL (≈1 per 5 mL), and the warning is not repeated every frame
      set({ spills: state.spills + into * 0.2 });
      const now = Date.now();
      if (now - lastSpillSaid > 4000) {
        lastSpillSaid = now;
        emit({ type: 'spill', what: 'NaOH' });
      }
    }
    if (miss > 0.3) emit({ type: 'spill', what: 'a splash of NaOH' });
    return into;
  },

  /** Pipette filler: positive draws liquid up (tip must be in the stock), negative lets it out. */
  pipette(dml: number, tipIn: PourTarget) {
    const s = state;
    if (dml > 0) {
      if (tipIn !== 'stock') return;
      const pipetteML = s.pipetteML + dml;
      if (pipetteML > PIPETTE_MAX && !s.pipetteFillerFlooded) {
        set({ pipetteML: PIPETTE_MAX, pipetteFillerFlooded: true });
        emit({ type: 'fillerFlooded' });
        return;
      }
      set({ pipetteML: Math.min(PIPETTE_MAX, pipetteML) });
    } else if (dml < 0) {
      const out = Math.min(s.pipetteML, -dml);
      if (out <= 0) return;
      set({ pipetteML: s.pipetteML - out });
      if (tipIn === 'flask') {
        set({ acidMmol: state.acidMmol + out * CONC });
        patchRun({ pipettedML: run().pipettedML + out });
      } else if (tipIn === 'stock' || tipIn === 'waste' || tipIn === 'sink') {
        // back into the stock / waste: no harm
      } else {
        set({ spills: state.spills + out * 0.1 });
        if (out > 0.2) emit({ type: 'spill', what: 'HCl from the pipette' });
      }
    }
  },

  emptyWaste() {
    if (state.wasteML > 0) set({ wasteML: 0 });
  },
  takeWaste(ml: number) {
    set({ wasteML: Math.max(0, state.wasteML - ml) });
  },

  /** One squeeze of the indicator dropper. */
  indicatorDrop(into: PourTarget) {
    if (into === 'flask') {
      set({ indicatorDrops: state.indicatorDrops + 1 });
      patchRun({ indicatorDrops: run().indicatorDrops + 1 });
    } else {
      set({ spills: state.spills + 0.2 });
    }
  },

  /** Empty and rinse the flask at the sink: the next run starts. */
  rinseFlask() {
    const r = run();
    const used = r.pipettedML > 0 || r.baseML > 0;
    set({ acidMmol: 0, baseMmol: 0, waterML: 0.4, indicatorDrops: 0, flash: 0 });
    overshootSaid = false;
    if (used) {
      state = { ...state, runs: [...state.runs, newRun(state.runs.length)] };
      emit({ type: 'rinsed', run: r.index });
      notify();
    }
  },

  /** The student writes on the lab sheet. Truth is the burette as it is right now. */
  writeCell(row: 'initial' | 'final', col: number, value: string) {
    const cells = state.sheet[row].slice();
    cells[col] = { value, truth: Math.round(state.reading * 1000) / 1000 };
    setNow({ sheet: { ...state.sheet, [row]: cells } });
  },
  tick(col: number, on: boolean) {
    const ticked = state.sheet.ticked.slice();
    ticked[col] = on;
    setNow({ sheet: { ...state.sheet, ticked } });
  },
  handIn() {
    setNow({ sheet: { ...state.sheet, handedIn: true } });
  },
};

export function useTitration<T>(selector: (s: TitrationState) => T): T {
  return useSyncExternalStore(titration.subscribe, () => selector(state), () => selector(state));
}

// ------------------------------------------------------------------------------------------
// The lab sheet, as the student filled it in
// ------------------------------------------------------------------------------------------

export const SHEET_COLS = ['Rough', '1', '2', '3'];

export function parseReading(v: string): number | null {
  const n = Number(v.trim().replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
}

/** Titre per column from the student's own numbers (null if incomplete). */
export function sheetTitres(s = state) {
  return SHEET_COLS.map((_, i) => {
    const a = parseReading(s.sheet.initial[i].value);
    const b = parseReading(s.sheet.final[i].value);
    return a !== null && b !== null ? Math.round((b - a) * 100) / 100 : null;
  });
}

export function sheetMean(s = state) {
  const t = sheetTitres(s).filter((v, i) => v !== null && s.sheet.ticked[i]) as number[];
  return t.length ? Math.round((t.reduce((a, b) => a + b, 0) / t.length) * 100) / 100 : null;
}

export const PIPETTE = { LINE: PIPETTE_LINE, MAX: PIPETTE_MAX };
