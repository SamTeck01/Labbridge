'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { useLab } from '@/lib/labStore';
import { useExperiments } from '@/lib/experiments';

const KEY = 'labbridge.orientation.v1';

/**
 * First visit: a short orientation the student completes by doing, not by reading. Each task ticks
 * itself off when the student actually does it (looks around, opens the practical list, sits at a
 * bench with goggles on, starts a practical). It never blocks the lab and can be skipped.
 */
export default function LabOrientation({ isTouch, libraryOpened, onOpenLibrary }: { isTouch: boolean; libraryOpened: boolean; onOpenLibrary: () => void }) {
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(KEY);
    } catch {
      return true;
    }
  });
  const [metCurie, setMetCurie] = useState(false);
  const [looked, setLooked] = useState(false);
  const seatedWithGoggles = useLab((s) => s.player.seated && !!s.player.station && s.player.goggles);
  const started = useExperiments((s) => !!s.run || s.history.length > 0);
  const [shortScreen] = useState(() => typeof window !== 'undefined' && window.innerHeight <= 500);

  // "Look around": the mouse is captured for looking (desktop) or the student drags the view (touch)
  useEffect(() => {
    if (!show || looked) return;
    let moves = 0;
    const onLock = () => document.pointerLockElement && setLooked(true);
    const onTouch = () => ++moves > 8 && setLooked(true);
    document.addEventListener('pointerlockchange', onLock);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      document.removeEventListener('pointerlockchange', onLock);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [show, looked]);

  if (!show || (started && shortScreen)) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* shows again next visit */
    }
    setShow(false);
  };

  const tasks: { done: boolean; title: string; body: React.ReactNode }[] = [
    {
      done: metCurie,
      title: 'Meet Dr. Curie',
      body: (
        <>
          She runs this lab. She shows you what to do, explains <i>why</i>, and steps in if something goes wrong or unsafe.{' '}
          <button onClick={() => setMetCurie(true)} className="underline text-teal-300">Hello, Dr. Curie</button>
        </>
      ),
    },
    {
      done: looked,
      title: 'Look around',
      body: isTouch ? 'Drag on the screen to look around. Use the joystick to walk.' : 'Click the lab, then move the mouse to look. W A S D to walk. Esc gives you the mouse back.',
    },
    {
      done: libraryOpened,
      title: 'Choose a practical',
      body: (
        <>
          Every practical is in one list. New here? Start with the microscope.{' '}
          <button onClick={onOpenLibrary} className="underline text-teal-300">Open the practical list</button>
        </>
      ),
    },
    {
      done: seatedWithGoggles,
      title: 'Go to the bench, goggles on',
      body: 'At the bench, put on your safety goggles. In a real lab you never start without them.',
    },
    {
      done: started,
      title: 'Start the practical',
      body: `${isTouch ? 'Tap' : 'Click'} the equipment to use it: your hands do the action, and the result follows real science. Mistakes are allowed. Dr. Curie explains what each one did, and “Restart practical” is always there.`,
    },
  ];
  // Doing a later task means the earlier ones are behind you too
  for (let i = tasks.length - 2; i >= 0; i--) if (tasks[i + 1].done) tasks[i].done = true;
  const current = tasks.findIndex((t) => !t.done);
  const allDone = current < 0;

  return (
    <div
      className={`absolute z-[45] left-1/2 -translate-x-1/2 w-[min(92vw,360px)] ${isTouch ? 'top-16' : 'bottom-4'} [@media(max-height:500px)]:top-auto [@media(max-height:500px)]:bottom-2 [@media(max-height:500px)]:w-[min(46vw,320px)] [@media(max-height:500px)]:p-2 bg-slate-900/95 border border-slate-700 rounded-2xl p-3 text-slate-100 shadow-2xl`}
      role="region"
      aria-label="Lab orientation"
    >
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold text-teal-400 flex-1">Your first visit · {tasks.filter((t) => t.done).length}/{tasks.length}</p>
        <button onClick={close} className="p-1 -m-1 text-slate-400 hover:text-white text-xs flex items-center gap-1" aria-label="Skip orientation">
          Skip <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {allDone ? (
        <div className="text-sm">
          <p className="mb-2">You know how the lab works. Every practical follows the same pattern: aim, apparatus and safety, then the steps, your results, and feedback.</p>
          <button onClick={close} className="w-full min-h-10 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-semibold">Got it</button>
        </div>
      ) : (
        <ol className="space-y-1">
          {tasks.map((t, i) => (
            <li key={t.title} className={`flex gap-2 text-sm [@media(max-height:500px)]:text-xs ${i === current ? 'text-white' : 'text-slate-500 [@media(max-height:500px)]:hidden'}`}>
              {t.done ? <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" /> : <Circle className={`w-4 h-4 shrink-0 mt-0.5 ${i === current ? 'text-teal-400' : ''}`} />}
              <div>
                <span className={t.done ? 'line-through' : ''}>{t.title}</span>
                {i === current && <p className="text-xs text-slate-300 mt-0.5 leading-relaxed [@media(max-height:500px)]:line-clamp-3">{t.body}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
