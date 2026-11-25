'use client';

import { useSyncExternalStore } from 'react';
import { labStore, describeLabState, titrationPH, type Station, type Objective } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';
import { experiments, getExperiment, assistLevel } from '@/lib/experiments';
import { BENCH_PARTS, STEP_PART, buildKnowledge, localAnswer, localDebrief } from '@/lib/curieKnowledge';

/**
 * Dr. Curie's "brain": one shared conversation used by every chat surface
 * (phone app, assistant panel, the 3D NPC). Sends history + live lab state
 * to /api/assistant and applies any actions she decides to take.
 */

export interface CurieMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface CurieState {
  messages: CurieMessage[];
  loading: boolean;
  /** Station the NPC should walk to (null = her office desk). */
  targetStation: Station | null;
  /** Short line shown in the speech bubble above the NPC. */
  speech: string | null;
  /** Equipment actions waiting until Curie physically reaches the bench. */
  pending: Action[];
  /** True while Curie's hands are on the apparatus (drives the reach animation). */
  operating: boolean;
  voiceOn: boolean;
  /** Apparatus Curie is pointing at (glows in the scene). */
  highlight: { station: Station; part: string; at: number } | null;
}

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

let state: CurieState = {
  messages: [
    {
      role: 'assistant',
      content: "Welcome to the lab. I'm Dr. Curie, the lab manager. Pick a bench and I'll walk you through the practical.",
      timestamp: now(),
    },
  ],
  loading: false,
  targetStation: null,
  speech: null,
  pending: [],
  operating: false,
  voiceOn: true,
  highlight: null,
};
const listeners = new Set<() => void>();
const CHAT_KEY = 'labbridge.curie-chat.v1';
const set = (patch: Partial<CurieState>) => {
  // Keep memory bounded in long sessions
  if (patch.messages && patch.messages.length > 100) patch = { ...patch, messages: patch.messages.slice(-100) };
  state = { ...state, ...patch };
  if (patch.messages) {
    try {
      window.localStorage.setItem(CHAT_KEY, JSON.stringify(state.messages.slice(-40)));
    } catch {
      /* chat just won't persist */
    }
  }
  listeners.forEach((l) => l());
};

// ---- Voice: she reads her lines aloud (browser speech, free and offline). One tap mutes it.
const VOICE_KEY = 'labbridge.curie-voice.v1';
let voiceOn = (() => {
  try {
    return window.localStorage.getItem(VOICE_KEY) !== 'off';
  } catch {
    return true;
  }
})();
let pickedVoice: SpeechSynthesisVoice | null = null;
function speak(text: string) {
  if (!voiceOn || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  if (!pickedVoice) {
    const vs = synth.getVoices();
    pickedVoice = vs.find((v) => /en-(GB|NG|ZA|AU)/i.test(v.lang) && /female|samantha|serena|karen|moira|google uk english female/i.test(v.name)) ?? vs.find((v) => /^en/i.test(v.lang)) ?? null;
  }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''));
  if (pickedVoice) u.voice = pickedVoice;
  u.rate = 1.02;
  u.pitch = 1.05;
  synth.speak(u);
}

let speechTimer: ReturnType<typeof setTimeout> | null = null;
function say(text: string) {
  speak(text);
  const short = text.length > 140 ? text.slice(0, 137) + '...' : text;
  set({ speech: short });
  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => set({ speech: null }), 9000);
}

type Action = { name: string; args: Record<string, unknown> };

const isStation = (x: unknown): x is Station => typeof x === 'string' && x in BENCH_PARTS;

/** Performs an action once Curie is standing at the bench. use_apparatus works exactly like the student clicking it. */
function operate({ name, args }: Action) {
  const station = args.station as Station;
  const part = String(args.part ?? '');
  if (name === 'use_apparatus') window.dispatchEvent(new CustomEvent('labbridge:benchTap', { detail: { station, id: part } }));
  if (name === 'highlight') set({ highlight: { station, part, at: Date.now() } });
}

export function applyAction(action: Action) {
  const station = action.args.station;
  if (!isStation(station)) return;
  if (action.name === 'walk_to') {
    set({ targetStation: station });
    return;
  }
  if (action.name !== 'highlight' && action.name !== 'use_apparatus') return;
  if (!(String(action.args.part) in BENCH_PARTS[station])) return;
  // Pointing is instant; doing it needs her at the bench first (the NPC calls curie.arrived() there)
  if (action.name === 'highlight') return operate(action);
  set({ targetStation: station, pending: [...state.pending, action] });
}

