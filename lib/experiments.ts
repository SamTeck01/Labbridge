'use client';

import { useSyncExternalStore } from 'react';
import { labStore, microscopeSharpness, titrationPH, SALTS, type LabState, type Station } from '@/lib/labStore';
import { stopwatches } from '@/lib/workbench/kit';
import { titration, sheetTitres, parseReading, PIPETTE, type TitrationState } from '@/lib/titration/sim';

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
  /** Extra buttons in the practical panel (e.g. "Leave for 30 minutes"). */
  panelActions?: (lab: LabState) => { label: string; run: () => void }[];
  /** A final numeric answer the student works out (recorded as the reading 'Answer'). */
  answer?: { prompt: string; unit: string };
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

/** Two ticked titres from real (non-rough) runs that agree within 0.10 cm³. */
function concordant(t: TitrationState) {
  const titres = sheetTitres(t);
  const ticked = titres.map((v, i) => (t.sheet.ticked[i] && i > 0 ? v : null)).filter((v): v is number => v !== null);
  for (let a = 0; a < ticked.length; a++) for (let b = a + 1; b < ticked.length; b++) if (Math.abs(ticked[a] - ticked[b]) <= 0.1001) return true;
  return false;
}

/** Marked like a real practical: from the sheet the student wrote and how they handled the apparatus. */
function titrationMarks(t: TitrationState): ScoreLine[] {
  const titres = sheetTitres(t);
  // Accuracy: mean of the ticked titres against the true titre of those runs (acid pipetted / 1, both 0.100 M)
  const used = titres.map((v, i) => ({ v, i })).filter((x) => x.v !== null && t.sheet.ticked[x.i] && x.i > 0);
  const mean = used.length ? used.reduce((a, x) => a + (x.v as number), 0) / used.length : null;
  const truths = used.map((x) => t.runs[x.i]?.pipettedML ?? 25).filter((v) => v > 0);
  const trueMean = truths.length ? truths.reduce((a, b) => a + b, 0) / truths.length : 25;
  const err = mean === null ? Infinity : Math.abs(mean - trueMean);
  const accuracy = band(err, [[0.1, 30], [0.2, 24], [0.4, 15], [0.8, 6]]);

  // Readings: each written value against the meniscus at that moment, to 2 d.p. ending in 0 or 5
  const cells = [...t.sheet.initial, ...t.sheet.final].filter((c) => c.value.trim() !== '');
  const good = cells.filter((c) => {
    const n = parseReading(c.value);
    if (n === null || c.truth === null) return false;
    const twoDp = /^\s*\d+\.\d[05]\s*$/.test(c.value);
    return twoDp && Math.abs(n - c.truth) <= 0.05 + 1e-6;
  }).length;
  const readings = cells.length ? Math.round((20 * good) / cells.length) : 0;

  const conc = concordant(t) ? 15 : used.length >= 2 ? 6 : 0;

  // Technique
  const runs = t.runs.filter((r) => r.pipettedML > 0);
  const tech = [
    !runs.some((r) => r.bubbleLeft),
    !runs.some((r) => r.funnelLeft),
    runs.length > 0 && runs.every((r) => Math.abs(r.pipettedML - PIPETTE.LINE) <= 0.06),
    runs.length > 0 && runs.every((r) => r.indicatorDrops >= 2 && r.indicatorDrops <= 4),
    runs.length > 0 && runs.filter((r) => r.baseML > 1).every((r) => r.swirlSeconds > 3),
  ];
  const technique = tech.filter(Boolean).length * 5;
  const care = (t.spills < 1 ? 5 : t.spills < 3 ? 2 : 0) + (runs.some((r) => r.index > 0 && r.endpointAt !== null && r.baseML - r.endpointAt > 0.6) ? 0 : 5);

  return [
    { label: 'Accuracy', points: accuracy, max: 30, note: mean === null ? 'No ticked titres to average.' : `Mean titre ${mean.toFixed(2)} cm³; your runs needed ${trueMean.toFixed(2)} cm³.` },
    { label: 'Burette readings', points: readings, max: 20, note: `${good} of ${cells.length} readings within 0.05 cm³ and written to 2 d.p. (ending in 0 or 5).` },
    { label: 'Concordant results', points: conc, max: 15, note: conc === 15 ? 'Two ticked titres within 0.10 cm³.' : 'Ticked titres did not agree within 0.10 cm³.' },
    { label: 'Technique', points: technique, max: 25, note: ['air bubble cleared', 'funnel removed', 'pipette to the line', '2-3 drops of indicator', 'swirled while titrating'].filter((_, i) => tech[i]).join(', ') || 'Review the method.' },
    { label: 'Care & control', points: care, max: 10, note: `${t.spills < 1 ? 'No spills' : `${Math.ceil(t.spills)} spill(s)`}; ${care >= 5 && !runs.some((r) => r.index > 0 && r.endpointAt !== null && r.baseML - r.endpointAt > 0.6) ? 'no overshoots on accurate runs' : 'overshot an accurate run'}.` },
  ];
}

