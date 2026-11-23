import type { Station } from '@/lib/labStore';

/**
 * What each practical teaches, what it needs, and why each step matters. Kept apart from the
 * simulation logic in experiments.ts so the library, the brief, Dr. Curie and (later) exam-style
 * marking all read the same description.
 */

export type Subject = 'Biology' | 'Chemistry' | 'Physics';
export type Difficulty = 'Starter' | 'Intermediate' | 'Advanced';

/** Practical-exam skills, so results can later be marked against a scheme. */
export type ExamSkill = 'apparatus' | 'setup' | 'measurement' | 'recording' | 'observation' | 'calculation' | 'interpretation' | 'safety';
export const SKILL_LABEL: Record<ExamSkill, string> = {
  apparatus: 'Identify apparatus',
  setup: 'Set up correctly',
  measurement: 'Measure accurately',
  recording: 'Record results',
  observation: 'Observe',
  calculation: 'Calculate',
  interpretation: 'Interpret',
  safety: 'Work safely',
};

/**
 * How serious a mistake is. A student should learn "I did X, so Y happened", and should only
 * have to start again when the mistake really spoils the result.
 */
export type MistakeKind = 'safety' | 'procedure' | 'measurement' | 'technique';
export const MISTAKE_KIND: Record<MistakeKind, { label: string; tone: string }> = {
  safety: { label: 'Safety', tone: 'text-rose-300 border-rose-500/40 bg-rose-500/10' },
  procedure: { label: 'Procedure', tone: 'text-amber-300 border-amber-500/40 bg-amber-500/10' },
  measurement: { label: 'Measurement', tone: 'text-sky-300 border-sky-500/40 bg-sky-500/10' },
  technique: { label: 'Technique', tone: 'text-violet-300 border-violet-500/40 bg-violet-500/10' },
};

export interface MistakeMeta {
  kind: MistakeKind;
  /** Can the student carry on and still get a valid result? */
  recoverable: boolean;
  /** What it does to the result, in one line ("so your titre will be too high"). */
  consequence: string;
  /** What to do now. */
  fix: string;
}

export interface PracticalMeta {
  subject: Subject;
  difficulty: Difficulty;
  minutes: number;
  /** One line a student reads in the library. */
  learn: string;
  apparatus: string[];
  skills: ExamSkill[];
  /** Why each step is done, keyed by step id. */
  why: Record<string, string>;
  mistakes: Record<string, MistakeMeta>;
}