async function request(body: { messages: { role: string; content: string }[]; event?: string }, fallback: () => string): Promise<void> {
  set({ loading: true });
  const stamp = now();
  let text = '';
  // The reply grows in place as it streams in
  let index = -1;
  const show = (t: string) => {
    const msg: CurieMessage = { role: 'assistant', content: t, timestamp: stamp };
    if (index < 0) {
      index = state.messages.length;
      set({ messages: [...state.messages, msg] });
    } else set({ messages: state.messages.map((m, i) => (i === index ? msg : m)) });
  };
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, knowledge: buildKnowledge(), labState: `${describeLabState(labStore.get())}\n${experiments.describe()}` }),
    });
    if (!res.ok || !res.body) throw new Error(String(res.status));
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let actions: Action[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        const o = JSON.parse(line) as { text?: string; actions?: Action[]; error?: string };
        if (o.error) throw new Error(o.error);
        if (o.text) {
          text += o.text;
          show(text);
        }
        if (o.actions) actions = o.actions;
      }
    }
    if (!text && actions.length) text = 'Watch. I will show you.';
    if (text) {
      show(text);
      say(text);
    }
    actions.forEach(applyAction);
  } catch {
    // Offline or the AI is unavailable: answer from what she knows locally
    const t = fallback();
    if (t) {
      show(t);
      say(t);
    }
  } finally {
    set({ loading: false });
  }
}

export const curie = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Student asks Curie something. */
  ask(text: string) {
    if (!text.trim() || state.loading) return;
    const messages = [...state.messages, { role: 'user' as const, content: text.trim(), timestamp: now() }];
    set({ messages });
    return request({ messages: messages.filter((m) => !m.isError).map(({ role, content }) => ({ role, content })) }, () => {
      // Offline "show me": she does the current step herself
      if (/show me|do it|help me|demonstrate/i.test(text)) {
        const run = experiments.get().run;
        const def = getExperiment(run?.experimentId);
        const step = def?.steps.find((st) => !run!.completedSteps.includes(st.id));
        const part = def && step ? STEP_PART[def.id]?.[step.id] : undefined;
        if (def && part) {
          applyAction({ name: 'use_apparatus', args: { station: def.station, part } });
          return `Watch me: ${step!.text.charAt(0).toLowerCase()}${step!.text.slice(1)}. Then you try the next one.`;
        }
      }
      return localAnswer(text);
    });
  },
  /** Something happened in the lab that Curie should react to on her own. */
  notify(event: string, fallback: () => string = () => '') {
    if (state.loading) return;
    return request({ messages: state.messages.filter((m) => !m.isError).slice(-8).map(({ role, content }) => ({ role, content })), event }, fallback);
  },
  setVoice(on: boolean) {
    voiceOn = on;
    try {
      window.localStorage.setItem(VOICE_KEY, on ? 'on' : 'off');
    } catch {
      /* not remembered */
    }
    if (!on && typeof window !== 'undefined') window.speechSynthesis?.cancel();
    set({ voiceOn: on });
  },
  clearHighlight() {
    set({ highlight: null });
  },
  /** A line from Curie that needs no model call (coaching during a practical). */
  coach(text: string) {
    set({ messages: [...state.messages, { role: 'assistant', content: text, timestamp: now() }] });
    say(text);
  },
  clear() {
    set({ messages: [{ role: 'assistant', content: 'Chat cleared. What are we working on?', timestamp: now() }] });
  },
  /** Called by the 3D NPC when she is standing at targetStation. Performs queued work with a reach gesture. */
  arrived() {
    if (state.operating || !state.pending.length) return;
    const station = state.targetStation;
    const here = state.pending.filter((a) => a.args.station === station);
    if (!here.length) return;
    set({ operating: true, pending: state.pending.filter((a) => !here.includes(a)) });
    here.forEach((a, i) => setTimeout(() => operate(a), 700 + i * 900));
    setTimeout(() => {
      set({ operating: false });
      // Continue to the next bench if work remains elsewhere.
      const next = state.pending[0];
      if (next) set({ targetStation: next.args.station as Station });
    }, 900 + here.length * 900);
  },
  walkTo(station: Station | null) {
    set({ targetStation: station });
  },
  say,
};

export function useCurie<T>(selector: (s: CurieState) => T): T {
  return useSyncExternalStore(curie.subscribe, () => selector(state), () => selector(state));
}

