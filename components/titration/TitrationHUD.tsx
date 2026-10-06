'use client';

import React, { useRef, useState } from 'react';
import { useHandsUI, titrationControls, type HandsUI } from '@/lib/titration/ui';
import { useTitration } from '@/lib/titration/sim';
import ReadLens from '@/components/titration/ReadLens';

/**
 * What the student needs on screen at the titration bench, and nothing else:
 *  - two hand slots (bottom corners): what each hand holds and what it's doing
 *  - desktop: one line of keys for what you're holding right now
 *  - touch: a few big buttons under the right thumb for what you're holding right now
 *  - the reading lens when leaning in to a scale, and the tab for the lab sheet
 */

const c = () => titrationControls.get();

function HandSlot({ side, title, detail, accent, meter }: { side: 'L' | 'R'; title: string; detail: string | null; accent: boolean; meter?: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-950/85 border border-slate-700/70 px-3 py-2 shadow-xl [@media(max-height:500px)]:py-1.5 [@media(max-height:500px)]:px-2">
      <div className={`w-10 h-10 [@media(max-height:500px)]:w-8 [@media(max-height:500px)]:h-8 shrink-0 rounded-full border-[3px] flex items-center justify-center text-sm font-semibold ${accent ? (side === 'R' ? 'border-amber-400 text-amber-200' : 'border-teal-300 text-teal-100') : 'border-slate-600 text-slate-400'}`}>
        {side}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">{side === 'L' ? 'Left hand' : 'Right hand'}</p>
        <p className="text-sm font-semibold text-slate-100 truncate max-w-[180px]">{title}</p>
        {meter !== undefined && (
          <div className="mt-1 h-1.5 w-32 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full bg-amber-400" style={{ width: `${Math.round(meter * 100)}%` }} />
          </div>
        )}
        {detail && <p className={`text-xs truncate max-w-[200px] ${side === 'R' ? 'text-amber-300' : 'text-teal-300'}`}>{detail}</p>}
      </div>
    </div>
  );
}

function flowWord(v: number) {
  if (v <= 0.001) return 'Closed';
  if (v < 0.22) return 'Single drops';
  if (v < 0.5) return 'Fast drops';
  return 'Running';
}

/** What you can do right now, for the crosshair prompt. */
export function titrationPrompts(h: HandsUI): { k: string; v: string }[] {
  if (h.reading) return [{ k: 'Scroll', v: 'Raise / lower your eye' }, { k: 'Q', v: 'Done reading' }];
  if (h.onTap) return [{ k: 'Scroll', v: 'Open / close the tap' }, { k: 'W', v: 'Swirl the flask' }, { k: 'Space', v: 'Read the burette' }, { k: 'Q', v: 'Let go' }];
  if (h.held) {
    const k = h.held.kind;
    if (k === 'pipette') return [{ k: '↑ ↓', v: 'Draw up / let out' }, { k: 'Scroll', v: 'Lift / dip' }, { k: 'Space', v: 'Read the line' }, { k: 'Q', v: 'Put it down' }];
    if (k === 'dropper') return [{ k: 'E', v: 'Squeeze one drop' }, { k: 'Click', v: 'Put it down' }];
    if (k === 'funnel') return [{ k: 'Scroll', v: 'Lift / lower' }, { k: 'Click', v: 'Put it down' }];
    if (k === 'flask') return [{ k: 'Circle mouse', v: 'Swirl' }, { k: 'Click', v: 'Put down (tile = under the burette)' }];
    return [{ k: 'Hold R', v: 'Pour' }, { k: 'Scroll', v: 'Lift / lower' }, { k: 'Click', v: 'Put it down' }];
  }
  return [];
}

function hints(h: HandsUI): string[] {
  if (h.reading) return ['Scroll / ↑ ↓ eye height', 'Q done'];
  if (h.onTap) return ['Scroll open / close', 'Shift fine', 'W swirl', 'Space read', 'Q let go'];
  if (h.held) {
    const k = h.held.kind;
    if (k === 'pipette') return ['Move to carry', 'Scroll lift / dip', '↑ draw up · ↓ let out', 'Space read the line', 'Click or Q put down'];
    if (k === 'dropper') return ['Move to carry', 'E squeeze one drop', 'Click or Q put down'];
    if (k === 'funnel') return ['Move to carry', 'Scroll lift', 'Click or Q put down'];
    if (k === 'flask') return ['Move to carry', 'Circle the mouse to swirl', 'Click put it down (tile = under the burette)'];
    return ['Move to carry', 'Scroll lift', 'Hold R to pour (scroll: more / less)', 'Click or Q put down'];
  }
  return ['Click glassware to pick it up', 'Click the tap to hold it', 'W swirl', 'Space read', 'S lab sheet', 'X step back'];
}

