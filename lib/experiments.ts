'use client';

import { useSyncExternalStore } from 'react';
import { labStore, microscopeSharpness, titrationPH, type LabState, type Station } from '@/lib/labStore';

/**
 * Practical experiments: objective, ordered procedure Dr. Curie tracks, readings the student
 * records, mistakes she catches, and a scored result. Progress is saved in localStorage.
 */

export interface Reading {
  label: string;
  value: number;
  unit: string;
  extra?: Record<string, number>;
}

export interface ScoreLine {
  label: string;
  points: number;
  max: number;
  note: string;
}

export interface ExperimentResult {
  experimentId: string;
  title: string;
  score: number;
  breakdown: ScoreLine[];
  readings: Reading[];
  mistakes: string[];
  finishedAt: number;
}

interface Step {
  id: string;
  text: string;
  /** What Dr. Curie says when this becomes the current step. */
  coach: string;
  done: (lab: LabState, run: RunState) => boolean;
}

interface Mistake {
  id: string;
  /** Dr. Curie's correction, shown once. */
  message: string;
  check: (lab: LabState, run: RunState) => boolean;
}

export interface ExperimentDef {
  id: string;
  station: Station;
  title: string;
  objective: string;
  safety: string[];
  intro: string;
  steps: Step[];
  mistakes: Mistake[];
  recordLabel: string;
  /** Returns an error message if a reading can't be taken right now, else the reading. */
  record: (lab: LabState, run: RunState) => Reading | string;
  /** How many readings finish the data-collection step. */
  readingsNeeded: number;
  evaluate: (run: RunState, lab: LabState) => ScoreLine[];
}

export interface RunState {
  experimentId: string;
  startedAt: number;
  completedSteps: string[];
  readings: Reading[];
  mistakes: string[];
  /** Named things that happened (e.g. 'snapshot', 'taredClosed') with their data. */
  events: Record<string, number>;
}

const band = (err: number, bands: [number, number][]) => {
  for (const [limit, pts] of bands) if (err <= limit) return pts;
  return 0;
};

