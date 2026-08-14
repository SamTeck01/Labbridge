'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Zap, SunMedium, Sliders, Activity, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';

interface PhysicsStationModalProps {
  onExit: () => void;
  onAskAI?: (prompt: string, context: string) => void;
}

export default function PhysicsStationModal({ onExit, onAskAI }: PhysicsStationModalProps) {
  // Circuit Lab State
  const [voltage, setVoltage] = useState<number>(6.0); // 0 to 12 V
  const [resistance, setResistance] = useState<number>(200); // 50 to 1000 Ohms
  const [isSwitchClosed, setIsSwitchClosed] = useState<boolean>(true);
  const [multimeterMode, setMultimeterMode] = useState<'voltage' | 'current' | 'resistance'>('voltage');

  // Optics Prism State
  const [incidentAngleDeg, setIncidentAngleDeg] = useState<number>(35); // 10 to 60 deg

  // Circuit Physics Calculations
  const currentAmps = isSwitchClosed ? voltage / resistance : 0;
  const currentMilliAmps = currentAmps * 1000;
  const powerWatts = isSwitchClosed ? (voltage * voltage) / resistance : 0;
  const powerMilliWatts = powerWatts * 1000;
  const bulbBrightnessPct = isSwitchClosed ? Math.min(100, (powerWatts / 0.72) * 100) : 0;

  const handleToggleSwitch = () => {
    const nextState = !isSwitchClosed;
    setIsSwitchClosed(nextState);
    soundFx.playSwitchToggle(nextState);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-slate-100 font-sans select-none overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            ⚡
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              Physics & Electromagnetism Workstation
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Interactive Apparatus
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Ohm&apos;s Law DC Circuit Board &bull; Optical Prism Refraction
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onAskAI?.("Explain Ohm's law and how voltage, current, and resistance relate in a series circuit.", 'Physics Station: DC Circuits & Optics')}
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

      {/* Grid Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
        {/* Left: Circuit Board & Multimeter */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">DC Circuit Board &amp; Ohm&apos;s Law (V = IR)</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-mono">
              P = {powerMilliWatts.toFixed(1)} mW
            </span>
          </div>

          {/* Circuit Visual Board */}
          <div className="p-6 bg-slate-950/70 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center relative min-h-[300px]">
            {/* SVG Schematic Diagram */}
            <svg viewBox="0 0 440 220" className="w-full max-w-lg h-auto">
              {/* Outer Loop Wire */}
              <rect
                x="40"
                y="30"
                width="360"
                height="160"
                rx="8"
                fill="none"
                stroke={isSwitchClosed && voltage > 0 ? '#f59e0b' : '#475569'}
                strokeWidth="4"
                className="transition-colors duration-200"
              />

              {/* DC Power Supply Graphic (Left side) */}
              <g transform="translate(30, 85)">
                <rect x="0" y="0" width="20" height="50" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" rx="3" />
                <line x1="-5" y1="18" x2="25" y2="18" stroke="#ef4444" strokeWidth="3" />
                <line x1="2" y1="32" x2="18" y2="32" stroke="#64748b" strokeWidth="2" />
                <text x="-16" y="14" fill="#ef4444" fontSize="11" fontWeight="bold">+</text>
                <text x="-14" y="44" fill="#94a3b8" fontSize="11" fontWeight="bold">-</text>
                <text x="32" y="28" fill="#38bdf8" fontSize="10" fontFamily="monospace">{voltage.toFixed(1)}V</text>
              </g>

              {/* Knife Switch (Top side) */}
              <g transform="translate(200, 20)">
                <circle cx="0" cy="10" r="5" fill="#f59e0b" />
                <circle cx="40" cy="10" r="5" fill="#f59e0b" />
                {/* Switch blade arm */}
                <line
                  x1="0"
                  y1="10"
                  x2={isSwitchClosed ? "40" : "32"}
                  y2={isSwitchClosed ? "10" : "-12"}
                  stroke="#fbbf24"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="transition-all duration-150"
                />
                <text x="5" y="-14" fill="#94a3b8" fontSize="10">Switch</text>
              </g>

              {/* Resistor Component (Bottom side) */}
              <g transform="translate(190, 180)">
                <rect x="-10" y="-8" width="60" height="18" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" rx="3" />
                {/* Color bands on resistor */}
                <line x1="2" y1="-8" x2="2" y2="10" stroke="#b45309" strokeWidth="3" />
                <line x1="12" y1="-8" x2="12" y2="10" stroke="#000000" strokeWidth="3" />
                <line x1="22" y1="-8" x2="22" y2="10" stroke="#b45309" strokeWidth="3" />
                <line x1="34" y1="-8" x2="34" y2="10" stroke="#eab308" strokeWidth="2" />
                <text x="2" y="26" fill="#cbd5e1" fontSize="10" fontFamily="monospace">{resistance} Ω</text>
              </g>

              {/* Light Bulb Component (Right side) */}
              <g transform="translate(390, 110)">
                {/* Bulb Glow Filter */}
                {isSwitchClosed && bulbBrightnessPct > 5 && (
                  <circle
                    cx="10"
                    cy="0"
                    r={20 + bulbBrightnessPct * 0.25}
                    fill="#fef08a"
                    opacity={bulbBrightnessPct / 140}
                    className="filter blur-md animate-pulse"
                  />
                )}
                {/* Glass Dome */}
                <circle
                  cx="10"
                  cy="0"
                  r="16"
                  fill={isSwitchClosed && bulbBrightnessPct > 5 ? '#fef9c3' : 'rgba(148, 163, 184, 0.2)'}
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
                {/* Filament */}
                <path
                  d="M 5,6 Q 10,-8 15,6"
                  fill="none"
                  stroke={isSwitchClosed && bulbBrightnessPct > 5 ? '#eab308' : '#64748b'}
                  strokeWidth="2"
                />
                <rect x="5" y="16" width="10" height="8" fill="#475569" rx="1" />
              </g>
            </svg>

            {/* Quick Switch Toggle on Board */}
            <button
              onClick={handleToggleSwitch}
              className={`mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isSwitchClosed
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : 'bg-rose-950 text-rose-300 border-rose-600'
              }`}
            >
              Knife Switch: {isSwitchClosed ? 'CLOSED (Circuit Active)' : 'OPEN (Circuit Broken)'}
            </button>
          </div>

          {/* Controls & Digital Multimeter Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Variable DC Power Supply Knob */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">DC Voltage Supply</span>
                <span className="font-mono text-cyan-400 font-bold">{voltage.toFixed(1)} V</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={voltage}
                onChange={(e) => {
                  setVoltage(parseFloat(e.target.value));
                  soundFx.playKnobTick();
                }}
                className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.0 V</span>
                <span>12.0 V</span>
              </div>
            </div>

            {/* Load Resistance Slider */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Load Resistance</span>
                <span className="font-mono text-amber-400 font-bold">{resistance} Ω</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={resistance}
                onChange={(e) => {
                  setResistance(parseInt(e.target.value));
                  soundFx.playKnobTick();
                }}
                className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>50 Ω</span>
                <span>1000 Ω</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Digital Multimeter & Optical Prism */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Digital Multimeter */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Digital Multimeter</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">
                Auto-Range
              </span>
            </div>

            {/* LCD Screen Display */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border-2 border-emerald-600/40 font-mono text-emerald-300 shadow-inner">
              <div className="flex justify-between text-[10px] uppercase text-emerald-500 font-semibold mb-1">
                <span>Mode: {multimeterMode.toUpperCase()}</span>
                <span>RMS TRUE</span>
              </div>
              <div className="text-3xl font-bold tracking-wider flex items-baseline justify-between">
                <span>
                  {multimeterMode === 'voltage'
                    ? (isSwitchClosed ? voltage.toFixed(2) : '0.00')
                    : multimeterMode === 'current'
                    ? currentMilliAmps.toFixed(1)
                    : resistance.toFixed(0)}
                </span>
                <span className="text-sm text-emerald-400 font-sans font-bold">
                  {multimeterMode === 'voltage' ? 'V (DC)' : multimeterMode === 'current' ? 'mA' : 'Ω'}
                </span>
              </div>
            </div>

            {/* Multimeter Mode Selector */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {(['voltage', 'current', 'resistance'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMultimeterMode(m);
                    soundFx.playClick();
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold uppercase border transition-all ${
                    multimeterMode === m
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {m === 'voltage' ? '⚡ Volts' : m === 'current' ? '🌊 Amps' : '🧱 Ohms'}
                </button>
              ))}
            </div>
          </div>

          {/* Optical Prism Refraction Simulator */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
                <div className="flex items-center gap-2">
                  <SunMedium className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Glass Prism Dispersion</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  θ = {incidentAngleDeg}°
                </span>
              </div>

              {/* Prism Graphics Viewport */}
              <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 300 120" className="w-full h-full">
                  {/* Incident White Beam */}
                  <line
                    x1="20"
                    y1={60 - (incidentAngleDeg - 35) * 0.8}
                    x2="120"
                    y2="60"
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                  {/* Glass Triangular Prism */}
                  <polygon
                    points="150,20 190,95 110,95"
                    fill="rgba(199, 210, 254, 0.25)"
                    stroke="#818cf8"
                    strokeWidth="2"
                  />
                  {/* Refracted Dispersion Rainbow Spectrum */}
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'].map((color, i) => (
                    <line
                      key={color}
                      x1="165"
                      y1={55 + i * 2}
                      x2="280"
                      y2={30 + i * 11 + (incidentAngleDeg - 35) * 0.3}
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.9"
                    />
                  ))}
                </svg>
              </div>
            </div>

            {/* Slider for angle */}
            <div className="space-y-1 pt-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Angle of Incidence (θ)</span>
                <span className="font-mono text-slate-200">{incidentAngleDeg}°</span>
              </div>
              <input
                type="range"
                min="15"
                max="55"
                step="1"
                value={incidentAngleDeg}
                onChange={(e) => setIncidentAngleDeg(parseInt(e.target.value))}
                className="w-full accent-indigo-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
