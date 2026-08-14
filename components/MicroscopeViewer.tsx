'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Sun,
  Sliders,
  Camera,
  Info,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Eye,
  Crosshair,
  Volume2,
  VolumeX,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { SPECIMENS, OBJECTIVE_LENSES, SpecimenData, ObjectiveLens, CellStructureAnnotation } from '@/lib/specimens';
import { soundFx } from '@/lib/soundEffects';

interface MicroscopeViewerProps {
  onExit: () => void;
  onSaveSnapshot?: (snapshot: {
    title: string;
    specimenId: string;
    magnification: string;
    imageUrl: string;
    notes: string;
    timestamp: string;
  }) => void;
  onAskAI?: (prompt: string, context: string) => void;
}

export default function MicroscopeViewer({ onExit, onSaveSnapshot, onAskAI }: MicroscopeViewerProps) {
  // State
  const [selectedSpecimen, setSelectedSpecimen] = useState<SpecimenData>(SPECIMENS[0]);
  const [selectedLensIndex, setSelectedLensIndex] = useState<number>(1); // 10x by default (100x total)
  const [coarseFocus, setCoarseFocus] = useState<number>(0.50);
  const [fineFocus, setFineFocus] = useState<number>(0.50);
  const [stageX, setStageX] = useState<number>(0); // offset in micrometers
  const [stageY, setStageY] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(0.85);
  const [diaphragm, setDiaphragm] = useState<number>(0.80);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [showReticle, setShowReticle] = useState<boolean>(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<CellStructureAnnotation | null>(null);
  const [isSlideDrawerOpen, setIsSlideDrawerOpen] = useState<boolean>(false);
  const [cyclosisAngle, setCyclosisAngle] = useState<number>(0);
  const [ciliaPhase, setCiliaPhase] = useState<number>(0);
  const [flashSnapshot, setFlashSnapshot] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const currentLens: ObjectiveLens = OBJECTIVE_LENSES[selectedLensIndex];
  const combinedFocus = (coarseFocus * 0.85) + (fineFocus * 0.15);
  const focusDiff = Math.abs(combinedFocus - selectedSpecimen.optimalFocus);
  const focusRatio = Math.min(1, focusDiff / selectedSpecimen.focalTolerance);
  // True optical blur radius (0 when in perfect focus, higher as focal plane shifts away)
  const opticalBlur = focusRatio * (currentLens.power === 4 ? 4 : currentLens.power === 10 ? 8 : currentLens.power === 40 ? 18 : 28);
  const isSharp = focusRatio < 0.15;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 2800);
  };

  // Switch Lens
  const handleLensChange = (index: number) => {
    setSelectedLensIndex(index);
    soundFx.playLensTurretClick();
    showToast(`Switched to ${OBJECTIVE_LENSES[index].name} (${OBJECTIVE_LENSES[index].totalMagnification}x Total)`);
  };

  // Specimen Change
  const handleSpecimenChange = (specimen: SpecimenData) => {
    setSelectedSpecimen(specimen);
    setCoarseFocus(Math.max(0.2, specimen.optimalFocus - 0.22));
    setFineFocus(0.5);
    setStageX(0);
    setStageY(0);
    setSelectedAnnotation(null);
    soundFx.playClick();
    showToast(`Loaded: ${specimen.title}`);
  };

  // Animation loop for living specimens (cyclosis in Elodea, cilia beat in Paramecium)
  useEffect(() => {
    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      setCyclosisAngle((prev) => (prev + dt * 0.6) % (Math.PI * 2));
      setCiliaPhase((prev) => (prev + dt * 14) % (Math.PI * 2));
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      } else if (e.key === 'ArrowUp') {
        setStageY((y) => y - 10);
      } else if (e.key === 'ArrowDown') {
        setStageY((y) => y + 10);
      } else if (e.key === 'ArrowLeft') {
        setStageX((x) => x - 10);
      } else if (e.key === 'ArrowRight') {
        setStageX((x) => x + 10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  // Helper: Draw Onion Epidermal Cells
  const drawOnionCells = (ctx: CanvasRenderingContext2D) => {
    const rows = 12;
    const cols = 8;
    const cellW = 160;
    const cellH = 75;

    for (let r = -rows; r <= rows; r++) {
      for (let c = -cols; c <= cols; c++) {
        const x = c * cellW + (r % 2 === 0 ? 0 : cellW / 2);
        const y = r * cellH;

        // Cell Wall (Pectin & Cellulose)
        ctx.strokeStyle = '#8d5b1b';
        ctx.lineWidth = 4;
        ctx.fillStyle = (r + c) % 3 === 0 ? '#faedd2' : '#fcf3df';
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, cellW - 6, cellH - 6, 8);
        ctx.fill();
        ctx.stroke();

        // Inner plasma membrane line
        ctx.strokeStyle = '#c2893f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x + 7, y + 7, cellW - 14, cellH - 14, 5);
        ctx.stroke();

        // Stained Nucleus
        const nucX = x + cellW * 0.45 + (Math.sin(r * 3 + c) * 15);
        const nucY = y + cellH * 0.5 + (Math.cos(r * 2 + c) * 10);
        const nucR = 12;

        ctx.fillStyle = '#6b3e0c';
        ctx.beginPath();
        ctx.arc(nucX, nucY, nucR, 0, Math.PI * 2);
        ctx.fill();

        // Dense Nucleolus inside
        ctx.fillStyle = '#3a1f03';
        ctx.beginPath();
        ctx.arc(nucX + 2, nucY - 1, 4, 0, Math.PI * 2);
        ctx.fill();

        // Cytoplasmic strands stretching across central vacuole
        ctx.strokeStyle = 'rgba(170, 120, 60, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(nucX - nucR, nucY);
        ctx.lineTo(x + 10, y + cellH * 0.3);
        ctx.moveTo(nucX + nucR, nucY);
        ctx.lineTo(x + cellW - 10, y + cellH * 0.7);
        ctx.stroke();
      }
    }
  };

  // Helper: Draw Blood Smear
  const drawBloodSmear = (ctx: CanvasRenderingContext2D) => {
    // Red Blood Cells (Biconcave Discs)
    const seedPositions = [
      { x: -140, y: -90 }, { x: -80, y: -130 }, { x: 20, y: -110 }, { x: 120, y: -80 },
      { x: -160, y: -10 }, { x: -70, y: -30 }, { x: 30, y: -20 }, { x: 140, y: -10 },
      { x: -120, y: 70 }, { x: -40, y: 80 }, { x: 60, y: 70 }, { x: 150, y: 80 },
      { x: -180, y: 130 }, { x: -60, y: 150 }, { x: 40, y: 140 }, { x: 120, y: 150 },
      { x: -10, y: 0 }, { x: -110, y: -60 }, { x: 80, y: -60 }, { x: -90, y: 30 },
      { x: 100, y: 40 }, { x: 0, y: -80 }, { x: 0, y: 80 }
    ];

    seedPositions.forEach((pos) => {
      const r = 24;
      const grad = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, r);
      grad.addColorStop(0, '#f9c5d1'); // central pallor
      grad.addColorStop(0.5, '#e05370');
      grad.addColorStop(1, '#a82c47');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Segmented Neutrophil (White Blood Cell)
    const neuX = 15;
    const neuY = 10;
    const neuR = 40;

    ctx.fillStyle = 'rgba(230, 220, 245, 0.9)';
    ctx.beginPath();
    ctx.arc(neuX, neuY, neuR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9980FA';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Multi-lobed nucleus in neutrophil (deep violet-purple)
    ctx.fillStyle = '#481c7e';
    const lobes = [
      { x: neuX - 12, y: neuY - 10, r: 11 },
      { x: neuX + 12, y: neuY - 8, r: 10 },
      { x: neuX + 4, y: neuY + 12, r: 12 },
    ];
    lobes.forEach((l) => {
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    });
    // Chromatin bridges
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#481c7e';
    ctx.beginPath();
    ctx.moveTo(lobes[0].x, lobes[0].y);
    ctx.lineTo(lobes[1].x, lobes[1].y);
    ctx.lineTo(lobes[2].x, lobes[2].y);
    ctx.stroke();

    // Platelet Clusters (Thrombocytes)
    const platelets = [
      { x: -90, y: -10 }, { x: -84, y: -6 }, { x: 75, y: -110 }, { x: 80, y: -105 }
    ];
    ctx.fillStyle = '#7158e2';
    platelets.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // Helper: Draw Paramecium
  const drawParamecium = (ctx: CanvasRenderingContext2D, cPhase: number) => {
    ctx.save();
    ctx.rotate(0.2);

    // Cilia fringe around boundary
    ctx.strokeStyle = '#74b9ff';
    ctx.lineWidth = 1.5;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.08) {
      const len = 12 + Math.sin(angle * 12 + cPhase) * 3;
      const x1 = Math.cos(angle) * 120;
      const y1 = Math.sin(angle) * 55;
      const x2 = Math.cos(angle) * (120 + len);
      const y2 = Math.sin(angle) * (55 + len);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Slipper-shaped pellicle body
    const bodyGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 110);
    bodyGrad.addColorStop(0, '#dff9fb');
    bodyGrad.addColorStop(0.7, '#c7ecee');
    bodyGrad.addColorStop(1, '#81ecec');

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#00cec9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 120, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Oral groove / Cytostome
    ctx.fillStyle = '#55efc4';
    ctx.beginPath();
    ctx.ellipse(-15, 12, 45, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Large kidney-shaped Macronucleus
    ctx.fillStyle = '#0984e3';
    ctx.beginPath();
    ctx.ellipse(-5, -6, 28, 16, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Micronucleus beside it
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(18, -12, 5, 0, Math.PI * 2);
    ctx.fill();

    // Contractile Vacuoles with radial canals
    [-60, 60].forEach((vx) => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0984e3';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(vx, -10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (let r = 0; r < 6; r++) {
        const rad = (r * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(vx + Math.cos(rad) * 6, -10 + Math.sin(rad) * 6);
        ctx.lineTo(vx + Math.cos(rad) * 18, -10 + Math.sin(rad) * 18);
        ctx.stroke();
      }
    });

    // Food Vacuoles
    const foodVacs = [
      { x: -35, y: -20, r: 8, col: '#fab1a0' },
      { x: 30, y: 15, r: 10, col: '#ffeaa7' },
      { x: -20, y: 25, r: 7, col: '#fdcb6e' },
      { x: 45, y: -15, r: 9, col: '#a29bfe' },
    ];
    foodVacs.forEach((fv) => {
      ctx.fillStyle = fv.col;
      ctx.beginPath();
      ctx.arc(fv.x, fv.y, fv.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  // Helper: Draw Elodea Leaf Chloroplasts with Cytoplasmic Streaming (Cyclosis)
  const drawElodeaLeaf = (ctx: CanvasRenderingContext2D, cAngle: number) => {
    const cells = [
      { x: -160, y: -100, w: 150, h: 90 },
      { x: 0, y: -100, w: 150, h: 90 },
      { x: -160, y: 0, w: 150, h: 90 },
      { x: 0, y: 0, w: 150, h: 90 },
      { x: -160, y: 100, w: 150, h: 90 },
      { x: 0, y: 100, w: 150, h: 90 },
    ];

    cells.forEach((cell) => {
      // Cell wall
      ctx.strokeStyle = '#1b7837';
      ctx.lineWidth = 5;
      ctx.fillStyle = '#eaf7ea';
      ctx.beginPath();
      ctx.roundRect(cell.x + 3, cell.y + 3, cell.w - 6, cell.h - 6, 6);
      ctx.fill();
      ctx.stroke();

      // Chloroplasts circulating along the periphery (cyclosis)
      const numPlasts = 14;
      const rx = (cell.w - 30) / 2;
      const ry = (cell.h - 26) / 2;
      const cx = cell.x + cell.w / 2;
      const cy = cell.y + cell.h / 2;

      for (let i = 0; i < numPlasts; i++) {
        const a = (i * Math.PI * 2) / numPlasts + cAngle;
        const px = cx + Math.cos(a) * rx;
        const py = cy + Math.sin(a) * ry;

        // Chloroplast disc
        ctx.fillStyle = '#27ae60';
        ctx.strokeStyle = '#1e824c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(px, py, 9, 6, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Internal thylakoid grana dot
        ctx.fillStyle = '#145a32';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  };

  // Helper: Draw Bacteria Culture (Bacillus)
  const drawBacteriaCulture = (ctx: CanvasRenderingContext2D) => {
    const rods = [
      { x: -100, y: -70, rot: 0.4 }, { x: -80, y: -45, rot: 0.8 }, { x: -40, y: -60, rot: -0.2 },
      { x: 30, y: -90, rot: 1.1 }, { x: 70, y: -80, rot: 0.9 }, { x: 110, y: -60, rot: 0.7 },
      { x: -120, y: 10, rot: -0.5 }, { x: -60, y: 30, rot: 0.1 }, { x: 0, y: 20, rot: -0.7 },
      { x: 50, y: 40, rot: 0.6 }, { x: 90, y: 30, rot: 1.2 }, { x: 130, y: 50, rot: 0.3 },
      { x: -90, y: 110, rot: 0.2 }, { x: -40, y: 120, rot: -0.4 }, { x: 20, y: 100, rot: 0.5 },
      { x: 80, y: 120, rot: -0.1 }, { x: 120, y: 110, rot: 0.8 }
    ];

    rods.forEach((r) => {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);

      ctx.fillStyle = '#5f27cd';
      ctx.strokeStyle = '#341f97';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-22, -8, 44, 16, 8);
      ctx.fill();
      ctx.stroke();

      // Endospore inside rod
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(8, 0, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  };

  // Helper: Reticle Crosshairs & Micrometer
  const drawMicroscopeReticle = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.strokeStyle = 'rgba(235, 77, 75, 0.65)';
    ctx.lineWidth = 1;

    // Crosshair Lines
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Scale ticks along X axis
    const tickSpacing = 20;
    const numTicks = Math.floor(r / tickSpacing);
    for (let i = -numTicks; i <= numTicks; i++) {
      const tx = cx + i * tickSpacing;
      const isMajor = i % 5 === 0;
      const tHeight = isMajor ? 12 : 6;
      ctx.beginPath();
      ctx.moveTo(tx, cy - tHeight);
      ctx.lineTo(tx, cy + tHeight);
      ctx.stroke();
    }
  };

  // Master Canvas Drawing Routine
  const drawSpecimen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.46;

    // Clear background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Create Circular Ocular Clipping Mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // Base illumination color modified by brightness and diaphragm
    const lightLevel = brightness * diaphragm;
    const baseColor = selectedSpecimen.colorTheme.background;
    ctx.fillStyle = baseColor;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

    // Apply optical blur filter based on focal distance
    if (opticalBlur > 0.4) {
      ctx.filter = `blur(${opticalBlur.toFixed(1)}px)`;
    } else {
      ctx.filter = 'none';
    }

    // Coordinate transformation based on magnification and stage movement
    ctx.save();
    ctx.translate(centerX, centerY);

    // Scale according to objective lens power
    const zoomScale = currentLens.power / 4; // 1x at 4x, 2.5x at 10x, 10x at 40x, 25x at 100x
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-stageX * 0.8, -stageY * 0.8);

    // Render biological specimen specifics
    if (selectedSpecimen.id === 'onion_epidermis') {
      drawOnionCells(ctx);
    } else if (selectedSpecimen.id === 'human_blood') {
      drawBloodSmear(ctx);
    } else if (selectedSpecimen.id === 'paramecium_protist') {
      drawParamecium(ctx, ciliaPhase);
    } else if (selectedSpecimen.id === 'elodea_chloroplasts') {
      drawElodeaLeaf(ctx, cyclosisAngle);
    } else if (selectedSpecimen.id === 'bacillus_bacteria') {
      drawBacteriaCulture(ctx);
    }

    ctx.restore(); // restore zoom & translation
    ctx.filter = 'none';

    // Ocular Aperture Edge Lighting & Vignette
    const vignetteGrad = ctx.createRadialGradient(
      centerX, centerY, radius * 0.72,
      centerX, centerY, radius
    );
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(0.85, 'rgba(10, 15, 25, 0.4)');
    vignetteGrad.addColorStop(1, 'rgba(5, 8, 15, 0.95)');

    ctx.fillStyle = vignetteGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Iris Diaphragm Glare & Transmittance Ring
    const glareGrad = ctx.createRadialGradient(
      centerX - radius * 0.35, centerY - radius * 0.35, 10,
      centerX, centerY, radius
    );
    glareGrad.addColorStop(0, `rgba(255, 255, 255, ${0.12 * lightLevel})`);
    glareGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.02)');
    glareGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');

    ctx.fillStyle = glareGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Reticle Crosshairs & Micrometer scale overlay if enabled
    if (showReticle) {
      drawMicroscopeReticle(ctx, centerX, centerY, radius);
    }

    ctx.restore(); // restore circular clipping

    // Outer Ocular Eyepiece Housing (matte black metal rim)
    ctx.save();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1e232f';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a4459';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

  }, [
    selectedSpecimen,
    currentLens,
    opticalBlur,
    stageX,
    stageY,
    brightness,
    diaphragm,
    showReticle,
    cyclosisAngle,
    ciliaPhase,
  ]);

  // Redraw when dependencies change
  useEffect(() => {
    drawSpecimen();
  }, [drawSpecimen]);

  // Take Lab Snapshot
  const handleTakeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundFx.playBeep();
    setFlashSnapshot(true);
    setTimeout(() => setFlashSnapshot(false), 250);

    const dataUrl = canvas.toDataURL('image/png');
    if (onSaveSnapshot) {
      onSaveSnapshot({
        title: `${selectedSpecimen.title} @ ${currentLens.totalMagnification}x`,
        specimenId: selectedSpecimen.id,
        magnification: `${currentLens.totalMagnification}x (${currentLens.name})`,
        imageUrl: dataUrl,
        notes: `Observed ${selectedSpecimen.keyStructures.join(', ')} under ${selectedSpecimen.stainType}. Focus index: ${(combinedFocus * 100).toFixed(0)}%.`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    showToast('📸 Snapshot captured and saved to Lab Notebook!');
  };

  // Ask AI about current specimen observation
  const handleAskAIAboutSpecimen = () => {
    if (onAskAI) {
      onAskAI(
        `I am viewing "${selectedSpecimen.title}" under a ${currentLens.totalMagnification}x objective lens with ${selectedSpecimen.stainType}. Can you explain what key cellular structures I should look for and their biological function?`,
        `Specimen: ${selectedSpecimen.title} (${selectedSpecimen.scientificName}). Total Magnification: ${currentLens.totalMagnification}x. Stain: ${selectedSpecimen.stainType}.`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Bar Header */}
      <header className="h-16 px-6 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
            🔬
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              Optical Compound Microscope
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live View
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {selectedSpecimen.title} &bull; <span className="text-slate-300 italic">{selectedSpecimen.scientificName}</span>
            </p>
          </div>
        </div>

        {/* Center Quick Lens Indicators */}
        <div className="hidden md:flex items-center space-x-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          {OBJECTIVE_LENSES.map((lens, idx) => {
            const isActive = selectedLensIndex === idx;
            return (
              <button
                key={lens.name}
                onClick={() => handleLensChange(idx)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-600'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-600"
                  style={{ backgroundColor: lens.ringColor }}
                />
                <span>{lens.power}x</span>
                <span className="text-[10px] text-slate-400 font-mono">({lens.totalMagnification}x)</span>
              </button>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              const muted = soundFx.toggleMute();
              setIsMuted(muted);
            }}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-700"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsSlideDrawerOpen(!isSlideDrawerOpen)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
              isSlideDrawerOpen
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Slide Box ({SPECIMENS.length})</span>
          </button>

          <button
            onClick={onExit}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 hover:text-rose-300 hover:border-rose-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Exit Microscope [ESC]</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Slide Box Drawer & Specimen Info */}
        <AnimatePresence>
          {isSlideDrawerOpen && (
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-80 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 p-4 flex flex-col gap-3 z-30 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  Prepared Slide Collection
                </h3>
                <button
                  onClick={() => setIsSlideDrawerOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                {SPECIMENS.map((sp) => {
                  const isSelected = selectedSpecimen.id === sp.id;
                  return (
                    <div
                      key={sp.id}
                      onClick={() => handleSpecimenChange(sp)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          {sp.category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400">
                          {sp.difficulty}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-100">{sp.title}</h4>
                      <p className="text-xs text-slate-400 italic mb-2">{sp.scientificName}</p>
                      <div className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {sp.summary}
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Stain: {sp.stainType}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Center: Live Ocular Viewport Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-radial from-slate-900 to-slate-950">
          {/* Flash animation on snapshot */}
          {flashSnapshot && (
            <div className="absolute inset-0 bg-white/70 pointer-events-none z-40 transition-opacity" />
          )}

          {/* Focal Status Bar indicator */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 backdrop-blur px-4 py-1.5 rounded-full border border-slate-800 text-xs z-10">
            <span className="text-slate-400">Focal Plane:</span>
            <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-150 ${
                  isSharp ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(10, (1 - focusRatio) * 100)}%` }}
              />
            </div>
            <span className={`font-mono text-xs font-semibold ${isSharp ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isSharp ? '✓ Sharp Focus' : 'Blurry (Adjust Knobs)'}
            </span>
          </div>

          {/* Master Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={700}
              height={700}
              className="max-w-[85vw] max-h-[66vh] aspect-square rounded-full shadow-2xl cursor-grab active:cursor-grabbing border border-slate-800/80"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startY = e.clientY;
                const origStageX = stageX;
                const origStageY = stageY;

                const onMouseMove = (moveEvent: MouseEvent) => {
                  const dx = (moveEvent.clientX - startX) * 0.4;
                  const dy = (moveEvent.clientY - startY) * 0.4;
                  setStageX(origStageX + dx);
                  setStageY(origStageY + dy);
                };

                const onMouseUp = () => {
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }}
            />

            {/* Specimen Cellular Structure Labels overlay */}
            {showAnnotations && isSharp && (
              <div className="absolute inset-0 pointer-events-none">
                {selectedSpecimen.annotations
                  .filter((a) => currentLens.power >= a.minMagnification)
                  .map((ann) => {
                    return (
                      <button
                        key={ann.id}
                        onClick={() => {
                          setSelectedAnnotation(ann);
                          soundFx.playClick();
                        }}
                        style={{
                          left: `${ann.xPct}%`,
                          top: `${ann.yPct}%`,
                        }}
                        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group flex items-center gap-1.5 bg-slate-900/90 text-white text-[11px] font-medium px-2.5 py-1 rounded-full border border-emerald-500/50 shadow-lg hover:bg-emerald-900/60 hover:scale-105 transition-all"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>{ann.name}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Bottom HUD: Micrometer Scale Bar & View Overlays */}
          <div className="mt-4 flex items-center justify-between w-full max-w-xl px-4 py-2 bg-slate-900/70 backdrop-blur rounded-xl border border-slate-800/80 text-xs text-slate-400">
            {/* Micrometer Scale Bar */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className="w-20 h-1.5 bg-slate-300 relative border-x-2 border-slate-100">
                  <div className="absolute -top-1 left-0 w-0.5 h-3 bg-white" />
                  <div className="absolute -top-1 right-0 w-0.5 h-3 bg-white" />
                </div>
                <span className="text-[10px] font-mono text-slate-300 mt-1">
                  {(selectedSpecimen.baseMicronsWidth / currentLens.power).toFixed(0)} µm
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">| Total: {currentLens.totalMagnification}x</span>
            </div>

            {/* Quick View Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAnnotations(!showAnnotations)}
                className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 border transition-all ${
                  showAnnotations
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600/60'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle cellular labels"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Labels</span>
              </button>

              <button
                onClick={() => setShowReticle(!showReticle)}
                className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 border transition-all ${
                  showReticle
                    ? 'bg-rose-950 text-rose-300 border-rose-600/60'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle micrometer reticle"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Reticle</span>
              </button>

              <button
                onClick={handleTakeSnapshot}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture</span>
              </button>

              <button
                onClick={handleAskAIAboutSpecimen}
                className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Analyze (AI)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Microscope Optical & Mechanical Controls */}
        <aside className="w-80 bg-slate-900/90 backdrop-blur border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto z-20">
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Microscope Mechanics
              </h3>
              <p className="text-[11px] text-slate-500">
                Adjust focus knobs and illumination to reveal sharp cellular details.
              </p>
            </div>

            {/* Objective Lens Turret Selector */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span>Objective Turret</span>
                <span className="text-[10px] text-slate-400">{currentLens.name}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {OBJECTIVE_LENSES.map((lens, idx) => {
                  const isCur = selectedLensIndex === idx;
                  return (
                    <button
                      key={lens.name}
                      onClick={() => handleLensChange(idx)}
                      className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                        isCur
                          ? 'bg-slate-800 text-white border-emerald-500/60 ring-1 ring-emerald-500/40'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                        style={{ backgroundColor: lens.ringColor }}
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-100">{lens.power}x</div>
                        <div className="text-[10px] text-slate-400">{lens.totalMagnification}x Total</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coarse & Fine Focus Knobs */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              {/* Coarse Focus */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-200">Coarse Focus Knob</span>
                  <span className="font-mono text-[11px] text-slate-400">{(coarseFocus * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={coarseFocus}
                  onChange={(e) => {
                    setCoarseFocus(parseFloat(e.target.value));
                    soundFx.playKnobTick();
                  }}
                  className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Lower Stage</span>
                  <span>Raise Stage</span>
                </div>
              </div>

              {/* Fine Focus */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-200">Fine Focus Knob</span>
                  <span className="font-mono text-[11px] text-slate-400">{(fineFocus * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.005"
                  value={fineFocus}
                  onChange={(e) => {
                    setFineFocus(parseFloat(e.target.value));
                    soundFx.playKnobTick();
                  }}
                  className="w-full accent-teal-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>- Fine Tune</span>
                  <span>+ Fine Tune</span>
                </div>
              </div>
            </div>

            {/* Stage X & Y Mechanical Knobs */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span>Mechanical Stage Position</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  X: {stageX} µm | Y: {stageY} µm
                </span>
              </label>

              {/* Mini directional D-pad */}
              <div className="flex items-center justify-center py-1">
                <div className="grid grid-cols-3 gap-1.5 w-32">
                  <div />
                  <button
                    onClick={() => { setStageY((y) => y - 15); soundFx.playKnobTick(); }}
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                    title="Move Stage Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <div />
                  <button
                    onClick={() => { setStageX((x) => x - 15); soundFx.playKnobTick(); }}
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                    title="Move Stage Left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setStageX(0); setStageY(0); soundFx.playClick(); }}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 flex items-center justify-center"
                    title="Recenter Stage"
                  >
                    Center
                  </button>
                  <button
                    onClick={() => { setStageX((x) => x + 15); soundFx.playKnobTick(); }}
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                    title="Move Stage Right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <div />
                  <button
                    onClick={() => { setStageY((y) => y + 15); soundFx.playKnobTick(); }}
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                    title="Move Stage Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <div />
                </div>
              </div>
            </div>

            {/* Illumination & Iris Diaphragm */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Substage Light Source
                </span>
                <span className="font-mono text-[11px] text-slate-400">{(brightness * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.2"
                step="0.05"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="font-semibold text-slate-200">Iris Diaphragm Aperture</span>
                <span className="font-mono text-[11px] text-slate-400">{(diaphragm * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={diaphragm}
                onChange={(e) => setDiaphragm(parseFloat(e.target.value))}
                className="w-full accent-blue-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Selected Annotation Card */}
          {selectedAnnotation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-emerald-300">{selectedAnnotation.name}</span>
                <button
                  onClick={() => setSelectedAnnotation(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedAnnotation.description}
              </p>
            </motion.div>
          )}
        </aside>
      </div>

      {/* Floating Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-medium shadow-2xl z-50 flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
