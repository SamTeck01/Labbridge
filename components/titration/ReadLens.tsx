'use client';

import React, { useRef, useState } from 'react';
import { titration, useTitration, PIPETTE, SHEET_COLS } from '@/lib/titration/sim';
import { titrationControls, type HandsUI } from '@/lib/titration/ui';

/**
 * Leaning in to read a scale. The 3D eye has moved to the meniscus; this lens magnifies what that
 * eye sees. Parallax is real: from above the burette reads low. The student brings their eye level,
 * reads the bottom of the meniscus and writes it down. Nothing here shows the answer as a number.
 */

const PARALLAX = 4.8; // mL of apparent shift per metre of eye height (burette)

export default function ReadLens({ reading, isTouch }: { reading: NonNullable<HandsUI['reading']>; isTouch: boolean }) {
  const level = useTitration((s) => s.reading);
  const pipetteML = useTitration((s) => s.pipetteML);
  const sheet = useTitration((s) => s.sheet);
  const [text, setText] = useState('');
  const drag = useRef<number | null>(null);
  const eyeLevel = Math.abs(reading.eye) < 0.006;

  const W = 220;
  const H = 240;
  let svg: React.ReactNode;
  if (reading.kind === 'burette') {
    const apparent = level - reading.eye * PARALLAX;
    const PX = 64; // px per mL
    const top = apparent - H / PX / 2;
    const y = (ml: number) => (ml - top) * PX;
    const marks: React.ReactNode[] = [];
    for (let t = Math.floor(top * 10) / 10; t <= top + H / PX + 0.1; t = Math.round((t + 0.1) * 10) / 10) {
      if (t < 0 || t > 50) continue;
      const whole = Math.abs(t - Math.round(t)) < 0.001;
      const half = Math.abs(t * 2 - Math.round(t * 2)) < 0.001;
      marks.push(<line key={'m' + t} x1={whole ? 64 : half ? 78 : 88} x2={118} y1={y(t)} y2={y(t)} stroke="#111" strokeWidth={whole ? 2 : 1.2} />);
      if (whole) marks.push(<text key={'t' + t} x={30} y={y(t) + 6} fontSize={18} fontFamily="ui-monospace, monospace" fill="#111">{Math.round(t)}</text>);
    }
    const lv = y(apparent);
    // Seen from above or below, the meniscus is an ellipse: its curve shows where your eye is
    const curve = 9 + Math.min(10, Math.abs(reading.eye) * 200);
    svg = (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Magnified burette scale at the meniscus">
        <rect width={W} height={H} fill="#eef3f6" />
        <rect x={64} y={0} width={60} height={H} fill="#f7fbfd" />
        {level < 51 && <rect x={64} y={lv} width={60} height={Math.max(0, H - lv)} fill="#cfe2f5" />}
        {level < 51 && <path d={`M64 ${lv - curve} Q94 ${lv + curve * (reading.eye > 0 ? 0.6 : 1)} 124 ${lv - curve}`} stroke="#1e3a5f" strokeWidth={3} fill="none" />}
        <rect x={64} y={0} width={60} height={H} fill="none" stroke="#9fb4c4" strokeWidth={2} />
        {marks}
      </svg>
    );
  } else {
    // Pipette: one ring-mark on a thin stem; the meniscus must sit on it
    const PX = 380; // px per mL near the line (the stem is narrow: tiny volumes move the level a lot)
    const diff = pipetteML - PIPETTE.LINE + reading.eye * 0.6;
    const lineY = H / 2;
    const lv = lineY - diff * PX;
    svg = (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Magnified pipette stem at the line">
        <rect width={W} height={H} fill="#eef3f6" />
        <rect x={96} y={0} width={28} height={H} fill="#f7fbfd" stroke="#9fb4c4" strokeWidth={2} />
        {pipetteML > 0.1 && lv < H && <rect x={96} y={Math.max(0, lv)} width={28} height={Math.max(0, H - Math.max(0, lv))} fill="#cfe2f5" />}
        {pipetteML > 0.1 && lv > -10 && lv < H + 10 && <path d={`M96 ${lv - 6} Q110 ${lv + 6} 124 ${lv - 6}`} stroke="#1e3a5f" strokeWidth={3} fill="none" />}
        <line x1={86} x2={134} y1={lineY} y2={lineY} stroke="#111" strokeWidth={2.5} />
        <text x={142} y={lineY + 5} fontSize={13} fill="#111">25 cm³ line</text>
      </svg>
    );
  }

  // Which cell the student is most likely writing: the first column without a final reading
  const col = Math.max(0, sheet.final.findIndex((c) => c.value.trim() === ''));
  const row: 'initial' | 'final' = sheet.initial[col]?.value.trim() ? 'final' : 'initial';
  const write = (r: 'initial' | 'final') => {
    if (!text.trim()) return;
    titration.writeCell(r, col, text.trim());
    setText('');
  };

  return (
    <div
      className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-[260px] [@media(max-height:500px)]:w-[230px] bg-slate-950/90 border border-slate-700 rounded-2xl p-3 text-slate-100 shadow-2xl"
      onPointerDown={(e) => (drag.current = e.clientY)}
      onPointerMove={(e) => {
        if (drag.current === null) return;
        titrationControls.get()?.eyeBy((drag.current - e.clientY) * -0.0004);
        drag.current = e.clientY;
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold">{reading.kind === 'burette' ? 'Reading the burette' : 'Pipette to the line'}</p>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${eyeLevel ? 'bg-teal-500/20 text-teal-300' : 'bg-amber-500/20 text-amber-300'}`}>
          {eyeLevel ? 'Eye level' : reading.eye > 0 ? 'Eye too high' : 'Eye too low'}
        </span>
      </div>
      <div className="flex gap-2 items-stretch">
        <div className="rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 [@media(max-height:500px)]:scale-90 origin-top-left">{svg}</div>
        <div className="flex flex-col justify-between items-center w-6" aria-hidden>
          <div className="w-1.5 flex-1 rounded-full bg-slate-700 relative">
            <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-400" style={{ top: `${50 - (reading.eye / 0.08) * 50}%` }} />
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-4 h-px bg-teal-300" />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        {isTouch ? 'Drag on this lens to raise or lower your eye.' : 'Scroll or ↑ ↓ to raise or lower your eye.'} Read the bottom of the curve.
      </p>
      {isTouch && (
        <div className="flex gap-2 mt-2">
          <button className="flex-1 h-11 rounded-lg bg-slate-800 text-sm" onClick={() => titrationControls.get()?.eyeBy(0.006)} aria-label="Raise eye">Eye ▲</button>
          <button className="flex-1 h-11 rounded-lg bg-slate-800 text-sm" onClick={() => titrationControls.get()?.eyeBy(-0.006)} aria-label="Lower eye">Eye ▼</button>
        </div>
      )}
      {reading.kind === 'burette' && (
        <div className="mt-2">
          <label className="text-[11px] text-slate-400 block">
            Write it on your sheet ({SHEET_COLS[col]} run)
            <input
              inputMode="decimal"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && write(row)}
              placeholder="e.g. 0.20"
              className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-base tabular-nums"
            />
          </label>
          <div className="flex gap-2 mt-2">
            <button onClick={() => write('initial')} className={`flex-1 h-10 rounded-lg text-xs font-medium ${row === 'initial' ? 'bg-teal-600' : 'bg-slate-800'}`}>Initial</button>
            <button onClick={() => write('final')} className={`flex-1 h-10 rounded-lg text-xs font-medium ${row === 'final' ? 'bg-teal-600' : 'bg-slate-800'}`}>Final</button>
          </div>
        </div>
      )}
      <button onClick={() => titrationControls.get()?.read(false)} className="mt-2 w-full h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs">
        Done reading {isTouch ? '' : '(Q)'}
      </button>
    </div>
  );
}
