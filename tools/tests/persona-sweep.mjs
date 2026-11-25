// Automated "many users" sweep: every practical explored by clicking, 5 viewports, chaos clicking,
// keyboard, slow network and memory. Usage: node tools/tests/persona-sweep.mjs <outDir> [only]
// Needs the dev server on :3100 (test hooks are dev-only).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2] ?? '/tmp/sweep'; const only = process.argv[3]; fs.mkdirSync(out, { recursive: true });
const URL = 'http://localhost:3100';
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args });
const report = []; const log = (s) => { console.log(s); report.push(s); };
const STATION = { microscopy: 'biology', osmosis: 'osmosis', titration: 'chemistry', flame: 'hood', rates: 'rates', chroma: 'chroma', weighing: 'research', 'ohms-law': 'physics', pendulum: 'pendulum' };

async function openLab(ctxOpts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, ...ctxOpts });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 160)));
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|assistant|GEMINI|favicon/i.test(m.text()) && errs.push('console: ' + m.text().slice(0, 160)));
  p.on('dialog', (d) => d.accept());
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(3000);
  await p.getByText('Enter the lab').first().click().catch(() => errs.push('no Enter Lab button'));
  for (let i = 0; i < 90; i++) { if (await p.evaluate(() => !!window.__sitDownAt && !!window.__benches && !!window.__curie)) break; await p.waitForTimeout(2000); }
  await p.waitForTimeout(3000);
  return { ctx, p, errs };
}
const run = (name) => !only || only.split(',').includes(name);

// ---- 1. Every practical: sit, goggles + Start via the UI, then click every piece of equipment in turn
for (const [exp, st] of Object.entries(STATION)) {
  if (!run(exp)) continue;
  const { ctx, p, errs } = await openLab();
  try {
    await p.evaluate((s) => window.__sitDownAt(s), st); await p.waitForTimeout(9000);
    const g = p.getByRole('button', { name: /goggles/i }); if (await g.isVisible().catch(() => false)) await g.click();
    await p.waitForTimeout(500);
    const start = p.getByRole('button', { name: /^Start/ }).first();
    const startVisible = await start.isVisible().catch(() => false);
    if (startVisible) await start.click(); else await p.evaluate((e) => window.__curie.experiments.start(e), exp);
    await p.waitForTimeout(800);
    const ids = await p.evaluate((s) => window.__benches[s]?.ids ?? (s === 'chemistry' ? ['chem_naoh_bottle','chem_hcl_cylinder','chem_indicator','chem_stirrer_knob','chem_stopcock'] : []), st);
    const t0 = Date.now(); let taps = 0;
    for (let round = 0; round < 3 && Date.now() - t0 < 240000; round++) {
      for (const id of ids) {
        await p.evaluate(([s, id]) => window.__benches[s].tap(id), [st, id]); taps++;
        for (let k = 0; k < 40 && await p.evaluate((s) => window.__benches[s].isBusy, st); k++) await p.waitForTimeout(250);
        await p.waitForTimeout(150);
        if (await p.evaluate(() => window.__curie.labStore.get().chemistry.buretteOpen)) await p.evaluate(([s]) => window.__benches[s].tap('chem_stopcock'), [st]);
      }
    }
    const r = await p.evaluate(() => { const x = window.__curie.experiments.get(); return { done: x.run?.completedSteps ?? [], mistakes: x.run?.mistakes ?? [], steps: x.run ? undefined : 'no run' }; });
    await p.screenshot({ path: `${out}/prac_${exp}.png` });
    log(`PRACTICAL ${exp}: startButton=${startVisible} ids=${ids.length} taps=${taps} steps=[${r.done.join(',')}] mistakes=[${r.mistakes.join(',')}] errors=${errs.length}${errs.length ? ' :: ' + [...new Set(errs)].slice(0, 3).join(' | ') : ''}`);
  } catch (e) { log(`PRACTICAL ${exp}: CRASH ${String(e).slice(0, 200)} errors=${errs.join(' | ').slice(0, 300)}`); }
  await ctx.close();
}

