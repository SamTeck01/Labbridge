import * as THREE from 'three';
import { labStore, G, pendulumPeriod } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';
import { FirstPersonHands } from '@/lib/workbench/hands';
import { KnobBench, type Focus, type KnobSpec } from '@/lib/workbench/benches';
import { MAT, Stopwatch, label, tagAll } from '@/lib/workbench/kit';

/**
 * Simple pendulum: retort stand with a clamp, string and brass bob, a metre rule behind it, and a
 * stopwatch. The student sets the length at the clamp, pulls the bob aside and lets go, and times
 * ten swings. Motion is real: theta(t) = A cos(sqrt(g/L) t), lightly damped.
 */

const LENGTHS = [0.3, 0.45, 0.6, 0.75];
const PIVOT_Y = 0.98; // above the bench top
const AMPLITUDE = 0.14; // rad (~8 degrees: small-angle regime)

export class PendulumBench extends KnobBench {
  protected ids = ['pend_bob', 'pend_clamp', 'pend_watch'];
  private kit = new THREE.Group();
  private pivot = new THREE.Vector3();
  private string: THREE.Mesh;
  private bob: THREE.Mesh;
  readonly watch = new Stopwatch('pend_watch', 'pendulum');
  private angle = 0;
  private t = 0;
  private held = false;
  private amp = AMPLITUDE;
  private lenAccum = 0;
  protected station = 'pendulum';
  protected idleHints = ['Hold the bob and pull it aside (scroll / drag), let go (Q) to release it', 'Hold the clamp to change the length', 'Click the stopwatch'];
  protected knobs: Record<string, KnobSpec> = {
    pend_bob: { name: 'Pendulum bob', side: 'right' },
    pend_clamp: { name: 'Clamp (string length)', side: 'left' },
  };
  protected knobValue(id: string) {
    if (id === 'pend_bob') {
      const deg = Math.abs((this.angle * 180) / Math.PI);
      return { value: Math.min(1, deg / 30), detail: `Pulled ${deg.toFixed(0)}° aside${deg > 10 ? ' (too far for the formula)' : ''}` };
    }
    return { value: (LENGTHS.indexOf(this.len()) + 1) / LENGTHS.length, detail: `${(this.len() * 100).toFixed(0)} cm` };
  }
  protected turnKnob(id: string, notches: number, fine: number) {
    if (id === 'pend_bob') {
      // Holding the bob: pull it aside by as much as you like (the formula wants under ~10°)
      if (labStore.get().pendulum.swinging) labStore.update('pendulum', { swinging: false });
      this.held = true;
      this.angle = THREE.MathUtils.clamp(this.angle + notches * 0.025 * fine, -0.6, 0.6);
    } else {
      labStore.update('pendulum', { swinging: false });
      this.angle = 0;
      this.lenAccum += notches;
      if (Math.abs(this.lenAccum) >= 1) {
        const i = LENGTHS.indexOf(this.len());
        const next = LENGTHS[THREE.MathUtils.clamp(i + Math.sign(this.lenAccum), 0, LENGTHS.length - 1)];
        this.lenAccum = 0;
        if (next !== this.len()) {
          labStore.update('pendulum', { length: next });
          soundFx.playKnobTick();
        }
      }
    }
  }

  /** Letting go of the bob releases it from wherever you pulled it to. */
  release() {
    if (this.control?.id === 'pend_bob') {
      this.held = false;
      if (Math.abs(this.angle) > 0.02) {
        this.amp = this.angle;
        this.t = 0;
        labStore.update('pendulum', { swinging: true });
        soundFx.playClick();
      }
    }
    super.release();
  }

