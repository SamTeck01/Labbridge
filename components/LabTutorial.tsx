'use client';

import React, { useState } from 'react';

const KEY = 'labbridge.tutorial.v1';

/** Three short cards on the first visit: moving, working at a bench, Dr. Curie. Shown once. */
export default function LabTutorial({ isTouch }: { isTouch: boolean }) {
  const [step, setStep] = useState<number>(() => {
    try {
      return localStorage.getItem(KEY) ? -1 : 0;
    } catch {
      return 0;
    }
  });
  if (step < 0) return null;

  const cards = [
    {
      title: 'Moving around',
      body: isTouch
        ? 'Use the joystick (bottom left) to walk. Drag anywhere on the screen to look around.'
        : 'W A S D to walk. Click the lab to look around with the mouse; press Esc to get the pointer back.',
    },
    {
      title: 'Working at a bench',
      body: isTouch
        ? 'Tap any equipment to walk up to its bench. Then tap things to use them: your hands pick up, pour and turn knobs for you. Drag to look around.'
        : 'Click any equipment to walk up to its bench. Then click things to use them: your hands pick up, pour and turn knobs. Drag to look around.',
    },
    {
      title: 'Dr. Curie, your lab manager',
      body: 'Start a practical at any bench and Dr. Curie will guide you step by step, catch mistakes, and score your work. Your progress is saved.',
    },
  ];
  const close = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* shows again next time */
    }
    setStep(-1);
  };
  const c = cards[step];

  return (
    <div className="absolute inset-0 z-[55] bg-slate-950/60 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 text-slate-100 shadow-2xl">
        <p className="text-xs text-teal-400 font-semibold mb-1">
          Welcome to the lab · {step + 1}/{cards.length}
        </p>
        <h2 className="text-lg font-semibold mb-2">{c.title}</h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-4">{c.body}</p>
        <div className="flex gap-2">
          <button onClick={close} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">
            Skip
          </button>
          <button
            onClick={() => (step === cards.length - 1 ? close() : setStep(step + 1))}
            className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-semibold"
          >
            {step === cards.length - 1 ? "Let's start" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