// ---- 2. Viewports: overlap of fixed HUD elements, horizontal overflow, small touch targets
const VP = { laptop: { viewport: { width: 1366, height: 768 } }, hd: { viewport: { width: 1280, height: 720 } }, phoneLand: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }, phonePort: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, tablet: { viewport: { width: 1080, height: 810 }, hasTouch: true, isMobile: true } };
for (const [name, opts] of Object.entries(VP)) {
  if (!run('vp')) break;
  const { ctx, p, errs } = await openLab(opts);
  await p.screenshot({ path: `${out}/vp_${name}_lab.png` });
  await p.evaluate(() => window.__sitDownAt('chemistry')); await p.waitForTimeout(9000);
  await p.evaluate(() => { window.__curie.labStore.update('player', { goggles: true }); window.__curie.experiments.start('titration'); }); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/vp_${name}_bench.png` });
  const audit = await p.evaluate(() => {
    const els = [...document.querySelectorAll('body *')].filter((e) => { const cs = getComputedStyle(e); if (!['fixed', 'absolute'].includes(cs.position) || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 20 && r.width < innerWidth * 0.95 && e.textContent.trim().length > 0 && e.tagName !== 'CANVAS'; });
    const top = els.filter((e) => !els.some((o) => o !== e && o.contains(e)));
    const ov = [];
    for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) { const a = top[i].getBoundingClientRect(), c = top[j].getBoundingClientRect(); const w = Math.min(a.right, c.right) - Math.max(a.left, c.left), h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (w > 8 && h > 8) ov.push(`"${top[i].textContent.trim().slice(0, 30)}" × "${top[j].textContent.trim().slice(0, 30)}"`); }
    const offscreen = top.filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 2 || r.bottom > innerHeight + 2 || r.left < -2; }).map((e) => e.textContent.trim().slice(0, 30));
    const small = [...document.querySelectorAll('button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 32 || r.height < 32); }).map((e) => (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 20));
    return { ov, offscreen, small, hscroll: document.documentElement.scrollWidth > innerWidth };
  });
  log(`VIEWPORT ${name}: overlaps=${audit.ov.length} ${audit.ov.slice(0, 4).join('; ')} | offscreen=${audit.offscreen.join(',') || 0} | smallButtons=${audit.small.length} ${audit.small.slice(0, 6).join(',')} | hscroll=${audit.hscroll} | errors=${errs.length}`);
  await ctx.close();
}

// ---- 3. Chaos clicker: random taps, keys, panel toggles, abandon/restart
if (run('chaos')) {
  const { ctx, p, errs } = await openLab();
  const keys = ['w', 'a', 's', 'd', 'Escape', 'Enter', 'Tab', ' ', 'e', 'q', 'r'];
  for (let i = 0; i < 120; i++) {
    const r = Math.random();
    if (r < 0.35) await p.mouse.click(100 + Math.random() * 1166, 80 + Math.random() * 600);
    else if (r < 0.6) await p.keyboard.press(keys[Math.floor(Math.random() * keys.length)]);
    else if (r < 0.8) await p.evaluate(() => { const S = Object.keys(window.__benches); const s = S[Math.floor(Math.random() * S.length)]; const ids = window.__benches[s].ids ?? ['chem_naoh_bottle']; window.__benches[s].tap(ids[Math.floor(Math.random() * ids.length)]); });
    else if (r < 0.9) await p.evaluate(() => { const E = ['titration', 'flame', 'microscopy', 'ohms-law', 'pendulum']; const X = window.__curie.experiments; Math.random() < 0.5 ? X.start(E[Math.floor(Math.random() * 5)]) : (X.abandon?.() ?? X.restart?.()); });
    else { const bt = p.locator('button:visible'); const n = await bt.count(); if (n) await bt.nth(Math.floor(Math.random() * n)).click({ timeout: 2000 }).catch(() => {}); }
    await p.waitForTimeout(120);
  }
  await p.waitForTimeout(3000);
  const alive = await p.evaluate(() => !!document.querySelector('canvas') && !!window.__curie);
  await p.screenshot({ path: `${out}/chaos.png` });
  log(`CHAOS: alive=${alive} errors=${errs.length} ${[...new Set(errs)].slice(0, 5).join(' | ')}`);
  await ctx.close();
}

// ---- 4. Memory and renderer cost across visiting every bench
if (run('perf')) {
  const { ctx, p, errs } = await openLab();
  const snap = () => p.evaluate(() => ({ heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6), calls: window.__renderer?.info.render.calls, tris: window.__renderer?.info.render.triangles, geo: window.__renderer?.info.memory.geometries, tex: window.__renderer?.info.memory.textures }));
  const s0 = await snap();
  for (let lap = 0; lap < 2; lap++) for (const st of Object.values(STATION)) { await p.evaluate((s) => window.__sitDownAt(s), st); await p.waitForTimeout(4000); }
  const s1 = await snap();
  const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t = performance.now(); const f = () => { n++; performance.now() - t < 5000 ? requestAnimationFrame(f) : res(+(n / 5).toFixed(1)); }; requestAnimationFrame(f); }));
  const res = await p.evaluate(() => performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0));
  log(`PERF: start ${JSON.stringify(s0)} after 18 bench visits ${JSON.stringify(s1)} fps(swiftshader)=${fps} transferredMB=${(res / 1e6).toFixed(1)} errors=${errs.length}`);
  await ctx.close();
}

// ---- 5. Keyboard and accessible names on the landing page and HUD
if (run('a11y')) {
  const { ctx, p } = await openLab();
  const a = await p.evaluate(() => {
    const unnamed = [...document.querySelectorAll('button, a, input, [role=button]')].filter((e) => e.getBoundingClientRect().width > 0 && !(e.getAttribute('aria-label') || e.textContent.trim() || e.getAttribute('title') || e.getAttribute('placeholder')));
    return { unnamed: unnamed.length, emojiButtons: [...document.querySelectorAll('button')].filter((e) => /\p{Extended_Pictographic}/u.test(e.textContent)).map((e) => e.textContent.trim().slice(0, 25)) };
  });
  let focusVisible = 0; for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); focusVisible += await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return 0; const cs = getComputedStyle(e); return cs.outlineStyle !== 'none' || cs.boxShadow !== 'none' ? 1 : 0; }); }
  log(`A11Y: unnamedControls=${a.unnamed} emojiButtons=${a.emojiButtons.length} [${a.emojiButtons.slice(0, 6).join(', ')}] focusVisible ${focusVisible}/12 tabs`);
  await ctx.close();
}

// ---- 6. Slow 3G first load
if (run('slow')) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 } }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 25000 });
  const t = Date.now(); await p.goto(URL, { timeout: 300000 }); const tLanding = Date.now() - t;
  await p.getByText('Enter the lab').first().click({ timeout: 120000 }).catch(() => {});
  let tLab = -1; for (let i = 0; i < 150; i++) { if (await p.evaluate(() => !!window.__benches)) { tLab = Date.now() - t; break; } await p.waitForTimeout(2000); }
  await p.screenshot({ path: `${out}/slow3g.png` });
  const bytes = await p.evaluate(() => performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0));
  log(`SLOW3G: landing ${tLanding}ms, lab usable ${tLab}ms, ~${(bytes / 1e6).toFixed(1)}MB (dev build, so larger than prod)`);
  await ctx.close();
}
fs.writeFileSync(`${out}/report.txt`, report.join('\n'));
await b.close();