export const EXPERIMENTS: ExperimentDef[] = [
  {
    id: 'titration',
    station: 'chemistry',
    title: 'Acid–Base Titration',
    objective: 'Find the volume of 0.100 M NaOH that neutralises 25.00 cm³ of 0.100 M HCl. Get two titres within 0.10 cm³ of each other.',
    safety: ['Goggles on: NaOH is corrosive.', 'Pour slowly and below eye level. Wipe up spills.'],
    intro: "Titration today, done properly. Fill the burette through the funnel, take the funnel out, clear the air from the jet, then pipette 25.00 cm³ of acid into the flask. You write every reading on the lab sheet yourself.",
    steps: [
      { id: 'fill', text: 'Fill the burette with NaOH to just above 0', coach: 'Pick up the NaOH bottle, lift it to the funnel and tilt it gently. Stop when the level is just above the 0 mark.', done: () => { const t = titration.get(); return t.hasLiquid && t.reading <= 1; } },
      { id: 'funnel', text: 'Take the funnel out of the burette', coach: 'Lift the funnel out and put it down on the bench. Left in, it drips and changes your readings.', done: () => !titration.get().funnelIn },
      { id: 'jet', text: 'Clear the air bubble from the jet', coach: 'Stand the waste beaker under the burette, open the tap fully for a second, then close it. The bubble in the tip has to go.', done: () => !titration.get().bubble },
      { id: 'pipette', text: 'Pipette 25.00 cm³ of HCl into the flask', coach: 'Stand the flask on the open bench (the burette is in the way on the tile). Pick up the pipette, dip the tip in the HCl, draw up just past the line, let it down to the line at eye level, then let it all run into the flask.', done: () => titration.get().acidMmol >= 2.3 },
      { id: 'indicator', text: 'Add 2 or 3 drops of phenolphthalein', coach: 'Take the dropper out of the indicator bottle, hold it over the flask and squeeze: one press, one drop. Then stand the flask on the white tile under the burette.', done: () => titration.get().indicatorDrops > 0 },
      { id: 'initial', text: 'Read the burette and write the initial reading', coach: 'Lean in to the burette (Space or tap the scale), get your eye level with the meniscus and write the reading on the lab sheet.', done: () => titration.get().sheet.initial.some((c) => c.value.trim() !== '') },
      { id: 'titrate', text: 'Titrate to the first permanent pink', coach: 'Hand on the tap, swirl with the other hand. Run it steadily, then drop by drop when the pink flashes start to linger.', done: () => titration.get().runs.some((r) => r.endpointAt !== null) && titration.get().valve === 0 },
      { id: 'final', text: 'Read the burette and write the final reading', coach: 'Tap closed. Lean in, read the bottom of the meniscus and write the final reading.', done: () => titration.get().sheet.final.some((c) => c.value.trim() !== '') },
      { id: 'repeat', text: 'Repeat until two titres agree within 0.10 cm³ and tick them', coach: 'Rinse the flask in the basin, pipette fresh acid, refill the burette if it is low, and go again. Tick the titres that agree.', done: () => concordant(titration.get()) },
      { id: 'handin', text: 'Hand your lab sheet to Dr. Curie', coach: 'Check your sheet, then hand it in.', done: () => titration.get().sheet.handedIn },
    ],
    mistakes: [
      { id: 'noIndicator', message: "Stop. You're titrating without indicator, so you won't see the endpoint.", check: () => titration.get().runs.some((r) => r.baseML > 0.2 && r.indicatorDrops === 0 && r.pipettedML > 0) },
      { id: 'funnelLeft', message: 'You titrated with the funnel still in the burette. Drips from it change the reading.', check: () => titration.get().runs.some((r) => r.funnelLeft) },
      { id: 'bubble', message: 'The air bubble came out of the jet during your titration, so that titre reads about 0.3 cm³ too high.', check: () => titration.get().runs.some((r) => r.bubbleLeft) },
      { id: 'overshoot', message: "That's well past the endpoint. Deep pink means excess base. Rinse and do another run.", check: () => titration.get().runs.some((r) => r.endpointAt !== null && r.index > 0 && r.baseML - r.endpointAt > 0.6) },
      { id: 'filler', message: 'Acid went up into the pipette filler. Draw up slowly and stop just past the line.', check: () => titration.get().pipetteFillerFlooded },
    ],
    recordLabel: '',
    readingsNeeded: 0,
    record: () => 'Write your readings on the lab sheet.',
    evaluate: () => titrationMarks(titration.get()),
  },
  {
    id: 'microscopy',
    station: 'biology',
    title: 'Observing Cells Under the Microscope',
    objective: 'Bring a specimen into sharp focus at 40× using correct low-to-high power technique, and capture an image for your notebook.',
    safety: ['Always start at the lowest power.', 'Never use coarse focus at 40× or 100×; it can crack the slide.'],
    intro: "Let's look at cells. Always start on the 4× objective. Check the turret, then look through the eyepieces.",
    steps: [
      { id: 'low', text: 'Select the 4× scanning objective', coach: 'Turn the turret to 4×, the shortest objective with the red band. Tap its left side to go down in power.', done: (l) => l.biology.objective === '4x' },
      { id: 'focus4', text: 'Focus the specimen at 4×', coach: 'Use the coarse focus until the image is sharp at 4×.', done: (l) => l.biology.objective === '4x' && microscopeSharpness(l.biology) > 0.8 },
      { id: 'focus10', text: 'Switch to 10× and refocus', coach: 'Now 10×. Only small focus adjustments are needed.', done: (l) => l.biology.objective === '10x' && microscopeSharpness(l.biology) > 0.8 },
      { id: 'focus40', text: 'Switch to 40× and fine-focus', coach: 'Go to 40× and use only the fine focus from here.', done: (l) => l.biology.objective === '40x' && microscopeSharpness(l.biology) > 0.8 },
      { id: 'capture', text: 'Capture the field of view to your notebook', coach: 'Nicely focused. Capture the image to your lab notebook.', done: (_l, r) => (r.events.snapshot ?? 0) > 0 },
    ],
    mistakes: [
      { id: 'highFirst', message: "Don't start on high power. Go back to 4× and focus there first; it protects the slide and the lens.", check: (l, r) => (l.biology.objective === '40x' || l.biology.objective === '100x') && !r.completedSteps.includes('focus4') },
      { id: 'noOil', message: '100× is an oil-immersion lens. Without oil the image will be blurry.', check: (l) => l.biology.objective === '100x' && !l.biology.immersionOil },
      { id: 'crash', message: 'You drove the objective into the slide. On high power, only ever use the fine focus.', check: (_l, r) => (r.events.slideCrack ?? 0) > 0 },
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
    intro: "We'll verify Ohm's law. First complete the circuit: the return lead is unplugged. Then close the switch and record the current at three rheostat settings.",
    steps: [
      { id: 'wire', text: 'Plug the return lead into the power supply', coach: 'The circuit is incomplete: pick up the loose red lead and plug it into the power supply terminal.', done: (l) => l.physics.wired },
      { id: 'close', text: 'Close the knife switch', coach: 'Close the knife switch to complete the circuit.', done: (l) => l.physics.switchClosed },
      { id: 'measure', text: 'Record current at 3 different resistances', coach: 'Record the ammeter reading, change the rheostat, and repeat. Three settings at least.', done: (_l, r) => new Set(r.readings.map((x) => x.extra?.R)).size >= 3 },
      { id: 'open', text: 'Open the switch when finished', coach: 'Good data. Open the switch to make the circuit safe.', done: (l, r) => !l.physics.switchClosed && r.readings.length >= 3 },
    ],
    mistakes: [
      { id: 'overcurrent', message: "That's over 1 A. Turn the resistance up before you burn out the bulb.", check: (l) => l.physics.wired && l.physics.switchClosed && l.physics.voltage / l.physics.resistance > 1 },
    ],
    recordLabel: 'Record ammeter reading',
    readingsNeeded: 3,
    record: (l) => {
      if (!l.physics.wired) return 'The circuit is incomplete: plug in the return lead.';
      if (!l.physics.switchClosed) return 'Close the switch first: no current is flowing.';
      const I = l.physics.voltage / l.physics.resistance;
      return { label: `I at R = ${l.physics.resistance} Ω`, value: Math.round(I * 1000) / 1000, unit: 'A', extra: { R: l.physics.resistance, V: l.physics.voltage } };
    },
    evaluate: (r) => {
      const Rs = [...new Set(r.readings.map((x) => x.extra?.R ?? 0))];
      const span = Rs.length ? Math.max(...Rs) - Math.min(...Rs) : 0;
      return [
        { label: 'Data collected', points: Math.round((Math.min(3, Rs.length) / 3) * 50), max: 50, note: `${Rs.length} distinct resistance settings.` },
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
      { id: 'overTarget', message: "You're over 0.15 g. On a real balance you'd remove some; note it and be more careful.", check: (l, r) => r.completedSteps.includes('tare') && l.research.massOnPan - l.research.tareOffset > 0.15 },
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
  {
    id: 'flame',
    station: 'hood',
    title: 'Flame Tests for Metal Ions',
    objective: 'Identify the characteristic flame colour of five metal ions (Li⁺, Na⁺, K⁺, Ca²⁺, Cu²⁺) using a clean nichrome loop in a blue Bunsen flame.',
    safety: ['Work inside the fume hood with the sash lowered.', 'Never leave gas on without a flame.', 'Clean the loop in acid and flame between samples.'],
    intro: 'Flame tests today, in the fume hood. Lower the sash to working height first, then gas on and light the burner straight away.',
    steps: [
      { id: 'sash', text: 'Lower the fume hood sash to working height', coach: 'First, pull the fume hood sash down to working height. It shields your face and keeps the fumes in the hood.', done: (l) => l.flame.sashDown },
      { id: 'light', text: 'Turn on the gas and light the Bunsen burner', coach: 'Gas tap on, then the lighter to the top of the barrel. Never leave gas running unlit.', done: (l) => l.flame.lit },
      { id: 'blue', text: 'Open the air hole for a blue, non-luminous flame', coach: 'Turn the air collar to open the air hole. A yellow flame would hide the colours.', done: (l) => l.flame.lit && l.flame.airOpen },
      { id: 'tests', text: 'Test all five samples, cleaning the loop between each', coach: 'Pick up the loop. For each sample: dip in the acid, heat until no colour, dip in the sample, then hold it at the edge of the flame.', done: (_l, r) => new Set(r.readings.map((x) => x.label)).size >= 5 },
      { id: 'off', text: 'Turn the gas off', coach: "All five done. Turn the gas off at the tap, and don't touch the barrel: it stays hot.", done: (l, r) => !l.flame.gasOn && r.readings.length >= 5 },
    ],
    mistakes: [
      { id: 'sashUp', message: 'Sash down! Never work at a flame in the hood with the sash raised.', check: (l) => l.flame.lit && !l.flame.sashDown },
      { id: 'gasUnlit', message: 'Gas is running with no flame! Light it now or turn it off. Unburnt gas is a fire and explosion risk.', check: (_l, r) => (r.events.gasUnlit ?? 0) > 0 },
      { id: 'contaminated', message: "That loop wasn't cleaned. The old sample will mix colours. Dip it in acid and heat it until the flame shows no colour first.", check: (_l, r) => (r.events.contaminated ?? 0) > 0 },
      { id: 'luminous', message: 'That was a yellow flame: its own colour masks the sample. Open the air hole for a blue flame.', check: (_l, r) => (r.events.luminousTest ?? 0) > 0 },
    ],
    recordLabel: 'Observations are recorded automatically',
    readingsNeeded: 0,
    record: () => 'Hold a sample in the flame; the observation is recorded for you.',
    evaluate: (r, l) => {
      const tested = new Set(r.readings.map((x) => x.label)).size;
      const dirty = r.events.contaminated ?? 0;
      return [
        { label: 'Samples tested', points: tested * 10, max: 50, note: `${tested}/5 metal ions observed.` },
        { label: 'Clean technique', points: Math.max(0, 30 - dirty * 15), max: 30, note: dirty ? `Loop not cleaned ${dirty} time(s): colours contaminated.` : 'Loop cleaned between every sample.' },
        { label: 'Correct flame', points: r.events.luminousTest ? 0 : 10, max: 10, note: r.events.luminousTest ? 'Tested in a yellow luminous flame.' : 'All tests in a blue flame.' },
        { label: 'Gas & hood safety', points: (r.events.gasUnlit ? 0 : 4) + (!l.flame.gasOn ? 3 : 0) + (r.mistakes.includes('sashUp') ? 0 : 3), max: 10, note: r.events.gasUnlit ? 'Gas left running unlit.' : r.mistakes.includes('sashUp') ? 'Worked at the flame with the sash raised.' : 'Gas and sash handled safely.' },
      ];
    },
  },
  {
    id: 'pendulum',
    station: 'pendulum',
    title: 'Measuring g with a Simple Pendulum',
    objective: 'Time 10 swings at three or more string lengths and use T = 2π√(L/g) to find the acceleration due to gravity.',
    safety: ['Keep the swing small (under 10°) so the formula holds.', 'Clear the area the bob swings through.'],
    intro: "Let's measure g. Pull the bob aside a little and let go, then time ten full swings with the stopwatch.",
    steps: [
      { id: 'release', text: 'Pull the bob aside a little and release it', coach: 'Tap the bob: a small angle only, then let go cleanly.', done: (l) => l.pendulum.swinging },
      { id: 'time', text: 'Time 10 complete swings and record', coach: 'Start the stopwatch as the bob passes the centre, count ten swings, stop. Then record.', done: (_l, r) => r.readings.length >= 1 },
      { id: 'lengths', text: 'Repeat for at least 3 different lengths', coach: 'Change the length at the clamp and repeat. Three lengths at least.', done: (_l, r) => new Set(r.readings.map((x) => x.extra?.L)).size >= 3 },
    ],
    mistakes: [
      {
        id: 'badTiming',
        message: "That time doesn't match the swing: count ten FULL swings (there and back), starting the clock as it passes the middle.",
        check: (_l, r) =>
          r.readings.some((x) => {
            const T = 2 * Math.PI * Math.sqrt((x.extra?.L ?? 1) / 9.81);
            return Math.abs(x.value / 10 - T) / T > 0.2;
          }),
      },
    ],
    recordLabel: 'Record 10 swings',
    readingsNeeded: 3,
    record: (l) => {
      const w = stopwatchTime('pend_watch');
      if (w === null) return 'Stop the stopwatch first.';
      if (w < 1) return 'Time ten swings with the stopwatch first.';
      return { label: `L = ${(l.pendulum.length * 100).toFixed(0)} cm`, value: Math.round(w * 100) / 100, unit: 's for 10 swings', extra: { L: l.pendulum.length } };
    },
    evaluate: (r) => {
      const gs = r.readings.map((x) => (4 * Math.PI * Math.PI * (x.extra?.L ?? 0)) / Math.pow(x.value / 10, 2));
      const g = gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : 0;
      const err = Math.abs(g - 9.81) / 9.81;
      const Ls = new Set(r.readings.map((x) => x.extra?.L)).size;
      return [
        { label: 'Value of g', points: band(err, [[0.03, 50], [0.07, 38], [0.15, 22], [0.3, 8]]), max: 50, note: `Your data give g = ${g.toFixed(2)} m/s² (accepted 9.81).` },
        { label: 'Range of data', points: Math.min(3, Ls) * 10, max: 30, note: `${Ls} different string lengths.` },
        { label: 'Timing technique', points: r.mistakes.includes('badTiming') ? 5 : 20, max: 20, note: r.mistakes.includes('badTiming') ? 'At least one timing was well off.' : 'Ten-swing timings were consistent.' },
      ];
    },
  },
  {
    id: 'rates',
    station: 'rates',
    title: 'Rate of Reaction: the Disappearing Cross',
    objective: 'Find how the concentration of sodium thiosulfate affects how quickly it reacts with hydrochloric acid (sulfur clouds the solution and hides the cross).',
    safety: ['Sulfur dioxide is produced: keep the room ventilated.', 'Rinse the flask straight after each run.'],
    intro: 'Disappearing cross today. Pour a thiosulfate mixture into the flask, then add the acid and start the stopwatch at the same moment.',
    steps: [
      { id: 'mix', text: 'Pour a thiosulfate mixture into the flask', coach: 'Pick one of the five mixtures and pour it into the flask on the cross.', done: (l, r) => l.rates.thioCm3 > 0 || r.readings.length > 0 },
      { id: 'react', text: 'Add the acid and start the stopwatch', coach: 'Add the HCl and start the clock at the same moment.', done: (l, r) => l.rates.acidAdded || r.readings.length > 0 },
      { id: 'time', text: 'Stop the clock when the cross disappears, and record', coach: 'Look straight down through the flask. Stop the clock the moment the cross vanishes, then record.', done: (_l, r) => r.readings.length >= 1 },
      { id: 'repeat', text: 'Repeat for at least 4 concentrations', coach: 'Empty and rinse the flask (tap it), then repeat with a different mixture. Four concentrations at least.', done: (_l, r) => new Set(r.readings.map((x) => x.extra?.thio)).size >= 4 },
    ],
    mistakes: [],
    recordLabel: 'Record time',
    readingsNeeded: 4,
    record: (l) => {
      const w = stopwatchTime('rates_watch');
      if (!l.rates.acidAdded) return 'Start a run first: mixture, then acid.';
      if (w === null) return 'Stop the stopwatch first.';
      if (w < 1) return 'Time the reaction with the stopwatch.';
      return { label: `${l.rates.thioCm3} cm³ thiosulfate`, value: Math.round(w * 10) / 10, unit: 's', extra: { thio: l.rates.thioCm3, actual: l.rates.obscureAfter } };
    },
    evaluate: (r) => {
      const runs = r.readings;
      const n = new Set(runs.map((x) => x.extra?.thio)).size;
      const errs = runs.map((x) => Math.abs(x.value - (x.extra?.actual ?? x.value)) / (x.extra?.actual ?? 1));
      const meanErr = errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : 1;
      // Trend: higher concentration should give a shorter time
      const sorted = [...runs].sort((a, b) => (a.extra?.thio ?? 0) - (b.extra?.thio ?? 0));
      const trendOk = sorted.every((x, i) => i === 0 || x.value <= sorted[i - 1].value * 1.1);
      return [
        { label: 'Concentrations tested', points: Math.min(4, n) * 10, max: 40, note: `${n} different concentrations.` },
        { label: 'Timing accuracy', points: band(meanErr, [[0.08, 35], [0.15, 25], [0.3, 12]]), max: 35, note: `Your times were within ${(meanErr * 100).toFixed(0)}% of when the cross actually vanished.` },
        { label: 'Trend', points: trendOk ? 25 : 8, max: 25, note: trendOk ? 'Higher concentration → faster reaction, as expected.' : 'Your times don’t show a clear trend; check the timings.' },
      ];
    },
  },
  {
    id: 'osmosis',
    station: 'osmosis',
    title: 'Osmosis in Potato Strips',
    objective: 'Measure the % change in mass of potato strips in sucrose solutions (0.0-0.8 M) and estimate the concentration of the potato cells’ contents.',
    safety: ['Take care with cutting tools (the strips are pre-cut here).', 'Blot every strip the same way.'],
    intro: 'Osmosis today. Weigh each potato strip, put it in its sucrose tube, leave them 30 minutes, then blot and reweigh.',
    steps: [
      { id: 'setup', text: 'Weigh each strip and put it in a sucrose tube (all 5)', coach: 'Tap the strips to weigh one, then tap a tube to put it in. Do all five.', done: (l) => l.osmosis.tubes.every((t) => t.inTube || t.final != null) },
      { id: 'wait', text: 'Leave them for 30 minutes', coach: 'Now leave them. Use “Leave for 30 minutes”.', done: (l) => l.osmosis.minutes >= 30 },
      { id: 'reweigh', text: 'Remove, blot and reweigh every strip', coach: 'Take each strip out (tap its tube): it is blotted on the towel and weighed. Clear the balance between strips.', done: (l) => l.osmosis.tubes.every((t) => t.final != null) },
      { id: 'answer', text: 'Estimate the concentration where mass doesn’t change', coach: 'Look at your % changes: where would the line cross zero? That is the isotonic point.', done: (_l, r) => r.readings.some((x) => x.label === 'Answer') },
    ],
    mistakes: [],
    recordLabel: '',
    readingsNeeded: 0,
    record: () => 'Masses are read from the balance automatically.',
    panelActions: (l) =>
      l.osmosis.minutes < 30 && l.osmosis.tubes.some((t) => t.inTube)
        ? [{ label: '⏱ Leave for 30 minutes', run: () => labStore.update('osmosis', { minutes: 30 }) }]
        : [],
    answer: { prompt: 'Isotonic concentration (where % change = 0)', unit: 'M' },
    evaluate: (r, l) => {
      const done = l.osmosis.tubes.filter((t) => t.final != null).length;
      const ans = r.readings.find((x) => x.label === 'Answer')?.value ?? -1;
      const err = Math.abs(ans - 0.3);
      return [
        { label: 'Measurements', points: done * 8, max: 40, note: `${done}/5 strips weighed before and after.` },
        { label: 'Conclusion', points: band(err, [[0.05, 45], [0.1, 30], [0.2, 12]]), max: 45, note: `You estimated ${ans.toFixed(2)} M; the data cross zero near 0.30 M.` },
        { label: 'Method', points: 15, max: 15, note: 'Strips blotted and weighed consistently.' },
      ];
    },
  },
  {
    id: 'chroma',
    station: 'chroma',
    title: 'Paper Chromatography of Inks',
    objective: 'Separate the dyes in two known inks and an unknown, and calculate the Rf value of the red dye.',
    safety: ['Use a pencil baseline: pen ink would run with the solvent.', 'Keep the baseline above the solvent level.'],
    intro: 'Chromatography today. Draw a pencil baseline, spot the three inks on it, then hang the paper in the solvent.',
    steps: [
      { id: 'baseline', text: 'Draw a pencil baseline', coach: 'Pencil, not pen: graphite doesn’t dissolve, so it won’t run up the paper.', done: (l) => l.chroma.baseline },
      { id: 'spots', text: 'Spot the three inks on the baseline', coach: 'Small, concentrated spots on the line: A, B and the unknown.', done: (l) => l.chroma.spots >= 3 },
      { id: 'run', text: 'Hang the paper in the solvent', coach: 'Lower it so the baseline sits just above the solvent.', done: (l) => l.chroma.inSolvent || l.chroma.removed },
      { id: 'remove', text: 'Remove the paper near the top and let it dry', coach: 'Take it out before the front reaches the top.', done: (l) => l.chroma.removed },
      { id: 'answer', text: 'Measure and calculate the Rf of the red dye', coach: 'Rf = distance moved by the dye ÷ distance moved by the solvent, both from the baseline.', done: (_l, r) => r.readings.some((x) => x.label === 'Answer') },
    ],
    mistakes: [{ id: 'noBaseline', message: 'Spotting without a baseline: you won’t be able to measure the distances.', check: (l) => l.chroma.spots > 0 && !l.chroma.baseline }],
    recordLabel: '',
    readingsNeeded: 0,
    record: () => 'Measure the paper to calculate Rf.',
    answer: { prompt: 'Rf of the red dye (0 to 1)', unit: '' },
    evaluate: (r) => {
      const ans = r.readings.find((x) => x.label === 'Answer')?.value ?? -1;
      const err = Math.abs(ans - 0.47);
      return [
        { label: 'Rf value', points: band(err, [[0.03, 50], [0.07, 35], [0.15, 15]]), max: 50, note: `You calculated ${ans.toFixed(2)}; the red dye’s Rf is about 0.47.` },
        { label: 'Technique', points: r.mistakes.includes('noBaseline') ? 15 : 35, max: 35, note: r.mistakes.includes('noBaseline') ? 'Spotted before drawing the baseline.' : 'Pencil baseline, small spots, removed in time.' },
        { label: 'Interpretation', points: 15, max: 15, note: 'The unknown contains the blue dye of A and the red dye of B (matching Rf values).' },
      ];
    },
  },
];

/** Time on a bench stopwatch: null while it is still running. */
function stopwatchTime(id: string): number | null {
  const w = stopwatches[id];
  if (!w) return 0;
  return w.running ? null : w.elapsed;
}

/** Flame colour of each salt, for observations. */
export const FLAME_COLOURS = SALTS;

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
type Listener = (e: { type: 'step' | 'mistake' | 'finished' | 'started' | 'reset'; message: string; result?: ExperimentResult }) => void;
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

const STATION_STATE: Record<Station, keyof LabState> = {
  chemistry: 'chemistry',
  biology: 'biology',
  physics: 'physics',
  research: 'research',
  hood: 'flame',
  pendulum: 'pendulum',
  rates: 'rates',
  osmosis: 'osmosis',
  chroma: 'chroma',
};

/** Clean the bench after a practical: glassware emptied, switches off, gas off. */
function cleanUp(def: ExperimentDef) {
  labStore.resetKey(STATION_STATE[def.station]);
  emit({ type: 'reset', message: '' });
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
    titration.subscribe(evaluate); // lab sheet and apparatus changes move the practical on too
  },
  start(id: string) {
    const def = getExperiment(id);
    if (!def) return;
    // Fresh apparatus for the practical
    if (def.id === 'titration') {
      titration.reset();
      labStore.update('chemistry', { buretteML: 0, flaskAcidML: 0, buretteOpen: false, dispensedML: 0, indicatorAdded: false, stirrerRPM: 0, phValue: titrationPH(0, 0) });
    }
    if (def.id === 'weighing') labStore.update('research', { doorsOpen: false, massOnPan: 1.2034, tareOffset: 0 });
    if (['pendulum', 'rates', 'osmosis', 'chroma'].includes(def.station)) labStore.resetKey(STATION_STATE[def.station]);
    if (def.id === 'ohms-law') labStore.update('physics', { wired: false, switchClosed: false, resistance: 25, voltage: 12 });
    if (def.id === 'flame') labStore.update('flame', { gasOn: false, lit: false, airOpen: false, loop: 'clean', sashDown: false });
    if (def.id === 'microscopy') labStore.update('biology', { objective: '10x', coarseFocus: 0.2, fineFocus: 0.5, immersionOil: false });
    set({ run: { experimentId: id, startedAt: Date.now(), completedSteps: [], readings: [], mistakes: [], events: {} }, lastResult: null });
    emit({ type: 'started', message: def.intro });
    evaluate();
  },
  abandon() {
    const def = getExperiment(state.run?.experimentId);
    set({ run: null });
    if (def) cleanUp(def);
  },
  dismissResult() {
    const def = getExperiment(state.lastResult?.experimentId);
    set({ lastResult: null });
    if (def) cleanUp(def);
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
  /** A reading the student took themselves (e.g. read off the burette scale). */
  recordManual(reading: Reading) {
    const run = state.run;
    if (!run) return;
    set({ run: { ...run, readings: [...run.readings, reading] } });
    evaluate();
  },
  /** An observation recorded by the apparatus itself (e.g. a flame colour). Ignored if no practical is running. */
  addReading(reading: Reading) {
    const run = state.run;
    if (!run) return;
    set({ run: { ...run, readings: [...run.readings, reading] } });
    evaluate();
  },
  /** Count an occurrence (mistakes like contamination can happen more than once). */
  count(name: string) {
    const run = state.run;
    if (!run) return;
    set({ run: { ...run, events: { ...run.events, [name]: (run.events[name] ?? 0) + 1 } } });
    evaluate();
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
