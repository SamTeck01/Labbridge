'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Volume2, VolumeX } from 'lucide-react';
import { curie, useCurie } from '@/lib/curie';
import { useFreeCursor } from '@/lib/useFreeCursor';
import { useExperiments } from '@/lib/experiments';

/**
 * The one place to talk to Dr. Curie: her messages, quick questions, a text box and the voice toggle.
 * A side panel on laptops, a bottom sheet on phones. It never covers the practical panel on the left.
 */
export default function CurieDrawer({ onClose }: { onClose: () => void }) {
  useFreeCursor();
  const messages = useCurie((s) => s.messages);
  const loading = useCurie((s) => s.loading);
  const voiceOn = useCurie((s) => s.voiceOn);
  const inPractical = useExperiments((s) => !!s.run);
  const [text, setText] = useState('');
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const ask = (q: string) => {
    if (!q.trim() || loading) return;
    void curie.ask(q);
    setText('');
  };
  const quick = inPractical ? ['What do I do next?', 'Why do we do this?', 'Show me how'] : ['Which practical should I start with?', 'How do I use the lab?'];

  return (
    <aside
      role="dialog"
      aria-label="Talk to Dr. Curie"
      className="fixed z-[65] right-0 bottom-0 sm:top-3 sm:bottom-3 sm:right-3 w-full sm:w-[380px] h-[70dvh] sm:h-auto bg-[#0e1525] text-slate-100 border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <span className="w-8 h-8 rounded-full bg-teal-500/15 border border-teal-400/40 grid place-items-center text-teal-200 text-sm font-semibold" aria-hidden>C</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Dr. Curie</p>
          <p className="text-[11px] text-slate-400 leading-tight">{loading ? 'Thinking…' : 'Lab manager'}</p>
        </div>
        <button onClick={() => curie.setVoice(!voiceOn)} className="p-2 rounded-lg text-slate-300 hover:bg-white/5" aria-label={voiceOn ? 'Mute her voice' : 'Turn her voice on'} title={voiceOn ? 'Voice on' : 'Voice off'}>
          {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button onClick={onClose} className="p-2 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div ref={list} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" aria-live="polite">
        {messages.slice(-40).map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <p
              className={`max-w-[88%] text-sm leading-relaxed whitespace-pre-wrap px-3 py-2 rounded-2xl ${
                m.role === 'user' ? 'bg-teal-500 text-slate-950 rounded-br-md' : m.isError ? 'bg-rose-500/10 text-rose-200' : 'bg-white/[0.06] rounded-bl-md'
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}
      </div>

      <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 border-t border-white/10">
        <div className="flex flex-wrap gap-1.5 pb-2">
          {quick.map((q) => (
            <button key={q} onClick={() => ask(q)} disabled={loading} className="shrink-0 text-xs px-3 min-h-9 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40">
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask Dr. Curie…"
            maxLength={500}
            className="flex-1 min-w-0 min-h-11 rounded-xl bg-white/[0.06] border border-white/10 px-3 text-base sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-teal-400/60"
          />
          <button type="submit" disabled={!text.trim() || loading} className="min-h-11 w-11 rounded-xl bg-teal-500 text-slate-950 grid place-items-center disabled:opacity-40" aria-label="Send">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