// --- Proactive lab-manager behaviour ---
// Curie watches the lab state and steps in on notable events (without spamming).
let watching = false;
export function startCurieWatch() {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  try {
    const saved = window.localStorage.getItem(CHAT_KEY);
    if (saved) set({ messages: JSON.parse(saved) });
  } catch {
    /* ignore unreadable chat history */
  }
  // Dev hook for driving Curie from the console / automated tests without an API key.
  if (process.env.NODE_ENV !== 'production') Object.assign(window, { __curie: { curie, applyAction, labStore, experiments } });
  const fired = new Set<string>();
  let prev = labStore.get();

  // Practical coaching: Curie comes to the bench, walks the student through each step,
  // corrects mistakes as they happen, and gives feedback on the result.
  experiments.init();
  experiments.onEvent((e) => {
    if (e.type === 'started') {
      const def = getExperiment(experiments.get().run?.experimentId);
      if (def) curie.walkTo(def.station);
      curie.coach(e.message);
    } else if (e.type === 'step') {
      // Fade the help as the student gets better at this practical
      const run = experiments.get().run;
      const level = assistLevel(run?.experimentId);
      if (level === 'guided') curie.coach(e.message);
      else if (level === 'supported') {
        const def = getExperiment(run?.experimentId);
        const next = def?.steps.find((st) => !run!.completedSteps.includes(st.id));
        if (next) curie.coach(`Next: ${next.text.charAt(0).toLowerCase()}${next.text.slice(1)}.`);
      }
    } else if (e.type === 'mistake') {
      curie.coach(e.message);
      soundFx.playBeep();
    } else if (e.type === 'finished' && e.result) {
      const r = e.result;
      curie.coach(`${r.title} complete: ${r.score}/100.`);
      curie.notify(
        `The student just finished the practical "${r.title}" with ${r.score}/100. ` +
          `Breakdown: ${r.breakdown.map((b) => `${b.label} ${b.points}/${b.max} (${b.note})`).join('; ')}. ` +
          `Mistakes: ${r.mistakes.join(' | ') || 'none'}. Give short, specific feedback: one thing done well, one thing to improve next time. Then ask one exam-style question about this practical.`,
        () => localDebrief(r)
      );
    }
  });

  // Stuck on a step for 45 s: one nudge per step, pointing at what to use (not when on your own)
  let stepKey = '';
  let stepSince = Date.now();
  let nudged = '';
  setInterval(() => {
    const run = experiments.get().run;
    const def = getExperiment(run?.experimentId);
    if (!run || !def || assistLevel(def.id) === 'independent') return;
    const step = def.steps.find((st) => !run.completedSteps.includes(st.id));
    if (!step) return;
    const key = def.id + step.id;
    if (key !== stepKey) {
      stepKey = key;
      stepSince = Date.now();
      return;
    }
    if (nudged === key || Date.now() - stepSince < 45000 || state.loading || state.operating) return;
    nudged = key;
    const part = STEP_PART[def.id]?.[step.id];
    if (part) operate({ name: 'highlight', args: { station: def.station, part } });
    curie.coach(`Stuck? ${step.text}.${part ? ` It's glowing now.` : ''} Ask me if you want me to show you.`);
  }, 5000);

  labStore.subscribe(() => {
    const s = labStore.get();

    // Follow the student to whichever bench they sit at.
    if (s.player.station !== prev.player.station && s.player.station && !state.pending.length && !state.operating) {
      curie.walkTo(s.player.station);
    }

    const inPractical = !!experiments.get().run;
    // Titration endpoint overshoot.
    if (!inPractical && s.chemistry.dispensedML > 26 && !fired.has('overshoot')) {
      fired.add('overshoot');
      curie.notify(`The student overshot the titration endpoint: ${s.chemistry.dispensedML.toFixed(1)} mL NaOH dispensed and the burette is ${s.chemistry.buretteOpen ? 'still open' : 'closed'}.`);
    }
    // Titrating without indicator.
    if (!inPractical && s.chemistry.buretteOpen && !s.chemistry.indicatorAdded && !fired.has('noIndicator')) {
      fired.add('noIndicator');
      curie.notify('The student opened the burette before adding any indicator to the flask.');
    }
    // Very high current in the circuit.
    if (!inPractical && s.physics.switchClosed && s.physics.voltage / s.physics.resistance > 1 && !fired.has('highCurrent')) {
      fired.add('highCurrent');
      curie.notify(`Circuit closed at low resistance: ${(s.physics.voltage / s.physics.resistance).toFixed(2)} A through the bulb.`);
    }
    prev = s;
  });

}