export const PRACTICAL_META: Record<string, PracticalMeta> = {
  microscopy: {
    subject: 'Biology',
    difficulty: 'Starter',
    minutes: 8,
    learn: 'Use a light microscope properly: low power first, then focus up to 40×.',
    apparatus: ['Compound light microscope', 'Prepared slide', 'Coarse and fine focus knobs', 'Objective turret (4×, 10×, 40×, 100×)'],
    skills: ['apparatus', 'setup', 'observation', 'safety'],
    why: {
      low: 'The 4× lens shows the widest field and has the most room above the slide, so you find the specimen without hitting it.',
      focus4: 'Focusing at low power first means only small adjustments are needed later.',
      focus10: 'Each step up in power magnifies more but shows a smaller, dimmer field.',
      focus40: 'At 40× the lens is very close to the slide: the coarse knob could crack it, so use fine focus only.',
      capture: 'A record of what you saw, like a labelled drawing in your practical book.',
    },
    mistakes: {
      cracked: { kind: 'safety', recoverable: true, consequence: 'At 40× the lens is almost touching the slide. The coarse knob moves the stage a long way, so it drove the slide into the lens and cracked it. In a real lab that can also scratch an expensive lens.', fix: 'Take a fresh slide from the box, go back to 4×, and use only the fine focus at 40×.' },
      highFirst: { kind: 'technique', recoverable: true, consequence: 'At high power the field is tiny and the lens sits close to the slide, so you can lose the specimen or crack the slide.', fix: 'Go back to 4×, focus, then work up.' },
      noOil: { kind: 'technique', recoverable: true, consequence: 'Light bends as it leaves the glass into air, so the 100× image stays blurred.', fix: 'Add a drop of immersion oil, or use 40×.' },
    },
  },
  osmosis: {
    subject: 'Biology',
    difficulty: 'Intermediate',
    minutes: 10,
    learn: 'Show how water moves in and out of cells, and find the concentration of potato cell sap.',
    apparatus: ['Potato strips (same size)', '5 boiling tubes of sucrose (0.0–0.8 M)', 'Top-pan balance', 'Paper towel'],
    skills: ['measurement', 'recording', 'calculation', 'interpretation'],
    why: {
      setup: 'You need each strip’s starting mass to work out its percentage change later.',
      wait: 'Osmosis is slow: the strips need time to gain or lose water.',
      reweigh: 'Blotting removes surface water that isn’t inside the cells; otherwise every mass would be too high.',
      answer: 'Where there is no change in mass, the solution matches the cells’ own concentration.',
    },
    mistakes: {},
  },
  titration: {
    subject: 'Chemistry',
    difficulty: 'Advanced',
    minutes: 15,
    learn: 'Find the exact volume of alkali that neutralises an acid, and get two concordant titres.',
    apparatus: ['Burette and stand', 'Funnel', 'Conical flask on a white tile', '25 mL measuring cylinder of HCl', 'Phenolphthalein indicator', 'Magnetic stirrer'],
    skills: ['apparatus', 'setup', 'measurement', 'recording', 'calculation', 'safety'],
    why: {
      fill: 'The burette measures exactly how much alkali you add, starting from the 0.00 mark.',
      acid: 'A known volume of acid is what you are neutralising.',
      indicator: 'Phenolphthalein is colourless in acid and turns pink once all the acid is used up: that is the endpoint.',
      stir: 'Each drop must mix in, or you will see pink where the drop lands before the whole flask is neutral.',
      initial: 'The burette is rarely filled exactly to 0.00, so you record where it starts. Titre = final reading − initial reading.',
      titrate: 'Add alkali quickly at first, then slowly as you get close.',
      endpoint: 'The first faint pink that stays is the endpoint. Past it, every extra drop makes the titre too big.',
      record: 'Read the bottom of the meniscus at eye level, to the nearest 0.05 mL, then subtract the initial reading.',
      concordant: 'One titre could be a fluke. Two that agree within 0.10 mL show your result is reliable.',
    },
    mistakes: {
      noIndicator: { kind: 'procedure', recoverable: false, consequence: 'Without indicator nothing changes colour, so you cannot tell where the endpoint is and this run’s titre is meaningless.', fix: 'Close the tap and start a new run with indicator in the flask.' },
      noAcid: { kind: 'procedure', recoverable: false, consequence: 'With no acid in the flask there is nothing to neutralise.', fix: 'Start a new run: acid first, then indicator, then titrate.' },
      overshoot: { kind: 'measurement', recoverable: true, consequence: 'Deep pink means excess alkali: this titre is too high. Real chemists call a first, overshot run the “rough” titre.', fix: 'Record it, start a new run, and slow to single drops about 1 mL before this value.' },
    },
  },
  flame: {
    subject: 'Chemistry',
    difficulty: 'Intermediate',
    minutes: 12,
    learn: 'Identify metal ions from the colour they give a blue Bunsen flame.',
    apparatus: ['Bunsen burner in a fume hood', 'Nichrome wire loop', 'Dilute hydrochloric acid', 'Five metal chloride samples'],
    skills: ['setup', 'observation', 'recording', 'interpretation', 'safety'],
    why: {
      sash: 'The lowered sash is a shield between your face and the flame and keeps fumes in the hood.',
      light: 'Light the gas straight away: unlit gas collecting in the hood can ignite all at once.',
      blue: 'A blue flame is hot and almost colourless, so the metal’s own colour shows. A yellow flame hides it.',
      tests: 'Cleaning the loop in acid and flame between samples stops the last metal’s colour mixing with the next.',
      off: 'Gas off at the end, every time.',
    },
    mistakes: {
      sashUp: { kind: 'safety', recoverable: true, consequence: 'With the sash raised nothing stands between your face and the flame or the fumes.', fix: 'Lower the sash before working at the flame.' },
      gasUnlit: { kind: 'safety', recoverable: true, consequence: 'Unburnt gas builds up and can ignite suddenly.', fix: 'Light it at once, or turn the gas off.' },
      contaminated: { kind: 'technique', recoverable: true, consequence: 'The old sample is still on the loop, so two colours mix and you cannot identify the ion.', fix: 'Dip the loop in acid, heat it until the flame shows no colour, then test again.' },
      luminous: { kind: 'technique', recoverable: true, consequence: 'The yellow flame’s own colour masks the sample’s colour.', fix: 'Open the air hole for a blue flame and repeat that test.' },
    },
  },
  rates: {
    subject: 'Chemistry',
    difficulty: 'Intermediate',
    minutes: 12,
    learn: 'See how the concentration of a reactant changes how fast a reaction goes.',
    apparatus: ['Conical flask on a paper cross', 'Sodium thiosulfate solutions (5 concentrations)', 'Dilute hydrochloric acid', 'Stopwatch'],
    skills: ['measurement', 'recording', 'interpretation', 'safety'],
    why: {
      mix: 'Only the thiosulfate concentration changes between runs: the volume, acid and temperature stay the same, so it is a fair test.',
      react: 'The reaction starts when the acid goes in, so that is when timing must start.',
      time: 'The sulfur formed makes the liquid cloudy. When the cross disappears, the same amount of sulfur has formed every run.',
      repeat: 'Several concentrations let you see the pattern: more concentrated means more collisions per second, so a faster reaction.',
    },
    mistakes: {},
  },
  chroma: {
    subject: 'Chemistry',
    difficulty: 'Starter',
    minutes: 8,
    learn: 'Separate the dyes in inks and identify an unknown using Rf values.',
    apparatus: ['Chromatography paper', 'Pencil', 'Inks A, B and an unknown', 'Beaker of solvent (water)', 'Ruler'],
    skills: ['setup', 'measurement', 'calculation', 'interpretation'],
    why: {
      baseline: 'You measure every distance from this line. Pencil is used because graphite does not dissolve and run.',
      spots: 'Small, concentrated spots give sharp, separate dyes instead of smears.',
      run: 'The baseline must stay above the solvent, or the dyes dissolve into the beaker instead of climbing the paper.',
      remove: 'Take it out before the front reaches the top, and mark the front: you need its distance for Rf.',
      answer: 'Rf = distance moved by the dye ÷ distance moved by the solvent. The same dye gives the same Rf in the same solvent.',
    },
    mistakes: {
      noBaseline: { kind: 'procedure', recoverable: true, consequence: 'With no baseline there is no fixed point to measure distances from.', fix: 'Draw the baseline before spotting next time.' },
      drowned: { kind: 'procedure', recoverable: false, consequence: 'With the spots below the solvent surface, the dyes dissolve into the beaker instead of being carried up the paper, so nothing separates.', fix: 'Restart the practical and hang the paper so the baseline is just above the solvent.' },
    },
  },
  weighing: {
    subject: 'Chemistry',
    difficulty: 'Starter',
    minutes: 6,
    learn: 'Weigh a small sample accurately on an analytical balance using tare and the draft shield.',
    apparatus: ['Analytical balance (0.0001 g)', 'Draft shield', 'Weighing boat', 'Spatula', 'Sample jar'],
    skills: ['apparatus', 'measurement', 'recording'],
    why: {
      tare: 'Tare sets the display to zero with the boat on, so the reading is the sample alone.',
      open: 'The shield is opened only to add sample.',
      add: 'Small additions let you stop inside the target range.',
      close: 'Air moving through the open shield pushes on the pan, so the last digits drift.',
      record: 'Record every digit the balance shows: that is its precision.',
    },
    mistakes: {
      overTarget: { kind: 'measurement', recoverable: true, consequence: 'The mass is above the required range.', fix: 'Remove a little sample with the spatula, or note the actual mass you used.' },
    },
  },
  'ohms-law': {
    subject: 'Physics',
    difficulty: 'Intermediate',
    minutes: 10,
    learn: 'Measure current and voltage for a resistor and show they are proportional: V = I × R.',
    apparatus: ['Power supply (12 V)', 'Knife switch', 'Fixed resistor (under test)', 'Rheostat (variable resistor)', 'Ammeter (in series)', 'Voltmeter (across the resistor)', 'Connecting leads'],
    skills: ['apparatus', 'setup', 'measurement', 'recording', 'calculation', 'interpretation', 'safety'],
    why: {
      wire: 'Current only flows round a complete loop.',
      close: 'The switch completes the circuit; leave it open while you change connections.',
      measure: 'The ammeter goes in series because current is the same all round a series loop; the voltmeter goes across the resistor because it compares the two ends. The rheostat changes the current so you get several points.',
      open: 'Opening the switch stops current, so nothing heats up while you work.',
      answer: 'If V ÷ I is the same every time, V is proportional to I: that is Ohm’s law, and the constant is the resistance.',
    },
    mistakes: {
      overcurrent: { kind: 'safety', recoverable: true, consequence: 'Too much current heats the resistor; a hot resistor changes its resistance, so your readings stop fitting a straight line (and it can burn out).', fix: 'Turn the rheostat up to reduce the current, then carry on.' },
    },
  },
  pendulum: {
    subject: 'Physics',
    difficulty: 'Intermediate',
    minutes: 12,
    learn: 'Time a pendulum at several lengths and calculate the acceleration due to gravity, g.',
    apparatus: ['Retort stand, clamp and split cork', 'String and brass bob', 'Metre rule', 'Stopwatch'],
    skills: ['setup', 'measurement', 'recording', 'calculation'],
    why: {
      release: 'A small angle (under about 10°) keeps the swing time independent of how far you pulled it.',
      time: 'Timing 10 swings and dividing by 10 makes your reaction-time error ten times smaller than timing one.',
      lengths: 'g comes from how the period changes with length, so you need several lengths.',
    },
    mistakes: {
      lengthToEdge: { kind: 'measurement', recoverable: true, consequence: 'g is calculated from L, so a length measured to the top or bottom of the bob (about 2 cm out) gives a wrong g.', fix: 'Measure from the point of suspension to the centre of the bob.' },
      badTiming: { kind: 'measurement', recoverable: true, consequence: 'That time does not fit 10 full swings, so it would give a wrong value of g.', fix: 'Start the watch as the bob passes the middle, count 10 complete swings, then stop.' },
    },
  },
};

export const SUBJECT_ORDER: Subject[] = ['Biology', 'Chemistry', 'Physics'];

/** Which practical is the gentlest place to start. */
export const START_HERE = 'microscopy';

export const metaFor = (id: string | null | undefined) => (id ? PRACTICAL_META[id] : undefined);

export const STATION_OF: Record<string, Station> = {
  microscopy: 'biology',
  osmosis: 'osmosis',
  titration: 'chemistry',
  flame: 'hood',
  rates: 'rates',
  chroma: 'chroma',
  weighing: 'research',
  'ohms-law': 'physics',
  pendulum: 'pendulum',
};
