'use client';

import { useSyncExternalStore } from 'react';
import { titration } from '@/lib/titration/sim';
import { labStore, describeLabState, titrationPH, type Station, type Objective } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';
import { experiments, getExperiment } from '@/lib/experiments';

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

let speechTimer: ReturnType<typeof setTimeout> | null = null;
function say(text: string) {
  const short = text.length > 140 ? text.slice(0, 137) + '...' : text;
  set({ speech: short });
  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => set({ speech: null }), 9000);
}

type Action = { name: string; args: Record<string, unknown> };

/** Which bench each equipment action happens at. */
const ACTION_STATION: Record<string, Station> = {
  set_microscope_objective: 'biology',
  set_burette: 'chemistry',
  add_indicator: 'chemistry',
  set_stirrer: 'chemistry',
  set_circuit_switch: 'physics',
  set_resistance: 'physics',
  set_balance_door: 'research',
  tare_balance: 'research',
  set_centrifuge: 'research',
};

/** Performs an action on the equipment. Only called once Curie is standing at the bench. */
function operate({ name, args }: Action) {
  switch (name) {
    case 'set_microscope_objective':
      if (['4x', '10x', '40x', '100x'].includes(String(args.objective))) {
        labStore.update('biology', { objective: args.objective as Objective });
        soundFx.playLensTurretClick();
      }
      break;
    case 'set_burette':
      // Same tap the student turns: open = a steady run, closed = shut
      titration.setValve(args.open ? 0.45 : 0);
      soundFx.playClick();
      break;
    case 'add_indicator':
      for (let i = 0; i < 3; i++) titration.indicatorDrop('flask');
      soundFx.playDropLiquid();
      break;
    case 'set_stirrer':
      labStore.update('chemistry', { stirrerRPM: Math.max(0, Math.min(800, Number(args.rpm) || 0)) });
      soundFx.playKnobTick();
      break;
    case 'set_circuit_switch':
      labStore.update('physics', { switchClosed: !!args.closed });
      soundFx.playSwitchToggle(!!args.closed);
      break;
    case 'set_resistance':
      labStore.update('physics', { resistance: Math.max(10, Math.min(100, Number(args.ohms) || 25)) });
      soundFx.playKnobTick();
      break;
    case 'set_balance_door':
      labStore.update('research', { doorsOpen: !!args.open });
      soundFx.playClick();
      break;
    case 'tare_balance':
      labStore.update('research', (r) => ({ tareOffset: r.massOnPan }));
      soundFx.playBeep();
      break;
    case 'set_centrifuge':
      labStore.update('research', { centrifugeRunning: !!args.running });
      if (args.running) soundFx.playCentrifugeSpin();
      break;
  }
}

export function applyAction(action: Action) {
  const stations: Station[] = ['biology', 'chemistry', 'physics', 'research'];
  if (action.name === 'go_to_station') {
    if (stations.includes(action.args.station as Station)) set({ targetStation: action.args.station as Station });
    return;
  }
  const station = ACTION_STATION[action.name];
  if (!station) return;
  // Walk to the bench first; the NPC calls curie.arrived() when she gets there.
  set({ targetStation: station, pending: [...state.pending, action] });
}

async function request(body: object): Promise<void> {
  set({ loading: true });
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, labState: `${describeLabState(labStore.get())}\n${experiments.describe()}` }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

    (data.actions || []).forEach(applyAction);
    if (data.text) {
      set({ messages: [...state.messages, { role: 'assistant', content: data.text, timestamp: now() }] });
      say(data.text);
      soundFx.playSuccessChime();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Dr. Curie is unavailable.';
    set({ messages: [...state.messages, { role: 'assistant', content: msg, timestamp: now(), isError: true }] });
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
    return request({
      messages: messages.filter((m) => !m.isError).map(({ role, content }) => ({ role, content })),
    });
  },
  /** Something happened in the lab that Curie should react to on her own. */
  notify(event: string) {
    if (state.loading) return;
    return request({
      messages: state.messages.filter((m) => !m.isError).slice(-10).map(({ role, content }) => ({ role, content })),
      event,
    });
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
    const here = state.pending.filter((a) => ACTION_STATION[a.name] === station);
    if (!here.length) return;
    set({ operating: true, pending: state.pending.filter((a) => !here.includes(a)) });
    here.forEach((a, i) => setTimeout(() => operate(a), 700 + i * 900));
    setTimeout(() => {
      set({ operating: false });
      // Continue to the next bench if work remains elsewhere.
      const next = state.pending[0];
      if (next) set({ targetStation: ACTION_STATION[next.name] });
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
  if ((process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_TEST_HOOKS === '1')) Object.assign(window, { __curie: { curie, applyAction, labStore, experiments } });
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
      curie.coach(e.message);
    } else if (e.type === 'mistake') {
      curie.coach(e.message);
      soundFx.playBeep();
    } else if (e.type === 'finished' && e.result) {
      const r = e.result;
      curie.coach(`${r.title} complete: ${r.score}/100.`);
      curie.notify(
        `The student just finished the practical "${r.title}" with ${r.score}/100. ` +
          `Breakdown: ${r.breakdown.map((b) => `${b.label} ${b.points}/${b.max} (${b.note})`).join('; ')}. ` +
          `Mistakes: ${r.mistakes.join(' | ') || 'none'}. Give short, specific feedback: one thing done well, one thing to improve next time.`
      );
    }
  });

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

  // Balance reading: settles when the shield is closed, drifts with air currents when open.
  setInterval(() => {
    const r = labStore.get().research;
    const drift = r.doorsOpen ? (Math.random() - 0.5) * 0.0008 : 0;
    const reading = Math.round((r.massOnPan - r.tareOffset + drift) * 10000) / 10000;
    if (reading !== r.balanceWeight) labStore.update('research', { balanceWeight: reading });
  }, 400);
}
