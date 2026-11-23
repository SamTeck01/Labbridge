// Headless check of the student journey and practical logic. Usage: node tools/tests/practicals.mjs [outDir]
// Needs `npm run dev -- -p 3100` running. Playwright and Chromium are taken from the machine.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const out = process.argv[2] ?? '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
p.on('dialog', (d) => d.accept());
const w = (ms) => p.waitForTimeout(ms);
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); if (!ok) fails++; };

await p.goto('http://localhost:3100');
await p.evaluate(() => localStorage.clear());
await p.reload(); await w(4000);
await p.getByText('Enter Lab').first().click();
for (let i = 0; i < 90; i++) { if (await p.evaluate(() => !!window.__sitDownAt && !!window.__curie && !!window.__benches)) break; await w(2000); }
await w(5000);

// ---- Orientation and library
check('orientation shows on first visit', await p.getByText('Your first visit').waitFor({ timeout: 60000 }).then(() => true, () => false));
await p.getByRole('button', { name: /Practicals/ }).click(); await w(800);
const cards = await p.locator('[role=dialog] li').count();
check('library lists 9 practicals', cards === 9, `${cards} cards`);
check('library marks a starting point', await p.getByText('Start here').isVisible());
await p.screenshot({ path: `${out}/library.png` });
await p.getByText('Observing Cells Under the Microscope').click(); await w(400);
await p.getByRole('button', { name: 'Go to bench' }).click(); await w(9000);
const station = await p.evaluate(() => window.__curie.labStore.get().player.station);
check('“Go to bench” seats the student at the microscope', station === 'biology', String(station));
check('orientation ticked “Choose a practical”', await p.getByText('Go to the bench, goggles on').isVisible());

// ---- Titration logic: initial/final readings, overshoot -> new run -> concordant -> result
const T = await p.evaluate(async () => {
  const { experiments: X, labStore: L } = window.__curie;
  const out = {};
  const fill = (ml) => L.update('chemistry', { buretteML: ml });
  const dispense = (ml) => { const c = L.get().chemistry; L.update('chemistry', { buretteOpen: true, dispensedML: c.dispensedML + ml, buretteML: c.buretteML - ml, phValue: ml > 25 ? 11.5 : 8.5 }); L.update('chemistry', { buretteOpen: false }); };
  X.start('titration');
  fill(49.7); // reads 0.30
  L.update('chemistry', { flaskAcidML: 25 });
  L.update('chemistry', { indicatorAdded: true });
  L.update('chemistry', { stirrerRPM: 400 });
  out.asksInitial = X.get().run.completedSteps.includes('stir') && !X.get().run.completedSteps.includes('initial');
  X.recordBurette(0.30);
  out.initialRecorded = X.get().run.completedSteps.includes('initial');
  dispense(27.2); // overshoot, reads 27.50
  X.recordBurette(27.50);
  const r1 = X.get().run;
  out.titreIsDifference = r1.readings.find((x) => x.label === 'Titre')?.value === 27.2;
  out.overshootLogged = r1.mistakes.includes('overshoot');
  out.waitsForConcordant = !r1.completedSteps.includes('concordant') && r1.completedSteps.includes('record');
  X.newTitrationRun();
  const c = L.get().chemistry;
  out.newRunReset = c.buretteML === 0 && c.flaskAcidML === 0 && !c.indicatorAdded && c.dispensedML === 0;
  out.keptTitres = X.get().run.readings.filter((x) => x.label === 'Titre').length === 1;
  out.nextIsInitial = X.burettePending() === 'initial';
  fill(49.6); L.update('chemistry', { flaskAcidML: 25, indicatorAdded: true });
  X.recordBurette(0.40); dispense(25.0); X.recordBurette(25.40);
  out.stillRunning = !!X.get().run;
  X.newTitrationRun();
  fill(49.8); L.update('chemistry', { flaskAcidML: 25, indicatorAdded: true });
  X.recordBurette(0.20); dispense(25.05); X.recordBurette(25.25);
  const res = X.get().lastResult;
  out.finished = !!res && res.experimentId === 'titration';
  out.score = res?.score;
  out.concordant = res?.breakdown.find((x) => x.label === 'Concordant results')?.points;
  out.reading = res?.breakdown.find((x) => x.label === 'Burette reading')?.points;
  out.control = res?.breakdown.find((x) => x.label === 'Control at the endpoint')?.note;
  X.dismissResult();
  return out;
});
check('titration asks for an initial reading before titrating', T.asksInitial && T.initialRecorded);
check('titre = final − initial', T.titreIsDifference);
check('after a new run the next reading is an initial one', T.nextIsInitial);
check('accurate burette readings get full marks', T.reading === 10, String(T.reading));
check('overshoot is caught and explained', T.overshootLogged);
check('one titre is not enough: waits for a concordant pair', T.waitsForConcordant);
check('“New run” resets flask and burette', T.newRunReset);
check('earlier titres are kept', T.keptTitres);
check('a non-matching second titre keeps it running', T.stillRunning);
check('two titres within 0.10 mL finish the practical', T.finished, `score ${T.score}`);
check('concordance scored', T.concordant === 10);
check('repeating after an overshoot is credited', /repeated it/.test(T.control ?? ''), T.control);

