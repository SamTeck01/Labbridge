'use client';

import React, { useState } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  LogOut,
  Sparkles,
  Info,
  Maximize2,
  Eye,
  FlaskConical,
  Zap,
  Scale,
  X
} from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';

interface MiniMapRadarProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  isSeated: boolean;
  seatedStation: 'biology' | 'chemistry' | 'physics' | 'research' | null;
  onTeleport: (dest: 'center' | 'biology' | 'chemistry' | 'physics' | 'research') => void;
  onExitToLanding: () => void;
  onOpenPhone?: () => void;
}

export default function MiniMapRadar({
  playerX,
  playerZ,
  playerYaw,
  isSeated,
  seatedStation,
  onTeleport,
  onExitToLanding,
  onOpenPhone,
}: MiniMapRadarProps) {
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Map world coords [-7, 7] and [-6, 6] to radar coords [0, 80]
  // Radar size: 84px diameter
  const mapSize = 84;
  const radius = mapSize / 2;

  // Convert player 3D pos to radar pixel offset from center
  const posX = radius + (playerX / 7.5) * (radius - 8);
  const posY = radius + (playerZ / 7.5) * (radius - 8);

  // Station positions in 3D:
  // Biology: (-4.5, -3.8)
  // Chemistry: (4.5, -3.8)
  // Physics: (-4.5, 3.8)
  // Research: (4.5, 3.8)
  const stations = [
    { id: 'biology', label: 'Bio', x: radius + (-4.5 / 7.5) * (radius - 8), y: radius + (-3.8 / 7.5) * (radius - 8), color: '#10b981' },
    { id: 'chemistry', label: 'Chem', x: radius + (4.5 / 7.5) * (radius - 8), y: radius + (-3.8 / 7.5) * (radius - 8), color: '#a855f7' },
    { id: 'physics', label: 'Phys', x: radius + (-4.5 / 7.5) * (radius - 8), y: radius + (3.8 / 7.5) * (radius - 8), color: '#f59e0b' },
    { id: 'research', label: 'Ana', x: radius + (4.5 / 7.5) * (radius - 8), y: radius + (3.8 / 7.5) * (radius - 8), color: '#38bdf8' },
  ];

  const handleTogglePause = () => {
    soundFx.playClick();
    setIsPauseMenuOpen((prev) => !prev);
  };

  return (
    <>
      {/* Top-Right Round Mini Map Button */}
      <div className="absolute top-4 right-4 z-40 pointer-events-auto">
        <button
          onClick={handleTogglePause}
          className="relative w-[88px] h-[88px] rounded-full bg-slate-950/85 backdrop-blur-xl border-2 border-emerald-500/40 hover:border-emerald-400 p-0 shadow-[0_8px_30px_rgba(0,0,0,0.7)] group transition-transform active:scale-95 flex items-center justify-center overflow-hidden"
          title="Click to Pause Experiment & Open Map Menu"
        >
          {/* Radar Background Grid Rings */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/20" />
          <div className="absolute inset-2.5 rounded-full border border-emerald-500/15" />
          <div className="absolute inset-5 rounded-full border border-emerald-500/10" />

          {/* Crosshairs */}
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-emerald-500/20" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-emerald-500/20" />

          {/* Rotating Radar Sweep Line */}
          <div className="absolute inset-0 rounded-full origin-center pointer-events-none animate-[spin_4s_linear_infinite] bg-gradient-to-tr from-transparent via-emerald-500/15 to-transparent" />

          {/* Fixed Station Dot Markers */}
          {stations.map((st) => (
            <div
              key={st.id}
              style={{ left: `${st.x}px`, top: `${st.y}px` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black shadow"
            >
              <div
                style={{ backgroundColor: st.color }}
                className="w-full h-full rounded-full"
              />
            </div>
          ))}

          {/* Player Blip & Directional Viewing Cone */}
          <div
            style={{
              left: `${Math.max(6, Math.min(mapSize - 6, posX))}px`,
              top: `${Math.max(6, Math.min(mapSize - 6, posY))}px`,
              transform: `translate(-50%, -50%) rotate(${playerYaw}rad)`,
            }}
            className="absolute pointer-events-none transition-transform duration-75"
          >
            {/* Viewing Field Cone */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-emerald-400/40" />
            {/* Player Center Dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white shadow-[0_0_8px_#34d399]" />
          </div>

          {/* Mini-Map Overlay Hover Label */}
          <div className="absolute bottom-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[8px] font-mono text-emerald-400/90 font-bold border border-emerald-500/30 group-hover:scale-105 transition-transform flex items-center gap-1">
            <Pause className="w-2 h-2" /> MAP
          </div>
        </button>
      </div>

      {/* Pause Menu Modal (Triggered by Mini Map Click) */}
      {isPauseMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-200 select-none">
          <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-slate-100 ring-1 ring-white/10">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Pause className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Laboratory Paused</h2>
                  <span className="text-xs text-slate-400">Simulation state preserved</span>
                </div>
              </div>
              <button
                onClick={() => {
                  soundFx.playClick();
                  setIsPauseMenuOpen(false);
                }}
                className="p-2 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions List */}
            <div className="flex flex-col gap-2.5">
              {/* Resume */}
              <button
                onClick={() => {
                  soundFx.playClick();
                  setIsPauseMenuOpen(false);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                Resume Experiment
              </button>

              {/* Station Teleport Quick Strip */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Jump to Workstation
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onTeleport('biology');
                      setIsPauseMenuOpen(false);
                    }}
                    className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center gap-2 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Microscopy
                  </button>
                  <button
                    onClick={() => {
                      onTeleport('chemistry');
                      setIsPauseMenuOpen(false);
                    }}
                    className="p-2 rounded-xl bg-violet-950/40 hover:bg-violet-900/60 border border-violet-500/30 text-xs font-semibold text-violet-300 flex items-center gap-2 transition-all"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    Titration
                  </button>
                  <button
                    onClick={() => {
                      onTeleport('physics');
                      setIsPauseMenuOpen(false);
                    }}
                    className="p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-center gap-2 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Circuits
                  </button>
                  <button
                    onClick={() => {
                      onTeleport('research');
                      setIsPauseMenuOpen(false);
                    }}
                    className="p-2 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-xs font-semibold text-sky-300 flex items-center gap-2 transition-all"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Analytical
                  </button>
                </div>
              </div>

              {/* Audio Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  <span className="text-xs font-medium text-slate-200">Sound Effects & Acoustic Hum</span>
                </div>
                <button
                  onClick={() => {
                    const muted = soundFx.toggleMute();
                    setIsMuted(muted);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isMuted ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {isMuted ? 'Muted' : 'Enabled'}
                </button>
              </div>

              {/* Exit to Main Menu */}
              <button
                onClick={() => {
                  soundFx.playClick();
                  setIsPauseMenuOpen(false);
                  onExitToLanding();
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Exit Laboratory to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
