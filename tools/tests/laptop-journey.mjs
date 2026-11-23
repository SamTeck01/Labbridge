// A first-time student on a laptop (1366x768), with real mouse clicks only: orientation, practical list,
// goggles, a full titration (fill, acid, indicator, stir, initial reading, tap, single drops, final reading)
// and Ohm's law (wire, switch, meter close-up). Usage: node tools/tests/laptop-journey.mjs [outDir]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const out = process.argv[2] ?? '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
p.on('dialog', (d) => d.accept());
const w = (ms) => p.waitForTimeout(ms);
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); if (!ok) fails++; };
let shot = 0;
const snap = (name) => p.screenshot({ path: `${out}/laptop_${String(++shot).padStart(2, '0')}_${name}.png` });
const lab = (k) => p.evaluate((k) => window.__curie.labStore.get()[k], k);
const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await w(500); } return false; };

/** Click the visible middle of a piece of equipment, found by its id, with the real mouse. */
async function clickThing(id) {
  const q = await p.evaluate((id) => {
    const cam = window.__camera, c = window.__renderer.domElement, r = c.getBoundingClientRect();
    let best = null;
    // Prefer a small, named part a student would aim at (the plug, not the middle of a long cable)
    const named = window.__scene.getObjectByName(id === 'phys_return_lead' ? 'lead_return_plug' : '__none__');
    if (named) {
      const v = named.getWorldPosition(new named.position.constructor()).project(cam);
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    }
    window.__scene.traverse((o) => {
      if (best || !o.isMesh || !o.visible || o.userData?.interactId !== id) return;
      const v = o.getWorldPosition(new o.position.constructor()).project(cam);
      if (Math.abs(v.x) < 0.98 && Math.abs(v.y) < 0.98 && v.z < 1) best = { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    });
    return best;
  }, id);
  if (!q) return false;
  const top = await p.evaluate((q) => document.elementFromPoint(q.x, q.y)?.tagName, q);
  if (top !== 'CANVAS') return false;
  await p.mouse.move(q.x, q.y);
  await w(300);
  await p.mouse.click(q.x, q.y);
  return true;
}

await p.goto('http://localhost:3100');
await p.evaluate(() => localStorage.clear());
await p.reload(); await w(4000);
await snap('landing');
await p.getByText('Enter Lab').first().click();
for (let i = 0; i < 90; i++) { if (await p.evaluate(() => !!window.__sitDownAt && !!window.__benches?.chemistry)) break; await w(2000); }
check('orientation greets a first-time student', await p.getByText('Your first visit').waitFor({ timeout: 60000 }).then(() => true, () => false));
await p.getByText('Hello, Dr. Curie').click();
await w(500);
await snap('lab_first_visit');

// Practical list -> titration
await p.getByRole('button', { name: /Practicals/ }).click(); await w(800);
await snap('practical_list');
await p.getByText('Acid–Base Titration').click(); await w(400);
await snap('practical_card');
await p.getByRole('button', { name: 'Go to bench' }).click();
check('seated at the titration bench', await until(async () => (await lab('player')).station === 'chemistry', 30000));
await w(6000);
await snap('titration_brief');
await p.getByText('Put on safety goggles first').click(); await w(500);
await p.getByRole('button', { name: 'Start with Dr. Curie' }).click(); await w(2500);
check('practical started', await p.evaluate(() => window.__curie.experiments.get().run?.experimentId === 'titration'));
await snap('titration_started');

// Click the equipment itself
check('clicked the NaOH bottle', await clickThing('chem_naoh_bottle'));
check('the bottle fills the burette to near zero', await until(async () => (await lab('chemistry')).buretteML >= 49.3, 240000), `burette ${(await lab('chemistry')).buretteML.toFixed(2)} mL`);
await w(4000);
await snap('burette_filled');
check('clicked the HCl', await clickThing('chem_hcl_cylinder'));
check('25 mL of acid goes into the flask', await until(async () => (await lab('chemistry')).flaskAcidML >= 24.5, 240000));
await w(4000);
check('clicked the indicator', await clickThing('chem_indicator'));
check('indicator added', await until(async () => (await lab('chemistry')).indicatorAdded, 240000));
await w(4000);
check('clicked the stirrer knob', await clickThing('chem_stirrer_knob'));
check('stirrer on', await until(async () => (await lab('chemistry')).stirrerRPM > 0, 120000));
await w(3000);
await snap('ready_to_titrate');

// Initial reading through the panel button and the close-up
await p.getByRole('button', { name: 'Read the burette' }).click(); await w(800);
check('initial reading close-up opens', await p.getByRole('heading', { name: 'Initial burette reading' }).isVisible());
await snap('initial_reading_closeup');
const init = Math.round((50 - (await lab('chemistry')).buretteML) * 100) / 100;
await p.getByPlaceholder('e.g. 24.95').fill(String(init));
await p.getByRole('button', { name: 'Record' }).click(); await w(800);

// Open the tap, run to ~24 mL, close, then single drops to the first pink
check('clicked the burette tap', await clickThing('chem_stopcock'));
check('tap open, alkali running', await until(async () => (await lab('chemistry')).buretteOpen, 120000));
await until(async () => (await lab('chemistry')).dispensedML >= 18, 120000);
await snap('titrating');
await clickThing('chem_stopcock');
check('tap closed near the endpoint', await until(async () => !(await lab('chemistry')).buretteOpen, 120000), `${(await lab('chemistry')).dispensedML.toFixed(2)} mL`);
await w(2000);
for (let i = 0; i < 160 && (await lab('chemistry')).phValue < 8.2; i++) { await p.getByRole('button', { name: '1 drop' }).click(); await w(400); }
const c = await lab('chemistry');
check('first permanent pink reached drop by drop', c.phValue >= 8.2 && c.dispensedML < 25.6, `${c.dispensedML.toFixed(2)} mL, pH ${c.phValue.toFixed(1)}`);
await w(3000);
await snap('endpoint_pink');
await p.getByRole('button', { name: 'Read the burette' }).click(); await w(800);
check('final reading close-up opens', await p.getByRole('heading', { name: 'Final burette reading' }).isVisible());
const fin = Math.round((50 - (await lab('chemistry')).buretteML) * 100) / 100;
await p.getByPlaceholder('e.g. 24.95').fill(String(fin));
await p.getByRole('button', { name: 'Record' }).click(); await w(1500);
const run = await p.evaluate(() => window.__curie.experiments.get().run);
const titre = run?.readings.find((x) => x.label === 'Titre')?.value;
check('titre recorded as final − initial', titre !== undefined && Math.abs(titre - (fin - init)) < 0.001, `${init} → ${fin}, titre ${titre}`);
check('asks for a concordant repeat with a New run button', await p.getByRole('button', { name: 'New run', exact: true }).isVisible());
await snap('after_first_titre');

// Ohm's law at the circuits bench
await p.getByRole('button', { name: 'Finish with these results' }).click(); await w(1500);
await snap('titration_result');
await p.getByRole('button', { name: 'Done' }).click(); await w(1000);
await p.getByRole('button', { name: /Practicals/ }).click(); await w(800);
await p.getByText("Verifying Ohm's Law").click(); await w(400);
await p.getByRole('button', { name: /Go to bench/ }).click();
await until(async () => (await lab('player')).station === 'physics', 30000); await w(6000);
await p.getByRole('button', { name: 'Start with Dr. Curie' }).click(); await w(2000);
await snap('ohms_started');
check('clicked the return lead', await clickThing('phys_return_lead'));
check('circuit wired', await until(async () => (await lab('physics')).wired, 240000));
await w(3000);
check('clicked the knife switch', await clickThing('phys_knife_switch'));
check('switch closed', await until(async () => (await lab('physics')).switchClosed, 240000));
await w(5000);
await snap('circuit_live');
check('clicked the voltmeter', await clickThing('phys_voltmeter'));
check('meter close-up opens from a click on the meter', await p.getByRole('heading', { name: 'Read the meters' }).waitFor({ timeout: 15000 }).then(() => true, () => false));
await snap('meter_closeup');

check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await b.close();
process.exit(fails ? 1 : 0);