/** Press-and-slide pad: the further you slide down, the further it tilts. Let go and it rights itself. */
function PourPad() {
  const start = useRef<number | null>(null);
  const set = (y: number) => {
    if (start.current === null) return;
    const k = Math.max(0, Math.min(1, (y - start.current) / 120));
    c()?.setTilt(0.25 + k * 1.85);
  };
  return (
    <button
      className="w-24 h-24 rounded-full bg-amber-400 text-slate-950 font-semibold text-sm leading-tight shadow-xl active:scale-95 touch-none select-none"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        start.current = e.clientY;
        c()?.setTilt(0.25);
      }}
      onPointerMove={(e) => set(e.clientY)}
      onPointerUp={() => {
        start.current = null;
        c()?.setTilt(0);
      }}
      onPointerCancel={() => {
        start.current = null;
        c()?.setTilt(0);
      }}
    >
      Hold to pour
      <span className="block text-[11px] font-normal">slide down = tilt</span>
    </button>
  );
}

/** A vertical lever. `spring`: returns to the middle when released (pipette filler); otherwise stays (tap). */
function Lever({ label, value, onChange, spring, top, bottom }: { label: string; value: number; onChange: (v: number) => void; spring?: boolean; top: string; bottom: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const fromY = (y: number) => {
    const r = ref.current!.getBoundingClientRect();
    const k = 1 - (y - r.top) / r.height;
    return spring ? Math.max(-1, Math.min(1, k * 2 - 1)) : Math.max(0, Math.min(1, k));
  };
  const pos = spring ? (value + 1) / 2 : value;
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="text-[10px] text-slate-300">{top}</span>
      <div
        ref={ref}
        role="slider"
        aria-label={label}
        aria-valuenow={Math.round(value * 100)}
        tabIndex={0}
        className="relative w-12 h-40 [@media(max-height:500px)]:h-28 rounded-full bg-slate-900/90 border border-slate-600 touch-none"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onChange(fromY(e.clientY));
        }}
        onPointerMove={(e) => e.buttons && onChange(fromY(e.clientY))}
        onPointerUp={() => spring && onChange(0)}
        onPointerCancel={() => spring && onChange(0)}
      >
        <div className="absolute left-0 right-0 bottom-0 rounded-full bg-amber-400/40" style={{ height: `${pos * 100}%` }} />
        <div className="absolute left-1/2 -translate-x-1/2 w-14 h-5 rounded-full bg-slate-100 shadow" style={{ bottom: `calc(${pos * 100}% - 10px)` }} />
      </div>
      <span className="text-[10px] text-slate-300">{bottom}</span>
    </div>
  );
}

function Btn({ children, onClick, active, label }: { children: React.ReactNode; onClick?: () => void; active?: boolean; label?: string }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`min-h-11 min-w-11 px-3 rounded-full text-sm font-medium shadow-lg border ${active ? 'bg-teal-500 text-slate-950 border-teal-300' : 'bg-slate-950/85 text-slate-100 border-slate-700'}`}
    >
      {children}
    </button>
  );
}

/** Press-and-hold button (lift / lower) that feeds a continuous input. */
function HoldBtn({ children, input, value }: { children: React.ReactNode; input: 'lift'; value: number }) {
  return (
    <button
      className="min-h-11 min-w-11 px-3 rounded-full text-sm font-medium bg-slate-950/85 text-slate-100 border border-slate-700 shadow-lg touch-none select-none"
      onPointerDown={() => c()?.setInput(input, value)}
      onPointerUp={() => c()?.setInput(input, 0)}
      onPointerCancel={() => c()?.setInput(input, 0)}
      onPointerLeave={() => c()?.setInput(input, 0)}
    >
      {children}
    </button>
  );
}