export const EXPERIMENTS: ExperimentDef[] = [
  {
    id: 'titration',
    station: 'chemistry',
    title: 'Acid–Base Titration',
    objective: 'Find the volume of 0.1 M NaOH that exactly neutralises 25.0 mL of 0.1 M HCl, using phenolphthalein.',
    safety: ['Goggles on: NaOH is corrosive.', 'Close the burette before you walk away.'],
    intro: "Today we're finding the endpoint of HCl with NaOH. First, add phenolphthalein to the flask. No indicator, no endpoint.",
    steps: [
      { id: 'indicator', text: 'Add 2–3 drops of phenolphthalein to the flask', coach: 'Click the flask or indicator bottle to add phenolphthalein.', done: (l) => l.chemistry.indicatorAdded },
      { id: 'stir', text: 'Switch on the magnetic stirrer', coach: 'Turn on the stirrer so each addition mixes in. Around 400 rpm is fine.', done: (l) => l.chemistry.stirrerRPM > 0 },
      { id: 'titrate', text: 'Open the burette and titrate', coach: 'Open the stopcock. Run it steadily at first; the endpoint is near 25 mL.', done: (l) => l.chemistry.dispensedML > 0.5 },
      { id: 'endpoint', text: 'Close the burette at the first permanent pink', coach: 'Near 24 mL, close it and add single drops. Stop at the first faint pink that stays.', done: (l) => l.chemistry.phValue >= 8.2 && !l.chemistry.buretteOpen },
      { id: 'record', text: 'Record the titre', coach: 'Read the burette at eye level and record your titre.', done: (_l, r) => r.readings.length >= 1 },
    ],
    mistakes: [
      { id: 'noIndicator', message: "Stop. You're titrating without indicator, so you won't see the endpoint.", check: (l) => l.chemistry.dispensedML > 0 && !l.chemistry.indicatorAdded },
      { id: 'overshoot', message: "That's well past the endpoint. Deep pink means excess base. Close the burette and note it.", check: (l) => l.chemistry.dispensedML > 26.5 },
    ],
    recordLabel: 'Record titre',
    readingsNeeded: 1,
    record: (l) => {
      if (l.chemistry.buretteOpen) return 'Close the burette before reading it.';
      if (l.chemistry.dispensedML <= 0) return 'Nothing dispensed yet.';
      return { label: 'Titre', value: Math.round(l.chemistry.dispensedML * 100) / 100, unit: 'mL' };
    },
    evaluate: (r) => {
      const titre = r.readings[0]?.value ?? 0;
      const err = Math.abs(titre - 25.0);
      const indicatorFirst = !r.mistakes.includes('noIndicator');
      return [
        { label: 'Accuracy', points: band(err, [[0.1, 50], [0.3, 40], [0.6, 25], [1.5, 10]]), max: 50, note: `Titre ${titre.toFixed(2)} mL vs 25.00 mL expected (error ${err.toFixed(2)} mL).` },
        { label: 'Technique', points: (indicatorFirst ? 15 : 0) + (r.completedSteps.includes('stir') ? 15 : 0), max: 30, note: indicatorFirst ? 'Indicator added before titrating.' : 'Titrated before adding indicator.' },
        { label: 'Safety & control', points: r.mistakes.includes('overshoot') ? 5 : 20, max: 20, note: r.mistakes.includes('overshoot') ? 'Overshot the endpoint by more than 1.5 mL.' : 'Controlled approach to the endpoint.' },
      ];
    },
  },
  {
    id: 'microscopy',
    station: 'biology',
    title: 'Observing Cells Under the Microscope',
    objective: 'Bring a specimen into sharp focus at 40× using correct low-to-high power technique, and capture an image for your notebook.',
    safety: ['Always start at the lowest power.', 'Never use coarse focus at 40× or 100×; it can crack the slide.'],
    intro: "Let's look at cells. Always start on the 4× objective. Check the turret, then look through the eyepieces.",
    steps: [
      { id: 'low', text: 'Select the 4× scanning objective', coach: 'Rotate the turret to 4×, the shortest objective with the red band.', done: (l) => l.biology.objective === '4x' },
      { id: 'focus4', text: 'Focus the specimen at 4×', coach: 'Use the coarse focus until the image is sharp at 4×.', done: (l) => l.biology.objective === '4x' && microscopeSharpness(l.biology) > 0.8 },
      { id: 'focus10', text: 'Switch to 10× and refocus', coach: 'Now 10×. Only small focus adjustments are needed.', done: (l) => l.biology.objective === '10x' && microscopeSharpness(l.biology) > 0.8 },
      { id: 'focus40', text: 'Switch to 40× and fine-focus', coach: 'Go to 40× and use only the fine focus from here.', done: (l) => l.biology.objective === '40x' && microscopeSharpness(l.biology) > 0.8 },
      { id: 'capture', text: 'Capture the field of view to your notebook', coach: 'Nicely focused. Capture the image to your lab notebook.', done: (_l, r) => (r.events.snapshot ?? 0) > 0 },
    ],
    mistakes: [
      { id: 'highFirst', message: "Don't start on high power. Go back to 4× and focus there first; it protects the slide and the lens.", check: (l, r) => (l.biology.objective === '40x' || l.biology.objective === '100x') && !r.completedSteps.includes('focus4') },
      { id: 'noOil', message: '100× is an oil-immersion lens. Without oil the image will be blurry.', check: (l) => l.biology.objective === '100x' && !l.biology.immersionOil },
    ],
    recordLabel: 'Capture image (use the eyepiece view)',
    readingsNeeded: 0,
    record: () => 'Capture the image from the eyepiece view.',
    evaluate: (r) => {
      const sharp = r.events.snapshot ?? 0;
      const steps = r.completedSteps.filter((s) => s !== 'capture').length;
      return [
        { label: 'Technique', points: steps * 12, max: 48, note: `${steps}/4 focusing stages done in order.` },
        { label: 'Image quality', points: Math.round(sharp * 32), max: 32, note: `Captured image was ${Math.round(sharp * 100)}% sharp.` },
        { label: 'Lens & slide safety', points: Math.max(0, 20 - r.mistakes.length * 10), max: 20, note: r.mistakes.length ? `${r.mistakes.length} handling error(s).` : 'Correct low-to-high power technique.' },
      ];
    },
  },
  {
    id: 'ohms-law',
    station: 'physics',
    title: "Verifying Ohm's Law",
    objective: 'Measure the current through the circuit at three or more resistances and show that V = I × R.',
    safety: ['Keep current under 1 A to protect the bulb and meter.', 'Open the switch when you finish.'],
    intro: "We'll verify Ohm's law. Close the knife switch, then record the current at at least three rheostat settings.",
    steps: [
      { id: 'close', text: 'Close the knife switch', coach: 'Close the knife switch to complete the circuit.', done: (l) => l.physics.switchClosed },
      { id: 'measure', text: 'Record current at 3 different resistances', coach: 'Record the ammeter reading, change the rheostat, and repeat. Three settings at least.', done: (_l, r) => new Set(r.readings.map((x) => x.extra?.R)).size >= 3 },
      { id: 'open', text: 'Open the switch when finished', coach: 'Good data. Open the switch to make the circuit safe.', done: (l, r) => !l.physics.switchClosed && r.readings.length >= 3 },
    ],
    mistakes: [
      { id: 'overcurrent', message: "That's over 1 A. Turn the resistance up before you burn out the bulb.", check: (l) => l.physics.switchClosed && l.physics.voltage / l.physics.resistance > 1 },
    ],
    recordLabel: 'Record ammeter reading',
    readingsNeeded: 3,
    record: (l) => {
      if (!l.physics.switchClosed) return 'Close the switch first: no current is flowing.';
      const I = l.physics.voltage / l.physics.resistance;
      return { label: `I at R = ${l.physics.resistance} Ω`, value: Math.round(I * 1000) / 1000, unit: 'A', extra: { R: l.physics.resistance, V: l.physics.voltage } };
    },
    evaluate: (r) => {
      const Rs = [...new Set(r.readings.map((x) => x.extra?.R ?? 0))];
      const span = Rs.length ? Math.max(...Rs) - Math.min(...Rs) : 0;
      return [
        { label: 'Data collected', points: Math.min(3, Rs.length) * 15 + (Rs.length >= 5 ? 5 : 0), max: 50, note: `${Rs.length} distinct resistance settings.` },
        { label: 'Range of data', points: span >= 40 ? 20 : span >= 20 ? 10 : 0, max: 20, note: `Resistances spanned ${span} Ω.` },
        { label: 'Safety', points: (r.mistakes.includes('overcurrent') ? 0 : 20) + (r.completedSteps.includes('open') ? 10 : 0), max: 30, note: r.mistakes.includes('overcurrent') ? 'Exceeded 1 A.' : 'Current kept in the safe range.' },
      ];
    },
  },
  {
    id: 'weighing',
    station: 'research',
    title: 'Accurate Weighing on an Analytical Balance',
    objective: 'Weigh between 0.1000 g and 0.1500 g of sample to four decimal places using the tare function and draft shield correctly.',
    safety: ['Keep the draft shield closed while reading.', 'Never weigh chemicals directly on the pan.'],
    intro: 'Accurate weighing today. With the draft shield closed and the empty boat on the pan, press TARE.',
    steps: [
      { id: 'tare', text: 'Close the shield and TARE the empty boat', coach: 'Shield closed, empty boat on the pan, then press TARE. The display should read 0.0000 g.', done: (l) => !l.research.doorsOpen && l.research.tareOffset > 0 && Math.abs(l.research.massOnPan - l.research.tareOffset) < 1e-6 },
      { id: 'open', text: 'Open the draft shield', coach: 'Slide the draft shield open to add your sample.', done: (l) => l.research.doorsOpen },
      { id: 'add', text: 'Add sample until you reach 0.10–0.15 g', coach: 'Add small amounts by clicking the weighing boat. Aim for 0.10–0.15 g.', done: (l) => l.research.massOnPan - l.research.tareOffset >= 0.1 },
      { id: 'close', text: 'Close the shield and let the reading settle', coach: 'Close the shield. Air currents make the last digits drift.', done: (l) => !l.research.doorsOpen && l.research.massOnPan - l.research.tareOffset >= 0.1 },
      { id: 'record', text: 'Record the mass', coach: 'Stable reading. Record it to four decimal places.', done: (_l, r) => r.readings.length >= 1 },
    ],
    mistakes: [
      { id: 'overTarget', message: "You're over 0.15 g. On a real balance you'd remove some; note it and be more careful.", check: (l) => l.research.massOnPan - l.research.tareOffset > 0.15 },
    ],
    recordLabel: 'Record mass',
    readingsNeeded: 1,
    record: (l) => {
      if (l.research.doorsOpen) return 'Close the draft shield so the reading settles first.';
      return { label: 'Sample mass', value: l.research.balanceWeight, unit: 'g' };
    },
    evaluate: (r) => {
      const m = r.readings[0]?.value ?? 0;
      const inRange = m >= 0.1 && m <= 0.15;
      return [
        { label: 'Target mass', points: inRange ? 40 : Math.abs(m - 0.125) < 0.05 ? 20 : 0, max: 40, note: `Recorded ${m.toFixed(4)} g (target 0.1000–0.1500 g).` },
        { label: 'Procedure', points: (r.completedSteps.includes('tare') ? 20 : 0) + (r.completedSteps.includes('close') ? 20 : 0), max: 40, note: 'Tared with the shield closed; read with the shield closed.' },
        { label: 'Precision', points: r.mistakes.includes('overTarget') ? 5 : 20, max: 20, note: r.mistakes.includes('overTarget') ? 'Overshot the target mass.' : 'Controlled additions.' },
      ];
    },
  },
];

