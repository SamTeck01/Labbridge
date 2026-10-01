'use client';

import { EXPERIMENTS, experiments } from '@/lib/experiments';

interface Snapshot {
  title: string;
  imageUrl: string;
  notes?: string;
  timestamp?: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Opens a printable lab report (results + notebook snapshots). Print dialog -> "Save as PDF". */
export function openLabReport() {
  experiments.init();
  const { history } = experiments.get();
  let snaps: Snapshot[] = [];
  try {
    snaps = JSON.parse(localStorage.getItem('labbridge.notebook.v1') || '[]');
  } catch {
    /* no snapshots */
  }

  const best = EXPERIMENTS.map((e) => {
    const a = history.filter((h) => h.experimentId === e.id);
    return `<tr><td>${esc(e.title)}</td><td>${a.length}</td><td>${a.length ? Math.max(...a.map((h) => h.score)) + '/100' : '—'}</td></tr>`;
  }).join('');

  const results = history
    .map(
      (h) => `<section class="result">
  <h3>${esc(h.title)} <span>${h.score}/100</span></h3>
  <p class="meta">${new Date(h.finishedAt).toLocaleString()}</p>
  ${h.readings.length ? `<p><b>Readings:</b> ${h.readings.map((r) => esc(`${r.label}: ${r.value} ${r.unit}`)).join('; ')}</p>` : ''}
  <ul>${h.breakdown.map((b) => `<li>${esc(b.label)}: ${b.points}/${b.max} — ${esc(b.note)}</li>`).join('')}</ul>
  ${h.mistakes.length ? `<p class="warn"><b>Dr. Curie's corrections:</b> ${h.mistakes.map(esc).join(' ')}</p>` : ''}
</section>`
    )
    .join('');

  const images = snaps
    .map((s) => `<figure><img src="${s.imageUrl}" alt=""/><figcaption><b>${esc(s.title)}</b>${s.timestamp ? ' · ' + esc(s.timestamp) : ''}<br/>${esc(s.notes || '')}</figcaption></figure>`)
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>LabBridge lab report</title>
<style>
body{font-family:system-ui,sans-serif;color:#111;max-width:800px;margin:24px auto;padding:0 16px}
h1{margin:0}h2{border-bottom:2px solid #0f766e;padding-bottom:4px;margin-top:28px}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}
.result{break-inside:avoid;margin-bottom:16px}.result h3{display:flex;justify-content:space-between;margin:0}
.meta{color:#666;margin:2px 0 6px}.warn{color:#9a3412}
figure{break-inside:avoid;display:inline-block;width:47%;margin:1%;vertical-align:top}
figure img{width:100%;border-radius:50%}figcaption{font-size:12px}
.print{position:fixed;top:12px;right:12px;padding:8px 14px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer}
@media print{.print{display:none}}
</style></head><body>
<button class="print" onclick="print()">Save as PDF / Print</button>
<h1>LabBridge lab report</h1><p class="meta">Generated ${new Date().toLocaleString()}</p>
<h2>Summary</h2><table><tr><th>Practical</th><th>Attempts</th><th>Best score</th></tr>${best}</table>
<h2>Results</h2>${results || '<p>No practicals completed yet.</p>'}
<h2>Notebook snapshots</h2>${images || '<p>No snapshots yet.</p>'}
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    // Popup blocked: download the report instead
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = 'labbridge-report.html';
    a.click();
    return;
  }
  w.document.write(html);
  w.document.close();
}
