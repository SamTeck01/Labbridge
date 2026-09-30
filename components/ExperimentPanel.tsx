'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, ClipboardList, FlaskConical, X, Trophy, Droplet } from 'lucide-react';
import { experiments, experimentForStation, getExperiment, useExperiments } from '@/lib/experiments';
import { labStore, titrationPH, type Station } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';

/** Practical brief, live procedure checklist, readings and results for the bench the student is at. */
export default function ExperimentPanel({ station }: { station: Station | null }) {
  const run = useExperiments((s) => s.run);
  const lastResult = useExperiments((s) => s.lastResult);
  const [error, setError] = useState<string | null>(null);

  const active = getExperiment(run?.experimentId);
  const available = experimentForStation(station);

  if (lastResult) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold">{lastResult.title}</h2>
              <p className="text-sm text-slate-400">Practical complete</p>
            </div>
            <span className="ml-auto text-3xl font-bold tabular-nums">{lastResult.score}<span className="text-base text-slate-400">/100</span></span>
          </div>
          <ul className="space-y-2 mb-4">
            {lastResult.breakdown.map((b) => (
              <li key={b.label} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{b.label}</span>
                  <span className="tabular-nums text-slate-300">{b.points}/{b.max}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: `${(b.points / b.max) * 100}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{b.note}</p>
              </li>
            ))}
          </ul>
          {lastResult.readings.length > 0 && (
            <div className="text-sm mb-4">
              <p className="font-medium mb-1">Your readings</p>
              {lastResult.readings.map((r, i) => (
                <p key={i} className="text-slate-300 tabular-nums">{r.label}: {r.value} {r.unit}</p>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 mb-4">Dr. Curie is giving you feedback. It appears in her speech bubble and on your phone.</p>
          <div className="flex gap-2">
            <button onClick={() => experiments.start(lastResult.experimentId)} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">Try again</button>
            <button onClick={() => experiments.dismissResult()} className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-medium">Done</button>
          </div>
        </div>
      </div>
    );
  }

  // Brief: offered when seated at a bench with no practical running
  if (!active) {
    if (!available) return null;
    return (
      <div className="absolute top-20 [@media(max-height:500px)]:top-16 left-4 z-40 w-[min(92vw,340px)] [@media(max-height:500px)]:w-[260px] [@media(max-height:500px)]:p-3 max-h-[calc(100dvh-12rem)] [@media(max-height:500px)]:max-h-[calc(100dvh-9.5rem)] overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-2xl p-4 text-slate-100 shadow-2xl">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wide mb-1">
          <ClipboardList className="w-4 h-4" /> Practical
        </div>
        <h3 className="text-base font-semibold mb-1">{available.title}</h3>
        <p className="text-sm text-slate-300 mb-3 [@media(max-height:500px)]:text-xs [@media(max-height:500px)]:line-clamp-3">{available.objective}</p>
        <ul className="text-xs text-rose-300 mb-3 space-y-0.5 [@media(max-height:500px)]:hidden">
          {available.safety.map((s) => <li key={s}>⚠ {s}</li>)}
        </ul>
        <button
          onClick={() => { soundFx.playClick(); experiments.start(available.id); }}
          className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-medium"
        >
          Start with Dr. Curie
        </button>
      </div>
    );
  }

  const run_ = run!;
  const record = () => {
    const err = experiments.record();
    setError(err);
    if (!err) soundFx.playSuccessChime();
  };
  const addDrop = () => {
    const c = labStore.get().chemistry;
    if (c.buretteML < 0.05) return;
    const dispensedML = Math.round((c.dispensedML + 0.05) * 100) / 100;
    labStore.update('chemistry', { dispensedML, buretteML: c.buretteML - 0.05, phValue: titrationPH(dispensedML, c.flaskAcidML) });
    window.dispatchEvent(new CustomEvent('labbridge:drop'));
    soundFx.playDropLiquid();
  };

  return (
    <div className="absolute top-20 [@media(max-height:500px)]:top-16 left-4 z-40 w-[min(92vw,340px)] [@media(max-height:500px)]:w-[260px] [@media(max-height:500px)]:p-3 max-h-[calc(100dvh-12rem)] [@media(max-height:500px)]:max-h-[calc(100dvh-9.5rem)] overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-2xl p-4 text-slate-100 shadow-2xl">
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-semibold flex-1">
          {active.title}
          <span className="ml-1 text-xs font-normal text-slate-400 tabular-nums">
            {run_.completedSteps.length}/{active.steps.length}
          </span>
        </h3>
        <button onClick={() => experiments.abandon()} title="Abandon practical" className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ol className="space-y-1.5 mb-3">
        {active.steps.map((s) => {
          const done = run_.completedSteps.includes(s.id);
          const current = !done && active.steps.find((x) => !run_.completedSteps.includes(x.id))?.id === s.id;
          return (
            <li key={s.id} className={`flex gap-2 text-sm ${done ? 'text-slate-500 line-through' : current ? 'text-white' : 'text-slate-400'} ${current ? '' : '[@media(max-height:500px)]:hidden'}`}>
              {done ? <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" /> : <Circle className={`w-4 h-4 shrink-0 mt-0.5 ${current ? 'text-teal-400' : ''}`} />}
              <span>{s.text}</span>
            </li>
          );
        })}
      </ol>
      {run_.readings.length > 0 && (
        <div className="text-xs text-slate-300 mb-3 tabular-nums">
          {run_.readings.map((r, i) => <p key={i}>{r.label}: {r.value} {r.unit}</p>)}
        </div>
      )}
      {active.readingsNeeded > 0 && (
        <div className="flex gap-2">
          {active.id === 'titration' && (
            <button onClick={addDrop} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">
              <Droplet className="w-4 h-4" /> 1 drop
            </button>
          )}
          <button onClick={record} className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-medium">
            {active.recordLabel}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-amber-300 mt-2">{error}</p>}
    </div>
  );
}
