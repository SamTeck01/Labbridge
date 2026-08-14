'use client';

import React, { useState, useEffect } from 'react';
import LandingPage from '@/components/LandingPage';
import Lab3DScene from '@/components/Lab3DScene';
import MicroscopeViewer from '@/components/MicroscopeViewer';
import ChemistryStationModal from '@/components/ChemistryStationModal';
import PhysicsStationModal from '@/components/PhysicsStationModal';
import ResearchStationModal from '@/components/ResearchStationModal';
import LabNotebookModal, { SnapshotItem } from '@/components/LabNotebookModal';
import AILabAssistantModal from '@/components/AILabAssistantModal';
import { soundFx } from '@/lib/soundEffects';

type ViewMode = 'landing' | 'simulator';
type ActiveStation = 'biology' | 'chemistry' | 'physics' | 'research' | null;

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [activeStation, setActiveStation] = useState<ActiveStation>(null);
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState<boolean>(false);
  const [aiContextPrompt, setAiContextPrompt] = useState<{ prompt: string; context: string } | null>(null);

  // Logged snapshots for Electronic Lab Notebook
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);

  // Keyboard shortcut ESC to exit active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeStation) {
          setActiveStation(null);
          soundFx.playClick();
        } else if (isNotebookOpen) {
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
  }, [activeStation, isNotebookOpen, isAIAssistantOpen]);

  const handleCaptureSnapshot = (snapshot: SnapshotItem) => {
    setSnapshots((prev) => [snapshot, ...prev]);
  };

  const handleOpenAIAssistantWithContext = (prompt: string, context: string) => {
    setAiContextPrompt({ prompt, context });
    setIsAIAssistantOpen(true);
  };

  return (
    <main className="w-full min-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {viewMode === 'landing' ? (
        <LandingPage
          onEnterLab={() => {
            setViewMode('simulator');
            setActiveStation(null);
          }}
          onDirectOpenMicroscope={() => {
            setViewMode('simulator');
            setActiveStation('biology');
          }}
        />
      ) : (
        <div className="relative w-full h-screen">
          {/* 3D Lab Simulation Background */}
          <Lab3DScene
            onOpenStation={(station) => setActiveStation(station)}
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
              setViewMode('landing');
              setActiveStation(null);
              soundFx.playClick();
            }}
          />

          {/* Biology Microscope Modal */}
          {activeStation === 'biology' && (
            <MicroscopeViewer
              onExit={() => setActiveStation(null)}
              onSaveSnapshot={handleCaptureSnapshot}
              onAskAI={handleOpenAIAssistantWithContext}
            />
          )}

          {/* Chemistry Workstation Modal */}
          {activeStation === 'chemistry' && (
            <ChemistryStationModal
              onExit={() => setActiveStation(null)}
              onAskAI={handleOpenAIAssistantWithContext}
            />
          )}

          {/* Physics Workstation Modal */}
          {activeStation === 'physics' && (
            <PhysicsStationModal
              onExit={() => setActiveStation(null)}
              onAskAI={handleOpenAIAssistantWithContext}
            />
          )}

          {/* Analytical Science Research Modal */}
          {activeStation === 'research' && (
            <ResearchStationModal
              onExit={() => setActiveStation(null)}
              onAskAI={handleOpenAIAssistantWithContext}
            />
          )}

          {/* Electronic Lab Notebook */}
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
      )}
    </main>
  );
}
