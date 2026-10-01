'use client';

import React, { useEffect } from 'react';
import { X, Trophy, CheckCircle2, Circle } from 'lucide-react';
import { EXPERIMENTS, experiments, useExperiments } from '@/lib/experiments';
import { openLabReport } from '@/lib/report';

const STATION_LABEL: Record<string, string> = {
  chemistry: 'Chemistry',
  biology: 'Biology',
  physics: 'Physics',
  research: 'Analytical',
};

const when = (t: number) =>
  new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' · ' + new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** The student's record: best score and attempts per practical, and recent results. */
export default function ProgressModal({ onClose }: { onClose: () => void }) {
  useEffect(() => experiments.init(), []);
  const history = useExperiments((s) => s.history);

  const done = EXPERIMENTS.filter((e) => history.some((h) => h.experimentId === e.id)).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-5 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold flex-1">My progress</h2>
          <span className="text-sm text-slate-400 tabular-nums">{done}/{EXPERIMENTS.length} practicals done</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="space-y-2 mb-5">
          {EXPERIMENTS.map((e) => {
            const attempts = history.filter((h) => h.experimentId === e.id);
            const best = attempts.reduce((m, h) => Math.max(m, h.score), 0);
            return (
              <li key={e.id} className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2.5">
                {attempts.length ? <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" /> : <Circle className="w-5 h-5 text-slate-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-slate-400">
                    {STATION_LABEL[e.station]} · {attempts.length ? `${attempts.length} attempt${attempts.length > 1 ? 's' : ''}, last ${when(attempts[0].finishedAt)}` : 'Not attempted yet'}
                  </p>
                </div>
                {attempts.length > 0 && (
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums leading-none">{best}</p>
                    <p className="text-[11px] text-slate-400">best</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <button onClick={openLabReport} className="w-full mb-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-sm font-semibold">
          Download lab report (PDF)
        </button>

        <h3 className="text-sm font-semibold mb-2">Recent results</h3>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">Finish a practical in the lab and your results will appear here.</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 10).map((h) => (
              <li key={h.finishedAt} className="text-sm border-b border-slate-800 pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">{h.title}</span>
                  <span className="tabular-nums">{h.score}/100</span>
                </div>
                <p className="text-xs text-slate-400">
                  {when(h.finishedAt)}
                  {h.readings.length > 0 && ' · ' + h.readings.map((r) => `${r.label}: ${r.value} ${r.unit}`).join(', ')}
                </p>
                {h.mistakes.length > 0 && <p className="text-xs text-amber-300 mt-0.5">{h.mistakes.length} correction{h.mistakes.length > 1 ? 's' : ''} from Dr. Curie</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
