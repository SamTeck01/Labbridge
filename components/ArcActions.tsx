'use client';

import React, { useEffect, useState } from 'react';

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
  // A ")" curve: the middle button sits closest to the edge, the ends sweep inwards
  const R = 520;
  // Fit between the minimap (top) and the phone button (bottom right)
  const gap = Math.max(46, Math.min(66, (vh - 400) / Math.max(1, n - 1)));
  const centre = (130 + vh - 270) / 2;
  const small = gap < 60;
  return (
    <div className="absolute right-0 -translate-y-1/2 z-40 pointer-events-none" style={{ top: centre, width: 360, height: n * gap + 40 }}>
      {title && vh > 760 && (
        <p className="absolute right-6 -top-6 text-[11px] font-semibold tracking-[0.18em] uppercase text-white/70 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">{title}</p>
      )}
      {actions.map((a, i) => {
        const y = (i - (n - 1) / 2) * gap;
        const x = R - Math.sqrt(R * R - y * y); // how far in from the edge
        const on = hover === a.id;
        const st = a.state ?? 'idle';
        return (
          <div
            key={a.id}
            className="absolute pointer-events-auto arc-in"
            style={{ right: 28 + x, top: `calc(50% + ${y}px)`, transform: 'translateY(-50%)', animationDelay: `${i * 55}ms` }}
          >
            {/* Name slides out to the left on hover (always shown for the next step) */}
            <span
              className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium text-white
                bg-slate-900/35 backdrop-blur-xl border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.25)] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]
                transition-all duration-300 ease-out ${on || st === 'next' || st === 'running' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3 pointer-events-none'}`}
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
              className={`group relative ${small ? 'w-12 h-12' : 'w-14 h-14'} rounded-full flex items-center justify-center text-white
                bg-slate-900/20 bg-gradient-to-br from-white/30 to-white/5 backdrop-blur-xl
                border border-white/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_10px_30px_rgba(0,0,0,0.3)]
                transition-all duration-300 ease-out
                hover:scale-110 hover:from-white/45 hover:to-white/15 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_0_0_6px_rgba(255,255,255,0.12),0_14px_40px_rgba(0,0,0,0.35)]
                active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80
                disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed
                ${st === 'active' ? 'from-white/55 to-white/20' : ''}`}
            >
              {st === 'next' && <span className="absolute inset-0 rounded-full border-2 border-white/80 arc-breathe" aria-hidden />}
              {st === 'running' && <span className="absolute -inset-1 rounded-full border-2 border-white/20 border-t-white animate-spin" aria-hidden />}
              <span className="w-6 h-6 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">{a.icon}</span>
              {st === 'done' && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center shadow" aria-hidden>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** White line icons (24×24, stroke = currentColor). */
const I = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
export const Icons = {
  fill: I(<><path d="M10 3v13a2 2 0 0 0 4 0V3" /><path d="M9 3h6" /><path d="M10 10h4" /><path d="M12 18v3" /></>),
  funnel: I(<><path d="M4 4h16l-6 8v6l-4 2v-8z" /></>),
  bubble: I(<><circle cx="9" cy="14" r="4" /><circle cx="16.5" cy="8" r="2.5" /><circle cx="18" cy="16" r="1.5" /></>),
  pipette: I(<><path d="M14 3l7 7" /><path d="M16 5l-9.5 9.5a2 2 0 0 0 0 2.8l.2.2a2 2 0 0 0 2.8 0L19 8" /><path d="M6.5 17.5L3 21" /></>),
  dropper: I(<><path d="M12 3c-3 4-5 6.5-5 9.5a5 5 0 0 0 10 0C17 9.5 15 7 12 3z" /></>),
  flask: I(<><path d="M9 3h6" /><path d="M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" /><path d="M7 15h10" /></>),
  eye: I(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  stream: I(<><path d="M12 2v6" /><path d="M8 8h8" /><path d="M12 11v4" /><path d="M12 18v1" /><path d="M12 21.5v.5" /></>),
  drop: I(<><path d="M12 6c-2 3-3.5 4.7-3.5 6.8a3.5 3.5 0 0 0 7 0C15.5 10.7 14 9 12 6z" /><path d="M8 4h8" /></>),
  stop: I(<><rect x="6" y="6" width="12" height="12" rx="2.5" /></>),
  swirl: I(<><path d="M20 12a8 8 0 1 1-3-6.2" /><path d="M17 2v4h-4" /></>),
  sheet: I(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>),
};
