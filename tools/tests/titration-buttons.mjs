import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const out = process.argv[2] ?? '/tmp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 960, height: 600 } });
p.on('pageerror', (e) => console.log('PAGEERR', e.message.slice(0, 200)));
const w = (ms) => p.waitForTimeout(ms);
await p.goto('http://localhost:3100');
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('labbridge.tutorial.v1', '1'); });
await p.reload(); await w(4000);
await p.getByText('Enter Lab').first().click();
for (let i = 0; i < 90; i++) { if (await p.evaluate(() => !!window.__sitDownAt && !!window.__curie && !!window.__titrationSim)) break; await w(2000); }
await w(8000);
await p.evaluate(() => window.__curie.labStore.update('player', { goggles: true }));
await p.evaluate(() => window.__sitDownAt('chemistry'));
await w(1500);
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => !window.__transitionRef?.current?.active)) break; await w(500); }
await w(3000);
const st = () => p.evaluate(() => { const t = window.__titrationSim.get(); const hh = window.__titration.held; return { held: hh?.id ?? null, reading: +t.reading.toFixed(2), funnelIn: t.funnelIn, bubble: t.bubble, acid: +t.acidMmol.toFixed(2), drops: t.indicatorDrops, flaskAt: t.flaskAt, valve: t.valve }; });
console.log('fps', await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); })));
await p.screenshot({ path: `${out}/arc0.png`, timeout: 120000 });
await p.getByRole('button', { name: 'Fill the burette' }).hover(); await w(600);
await p.screenshot({ path: `${out}/arc_hover.png`, timeout: 120000 });
for (const name of ['Fill the burette', 'Take the funnel out', 'Clear the air bubble', 'Pipette 25 cm³ of acid', 'Add 3 drops of indicator', 'Flask under the burette']) {
  await p.getByRole('button', { name }).click();
  await w(500);
  for (let i = 0; i < 120; i++) { const busy = await p.evaluate(() => !!document.querySelector('.animate-spin')); if (!busy) break; await w(500); }
  console.log(name, JSON.stringify(await st()));
}
await w(1500);
await p.screenshot({ path: `${out}/arc1.png`, timeout: 120000 });
await p.getByRole('button', { name: 'Open the tap: run' }).click(); await w(6000);
console.log('run', JSON.stringify(await st()));
await p.getByRole('button', { name: 'Drop by drop' }).hover(); await w(500);
await p.screenshot({ path: `${out}/arc2.png`, timeout: 120000 });
await p.getByRole('button', { name: 'Drop by drop' }).click(); await w(4000);
console.log('drops', JSON.stringify(await st()));
await p.getByRole('button', { name: 'Close the tap' }).click(); await w(1500);
console.log('closed', JSON.stringify(await st()));
await b.close();