export default function TitrationHUD({ isTouch, onOpenSheet, aiming = false }: { isTouch: boolean; onOpenSheet: () => void; aiming?: boolean }) {
  const h = useHandsUI((s) => s);
  const valve = useTitration((s) => s.valve);
  const swirl = useTitration((s) => s.swirl);
  const [lever, setLever] = useState(0);

  const right = h.held
    ? { title: h.held.name, detail: h.pouring ? (h.splashing ? 'Too steep: splashing!' : 'Pouring') : h.over }
    : h.onTap
      ? { title: 'Burette tap', detail: flowWord(valve) }
      : { title: 'Free', detail: null };
  const left = swirl > 0.05 && h.held?.kind !== 'flask' ? { title: 'Conical flask', detail: 'Swirling' } : { title: 'Free', detail: null };

  return (
    <>
      {/* Hand slots */}
      <div className="absolute left-4 bottom-4 z-40 pointer-events-none">
        <HandSlot side="L" title={left.title} detail={left.detail} accent={left.title !== 'Free'} />
      </div>
      <div className={`absolute bottom-4 z-40 pointer-events-none ${isTouch ? 'left-[calc(1rem+230px)] [@media(max-height:500px)]:left-[calc(1rem+200px)]' : 'right-24'}`}>
        <HandSlot side="R" title={right.title} detail={right.detail} accent={right.title !== 'Free'} meter={h.onTap ? valve : undefined} />
      </div>

      {/* Lab sheet tab */}
      <button
        onClick={onOpenSheet}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-40 w-11 py-5 rounded-r-xl bg-[#f4efe2] text-slate-900 text-xs font-semibold tracking-wider shadow-xl [writing-mode:vertical-rl]"
      >
        LAB SHEET{isTouch ? '' : ' · S'}
      </button>

      {/* Desktop: the keys for right now */}
      {!isTouch && !aiming && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-wrap justify-center gap-x-2 gap-y-1 max-w-[min(56vw,720px)] px-3 py-1.5 rounded-full bg-slate-950/80 text-xs text-slate-300">
          {hints(h).map((t, i) => (
            <span key={t}>
              {i > 0 && <span className="text-slate-600 mr-2">·</span>}
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Touch: big buttons under the right thumb, only for what you're holding */}
      {isTouch && !h.reading && (
        <div className="absolute right-[88px] bottom-4 z-40 flex items-end gap-2">
          {h.held && (
            <div className="flex flex-col gap-2 items-end">
              <HoldBtn input="lift" value={1}>Lift ▲</HoldBtn>
              <HoldBtn input="lift" value={-1}>Lower ▼</HoldBtn>
              <Btn onClick={() => c()?.setDown()}>Put down</Btn>
            </div>
          )}
          {h.held && (h.held.kind === 'bottle' || h.held.kind === 'beaker') && <PourPad />}
          {h.held?.kind === 'pipette' && (
            <Lever
              label="Pipette filler"
              value={lever}
              spring
              top="Draw up"
              bottom="Let out"
              onChange={(v) => {
                setLever(v);
                c()?.setInput('lever', Math.abs(v) < 0.12 ? 0 : v * 0.6);
              }}
            />
          )}
          {h.held?.kind === 'dropper' && (
            <button onClick={() => c()?.squeeze()} className="w-24 h-24 rounded-full bg-amber-400 text-slate-950 font-semibold text-sm shadow-xl active:scale-95">
              Squeeze
              <span className="block text-[11px] font-normal">one drop</span>
            </button>
          )}
          {h.onTap && (
            <>
              <div className="flex flex-col gap-2 items-end">
                <Btn onClick={() => c()?.swirl(!h.swirling)} active={h.swirling}>Swirl</Btn>
                <Btn onClick={() => c()?.read(true)}>Read</Btn>
                <Btn onClick={() => c()?.toggleTap(false)}>Let go</Btn>
              </div>
              <Lever label="Burette tap" value={valve} top="Open" bottom="Closed" onChange={(v) => c()?.setValve(v)} />
            </>
          )}
          {!h.held && !h.onTap && (
            <div className="flex flex-col gap-2 items-end">
              <Btn onClick={() => c()?.swirl(!h.swirling)} active={h.swirling}>Swirl</Btn>
              <Btn onClick={() => c()?.read(true)}>Read burette</Btn>
            </div>
          )}
          {h.held?.kind === 'pipette' && <Btn onClick={() => c()?.read(true)}>Read line</Btn>}
        </div>
      )}

      {h.reading && <ReadLens reading={h.reading} isTouch={isTouch} />}
    </>
  );
}