// ---- Ohm's law: student reads both meters, finds R from the gradient
const O = await p.evaluate(() => {
  const { experiments: X, labStore: L } = window.__curie;
  X.start('ohms-law');
  L.update('physics', { wired: true });
  L.update('physics', { switchClosed: true });
  for (const R of [40, 55, 70, 85]) {
    L.update('physics', { resistance: R });
    const I = 12 / (12 + R);
    X.recordMeters(Math.round(I * 1000) / 1000, Math.round(I * 12 * 100) / 100);
  }
  L.update('physics', { switchClosed: false });
  X.recordManual({ label: 'Answer', value: 12.1, unit: 'Ω' });
  const res = X.get().lastResult;
  const out = { done: res?.experimentId === 'ohms-law', score: res?.score, R: res?.breakdown.find((b) => b.label === 'Resistance')?.points };
  L.update('physics', { resistance: 10 });
  X.start('ohms-law'); L.update('physics', { wired: true, switchClosed: true, resistance: 10 });
  out.hot = X.get().run.mistakes.includes('overcurrent');
  X.abandon();
  if (res) X.dismissResult();
  return out;
});
check("Ohm's law completes from meter readings and a gradient", O.done && O.R === 30, `score ${O.score}`);
check('over 0.5 A through the resistor is a safety mistake', O.hot);

// ---- Pendulum: the student measures L to the centre of the bob
const PD = await p.evaluate(() => {
  const { experiments: X, labStore: L } = window.__curie;
  X.start('pendulum');
  L.update('pendulum', { swinging: true, length: 0.45 });
  window.__benches.pendulum.watch.elapsed = 13.46; // 10 swings at 45 cm
  const ok = X.recordPendulum(45) === null && !X.get().run.mistakes.includes('lengthToEdge');
  window.__benches.pendulum.watch.elapsed = 13.5;
  X.recordPendulum(47); // to the bottom of the bob
  const caught = X.get().run.mistakes.includes('lengthToEdge');
  X.abandon();
  return { ok, caught };
});
check('pendulum reading uses the length the student measured', PD.ok);
check('measuring to the edge of the bob is caught', PD.caught);

// ---- Restart in the middle of a practical
const R = await p.evaluate(() => {
  const { experiments: X, labStore: L } = window.__curie;
  X.start('ohms-law');
  L.update('physics', { wired: true });
  const before = X.get().run.completedSteps.length;
  X.restart();
  const run = X.get().run;
  const ok = before > 0 && run && run.completedSteps.length === 0 && !L.get().physics.wired;
  X.abandon();
  return ok;
});
check('restart puts the practical back to the start', R);

