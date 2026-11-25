'use client';

import { EXPERIMENTS, experiments, getExperiment } from '@/lib/experiments';
import { PRACTICAL_META } from '@/lib/practicalMeta';
import type { Station } from '@/lib/labStore';

/**
 * What Dr. Curie knows, generated from the practical definitions so it never goes stale.
 * Also her offline "local brain": answers built from the same data when the AI is unreachable.
 */

/** Apparatus she can operate at each bench (ids the bench understands, with plain names). */
export const BENCH_PARTS: Record<Station, Record<string, string>> = {
  biology: { micro_slide: 'slide box (new slide)', micro_turret: 'objective turret', micro_coarse_focus: 'coarse focus', micro_fine_focus: 'fine focus', micro_light_switch: 'lamp', micro_oil: 'immersion oil' },
  osmosis: { osm_strips: 'potato strips', osm_balance: 'balance', osm_tube_0: 'tube 0.0 M', osm_tube_1: 'tube 0.2 M', osm_tube_2: 'tube 0.4 M', osm_tube_3: 'tube 0.6 M', osm_tube_4: 'tube 0.8 M' },
  chemistry: { chem_naoh_bottle: 'NaOH bottle (fills the burette)', chem_hcl_cylinder: 'HCl measuring cylinder', chem_indicator: 'phenolphthalein', chem_flask: 'conical flask (swirl)', chem_stopcock: 'burette tap', chem_stirrer_knob: 'stirrer knob' },
  rates: { rates_flask: 'conical flask', rates_acid: 'hydrochloric acid', rates_watch: 'stopwatch', rates_thio_10: 'thiosulfate 10 cm3', rates_thio_20: 'thiosulfate 20 cm3', rates_thio_30: 'thiosulfate 30 cm3', rates_thio_40: 'thiosulfate 40 cm3', rates_thio_50: 'thiosulfate 50 cm3' },
  chroma: { chroma_pencil: 'pencil (baseline)', chroma_inks: 'inks (spot)', chroma_paper: 'chromatography paper', chroma_beaker: 'solvent beaker' },
  hood: { hood_sash: 'fume-hood sash', flame_gas_tap: 'gas tap', flame_lighter: 'lighter', flame_air_collar: 'air collar', flame_loop: 'wire loop', flame_acid: 'acid (clean the loop)', flame_zone: 'flame', flame_salt_li: 'lithium salt', flame_salt_na: 'sodium salt', flame_salt_k: 'potassium salt', flame_salt_ca: 'calcium salt', flame_salt_cu: 'copper salt' },
  research: { res_balance_door: 'balance draught-shield door', res_tare_btn: 'TARE button', res_weigh_boat: 'weighing boat', sample_jar: 'sample jar', spatula: 'spatula' },
  physics: { phys_return_lead: 'return lead', phys_knife_switch: 'switch', phys_potentiometer: 'rheostat', phys_ammeter_needle: 'ammeter (read)', phys_voltmeter: 'voltmeter (read)' },
  pendulum: { pend_bob: 'pendulum bob (release)', pend_clamp: 'clamp (change length)', pend_watch: 'stopwatch' },
};

/** The apparatus to point at when a student is stuck on a step (practical → step → part). */
export const STEP_PART: Record<string, Record<string, string>> = {
  titration: { fill: 'chem_naoh_bottle', acid: 'chem_hcl_cylinder', indicator: 'chem_indicator', stir: 'chem_stirrer_knob', titrate: 'chem_stopcock', endpoint: 'chem_stopcock' },
  microscopy: { low: 'micro_turret', focus4: 'micro_coarse_focus', focus10: 'micro_turret', focus40: 'micro_fine_focus' },
  'ohms-law': { wire: 'phys_return_lead', close: 'phys_knife_switch', measure: 'phys_potentiometer', open: 'phys_knife_switch' },
  weighing: { tare: 'res_tare_btn', open: 'res_balance_door', add: 'spatula', close: 'res_balance_door' },
  flame: { sash: 'hood_sash', light: 'flame_gas_tap', blue: 'flame_air_collar', tests: 'flame_loop', off: 'flame_gas_tap' },
  pendulum: { release: 'pend_bob', time: 'pend_watch', lengths: 'pend_clamp' },
  rates: { mix: 'rates_thio_50', react: 'rates_acid', time: 'rates_watch', repeat: 'rates_thio_40' },
  osmosis: { setup: 'osm_strips', reweigh: 'osm_balance' },
  chroma: { baseline: 'chroma_pencil', spots: 'chroma_inks', run: 'chroma_paper', remove: 'chroma_paper' },
};

/** Compact knowledge for the model: every practical in one line, the active one in full. */
export function buildKnowledge(): string {
  const run = experiments.get().run;
  const list = EXPERIMENTS.map((e) => `- ${e.title} [station: ${e.station}] ${PRACTICAL_META[e.id]?.learn ?? ''}`).join('\n');
  let detail = '';
  const def = getExperiment(run?.experimentId);
  if (def) {
    const m = PRACTICAL_META[def.id];
    detail =
      `\nACTIVE PRACTICAL IN DETAIL: ${def.title}\nSteps (in order):\n` +
      def.steps.map((s, i) => `${i + 1}. ${s.text}${m?.why[s.id] ? ` — why: ${m.why[s.id]}` : ''}`).join('\n') +
      `\nCommon mistakes:\n` +
      def.mistakes.map((x) => `- ${x.id}: ${m?.mistakes[x.id]?.consequence ?? x.message} Fix: ${m?.mistakes[x.id]?.fix ?? ''}`).join('\n') +
      `\nApparatus you can operate here (use_apparatus ids): ${Object.entries(BENCH_PARTS[def.station]).map(([id, n]) => `${id}=${n}`).join(', ')}`;
  }
  return `PRACTICALS IN THIS LAB:\n${list}${detail}`;
}

/** The step the student is on now, with its why. */
function currentStep() {
  const run = experiments.get().run;
  const def = getExperiment(run?.experimentId);
  if (!def || !run) return null;
  const step = def.steps.find((s) => !run.completedSteps.includes(s.id));
  return step ? { def, step, why: PRACTICAL_META[def.id]?.why[step.id] } : null;
}

/** Offline answer: useful, short, built from the practical data. */
export function localAnswer(question: string): string {
  const q = question.toLowerCase();
  const cur = currentStep();
  if (/(answer|titre|value of|what is r\b|what is g\b|rf)/.test(q) && cur) {
    return "I won't give you the number. That's the point of measuring it! Take the reading carefully and I'll check it with you.";
  }
  if (cur) {
    const why = cur.why ? ` Why: ${cur.why}` : '';
    if (/why/.test(q)) return cur.why ? `${cur.why}` : `It keeps your result accurate. Next: ${cur.step.text}.`;
    return `Next step: ${cur.step.text}.${why} ${cur.step.coach ?? ''}`.trim();
  }
  const run = experiments.get().run;
  if (!run) return 'Walk up to me, or press Practicals, and choose one. New here? Start with the microscope.';
  return 'You have done every step. Check your readings, then finish the practical to see your score.';
}

/** Offline debrief from the result breakdown. */
export function localDebrief(r: { title: string; score: number; breakdown: { label: string; points: number; max: number; note: string }[] }): string {
  const sorted = [...r.breakdown].sort((a, b) => a.points / a.max - b.points / b.max);
  const weak = sorted[0];
  const strong = sorted[sorted.length - 1];
  return `${r.title}: ${r.score}/100. Best part: ${strong.label.toLowerCase()} (${strong.note}). Work on: ${weak.label.toLowerCase()}. ${weak.note}.`;
}

export type { Station };
