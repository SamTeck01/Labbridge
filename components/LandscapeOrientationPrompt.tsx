'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, RotateCw, Maximize, X } from 'lucide-react';
import { requestFullscreenAndLandscape, isMobileOrTouchDevice } from '@/lib/orientation';
import { soundFx } from '@/lib/soundEffects';

interface LandscapeOrientationPromptProps {
  onDismiss?: () => void;
}

export default function LandscapeOrientationPrompt({ onDismiss }: LandscapeOrientationPromptProps) {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      const portrait = window.innerHeight > window.innerWidth && isMobileOrTouchDevice();
      setIsPortrait(portrait);
      if (!portrait) {
        // Automatically reset dismissal when user rotates to landscape
        setIsDismissed(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleTurnToLandscape = async () => {
    soundFx.playClick();
    await requestFullscreenAndLandscape();
  };

  const handleDismiss = () => {
    soundFx.playClick();
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (!isPortrait || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center text-slate-100"
      >
        <div className="max-w-sm w-full bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col items-center space-y-5">
          {/* Close button to continue in portrait */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Continue in Portrait"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Animated Rotating Phone Graphic */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-500/15 rounded-full blur-xl animate-pulse" />
            <motion.div
              animate={{ rotate: [0, 90, 90, 0] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
              className="relative p-3 rounded-2xl bg-slate-800 border-2 border-emerald-400/80 shadow-lg text-emerald-400 flex items-center justify-center"
            >
              <Smartphone className="w-10 h-10" />
            </motion.div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 shadow-md text-slate-950">
              <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>

          {/* Heading and Description */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-2">
              <span>Rotate to Landscape</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              For the best 3D laboratory experience, interactive microscope controls, and chemical apparatus viewing, please turn your device sideways.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5 pt-2">
            <button
              onClick={handleTurnToLandscape}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              <Maximize className="w-4 h-4" />
              <span>Turn to Landscape & Fullscreen</span>
            </button>

            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
            >
              Continue in Portrait Mode
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
