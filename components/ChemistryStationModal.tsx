'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, Droplets, FlaskConical, Beaker, ShieldAlert, Sparkles, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';

interface ChemistryStationModalProps {
  onExit: () => void;
  onAskAI?: (prompt: string, context: string) => void;
}

export default function ChemistryStationModal({ onExit, onAskAI }: ChemistryStationModalProps) {
  // Bunsen Burner State
  const [isGasOn, setIsGasOn] = useState<boolean>(false);
  const [isIgnited, setIsIgnited] = useState<boolean>(false);
  const [airCollar, setAirCollar] = useState<number>(0.2); // 0 = yellow safety, 1 = roaring blue

  // Titration Experiment State
  const [naohVolumeMl, setNaohVolumeMl] = useState<number>(0);
  const [indicatorAdded, setIndicatorAdded] = useState<boolean>(true);
  const [reactionLog, setReactionLog] = useState<string[]>([
    'Flask prepared with 25.0 mL of 0.10 M Hydrochloric Acid (HCl).',
    'Added 3 drops of Phenolphthalein indicator (colorless in acid).'
  ]);

  // Calculations for Titration
  // Equivalence point is at exactly 25.0 mL of NaOH
  const equivalenceVolume = 25.0;
  const currentPh = naohVolumeMl < 24.5
    ? 1.0 + (naohVolumeMl / 24.5) * 1.5 // pH 1.0 to 2.5
    : naohVolumeMl < 24.95
    ? 3.0 + (naohVolumeMl - 24.5) * 6.0 // pH 3.0 to 5.7
    : naohVolumeMl <= 25.05
    ? 7.0 + (naohVolumeMl - 25.0) * 30.0 // steep transition through pH 7-8.5
    : Math.min(13.0, 11.5 + Math.log10(naohVolumeMl - 25.0 + 0.1));

  // Phenolphthalein color: colorless below pH 8.2, vibrant magenta-pink above pH 8.2
  const isPink = indicatorAdded && currentPh >= 8.2;
  const pinkOpacity = !indicatorAdded ? 0 : Math.min(0.85, Math.max(0, (currentPh - 7.5) / 2.5));

  // Flame Properties
  const flameType = !isIgnited
    ? 'Off'
    : airCollar < 0.3
    ? 'Safety Flame (Yellow/Orange - 300°C)'
    : airCollar < 0.7
    ? 'Medium Gentle Flame (Light Blue - 700°C)'
    : 'Roaring Oxidising Flame (Double Cone Blue - 1100°C)';

  const handleIgnite = () => {
    if (!isGasOn) {
      soundFx.playBeep();
      return;
    }
    soundFx.playBurnerIgnite();
    setIsIgnited(true);
  };

  const handleAddTitrant = (amountMl: number) => {
    soundFx.playDropLiquid();
    const newVol = Math.min(50, parseFloat((naohVolumeMl + amountMl).toFixed(2)));
    setNaohVolumeMl(newVol);

    if (newVol >= 24.9 && newVol <= 25.1 && naohVolumeMl < 24.9) {
      soundFx.playSuccessChime();
      setReactionLog((prev) => [
        `🎯 EQUIVALENCE POINT REACHED! End-point color change observed at ${newVol.toFixed(2)} mL NaOH.`,
        ...prev
      ]);
    } else if (newVol % 5 === 0) {
      setReactionLog((prev) => [
        `Added titrant: Total ${newVol.toFixed(2)} mL. Current pH: ${currentPh.toFixed(2)}.`,
        ...prev
      ]);
    }
  };

  const handleResetTitration = () => {
    soundFx.playClick();
    setNaohVolumeMl(0);
    setReactionLog([
      'Experiment reset.',
      'Flask recharged with 25.0 mL of 0.10 M HCl + Phenolphthalein indicator.'
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-slate-100 font-sans select-none overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
            🧪
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              Chemistry Laboratory Workstation
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Interactive Apparatus
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Acid-Base Volumetric Titration &bull; Thermal Combustion Controls
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onAskAI?.('Explain how acid-base titration with phenolphthalein indicator works and how to calculate unknown concentration.', 'Chemistry Station: Titration & Combustion')}
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

      {/* Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
        {/* Left Column: Volumetric Titration Simulator */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Volumetric Acid-Base Titration</h3>
            </div>
            <button
              onClick={handleResetTitration}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Burette</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1">
            {/* Visual Glassware Rig */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-xl border border-slate-800/80 relative min-h-[340px]">
              {/* Burette Tube */}
              <div className="w-6 h-44 bg-slate-800/60 rounded-t border-2 border-slate-600 relative overflow-hidden flex flex-col justify-end">
                {/* Fluid in Burette */}
                <div
                  className="w-full bg-cyan-400/50 transition-all duration-200 border-t border-cyan-200"
                  style={{ height: `${Math.max(5, (1 - naohVolumeMl / 50) * 100)}%` }}
                />
                {/* Ticks */}
                <div className="absolute inset-0 flex flex-col justify-between py-1 px-0.5 opacity-50 pointer-events-none">
                  {[0, 10, 20, 30, 40, 50].map((t) => (
                    <div key={t} className="w-full h-0.5 bg-slate-400" />
                  ))}
                </div>
              </div>

              {/* Burette Stopcock Clamp */}
              <div className="w-12 h-3 bg-slate-700 rounded-sm my-1 border border-slate-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>

              {/* Falling Drops when adding */}
              <div className="w-0.5 h-6 bg-cyan-300/60 my-0.5 animate-pulse" />

              {/* Erlenmeyer Flask */}
              <div className="w-32 h-28 relative flex items-end justify-center">
                <svg viewBox="0 0 100 90" className="w-full h-full drop-shadow-md">
                  {/* Glass Outline */}
                  <polygon
                    points="42,5 58,5 58,25 90,85 10,85 42,25"
                    fill="rgba(15, 23, 42, 0.4)"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                  />
                  {/* Liquid inside flask */}
                  <polygon
                    points="34,42 66,42 86,83 14,83"
                    fill={isPink ? `rgba(236, 72, 153, ${0.4 + pinkOpacity * 0.5})` : 'rgba(224, 242, 254, 0.2)'}
                    stroke={isPink ? '#f472b6' : '#bae6fd'}
                    strokeWidth="1"
                    className="transition-colors duration-300"
                  />
                </svg>
              </div>

              {/* Live Status Badge */}
              <div className="mt-3 text-center">
                <div className="text-xs font-mono font-semibold text-slate-300">
                  Titrant Added: <span className="text-cyan-400">{naohVolumeMl.toFixed(2)} mL</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Analyte: 25.0 mL 0.10 M HCl &bull; Titrant: 0.10 M NaOH
                </div>
              </div>
            </div>

            {/* Titration Controls & Live Telemetry */}
            <div className="space-y-4">
              {/* Digital pH Meter Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Digital pH Meter</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    currentPh < 6 ? 'bg-rose-950 text-rose-300' : currentPh < 8 ? 'bg-emerald-950 text-emerald-300' : 'bg-fuchsia-950 text-fuchsia-300'
                  }`}>
                    {currentPh < 7 ? 'Acidic' : currentPh === 7 ? 'Neutral' : 'Alkaline'}
                  </span>
                </div>
                <div className="text-3xl font-mono font-bold text-white flex items-baseline gap-2">
                  <span>{currentPh.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 font-sans">pH</span>
                </div>

                {/* pH Scale Color Gradient Bar */}
                <div className="mt-2.5 h-2 rounded-full w-full bg-gradient-to-r from-red-500 via-green-400 to-purple-600 relative">
                  <div
                    className="absolute -top-1 w-2 h-4 bg-white border border-slate-900 rounded shadow-md -translate-x-1/2 transition-all duration-150"
                    style={{ left: `${(currentPh / 14) * 100}%` }}
                  />
                </div>
              </div>

              {/* Titrant Drop Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Add 0.10 M NaOH from Burette:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAddTitrant(0.05)}
                    className="py-2 px-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 text-xs font-medium transition-all"
                  >
                    + 1 Drop (0.05 mL)
                  </button>
                  <button
                    onClick={() => handleAddTitrant(1.0)}
                    className="py-2 px-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 text-xs font-medium transition-all"
                  >
                    + 1.0 mL
                  </button>
                  <button
                    onClick={() => handleAddTitrant(5.0)}
                    className="py-2 px-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 text-xs font-medium transition-all"
                  >
                    + 5.0 mL
                  </button>
                </div>
              </div>

              {/* Indicator Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-xs">
                <span className="text-slate-300">Phenolphthalein Indicator</span>
                <button
                  onClick={() => {
                    setIndicatorAdded(!indicatorAdded);
                    soundFx.playClick();
                  }}
                  className={`px-3 py-1 rounded-md font-medium text-xs border ${
                    indicatorAdded
                      ? 'bg-pink-950/60 text-pink-300 border-pink-700/60'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {indicatorAdded ? 'Present (Active)' : 'Omitted'}
                </button>
              </div>

              {/* Live Log */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 max-h-28 overflow-y-auto space-y-1">
                {reactionLog.slice(0, 4).map((log, i) => (
                  <div key={i} className="leading-tight">
                    &bull; {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bunsen Burner & Reagent Showcase */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Bunsen Burner Interactive Card */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Laboratory Bunsen Burner</h3>
                </div>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                  isIgnited ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isIgnited ? 'Active Flame' : 'Extinguished'}
                </span>
              </div>

              {/* Visual Flame Display */}
              <div className="h-44 bg-slate-950 rounded-xl border border-slate-800/80 relative flex flex-col items-center justify-end pb-3 overflow-hidden">
                {/* Flame Graphic */}
                {isIgnited && (
                  <div className="relative mb-1 flex flex-col items-center">
                    {/* Outer Flame Glow */}
                    <div
                      className={`w-14 rounded-full filter blur-sm transition-all duration-300 animate-pulse ${
                        airCollar < 0.3 ? 'h-24 bg-amber-500/70' : airCollar < 0.7 ? 'h-20 bg-blue-500/60' : 'h-16 bg-cyan-400/80'
                      }`}
                    />
                    {/* Inner Intense Cone */}
                    <div
                      className={`w-6 rounded-full absolute bottom-0 filter blur-[1px] ${
                        airCollar < 0.3 ? 'h-12 bg-yellow-200' : 'h-10 bg-cyan-100'
                      }`}
                    />
                  </div>
                )}

                {/* Burner Chimney & Collar */}
                <div className="w-10 h-16 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-500 rounded-t-sm border-x border-t border-slate-600 relative flex items-center justify-center">
                  {/* Air Hole Collar */}
                  <div
                    className="w-8 h-3 bg-slate-800 rounded-sm border border-slate-900 transition-transform"
                    style={{ opacity: 0.3 + airCollar * 0.7 }}
                  />
                </div>
                {/* Heavy Base */}
                <div className="w-24 h-4 bg-slate-700 rounded-b-md border border-slate-600 shadow-md" />
              </div>

              {/* Flame Status */}
              <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                <span className="text-slate-400 font-semibold">State: </span>
                <span className="font-mono text-slate-200">{flameType}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const newState = !isGasOn;
                    setIsGasOn(newState);
                    if (!newState) setIsIgnited(false);
                    soundFx.playSwitchToggle(newState);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    isGasOn
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isGasOn ? 'Gas Valve: OPEN' : 'Gas Valve: CLOSED'}
                </button>

                <button
                  onClick={handleIgnite}
                  disabled={!isGasOn || isIgnited}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    isIgnited
                      ? 'bg-amber-950/60 text-amber-400 border-amber-600/40 cursor-default'
                      : isGasOn
                      ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-md'
                      : 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed'
                  }`}
                >
                  ⚡ Strike Igniter
                </button>
              </div>

              {/* Air Hole Collar Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Air Hole Collar (Combustion Ratio)</span>
                  <span className="font-mono font-semibold text-slate-200">{(airCollar * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={airCollar}
                  onChange={(e) => {
                    setAirCollar(parseFloat(e.target.value));
                    soundFx.playKnobTick();
                  }}
                  className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Closed (Safety)</span>
                  <span>Fully Open (Oxidising)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reagents Showcase Card */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 shadow-xl text-xs space-y-2">
            <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
              <Beaker className="w-4 h-4 text-emerald-400" />
              Standard Chemical Stock Solutions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                <div>
                  <div className="font-bold text-slate-200">CuSO₄ (aq)</div>
                  <div className="text-[10px] text-slate-400">Copper (II) Sulfate</div>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600 shadow-sm" />
                <div>
                  <div className="font-bold text-slate-200">KMnO₄ (aq)</div>
                  <div className="text-[10px] text-slate-400">Potassium Permanganate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
