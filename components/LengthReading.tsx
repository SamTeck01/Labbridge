'use client';

import React, { useState } from 'react';
import { useFreeCursor } from '@/lib/useFreeCursor';

/**
 * Close-up of the metre rule beside the pendulum bob. The length of a pendulum is measured from the
 * point of suspension to the CENTRE of the bob; reading to the top or bottom of the bob is a classic error.
 */
export default function LengthReading({ lengthCm, onSubmit, onCancel }: { lengthCm: number; onSubmit: (cm: number) => void; onCancel: () => void }) {
  useFreeCursor();
  const [text, setText] = useState('');
  const PX = 9; // px per cm
  const H = 240;
  const top = lengthCm - H / PX / 2;
  const y = (cm: number) => (cm - top) * PX;
  const marks: React.ReactNode[] = [];
  for (let cm = Math.ceil(top); cm <= top + H / PX; cm++) {
    if (cm < 0 || cm > 90) continue;
    const ten = cm % 10 === 0;
    const five = cm % 5 === 0;
    marks.push(<line key={'m' + cm} x1={20} x2={20 + (ten ? 26 : five ? 18 : 10)} y1={y(cm)} y2={y(cm)} stroke="#111" strokeWidth={ten ? 2 : 1} />);
    if (ten) marks.push(<text key={'t' + cm} x={52} y={y(cm) + 5} fontSize={14} fill="#111">{cm}</text>);
  }
  const v = parseFloat(text);
  const valid = !Number.isNaN(v) && v > 0 && v < 100;
  const R = 1.8 * PX; // bob radius
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-100 w-full max-w-sm">
        <h3 className="text-sm font-semibold mb-1">Measure the length</h3>
        <p className="text-xs text-slate-400 mb-3">The rule reads from 0 at the point of suspension. A pendulum’s length is measured to the <b>centre</b> of the bob, to the nearest 0.5 cm.</p>
        <div className="flex gap-4 items-center">
          <svg width={150} height={H} className="rounded-lg bg-[#e9d3a7] shrink-0" role="img" aria-label="Metre rule beside the bob">
            {marks}
            <line x1={112} x2={112} y1={0} y2={y(lengthCm) - R} stroke="#f8fafc" strokeWidth={1.5} />
            <circle cx={112} cy={y(lengthCm)} r={R} fill="#c9a227" stroke="#7c5e10" strokeWidth={2} />
          </svg>
          <div className="flex-1">
            <label className="text-xs text-slate-400">
              Length L (cm)
              <input autoFocus inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && valid && onSubmit(v)} placeholder="e.g. 52.5" className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-lg tabular-nums" />
            </label>
            <div className="flex gap-2 mt-3">
              <button onClick={onCancel} className="px-3 min-h-11 rounded-lg bg-slate-800 text-sm">Cancel</button>
              <button disabled={!valid} onClick={() => onSubmit(v)} className="flex-1 min-h-11 rounded-lg bg-teal-600 disabled:opacity-40 text-sm font-semibold">Record</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
