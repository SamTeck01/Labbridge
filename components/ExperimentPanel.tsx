'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, ClipboardList, FlaskConical, X, Trophy, Droplet, RotateCcw, Repeat, Flag, Info } from 'lucide-react';
import { experiments, experimentForStation, getExperiment, useExperiments, assistLevel } from '@/lib/experiments';
import { labStore, titrationPH, useLab, circuit, type Station } from '@/lib/labStore';
import { curie } from '@/lib/curie';
import BuretteReading from '@/components/BuretteReading';
import MeterReading from '@/components/MeterReading';
import LengthReading from '@/components/LengthReading';
import PracticalExtras from '@/components/PracticalExtras';
import { soundFx } from '@/lib/soundEffects';
import { metaFor, MISTAKE_KIND, SKILL_LABEL } from '@/lib/practicalMeta';

/** Practical brief, live procedure checklist, readings and results for the bench the student is at. */
/** compact: at a workbench only the current step is shown, keeping the apparatus clear. */
const STATION_NAME: Record<Station, string> = {
  biology: 'microscope bench',
  chemistry: 'titration bench',
  physics: 'circuits bench',
  research: 'analytical bench',
  hood: 'fume hood',
  pendulum: 'pendulum bench',
  rates: 'reaction rates bench',
  osmosis: 'osmosis bench',
  chroma: 'chromatography bench',
};

