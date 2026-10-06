'use client';

import React, { useEffect, useRef } from 'react';
import { useBenchUI, benchControls } from '@/lib/benchUI';
import { useLab, microscopeSharpness } from '@/lib/labStore';
import { SPECIMEN_CATALOG, drawSpecimenToCanvas } from '@/lib/specimenGenerator';

/**
 * HUD for benches worked by turning controls directly (the microscope first): the hand on the
 * control, the keys for right now, a touch lever to keep turning, and, at the microscope, a live
 * view down the eyepiece so you see the image sharpen as your hand turns the knob.
 */

const MAG: Record<string, number> = { '4x': 40, '10x': 100, '40x': 400, '100x': 1000 };

function EyepiecePiP() {
  const bio = useLab((s) => s.biology);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const id = (SPECIMEN_CATALOG[bio.slideIndex] || SPECIMEN_CATALOG[0]).id;
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    drawSpecimenToCanvas(ctx, c.width, c.height, id, MAG[bio.objective], bio.stageX * 150, bio.stageY * 150, 1, bio.lightIntensity, 0.8);
  }, [id, bio.objective, bio.stageX, bio.stageY, bio.lightIntensity]);
  const sharp = microscopeSharpness(bio);
  const blur = sharp < 0.95 ? (1 - sharp) * 8 : 0;
  return (
    <div className="absolute right-4 top-[38%] -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 pointer-events-none">
      <div className="w-[min(34vh,260px)] h-[min(34vh,260px)] rounded-full overflow-hidden border-[6px] border-slate-900 bg-black shadow-2xl">
        <canvas ref={ref} width={300} height={300} className="w-full h-full" style={{ filter: blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : undefined }} />
      </div>
      <span className="text-xs text-slate-100 bg-slate-950/80 rounded-full px-2.5 py-0.5">Through the eyepiece · {MAG[bio.objective]}×</span>
    </div>
  );
}

function RateLever() {
  const ref = useRef<HTMLDivElement | null>(null);
  const set = (y: number) => {
    const r = ref.current!.getBoundingClientRect();
    const k = 1 - (y - r.top) / r.height;
    const v = Math.max(-1, Math.min(1, k * 2 - 1));
    benchControls.get()?.setRate(Math.abs(v) < 0.12 ? 0 : v);
  };
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="text-[10px] text-slate-300">Turn ▲</span>
      <div
        ref={ref}
        role="slider"
        aria-label="Turn the control"
        aria-valuenow={0}
        tabIndex={0}
        className="relative w-12 h-36 [@media(max-height:500px)]:h-28 rounded-full bg-slate-900/90 border border-slate-600 touch-none"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          set(e.clientY);
        }}
        onPointerMove={(e) => e.buttons && set(e.clientY)}
        onPointerUp={() => benchControls.get()?.setRate(0)}
        onPointerCancel={() => benchControls.get()?.setRate(0)}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-5 rounded-full bg-slate-100 shadow" />
      </div>
      <span className="text-[10px] text-slate-300">Turn ▼</span>
    </div>
  );
}

export default function BenchHandHUD({ isTouch, station, aiming = false }: { isTouch: boolean; station: string; aiming?: boolean }) {
  const raw = useBenchUI((s) => s);
  const ui = raw.station === station ? raw : { station, control: null, hints: ['Aim and click to pick up or use things', 'Hold a knob and scroll to turn it', 'X step back', 'H controls'] };
  const c = ui.control;
  return (
    <>
      <div className={`absolute bottom-4 z-40 pointer-events-none ${c?.side === 'left' ? 'left-4' : isTouch ? 'left-4' : 'right-24'}`}>
        <div className="flex items-center gap-3 rounded-2xl bg-slate-950/85 border border-slate-700/70 px-3 py-2 shadow-xl">
          <div className={`w-10 h-10 rounded-full border-[3px] flex items-center justify-center text-sm font-semibold ${c ? 'border-amber-400 text-amber-200' : 'border-slate-600 text-slate-400'}`}>{c?.side === 'left' ? 'L' : 'R'}</div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{c ? (c.side === 'left' ? 'Left hand' : 'Right hand') : 'Hands'}</p>
            <p className="text-sm font-semibold text-slate-100">{c ? c.name : 'Free'}</p>
            {c && c.value >= 0 && (
              <div className="mt-1 h-1.5 w-32 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${Math.round(c.value * 100)}%` }} />
              </div>
            )}
            {c?.detail && <p className="text-xs text-amber-300">{c.detail}</p>}
          </div>
        </div>
      </div>
      {c && ui.station === 'biology' && <EyepiecePiP />}
      {!isTouch && !aiming && ui.hints.length > 0 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-wrap justify-center gap-x-2 max-w-[min(56vw,720px)] px-3 py-1.5 rounded-full bg-slate-950/80 text-xs text-slate-300">
          {ui.hints.map((t, i) => (
            <span key={t}>
              {i > 0 && <span className="text-slate-600 mr-2">·</span>}
              {t}
            </span>
          ))}
        </div>
      )}
      {isTouch && c && (
        <div className="absolute right-[88px] bottom-4 z-40 flex items-end gap-2">
          <button onClick={() => benchControls.get()?.letGo()} className="min-h-11 px-3 rounded-full text-sm bg-slate-950/85 text-slate-100 border border-slate-700">Let go</button>
          <RateLever />
        </div>
      )}
    </>
  );
}
