'use client';

import React, { useState } from 'react';

/**
 * Close-up of the burette scale at the meniscus. The student reads the bottom of the meniscus at eye
 * level and types the volume (to 0.05 mL, like a real burette). The true level is drawn, not shown.
 */
export default function BuretteReading({ actual, onSubmit, onCancel }: { actual: number; onSubmit: (v: number) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const PX = 60; // pixels per mL
  const H = 260;
  const top = actual - H / PX / 2; // mL at the top edge of the view
  const y = (ml: number) => (ml - top) * PX;

  const marks: React.ReactNode[] = [];
  for (let t = Math.floor(top * 10) / 10; t <= top + H / PX + 0.1; t = Math.round((t + 0.1) * 10) / 10) {
    if (t < 0 || t > 50) continue;
    const whole = Math.abs(t - Math.round(t)) < 0.001;
    const half = Math.abs(t * 2 - Math.round(t * 2)) < 0.001;
    marks.push(<line key={'m' + t} x1={whole ? 64 : half ? 76 : 84} x2={110} y1={y(t)} y2={y(t)} stroke="#111" strokeWidth={whole ? 2 : 1.2} />);
    if (whole) marks.push(<text key={'t' + t} x={40} y={y(t) + 6} fontSize={18} fontFamily="monospace" fill="#111">{Math.round(t)}</text>);
  }
  const level = y(actual);

  const value = parseFloat(text);
  const valid = !Number.isNaN(value) && value >= 0 && value <= 50;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-100 w-full max-w-sm">
        <h3 className="text-sm font-semibold mb-1">Read the burette</h3>
        <p className="text-xs text-slate-400 mb-3">Eye level with the meniscus. Read the bottom of the curve, to the nearest 0.05 mL. The scale reads downward from 0.</p>
        <div className="flex gap-4 items-center">
          <svg width={150} height={H} className="rounded-lg bg-[#eef3f6] shrink-0">
            {/* liquid below the meniscus */}
            <rect x={60} y={level} width={60} height={H - level} fill="#cfe2f5" />
            {/* meniscus: curved bottom at the reading */}
            <path d={`M60 ${level - 7} Q90 ${level + 7} 120 ${level - 7}`} stroke="#1e3a5f" strokeWidth={3} fill="none" />
            <rect x={60} y={0} width={60} height={H} fill="none" stroke="#9fb4c4" strokeWidth={2} />
            {marks}
          </svg>
          <div className="flex-1">
            <label className="text-xs text-slate-400">
              Your reading (mL)
              <input
                autoFocus
                inputMode="decimal"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && valid && onSubmit(Math.round(value * 100) / 100)}
                placeholder="e.g. 24.95"
                className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-lg tabular-nums"
              />
            </label>
            <div className="flex gap-2 mt-3">
              <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-slate-800 text-sm">
                Cancel
              </button>
              <button disabled={!valid} onClick={() => onSubmit(Math.round(value * 100) / 100)} className="flex-1 py-2 rounded-lg bg-teal-600 disabled:opacity-40 text-sm font-semibold">
                Record
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
