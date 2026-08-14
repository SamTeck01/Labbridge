'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, BookOpen, Camera, CheckCircle2, FileText, Sparkles, Award } from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';

export interface SnapshotItem {
  title: string;
  specimenId: string;
  magnification: string;
  imageUrl: string;
  notes: string;
  timestamp: string;
}

interface LabNotebookModalProps {
  snapshots: SnapshotItem[];
  onClose: () => void;
}

export default function LabNotebookModal({ snapshots, onClose }: LabNotebookModalProps) {
  const [activeTab, setActiveTab] = useState<'observations' | 'quizzes' | 'manual'>('observations');
  const [quizAnswers, setQuizAnswers] = useState<{ [key: string]: number }>({});
  const [submittedQuiz, setSubmittedQuiz] = useState<boolean>(false);

  const quizQuestions = [
    {
      id: 'q1',
      question: 'When switching from a 10x objective lens to a 40x high-power objective lens, what happens to the field of view diameter?',
      options: [
        'The field of view diameter decreases by a factor of 4.',
        'The field of view diameter increases by a factor of 4.',
        'The field of view stays exactly the same.',
        'The field of view turns inverted.',
      ],
      correctIndex: 0,
      explanation: 'Field diameter is inversely proportional to magnification ($D_1 \times M_1 = D_2 \times M_2$). Higher magnification zooms in on a smaller area.',
    },
    {
      id: 'q2',
      question: 'Which prominent plant cell organelle is easily stained dark amber-brown with Iodine Potassium Iodide (IKI)?',
      options: [
        'Centriole',
        'Nucleus (DNA and nucleoproteins)',
        'Mitochondrial matrix',
        'Lysosome',
      ],
      correctIndex: 1,
      explanation: 'Iodine binds avidly to nucleic acids and starch, making plant nuclei prominent dark brown discs under light microscopy.',
    },
    {
      id: 'q3',
      question: 'In an acid-base titration using phenolphthalein, what visual cue indicates that the equivalence point has been reached?',
      options: [
        'The solution turns deep dark blue.',
        'The solution remains crystal clear without changing.',
        'The solution transitions from colorless to a faint permanent pink (pH ~8.2).',
        'A white crystalline precipitate settles at the bottom.',
      ],
      correctIndex: 2,
      explanation: 'Phenolphthalein changes from clear (in acidic pH < 8.2) to bright pink/magenta in alkaline conditions.',
    },
  ];

  const handleSelectQuiz = (qId: string, optIdx: number) => {
    if (submittedQuiz) return;
    soundFx.playClick();
    setQuizAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q) => {
      if (quizAnswers[q.id] === q.correctIndex) score += 1;
    });
    return score;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Electronic Lab Notebook (ELN)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Student Record
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Logged Specimen Captures, Observations & Practical Concept Checks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('observations')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'observations'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Captured Micrographs ({snapshots.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'quizzes'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Concept Checks</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Lab Protocols</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-900/50 text-xs">
          {activeTab === 'observations' && (
            <div>
              {snapshots.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <Camera className="w-12 h-12 mx-auto text-slate-600 stroke-[1.5]" />
                  <h4 className="text-sm font-semibold text-slate-300">No Micrograph Snapshots Yet</h4>
                  <p className="text-xs max-w-sm mx-auto text-slate-500">
                    Step up to the Biology workstation, adjust the microscope focus, and click the <strong>Capture</strong> button to log high-resolution micrographs here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {snapshots.map((snap, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 shadow-md"
                    >
                      <div className="w-full aspect-video rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={snap.imageUrl} alt={snap.title} className="w-full h-full object-contain" />
                        <span className="absolute bottom-1 right-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                          {snap.magnification}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-200 font-semibold">
                        <span>{snap.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{snap.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{snap.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Interactive Practical Check</h4>
                  <p className="text-[11px] text-slate-400">Test your comprehension of microscopy optics and chemistry principles.</p>
                </div>
                {submittedQuiz && (
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                    Score: {calculateScore()} / {quizQuestions.length}
                  </span>
                )}
              </div>

              {quizQuestions.map((q, qIndex) => {
                const isSelected = quizAnswers[q.id] !== undefined;
                const isCorrect = quizAnswers[q.id] === q.correctIndex;
                return (
                  <div key={q.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <h5 className="font-semibold text-slate-200 text-xs leading-relaxed">
                      {qIndex + 1}. {q.question}
                    </h5>
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isThisChosen = quizAnswers[q.id] === optIdx;
                        let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                        if (submittedQuiz) {
                          if (optIdx === q.correctIndex) {
                            btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-semibold';
                          } else if (isThisChosen && !isCorrect) {
                            btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-200';
                          }
                        } else if (isThisChosen) {
                          btnStyle = 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/50';
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectQuiz(q.id, optIdx)}
                            className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {submittedQuiz && optIdx === q.correctIndex && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {submittedQuiz && (
                      <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                        <strong className="text-emerald-400 font-medium">Concept Key:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}

              {!submittedQuiz ? (
                <button
                  onClick={() => {
                    setSubmittedQuiz(true);
                    soundFx.playSuccessChime();
                  }}
                  disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs transition-all shadow-md"
                >
                  Submit Concept Check Answers
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSubmittedQuiz(false);
                    setQuizAnswers({});
                    soundFx.playClick();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Retake Quiz
                </button>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-4 max-w-xl mx-auto text-slate-300 leading-relaxed text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Standard Microscope Focusing Protocol (Köhler / Brightfield)
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-400 text-[11px]">
                  <li>Place the prepared glass slide centered over the mechanical stage aperture.</li>
                  <li>Rotate the revolving turret to the lowest power objective (<strong>4x Scanning</strong>).</li>
                  <li>Raise the stage using the <strong>Coarse Focus knob</strong> until the specimen outline emerges.</li>
                  <li>Use the <strong>Fine Focus knob</strong> to achieve razor-sharp resolution of cell boundaries.</li>
                  <li>Switch to <strong>10x or 40x</strong> objective lens; readjust fine focus and iris diaphragm for contrast.</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Volumetric Titration Protocol
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-400 text-[11px]">
                  <li>Fill burette with standard titrant (0.10 M NaOH).</li>
                  <li>Pipette 25.0 mL of analyte (0.10 M HCl) into Erlenmeyer flask with 3 drops of indicator.</li>
                  <li>Slowly deliver titrant until a single drop causes the indicator to persist in a faint pink coloration for &ge; 30 seconds.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
