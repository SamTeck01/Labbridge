'use client';

import React, { useRef, useState } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; z: number }) => void;
  className?: string;
}

export default function VirtualJoystick({ onMove, className = '' }: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = 45; // Max drag radius in pixels

  const updateKnobPosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0) {
      setKnobPos({ x: 0, y: 0 });
      onMove({ x: 0, z: 0 });
      return;
    }

    const angle = Math.atan2(deltaY, deltaX);
    const clampedDist = Math.min(distance, radius);

    const targetX = Math.cos(angle) * clampedDist;
    const targetY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: targetX, y: targetY });

    // Normalize -1 to 1:
    // x: right (+1), left (-1)
    // z: up/forward (-1), down/back (+1)
    const normX = targetX / radius;
    const normZ = targetY / radius;

    onMove({ x: normX, z: normZ });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsActive(true);
    touchIdRef.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateKnobPosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive || touchIdRef.current !== e.pointerId) return;
    updateKnobPosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchIdRef.current === e.pointerId) {
      setIsActive(false);
      touchIdRef.current = null;
      setKnobPos({ x: 0, y: 0 });
      onMove({ x: 0, z: 0 });
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
  };

  return (
    <div
      className={`relative select-none touch-none ${className}`}
      style={{ width: '130px', height: '130px' }}
    >
      {/* Outer Glow Ring & Base Plate */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full rounded-full bg-slate-950/80 backdrop-blur-2xl border-2 transition-colors flex items-center justify-center cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.7)] ${
          isActive ? 'border-emerald-400 bg-slate-900/90 shadow-[0_0_20px_#10b98144]' : 'border-slate-700/60'
        }`}
      >
        {/* Direction Crosshair Markings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="w-0.5 h-16 bg-slate-400" />
          <div className="absolute h-0.5 w-16 bg-slate-400" />
        </div>

        {/* Joystick Thumb Knob */}
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform ${
            isActive
              ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-emerald-500/40 scale-105'
              : 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300 border border-slate-600'
          }`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            pointerEvents: 'none',
          }}
        >
          <div className="w-5 h-5 rounded-full border border-current opacity-60 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
          </div>
        </div>
      </div>
    </div>
  );
}
