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

// ---- Titration logic: overshoot -> new run -> concordant -> result
const T = await p.evaluate(async () => {
  const { experiments: X, labStore: L } = window.__curie;
  const out = {};
  X.start('titration');
  L.update('chemistry', { buretteML: 50 });
  L.update('chemistry', { flaskAcidML: 25 });
  L.update('chemistry', { indicatorAdded: true });
  L.update('chemistry', { stirrerRPM: 400 });
  L.update('chemistry', { buretteOpen: true, dispensedML: 27.2, buretteML: 22.8, phValue: 11.5 });
  L.update('chemistry', { buretteOpen: false });
  X.recordManual({ label: 'Titre', value: 27.2, unit: 'mL', extra: { actual: 27.2 } });
  const r1 = X.get().run;
  out.overshootLogged = r1.mistakes.includes('overshoot');
  out.waitsForConcordant = !r1.completedSteps.includes('concordant') && r1.completedSteps.includes('record');
  X.newTitrationRun();
  const c = L.get().chemistry;
  out.newRunReset = c.buretteML === 0 && c.flaskAcidML === 0 && !c.indicatorAdded && c.dispensedML === 0;
  out.keptTitres = X.get().run.readings.length === 1;
  X.recordManual({ label: 'Titre', value: 25.0, unit: 'mL', extra: { actual: 25.0 } });
  out.stillRunning = !!X.get().run;
  X.recordManual({ label: 'Titre', value: 25.05, unit: 'mL', extra: { actual: 25.05 } });
  const res = X.get().lastResult;
  out.finished = !!res && res.experimentId === 'titration';
  out.score = res?.score;
  out.concordant = res?.breakdown.find((x) => x.label === 'Concordant results')?.points;
  out.control = res?.breakdown.find((x) => x.label === 'Control at the endpoint')?.note;
  X.dismissResult();
  return out;
});
check('overshoot is caught and explained', T.overshootLogged);
check('one titre is not enough: waits for a concordant pair', T.waitsForConcordant);
check('“New run” resets flask and burette', T.newRunReset);
check('earlier titres are kept', T.keptTitres);
check('a non-matching second titre keeps it running', T.stillRunning);
check('two titres within 0.10 mL finish the practical', T.finished, `score ${T.score}`);
check('concordance scored', T.concordant === 10);
check('repeating after an overshoot is credited', /repeated it/.test(T.control ?? ''), T.control);

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

check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await b.close();
process.exit(fails ? 1 : 0);