export const getExperiment = (id: string | null | undefined) => EXPERIMENTS.find((e) => e.id === id);
export const experimentForStation = (s: Station | null) => EXPERIMENTS.find((e) => e.station === s);

// ---------------- Store (persisted) ----------------

interface ExperimentState {
  run: RunState | null;
  /** Latest finished result, shown in the results panel until dismissed. */
  lastResult: ExperimentResult | null;
  history: ExperimentResult[];
}

const STORAGE_KEY = 'labbridge.experiments.v1';

function load(): ExperimentState {
  const empty: ExperimentState = { run: null, lastResult: null, history: [] };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

let state: ExperimentState = { run: null, lastResult: null, history: [] };
let loaded = false;
const listeners = new Set<() => void>();
type Listener = (e: { type: 'step' | 'mistake' | 'finished' | 'started'; message: string; result?: ExperimentResult }) => void;
const eventListeners = new Set<Listener>();

function set(patch: Partial<ExperimentState>) {
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: progress just won't persist */
  }
  listeners.forEach((l) => l());
}
const emit: Listener = (e) => eventListeners.forEach((l) => l(e));

function currentStep(def: ExperimentDef, run: RunState) {
  return def.steps.find((s) => !run.completedSteps.includes(s.id)) ?? null;
}

/** Re-evaluates the active run against the lab. Steps complete strictly in order. */
function evaluate() {
  const run = state.run;
  const def = getExperiment(run?.experimentId);
  if (!run || !def) return;
  const lab = labStore.get();

  let next = { ...run };
  let changed = false;
  for (const m of def.mistakes) {
    if (!next.mistakes.includes(m.id) && m.check(lab, next)) {
      next = { ...next, mistakes: [...next.mistakes, m.id] };
      changed = true;
      emit({ type: 'mistake', message: m.message });
    }
  }
  let step = currentStep(def, next);
  while (step && step.done(lab, next)) {
    next = { ...next, completedSteps: [...next.completedSteps, step.id] };
    changed = true;
    step = currentStep(def, next);
    if (step) emit({ type: 'step', message: step.coach });
  }
  if (changed) set({ run: next });
  if (!step) finish();
}

