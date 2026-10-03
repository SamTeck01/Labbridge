'use client';

import React, { useState } from 'react';

/**
 * Close-up of the moving-coil ammeter (0–1 A, 0.02 A divisions). The needle sits where the current
 * really is; the student reads it and types the value. Nothing shows the number.
 */
export default function AmmeterReading({ actual, onSubmit, onCancel }: { actual: number; onSubmit: (v: number) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const cx = 160;
  const cy = 170;
  const R = 130;
  const ang = (i: number) => Math.PI * (1 - i); // 0 A at the left, 1 A at the right
  const pt = (i: number, r: number) => [cx + Math.cos(ang(i)) * r, cy - Math.sin(ang(i)) * r];
  const ticks: React.ReactNode[] = [];
  for (let k = 0; k <= 50; k++) {
    const i = k / 50;
    const major = k % 10 === 0;
    const mid = k % 5 === 0;
    const [x1, y1] = pt(i, R);
    const [x2, y2] = pt(i, R - (major ? 18 : mid ? 12 : 7));
    ticks.push(<line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111" strokeWidth={major ? 2.2 : 1.1} />);
    if (major) {
      const [tx, ty] = pt(i, R - 34);
      ticks.push(<text key={'t' + k} x={tx} y={ty + 6} textAnchor="middle" fontSize={16} fontFamily="ui-monospace, monospace" fill="#111">{(i).toFixed(1)}</text>);
    }
  }
  const [nx, ny] = pt(Math.min(1.02, Math.max(0, actual)), R - 4);
  const v = parseFloat(text);
  const valid = !Number.isNaN(v) && v >= 0 && v <= 1.2;
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-100 w-full max-w-md">
        <h3 className="text-sm font-semibold mb-1">Read the ammeter</h3>
        <p className="text-xs text-slate-400 mb-3">Look straight at the needle. Each small division is 0.02 A.</p>
        <svg viewBox="0 0 320 200" className="w-full rounded-xl bg-[#f4f1e6]" role="img" aria-label="Ammeter dial">
          <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="#111" strokeWidth={1.5} />
          {ticks}
          <text x={cx} y={cy - 40} textAnchor="middle" fontSize={22} fontWeight={700} fill="#111">A</text>
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#b91c1c" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={7} fill="#111" />
        </svg>
        <label className="text-xs text-slate-400 block mt-3">
          Current (A)
          <input autoFocus inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && valid && onSubmit(Math.round(v * 1000) / 1000)} placeholder="e.g. 0.48" className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-lg tabular-nums" />
        </label>
        <div className="flex gap-2 mt-3">
          <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-slate-800 text-sm">Cancel</button>
          <button disabled={!valid} onClick={() => onSubmit(Math.round(v * 1000) / 1000)} className="flex-1 py-2 rounded-lg bg-teal-600 disabled:opacity-40 text-sm font-semibold">Record</button>
        </div>
      </div>
    </div>
  );
}
