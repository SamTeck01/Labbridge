'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { EXPERIMENTS, experiments, useExperiments } from '@/lib/experiments';
import { PRACTICAL_META, SKILL_LABEL, START_HERE, SUBJECT_ORDER, type Subject } from '@/lib/practicalMeta';
import { useFreeCursor } from '@/lib/useFreeCursor';
import type { Station } from '@/lib/labStore';

const SUBJECT_TONE: Record<Subject, string> = {
  Biology: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  Chemistry: 'text-sky-300 bg-sky-500/10 border-sky-500/30',
  Physics: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
};

/**
 * Every practical on one screen, grouped by subject: what you'll learn, how hard it is, what you
 * need, whether you've done it. "Go to bench" takes the student straight to that bench.
 */
export default function PracticalLibrary({ onClose, onGo }: { onClose: () => void; onGo: (station: Station) => void }) {
  useFreeCursor();
  useEffect(() => experiments.init(), []);
  const history = useExperiments((s) => s.history);
  const running = useExperiments((s) => s.run?.experimentId ?? null);
  const [open, setOpen] = useState<string | null>(null);

  const best = (id: string) => {
    const s = history.filter((h) => h.experimentId === id).map((h) => h.score);
    return s.length ? Math.max(...s) : null;
  };
  const doneCount = EXPERIMENTS.filter((e) => best(e.id) !== null).length;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Practicals"
      >
        <div className="flex items-start gap-3 mb-1">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Practicals</h2>
            <p className="text-xs text-slate-400">
              {doneCount}/{EXPERIMENTS.length} done · Pick one and you’ll be taken to its bench. Dr. Curie guides you through it.
            </p>
          </div>
          <button onClick={onClose} className="p-2 -m-1 text-slate-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {SUBJECT_ORDER.map((subject) => (
          <section key={subject} className="mt-4">
            <h3 className={`inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border mb-2 ${SUBJECT_TONE[subject]}`}>{subject}</h3>
            <ul className="space-y-2">
              {EXPERIMENTS.filter((e) => PRACTICAL_META[e.id]?.subject === subject).map((e) => {
                const m = PRACTICAL_META[e.id];
                const b = best(e.id);
                const expanded = open === e.id;
                return (
                  <li key={e.id} className="rounded-xl border border-slate-700 bg-slate-800/60">
                    <button className="w-full text-left p-3 flex gap-3 items-start" onClick={() => setOpen(expanded ? null : e.id)} aria-expanded={expanded}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{e.title}</span>
                          {e.id === START_HERE && b === null && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-300 bg-teal-500/15 border border-teal-500/30 rounded-full px-1.5 py-0.5">
                              <Sparkles className="w-3 h-3" /> Start here
                            </span>
                          )}
                          {running === e.id && <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 rounded-full px-1.5 py-0.5">In progress</span>}
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">{m.learn}</p>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{m.difficulty}</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {m.minutes} min</span>
                          {b !== null && (
                            <span className="flex items-center gap-0.5 text-teal-300"><CheckCircle2 className="w-3 h-3" /> Best {b}/100</span>
                          )}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 mt-1 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    </button>
                    {expanded && (
                      <div className="px-3 pb-3 text-xs text-slate-300">
                        <p><span className="text-slate-400">Aim: </span>{e.objective}</p>
                        <p className="mt-2 text-slate-400">Apparatus</p>
                        <p>{m.apparatus.join(' · ')}</p>
                        <p className="mt-2 text-slate-400">Safety</p>
                        <ul className="list-disc pl-4 text-rose-200/90">{e.safety.map((x) => <li key={x}>{x}</li>)}</ul>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.skills.map((k) => <span key={k} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">{SKILL_LABEL[k]}</span>)}
                        </div>
                        <button
                          onClick={() => {
                            onGo(e.station);
                            onClose();
                          }}
                          className="mt-3 w-full min-h-11 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-semibold"
                        >
                          {running === e.id ? 'Continue at the bench' : b !== null ? 'Go to bench and try again' : 'Go to bench'}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