function finish() {
  const run = state.run;
  const def = getExperiment(run?.experimentId);
  if (!run || !def) return;
  const breakdown = def.evaluate(run, labStore.get());
  const result: ExperimentResult = {
    experimentId: def.id,
    title: def.title,
    score: breakdown.reduce((a, b) => a + b.points, 0),
    breakdown,
    readings: run.readings,
    mistakes: run.mistakes.map((id) => def.mistakes.find((m) => m.id === id)?.message ?? id),
    finishedAt: Date.now(),
  };
  set({ run: null, lastResult: result, history: [result, ...state.history].slice(0, 30) });
  emit({ type: 'finished', message: `Practical complete: ${result.score}/100.`, result });
}

export const experiments = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  onEvent(fn: Listener) {
    eventListeners.add(fn);
    return () => eventListeners.delete(fn);
  },
  /** Call once on the client: restores saved progress and starts watching the lab. */
  init() {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    state = load();
    listeners.forEach((l) => l());
    labStore.subscribe(evaluate);
  },
  start(id: string) {
    const def = getExperiment(id);
    if (!def) return;
    // Fresh apparatus for the practical
    if (def.id === 'titration') labStore.update('chemistry', { buretteOpen: false, dispensedML: 0, indicatorAdded: false, stirrerRPM: 0, phValue: titrationPH(0) });
    if (def.id === 'weighing') labStore.update('research', { doorsOpen: false, massOnPan: 1.2034, tareOffset: 0 });
    if (def.id === 'microscopy') labStore.update('biology', { objective: '10x', coarseFocus: 0.2, fineFocus: 0.5, immersionOil: false });
    set({ run: { experimentId: id, startedAt: Date.now(), completedSteps: [], readings: [], mistakes: [], events: {} }, lastResult: null });
    emit({ type: 'started', message: def.intro });
    evaluate();
  },
  abandon() {
    set({ run: null });
  },
  dismissResult() {
    set({ lastResult: null });
  },
  /** Take a reading for the active experiment. Returns an error message, or null on success. */
  record(): string | null {
    const run = state.run;
    const def = getExperiment(run?.experimentId);
    if (!run || !def) return 'No practical running.';
    const r = def.record(labStore.get(), run);
    if (typeof r === 'string') return r;
    set({ run: { ...run, readings: [...run.readings, r] } });
    evaluate();
    return null;
  },
  /** Something happened outside the lab state (e.g. an image capture, a tare press). */
  event(name: string, value = 1) {
    const run = state.run;
    if (!run) return;
    set({ run: { ...run, events: { ...run.events, [name]: value } } });
    evaluate();
  },
  /** Text for Dr. Curie's context. */
  describe(): string {
    const run = state.run;
    const def = getExperiment(run?.experimentId);
    if (!run || !def) return 'No practical in progress.';
    const step = currentStep(def, run);
    return [
      `[ACTIVE PRACTICAL] ${def.title}. Objective: ${def.objective}`,
      `Completed steps: ${def.steps.filter((s) => run.completedSteps.includes(s.id)).map((s) => s.text).join('; ') || 'none'}.`,
      `Current step: ${step?.text ?? 'finished'}.`,
      `Readings: ${run.readings.map((r) => `${r.label} = ${r.value} ${r.unit}`).join('; ') || 'none'}.`,
      `Mistakes so far: ${run.mistakes.join(', ') || 'none'}.`,
    ].join('\n');
  },
};

export function useExperiments<T>(selector: (s: ExperimentState) => T): T {
  return useSyncExternalStore(experiments.subscribe, () => selector(state), () => selector({ run: null, lastResult: null, history: [] }));
}

export function currentStepOf(run: RunState | null) {
  const def = getExperiment(run?.experimentId);
  return def && run ? currentStep(def, run) : null;
}
