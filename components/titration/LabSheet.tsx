'use client';

import React from 'react';
import { titration, useTitration, sheetTitres, sheetMean, SHEET_COLS } from '@/lib/titration/sim';
import { soundFx } from '@/lib/soundEffects';

/**
 * The clipboard on the bench: a real titration results table. The student writes every burette
 * reading themselves; this sheet is what gets marked.
 */
export default function LabSheet({ onClose }: { onClose: () => void }) {
  const sheet = useTitration((s) => s.sheet);
  const titres = sheetTitres(titration.get());
  const mean = sheetMean(titration.get());
  const anyTitre = titres.some((t) => t !== null);

  const cell = (row: 'initial' | 'final', i: number) => (
    <td key={row + i} className="p-1.5 border-b border-[#d9d3c3] text-center">
      <label className="sr-only" htmlFor={`sheet-${row}-${i}`}>{`${row} reading, ${SHEET_COLS[i]} run`}</label>
      <input
        id={`sheet-${row}-${i}`}
        inputMode="decimal"
        value={sheet[row][i].value}
        disabled={sheet.handedIn}
        onChange={(e) => titration.writeCell(row, i, e.target.value)}
        className="w-[4.6rem] px-1.5 py-1 rounded-md border border-[#c8c3b4] bg-white text-center text-lg text-[#1f3f8a] tabular-nums font-[cursive] focus:outline-none focus:border-amber-500"
        placeholder="—"
      />
    </td>
  );

  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-slate-950/50 p-3" onClick={onClose}>
      <div className="w-full max-w-[640px] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-xl bg-[#6b4f33] p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative rounded-md bg-[#fbf8ef] px-4 sm:px-6 pt-7 pb-5 text-[#1d2023]">
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-28 h-6 rounded-md bg-[#b9bec4]" aria-hidden />
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="text-lg sm:text-xl font-semibold font-serif">Titration: NaOH against 25.00 cm³ of 0.100 M HCl</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-1.5 border-b-2 border-[#1d2023]">Burette reading / cm³</th>
                  {SHEET_COLS.map((c) => <th key={c} className="p-1.5 border-b-2 border-[#1d2023]">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-1.5 border-b border-[#d9d3c3]">Final</td>{SHEET_COLS.map((_, i) => cell('final', i))}</tr>
                <tr><td className="p-1.5 border-b border-[#d9d3c3]">Initial</td>{SHEET_COLS.map((_, i) => cell('initial', i))}</tr>
                <tr>
                  <td className="p-1.5 border-b-2 border-[#1d2023] font-semibold">Titre</td>
                  {titres.map((t, i) => (
                    <td key={i} className="p-1.5 border-b-2 border-[#1d2023] text-center text-lg text-[#1f3f8a] tabular-nums">{t === null ? '' : t.toFixed(2)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-1.5 text-xs text-[#555c63]">Use in mean</td>
                  {SHEET_COLS.map((c, i) => (
                    <td key={c} className="p-1.5 text-center">
                      {i > 0 && (
                        <label className="inline-flex items-center justify-center w-11 h-11 cursor-pointer">
                          <span className="sr-only">Use run {c} in the mean</span>
                          <input type="checkbox" className="w-5 h-5 accent-[#1f3f8a]" disabled={sheet.handedIn || titres[i] === null} checked={sheet.ticked[i]} onChange={(e) => titration.tick(i, e.target.checked)} />
                        </label>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-[#3c4248]">
            <span>Concordant = within 0.10 cm³. Don’t use the rough titre.</span>
            <span className="ml-auto">Mean titre: <b className="text-lg text-[#1f3f8a] tabular-nums">{mean === null ? '____' : mean.toFixed(2)}</b> cm³</span>
          </div>
          <p className="mt-3 rounded-lg bg-[#f1ead6] px-3 py-2 text-xs leading-relaxed">
            Read at eye level, the bottom of the meniscus, to 2 decimal places ending in 0 or 5 (e.g. 23.45). These numbers are what you are marked on.
          </p>
          <div className="flex gap-2 mt-4">
            <button onClick={onClose} className="h-11 px-4 rounded-lg bg-[#1d2023] text-[#fbf8ef] text-sm font-semibold">Put the sheet down</button>
            <button
              disabled={!anyTitre || sheet.handedIn}
              onClick={() => {
                soundFx.playSuccessChime();
                titration.handIn();
                onClose();
              }}
              className="h-11 px-4 rounded-lg border border-[#1d2023] text-sm font-semibold disabled:opacity-40"
            >
              {sheet.handedIn ? 'Handed in' : 'Hand in to Dr. Curie'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
