'use client';

import React, { useState } from 'react';
import { experiments, type ExperimentDef } from '@/lib/experiments';
import { useLab, INKS, osmosisChange } from '@/lib/labStore';
import { MOLARITY } from '@/lib/workbench/osmosisBench';
import { soundFx } from '@/lib/soundEffects';

/** Practical-specific parts of the panel: extra actions, data tables, measuring views, final answer. */
export default function PracticalExtras({ def, answered }: { def: ExperimentDef; answered: boolean }) {
  const lab = useLab((s) => s);
  const [text, setText] = useState('');
  const [showPaper, setShowPaper] = useState(false);
  const actions = def.panelActions?.(lab) ?? [];

  return (
    <div className="flex flex-col gap-2 mt-1">
      {actions.map((a) => (
        <button key={a.label} onClick={() => { soundFx.playClick(); a.run(); }} className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">
          {a.label}
        </button>
      ))}

      {def.id === 'osmosis' && lab.osmosis.tubes.some((t) => t.initial != null) && (
        <table className="text-xs tabular-nums w-full">
          <thead className="text-slate-400">
            <tr><th className="text-left font-normal">Sucrose</th><th className="font-normal">Start g</th><th className="font-normal">End g</th><th className="font-normal">% change</th></tr>
          </thead>
          <tbody>
            {lab.osmosis.tubes.map((t, i) => (
              <tr key={i}>
                <td>{MOLARITY[i].toFixed(1)} M</td>
                <td className="text-center">{t.initial?.toFixed(2) ?? '—'}</td>
                <td className="text-center">{t.final?.toFixed(2) ?? '—'}</td>
                <td className="text-center">{t.initial != null && t.final != null ? `${(((t.final - t.initial) / t.initial) * 100).toFixed(1)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {def.id === 'chroma' && lab.chroma.removed && (
        <button onClick={() => setShowPaper((v) => !v)} className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">
          {showPaper ? 'Hide' : 'Measure'} the chromatogram
        </button>
      )}
      {def.id === 'chroma' && showPaper && <Chromatogram front={lab.chroma.front} />}

      {def.answer && !answered && (lab.osmosis.tubes.every((t) => t.final != null) || def.id !== 'osmosis') && (def.id !== 'chroma' || lab.chroma.removed) && (
        <div className="flex gap-2 items-end">
          <label className="flex-1 text-xs text-slate-400">
            {def.answer.prompt}
            <input
              inputMode="decimal"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm tabular-nums text-slate-100"
            />
          </label>
          <button
            disabled={Number.isNaN(parseFloat(text))}
            onClick={() => {
              experiments.recordManual({ label: 'Answer', value: parseFloat(text), unit: def.answer!.unit });
              soundFx.playSuccessChime();
            }}
            className="px-3 py-2 rounded-lg bg-teal-600 disabled:opacity-40 text-sm font-semibold"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

/** The dried paper beside a millimetre ruler, so the student can measure distances for Rf. */
function Chromatogram({ front }: { front: number }) {
  const MM = 160; // paper height in mm
  const PX = 2.2;
  const y = (frac: number) => (MM - frac * MM) * PX;
  const BASE = 0.15;
  const run = front - BASE;
  return (
    <svg width={190} height={MM * PX + 10} className="self-center bg-white rounded">
      <rect x={60} y={0} width={90} height={MM * PX} fill="#f8f8f2" stroke="#bbb" />
      <line x1={60} x2={150} y1={y(front)} y2={y(front)} stroke="#7fa0b8" strokeDasharray="4 3" />
      <line x1={64} x2={146} y1={y(BASE)} y2={y(BASE)} stroke="#555" />
      {INKS.map((ink, i) =>
        ink.dyes.map((d) => <circle key={i + d.colour} cx={72 + i * 32} cy={y(BASE + d.rf * run)} r={5} fill={d.colour} opacity={0.85} />)
      )}
      {INKS.map((ink, i) => (
        <text key={ink.name} x={72 + i * 32} y={MM * PX + 8} fontSize={8} textAnchor="middle" fill="#333">{ink.name.replace('Unknown', '?')}</text>
      ))}
      {/* ruler: 0 mm at the baseline, reading up */}
      {Array.from({ length: Math.floor((MM * (1 - BASE)) / 1) + 1 }, (_, mm) => {
        const yy = y(BASE) - mm * PX;
        return <line key={mm} x1={mm % 10 === 0 ? 30 : mm % 5 === 0 ? 38 : 44} x2={52} y1={yy} y2={yy} stroke="#222" strokeWidth={mm % 10 === 0 ? 1.2 : 0.6} />;
      })}
      {Array.from({ length: 14 }, (_, k) => (
        <text key={k} x={26} y={y(BASE) - k * 10 * PX + 3} fontSize={8} textAnchor="end" fill="#222">{k * 10}</text>
      ))}
      <text x={4} y={8} fontSize={7} fill="#555">mm</text>
    </svg>
  );
}
