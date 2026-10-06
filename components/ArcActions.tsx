'use client';

import React, { useEffect, useState } from 'react';
import { LabIcon } from '@/components/icons/LabIcons';

/**
 * Glass action buttons on a curve down the right edge of the screen. Press one and that step
 * plays. Hover shows its name; the next step breathes; finished steps get a tick.
 */

export type ArcAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  state?: 'next' | 'done' | 'running' | 'idle' | 'active';
  disabled?: boolean;
  onClick: () => void;
};

export default function ArcActions({ actions, title }: { actions: ArcAction[]; title?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const [vh, setVh] = useState(900);
  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const n = actions.length;
  // Fit between the minimap (top) and the phone button (bottom right)
  const gap = Math.max(48, Math.min(70, (vh - 400) / Math.max(1, n - 1)));
  const centre = (130 + vh - 270) / 2;
  const bh = gap < 60 ? 46 : 54; // button height; buttons are ovals a little wider than tall
  const bw = Math.round(bh * 1.14);
  // A ")" curve like a thumb's sweep: the middle sits at the edge, the ends bend inwards
  const half = ((n - 1) / 2) * gap;
  const bulge = Math.max(30, half * 0.36);
  const R = (half * half + bulge * bulge) / (2 * bulge);
  const W = 380;
  const H = n * gap + 80;
  const X0 = W - 30 - bw / 2; // where the middle button's centre sits
  const at = (y: number) => ({ x: X0 - (R - Math.sqrt(Math.max(0, R * R - y * y))), y: H / 2 + y, deg: (Math.asin(Math.min(1, y / R)) * 180) / Math.PI });
  // The glass rail runs a little past the first and last buttons
  const ext = half + gap * 0.55;
  const a0 = at(-ext);
  const a1 = at(ext);
  const rail = `M ${a0.x} ${a0.y} A ${R} ${R} 0 0 1 ${a1.x} ${a1.y}`;
  return (
    <div className="absolute right-0 -translate-y-1/2 z-40 pointer-events-none" style={{ top: centre, width: W, height: H }}>
      {/* The curved rail the buttons sit on */}
      <svg className="absolute inset-0 arc-rail" width={W} height={H} aria-hidden>
        <defs>
          <linearGradient id="arcRail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.18" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.82" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id="arcGlow" x="-50%" y="-10%" width="200%" height="120%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <path d={rail} stroke="url(#arcRail)" strokeWidth={bh + 18} strokeLinecap="round" fill="none" opacity="0.12" />
        <path d={rail} stroke="url(#arcRail)" strokeWidth="6" fill="none" filter="url(#arcGlow)" opacity="0.6" />
        <path d={rail} stroke="url(#arcRail)" strokeWidth="1.5" fill="none" />
      </svg>
      {title && vh > 760 && (
        <p className="absolute text-[11px] font-semibold tracking-[0.2em] uppercase text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]" style={{ right: 30, top: a0.y - 34 }}>{title}</p>
      )}
      {actions.map((a, i) => {
        const p = at((i - (n - 1) / 2) * gap);
        const on = hover === a.id;
        const st = a.state ?? 'idle';
        return (
          <div key={a.id} className="absolute pointer-events-auto" style={{ left: p.x, top: p.y, width: 0, height: 0 }}>
            <div className="arc-in" style={{ animationDelay: `${i * 60}ms` }}>
              {/* Name slides out to the left on hover (always shown for the next step) */}
              <span
                className={`absolute top-0 -translate-y-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white
                  bg-slate-900/35 backdrop-blur-xl border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.25)] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]
                  transition-all duration-300 ease-out ${on || st === 'next' || st === 'running' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3 pointer-events-none'}`}
                style={{ right: bw / 2 + 12 }}
              >
                {st === 'running' ? `${a.label}…` : a.label}
              </span>
              <button
                type="button"
                aria-label={a.label}
                disabled={a.disabled}
                onMouseEnter={() => setHover(a.id)}
                onMouseLeave={() => setHover((h) => (h === a.id ? null : h))}
                onFocus={() => setHover(a.id)}
                onBlur={() => setHover(null)}
                onClick={a.onClick}
                style={{ width: bw, height: bh, left: -bw / 2, top: -bh / 2, transform: `rotate(${p.deg}deg)` }}
                className={`group absolute rounded-[50%] flex items-center justify-center text-white
                  bg-slate-900/20 bg-gradient-to-br from-white/35 via-white/10 to-white/5 backdrop-blur-xl
                  border border-white/40 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-6px_12px_rgba(255,255,255,0.08),0_10px_28px_rgba(0,0,0,0.3)]
                  transition-[scale,box-shadow,background-color] duration-300 ease-out
                  hover:!scale-110 hover:from-white/50 hover:to-white/15 hover:shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.9),0_0_0_6px_rgba(255,255,255,0.14),0_0_28px_rgba(255,255,255,0.35),0_14px_40px_rgba(0,0,0,0.35)]
                  active:!scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${st === 'active' ? 'from-white/60 to-white/25' : ''}`}
              >
                {st === 'next' && <span className="absolute inset-0 rounded-[50%] border-2 border-white/80 arc-breathe" aria-hidden />}
                {st === 'running' && <span className="absolute -inset-1 rounded-[50%] border-2 border-white/20 border-t-white animate-spin" aria-hidden />}
                {/* Icon stays upright while the oval follows the curve */}
                <span className={`${bh > 50 ? "w-7 h-7" : "w-6 h-6"} transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]`} style={{ transform: `rotate(${-p.deg}deg)` }}>
                  {a.icon}
                </span>
                {st === 'done' && (
                  <span className="absolute -top-1 -right-0.5 w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center shadow" style={{ transform: `rotate(${-p.deg}deg)` }} aria-hidden>
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  </span>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The button icons (see components/icons/LabIcons.tsx and the svg-icons skill). */
export const Icons = Object.fromEntries(Object.entries(LabIcon).map(([k, C]) => [k, <C key={k} className="w-full h-full" />])) as Record<keyof typeof LabIcon, React.ReactNode>;
