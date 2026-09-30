import * as THREE from 'three';
import { loadLabModel } from '@/lib/assetLoader';
import { tagInteractive } from '@/lib/lab3dEquipment';
import { labStore, titrationPH } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';
import { FirstPersonHands } from '@/lib/workbench/hands';
import { Drops, LiquidColumn, LiquidInVessel, PourStream } from '@/lib/workbench/liquids';

/**
 * Hands-on titration: the student's hands pick up the NaOH bottle and pour it through the funnel,
 * pour the HCl from the measuring cylinder, squeeze indicator from the dropper, turn the stopcock
 * and stirrer knob. Every volume in the lab store is drawn as a real liquid level.
 */

// Inner profile of the 250 mL Erlenmeyer flask (height, radius) in metres, from titration_rig.py
const FLASK_PROFILE: [number, number][] = [
  [0, 0.035], [0.003, 0.0395], [0.008, 0.0405], [0.045, 0.0325], [0.085, 0.0205], [0.105, 0.0145], [0.128, 0.014],
];
const CLEAR = new THREE.Color('#e8f1ff');
const PINK = new THREE.Color('#ff3d9a');
const NAOH_BOTTLE_START_ML = 400;

export class TitrationBench {
  private busy = false;
  private queued: string | null = null;
  private rig: THREE.Object3D;
  private scale = 1;
  private bottle: THREE.Object3D | null = null;
  private cylinder: THREE.Object3D | null = null;
  private bottleHome = new THREE.Matrix4();
  private cylinderHome = new THREE.Matrix4();
  private bottleML = NAOH_BOTTLE_START_ML;
  private cylinderML = 25;
  private buretteMain!: LiquidColumn;
  private buretteStem!: LiquidColumn;
  private flask!: LiquidInVessel;
  private bottleLiquid: LiquidColumn | null = null;
  private cylinderLiquid: LiquidColumn | null = null;
  private drops: Drops;
  private stream: PourStream;
  private pour: { from: () => THREE.Vector3; to: THREE.Vector3; flow: number } | null = null;
  private flash = 0;
  private dropTimer = 0;
  private y0 = 0;
  private y50 = 0;

  /** focus: point the student's view at something (null = back to the normal work view). */
  private constructor(private scene: THREE.Scene, rig: THREE.Object3D, private hands: FirstPersonHands, private focus: (p: THREE.Vector3 | null) => void) {
    this.rig = rig;
    this.drops = new Drops(scene, '#dfeaff');
    this.stream = new PourStream(scene, '#dfeaff');
  }

  static async create(scene: THREE.Scene, rig: THREE.Object3D, hands: FirstPersonHands, focus: (p: THREE.Vector3 | null) => void) {
    const bench = new TitrationBench(scene, rig, hands, focus);
    await bench.setup();
    return bench;
  }

  private anchor(name: string) {
    const o = this.rig.getObjectByName(name);
    return o ? o.getWorldPosition(new THREE.Vector3()) : null;
  }

