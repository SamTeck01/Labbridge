import * as THREE from 'three';
import { tagInteractive } from '@/lib/lab3dEquipment';
import { labStore, circuit, rotorImbalance, type Objective } from '@/lib/labStore';
import { SPECIMEN_CATALOG } from '@/lib/specimenGenerator';
import { soundFx } from '@/lib/soundEffects';
import { curie } from '@/lib/curie';
import { FirstPersonHands } from '@/lib/workbench/hands';
import { Drops } from '@/lib/workbench/liquids';

/**
 * Hands-on benches beyond titration. Each bench turns taps into hand actions on its apparatus and
 * animates the apparatus smoothly from lab state (the scene no longer snaps meshes directly).
 * Everything the camera faces is on the +z side of the apparatus (the student stands at +z).
 */

export interface Workbench {
  /** point: where on the object the student tapped (world), when known. */
  tap(id: string, point?: THREE.Vector3): boolean;
  update(delta: number): void;
  reset(): void;
  readonly isBusy: boolean;
}

export type Focus = (p: THREE.Vector3 | null) => void;
const TOWARD_STUDENT = new THREE.Vector3(0, 0, 1);

export abstract class BenchBase implements Workbench {
  protected busy = false;
  protected abstract ids: string[];
  constructor(protected scene: THREE.Scene, protected rig: THREE.Object3D, protected hands: FirstPersonHands, protected focus: Focus) {}

  get isBusy() {
    return this.busy || this.isAnimatingExtra();
  }

  /** Benches with their own short animations (e.g. a centrifuge wobble) override this. */
  protected isAnimatingExtra() {
    return false;
  }

  private queued: string | null = null;
  /** Where the current/queued tap landed. */
  protected tapPoint: THREE.Vector3 | null = null;

  /** Taps during an action are queued (latest wins) and performed next, never silently dropped. */
  tap(id: string, point?: THREE.Vector3) {
    if (!this.ids.includes(id)) return false;
    this.tapPoint = point?.clone() ?? null;
    if (this.busy) {
      this.queued = id;
      return true;
    }
    this.busy = true;
    this.perform(id)
      .catch((e) => console.error('bench action failed', e))
      .finally(() => {
        this.busy = false;
        const next = this.queued;
        this.queued = null;
        if (next) this.tap(next);
      });
    return true;
  }

  protected abstract perform(id: string): Promise<void>;
  abstract update(delta: number): void;
  reset() {}

  // Parts are remembered by name on first lookup: once a hand picks something up it leaves the
  // rig's hierarchy, and a fresh search of the rig would no longer find it.
  private nodeCache = new Map<string, THREE.Object3D | null>();
  protected node(name: string) {
    if (!this.nodeCache.has(name) || !this.nodeCache.get(name)) this.nodeCache.set(name, this.rig.getObjectByName(name) ?? null);
    return this.nodeCache.get(name) ?? null;
  }

  protected pos(obj: THREE.Object3D | string) {
    const o = typeof obj === 'string' ? this.node(obj) : obj;
    return o ? o.getWorldPosition(new THREE.Vector3()) : null;
  }

  /** Reach a control from the student's side, grip it and roll the wrist (knobs, dials). */
  protected async turn(side: 'left' | 'right', at: THREE.Vector3, twist: number, onTurned: () => void) {
    const H = this.hands;
    const out = side === 'right' ? 0.03 : -0.03;
    const wrist = at.clone().addScaledVector(TOWARD_STUDENT, 0.055).add(new THREE.Vector3(out, 0.005, 0));
    await H.move(side, { wrist: wrist.clone().add(new THREE.Vector3(0, 0.04, 0.03)), grip: 0.2, twist: 0, flex: 0 }, 0.45);
    await H.move(side, { wrist, grip: 0.55 }, 0.2);
    await H.move(side, { twist }, 0.3);
    onTurned();
    await H.move(side, { grip: 0.2 }, 0.12);
    await H.rest(side, 0.45);
  }

  /** Press a button with the fingertips. */
  protected async press(side: 'left' | 'right', at: THREE.Vector3, onPressed: () => void) {
    const H = this.hands;
    const wrist = at.clone().addScaledVector(TOWARD_STUDENT, 0.075).add(new THREE.Vector3(0, 0.02, 0));
    await H.move(side, { wrist: wrist.clone().add(new THREE.Vector3(0, 0.03, 0.03)), grip: 0.35, flex: 0.2, twist: 0 }, 0.45);
    await H.move(side, { wrist: wrist.clone().addScaledVector(TOWARD_STUDENT, -0.015) }, 0.15);
    onPressed();
    await H.move(side, { wrist }, 0.15);
    await H.rest(side, 0.45);
  }
}

