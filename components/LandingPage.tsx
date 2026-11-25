'use client';

import React from 'react';
import { ArrowRight, Download } from 'lucide-react';
import type { Station } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';
import { useInstall, enterImmersive } from '@/lib/pwa';
import ProgressModal from '@/components/ProgressModal';
import { EXPERIMENTS } from '@/lib/experiments';
import { PRACTICAL_META, SUBJECT_ORDER } from '@/lib/practicalMeta';

interface LandingPageProps {
  onEnterLab: (initialStation?: Station) => void;
  onDirectOpenMicroscope: () => void;
}

const serif = { fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif' };

const STEPS = [
  { n: '1', title: 'Walk up to Dr. Curie', body: 'She runs the lab. Tell her what you want to practise and she walks you to the bench.' },
  { n: '2', title: 'Do it with your own hands', body: 'Fill the burette, focus the microscope, wire the circuit. Make mistakes and see what they do to your result.' },
  { n: '3', title: 'Get marked like the exam', body: 'Your readings, your technique and your safety are scored. She tells you exactly what to do better next time.' },
];

export default function LandingPage({ onEnterLab }: LandingPageProps) {
  const { mode: installMode, install } = useInstall();
  const [showIosHelp, setShowIosHelp] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);

  const start = (station?: Station) => {
    soundFx.playSuccessChime();
    enterImmersive(); // phones: fullscreen + landscape, like a game (no-op on desktop)
    onEnterLab(station);
  };

  return (
    <div className="min-h-screen bg-[#f6f4ee] text-[#17181b]">
      {showProgress && <ProgressModal onClose={() => setShowProgress(false)} />}
      {showIosHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowIosHelp(false)}>
          <div className="max-w-sm bg-white rounded-2xl p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900 mb-2">Install LabBridge on your iPhone</p>
            <p>In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>. It opens full screen like an app.</p>
          </div>
        </div>
      )}

      <header className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight" style={serif}>LabBridge</span>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <button onClick={() => setShowProgress(true)} className="px-3 min-h-10 rounded-lg hover:bg-black/5">My progress</button>
          {installMode && (
            <button onClick={() => (installMode === 'prompt' ? install() : setShowIosHelp(true))} className="hidden sm:flex items-center gap-1.5 px-3 min-h-10 rounded-lg hover:bg-black/5">
              <Download className="w-4 h-4" /> Install
            </button>
          )}
          <button onClick={() => start()} className="px-4 min-h-10 rounded-lg bg-[#0f5f59] text-white font-medium hover:bg-[#0c4f4a]">Enter the lab</button>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-14 grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-sm font-medium text-[#0f5f59]">For students who don’t have a science lab</p>
            <h1 className="mt-3 text-[2.4rem] sm:text-5xl leading-[1.08] tracking-tight" style={serif}>
              Practise your science practicals before you touch the glassware.
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-[#45474d] max-w-xl">
              Titration, microscopy, flame tests, Ohm’s law and five more, in a 3D lab that runs in your browser. Dr. Curie, the lab manager, shows you what to do, explains why, and marks your work the way an examiner would.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button onClick={() => start()} className="group inline-flex items-center gap-2 px-5 min-h-12 rounded-xl bg-[#0f5f59] text-white text-[15px] font-medium hover:bg-[#0c4f4a]">
                Enter the lab <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a href="#practicals" className="px-4 min-h-12 inline-flex items-center rounded-xl text-[15px] hover:bg-black/5">See the practicals</a>
            </div>
            <p className="mt-4 text-[13px] text-[#6b6d73]">Free. No sign-up. Works on a laptop or a phone.</p>
          </div>
          <figure className="relative">
            <div className="rounded-2xl overflow-hidden border border-black/10 bg-[#dcd9d0] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)] aspect-[16/10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/lab.jpg" alt="The titration bench in LabBridge: burette, conical flask on a stirrer, the NaOH bottle and the student's gloved hands" className="w-full h-full object-cover" loading="eager" />
            </div>
            <figcaption className="mt-3 text-[13px] text-[#6b6d73]">The titration bench. Every reading comes from the apparatus, not a number on a screen.</figcaption>
          </figure>
        </section>

        {/* How it works */}
        <section className="border-y border-black/10 bg-white/50">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n}>
                <span className="text-sm text-[#0f5f59] font-medium" style={serif}>Step {s.n}</span>
                <h2 className="mt-1 text-lg font-semibold">{s.title}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#45474d]">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Practicals */}
        <section id="practicals" className="max-w-6xl mx-auto px-5 sm:px-8 py-14">
          <h2 className="text-3xl tracking-tight" style={serif}>Nine practicals, three subjects</h2>
          <p className="mt-2 text-[15px] text-[#45474d]">The ones that come up in school practical exams. Pick one to go straight to its bench.</p>
          <div className="mt-8 grid md:grid-cols-3 gap-x-10 gap-y-8">
            {SUBJECT_ORDER.map((subject) => (
              <div key={subject}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b6d73] pb-2 border-b border-black/10">{subject}</h3>
                <ul>
                  {EXPERIMENTS.filter((e) => PRACTICAL_META[e.id]?.subject === subject).map((e) => (
                    <li key={e.id}>
                      <button onClick={() => start(e.station)} className="group w-full text-left py-3 border-b border-black/10 flex items-start gap-3">
                        <span className="flex-1">
                          <span className="block text-[15px] font-medium group-hover:text-[#0f5f59]">{e.title}</span>
                          <span className="block text-[13px] text-[#6b6d73] mt-0.5">{PRACTICAL_META[e.id].learn}</span>
                        </span>
                        <span className="text-[12px] text-[#6b6d73] whitespace-nowrap pt-0.5">{PRACTICAL_META[e.id].minutes} min</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-5 sm:px-8 py-8 border-t border-black/10 text-[13px] text-[#6b6d73] flex flex-wrap gap-2 justify-between">
        <span>LabBridge · a science lab for every student</span>
        <button onClick={() => start()} className="hover:text-[#17181b]">Enter the lab →</button>
      </footer>
    </div>
  );
}