  private async setup() {
    this.rig.updateMatrixWorld(true);
    this.scale = this.rig.getWorldScale(new THREE.Vector3()).x;
    const zero = this.anchor('anchor_burette_zero');
    const fifty = this.anchor('anchor_burette_fifty');
    const tip = this.anchor('anchor_burette_tip');
    const flaskBase = this.anchor('anchor_flask_base');
    if (!zero || !fifty || !tip || !flaskBase) throw new Error('titration rig anchors missing');
    this.y0 = zero.y;
    this.y50 = fifty.y;

    const r = 0.0052 * this.scale;
    this.buretteStem = new LiquidColumn(this.scene, new THREE.Vector3(tip.x, tip.y + 0.03 * this.scale, tip.z), r, fifty.y - (tip.y + 0.03 * this.scale), '#bcd6f5');
    this.buretteMain = new LiquidColumn(this.scene, fifty, r, zero.y - fifty.y, '#bcd6f5', true);
    this.flask = new LiquidInVessel(this.scene, flaskBase, FLASK_PROFILE.map(([y, rr]) => [y * this.scale, rr * this.scale]), '#e8f1ff');

    // Props beside the rig, near the bench edge
    const rigPos = this.rig.getWorldPosition(new THREE.Vector3());
    const [bottle, cyl] = await Promise.all([loadLabModel('naoh-bottle', null), loadLabModel('hcl-cylinder', null)]);
    if (bottle) {
      this.bottle = bottle.root;
      this.bottle.position.set(rigPos.x + 0.3, rigPos.y, rigPos.z + 0.08);
      this.scene.add(this.bottle);
      this.bottle.updateMatrixWorld(true);
      this.bottleHome.copy(this.bottle.matrixWorld);
      const base = this.bottle.getObjectByName('anchor_base')!.position.clone();
      this.bottleLiquid = new LiquidColumn(this.bottle, base, 0.0375, 0.118, '#bcd6f5');
      this.bottle.traverse((o) => tagInteractive(o, 'chem_naoh_bottle', '0.1 M NaOH (500 mL)', 'Pick up and fill the burette', 'chemistry', 'primary'));
    }
    if (cyl) {
      this.cylinder = cyl.root;
      this.cylinder.position.set(rigPos.x - 0.24, rigPos.y, rigPos.z + 0.1);
      this.scene.add(this.cylinder);
      this.cylinder.updateMatrixWorld(true);
      this.cylinderHome.copy(this.cylinder.matrixWorld);
      const base = this.cylinder.getObjectByName('anchor_base')!.position.clone();
      this.cylinderLiquid = new LiquidColumn(this.cylinder, base, 0.0102, 0.14, '#f2f5ff');
      this.cylinder.traverse((o) => tagInteractive(o, 'chem_hcl_cylinder', '25.0 mL of 0.1 M HCl', 'Pour into the flask', 'chemistry', 'primary'));
    }
    this.syncFromStore(true);
  }

  /** Returns true if the tap was handled here (hands will perform it). */
  tap(id: string): boolean {
    const known = ['chem_naoh_bottle', 'chem_hcl_cylinder', 'chem_indicator', 'chem_dropper', 'chem_flask', 'chem_stopcock', 'chem_stirrer_knob'];
    if (!known.includes(id)) return false;
    if (this.busy) {
      this.queued = id; // performed when the current action finishes
      return true;
    }
    const run = async (fn: () => Promise<void>) => {
      this.busy = true;
      try {
        await fn();
      } finally {
        this.busy = false;
        const next = this.queued;
        this.queued = null;
        if (next) this.tap(next);
      }
    };
    if (id === 'chem_naoh_bottle') run(() => this.fillBurette());
    else if (id === 'chem_hcl_cylinder') run(() => this.pourAcid());
    else if (id === 'chem_indicator' || id === 'chem_dropper' || id === 'chem_flask') run(() => this.addIndicator());
    else if (id === 'chem_stopcock') run(() => this.turnStopcock());
    else if (id === 'chem_stirrer_knob') run(() => this.turnStirrer());
    return true;
  }

  // ---------------- Hand sequences ----------------

  /** Reach an object on the bench and close the hand on it. */
  private async pickUp(obj: THREE.Object3D, gripHeight: number) {
    const H = this.hands;
    const p = obj.getWorldPosition(new THREE.Vector3());
    const approach = p.clone().add(new THREE.Vector3(0.02, gripHeight + 0.05, 0.09));
    const grip = p.clone().add(new THREE.Vector3(0.02, gripHeight, 0.055));
    await H.move('right', { wrist: approach, grip: 0.1, twist: 0, flex: 0 }, 0.55);
    await H.move('right', { wrist: grip }, 0.3);
    await H.move('right', { grip: 0.8 }, 0.2);
    H.grab('right', obj);
    soundFx.playGlassSlide();
    await H.move('right', { wrist: grip.clone().add(new THREE.Vector3(0, 0.12, 0)) }, 0.35);
    return grip;
  }

