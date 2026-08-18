'use client';

import React from 'react';
import {
  Footprints,
  Eye,
  Camera,
  RotateCw,
  Sparkles,
  Sliders,
  Flame,
  Zap,
  FlaskConical,
  Scale,
  Compass,
  ArrowUp,
  BookOpen
} from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';

export interface SeatedStationToolbarProps {
  station: 'biology' | 'chemistry' | 'physics' | 'research';
  onStandUp: () => void;
  onOpenNotebook: () => void;
  onOpenAssistant: () => void;

  // Biology Controls
  onLookThroughEyepieces?: () => void;
  onRotateTurret?: () => void;
  onSwapSlide?: () => void;
  onCoarseFocusChange?: (delta: number) => void;
  activeObjective?: string;
  activeSlideName?: string;

  // Chemistry Controls
  buretteOpen?: boolean;
  onToggleBurette?: () => void;
  stirrerRPM?: number;
  onToggleStirrer?: () => void;
  onAddIndicator?: () => void;
  phValue?: number;
  dispensedML?: number;

  // Physics Controls
  switchClosed?: boolean;
  onToggleSwitch?: () => void;
  resistance?: number;
  onChangeResistance?: (val: number) => void;
  currentMA?: number;
  voltageV?: number;

  // Analytical Controls
  balanceDoorsOpen?: boolean;
  onToggleBalanceDoor?: () => void;
  onTareBalance?: () => void;
  balanceWeight?: number;
  centrifugeRunning?: boolean;
  onToggleCentrifuge?: () => void;
}

export default function SeatedStationToolbar({
  station,
  onStandUp,
  onOpenNotebook,
  onOpenAssistant,
  onLookThroughEyepieces,
  onRotateTurret,
  onSwapSlide,
  onCoarseFocusChange,
  activeObjective = '10x',
  activeSlideName = 'Onion Epidermis',
  buretteOpen = false,
  onToggleBurette,
  stirrerRPM = 0,
  onToggleStirrer,
  onAddIndicator,
  phValue = 2.8,
  dispensedML = 0,
  switchClosed = false,
  onToggleSwitch,
  resistance = 25,
  onChangeResistance,
  currentMA = 480,
  voltageV = 12,
  balanceDoorsOpen = false,
  onToggleBalanceDoor,
  onTareBalance,
  balanceWeight = 0,
  centrifugeRunning = false,
  onToggleCentrifuge,
}: SeatedStationToolbarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-4 pointer-events-auto select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Seated Status & Stand Up Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <span className="text-xs font-bold text-white tracking-tight uppercase">
                Seated at{' '}
                {station === 'biology'
                  ? 'Microscopy Bench'
                  : station === 'chemistry'
                  ? 'Titration Bench'
                  : station === 'physics'
                  ? 'Circuits Bench'
                  : 'Analytical Bench'}
              </span>
              <p className="text-[10px] text-slate-400">Direct 3D Apparatus Mode</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playStandUp();
              onStandUp();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Footprints className="w-3.5 h-3.5 text-amber-400" />
            <span>Stand Up [ESC / Space]</span>
          </button>
        </div>

        {/* Station-Specific 3D Direct Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Biology Controls */}
          {station === 'biology' && (
            <>
              {onLookThroughEyepieces && (
                <button
                  onClick={() => {
                    soundFx.playClick();
                    onLookThroughEyepieces();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 flex items-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Look Through Eyepieces [F]</span>
                </button>
              )}

              {onRotateTurret && (
                <button
                  onClick={() => {
                    soundFx.playLensTurretClick();
                    onRotateTurret();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Turret: {activeObjective}</span>
                </button>
              )}

              {onSwapSlide && (
                <button
                  onClick={() => {
                    soundFx.playGlassSlide();
                    onSwapSlide();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <span>Slide: {activeSlideName}</span>
                </button>
              )}
            </>
          )}

          {/* Chemistry Controls */}
          {station === 'chemistry' && (
            <>
              {onToggleBurette && (
                <button
                  onClick={() => {
                    soundFx.playClick();
                    onToggleBurette();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all ${
                    buretteOpen
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>{buretteOpen ? 'Stop Burette Dispense' : 'Dispense Titrant Drops'}</span>
                </button>
              )}

              {onToggleStirrer && (
                <button
                  onClick={() => {
                    soundFx.playKnobTick();
                    onToggleStirrer();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${stirrerRPM > 0 ? 'animate-spin' : ''}`} />
                  <span>Stirrer: {stirrerRPM} RPM</span>
                </button>
              )}

              {onAddIndicator && (
                <button
                  onClick={() => {
                    soundFx.playDropLiquid();
                    onAddIndicator();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <span>+ Indicator</span>
                </button>
              )}

              <div className="px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400">
                pH: {phValue.toFixed(2)} &bull; {dispensedML.toFixed(1)} mL
              </div>
            </>
          )}

          {/* Physics Controls */}
          {station === 'physics' && (
            <>
              {onToggleSwitch && (
                <button
                  onClick={() => {
                    soundFx.playSwitchToggle(!switchClosed);
                    onToggleSwitch();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all ${
                    switchClosed
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Switch: {switchClosed ? 'CLOSED (ON)' : 'OPEN (OFF)'}</span>
                </button>
              )}

              {onChangeResistance && (
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 font-mono">R: {resistance}Ω</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={resistance}
                    onChange={(e) => {
                      soundFx.playKnobTick();
                      onChangeResistance(parseInt(e.target.value));
                    }}
                    className="w-20 accent-amber-400"
                  />
                </div>
              )}

              <div className="px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-amber-300">
                I: {currentMA.toFixed(0)} mA &bull; V: {voltageV.toFixed(1)} V
              </div>
            </>
          )}

          {/* Analytical Controls */}
          {station === 'research' && (
            <>
              {onToggleBalanceDoor && (
                <button
                  onClick={() => {
                    soundFx.playClick();
                    onToggleBalanceDoor();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Scale className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Draft Door: {balanceDoorsOpen ? 'OPEN' : 'CLOSED'}</span>
                </button>
              )}

              {onTareBalance && (
                <button
                  onClick={() => {
                    soundFx.playBeep();
                    onTareBalance();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <span>TARE Scale</span>
                </button>
              )}

              {onToggleCentrifuge && (
                <button
                  onClick={() => {
                    soundFx.playCentrifugeSpin();
                    onToggleCentrifuge();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all ${
                    centrifugeRunning
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${centrifugeRunning ? 'animate-spin' : ''}`} />
                  <span>Centrifuge: {centrifugeRunning ? '14,000 RPM' : 'SPIN'}</span>
                </button>
              )}

              <div className="px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300">
                Mass: {balanceWeight.toFixed(4)} g
              </div>
            </>
          )}
        </div>

        {/* Lab Assistant & Notebook Access */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenNotebook();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Open Lab Notebook"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenAssistant();
            }}
            className="p-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 transition-all"
            title="Consult Dr. Curie AI"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
