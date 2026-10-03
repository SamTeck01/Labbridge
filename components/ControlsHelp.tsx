'use client';

import React from 'react';

/** The laptop controls on one card (H), like the controls screen of any sim. */
const ROWS: [string, string][] = [
  ['Mouse', 'Look around · the dot is what you aim at'],
  ['Click', 'Pick up · use · put down where you aim'],
  ['Hold click + move', 'Turn a knob or tap you are holding'],
  ['Scroll', 'Lift / lower what you hold · turn a knob · eye height when reading'],
  ['R (hold)', 'Pour: the longer you hold, the more it tilts. Let go and it rights itself. Right-drag works too'],
  ['E', 'Use (squeeze the dropper, or what a click would do)'],
  ['Q', 'Put down / let go'],
  ['W', 'Swirl the flask (left hand)'],
  ['↑ ↓', 'Keep turning a tap · pipette filler up / down'],
  ['Shift', 'Fine control'],
  ['Space', 'Look closer (read the burette, the eyepieces)'],
  ['S', 'Lab sheet'],
  ['X', 'Step back from the bench'],
  ['Esc', 'Free the mouse pointer'],
];

export default function ControlsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[58] flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 text-slate-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Controls</h2>
          <button onClick={onClose} className="text-xs px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700">Close (H)</button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {ROWS.map(([k, v]) => (
              <tr key={k} className="border-t border-slate-800">
                <td className="py-1.5 pr-3 whitespace-nowrap"><kbd className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-600 text-xs font-semibold">{k}</kbd></td>
                <td className="py-1.5 text-slate-300">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">The amber marker always shows the next thing to use. Things you can use glow when you aim at them.</p>
      </div>
    </div>
  );
}
