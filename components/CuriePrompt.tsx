'use client';

import React from 'react';
import { FlaskConical, MessageCircle } from 'lucide-react';

/**
 * Shown when the student walks up to Dr. Curie: who she is and the two things you can do with her.
 * Sits low and centred so it never covers her or the room.
 */
export default function CuriePrompt({ isTouch, onChoose, onAsk }: { isTouch: boolean; onChoose: () => void; onAsk: () => void }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[55] w-[min(92vw,380px)] animate-[fadeUp_180ms_ease-out]" role="dialog" aria-label="Dr. Curie">
      <div className="rounded-2xl bg-[#0e1525]/95 border border-white/10 p-3 text-slate-100 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-3 px-1 pb-3 [@media(max-height:500px)]:hidden">
          <span className="w-9 h-9 rounded-full bg-teal-500/15 border border-teal-400/40 grid place-items-center text-teal-200 text-sm font-semibold" aria-hidden>
            C
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Dr. Curie</p>
            <p className="text-xs text-slate-400 leading-tight">Lab manager · “What would you like to practise?”</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onChoose} autoFocus className="flex-1 min-h-11 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2">
            <FlaskConical className="w-4 h-4" /> Choose a practical
            {!isTouch && <kbd className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/20">E</kbd>}
          </button>
          <button onClick={onAsk} className="min-h-11 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-sm flex items-center gap-1.5" aria-label="Ask Dr. Curie a question">
            <MessageCircle className="w-4 h-4" /> Ask
          </button>
        </div>
      </div>
    </div>
  );
}
