'use client';

import React, { useState } from 'react';
import { useFreeCursor } from '@/lib/useFreeCursor';

/**
 * Close-up of the two analogue meters. The student reads the needles themselves (to half a small
 * division) and types both values; the true values are drawn, never printed.
 */
function Dial({ value, max, unit, minor }: { value: number; max: number; unit: string; minor: number }) {
  const W = 200;
  const cx = W / 2;
  const cy = 112;
  const R = 84;
  const a0 = Math.PI * 1.2;
  const a1 = Math.PI * 1.8;
  const ang = (v: number) => a0 + (Math.min(max, Math.max(0, v)) / max) * (a1 - a0);
  const ticks: React.ReactNode[] = [];
  const n = Math.round(max / minor);
  for (let i = 0; i <= n; i++) {
    const v = i * minor;
    const major = i % 5 === 0;
    const a = ang(v);
    ticks.push(<line key={i} x1={cx + Math.cos(a) * (major ? R - 12 : R - 6)} y1={cy + Math.sin(a) * (major ? R - 12 : R - 6)} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} stroke="#111" strokeWidth={major ? 1.6 : 0.8} />);
    if (major) ticks.push(<text key={'t' + i} x={cx + Math.cos(a) * (R - 24)} y={cy + Math.sin(a) * (R - 24) + 4} fontSize={11} textAnchor="middle" fill="#111">{+v.toFixed(2)}</text>);
  }
  const a = ang(value);
  return (
    <svg width={W} height={130} className="rounded-lg bg-[#f8f5ea]" role="img" aria-label={`${unit === 'A' ? 'Ammeter' : 'Voltmeter'} dial`}>
      {ticks}
      <text x={cx} y={cy - 24} fontSize={20} fontWeight={700} textAnchor="middle" fill="#111">{unit}</text>
      <line x1={cx} y1={cy} x2={cx + Math.cos(a) * (R - 4)} y2={cy + Math.sin(a) * (R - 4)} stroke="#b91c1c" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={4} fill="#111" />
    </svg>
  );
}

export default function MeterReading({ amps, volts, onSubmit, onCancel }: { amps: number; volts: number; onSubmit: (i: number, v: number) => void; onCancel: () => void }) {
  useFreeCursor();
  const [i, setI] = useState('');
  const [v, setV] = useState('');
  const I = parseFloat(i);
  const V = parseFloat(v);
  const valid = !Number.isNaN(I) && !Number.isNaN(V) && I >= 0 && I <= 1 && V >= 0 && V <= 10;
  const submit = () => valid && onSubmit(Math.round(I * 1000) / 1000, Math.round(V * 100) / 100);
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-100 w-full max-w-md">
        <h3 className="text-sm font-semibold mb-1">Read the meters</h3>
        <p className="text-xs text-slate-400 mb-3">Look straight at each needle. The ammeter (in series) gives the current through the resistor; the voltmeter (across it) gives the voltage across it.</p>
        <div className="flex flex-wrap gap-3 justify-center mb-3">
          <Dial value={amps} max={1} unit="A" minor={0.02} />
          <Dial value={volts} max={10} unit="V" minor={0.2} />
        </div>
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-slate-400">
            Current I (A)
            <input autoFocus inputMode="decimal" value={i} onChange={(e) => setI(e.target.value)} placeholder="e.g. 0.32" className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-base tabular-nums" />
          </label>
          <label className="flex-1 text-xs text-slate-400">
            Voltage V (V)
            <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="e.g. 3.9" className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-base tabular-nums" />
          </label>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onCancel} className="px-3 min-h-11 rounded-lg bg-slate-800 text-sm">Cancel</button>
          <button disabled={!valid} onClick={submit} className="flex-1 min-h-11 rounded-lg bg-teal-600 disabled:opacity-40 text-sm font-semibold">Record</button>
        </div>
      </div>
    </div>
  );
}
