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
import { labStore, useLab, microscopeSharpness } from '@/lib/labStore';
import { SnapshotItem } from '@/components/LabNotebookModal';

interface EyepieceOcularOverlayProps {
  onClose: () => void;
  onSaveSnapshot: (snapshot: SnapshotItem) => void;
  onAskAI?: (prompt: string, context: string) => void;
}

export default function EyepieceOcularOverlay({
  onClose,
  onSaveSnapshot,
  onAskAI,
}: EyepieceOcularOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Optical State
  // Optics live in the shared lab store, so the 3D microscope, this view, experiments and Dr. Curie agree
  const bio = useLab((st) => st.biology);
  const selectedSpecimenId = (SPECIMEN_CATALOG[bio.slideIndex] || SPECIMEN_CATALOG[0]).id;
  const { objective, coarseFocus, fineFocus, lightIntensity, immersionOil } = bio;
  const setSelectedSpecimenId = (id: string) =>
    labStore.update('biology', { slideIndex: Math.max(0, SPECIMEN_CATALOG.findIndex((sp) => sp.id === id)) });
  const setObjective = (o: '4x' | '10x' | '40x' | '100x') => labStore.update('biology', { objective: o });
  const setCoarseFocus = (v: number) => labStore.update('biology', { coarseFocus: v });
  const setFineFocus = (v: number) => labStore.update('biology', { fineFocus: v });
  const setImmersionOil = (v: boolean) => labStore.update('biology', { immersionOil: v });
  const [stageX, setStageX] = useState<number>(0);
  const [stageY, setStageY] = useState<number>(0);
  const [diaphragmAperture, setDiaphragmAperture] = useState<number>(0.8);
  const [showMicrometer, setShowMicrometer] = useState<boolean>(false);
  const [capturedFlash, setCapturedFlash] = useState<boolean>(false);

  const selectedSpecimen = SPECIMEN_CATALOG.find((s) => s.id === selectedSpecimenId) || SPECIMEN_CATALOG[0];

  const magnificationFactor = objective === '4x' ? 40 : objective === '10x' ? 100 : objective === '40x' ? 400 : 1000;

  // Optical focus sharpness (shared model)
  const sharpness = microscopeSharpness(bio);

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
      1, // drawn sharp; focus blur is applied by the GPU (CSS filter) so focusing never redraws
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
    lightIntensity,
    diaphragmAperture,
    showMicrometer,
  ]);

  useEffect(() => {
    renderEyepiece();
  }, [renderEyepiece]);

  const handleObjectiveChange = (newObj: '4x' | '10x' | '40x' | '100x') => {
    soundFx.playLensTurretClick();
    setObjective(newObj);
  };

  // Out-of-focus blur (canvas pixels), same curve as before
  const blurPx = sharpness < 0.95 ? (1 - sharpness) * 16 : 0;

  const handleCaptureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    soundFx.playClick();
    setCapturedFlash(true);
    setTimeout(() => setCapturedFlash(false), 250);

    // The snapshot shows exactly what the student sees: blur a copy once, at capture time
    const shot = document.createElement('canvas');
    shot.width = canvas.width;
    shot.height = canvas.height;
    const sctx = shot.getContext('2d')!;
    sctx.filter = blurPx > 0.1 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
    sctx.drawImage(canvas, 0, 0);
    const dataUrl = shot.toDataURL('image/jpeg', 0.85);
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

  // ---- Focusing like a real microscope ----
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const nudge = (kind: 'coarse' | 'fine', dir: 1 | -1) => {
    const b = labStore.get().biology;
    if (kind === 'coarse') setCoarseFocus(clamp01(b.coarseFocus + dir * 0.012));
    else setFineFocus(clamp01(b.fineFocus + dir * 0.02));
  };
  // Hold a button to keep turning the knob
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startHold = (kind: 'coarse' | 'fine', dir: 1 | -1) => {
    nudge(kind, dir);
    soundFx.playKnobTick();
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = setInterval(() => nudge(kind, dir), 60);
  };
  const stopHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
  };
  useEffect(() => stopHold, []);

  // Scroll = fine focus, Shift+scroll = coarse; drag = move the slide on the stage
  const onWheel = (e: React.WheelEvent) => {
    const dir = e.deltaY < 0 ? 1 : -1;
    nudge(e.shiftKey ? 'coarse' : 'fine', dir);
  };
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const k = 1 / magnificationFactor;
    setStageX((v) => Math.max(-1, Math.min(1, v - (e.clientX - drag.current!.x) * k)));
    setStageY((v) => Math.max(-1, Math.min(1, v - (e.clientY - drag.current!.y) * k)));
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  // Keyboard: arrows = coarse, +/- = fine, 1-4 = objectives, Space = snapshot
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') nudge('coarse', 1);
      else if (e.key === 'ArrowDown') nudge('coarse', -1);
      else if (e.key === '+' || e.key === '=') nudge('fine', 1);
      else if (e.key === '-') nudge('fine', -1);
      else if (['1', '2', '3', '4'].includes(e.key)) handleObjectiveChange((['4x', '10x', '40x', '100x'] as const)[Number(e.key) - 1]);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // What to do next, in plain words (the same guidance Dr. Curie gives at the bench)
  const effective = coarseFocus * 0.8 + fineFocus * 0.2;
  const diff = selectedSpecimen.optimalFocusHeight - effective;
  const hint =
    objective === '100x' && !immersionOil
      ? { tone: 'warn', text: '100× is an oil-immersion lens: add a drop of immersion oil, then fine-focus.' }
      : sharpness > 0.85
        ? { tone: 'good', text: 'In focus. Take a snapshot for your notebook.' }
        : Math.abs(diff) > 0.03
          ? { tone: 'info', text: `Blurry: turn the COARSE focus ${diff > 0 ? 'up ▲' : 'down ▼'} (or Shift + scroll).` }
          : { tone: 'info', text: `Nearly there: use the FINE focus ${diff > 0 ? 'up ▲' : 'down ▼'} (or scroll).` };

  const knob = (kind: 'coarse' | 'fine', label: string) => (
    <div className="flex items-center gap-2">
      <span className="w-14 text-xs text-slate-300">{label}</span>
      <button
        onPointerDown={() => startHold(kind, -1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-teal-700 text-sm font-bold"
        aria-label={`${label} down`}
      >
        ▼
      </button>
      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full bg-teal-500" style={{ width: `${(kind === 'coarse' ? coarseFocus : fineFocus) * 100}%` }} />
      </div>
      <button
        onPointerDown={() => startHold(kind, 1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-teal-700 text-sm font-bold"
        aria-label={`${label} up`}
      >
        ▲
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 select-none text-slate-100 flex flex-col landscape:flex-row lg:flex-row overflow-hidden">
      {capturedFlash && <div className="absolute inset-0 bg-white/80 z-50 pointer-events-none" />}

      {/* Eyepiece: always sized to fit the screen */}
      <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center p-3 gap-2">
        <div className="text-center leading-tight">
          <p className="text-sm font-semibold">
            {selectedSpecimen.name} <span className="text-teal-300 font-normal">· {magnificationFactor}× total</span>
          </p>
          <p className="text-xs text-slate-400">{selectedSpecimen.stain}</p>
        </div>
        <div
          className="relative rounded-full overflow-hidden border-8 border-slate-900 shadow-[0_0_60px_rgba(0,0,0,0.9)_inset] bg-black cursor-grab active:cursor-grabbing touch-none"
          style={{ width: 'min(78dvh, 92vw, 640px)', height: 'min(78dvh, 92vw, 640px)', maxHeight: 'calc(100dvh - 7rem)', maxWidth: 'calc(100dvh - 7rem)' }}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <canvas ref={canvasRef} width={600} height={600} className="w-full h-full" style={{ filter: blurPx > 0.1 ? `blur(${(blurPx * 1.05).toFixed(1)}px)` : undefined }} />
          <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.85)]" />
        </div>
        <p className="text-[11px] text-slate-500 hidden sm:block [@media(max-height:500px)]:hidden">Scroll: fine focus · Shift+scroll: coarse · Drag: move slide · 1–4: objectives</p>
      </div>

      {/* Controls: always visible, scroll inside if the screen is short */}
      <aside className="w-full landscape:w-72 lg:w-80 max-h-[45dvh] landscape:max-h-none lg:max-h-none overflow-y-auto bg-slate-900 border-t landscape:border-t-0 landscape:border-l lg:border-t-0 lg:border-l border-slate-800 p-4 landscape:p-3 flex flex-col gap-4 landscape:gap-2.5">
        <div
          className={`rounded-xl px-3 py-2 text-sm border ${
            hint.tone === 'good' ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200' : hint.tone === 'warn' ? 'bg-amber-950/60 border-amber-700 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          {hint.text}
        </div>

        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Sharpness</span>
            <span className="tabular-nums">{Math.round(sharpness * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className={`h-full transition-all ${sharpness > 0.85 ? 'bg-emerald-500' : sharpness > 0.5 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${Math.max(2, sharpness * 100)}%` }} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {knob('coarse', 'Coarse')}
          {knob('fine', 'Fine')}
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-1.5">Objective lens</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(['4x', '10x', '40x', '100x'] as const).map((o) => (
              <button
                key={o}
                onClick={() => handleObjectiveChange(o)}
                className={`py-2 rounded-lg text-sm font-mono font-semibold border ${objective === o ? 'bg-teal-600 border-teal-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {objective === '100x' && (
          <button
            onClick={() => {
              setImmersionOil(!immersionOil);
              soundFx.playDropLiquid();
            }}
            className={`py-2 rounded-lg text-sm font-semibold border ${immersionOil ? 'bg-amber-600/30 border-amber-500 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
          >
            {immersionOil ? 'Immersion oil applied ✓' : 'Add immersion oil'}
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            Slide
            <select
              value={selectedSpecimenId}
              onChange={(e) => {
                setSelectedSpecimenId(e.target.value);
                soundFx.playGlassSlide();
              }}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100"
            >
              {SPECIMEN_CATALOG.map((sp: SpecimenInfo) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Light
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={diaphragmAperture}
              onChange={(e) => setDiaphragmAperture(parseFloat(e.target.value))}
              className="mt-2.5 w-full accent-teal-400"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={showMicrometer} onChange={(e) => setShowMicrometer(e.target.checked)} className="accent-teal-400" />
          Show eyepiece scale (graticule)
        </label>

        <div className="mt-auto flex flex-col gap-2 pt-2 sticky bottom-0 bg-slate-900 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:[&>button]:flex-1 [@media(max-height:500px)]:[&>button]:py-2">
          <button onClick={handleCaptureSnapshot} className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold flex items-center justify-center gap-2">
            <Camera className="w-4 h-4 shrink-0" /> <span>Snapshot<span className="[@media(max-height:500px)]:hidden"> to notebook</span></span>
          </button>
          {onAskAI && (
            <button
              onClick={() =>
                onAskAI(
                  `I am observing ${selectedSpecimen.name} (${selectedSpecimen.scientificName}) under ${magnificationFactor}x magnification with ${selectedSpecimen.stain}. What key cellular organelles and diagnostic features should I look for?`,
                  `Specimen: ${selectedSpecimen.name}, Magnification: ${magnificationFactor}x, Sharpness: ${Math.round(sharpness * 100)}%`
                )
              }
              className="py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-sm text-indigo-100 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 shrink-0" /> <span>Ask<span className="[@media(max-height:500px)]:hidden"> Dr. Curie</span></span>
            </button>
          )}
          <button onClick={onClose} className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm flex items-center justify-center gap-2">
            <X className="w-4 h-4 shrink-0" /> <span>Back<span className="[@media(max-height:500px)]:hidden"> to bench (Esc)</span></span>
          </button>
        </div>
      </aside>
    </div>
  );
}