export default function ExperimentPanel({
  station,
  compact = false,
  onGoTo,
}: {
  station: Station | null;
  compact?: boolean;
  /** Take the student to a bench (used by the "Continue" pill when a practical is running elsewhere). */
  onGoTo?: (station: Station) => void;
}) {
  const run = useExperiments((s) => s.run);
  const lastResult = useExperiments((s) => s.lastResult);
  const [error, setError] = useState<string | null>(null);
  const goggles = useLab((st) => st.player.goggles);
  const [reading, setReading] = useState<{ actual: number; which: 'initial' | 'final' } | null>(null);
  const [meters, setMeters] = useState<{ amps: number; volts: number } | null>(null);
  const [measureL, setMeasureL] = useState<number | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const history = useExperiments((s) => s.history);
  const openMeters = () => {
    const p = labStore.get().physics;
    if (!p.wired) return setError('The circuit is incomplete: plug in the return lead.');
    if (!p.switchClosed) return setError('Close the switch first: no current is flowing.');
    const c = circuit(p.voltage, p.resistance, p.switchClosed, p.wired);
    setError(null);
    setMeters({ amps: c.current, volts: c.vResistor });
  };
  // Clicking a meter on the bench opens the close-up
  useEffect(() => {
    const on = () => {
      if (experiments.get().run?.experimentId === 'ohms-law') openMeters();
    };
    window.addEventListener('labbridge:readMeters', on);
    return () => window.removeEventListener('labbridge:readMeters', on);
  });
  const active = getExperiment(run?.experimentId);
  const available = experimentForStation(station);
  const meta = metaFor(active?.id ?? available?.id);
  const scores = history.filter((h) => h.experimentId === (active?.id ?? available?.id)).map((h) => h.score);
  const best = scores.length ? Math.max(...scores) : null;

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
          {lastResult.mistakes.length > 0 && (
            <div className="text-sm mb-4">
              <p className="font-medium mb-1">What to do differently</p>
              <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                {lastResult.mistakes.map((m) => <li key={m}>{m}</li>)}
              </ul>
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
      <div className={`absolute top-20 [@media(max-height:500px)]:top-16 left-4 z-40 ${compact ? 'w-[min(80vw,280px)] p-3' : 'w-[min(92vw,340px)]'} [@media(max-height:500px)]:w-[260px] [@media(max-height:500px)]:p-3 max-h-[calc(100dvh-12rem)] [@media(max-height:500px)]:max-h-[calc(100dvh-9.5rem)] overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-2xl p-4 text-slate-100 shadow-2xl`}>
        <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wide mb-1">
          <ClipboardList className="w-4 h-4" /> Practical
        </div>
        <h3 className="text-base font-semibold mb-1">{available.title}</h3>
        {meta && (
          <p className="text-[11px] text-slate-400 mb-2">
            {meta.subject} · {meta.difficulty} · about {meta.minutes} min{best !== null ? ` · best ${best}/100` : ''}
          </p>
        )}
        <p className="text-sm text-slate-300 mb-2 [@media(max-height:500px)]:text-xs [@media(max-height:500px)]:line-clamp-3">{meta?.learn ?? available.objective}</p>
        {meta && (
          <details className="mb-3 text-xs text-slate-300 [@media(max-height:500px)]:hidden">
            <summary className="cursor-pointer text-slate-400 hover:text-slate-200">Aim, apparatus and skills</summary>
            <p className="mt-2"><span className="text-slate-400">Aim: </span>{available.objective}</p>
            <p className="mt-1.5 text-slate-400">Apparatus</p>
            <ul className="list-disc pl-4">{meta.apparatus.map((a) => <li key={a}>{a}</li>)}</ul>
            <p className="mt-1.5 text-slate-400">Exam skills you practise</p>
            <div className="flex flex-wrap gap-1 mt-1">{meta.skills.map((k) => <span key={k} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">{SKILL_LABEL[k]}</span>)}</div>
          </details>
        )}
        <ul className="text-xs text-rose-300 mb-3 space-y-0.5 [@media(max-height:500px)]:hidden">
          {available.safety.map((s) => <li key={s}>⚠ {s}</li>)}
        </ul>
        {goggles ? (
          <button
            onClick={() => { soundFx.playClick(); experiments.start(available.id); }}
            className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-medium"
          >
            Start with Dr. Curie
          </button>
        ) : (
          <button
            onClick={() => {
              soundFx.playClick();
              labStore.update('player', { goggles: true });
              curie.say('Goggles on. Good: eyes are the one thing you can’t replace. Now start the practical.');
            }}
            className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold"
          >
            🥽 Put on safety goggles first
          </button>
        )}
      </div>
    );
  }

  // Practical in progress but the student is somewhere else: a small pill, not a checklist over the view
  if (station !== active.station) {
    const next = active.steps.find((st) => !run!.completedSteps.includes(st.id));
    return (
      <div className="absolute top-20 [@media(max-height:500px)]:top-16 left-4 z-40 max-w-[min(80vw,300px)] flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded-full pl-3 pr-1.5 py-1.5 text-slate-100 shadow-xl">
        <FlaskConical className="w-4 h-4 text-teal-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{active.title}</p>
          <p className="text-[11px] text-slate-400 truncate">Next: {next?.text ?? 'finish up'}</p>
        </div>
        {onGoTo && (
          <button
            onClick={() => onGoTo(active.station)}
            className="shrink-0 px-2.5 py-1 rounded-full bg-teal-600 hover:bg-teal-500 text-xs font-medium"
            title={`Go to the ${STATION_NAME[active.station]}`}
          >
            Continue
          </button>
        )}
        <button onClick={() => { if (window.confirm('Stop this practical? Your readings so far will be lost.')) experiments.abandon(); }} title="Abandon practical" className="shrink-0 p-1 text-slate-400 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const run_ = run!;
  const currentId = active.steps.find((x) => !run_.completedSteps.includes(x.id))?.id;
  const currentWhy = currentId ? meta?.why[currentId] : undefined;
  const record = () => {
    // Titration: the student reads the burette scale themselves
    if (active.id === 'titration') {
      const c = labStore.get().chemistry;
      if (c.buretteOpen) return setError('Close the burette before reading it.');
      if (c.buretteML <= 0) return setError('The burette is empty: fill it first.');
      const which = experiments.burettePending();
      if (which === 'final' && c.dispensedML <= 0) return setError('Titrate first, then take the final reading.');
      setError(null);
      setReading({ actual: Math.round((50 - c.buretteML) * 100) / 100, which });
      return;
    }
    if (active.id === 'ohms-law') return openMeters();
    if (active.id === 'pendulum') {
      // Check the stopwatch first, then the student measures the length on the rule
      const r = active.record(labStore.get(), run_);
      if (typeof r === 'string') return setError(r);
      setError(null);
      setMeasureL(labStore.get().pendulum.length * 100);
      return;
    }
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
    <>
    {reading !== null && (
      <BuretteReading
        actual={reading.actual}
        title={reading.which === 'initial' ? 'Initial burette reading' : 'Final burette reading'}
        onCancel={() => setReading(null)}
        onSubmit={(v) => {
          experiments.recordBurette(v);
          setReading(null);
          soundFx.playSuccessChime();
        }}
      />
    )}
    {measureL !== null && (
      <LengthReading
        lengthCm={measureL}
        onCancel={() => setMeasureL(null)}
        onSubmit={(cm) => {
          const err = experiments.recordPendulum(cm);
          setMeasureL(null);
          setError(err);
          if (!err) soundFx.playSuccessChime();
        }}
      />
    )}
    {meters && (
      <MeterReading
        amps={meters.amps}
        volts={meters.volts}
        onCancel={() => setMeters(null)}
        onSubmit={(i, v) => {
          experiments.recordMeters(i, v);
          setMeters(null);
          soundFx.playSuccessChime();
        }}
      />
    )}
    <div className={`absolute top-20 [@media(max-height:500px)]:top-16 left-4 z-40 ${compact ? 'w-[min(80vw,280px)] p-3' : 'w-[min(92vw,340px)]'} [@media(max-height:500px)]:w-[260px] [@media(max-height:500px)]:p-3 max-h-[calc(100dvh-12rem)] [@media(max-height:500px)]:max-h-[calc(100dvh-9.5rem)] overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-2xl p-4 text-slate-100 shadow-2xl`}>
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-semibold flex-1">
          {active.title}
          <span className="ml-1 text-xs font-normal text-slate-400 tabular-nums">
            {run_.completedSteps.length}/{active.steps.length}
          </span>
          <span className="block text-[10px] font-normal text-teal-300/80 uppercase tracking-wide" title="Dr. Curie gives less help as you get better at this practical">
            {{ guided: 'Guided by Dr. Curie', supported: 'Hints only', independent: 'On your own' }[assistLevel(active.id)]}
          </span>
        </h3>
        <button onClick={() => { if (window.confirm('Stop this practical? Your readings so far will be lost.')) experiments.abandon(); }} title="Abandon practical" className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ol className="space-y-1.5 mb-3">
        {active.steps.map((s) => {
          const done = run_.completedSteps.includes(s.id);
          const current = !done && active.steps.find((x) => !run_.completedSteps.includes(x.id))?.id === s.id;
          return (
            <li key={s.id} className={`flex gap-2 text-sm ${done ? 'text-slate-500 line-through' : current ? 'text-white' : 'text-slate-400'} ${current ? '' : compact ? 'hidden' : '[@media(max-height:500px)]:hidden'}`}>
              {done ? <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" /> : <Circle className={`w-4 h-4 shrink-0 mt-0.5 ${current ? 'text-teal-400' : ''}`} />}
              <span>{s.text}</span>
            </li>
          );
        })}
      </ol>
      {currentWhy && (
        <p className="flex gap-1.5 text-xs text-sky-200/90 bg-sky-500/10 border border-sky-500/20 rounded-lg px-2 py-1.5 mb-3 [@media(max-height:500px)]:hidden">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span><span className="font-semibold">Why: </span>{currentWhy}</span>
        </p>
      )}
      {run_.mistakes.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {run_.mistakes.map((id) => {
            const m = meta?.mistakes[id];
            const msg = active.mistakes.find((x) => x.id === id)?.message ?? id;
            const kind = m ? MISTAKE_KIND[m.kind] : MISTAKE_KIND.procedure;
            return (
              <li key={id} className={`text-xs rounded-lg border px-2 py-1.5 ${kind.tone}`}>
                <span className="font-semibold">{kind.label}{m && !m.recoverable ? ' · spoils this run' : ''}: </span>
                <span className="text-slate-200">{m ? m.consequence : msg}</span>
                {m && <span className="block text-slate-300 mt-0.5">→ {m.fix}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {run_.readings.length > 0 && (
        <div className="text-xs text-slate-300 mb-3 tabular-nums">
          {run_.readings.map((r, i) => <p key={i}>{r.label}: {r.value} {r.unit}</p>)}
        </div>
      )}
      <PracticalExtras def={active} answered={run_.readings.some((x) => x.label === 'Answer')} readings={run_.readings} />
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
      {active.id === 'titration' && run_.readings.some((x) => x.label === 'Titre') && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => { soundFx.playClick(); experiments.newTitrationRun(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium">
            <Repeat className="w-3.5 h-3.5" /> New run
          </button>
          <button onClick={() => experiments.finishNow()} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium">
            <Flag className="w-3.5 h-3.5" /> Finish with these results
          </button>
        </div>
      )}
      <button
        onClick={() => {
          if (confirmRestart) {
            setConfirmRestart(false);
            setError(null);
            experiments.restart();
          } else setConfirmRestart(true);
        }}
        onBlur={() => setConfirmRestart(false)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
      >
        <RotateCcw className="w-3.5 h-3.5" /> {confirmRestart ? 'Tap again to restart from the beginning' : 'Restart practical'}
      </button>
    </div>
    </>
  );
}
