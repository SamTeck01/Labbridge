'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Scale, Disc3, Sparkles, RefreshCw, Cpu, CheckCircle } from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';

interface ResearchStationModalProps {
  onExit: () => void;
  onAskAI?: (prompt: string, context: string) => void;
}

export default function ResearchStationModal({ onExit, onAskAI }: ResearchStationModalProps) {
  // Analytical Balance Scale State
  const [tareOffset, setTareOffset] = useState<number>(0);
  const [placedItem, setPlacedItem] = useState<{ name: string; trueMass: number } | null>(null);

  // Centrifuge Machine State
  const [rpm, setRpm] = useState<number>(4000); // 1000 to 12000 RPM
  const [timerSec, setTimerSec] = useState<number>(30);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinProgress, setSpinProgress] = useState<number>(0);

  const sampleItems = [
    { name: 'Copper Calibration Block (10g)', trueMass: 10.0002 },
    { name: 'Petri Dish with Agar Monolayer', trueMass: 24.3184 },
    { name: 'Glass Micro-Slide with Coverslip', trueMass: 4.8291 },
    { name: 'Prepared Chemical Reagent Vial', trueMass: 18.7540 },
  ];

  const measuredMass = placedItem ? Math.max(0, placedItem.trueMass - tareOffset) : -tareOffset;

  const handleTare = () => {
    soundFx.playBeep();
    if (placedItem) {
      setTareOffset(placedItem.trueMass);
    } else {
      setTareOffset(0);
    }
  };

  const handleStartCentrifuge = () => {
    if (isSpinning) return;
    soundFx.playBeep();
    setIsSpinning(true);
    setSpinProgress(0);

    const interval = setInterval(() => {
      setSpinProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSpinning(false);
          soundFx.playSuccessChime();
          return 100;
        }
        return prev + 10;
      });
    }, (timerSec * 1000) / 10);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-slate-100 font-sans select-none overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
            🔬
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              General Research & Analytical Science Station
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Precision Measurement
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Analytical Balance (0.0001g Precision) &bull; High-Speed Centrifuge
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onAskAI?.('Explain how analytical balances tare and calibration work, and the role of centrifugation in separating cellular organelles.', 'Research Station: Analytical Balances & Centrifugation')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ask Lab AI</span>
          </button>
          <button
            onClick={onExit}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 hover:text-rose-300 text-slate-300 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Exit Station [ESC]</span>
          </button>
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
        {/* Left: Precision Analytical Balance */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">4-Decimal Analytical Balance Scale</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-mono">
              Draft Shield Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1">
            {/* Visual Balance Housing */}
            <div className="p-6 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative min-h-[260px]">
              {/* Glass Draft Shield Chamber */}
              <div className="w-48 h-40 bg-slate-900/40 rounded-t-xl border-2 border-slate-600/70 relative flex flex-col items-center justify-end pb-3">
                {/* Placed Item Rendering */}
                {placedItem && (
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-2 px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-semibold"
                  >
                    {placedItem.name}
                  </motion.div>
                )}
                {/* Stainless Steel Pan */}
                <div className="w-24 h-3 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 rounded-sm shadow-md border-t border-slate-400" />
                <div className="w-4 h-4 bg-slate-700" />
              </div>

              {/* Base Unit with Digital LED Readout */}
              <div className="w-56 p-3 bg-slate-800 rounded-b-xl border-x-2 border-b-2 border-slate-700 flex flex-col items-center">
                {/* Backlit VFD Screen */}
                <div className="w-full py-1.5 px-3 rounded bg-emerald-950/80 border border-emerald-500/40 font-mono text-emerald-300 text-xl font-bold flex justify-between items-baseline">
                  <span>{measuredMass >= 0 ? measuredMass.toFixed(4) : `-${Math.abs(measuredMass).toFixed(4)}`}</span>
                  <span className="text-xs font-sans text-emerald-400">g</span>
                </div>

                <button
                  onClick={handleTare}
                  className="mt-2 w-full py-1 rounded bg-slate-900 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-all"
                >
                  TARE / ZERO
                </button>
              </div>
            </div>

            {/* Select Samples to Weigh */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Place Object on Weighing Pan:</label>
              <div className="space-y-2">
                {sampleItems.map((item) => {
                  const isCur = placedItem?.name === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setPlacedItem(isCur ? null : item);
                        soundFx.playClick();
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                        isCur
                          ? 'bg-indigo-950 text-indigo-200 border-indigo-500/60 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">~{item.trueMass.toFixed(2)}g</span>
                    </button>
                  );
                })}
              </div>

              {placedItem && (
                <button
                  onClick={() => { setPlacedItem(null); soundFx.playClick(); }}
                  className="w-full py-1.5 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/40 text-xs"
                >
                  Clear Pan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Analytical Centrifuge */}
        <div className="lg:col-span-5 flex flex-col bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Disc3 className={`w-5 h-5 text-indigo-400 ${isSpinning ? 'animate-spin' : ''}`} />
                <h3 className="text-sm font-bold text-white">Refrigerated Micro-Centrifuge</h3>
              </div>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                isSpinning ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-950 text-slate-400'
              }`}>
                {isSpinning ? 'SPINNING' : 'IDLE'}
              </span>
            </div>

            {/* Visual Rotor Housing */}
            <div className="h-44 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
              <div
                className={`w-28 h-28 rounded-full border-4 border-slate-700 relative flex items-center justify-center ${
                  isSpinning ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: `${Math.max(0.1, (13000 - rpm) / 10000)}s` }}
              >
                {/* 6 Tube Holes in Rotor */}
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <div
                    key={deg}
                    className="w-3 h-5 bg-indigo-500/80 rounded-full absolute border border-indigo-300"
                    style={{
                      transform: `rotate(${deg}deg) translate(0, -36px)`,
                    }}
                  />
                ))}
                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600" />
              </div>

              {isSpinning && (
                <div className="absolute bottom-2 text-xs font-mono text-cyan-400">
                  {spinProgress}% Complete
                </div>
              )}
            </div>
          </div>

          {/* Centrifuge Speed & Time Controls */}
          <div className="space-y-4 pt-3">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Rotor Speed (RPM)</span>
                <span className="font-mono text-indigo-300 font-bold">{rpm} RPM</span>
              </div>
              <input
                type="range"
                min="1000"
                max="12000"
                step="500"
                value={rpm}
                disabled={isSpinning}
                onChange={(e) => setRpm(parseInt(e.target.value))}
                className="w-full accent-indigo-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <button
              onClick={handleStartCentrifuge}
              disabled={isSpinning}
              className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
                isSpinning
                  ? 'bg-amber-600/50 text-amber-200 border border-amber-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isSpinning ? 'Centrifugation in Progress...' : '▶ Start Centrifuge Run'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
