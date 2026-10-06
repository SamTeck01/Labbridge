'use client';

import { useSyncExternalStore } from 'react';
import { titration } from '@/lib/titration/sim';
import { titrationControls, handsUI } from '@/lib/titration/ui';

/**
 * One-button steps for the titration: press a button and the hands do that step at a calm,
 * correct pace (the same moves Dr. Curie and the tests use). The judgement stays with the student:
 * when to slow to drops, when to close the tap, what the burette reads.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, ms: number, every = 60) {
  const end = performance.now() + ms;
  while (!fn() && performance.now() < end) await wait(every);
}
const c = () => titrationControls.get();
const s = () => titration.get();
/** Wait for the hands to get there (a little extra so it reads as a deliberate move). */
const settle = async (ms = 9000) => {
  // Give the move a few frames to start, then wait until it has stayed arrived
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await wait(150);
  let ok = 0;
  await until(() => (ok = c()?.settled() ? ok + 1 : 0) >= 3, ms, 50);
  await wait(120);
};

export type ActionId = 'fill' | 'funnel' | 'jet' | 'pipette' | 'indicator' | 'tile' | 'read' | 'fast' | 'drops' | 'close' | 'swirl' | 'sheet';

let running: ActionId | null = null;
const listeners = new Set<() => void>();
const setRunning = (id: ActionId | null) => {
  running = id;
  listeners.forEach((l) => l());
};
export const useRunningAction = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => running,
    () => null,
  );

/** Take it in the hand and wait until it's really there. */
async function grab(id: string) {
  // Something may still be settling back into place: try again until it's in the hand
  for (let i = 0; i < 4 && handsUI.get().held?.id !== id; i++) {
    c()?.grab(id);
    await until(() => handsUI.get().held?.id === id, 1200);
  }
  await wait(250);
}

/** Pick something up, carry it to a place and put it down there. */
async function move(id: string, to: string, pause = 300) {
  await grab(id);
  c()?.liftBy(0.12);
  c()?.carryTo(to);
  await settle();
  c()?.liftBy(-1);
  await settle();
  await wait(pause);
  c()?.setDown();
  await wait(500);
}

const steps: Record<Exclude<ActionId, 'sheet'>, () => Promise<void>> = {
  async fill() {
    await grab('chem_naoh_bottle');
    c()?.carryTo('funnel');
    c()?.liftBy(1);
    await settle();
    c()?.setTilt(0.6);
    await wait(600);
    // Pour steadily, never faster than the funnel drains; stop just above the 0 mark
    await until(() => {
      const t = s();
      if (t.funnelML < (t.reading > 6 ? 4 : 1)) titration.pourBase(t.reading > 6 ? 0.5 : 0.15, 'funnel', 0); // slower near the line
      return t.hasLiquid && t.reading - t.funnelML <= 1.3;
    }, 60000, 40);
    c()?.setTilt(0);
    await wait(700);
    c()?.carryTo('home');
    c()?.liftBy(-1);
    await settle();
    c()?.setDown();
    await until(() => s().funnelML < 0.05, 6000);
  },
  async funnel() {
    await grab('chem_funnel');
    c()?.liftBy(0.2);
    await settle();
    c()?.carryTo('@-0.16,0.16');
    c()?.liftBy(-1);
    await settle();
    c()?.setDown();
    await wait(500);
  },
  async jet() {
    // The flask steps aside; the waste beaker goes under the jet; a second at full flow
    await move('chem_flask', '@0.02,0.2');
    await move('chem_waste', 'tile');
    c()?.toggleTap(true);
    await wait(400);
    c()?.setValve(1);
    await until(() => !s().bubble, 4000);
    await wait(300);
    c()?.setValve(0);
    await wait(500);
    c()?.toggleTap(false);
    await move('chem_waste', 'home');
  },
  async pipette() {
    await grab('chem_pipette');
    c()?.carryTo('stock');
    c()?.liftBy(0.25);
    await settle();
    c()?.liftBy(-1);
    await settle();
    // Draw up just past the line, then let it down to the line
    await until(() => (titration.pipette(0.6, 'stock'), s().pipetteML >= 25.4), 8000, 40);
    await wait(300);
    await until(() => (titration.pipette(-0.05, 'stock'), s().pipetteML <= 25.0), 4000, 60);
    c()?.liftBy(0.3);
    await settle();
    c()?.carryTo('flask');
    await settle();
    c()?.liftBy(-1);
    c()?.liftBy(0.08);
    await settle();
    await until(() => (titration.pipette(-0.8, 'flask'), s().pipetteML <= 0.01), 8000, 40);
    await wait(400);
    c()?.liftBy(0.3);
    await settle();
    c()?.carryTo('rack');
    await settle();
    c()?.liftBy(-1);
    await settle();
    c()?.setDown();
    await wait(400);
  },
  async indicator() {
    await grab('chem_dropper');
    c()?.carryTo('flask');
    c()?.liftBy(-1);
    c()?.liftBy(0.2);
    await settle();
    await until(() => !!c()?.settled(), 3000);
    await wait(900); // steady over the neck before squeezing
    for (let i = 0; i < 3; i++) {
      c()?.squeeze();
      await wait(650);
    }
    await wait(700); // let the last drop land
    c()?.carryTo('indicator');
    await settle();
    c()?.setDown();
    await wait(400);
  },
  async tile() {
    await move('chem_flask', 'tile', 1100);
  },
  async read() {
    c()?.read(true);
  },
  async fast() {
    c()?.toggleTap(true);
    c()?.swirl(true);
    c()?.setValve(0.55);
  },
  async drops() {
    c()?.toggleTap(true);
    c()?.swirl(true);
    c()?.setValve(0.16);
  },
  async close() {
    c()?.setValve(0);
    await wait(300);
    c()?.swirl(false);
    c()?.toggleTap(false);
  },
  async swirl() {
    c()?.swirl(s().swirl < 0.1);
  },
};

/** What each step should have changed: if it didn't (something got in the way), it is tried again. */
const result: Partial<Record<ActionId, () => boolean>> = {
  funnel: () => !s().funnelIn,
  jet: () => !s().bubble,
  pipette: () => s().acidMmol >= 2.3,
  indicator: () => s().indicatorDrops > 0,
  tile: () => s().flaskAt === 'tile',
};

/** Run a step (one at a time; the tap buttons can always interrupt to stop the flow). */
export async function runAction(id: ActionId, openSheet?: () => void) {
  if (id === 'sheet') return openSheet?.();
  const instant = id === 'close' || id === 'fast' || id === 'drops' || id === 'swirl' || id === 'read';
  if (running && !instant) return;
  if (!c()) return;
  if (instant) return steps[id]();
  setRunning(id);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      await steps[id]();
      const ok = result[id];
      if (!ok) break;
      await until(ok, 1500);
      if (ok()) break;
      if (handsUI.get().held) c()?.setDown();
      await wait(600);
    }
  } finally {
    setRunning(null);
  }
}
