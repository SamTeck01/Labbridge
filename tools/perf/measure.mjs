// LabBridge performance budget check (see .claude/skills/perf-budget/SKILL.md).
// Usage: node tools/perf/measure.mjs [--mobile] [--url http://localhost:3100]
// Needs the dev server (dev-only window hooks). Uses Playwright's Chromium.
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const url = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:3100';
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

const BUDGET = { calls: 180, heapMB: 150, heapGrowthMB: 5, textures: 45, idleFps: 15 };

const b = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
const ctx = await b.newContext(mobile ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 768 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
const cdp = await ctx.newCDPSession(p);
await cdp.send('Performance.enable');
const heapMB = async () => {
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  const { metrics } = await cdp.send('Performance.getMetrics');
  return metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1048576;
};

await p.goto(url);
await p.waitForTimeout(3000);
await p.getByText('Chemistry Station').first().click();
await p.waitForTimeout(45000);

const info = await p.evaluate(() => {
  const r = window.__renderer;
  let calls = 0;
  // Count draw calls for one plain render of the scene
  const before = r.info.render.calls;
  r.info.autoReset = false; r.info.reset();
  r.render(window.__scene, window.__camera);
  calls = r.info.render.calls;
  r.info.autoReset = true;
  return { calls, tris: r.info.render.triangles, textures: r.info.memory.textures, geometries: r.info.memory.geometries, before };
});
const heapLoaded = await heapMB();

// Idle: once legitimate activity settles (e.g. Dr. Curie walking over), the scheduler must drop to idle
for (let i = 0; i < 90; i++) {
  const busy = await p.evaluate(() => Object.entries(window.__whyActive?.() ?? {}).filter(([, v]) => v).map(([k]) => k));
  if (!busy.length) break;
  if (i % 10 === 0) console.log('waiting for activity to settle:', busy.join(', '));
  await p.waitForTimeout(2000);
}
await p.waitForTimeout(4000);
const idle0 = await p.evaluate(() => ({ ...window.__scheduler.stats, mode: window.__scheduler.mode, t: performance.now() }));
await p.waitForTimeout(20000);
const idle1 = await p.evaluate(() => ({ ...window.__scheduler.stats, mode: window.__scheduler.mode, t: performance.now() }));
const idleFps = ((idle1.rendered - idle0.rendered) / (idle1.t - idle0.t)) * 1000;
const heapIdleEnd = await heapMB();

// Active: pointer movement -> scheduler must go active
await p.mouse.move(600, 300);
for (let i = 0; i < 10; i++) { await p.mouse.move(600 + i * 5, 300); await p.waitForTimeout(100); }
const activeMode = await p.evaluate(() => window.__scheduler.mode);

const row = (name, value, budget, ok) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} ${String(value).padEnd(10)} budget ${budget}`);
console.log(`\nLabBridge perf budget — ${mobile ? 'mobile' : 'desktop'} profile, quality tier: ${await p.evaluate(() => window.__quality?.current.name)}\n`);
row('Draw calls (chemistry bench)', info.calls, `≤ ${BUDGET.calls}`, info.calls <= BUDGET.calls);
row('GPU textures', info.textures, `≤ ${BUDGET.textures}`, info.textures <= BUDGET.textures);
row('JS heap after load (MB)', heapLoaded.toFixed(1), `≤ ${BUDGET.heapMB}`, heapLoaded <= BUDGET.heapMB);
row('JS heap growth, 20 s idle (MB)', (heapIdleEnd - heapLoaded).toFixed(1), `≤ ${BUDGET.heapGrowthMB}`, heapIdleEnd - heapLoaded <= BUDGET.heapGrowthMB);
row('Scheduler mode when idle', idle1.mode, 'idle', idle1.mode === 'idle' || idle1.mode === 'background');
row('Frames rendered per second, idle', idleFps.toFixed(1), `≤ ${BUDGET.idleFps}`, idleFps <= BUDGET.idleFps + 0.5);
row('Scheduler mode on input', activeMode, 'active', activeMode === 'active');
console.log(`\n(triangles ${info.tris}, geometries ${info.geometries}; page errors: ${errors.length ? errors.join(' | ') : 'none'})`);
await b.close();