// ---- Flame test: clean technique vs contamination (bench actions, real hands)
await p.evaluate(() => window.__sitDownAt('hood')); await w(9000);
const tap = async (id) => {
  await p.evaluate((id) => window.__benches.hood.tap(id), id);
  for (let i = 0; i < 120; i++) { await w(500); if (!(await p.evaluate(() => window.__benches.hood.isBusy))) break; }
};
await p.evaluate(() => {
  const { experiments: X, labStore: L } = window.__curie;
  X.start('flame');
  L.update('flame', { sashDown: true, gasOn: true, lit: true, airOpen: true, loop: 'clean' });
});
const F = () => p.evaluate(() => { const r = window.__curie.experiments.get().run; return { loop: window.__curie.labStore.get().flame.loop, readings: r.readings.length, dirty: r.events.contaminated ?? 0 }; });
await tap('flame_acid'); await tap('flame_salt_na');
let f = await F();
check('acid-moistened clean loop picks up a sample without contamination', f.loop === 'na' && f.dirty === 0, JSON.stringify(f));
await tap('flame_zone');
f = await F();
check('sodium gives an observation', f.readings === 1, JSON.stringify(f));
await tap('flame_salt_k');
f = await F();
check('dipping an uncleaned loop counts as contamination', f.dirty === 1 && f.loop === 'dirty', JSON.stringify(f));
await tap('flame_zone');
f = await F();
check('contaminated test gives no identification', f.readings === 1, JSON.stringify(f));
await tap('flame_acid'); await tap('flame_zone');
f = await F();
check('acid then heat cleans the loop', f.loop === 'clean', JSON.stringify(f));
await tap('flame_acid'); await tap('flame_salt_k'); await tap('flame_zone');
f = await F();
check('after cleaning, potassium is identified', f.readings === 2 && f.dirty === 1, JSON.stringify(f));
await p.screenshot({ path: `${out}/flame.png` });

// ---- Microscope: coarse focus at 40x cracks the slide; a new slide fixes it
await p.evaluate(() => window.__sitDownAt('biology')); await w(9000);
const btap = async (st, id) => {
  await p.evaluate(([st, id]) => window.__benches[st].tap(id), [st, id]);
  for (let i = 0; i < 120; i++) { await w(500); if (!(await p.evaluate((st) => window.__benches[st].isBusy, st))) break; }
};
await p.evaluate(() => { const { experiments: X, labStore: L } = window.__curie; X.start('microscopy'); L.update('biology', { objective: '40x' }); });
await btap('biology', 'micro_coarse_focus');
let mc = await p.evaluate(() => ({ cracked: window.__curie.labStore.get().biology.cracked, logged: window.__curie.experiments.get().run.mistakes.includes('cracked') }));
check('coarse focus at 40× cracks the slide and says why', mc.cracked && mc.logged, JSON.stringify(mc));
await btap('biology', 'micro_slide');
mc = await p.evaluate(() => ({ cracked: window.__curie.labStore.get().biology.cracked }));
check('a fresh slide recovers', !mc.cracked);
await p.evaluate(() => window.__curie.experiments.abandon());

// ---- Chromatography: hanging it too low drowns the spots
await p.evaluate(() => window.__sitDownAt('chroma')); await w(9000);
await p.evaluate(() => { const { experiments: X, labStore: L } = window.__curie; X.start('chroma'); L.update('chroma', { baseline: true, spots: 3 }); });
await w(1500);
check('panel asks how deep to hang the paper', await p.getByText('How deep will you hang the paper?').isVisible());
await p.getByText('Baseline under the solvent').click();
for (let i = 0; i < 120; i++) { await w(500); if (!(await p.evaluate(() => window.__benches.chroma.isBusy))) break; }
const ch = await p.evaluate(() => ({ inSolvent: window.__curie.labStore.get().chroma.inSolvent, drowned: window.__curie.experiments.get().run.mistakes.includes('drowned') }));
check('a low baseline is caught: spots dissolve, run spoiled', ch.inSolvent && ch.drowned, JSON.stringify(ch));
await p.screenshot({ path: `${out}/chroma_low.png` });
await p.evaluate(() => window.__curie.experiments.abandon());

check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await b.close();
process.exit(fails ? 1 : 0);
