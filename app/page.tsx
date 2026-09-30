'use client';

import type { Station } from '@/lib/labStore';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from '@/components/LandingPage';
import LabNotebookModal, { SnapshotItem } from '@/components/LabNotebookModal';
import AILabAssistantModal from '@/components/AILabAssistantModal';
import LandscapeOrientationPrompt from '@/components/LandscapeOrientationPrompt';
import { soundFx } from '@/lib/soundEffects';
import { experiments } from '@/lib/experiments';
import { labStore, microscopeSharpness } from '@/lib/labStore';

const NOTEBOOK_KEY = 'labbridge.notebook.v1';

// Dynamically import Three.js 3D canvas with SSR disabled
const Lab3DScene = dynamic(() => import('@/components/Lab3DScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300 gap-3">
      <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-mono text-teal-400">Entering University Science Laboratory (10:00 AM Daylight)...</p>
    </div>
  ),
});

export default function Home() {
  const [inLab, setInLab] = useState<boolean>(false);
  const [initialStation, setInitialStation] = useState<Station | null>(null);
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState<boolean>(false);
  const [aiContextPrompt, setAiContextPrompt] = useState<{ prompt: string; context: string } | null>(null);

  // Logged snapshots for Electronic Lab Notebook
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);

  // Restore the notebook after a refresh
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NOTEBOOK_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
      if (saved) setSnapshots(JSON.parse(saved));
    } catch {
      /* unreadable storage: start with an empty notebook */
    }
  }, []);

  // Keyboard shortcut ESC to exit active tool drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNotebookOpen) {
          setIsNotebookOpen(false);
          soundFx.playClick();
        } else if (isAIAssistantOpen) {
          setIsAIAssistantOpen(false);
          soundFx.playClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotebookOpen, isAIAssistantOpen]);

  const handleCaptureSnapshot = (snapshot: SnapshotItem) => {
    // Let an active microscopy practical know an image was captured, and how sharp it was
    experiments.event('snapshot', microscopeSharpness(labStore.get().biology));
    setSnapshots((prev) => {
      const next = [snapshot, ...prev].slice(0, 20);
      try {
        window.localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(next));
      } catch {
        /* images can exceed storage quota; the notebook still works for this session */
      }
      return next;
    });
  };

  const handleOpenAIAssistantWithContext = (prompt: string, context: string) => {
    setAiContextPrompt({ prompt, context });
    setIsAIAssistantOpen(true);
  };

  if (!inLab) {
    return (
      <LandingPage
        onEnterLab={(station) => {
          setInitialStation(station || null);
          setInLab(true);
        }}
        onDirectOpenMicroscope={() => {
          setInitialStation('biology');
          setInLab(true);
        }}
      />
    );
  }

  return (
    <main className="w-full min-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <div className="relative w-full h-screen">
        {/* Mobile Landscape Orientation Prompt / Guidance */}
        <LandscapeOrientationPrompt />

        {/* 3D Lab Simulation - Direct In-World Physical Equipment Interaction & Seating */}
        <Lab3DScene
          initialStation={initialStation}
          onOpenNotebook={() => {
            setIsNotebookOpen(true);
            soundFx.playClick();
          }}
          onOpenAssistant={() => {
            setAiContextPrompt(null);
            setIsAIAssistantOpen(true);
            soundFx.playClick();
          }}
          onExitToLanding={() => {
            soundFx.playClick();
            setInLab(false);
            setInitialStation(null);
          }}
          onSaveSnapshot={handleCaptureSnapshot}
          onAskAI={handleOpenAIAssistantWithContext}
          snapshots={snapshots}
        />

        {/* Electronic Lab Notebook Side Drawer / Overlay */}
        {isNotebookOpen && (
          <LabNotebookModal
            snapshots={snapshots}
            onClose={() => setIsNotebookOpen(false)}
          />
        )}

        {/* Dr. Curie AI Laboratory Assistant */}
        {isAIAssistantOpen && (
          <AILabAssistantModal
            initialPrompt={aiContextPrompt?.prompt}
            initialContext={aiContextPrompt?.context}
            onClose={() => setIsAIAssistantOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