const damp = (cur: number, target: number, rate: number, delta: number) => THREE.MathUtils.damp(cur, target, rate, delta);

// ---------------------------------------------------------------------------------------------
// Microscope
// ---------------------------------------------------------------------------------------------

const TURRET_ANGLE: Record<Objective, number> = { '4x': 0, '10x': Math.PI / 2, '40x': Math.PI, '100x': -Math.PI / 2 };
const OBJECTIVES: Objective[] = ['4x', '10x', '40x', '100x'];

export class MicroscopeBench extends BenchBase {
  protected ids = ['micro_slide', 'micro_turret', 'micro_coarse_focus', 'coarse_knob_r', 'micro_fine_focus', 'fine_knob_r', 'micro_light_switch', 'micro_eyepieces', 'micro_stage_knob', 'micro_oil'];
  private turretAngle = 0;
  private stageBaseY: number | null = null;
  private knobSpin = { coarse: 0, fine: 0 };
  private looseSlide: THREE.Mesh;
  private oilBottle: THREE.Group;
  private oilDrops: Drops;
  private slideBaseX: number | null = null;
  private stageKnobSpin = 0;

  constructor(scene: THREE.Scene, rig: THREE.Object3D, hands: FirstPersonHands, focus: Focus, private openEyepieces: () => void) {
    super(scene, rig, hands, focus);
    // Right-hand knobs lower the stage (same controls, other side of the microscope)
    for (const [name, label] of [['coarse_knob_r', 'Coarse Focus Knob (right)'], ['fine_knob_r', 'Fine Focus Knob (right)']] as const) {
      this.node(name)?.traverse((o) => tagInteractive(o, name, label, 'Turn to lower the stage', 'biology', 'knob'));
    }
    // A prepared slide carried from the slide box to the stage
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.0012, 0.025),
      new THREE.MeshStandardMaterial({ color: '#dff0f5', transparent: true, opacity: 0.55, roughness: 0.05 })
    );
    const stain = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.0014, 20), new THREE.MeshStandardMaterial({ color: '#8c3a78', roughness: 0.4 }));
    glass.add(stain);
    glass.visible = false;
    glass.userData.keepSeparate = true;
    this.looseSlide = glass;
    scene.add(glass);
    const t = rig.getObjectByName('micro_turret');
    if (t) this.turretAngle = t.rotation.y;

    // Immersion oil dropper bottle beside the microscope (needed for the 100x objective)
    this.oilBottle = new THREE.Group();
    const amber = new THREE.MeshStandardMaterial({ color: '#7a3b0a', transparent: true, opacity: 0.85, roughness: 0.1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.05, 16), amber);
    body.position.y = 0.025;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.025, 12), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.6 }));
    cap.position.y = 0.062;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0152, 0.0152, 0.02, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: 0.9 }));
    label.position.y = 0.025;
    this.oilBottle.add(body, cap, label);
    const base = rig.getWorldPosition(new THREE.Vector3());
    this.oilBottle.position.set(base.x + 0.17, base.y, base.z + 0.09);
    this.oilBottle.traverse((o) => tagInteractive(o, 'micro_oil', 'Immersion Oil', 'Put a drop of oil on the slide (for 100x)', 'biology', 'primary'));
    this.oilBottle.userData.keepSeparate = true;
    scene.add(this.oilBottle);
    this.oilDrops = new Drops(scene, '#f2c46a', 0.0018, 4);
    this.node('micro_stage_knob');
  }

  protected async perform(id: string) {
    const H = this.hands;
    const bio = () => labStore.get().biology;
    if (id === 'micro_slide') {
      // Take the next slide from the box and lay it on the stage under the clips
      const box = this.pos('micro_slide');
      const stage = this.pos('micro_stage');
      if (!box || !stage) return;
      const grab = box.clone().add(new THREE.Vector3(0, 0.035, 0));
      this.looseSlide.position.copy(grab);
      this.looseSlide.quaternion.identity();
      this.looseSlide.visible = true;
      await H.move('right', { wrist: grab.clone().add(new THREE.Vector3(0.02, 0.05, 0.08)), grip: 0.1 }, 0.5);
      await H.move('right', { wrist: grab.clone().add(new THREE.Vector3(0.02, 0.01, 0.06)), grip: 0.1 }, 0.25);
      await H.move('right', { grip: 0.5 }, 0.15);
      H.grab('right', this.looseSlide);
      soundFx.playGlassSlide();
      const onStage = stage.clone().add(new THREE.Vector3(0, 0.012, 0));
      await H.move('right', { wrist: onStage.clone().add(new THREE.Vector3(0.03, 0.06, 0.07)) }, 0.6);
      await H.move('right', { wrist: onStage.clone().add(new THREE.Vector3(0.03, 0.015, 0.06)) }, 0.3);
      H.release('right', this.scene);
      this.looseSlide.visible = false;
      labStore.update('biology', { slideIndex: (bio().slideIndex + 1) % SPECIMEN_CATALOG.length });
      soundFx.playGlassSlide();
      await H.move('right', { grip: 0.1 }, 0.12);
      await H.rest('right', 0.5);
    } else if (id === 'micro_turret') {
      const at = this.pos('micro_turret');
      if (!at) return;
      // Turn toward the side that was tapped: left = lower power, right = higher power (no wrap-around)
      const leftSide = this.tapPoint ? this.hands.leftOf(this.tapPoint, at) : false;
      const idx = OBJECTIVES.indexOf(bio().objective);
      const next = OBJECTIVES[THREE.MathUtils.clamp(idx + (leftSide ? -1 : 1), 0, OBJECTIVES.length - 1)];
      if (next === bio().objective) return;
      await this.turn(this.hands.sideFor(at), at, 0.9, () => {
        labStore.update('biology', { objective: next });
        soundFx.playLensTurretClick();
      });
    } else if (id === 'micro_coarse_focus' || id === 'coarse_knob_r' || id === 'micro_fine_focus' || id === 'fine_knob_r') {
      const coarse = id.includes('coarse');
      const up = id.startsWith('micro_'); // left knobs raise the stage, right knobs lower it
      const side = up ? 'left' : 'right';
      const at = this.pos(id);
      if (!at) return;
      const step = (coarse ? 0.05 : 0.015) * (up ? 1 : -1);
      await this.turn(side, at, up ? 0.8 : -0.8, () => {
        const b = bio();
        const key = coarse ? 'coarseFocus' : 'fineFocus';
        labStore.update('biology', { [key]: THREE.MathUtils.clamp(b[key] + step, 0, 1) });
        this.knobSpin[coarse ? 'coarse' : 'fine'] += step * 20;
        soundFx.playKnobTick();
      });
    } else if (id === 'micro_stage_knob') {
      // Each turn moves the slide across the field of view (back and forth across the specimen)
      const at = this.pos('micro_stage_knob');
      if (!at) return;
      await this.turn(this.hands.sideFor(at), at, 0.8, () => {
        const x = bio().stageX;
        labStore.update('biology', { stageX: x >= 0.6 ? -0.6 : Math.round((x + 0.3) * 10) / 10 });
        this.stageKnobSpin += 1.2;
        soundFx.playKnobTick();
      });
    } else if (id === 'micro_oil') {
      const H = this.hands;
      const stage = this.pos('micro_stage');
      if (!stage) return;
      const home = this.oilBottle.position.clone();
      const grab = home.clone().add(new THREE.Vector3(0, 0.04, 0));
      await H.move('right', { wrist: grab.clone().add(new THREE.Vector3(0.03, 0.05, 0.07)), grip: 0.15, twist: 0, flex: 0 }, 0.45);
      await H.move('right', { wrist: grab.clone().add(new THREE.Vector3(0.03, 0.0, 0.05)) }, 0.2);
      await H.move('right', { grip: 0.65 }, 0.15);
      H.grab('right', this.oilBottle);
      const over = stage.clone().add(new THREE.Vector3(0.0, 0.11, 0));
      await H.move('right', { wrist: over.clone().add(new THREE.Vector3(0.03, 0.0, 0.05)), twist: 1.6 }, 0.7);
      const tip = this.oilBottle.localToWorld(new THREE.Vector3(0, 0.075, 0));
      this.oilDrops.spawn(tip, stage.y + 0.012, () => {
        labStore.update('biology', { immersionOil: true });
        soundFx.playDropLiquid();
      });
      await H.wait(0.8);
      await H.move('right', { twist: 0 }, 0.4);
      await H.move('right', { wrist: grab.clone().add(new THREE.Vector3(0.03, 0.0, 0.05)) }, 0.6);
      H.release('right', this.scene);
      this.oilBottle.position.copy(home);
      this.oilBottle.quaternion.identity();
      await H.move('right', { grip: 0.15 }, 0.12);
      await H.rest('right', 0.45);
    } else if (id === 'micro_light_switch') {
      const at = this.pos('micro_light_switch');
      if (!at) return;
      await this.turn('right', at, 0.7, () => {
        labStore.update('biology', { lightIntensity: bio().lightIntensity > 0.5 ? 0.3 : 1.0 });
        soundFx.playClick();
      });
    } else if (id === 'micro_eyepieces') {
      // Lean in to the eyepieces, then look through them
      const eye = this.pos('micro_eyepieces');
      if (!eye) return;
      this.focus(eye);
      await H.wait(0.6);
      this.openEyepieces();
      await H.wait(0.3);
      this.focus(null);
    }
  }

  update(delta: number) {
    const b = labStore.get().biology;
    this.oilDrops.update(delta);
    // The stage knob moves the slide on the stage
    const slide = this.node('glass_slide');
    if (slide) {
      if (this.slideBaseX === null) this.slideBaseX = slide.position.x;
      slide.position.x = damp(slide.position.x, this.slideBaseX + b.stageX * 0.02, 8, delta);
    }
    const sk = this.node('micro_stage_knob');
    if (sk) sk.rotation.y = damp(sk.rotation.y, this.stageKnobSpin, 8, delta); // vertical knob
    const turret = this.node('micro_turret');
    if (turret) {
      // Rotate the short way round to the selected objective
      const target = TURRET_ANGLE[b.objective];
      const diff = Math.atan2(Math.sin(target - this.turretAngle), Math.cos(target - this.turretAngle));
      this.turretAngle += diff * Math.min(1, delta * 6);
      turret.rotation.y = this.turretAngle;
    }
    const stage = this.node('micro_stage');
    if (stage) {
      if (this.stageBaseY === null) this.stageBaseY = stage.position.y;
      stage.position.y = damp(stage.position.y, this.stageBaseY + (b.coarseFocus - 0.5) * 0.02 + (b.fineFocus - 0.5) * 0.002, 8, delta);
    }
    for (const [name, key] of [['micro_coarse_focus', 'coarse'], ['coarse_knob_r', 'coarse'], ['micro_fine_focus', 'fine'], ['fine_knob_r', 'fine']] as const) {
      const n = this.node(name);
      if (n) n.rotation.x = damp(n.rotation.x, this.knobSpin[key], 8, delta);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// DC circuit
// ---------------------------------------------------------------------------------------------

export class CircuitBench extends BenchBase {
  protected ids = ['phys_knife_switch', 'phys_potentiometer', 'phys_voltage_knob', 'phys_return_lead'];
  private voltSpin = 0;
  private needle = 0.87;
  private needleVel = 0;
  private glow = 0;

  protected async perform(id: string) {
    const H = this.hands;
    const p = () => labStore.get().physics;
    if (id === 'phys_knife_switch') {
      const pivot = this.node('phys_knife_switch');
      if (!pivot) return;
      // Grip the insulated handle at the free end of the blade and swing it
      const handle = pivot.localToWorld(new THREE.Vector3(0.13, 0.0, 0));
      const closing = !p().switchClosed;
      const side = H.sideFor(handle);
      await H.move(side, { wrist: handle.clone().add(new THREE.Vector3(0.02, 0.07, 0.07)), grip: 0.2, twist: 0, flex: 0 }, 0.45);
      await H.move(side, { wrist: handle.clone().add(new THREE.Vector3(0.02, 0.03, 0.06)), grip: 0.6 }, 0.2);
      labStore.update('physics', { switchClosed: closing });
      soundFx.playSwitchToggle(closing);
      await H.move(side, { wrist: handle.clone().add(new THREE.Vector3(0.02, closing ? 0.0 : 0.09, 0.06)) }, 0.3);
      await H.move(side, { grip: 0.2 }, 0.12);
      await H.rest(side, 0.45);
    } else if (id === 'phys_return_lead') {
      // Pick up the plug and push it into the supply's terminal (or pull it out)
      const plug = this.node('lead_return_plug');
      const terminal = this.rig.localToWorld(new THREE.Vector3(-0.45, 0.055, 0.08));
      const loose = plug ? plug.getWorldPosition(new THREE.Vector3()) : terminal;
      const plugging = !p().wired;
      const from = plugging ? loose : terminal;
      const to = plugging ? terminal : loose;
      const side = this.hands.sideFor(from);
      await H.move(side, { wrist: from.clone().add(new THREE.Vector3(0.02, 0.06, 0.06)), grip: 0.15, twist: 0, flex: 0 }, 0.45);
      await H.move(side, { wrist: from.clone().add(new THREE.Vector3(0.02, 0.02, 0.05)), grip: 0.6 }, 0.2);
      if (!plugging) labStore.update('physics', { wired: false });
      await H.move(side, { wrist: to.clone().add(new THREE.Vector3(0.02, 0.04, 0.05)) }, 0.55);
      await H.move(side, { wrist: to.clone().add(new THREE.Vector3(0.02, 0.015, 0.05)) }, 0.15);
      if (plugging) labStore.update('physics', { wired: true });
      soundFx.playClick();
      await H.move(side, { grip: 0.15 }, 0.1);
      await H.rest(side, 0.45);
    } else if (id === 'phys_voltage_knob') {
      const at = this.pos('phys_voltage_knob');
      if (!at) return;
      await this.turn(this.hands.sideFor(at), at, 1.0, () => {
        const v = p().voltage;
        const next = v >= 12 ? 3 : v + 3;
        labStore.update('physics', { voltage: next });
        this.voltSpin = ((next - 3) / 9) * Math.PI * 1.5;
        soundFx.playKnobTick();
        curie.say(`Power supply set to ${next} V.`);
      });
    } else if (id === 'phys_potentiometer') {
      const at = this.pos('phys_potentiometer');
      if (!at) return;
      await this.turn(this.hands.sideFor(at), at.clone().add(new THREE.Vector3(0, 0.02, 0)), 1.0, () => {
        const r = p().resistance;
        labStore.update('physics', { resistance: r >= 100 ? 10 : Math.min(100, r + 15) });
        soundFx.playKnobTick();
      });
    }
  }

  update(delta: number) {
    const s = labStore.get().physics;
    const u = this.rig.userData;
    // Return lead: plugged-in or loose on the bench
    const on = this.node('lead_return_connected');
    if (on) on.visible = s.wired;
    const off = this.node('lead_return_loose');
    if (off) off.visible = !s.wired;
    const plugMesh = this.node('lead_return_plug');
    if (plugMesh) plugMesh.visible = !s.wired;
    const vk = this.node('phys_voltage_knob');
    if (vk) vk.rotation.z = damp(vk.rotation.z, -this.voltSpin, 8, delta); // knob faces the student: spins about z
    const blade = u.blade as THREE.Object3D | undefined;
    if (blade) blade.rotation.z = damp(blade.rotation.z, s.switchClosed ? 0 : 0.6, 10, delta);
    const knob = u.potKnob as THREE.Object3D | undefined;
    if (knob) knob.rotation.y = damp(knob.rotation.y, -(s.resistance / 100) * Math.PI * 1.5, 8, delta);

    // Ammeter needle: a damped spring, so it swings and settles like a real moving-coil meter
    const { current, power } = circuit(s.voltage, s.resistance, s.switchClosed, s.wired);
    const target = 0.87 - Math.min(1, current) * 1.74;
    this.needleVel += ((target - this.needle) * 60 - this.needleVel * 9) * delta;
    this.needle += this.needleVel * delta;
    const needle = u.ammeterNeedle as THREE.Object3D | undefined;
    if (needle) needle.rotation.z = this.needle;

    // Filament warms up and cools down rather than switching instantly
    this.glow = damp(this.glow, s.switchClosed ? Math.min(1, power / 8) : 0, 7, delta);
    const light = u.bulbLight as THREE.PointLight | undefined;
    if (light) light.intensity = this.glow * 3.5;
    const glass = (u.bulbGlass as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined;
    if (glass?.emissive) glass.emissiveIntensity = 0.05 + this.glow * 1.6;
  }
}

// ---------------------------------------------------------------------------------------------
// Analytical balance + centrifuge
// ---------------------------------------------------------------------------------------------

const BOAT_MASS = 1.2034;

export class BalanceBench extends BenchBase {
  protected ids = ['res_balance_door', 'res_weigh_boat', 'res_tare_btn', 'res_centrifuge_start', 'res_centrifuge_lid', 'sample_jar', 'spatula', ...Array.from({ length: 8 }, (_, i) => `rotor_slot_${i}`)];
  private lidAngle = 0;
  private rigRest: THREE.Vector3 | null = null;
  private wobble = 0;
  private slotTubes: THREE.Object3D[][] = Array.from({ length: 8 }, () => []);
  private slotPoints: THREE.Vector3[] = [];
  private looseTube: THREE.Mesh;
  private doorBaseZ: number | null = null;
  private spatula: THREE.Group;
  private spatulaHome = new THREE.Matrix4();
  private scoop: THREE.Mesh;
  private heap: THREE.Mesh;
  private grains: THREE.InstancedMesh;
  private falling: { p: THREE.Vector3; v: number; floor: number }[] = [];
  private jar: THREE.Group;

  constructor(scene: THREE.Scene, rig: THREE.Object3D, hands: FirstPersonHands, focus: Focus) {
    super(scene, rig, hands, focus);
    const powder = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.95 });
    const steel = new THREE.MeshStandardMaterial({ color: '#c9cdd2', metalness: 1, roughness: 0.25 });
    const balance = this.pos('res_weigh_boat') ?? rig.getWorldPosition(new THREE.Vector3());
    const rigPos = rig.getWorldPosition(new THREE.Vector3());

    // Sample jar (open) beside the balance, with powder inside
    this.jar = new THREE.Group();
    const jarGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.06, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: '#b9d3e6', transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })
    );
    jarGlass.position.y = 0.03;
    const jarPowder = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 24), powder);
    jarPowder.position.y = 0.015;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0282, 0.0282, 0.02, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: 0.9 }));
    label.position.y = 0.035;
    this.jar.add(jarGlass, jarPowder, label);
    this.jar.position.set(balance.x + 0.24, rigPos.y, rigPos.z + 0.12);
    this.jar.traverse((o) => tagInteractive(o, 'sample_jar', 'Sample (NaCl)', 'Scoop sample onto the weighing boat', 'research', 'primary'));
    scene.add(this.jar);

    // Micro-spatula resting across the jar mouth
    this.spatula = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0015, 0.15), steel);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.0012, 0.022), steel);
    blade.position.z = -0.085;
    this.scoop = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 6), powder);
    this.scoop.scale.y = 0.5;
    this.scoop.position.set(0, 0.002, -0.088);
    this.scoop.visible = false;
    this.spatula.add(shaft, blade, this.scoop);
    this.spatula.position.set(this.jar.position.x + 0.04, rigPos.y + 0.004, this.jar.position.z + 0.03);
    this.spatula.rotation.y = 0.5;
    this.spatula.traverse((o) => tagInteractive(o, 'spatula', 'Micro-spatula', 'Scoop sample onto the weighing boat', 'research', 'primary'));
    this.spatula.updateMatrixWorld(true);
    this.spatulaHome.copy(this.spatula.matrixWorld);
    scene.add(this.spatula);

    // Powder heap in the weighing boat, grows with the mass added
    this.heap = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20), powder);
    this.heap.visible = false;
    this.heap.position.copy(balance).add(new THREE.Vector3(0, 0.003, 0));
    this.heap.userData.keepSeparate = true;
    scene.add(this.heap);

    this.grains = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0009, 5, 4), powder, 60);
    this.grains.count = 0;
    this.grains.frustumCulled = false;
    this.grains.userData.keepSeparate = true;
    scene.add(this.grains);
    [this.jar, this.spatula].forEach((o) => (o.userData.keepSeparate = true));

    // ---- Centrifuge: rotor slots the student loads tubes into ----
    const rotor = this.node('res_centrifuge_rotor');
    const centre = rotor ? rotor.getWorldPosition(new THREE.Vector3()) : rigPos.clone();
    rotor?.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh || !/^rotor_(tube|cap)/.test(o.name)) return;
      const p = (o as THREE.Mesh).geometry.boundingBox ?? ((o as THREE.Mesh).geometry.computeBoundingBox(), (o as THREE.Mesh).geometry.boundingBox!);
      const w = o.localToWorld(p.getCenter(new THREE.Vector3()));
      const a = Math.atan2(-(w.z - centre.z), w.x - centre.x);
      const i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
      this.slotTubes[i].push(o);
      o.visible = false; // the rotor starts empty
    });
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const pt = centre.clone().add(new THREE.Vector3(Math.cos(a) * 0.1, 0.035, -Math.sin(a) * 0.1));
      this.slotPoints.push(pt);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), hitMat);
      hit.position.copy(pt);
      tagInteractive(hit, `rotor_slot_${i}`, `Rotor position ${i + 1}`, 'Load / unload a sample tube', 'research', 'primary');
      scene.add(hit);
    }
    this.looseTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0075, 0.006, 0.07, 12),
      new THREE.MeshStandardMaterial({ color: '#e6e6dc', transparent: true, opacity: 0.75, roughness: 0.2 })
    );
    this.looseTube.visible = false;
    this.looseTube.userData.keepSeparate = true;
    scene.add(this.looseTube);
  }

  protected async perform(id: string) {
    const H = this.hands;
    const r = () => labStore.get().research;
    if (id === 'res_balance_door') {
      const door = this.node('res_balance_door');
      if (!door) return;
      const handle = door.localToWorld(new THREE.Vector3(0.008, 0.19, 0.08));
      const opening = !r().doorsOpen;
      await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.06, 0.01, 0.05)), grip: 0.2, twist: 0.3, flex: 0 }, 0.45);
      await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.035, 0.0, 0.03)), grip: 0.55 }, 0.2);
      labStore.update('research', { doorsOpen: opening });
      soundFx.playClick();
      await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.035, 0.0, opening ? -0.17 : 0.03)) }, 0.45);
      await H.move('right', { grip: 0.2 }, 0.12);
      await H.rest('right', 0.5);
    } else if (id === 'res_tare_btn') {
      const at = this.pos('res_tare_btn');
      if (at) await this.press(this.hands.sideFor(at), at, () => {
        labStore.update('research', { tareOffset: r().massOnPan });
        soundFx.playBeep();
      });
    } else if (id === 'res_centrifuge_lid') {
      if (r().centrifugeRunning) {
        curie.say('Never open a centrifuge while the rotor is spinning. Stop it and wait.');
        return;
      }
      const lid = this.node('res_centrifuge_lid');
      if (!lid) return;
      const front = lid.localToWorld(new THREE.Vector3(0, 0, 0.16));
      const opening = !r().centrifugeLidOpen;
      const side = this.hands.sideFor(front);
      await H.move(side, { wrist: front.clone().add(new THREE.Vector3(0, 0.05, 0.07)), grip: 0.2, twist: 0, flex: 0 }, 0.45);
      await H.move(side, { grip: 0.55 }, 0.15);
      labStore.update('research', { centrifugeLidOpen: opening });
      soundFx.playClick();
      await H.move(side, { wrist: front.clone().add(new THREE.Vector3(0, opening ? 0.18 : 0.02, opening ? -0.05 : 0.06)) }, 0.5);
      await H.move(side, { grip: 0.2 }, 0.12);
      await H.rest(side, 0.45);
    } else if (id.startsWith('rotor_slot_')) {
      if (!r().centrifugeLidOpen) {
        curie.say('Open the centrifuge lid first.');
        return;
      }
      const i = Number(id.slice('rotor_slot_'.length));
      const slots = [...r().rotorSlots];
      const rack = this.rig.localToWorld(new THREE.Vector3(0.62, 0.08, 0.05));
      const slot = this.slotPoints[i];
      const loading = !slots[i];
      // Carry a tube between the rack and the rotor position
      const from = loading ? rack : slot;
      const to = loading ? slot : rack;
      await H.move('right', { wrist: from.clone().add(new THREE.Vector3(0.03, 0.08, 0.06)), grip: 0.15, twist: 0, flex: 0 }, 0.5);
      await H.move('right', { wrist: from.clone().add(new THREE.Vector3(0.03, 0.03, 0.05)) }, 0.2);
      await H.move('right', { grip: 0.6 }, 0.12);
      this.looseTube.position.copy(from).add(new THREE.Vector3(0, 0.02, 0));
      this.looseTube.quaternion.identity();
      this.looseTube.visible = true;
      if (!loading) {
        slots[i] = false;
        labStore.update('research', { rotorSlots: slots });
      }
      H.grab('right', this.looseTube);
      await H.move('right', { wrist: to.clone().add(new THREE.Vector3(0.03, 0.1, 0.06)) }, 0.6);
      await H.move('right', { wrist: to.clone().add(new THREE.Vector3(0.03, 0.03, 0.05)) }, 0.25);
      H.release('right', this.scene);
      this.looseTube.visible = false;
      if (loading) {
        slots[i] = true;
        labStore.update('research', { rotorSlots: slots });
      }
      soundFx.playGlassSlide();
      await H.move('right', { grip: 0.15 }, 0.12);
      await H.rest('right', 0.45);
    } else if (id === 'res_centrifuge_start') {
      const at = this.pos('res_centrifuge_start');
      if (!at) return;
      await this.press(this.hands.sideFor(at), at, () => {
        const st = r();
        if (st.centrifugeRunning) {
          labStore.update('research', { centrifugeRunning: false });
          soundFx.playBeep();
        } else if (st.centrifugeLidOpen) {
          curie.say('The lid must be closed and latched before it will start.');
          soundFx.playBeep();
        } else if (!st.rotorSlots.some(Boolean)) {
          curie.say('The rotor is empty. Load your sample tubes first, opposite each other.');
        } else if (rotorImbalance(st.rotorSlots) > 0.05) {
          // Unbalanced: violent wobble, then the safety cut-out stops it
          this.wobble = 1.6;
          soundFx.playCentrifugeSpin();
          curie.say('Stop! The rotor is unbalanced. Tubes must be placed opposite each other, equal weight, or it shakes itself apart.');
        } else {
          labStore.update('research', { centrifugeRunning: true });
          soundFx.playCentrifugeSpin();
        }
      });
    } else if (id === 'res_weigh_boat' || id === 'sample_jar' || id === 'spatula') {
      if (!r().doorsOpen) {
        curie.say('Slide the draft shield open first: you need to reach the weighing boat.');
        return;
      }
      await this.scoopSample();
    }
  }

  /** Pick up the spatula, scoop from the jar, and tap sample into the weighing boat. */
  private async scoopSample() {
    const H = this.hands;
    const home = this.spatula.getWorldPosition(new THREE.Vector3());
    await H.move('right', { wrist: home.clone().add(new THREE.Vector3(0.05, 0.05, 0.08)), grip: 0.15, twist: 0, flex: 0 }, 0.45);
    await H.move('right', { wrist: home.clone().add(new THREE.Vector3(0.05, 0.02, 0.07)) }, 0.2);
    await H.move('right', { grip: 0.6 }, 0.15);
    H.grab('right', this.spatula);
    // Dip into the jar
    const jarTop = this.jar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.04, 0));
    await H.move('right', { wrist: jarTop.clone().add(new THREE.Vector3(0.05, 0.08, 0.1)) }, 0.45);
    await H.move('right', { wrist: jarTop.clone().add(new THREE.Vector3(0.05, 0.03, 0.1)), flex: 0.3 }, 0.3);
    this.scoop.visible = true;
    soundFx.playGlassSlide();
    await H.move('right', { wrist: jarTop.clone().add(new THREE.Vector3(0.05, 0.1, 0.1)), flex: 0 }, 0.3);
    // Into the balance chamber, over the boat, and tap it off
    const boat = this.pos('res_weigh_boat')!;
    this.focus(boat);
    await H.move('right', { wrist: boat.clone().add(new THREE.Vector3(0.07, 0.07, 0.11)) }, 0.6);
    const added = 0.02 + Math.random() * 0.03;
    for (let i = 0; i < 3; i++) {
      await H.move('right', { twist: 0.35 }, 0.1);
      const tip = this.scoop.getWorldPosition(new THREE.Vector3());
      for (let g = 0; g < 7; g++) {
        this.falling.push({ p: tip.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.004, 0, (Math.random() - 0.5) * 0.004)), v: Math.random() * 0.1, floor: boat.y + 0.004 });
      }
      await H.move('right', { twist: 0 }, 0.12);
    }
    this.scoop.visible = false;
    labStore.update('research', { massOnPan: labStore.get().research.massOnPan + added });
    this.focus(null);
    // Lay the spatula back on the jar
    await H.move('right', { wrist: home.clone().add(new THREE.Vector3(0.05, 0.08, 0.08)) }, 0.55);
    await H.move('right', { wrist: home.clone().add(new THREE.Vector3(0.05, 0.02, 0.07)) }, 0.2);
    H.release('right', this.scene);
    this.spatulaHome.decompose(this.spatula.position, this.spatula.quaternion, this.spatula.scale);
    await H.move('right', { grip: 0.15 }, 0.12);
    await H.rest('right', 0.45);
  }

  update(delta: number) {
    const s = labStore.get().research;
    // Lid hinge, loaded tubes, imbalance wobble
    const lid = this.node('res_centrifuge_lid');
    this.lidAngle = damp(this.lidAngle, s.centrifugeLidOpen ? -1.3 : 0, 7, delta);
    if (lid) lid.rotation.x = this.lidAngle;
    this.slotTubes.forEach((meshes, i) => meshes.forEach((m) => (m.visible = s.rotorSlots[i])));
    if (this.wobble > 0 || this.rigRest) {
      if (!this.rigRest) this.rigRest = this.rig.position.clone();
      this.wobble = Math.max(0, this.wobble - delta);
      const t = performance.now() / 1000;
      this.rig.position.copy(this.rigRest).add(new THREE.Vector3(Math.sin(t * 90), 0, Math.cos(t * 77)).multiplyScalar(0.004 * this.wobble));
      if (this.wobble === 0) {
        this.rig.position.copy(this.rigRest);
        this.rigRest = null;
      }
    }
    const door = this.node('res_balance_door');
    if (door) {
      if (this.doorBaseZ === null) this.doorBaseZ = door.position.z;
      door.position.z = damp(door.position.z, this.doorBaseZ - (s.doorsOpen ? 0.2 : 0), 7, delta);
    }
    // Heap of sample in the boat
    const sample = Math.max(0, s.massOnPan - BOAT_MASS);
    this.heap.visible = sample > 0.002;
    if (this.heap.visible) {
      const r = 0.006 + Math.cbrt(sample) * 0.02;
      this.heap.scale.set(r, r * 0.55, r);
    }
    // Falling grains
    const m = new THREE.Matrix4();
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const g = this.falling[i];
      g.v += 9.8 * delta;
      g.p.y -= g.v * delta;
      if (g.p.y <= g.floor) this.falling.splice(i, 1);
    }
    this.grains.count = Math.min(60, this.falling.length);
    for (let i = 0; i < this.grains.count; i++) this.grains.setMatrixAt(i, m.makeTranslation(this.falling[i].p));
    this.grains.instanceMatrix.needsUpdate = true;
  }

  protected isAnimatingExtra() {
    return this.wobble > 0;
  }

  reset() {
    this.falling = [];
    this.wobble = 0;
  }
}
