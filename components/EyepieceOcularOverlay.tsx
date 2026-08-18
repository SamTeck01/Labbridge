'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  RotateCcw,
  Camera,
  Layers,
  Sparkles,
  Maximize2,
  Info,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X
} from 'lucide-react';
import { SPECIMEN_CATALOG, SpecimenInfo, drawSpecimenToCanvas } from '@/lib/specimenGenerator';
import { soundFx } from '@/lib/soundEffects';
import { SnapshotItem } from '@/components/LabNotebookModal';

interface EyepieceOcularOverlayProps {
  onClose: () => void;
  onSaveSnapshot: (snapshot: SnapshotItem) => void;
  onAskAI?: (prompt: string, context: string) => void;
  initialSpecimenId?: string;
  initialObjective?: '4x' | '10x' | '40x' | '100x';
  initialCoarse?: number;
  initialFine?: number;
  initialLight?: number;
  onStateChange?: (state: {
    specimenId: string;
    objective: '4x' | '10x' | '40x' | '100x';
    coarseFocus: number;
    fineFocus: number;
    stageX: number;
    stageY: number;
    lightIntensity: number;
  }) => void;
}

export default function EyepieceOcularOverlay({
  onClose,
  onSaveSnapshot,
  onAskAI,
  initialSpecimenId = 'allium_cepa',
  initialObjective = '10x',
  initialCoarse = 0.5,
  initialFine = 0.5,
  initialLight = 1.0,
  onStateChange,
}: EyepieceOcularOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Optical State
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string>(initialSpecimenId);
  const [objective, setObjective] = useState<'4x' | '10x' | '40x' | '100x'>(initialObjective);
  const [coarseFocus, setCoarseFocus] = useState<number>(initialCoarse);
  const [fineFocus, setFineFocus] = useState<number>(initialFine);
  const [stageX, setStageX] = useState<number>(0);
  const [stageY, setStageY] = useState<number>(0);
  const [lightIntensity, setLightIntensity] = useState<number>(initialLight);
  const [diaphragmAperture, setDiaphragmAperture] = useState<number>(0.8);
  const [immersionOil, setImmersionOil] = useState<boolean>(false);
  const [showMicrometer, setShowMicrometer] = useState<boolean>(false);
  const [capturedFlash, setCapturedFlash] = useState<boolean>(false);

  const selectedSpecimen = SPECIMEN_CATALOG.find((s) => s.id === selectedSpecimenId) || SPECIMEN_CATALOG[0];

  const magnificationFactor = objective === '4x' ? 40 : objective === '10x' ? 100 : objective === '40x' ? 400 : 1000;

  // Calculate Optical Focus Sharpness
  const effectiveFocus = coarseFocus * 0.8 + fineFocus * 0.2;
  const focusDistance = Math.abs(effectiveFocus - selectedSpecimen.optimalFocusHeight);
  // Sharpness drops rapidly with higher magnification
  const sensitivity = objective === '100x' ? 18 : objective === '40x' ? 12 : objective === '10x' ? 6 : 3;
  let sharpness = Math.max(0.02, 1.0 - focusDistance * sensitivity);

  if (objective === '100x' && !immersionOil) {
    sharpness *= 0.4; // refractive index mismatch without oil
  }

  // Redraw Canvas on Optical Parameter Changes
  const renderEyepiece = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawSpecimenToCanvas(
      ctx,
      canvas.width,
      canvas.height,
      selectedSpecimenId,
      magnificationFactor,
      stageX,
      stageY,
      sharpness,
      lightIntensity,
      diaphragmAperture
    );

    // Draw Graticule / Micrometer Scale if enabled
    if (showMicrometer) {
      ctx.save();
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 180, cy);
      ctx.lineTo(cx + 180, cy);
      ctx.moveTo(cx, cy - 180);
      ctx.lineTo(cx, cy + 180);
      ctx.stroke();

      // Tick marks
      for (let t = -150; t <= 150; t += 15) {
        const h = t % 75 === 0 ? 14 : t % 30 === 0 ? 8 : 4;
        ctx.beginPath();
        ctx.moveTo(cx + t, cy - h / 2);
        ctx.lineTo(cx + t, cy + h / 2);
        ctx.moveTo(cx - h / 2, cy + t);
        ctx.lineTo(cx + h / 2, cy + t);
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = '10px monospace';
      ctx.fillText('10 μm / div', cx + 90, cy - 10);
      ctx.restore();
    }
  }, [
    selectedSpecimenId,
    magnificationFactor,
    stageX,
    stageY,
    sharpness,
    lightIntensity,
    diaphragmAperture,
    showMicrometer,
  ]);

  useEffect(() => {
    renderEyepiece();
    if (onStateChange) {
      onStateChange({
        specimenId: selectedSpecimenId,
        objective,
        coarseFocus,
        fineFocus,
        stageX,
        stageY,
        lightIntensity,
      });
    }
  }, [renderEyepiece, selectedSpecimenId, objective, coarseFocus, fineFocus, stageX, stageY, lightIntensity, onStateChange]);

  const handleObjectiveChange = (newObj: '4x' | '10x' | '40x' | '100x') => {
    soundFx.playLensTurretClick();
    setObjective(newObj);
  };

  const handleCaptureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    soundFx.playClick();
    setCapturedFlash(true);
    setTimeout(() => setCapturedFlash(false), 250);

    const dataUrl = canvas.toDataURL('image/png');
    const snapshot: SnapshotItem = {
      title: `${selectedSpecimen.name} (${magnificationFactor}x)`,
      specimenId: selectedSpecimen.id,
      magnification: `${magnificationFactor}x`,
      imageUrl: dataUrl,
      notes: `Observed ${selectedSpecimen.name} (${selectedSpecimen.scientificName}) with ${selectedSpecimen.stain}. Focus sharpness: ${Math.round(sharpness * 100)}%. Structures identified: ${selectedSpecimen.structures.join(', ')}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onSaveSnapshot(snapshot);
    soundFx.playSuccessChime();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-lg select-none">
      {/* Capture Flash Effect */}
      {capturedFlash && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-ping" />
      )}

      {/* Main Ocular Viewport Layout */}
      <div className="relative w-full h-full max-w-7xl flex flex-col p-4 md:p-6 justify-between">
        {/* Top Ocular Header HUD */}
        <header className="flex items-center justify-between z-20 bg-slate-900/80 backdrop-blur-md p-3 md:px-5 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
              🔬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-bold text-white tracking-tight">
                  {selectedSpecimen.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {magnificationFactor}x Total
                </span>
                <span className="hidden sm:inline text-[10px] text-slate-400 italic">
                  ({selectedSpecimen.scientificName})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Stain: {selectedSpecimen.stain} &bull; Focus Sharpness: {Math.round(sharpness * 100)}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureSnapshot}
              className="px-3 md:px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Snapshot</span>
            </button>

            {onAskAI && (
              <button
                onClick={() =>
                  onAskAI(
                    `I am observing ${selectedSpecimen.name} (${selectedSpecimen.scientificName}) under ${magnificationFactor}x magnification with ${selectedSpecimen.stain}. What key cellular organelles and diagnostic features should I look for?`,
                    `Specimen: ${selectedSpecimen.name}, Magnification: ${magnificationFactor}x, Sharpness: ${Math.round(sharpness * 100)}%`
                  )
                }
                className="hidden sm:flex px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-medium items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ask Dr. Curie</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 md:px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Back to Bench [ESC]</span>
            </button>
          </div>
        </header>

        {/* Central Circular Eyepiece Field */}
        <div className="relative flex-1 flex items-center justify-center my-2">
          {/* Eyepiece Circular Diaphragm Rim */}
          <div className="relative w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] md:w-[500px] md:h-[500px] rounded-full overflow-hidden border-[10px] sm:border-[14px] border-slate-900 shadow-[0_0_80px_rgba(0,0,0,0.9)_inset,0_0_40px_rgba(16,185,129,0.15)] bg-black">
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              className="w-full h-full object-cover"
            />
            {/* Outer Dark Aperture Mask */}
            <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.85)] border border-slate-700/40" />
          </div>

          {/* Floating Focus Accuracy Gauge */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center bg-slate-900/80 backdrop-blur p-3 rounded-2xl border border-slate-800 shadow-xl space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Sharpness
            </span>
            <div className="w-3 h-36 bg-slate-950 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-slate-800">
              <div
                className={`w-full rounded-full transition-all ${
                  sharpness > 0.85 ? 'bg-emerald-400' : sharpness > 0.5 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ height: `${Math.round(sharpness * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-white">
              {Math.round(sharpness * 100)}%
            </span>
          </div>
        </div>

        {/* Bottom Interactive Optical Controls Bar */}
        <footer className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-2xl z-20 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Specimen Slide Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Slide:</span>
            {SPECIMEN_CATALOG.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  soundFx.playGlassSlide();
                  setSelectedSpecimenId(s.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                  selectedSpecimenId === s.id
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Objective Lenses */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Turret:</span>
            {(['4x', '10x', '40x', '100x'] as const).map((obj) => (
              <button
                key={obj}
                onClick={() => handleObjectiveChange(obj)}
                className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold transition-all ${
                  objective === obj
                    ? obj === '4x'
                      ? 'bg-red-500 text-white shadow'
                      : obj === '10x'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : obj === '40x'
                      ? 'bg-blue-500 text-white shadow'
                      : 'bg-slate-100 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {obj}
              </button>
            ))}
          </div>

          {/* Quick Knobs */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            {/* Coarse Focus Slider */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono">Coarse:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={coarseFocus}
                onChange={(e) => {
                  soundFx.playKnobTick();
                  setCoarseFocus(parseFloat(e.target.value));
                }}
                className="w-20 sm:w-24 accent-emerald-400"
              />
            </div>

            {/* Fine Focus Slider */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono">Fine:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={fineFocus}
                onChange={(e) => {
                  soundFx.playKnobTick();
                  setFineFocus(parseFloat(e.target.value));
                }}
                className="w-20 sm:w-24 accent-emerald-400"
              />
            </div>

            {/* 100x Immersion Oil Toggle */}
            {objective === '100x' && (
              <button
                onClick={() => {
                  soundFx.playDropLiquid();
                  setImmersionOil(!immersionOil);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                  immersionOil
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-amber-300 border-amber-500/40 animate-pulse'
                }`}
              >
                {immersionOil ? 'Oil Applied' : '+ Immersion Oil'}
              </button>
            )}

            {/* Micrometer Scale Toggle */}
            <button
              onClick={() => {
                soundFx.playClick();
                setShowMicrometer(!showMicrometer);
              }}
              className={`p-1.5 rounded-lg border ${
                showMicrometer
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle Micrometer Grid"
            >
              <Compass className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
