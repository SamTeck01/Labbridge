'use client';

import { useSyncExternalStore } from 'react';
import { labStore, describeLabState, titrationPH, type Station, type Objective } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';

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
};
const listeners = new Set<() => void>();
const set = (patch: Partial<CurieState>) => {
  state = { ...state, ...patch };
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

function applyAction({ name, args }: Action) {
  const stations: Station[] = ['biology', 'chemistry', 'physics', 'research'];
  switch (name) {
    case 'set_microscope_objective':
      if (['4x', '10x', '40x', '100x'].includes(String(args.objective))) {
        labStore.update('biology', { objective: args.objective as Objective });
        soundFx.playLensTurretClick();
      }
      break;
    case 'set_burette':
      labStore.update('chemistry', { buretteOpen: !!args.open });
      break;
    case 'add_indicator':
      labStore.update('chemistry', { indicatorAdded: true });
      break;
    case 'set_stirrer':
      labStore.update('chemistry', { stirrerRPM: Math.max(0, Math.min(800, Number(args.rpm) || 0)) });
      break;
    case 'set_circuit_switch':
      labStore.update('physics', { switchClosed: !!args.closed });
      break;
    case 'set_resistance':
      labStore.update('physics', { resistance: Math.max(10, Math.min(100, Number(args.ohms) || 25)) });
      break;
    case 'go_to_station':
      if (stations.includes(args.station as Station)) set({ targetStation: args.station as Station });
      break;
  }
}

async function request(body: object): Promise<void> {
  set({ loading: true });
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, labState: describeLabState(labStore.get()) }),
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
  clear() {
    set({ messages: [{ role: 'assistant', content: 'Chat cleared. What are we working on?', timestamp: now() }] });
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
  const fired = new Set<string>();
  let prev = labStore.get();

  labStore.subscribe(() => {
    const s = labStore.get();

    // Follow the student to whichever bench they sit at.
    if (s.player.station !== prev.player.station && s.player.station) {
      curie.walkTo(s.player.station);
    }

    // Titration endpoint overshoot.
    if (s.chemistry.dispensedML > 26 && !fired.has('overshoot')) {
      fired.add('overshoot');
      curie.notify(`The student overshot the titration endpoint: ${s.chemistry.dispensedML.toFixed(1)} mL NaOH dispensed and the burette is ${s.chemistry.buretteOpen ? 'still open' : 'closed'}.`);
    }
    // Titrating without indicator.
    if (s.chemistry.buretteOpen && !s.chemistry.indicatorAdded && !fired.has('noIndicator')) {
      fired.add('noIndicator');
      curie.notify('The student opened the burette before adding any indicator to the flask.');
    }
    // Very high current in the circuit.
    if (s.physics.switchClosed && s.physics.voltage / s.physics.resistance > 1 && !fired.has('highCurrent')) {
      fired.add('highCurrent');
      curie.notify(`Circuit closed at low resistance: ${(s.physics.voltage / s.physics.resistance).toFixed(2)} A through the bulb.`);
    }
    prev = s;
  });

  // Burette dispensing simulation runs here so it's independent of rendering.
  setInterval(() => {
    const c = labStore.get().chemistry;
    if (!c.buretteOpen || c.dispensedML >= 50) return;
    const dispensedML = Math.min(50, c.dispensedML + 0.1);
    labStore.update('chemistry', { dispensedML, phValue: titrationPH(dispensedML) });
  }, 200);
}