  /** Put the held object back exactly where it came from. */
  private async putBack(obj: THREE.Object3D, grip: THREE.Vector3, home: THREE.Matrix4) {
    const H = this.hands;
    await H.move('right', { wrist: grip.clone().add(new THREE.Vector3(0, 0.12, 0)), twist: 0, flex: 0 }, 0.5);
    await H.move('right', { wrist: grip }, 0.35);
    H.release('right', this.scene);
    home.decompose(obj.position, obj.quaternion, obj.scale);
    soundFx.playGlassSlide();
    await H.move('right', { grip: 0.1 }, 0.15);
    await H.rest('right', 0.5);
  }

  /** Tilt the held vessel so its lip sits just above `target`, pour `ml` at `rate` mL/s. */
  private async pourFrom(vessel: THREE.Object3D, target: THREE.Vector3, tilt: number, onPour: (dt: number) => boolean) {
    const H = this.hands;
    const lipObj = vessel.getObjectByName('anchor_lip')!;
    const lip = () => lipObj.getWorldPosition(new THREE.Vector3());
    const aim = target.clone().add(new THREE.Vector3(0, 0.035, 0));
    // Keep the lip over the target while tilting: nudge the wrist by the lip error every frame
    const steer = (pose: { wrist: THREE.Vector3 }) => {
      const err = aim.clone().sub(lip());
      pose.wrist.addScaledVector(err, 0.25);
    };
    await H.move('right', { wrist: aim.clone().add(new THREE.Vector3(0.08, 0.1, 0.04)) }, 0.6, steer);
    await H.move('right', { twist: tilt }, 0.7, steer);
    this.pour = { from: lip, to: target, flow: 1 };
    soundFx.playDropLiquid();
    await new Promise<void>((resolve) => {
      let last = performance.now();
      const tick = () => {
        const now = performance.now();
        const done = onPour((now - last) / 1000);
        last = now;
        if (done) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    this.pour = null;
    await H.move('right', { twist: 0 }, 0.5, steer);
  }

  private async fillBurette() {
    if (!this.bottle) return;
    const c = labStore.get().chemistry;
    if (c.buretteML >= 49.9) return;
    const grip = await this.pickUp(this.bottle, 0.08);
    const funnel = this.anchor('anchor_funnel_mouth')!;
    // Look up at the funnel while filling, like you would at a real burette
    this.focus(funnel.clone().add(new THREE.Vector3(0, -0.06, 0)));
    await this.pourFrom(this.bottle, funnel, 1.55, (dt) => {
      const cur = labStore.get().chemistry.buretteML;
      const add = Math.min(50 - cur, 18 * dt);
      this.bottleML -= add;
      labStore.update('chemistry', { buretteML: Math.min(50, cur + add) });
      return cur + add >= 50;
    });
    this.focus(null);
    await this.putBack(this.bottle, grip, this.bottleHome);
  }

  private async pourAcid() {
    if (!this.cylinder || this.cylinderML <= 0) return;
    const grip = await this.pickUp(this.cylinder, 0.07);
    const mouth = this.anchor('anchor_flask_mouth')!;
    await this.pourFrom(this.cylinder, mouth, 1.9, (dt) => {
      const pourNow = Math.min(this.cylinderML, 14 * dt);
      this.cylinderML -= pourNow;
      const acid = labStore.get().chemistry.flaskAcidML + pourNow;
      const c = labStore.get().chemistry;
      labStore.update('chemistry', { flaskAcidML: acid, phValue: titrationPH(c.dispensedML, acid) });
      return this.cylinderML <= 0.01;
    });
    await this.putBack(this.cylinder, grip, this.cylinderHome);
  }

  private async addIndicator() {
    const H = this.hands;
    const dropper = this.rig.getObjectByName('chem_dropper');
    const tipObj = this.rig.getObjectByName('anchor_dropper_tip');
    if (!dropper || !tipObj) return;
    const home = dropper.parent!;
    const homeMatrix = dropper.matrix.clone();
    const p = dropper.getWorldPosition(new THREE.Vector3());
    const pinch = p.clone().add(new THREE.Vector3(0.015, 0.03, 0.05));
    await H.move('right', { wrist: pinch.clone().add(new THREE.Vector3(0, 0.05, 0.03)), grip: 0.1 }, 0.5);
    await H.move('right', { wrist: pinch }, 0.3);
    await H.move('right', { grip: 0.55 }, 0.2);
    H.grab('right', dropper);
    await H.move('right', { wrist: pinch.clone().add(new THREE.Vector3(0, 0.1, 0)) }, 0.4);
    const mouth = this.anchor('anchor_flask_mouth')!;
    const tip = () => tipObj.getWorldPosition(new THREE.Vector3());
    const aim = mouth.clone().add(new THREE.Vector3(0, 0.03, 0));
    const steer = (pose: { wrist: THREE.Vector3 }) => pose.wrist.addScaledVector(aim.clone().sub(tip()), 0.25);
    await H.move('right', { wrist: aim.clone().add(new THREE.Vector3(0.03, 0.08, 0.03)) }, 0.6, steer);
    await H.wait(0.3);
    // Three squeezes, three drops
    for (let i = 0; i < 3; i++) {
      await H.move('right', { grip: 0.85 }, 0.15, steer);
      const last = i === 2;
      this.drops.spawn(tip(), this.flaskSurfaceY(), () => {
        soundFx.playDropLiquid();
        if (last) labStore.update('chemistry', { indicatorAdded: true });
      });
      await H.move('right', { grip: 0.55 }, 0.2, steer);
    }
    await H.wait(0.4);
    // Back into the bottle
    await H.move('right', { wrist: pinch.clone().add(new THREE.Vector3(0, 0.1, 0)) }, 0.6);
    await H.move('right', { wrist: pinch }, 0.3);
    H.release('right', home);
    dropper.matrix.copy(homeMatrix);
    dropper.matrix.decompose(dropper.position, dropper.quaternion, dropper.scale);
    await H.move('right', { grip: 0.1 }, 0.15);
    await H.rest('right', 0.5);
  }

  private stopcockHandParked = false;

  /** Left hand opens the stopcock and stays on it (as in a real titration) so closing is instant. */
  private async turnStopcock() {
    const H = this.hands;
    const sc = this.rig.getObjectByName('chem_stopcock');
    if (!sc) return;
    const open = labStore.get().chemistry.buretteOpen;
    if (!this.stopcockHandParked) {
      const p = sc.getWorldPosition(new THREE.Vector3());
      const at = p.clone().add(new THREE.Vector3(-0.035, -0.005, 0.05));
      await H.move('left', { wrist: at, grip: 0.45, twist: 0 }, 0.45);
      this.stopcockHandParked = true;
    }
    await H.move('left', { twist: open ? 0 : 0.6 }, 0.18);
    labStore.update('chemistry', { buretteOpen: !open });
    soundFx.playClick();
    if (open) {
      // Closed: hand can return to rest (unless the student keeps titrating dropwise)
      await H.wait(0.4);
      if (!labStore.get().chemistry.buretteOpen) {
        this.stopcockHandParked = false;
        await H.rest('left', 0.5);
      }
    }
  }

  private async turnStirrer() {
    const H = this.hands;
    const knob = this.rig.getObjectByName('chem_stirrer_knob');
    if (!knob) return;
    const p = knob.getWorldPosition(new THREE.Vector3());
    const rpm = labStore.get().chemistry.stirrerRPM;
    await H.move('right', { wrist: p.clone().add(new THREE.Vector3(0.03, 0.01, 0.06)), grip: 0.5, twist: 0 }, 0.5);
    await H.move('right', { twist: 0.9 }, 0.4);
    labStore.update('chemistry', { stirrerRPM: rpm === 0 ? 400 : rpm === 400 ? 800 : 0 });
    soundFx.playKnobTick();
    await H.rest('right', 0.5);
  }

  /** A single drop from the burette (dropwise near the endpoint): a quick quarter-turn flick. */
  visualDrop() {
    if (!this.busy && this.hands.ready) {
      const sc = this.rig.getObjectByName('chem_stopcock');
      if (sc) {
        const at = sc.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-0.035, -0.005, 0.05));
        this.hands.move('left', { wrist: at, grip: 0.45, twist: 0.35 }, 0.15).then(() => this.hands.move('left', { twist: 0 }, 0.15));
        this.stopcockHandParked = true;
      }
    }
    this.spawnBaseDrop();
  }

  private spawnBaseDrop() {
    const tip = this.anchor('anchor_burette_tip');
    if (tip) this.drops.spawn(tip, this.flaskSurfaceY(), () => this.onBaseDrop());
  }

  // ---------------- Per-frame ----------------

  private flaskSurfaceY() {
    return this.flask.mesh.position.y + this.flask.surfaceHeight();
  }

  private onBaseDrop() {
    const c = labStore.get().chemistry;
    // Local pink where base lands, fading as it mixes: stronger and longer near the endpoint
    if (c.indicatorAdded && c.flaskAcidML > 0) {
      const toEnd = c.flaskAcidML - c.dispensedML;
      if (toEnd < 5) this.flash = Math.min(1, this.flash + (toEnd < 1 ? 0.8 : 0.35));
    }
  }

  private syncFromStore(force = false) {
    const c = labStore.get().chemistry;
    this.buretteStem.setFraction(c.buretteML > 0.3 ? 1 : 0);
    this.buretteMain.setFraction(c.buretteML / 50);
    const flaskMl = c.flaskAcidML + c.dispensedML + (c.indicatorAdded ? 0.15 : 0);
    this.flask.update(flaskMl, Math.min(1, c.stirrerRPM / 800));
    this.bottleLiquid?.setFraction(this.bottleML / 500);
    this.cylinderLiquid?.setFraction(this.cylinderML / 25);
    if (force) this.flask.material.color.copy(CLEAR);
  }

  update(delta: number) {
    this.syncFromStore();
    const c = labStore.get().chemistry;

    // Colour: permanent pink past pH 8.2, transient flashes near the endpoint that stirring disperses
    const permanent = c.indicatorAdded ? THREE.MathUtils.smoothstep(c.phValue, 8.0, 9.5) : 0;
    this.flash = Math.max(0, this.flash - delta * (0.6 + c.stirrerRPM / 400));
    this.flask.material.color.copy(CLEAR).lerp(PINK, Math.max(permanent * 0.85, this.flash * 0.7));

    // Stream of drops while the stopcock is open
    if (c.buretteOpen && c.buretteML > 0) {
      this.dropTimer += delta;
      if (this.dropTimer > 0.09) {
        this.dropTimer = 0;
        this.spawnBaseDrop();
      }
    }
    this.drops.update(delta);

    if (this.pour) {
      this.stream.update(delta, this.pour.from(), this.pour.to, this.pour.flow);
    } else {
      this.stream.update(delta, new THREE.Vector3(), new THREE.Vector3(), 0);
    }
  }

  get isBusy() {
    return this.busy;
  }

  /** Reset props for a fresh practical. */
  reset() {
    this.bottleML = NAOH_BOTTLE_START_ML;
    this.cylinderML = 25;
    this.flash = 0;
  }

  get surfaceYs() {
    return { zero: this.y0, fifty: this.y50 };
  }
}
