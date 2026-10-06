'use client';

import React from 'react';

/**
 * The actions you can take right now, right under the crosshair: a key and a verb, like the
 * "[E] Open" prompts in first-person games. One place to look, never more than four lines.
 */
export type Prompt = { k: string; v: string };

export function Key({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[26px] h-[22px] px-1.5 rounded-md bg-slate-100 text-slate-900 text-[11px] font-bold shadow-[0_2px_0_#64748b] font-sans whitespace-nowrap">
      {k}
    </kbd>
  );
}

export default function ActionPrompts({ title, prompts }: { title?: string; prompts: Prompt[] }) {
  if (!prompts.length) return null;
  return (
    <div className="bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl px-3 py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150">
      {title && <p className="text-[11px] font-semibold text-amber-300 mb-1.5 whitespace-nowrap">{title}</p>}
      <ul className="flex flex-col gap-1.5">
        {prompts.slice(0, 4).map((p) => (
          <li key={p.k + p.v} className="flex items-center gap-2 text-xs text-slate-100 whitespace-nowrap">
            <Key k={p.k} />
            <span>{p.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
