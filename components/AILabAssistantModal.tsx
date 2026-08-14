'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Send, Bot, User, BookOpen, Lightbulb } from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AILabAssistantModalProps {
  initialPrompt?: string;
  initialContext?: string;
  onClose: () => void;
}

export default function AILabAssistantModal({
  initialPrompt,
  initialContext,
  onClose,
}: AILabAssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const initial: Message[] = [];
    if (initialPrompt) {
      initial.push({
        role: 'user',
        content: initialPrompt,
        timestamp: new Date().toLocaleTimeString(),
      });
    } else {
      initial.push({
        role: 'assistant',
        content: 'Greetings! I am Dr. Curie, your LabBridge Science Assistant. What practical question or specimen would you like to explore today?',
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    return initial;
  });
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(() => !!initialPrompt);

  const sendMessage = async (userText: string, context?: string) => {
    if (!userText.trim()) return;

    soundFx.playClick();
    const newMsg: Message = {
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          context: context || 'General Laboratory Exploration',
        }),
      });
      const data = await res.json();
      const assistantReply: Message = {
        role: 'assistant',
        content: data.text || 'Observation logged.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantReply]);
      soundFx.playSuccessChime();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to reach the lab assistant server. Please check your connection.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Perform initial fetch if initialPrompt was provided
  React.useEffect(() => {
    if (!initialPrompt) return;
    let isCancelled = false;

    fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: initialPrompt,
        context: initialContext || 'General Laboratory Exploration',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.text || 'Observation logged.',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        setIsLoading(false);
        soundFx.playSuccessChime();
      })
      .catch(() => {
        if (isCancelled) return;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Unable to reach the lab assistant server. Please check your connection.',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [initialPrompt, initialContext]);

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
