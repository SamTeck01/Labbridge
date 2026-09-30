'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Send, Bot, User, BookOpen, Lightbulb } from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';
import { curie, useCurie } from '@/lib/curie';

interface AILabAssistantModalProps {
  initialPrompt?: string;
  initialContext?: string;
  onClose: () => void;
}

export default function AILabAssistantModal({ initialPrompt, onClose }: AILabAssistantModalProps) {
  const messages = useCurie((s) => s.messages);
  const isLoading = useCurie((s) => s.loading);
  const [inputValue, setInputValue] = useState<string>('');

  const sendMessage = (userText: string) => {
    if (!userText.trim()) return;
    soundFx.playClick();
    setInputValue('');
    curie.ask(userText);
  };

  // Ask the initial prompt once when opened with one
  const askedRef = React.useRef(false);
  React.useEffect(() => {
    if (initialPrompt && !askedRef.current) {
      askedRef.current = true;
      curie.ask(initialPrompt);
    }
  }, [initialPrompt]);

  const quickPrompts = [
    'How do I calculate total magnification on the microscope?',
    'What is the difference between plant and animal cells under a microscope?',
    'Why does the phenolphthalein indicator turn pink at equivalence?',
    "Explain Ohm's Law (V = IR) using the physics bench components.",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Dr. Curie &bull; AI Lab Assistant
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini Science Guide
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ask about specimens, cellular morphology, reactions, or physics principles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-900/50 text-xs">
          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={i}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                      : m.isError
                      ? 'bg-rose-950/80 text-rose-200 border border-rose-700/80 rounded-tl-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  <p>{m.content}</p>
                  <span className="block mt-1.5 text-[9px] text-slate-400 text-right font-mono">
                    {m.timestamp}
                  </span>
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-slate-400 text-xs italic">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/40 flex items-center justify-center text-indigo-300 shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <span>Dr. Curie is formulating experimental insights...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] text-slate-500 font-semibold shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-400" />
            Suggested:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(qp)}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] whitespace-nowrap border border-slate-700 transition-all shrink-0"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputValue);
          }}
          className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Dr. Curie about specimens, organelles, circuits, or reactions..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