  constructor(scene: THREE.Scene, origin: THREE.Vector3, hands: FirstPersonHands, focus: Focus) {
    const kit = new THREE.Group();
    kit.position.copy(origin);
    super(scene, kit, hands, focus);
    this.kit = kit;

    // Retort stand: base, rod, boss and clamp arm reaching forward
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.014, 0.16), MAT.black);
    base.position.set(-0.12, 0.007, -0.12);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.05, 12), MAT.steel);
    rod.position.set(-0.17, 0.525, -0.15);
    const boss = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), MAT.steel);
    boss.position.set(-0.17, PIVOT_Y, -0.15);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 10), MAT.steel);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(-0.17, PIVOT_Y, -0.05);
    const armX = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.17, 10), MAT.steel);
    armX.rotation.z = Math.PI / 2;
    armX.position.set(-0.085, PIVOT_Y, 0.05);
    // Split cork the string is gripped in (this is the "clamp" the student adjusts)
    const cork = new THREE.Group();
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.012), MAT.cork);
    c1.position.set(0, PIVOT_Y, 0.044);
    const c2 = c1.clone();
    c2.position.z = 0.056;
    cork.add(c1, c2);
    tagAll(cork, 'pend_clamp', 'Clamp & split cork', 'Hold and scroll to change the string length', 'pendulum');
    cork.name = 'pend_clamp';
    // Metre rule standing behind the pendulum (0 at the pivot, reading down)
    const rule = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.004), MAT.wood);
    rule.position.set(0.05, PIVOT_Y - 0.45, 0.0);
    for (let cm = 0; cm <= 80; cm += 5) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(cm % 10 === 0 ? 0.016 : 0.009, 0.0012, 0.001), MAT.black);
      tick.position.set(0.042 + (cm % 10 === 0 ? 0 : 0.0035), PIVOT_Y - cm / 100, 0.0025);
      this.kit.add(tick);
      if (cm % 10 === 0) {
        const l = label(String(cm), 0.014, 0.008, '#c79a5b');
        l.position.set(0.058, PIVOT_Y - cm / 100, 0.0026);
        this.kit.add(l);
      }
    }
    this.kit.add(base, rod, boss, arm, armX, cork, rule);

    this.pivot.set(0, PIVOT_Y, 0.05);
    this.string = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 1, 6), MAT.white);
    this.string.geometry.translate(0, -0.5, 0);
    this.string.position.copy(this.pivot);
    this.bob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 20, 14), MAT.brass);
    tagAll(this.bob, 'pend_bob', 'Pendulum bob', 'Hold it, pull aside, let go', 'pendulum');
    this.bob.name = 'pend_bob';
    this.string.userData.keepSeparate = true;
    this.kit.add(this.string, this.bob);

    this.watch.root.position.set(0.22, 0, 0.16);
    this.watch.root.rotation.y = -0.3;
    this.kit.add(this.watch.root);
    scene.add(this.kit);
    this.layout();
  }

  private len() {
    return labStore.get().pendulum.length;
  }

  /** Place string and bob for the current angle. */
  private layout() {
    const L = this.len();
    this.string.scale.set(1, L, 1);
    this.string.rotation.z = this.angle;
    this.bob.position.set(this.pivot.x + Math.sin(this.angle) * L, this.pivot.y - Math.cos(this.angle) * L, this.pivot.z);
  }

  protected async perform(id: string) {
    const H = this.hands;
    if (id === 'pend_watch') {
      const at = this.watch.root.getWorldPosition(new THREE.Vector3());
      await this.press(this.hands.sideFor(at), at.clone().add(new THREE.Vector3(0, 0.012, 0)), () => {
        this.watch.toggle();
        soundFx.playClick();
      });
    } else if (id === 'pend_clamp') {
      // Stop the bob, loosen the clamp, slide the string through the cork, tighten
      labStore.update('pendulum', { swinging: false });
      this.angle = 0;
      const at = this.kit.localToWorld(this.pivot.clone());
      await this.turn('left', at, 0.6, () => {
        const i = LENGTHS.indexOf(this.len());
        labStore.update('pendulum', { length: LENGTHS[(i + 1) % LENGTHS.length] });
        soundFx.playKnobTick();
      });
    } else if (id === 'pend_bob') {
      if (labStore.get().pendulum.swinging) {
        // Catch it
        const at = this.bob.getWorldPosition(new THREE.Vector3());
        await H.move('right', { wrist: at.clone().add(new THREE.Vector3(0.03, 0.02, 0.06)), grip: 0.5 }, 0.3);
        labStore.update('pendulum', { swinging: false });
        this.angle = 0;
        await H.rest('right', 0.4);
        return;
      }
      // Pinch the bob, draw it aside (small angle), and let go
      const rest = this.bob.getWorldPosition(new THREE.Vector3());
      await H.move('right', { wrist: rest.clone().add(new THREE.Vector3(0.03, 0.02, 0.06)), grip: 0.15, twist: 0, flex: 0 }, 0.45);
      await H.move('right', { grip: 0.6 }, 0.15);
      this.held = true;
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        this.angle = (AMPLITUDE * i) / steps;
        this.layout();
        const p = this.bob.getWorldPosition(new THREE.Vector3());
        await H.move('right', { wrist: p.add(new THREE.Vector3(0.03, 0.02, 0.06)) }, 0.05);
      }
      await H.wait(0.25);
      this.held = false;
      this.t = 0;
      labStore.update('pendulum', { swinging: true });
      await H.move('right', { grip: 0.1 }, 0.1);
      await H.rest('right', 0.45);
    }
  }

  update(delta: number) {
    this.updateKnobHand(delta);
    this.watch.update();
    if (labStore.get().pendulum.swinging && !this.held) {
      this.t += delta;
      // Large swings are slower than the simple formula says (period grows ~ θ²/16)
      const w = Math.sqrt(G / this.len()) / (1 + (this.amp * this.amp) / 16);
      this.angle = this.amp * Math.exp(-0.015 * this.t) * Math.cos(w * this.t);
    } else if (!this.held) {
      this.angle = THREE.MathUtils.damp(this.angle, 0, 6, delta);
    }
    this.layout();
  }

  /** True period for the current length (for checking a student's timing). */
  get truePeriod() {
    return pendulumPeriod(this.len());
  }

  protected isAnimatingExtra() {
    return labStore.get().pendulum.swinging || this.watch.running || Math.abs(this.angle) > 0.001;
  }

  reset() {
    this.angle = 0;
    this.t = 0;
    this.amp = AMPLITUDE;
    this.held = false;
  }
}
