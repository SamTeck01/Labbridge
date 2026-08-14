'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Sparkles,
  Eye,
  Zap,
  FlaskConical,
  Scale,
  Layers,
  Award,
  CheckCircle2,
  BookOpen,
  Volume2
} from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';

interface LandingPageProps {
  onEnterLab: () => void;
  onDirectOpenMicroscope: () => void;
}

export default function LandingPage({ onEnterLab, onDirectOpenMicroscope }: LandingPageProps) {
  const handleStart = () => {
    soundFx.playSuccessChime();
    onEnterLab();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-emerald-400 text-lg">
              LB
            </div>
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">LabBridge</span>
            <span className="block text-[10px] uppercase font-mono tracking-widest text-emerald-400">
              Virtual Science Simulator
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onDirectOpenMicroscope}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-all"
          >
            <span>Direct Microscope Demo</span>
          </button>
          <button
            onClick={handleStart}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <span>Enter Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 md:py-16 text-center z-10 flex flex-col items-center">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-6 backdrop-blur-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Interactive Science Practical Proof-of-Concept</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl"
        >
          Experience practical science.{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Anywhere.
          </span>
        </motion.h1>

        {/* Subtitle / Problem & Vision */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed font-normal"
        >
          Millions of students learn theoretical science without access to physical laboratories.
          LabBridge brings a realistic, fully interactive 3D laboratory directly to your browser—featuring authentic compound microscopy, real optics, circuit boards, and chemical titrations.
        </motion.p>

        {/* Primary CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            onClick={handleStart}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-base font-extrabold tracking-tight transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 hover:scale-105 active:scale-95 group"
          >
            <span>ENTER THE VIRTUAL LAB</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* 4 Laboratory Workstations Overview Grid */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left"
        >
          {/* Biology */}
          <div
            onClick={onDirectOpenMicroscope}
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-emerald-500/40 hover:border-emerald-500 transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              🔬
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white">Biology Station</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-bold">
                Interactive
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Usable compound microscope with optical depth-of-field blur, 4x-100x lenses, and real cell specimens.
            </p>
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span>Try Microscope View →</span>
            </div>
          </div>

          {/* Chemistry */}
          <div
            onClick={handleStart}
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              🧪
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white">Chemistry Station</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">
                Apparatus
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Volumetric burette acid-base titration with pH indicator shifts, Erlenmeyer flasks, and Bunsen burner.
            </p>
          </div>

          {/* Physics */}
          <div
            onClick={handleStart}
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              ⚡
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white">Physics Station</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-mono">
                Apparatus
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ohm&apos;s Law DC circuit breadboard with interactive switch, bulb filament wattage, and prism light refraction.
            </p>
          </div>

          {/* Research */}
          <div
            onClick={handleStart}
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              ⚖️
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white">Analytical Science</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono">
                Precision
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Precision 4-decimal analytical balance with tare tare zeroing and high-speed refrigerated centrifuge.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 z-10">
        <div className="flex items-center gap-2">
          <span>LabBridge &bull; Science Education for Everyone</span>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-4">
          <span>First-Person 3D Simulator</span>
          <span>&bull;</span>
          <span>Optical Ray Simulation</span>
        </div>
      </footer>
    </div>
  );
}
