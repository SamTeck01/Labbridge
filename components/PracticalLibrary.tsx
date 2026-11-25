'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Clock, ArrowLeft, ShieldAlert, Check } from 'lucide-react';
import { EXPERIMENTS, experiments, useExperiments } from '@/lib/experiments';
import { PRACTICAL_META, SKILL_LABEL, START_HERE, SUBJECT_ORDER } from '@/lib/practicalMeta';
import { useFreeCursor } from '@/lib/useFreeCursor';
import type { Station } from '@/lib/labStore';

/**
 * Choosing a practical with Dr. Curie. A list on the left (grouped by subject, with progress) and the
 * chosen practical on the right: what you'll learn, how long, what you'll use, the safety points,
 * and one button. On a phone the list and the detail are two steps of the same sheet.
 */
export default function PracticalLibrary({ onClose, onGo }: { onClose: () => void; onGo: (station: Station, id: string) => void }) {
  useFreeCursor();
  useEffect(() => experiments.init(), []);
  const history = useExperiments((s) => s.history);
  const running = useExperiments((s) => s.run?.experimentId ?? null);
  const best = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of history) m[h.experimentId] = Math.max(m[h.experimentId] ?? 0, h.score);
    return m;
  }, [history]);
  const firstTime = Object.keys(best).length === 0;
  const [sel, setSel] = useState<string>(running ?? (firstTime ? START_HERE : EXPERIMENTS.find((e) => best[e.id] === undefined)?.id ?? START_HERE));
  const [mobileDetail, setMobileDetail] = useState(false);
  const e = EXPERIMENTS.find((x) => x.id === sel)!;
  const m = PRACTICAL_META[e.id];

  useEffect(() => {
    const k = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const action = running === e.id ? 'Continue' : best[e.id] !== undefined ? 'Do it again' : 'Start with Dr. Curie';

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a practical"
        onClick={(ev) => ev.stopPropagation()}
        className="w-full sm:max-w-3xl h-[88dvh] sm:h-[min(620px,90dvh)] bg-[#0e1525] text-slate-100 border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          {mobileDetail && (
            <button className="sm:hidden -ml-2 p-2 text-slate-300" onClick={() => setMobileDetail(false)} aria-label="Back to the list">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight">Choose a practical</h2>
            <p className="text-xs text-slate-400">{Object.keys(best).length} of {EXPERIMENTS.length} completed</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 flex">
          {/* List */}
          <nav className={`${mobileDetail ? 'hidden' : 'flex'} sm:flex flex-col w-full sm:w-[42%] sm:border-r border-white/10 overflow-y-auto`} aria-label="Practicals">
            {SUBJECT_ORDER.map((subject) => (
              <div key={subject} className="py-2">
                <p className="px-5 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{subject}</p>
                {EXPERIMENTS.filter((x) => PRACTICAL_META[x.id]?.subject === subject).map((x) => {
                  const on = x.id === sel;
                  const done = best[x.id] !== undefined;
                  return (
                    <button
                      key={x.id}
                      onClick={() => { setSel(x.id); setMobileDetail(true); }}
                      aria-current={on}
                      className={`w-full text-left px-5 py-2.5 flex items-center gap-3 min-h-12 border-l-2 ${on ? 'bg-white/[0.06] border-teal-400' : 'border-transparent hover:bg-white/[0.03]'}`}
                    >
                      <span className={`shrink-0 w-5 h-5 rounded-full grid place-items-center border ${done ? 'bg-teal-500/20 border-teal-400/60 text-teal-300' : 'border-slate-600'}`}>
                        {done && <Check className="w-3 h-3" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm truncate">{x.title}</span>
                        <span className="block text-[11px] text-slate-400">
                          {running === x.id ? 'In progress' : done ? `Best ${best[x.id]}/100` : `${PRACTICAL_META[x.id].difficulty} · ${PRACTICAL_META[x.id].minutes} min`}
                          {x.id === START_HERE && !done && firstTime && <span className="text-teal-300"> · start here</span>}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Detail */}
          <section className={`${mobileDetail ? 'flex' : 'hidden'} sm:flex flex-col flex-1 min-w-0`}>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-teal-300/90">{m.subject}</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight leading-snug">{e.title}</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{m.learn}</p>
              <p className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                <span>{m.difficulty}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> about {m.minutes} min</span>
              </p>

              <h4 className="mt-6 text-xs font-medium text-slate-400">You will use</h4>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {m.apparatus.map((a) => <li key={a} className="text-xs px-2 py-1 rounded-md bg-white/[0.05] border border-white/10">{a}</li>)}
              </ul>

              <h4 className="mt-5 text-xs font-medium text-slate-400 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-amber-300" /> Safety</h4>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {e.safety.map((s) => <li key={s} className="pl-3 relative before:absolute before:left-0 before:top-[0.6em] before:w-1 before:h-1 before:rounded-full before:bg-amber-300/80">{s}</li>)}
              </ul>

              <h4 className="mt-5 text-xs font-medium text-slate-400">Exam skills</h4>
              <p className="mt-1 text-sm text-slate-300">{m.skills.map((k) => SKILL_LABEL[k]).join(', ')}</p>
            </div>
            <footer className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
              <p className="hidden sm:block flex-1 text-xs text-slate-400">Dr. Curie will walk you to the bench.</p>
              <button
                onClick={() => { onGo(e.station, e.id); onClose(); }}
                className="w-full sm:w-auto min-h-11 px-5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold"
              >
                {action}
              </button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}
