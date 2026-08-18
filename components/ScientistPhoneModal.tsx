'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Send,
  Compass,
  BookOpen,
  FileText,
  Calculator,
  Settings,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Circle,
  ArrowRight,
  Maximize2,
  FlaskConical,
  Zap,
  Eye,
  Scale,
  Bot,
  User,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Battery,
  Wifi,
  Signal,
  Smartphone
} from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';
import { SnapshotItem } from '@/components/LabNotebookModal';
import { SPECIMEN_CATALOG } from '@/lib/specimenGenerator';

export type PhoneAppTab = 'home' | 'ai' | 'teleport' | 'notebook' | 'protocols' | 'calculator' | 'settings';

interface ScientistPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeleport: (dest: 'center' | 'biology' | 'chemistry' | 'physics' | 'research') => void;
  onOpenEyepieces?: () => void;
  seatedStation: 'biology' | 'chemistry' | 'physics' | 'research' | null;
  isSeated: boolean;
  snapshots: SnapshotItem[];
  initialTab?: PhoneAppTab;
  initialAIPrompt?: string;
  initialAIContext?: string;
  onSaveSnapshot?: (snapshot: SnapshotItem) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ScientistPhoneModal({
  isOpen,
  onClose,
  onTeleport,
  onOpenEyepieces,
  seatedStation,
  isSeated,
  snapshots,
  initialTab = 'home',
  initialAIPrompt,
  initialAIContext,
}: ScientistPhoneModalProps) {
  const [activeTab, setActiveTab] = useState<PhoneAppTab>(initialTab || 'home');
  const [timeStr, setTimeStr] = useState<string>('12:00');
  const [prevTab, setPrevTab] = useState(initialTab);

  if (initialTab !== prevTab) {
    setPrevTab(initialTab);
    setActiveTab(initialTab || 'home');
  }

  // AI Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello, Scientist! I am Dr. Curie, your LabBridge AI companion. How can I assist your laboratory experiments today?',
      timestamp: '12:00',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Protocol Checklist State
  const [completedSteps, setCompletedSteps] = useState<{ [key: string]: boolean }>({});
  const [selectedProtocol, setSelectedProtocol] = useState<'micro' | 'titration' | 'circuits' | 'analytical'>('micro');

  // Calculator State
  const [calcMode, setCalcMode] = useState<'molarity' | 'ohms' | 'dilution'>('molarity');
  const [calcInputs, setCalcInputs] = useState({
    // Molarity (M = mol / V)
    moles: '0.05',
    volumeL: '0.5',
    // Ohm's Law (V = I * R)
    voltage: '12',
    resistance: '25',
    current: '0.48',
    // Dilution (M1 * V1 = M2 * V2)
    m1: '1.0',
    v1: '50',
    m2: '0.1',
    v2: '500',
  });

  // Sound Mute State
  const [isMuted, setIsMuted] = useState(false);

  const handleSendAIMessage = async (text: string, context?: string) => {
    if (!text.trim()) return;
    soundFx.playClick();

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsAILoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          context: context || (seatedStation ? `Currently at ${seatedStation} workstation` : 'General Laboratory Exploration'),
        }),
      });
      const data = await res.json();
      const assistantReply: ChatMessage = {
        role: 'assistant',
        content: data.text || 'Observation noted in lab telemetry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantReply]);
      soundFx.playSuccessChime();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I am currently processing offline lab telemetry. What experiment would you like to conduct next?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAILoading(false);
    }
  };

  // Sync clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAILoading]);

  const toggleStep = (stepId: string) => {
    soundFx.playClick();
    setCompletedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* Smartphone Chassis Frame */}
      <div className="relative w-full max-w-[410px] h-[92vh] max-h-[780px] bg-slate-900 border-[6px] border-slate-700/80 rounded-[44px] shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden ring-1 ring-white/20 select-none">
        
        {/* Dynamic Island & Speaker Grill */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black px-4 py-1.5 rounded-full shadow-inner border border-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 animate-pulse" />
          <span className="text-[10px] font-mono text-slate-400 font-medium tracking-tight">LabOS 4.2</span>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
        </div>

        {/* Top Status Bar */}
        <div className="w-full pt-3 px-6 pb-2 flex items-center justify-between text-xs text-slate-300 font-medium z-20 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
          <span className="font-semibold text-xs tracking-wider">{timeStr}</span>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Signal className="w-3.5 h-3.5 text-emerald-400" />
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex items-center gap-1">
              <span className="text-[10px]">98%</span>
              <Battery className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            </div>
          </div>
        </div>

        {/* Phone Content Screen */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col custom-scrollbar">
          
          {/* VIEW: HOME */}
          {activeTab === 'home' && (
            <div className="p-5 flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Welcome Widget */}
              <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900/80 p-4 rounded-3xl border border-emerald-500/30 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Virtual Lab Assistant
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Telemetry
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Welcome back, Scientist</h3>
                <p className="text-xs text-slate-300">
                  {isSeated && seatedStation
                    ? `Currently operating the ${seatedStation.toUpperCase()} workstation.`
                    : 'Standing in main laboratory foyer. Ready for experiments.'}
                </p>

                {/* Quick AI Question Bar */}
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setActiveTab('ai');
                  }}
                  className="mt-3 w-full py-2 px-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs text-slate-200 flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    Ask Dr. Curie a question...
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* App Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* App 1: AI Assistant */}
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setActiveTab('ai');
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 transition-all shadow-md group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-200">Dr. Curie AI</span>
                </button>

                {/* App 2: Teleport Jump */}
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setActiveTab('teleport');
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 transition-all shadow-md group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <Compass className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-200">Jump Bench</span>
                </button>

                {/* App 3: Notebook Snapshots */}
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setActiveTab('notebook');
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 transition-all shadow-md group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform relative">
                    <BookOpen className="w-6 h-6" />
                    {snapshots.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold flex items-center justify-center text-white">
                        {snapshots.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-sky-200">Lab Notebook</span>
                </button>

                {/* App 4: Protocols */}
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setActiveTab('protocols');
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 transition-all shadow-md group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-amber-200">Protocols</span>
                </button>

                {/* App 5: Calculator */}
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setActiveTab('calculator');
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-teal-950/40 hover:bg-teal-900/60 border border-teal-500/30 transition-all shadow-md group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-teal-200">Calculator</span>
                </button>

                {/* App 6: Settings */}
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setActiveTab('settings');
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700 transition-all shadow-md group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-500 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <Settings className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200">Settings</span>
                </button>
              </div>

              {/* Station Quick Launcher */}
              <div className="bg-slate-900/80 p-3.5 rounded-3xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Station Switch
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onTeleport('biology');
                      onClose();
                    }}
                    className="p-2.5 rounded-2xl bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-500/30 flex items-center gap-2 text-left transition-all"
                  >
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Microscopy</span>
                      <span className="text-[10px] text-emerald-300">Biology Table</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onTeleport('chemistry');
                      onClose();
                    }}
                    className="p-2.5 rounded-2xl bg-violet-950/30 hover:bg-violet-900/50 border border-violet-500/30 flex items-center gap-2 text-left transition-all"
                  >
                    <FlaskConical className="w-4 h-4 text-violet-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Titration</span>
                      <span className="text-[10px] text-violet-300">Chemistry Table</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onTeleport('physics');
                      onClose();
                    }}
                    className="p-2.5 rounded-2xl bg-amber-950/30 hover:bg-amber-900/50 border border-amber-500/30 flex items-center gap-2 text-left transition-all"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Circuits</span>
                      <span className="text-[10px] text-amber-300">Physics Table</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onTeleport('research');
                      onClose();
                    }}
                    className="p-2.5 rounded-2xl bg-sky-950/30 hover:bg-sky-900/50 border border-sky-500/30 flex items-center gap-2 text-left transition-all"
                  >
                    <Scale className="w-4 h-4 text-sky-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Analytical</span>
                      <span className="text-[10px] text-sky-300">Balance & Spin</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: DR. CURIE AI */}
          {activeTab === 'ai' && (
            <div className="flex-1 flex flex-col p-4 animate-in fade-in duration-150 h-full">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Dr. Curie AI</h3>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Online • Gemini 2.5
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setMessages([
                      {
                        role: 'assistant',
                        content: 'Chat history cleared. How may I assist your scientific analysis?',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      },
                    ]);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
                  title="Clear Chat"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[260px] max-h-[380px] custom-scrollbar">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                          : 'bg-slate-800/90 text-slate-200 rounded-bl-none border border-slate-700/80 shadow-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                ))}
                {isAILoading && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/70 border border-indigo-500/30 text-indigo-300 text-xs w-fit">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing laboratory telemetry...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggested Questions */}
              <div className="py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  'How do I calculate titration equivalence?',
                  'Why use oil immersion at 100x?',
                  "Explain Ohm's Law in series",
                  'How to tare the analytical balance?',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendAIMessage(prompt)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-indigo-900/40 border border-slate-700 text-[10px] text-slate-300 transition-all flex-shrink-0"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAIMessage(inputVal);
                }}
                className="pt-2 flex items-center gap-2 border-t border-slate-800"
              >
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask a scientific question..."
                  className="flex-1 bg-slate-800/90 border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isAILoading}
                  className="p-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-md transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* VIEW: TELEPORT / JUMP TO TABLE */}
          {activeTab === 'teleport' && (
            <div className="p-4 flex flex-col gap-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Workstation Navigator</h3>
                  <p className="text-[11px] text-slate-400">Instantly teleport and sit at any lab apparatus.</p>
                </div>
                <Compass className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="flex flex-col gap-2.5 mt-1">
                {/* Station 1: Biology / Microscope */}
                <div className="p-3.5 rounded-3xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <Eye className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Microscopy Bench</h4>
                        <span className="text-[10px] text-emerald-300">Compound Microscope (4x-100x)</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onTeleport('biology');
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                    >
                      Jump Now
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Observe cellular specimens, adjust coarse/fine micrometer focus, and toggle immersion oil.
                  </p>
                </div>

                {/* Station 2: Chemistry / Titration */}
                <div className="p-3.5 rounded-3xl bg-violet-950/30 border border-violet-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Titration Station</h4>
                        <span className="text-[10px] text-violet-300">Burette, Stirrer & pH Meter</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onTeleport('chemistry');
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                    >
                      Jump Now
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Conduct acid-base titration, adjust PTFE stopcock drip rate, and record pH equivalence.
                  </p>
                </div>

                {/* Station 3: Physics / Circuitry */}
                <div className="p-3.5 rounded-3xl bg-amber-950/30 border border-amber-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Circuitry &amp; Ohm&apos;s Bench</h4>
                        <span className="text-[10px] text-amber-300">Knife Switch, Potentiometer & Bulb</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onTeleport('physics');
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                    >
                      Jump Now
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Toggle high-voltage brass knife switch, dial wirewound rheostat, and monitor current & luminescence.
                  </p>
                </div>

                {/* Station 4: Analytical Research */}
                <div className="p-3.5 rounded-3xl bg-sky-950/30 border border-sky-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Analytical Science Table</h4>
                        <span className="text-[10px] text-sky-300">Analytical Balance & Centrifuge</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onTeleport('research');
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                    >
                      Jump Now
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Slide glass draft shields, tare 0.0001g balance, and spin microcentrifuge tubes at 14,000 RPM.
                  </p>
                </div>

                {/* Lab Center Foyer */}
                <button
                  onClick={() => {
                    onTeleport('center');
                    onClose();
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all mt-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Stand at Lab Center Foyer
                </button>
              </div>
            </div>
          )}

          {/* VIEW: LAB NOTEBOOK / SNAPSHOTS */}
          {activeTab === 'notebook' && (
            <div className="p-4 flex flex-col gap-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Electronic Lab Notebook</h3>
                  <span className="text-[10px] text-slate-400">
                    {snapshots.length} microscope snapshot{snapshots.length === 1 ? '' : 's'} recorded
                  </span>
                </div>
                <BookOpen className="w-5 h-5 text-sky-400" />
              </div>

              {snapshots.length === 0 ? (
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-center gap-3 mt-4">
                  <Eye className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-slate-400">No microscope observations captured yet.</p>
                  <button
                    onClick={() => {
                      onTeleport('biology');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow transition-all"
                  >
                    Go to Microscope & Capture
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-1">
                  {snapshots.map((snap, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{snap.title}</span>
                        <span className="text-[10px] text-slate-400">{snap.timestamp}</span>
                      </div>
                      {snap.imageUrl && (
                        <div className="w-full h-32 rounded-xl bg-black overflow-hidden relative border border-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={snap.imageUrl}
                            alt={snap.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {snap.notes && <p className="text-[11px] text-slate-300 italic">{snap.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: PROTOCOLS */}
          {activeTab === 'protocols' && (
            <div className="p-4 flex flex-col gap-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Standard Operating Procedures</h3>
                  <p className="text-[10px] text-slate-400">Interactive step-by-step experiment protocols</p>
                </div>
                <FileText className="w-5 h-5 text-amber-400" />
              </div>

              {/* Protocol Selector Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                {(['micro', 'titration', 'circuits', 'analytical'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedProtocol(p);
                    }}
                    className={`py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                      selectedProtocol === p
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Protocol Content */}
              {selectedProtocol === 'micro' && (
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold text-amber-300">Specimen Cellular Observation</h4>
                  {[
                    { id: 'm1', text: 'Place glass slide on mechanical stage clips' },
                    { id: 'm2', text: 'Start with 4x Scanning objective and lower stage' },
                    { id: 'm3', text: 'Adjust Coarse Focus until specimen silhouette appears' },
                    { id: 'm4', text: 'Switch to 10x / 40x objective and adjust Fine Focus' },
                    { id: 'm5', text: 'Apply immersion oil before engaging 100x lens' },
                    { id: 'm6', text: 'Log high-resolution snapshot to Lab Notebook' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => toggleStep(st.id)}
                      className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5 text-left transition-all hover:bg-slate-800"
                    >
                      {completedSteps[st.id] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          completedSteps[st.id] ? 'line-through text-slate-400' : 'text-slate-200'
                        }`}
                      >
                        {st.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedProtocol === 'titration' && (
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold text-violet-300">Acid-Base Neutralization Titration</h4>
                  {[
                    { id: 't1', text: 'Fill burette with standard 0.1M NaOH solution' },
                    { id: 't2', text: 'Add 2-3 drops of Phenolphthalein indicator to analyte' },
                    { id: 't3', text: 'Turn magnetic stirrer dial to 400 RPM vortex' },
                    { id: 't4', text: 'Carefully open PTFE stopcock to dispense titrant' },
                    { id: 't5', text: 'Observe faint pink endpoint color change at pH ~8.2' },
                    { id: 't6', text: 'Record final dispensed volume from burette scale' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => toggleStep(st.id)}
                      className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5 text-left transition-all hover:bg-slate-800"
                    >
                      {completedSteps[st.id] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          completedSteps[st.id] ? 'line-through text-slate-400' : 'text-slate-200'
                        }`}
                      >
                        {st.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedProtocol === 'circuits' && (
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold text-amber-300">Ohm&apos;s Law &amp; Power Dissipation</h4>
                  {[
                    { id: 'c1', text: 'Inspect brass knife switch in open safe position' },
                    { id: 'c2', text: 'Set wirewound potentiometer to 50 Ohms resistance' },
                    { id: 'c3', text: 'Close knife switch contact to energize circuit' },
                    { id: 'c4', text: 'Observe filament bulb glow and ammeter reading' },
                    { id: 'c5', text: 'Verify I = V / R relationship with multimeter' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => toggleStep(st.id)}
                      className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5 text-left transition-all hover:bg-slate-800"
                    >
                      {completedSteps[st.id] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          completedSteps[st.id] ? 'line-through text-slate-400' : 'text-slate-200'
                        }`}
                      >
                        {st.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedProtocol === 'analytical' && (
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold text-sky-300">Analytical Gravimetry & Centrifugation</h4>
                  {[
                    { id: 'a1', text: 'Slide open acrylic draft shield door' },
                    { id: 'a2', text: 'Place weigh boat and press TARE button (0.0000g)' },
                    { id: 'a3', text: 'Dispense sample and close draft shield' },
                    { id: 'a4', text: 'Load balanced pairs into centrifuge rotor' },
                    { id: 'a5', text: 'Close safety lid and spin at 14,000 RPM for 3 mins' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => toggleStep(st.id)}
                      className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5 text-left transition-all hover:bg-slate-800"
                    >
                      {completedSteps[st.id] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          completedSteps[st.id] ? 'line-through text-slate-400' : 'text-slate-200'
                        }`}
                      >
                        {st.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: SCIENTIFIC CALCULATOR */}
          {activeTab === 'calculator' && (
            <div className="p-4 flex flex-col gap-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Scientific Calculator</h3>
                  <p className="text-[10px] text-slate-400">Formulas for chemistry, physics & microscopy</p>
                </div>
                <Calculator className="w-5 h-5 text-teal-400" />
              </div>

              {/* Mode Select */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                {(['molarity', 'ohms', 'dilution'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      soundFx.playClick();
                      setCalcMode(m);
                    }}
                    className={`py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                      calcMode === m
                        ? 'bg-teal-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {calcMode === 'molarity' && (
                <div className="p-3.5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
                  <span className="text-xs font-bold text-teal-300">Molarity Formula: M = n / V</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Moles (n):</label>
                      <input
                        type="number"
                        value={calcInputs.moles}
                        onChange={(e) => setCalcInputs((p) => ({ ...p, moles: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Volume (L):</label>
                      <input
                        type="number"
                        value={calcInputs.volumeL}
                        onChange={(e) => setCalcInputs((p) => ({ ...p, volumeL: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-teal-950/40 border border-teal-500/30 flex items-center justify-between">
                    <span className="text-xs text-teal-300 font-medium">Calculated Molarity:</span>
                    <span className="text-base font-bold text-white">
                      {(parseFloat(calcInputs.moles) / (parseFloat(calcInputs.volumeL) || 1)).toFixed(4)} M
                    </span>
                  </div>
                </div>
              )}

              {calcMode === 'ohms' && (
                <div className="p-3.5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
                  <span className="text-xs font-bold text-amber-300">Ohm&apos;s Law: V = I × R | P = V × I</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Voltage (V):</label>
                      <input
                        type="number"
                        value={calcInputs.voltage}
                        onChange={(e) => setCalcInputs((p) => ({ ...p, voltage: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Resistance (Ω):</label>
                      <input
                        type="number"
                        value={calcInputs.resistance}
                        onChange={(e) => setCalcInputs((p) => ({ ...p, resistance: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-amber-300 font-medium block">Current (I):</span>
                      <span className="text-sm font-bold text-white">
                        {(parseFloat(calcInputs.voltage) / (parseFloat(calcInputs.resistance) || 1)).toFixed(3)} A (
                        {(
                          (parseFloat(calcInputs.voltage) / (parseFloat(calcInputs.resistance) || 1)) *
                          1000
                        ).toFixed(0)}{' '}
                        mA)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-amber-300 font-medium block">Power (P):</span>
                      <span className="text-sm font-bold text-white">
                        {(
                          (parseFloat(calcInputs.voltage) ** 2) /
                          (parseFloat(calcInputs.resistance) || 1)
                        ).toFixed(2)}{' '}
                        W
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {calcMode === 'dilution' && (
                <div className="p-3.5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
                  <span className="text-xs font-bold text-sky-300">Dilution: M₁ × V₁ = M₂ × V₂</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Stock M₁ (M):</label>
                      <input
                        type="number"
                        value={calcInputs.m1}
                        onChange={(e) => setCalcInputs((p) => ({ ...p, m1: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Stock V₁ (mL):</label>
                      <input
                        type="number"
                        value={calcInputs.v1}
                        onChange={(e) => setCalcInputs((p) => ({ ...p, v1: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Target M₂ (M):</label>
                      <input
                        type="number"
                        value={calcInputs.m2}
                        onChange={(e) => setCalcInputs((p) => ({ ...p, m2: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between">
                    <span className="text-xs text-sky-300 font-medium">Required Final Volume V₂:</span>
                    <span className="text-base font-bold text-white">
                      {(
                        (parseFloat(calcInputs.m1) * parseFloat(calcInputs.v1)) /
                        (parseFloat(calcInputs.m2) || 1)
                      ).toFixed(1)}{' '}
                      mL
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-4 flex flex-col gap-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Laboratory Preferences</h3>
                  <p className="text-[10px] text-slate-400">Audio, graphics, and simulation configuration</p>
                </div>
                <Settings className="w-5 h-5 text-slate-400" />
              </div>

              <div className="p-3.5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
                {/* Audio Mute */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Acoustic Sound Effects</span>
                    <span className="text-[10px] text-slate-400">Switch clicks, motor hums, liquid drops</span>
                  </div>
                  <button
                    onClick={() => {
                      const muted = soundFx.toggleMute();
                      setIsMuted(muted);
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      isMuted
                        ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                        : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Telemetry Status */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Laboratory Environment</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">Temperature</span>
                      <span className="font-mono font-bold text-emerald-400">21.5 °C</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">Atmospheric Pressure</span>
                      <span className="font-mono font-bold text-sky-400">101.3 kPa</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Dock */}
        <div className="w-full py-2.5 px-4 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-20">
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('home');
            }}
            className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
              activeTab === 'home' ? 'text-emerald-400 scale-110' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-[9px] font-bold">Home</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('ai');
            }}
            className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
              activeTab === 'ai' ? 'text-indigo-400 scale-110' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="text-[9px] font-bold">Curie AI</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('teleport');
            }}
            className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
              activeTab === 'teleport' ? 'text-emerald-400 scale-110' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="text-[9px] font-bold">Jump</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('notebook');
            }}
            className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
              activeTab === 'notebook' ? 'text-sky-400 scale-110' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[9px] font-bold">Notes</span>
          </button>

          {/* Close / Lock Phone Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-2xl flex flex-col items-center gap-0.5 text-rose-400 hover:text-rose-300 transition-all"
            title="Lock Phone"
          >
            <X className="w-4 h-4" />
            <span className="text-[9px] font-bold">Lock</span>
          </button>
        </div>

        {/* Home Indicator Bar */}
        <div className="w-full pb-2 pt-1 flex justify-center bg-slate-950">
          <div className="w-28 h-1 bg-slate-600/60 rounded-full" />
        </div>
      </div>
    </div>
  );
}
