import * as THREE from 'three';
import { tagInteractive } from '@/lib/lab3dEquipment';
import { labStore, SALTS, type SaltKey } from '@/lib/labStore';
import { experiments } from '@/lib/experiments';
import { soundFx } from '@/lib/soundEffects';
import { curie } from '@/lib/curie';
import { isMobileOrTouchDevice } from '@/lib/orientation';
import { FirstPersonHands } from '@/lib/workbench/hands';
import { BenchBase, type Focus } from '@/lib/workbench/benches';

/**
 * Flame tests in the fume hood. The left hand works the gas tap, air collar and lighter; the right
 * hand holds the nichrome loop, dips it in acid or a sample, and heats it at the edge of the flame.
 */

const SALT_IDS: Record<string, SaltKey> = {
  flame_salt_li: 'li',
  flame_salt_na: 'na',
  flame_salt_k: 'k',
  flame_salt_ca: 'ca',
  flame_salt_cu: 'cu',
};

function flameMaterial(color: THREE.ColorRepresentation, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export class FlameBench extends BenchBase {
  protected ids = ['hood_sash', 'flame_gas_tap', 'flame_air_collar', 'flame_lighter', 'flame_loop', 'flame_acid', 'flame_zone', ...Object.keys(SALT_IDS)];
  private holding = false;
  private loopHome = new THREE.Matrix4();
  private loopParent: THREE.Object3D | null = null;
  private flame = new THREE.Group();
  private outer: THREE.Mesh;
  private inner: THREE.Mesh;
  private light: THREE.PointLight | null = null;
  private saltColour = new THREE.Color();
  private saltStrength = 0;
  private t = 0;
  private gasUnlitFor = 0;
  private warnedGas = false;
  private collarAngle = 0;
  private tapAngle = 0;
  private sash: THREE.Object3D | null = null;
  private sashBaseY: number | null = null;

  constructor(scene: THREE.Scene, rig: THREE.Object3D, hands: FirstPersonHands, focus: Focus) {
    super(scene, rig, hands, focus);
    const base = this.pos('anchor_flame') ?? rig.getWorldPosition(new THREE.Vector3());
    const cone = new THREE.ConeGeometry(1, 1, 20, 6, true);
    cone.translate(0, 0.5, 0);
    this.outer = new THREE.Mesh(cone, flameMaterial('#ff9d2e', 0.8));
    this.inner = new THREE.Mesh(cone, flameMaterial('#8fd3ff', 0.8));
    this.outer.renderOrder = 6;
    this.inner.renderOrder = 7;
    this.flame.add(this.outer, this.inner);
    this.flame.position.copy(base);
    this.flame.visible = false;
    this.flame.userData.keepSeparate = true;
    scene.add(this.flame);
    // A light for the flame glow on desktop; phones skip it (every light costs shading on every surface)
    if (!isMobileOrTouchDevice()) {
      this.light = new THREE.PointLight('#ffb35c', 0, 1.4, 2);
      this.light.position.copy(base).add(new THREE.Vector3(0, 0.05, 0));
      scene.add(this.light);
    }
    // Invisible target so the student can tap "the flame"
    const zone = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), new THREE.MeshBasicMaterial({ visible: false }));
    zone.position.copy(base).add(new THREE.Vector3(0, 0.07, 0));
    tagInteractive(zone, 'flame_zone', 'Bunsen Flame', 'Hold the loop at the edge of the flame', 'hood', 'primary');
    scene.add(zone);

    // Remember parts that the hands will carry out of the kit's hierarchy
    ['flame_loop', 'anchor_loop_tip', 'flame_lighter', 'anchor_lighter_tip'].forEach((n) => this.node(n));
    const loop = this.node('flame_loop');
    if (loop) {
      loop.updateMatrixWorld(true);
      this.loopHome.copy(loop.matrixWorld);
      this.loopParent = loop.parent;
    }
  }

  private f() {
    return labStore.get().flame;
  }

  /** Move the right hand so the loop tip lands on `target` (steered every frame). */
  private tipTo(target: THREE.Vector3, dur = 0.5) {
    const tip = this.node('anchor_loop_tip');
    if (!tip) return Promise.resolve();
    const steer = (pose: { wrist: THREE.Vector3 }) => {
      const at = tip.getWorldPosition(new THREE.Vector3());
      pose.wrist.addScaledVector(target.clone().sub(at), 0.45);
    };
    return this.hands.move('right', { wrist: target.clone().add(new THREE.Vector3(0.1, 0.02, 0.03)) }, dur, steer);
  }

  private async pickUpLoop() {
    if (this.holding) return;
    const loop = this.node('flame_loop');
    if (!loop) return;
    const H = this.hands;
    const handle = loop.localToWorld(new THREE.Vector3(0.06, 0.004, 0));
    await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.03, 0.05, 0.07)), grip: 0.15, twist: 0, flex: 0 }, 0.45);
    await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.03, 0.015, 0.055)) }, 0.2);
    await H.move('right', { grip: 0.7 }, 0.15);
    H.grab('right', loop);
    this.holding = true;
    await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.03, 0.12, 0.08)) }, 0.35);
  }

  private async putDownLoop() {
    if (!this.holding) return;
    const loop = this.node('flame_loop')!;
    const H = this.hands;
    const home = new THREE.Vector3().setFromMatrixPosition(this.loopHome);
    const handle = home.clone().add(new THREE.Vector3(0.06, 0.004, 0));
    await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.03, 0.08, 0.06)), twist: 0 }, 0.5);
    await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.03, 0.015, 0.055)) }, 0.25);
    H.release('right', this.loopParent ?? this.scene);
    // Restore the exact resting transform in the loop's own parent space
    const parentInv = new THREE.Matrix4().copy((this.loopParent ?? this.scene).matrixWorld).invert();
    new THREE.Matrix4().multiplyMatrices(parentInv, this.loopHome).decompose(loop.position, loop.quaternion, loop.scale);
    this.holding = false;
    await H.move('right', { grip: 0.15 }, 0.12);
    await H.rest('right', 0.45);
  }

  protected async perform(id: string) {
    const H = this.hands;
    const f = () => this.f();

    if (id === 'hood_sash') {
      const sash = this.findSash();
      if (!sash) return;
      // Grip the handle along the bottom of the sash and slide it
      const handle = sash.getWorldPosition(new THREE.Vector3());
      const down = !f().sashDown;
      await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.12, -0.02, 0.06)), grip: 0.2, twist: 0, flex: 0 }, 0.45);
      await H.move('right', { grip: 0.6 }, 0.15);
      labStore.update('flame', { sashDown: down });
      soundFx.playGlassSlide();
      await H.move('right', { wrist: handle.clone().add(new THREE.Vector3(0.12, down ? -0.55 : 0.5, 0.06)) }, 0.6);
      await H.move('right', { grip: 0.2 }, 0.12);
      await H.rest('right', 0.45);
    } else if (id === 'flame_gas_tap') {
      const at = this.pos('flame_gas_tap');
      if (!at) return;
      await this.turn('left', at, 0.7, () => {
        const on = !f().gasOn;
        labStore.update('flame', on ? { gasOn: true } : { gasOn: false, lit: false });
        this.tapAngle = on ? Math.PI / 2 : 0;
        soundFx.playClick();
        if (!on) this.warnedGas = false;
      });
    } else if (id === 'flame_air_collar') {
      const at = this.pos('flame_air_collar');
      if (!at) return;
      await this.turn('left', at, 0.8, () => {
        labStore.update('flame', { airOpen: !f().airOpen });
        this.collarAngle = f().airOpen ? 1.2 : 0;
        soundFx.playKnobTick();
      });
    } else if (id === 'flame_lighter') {
      await this.lightBurner();
    } else if (id === 'flame_loop') {
      if (this.holding) await this.putDownLoop();
      else await this.pickUpLoop();
    } else if (id === 'flame_acid') {
      await this.pickUpLoop();
      const acid = this.pos('anchor_acid');
      if (!acid) return;
      await this.tipTo(acid.clone().add(new THREE.Vector3(0, 0.05, 0)), 0.5);
      await this.tipTo(acid, 0.3);
      soundFx.playDropLiquid();
      await H.wait(0.3);
      labStore.update('flame', { loop: 'acid' });
      await this.tipTo(acid.clone().add(new THREE.Vector3(0, 0.08, 0)), 0.35);
    } else if (SALT_IDS[id]) {
      const key = SALT_IDS[id];
      await this.pickUpLoop();
      const well = this.pos(`anchor_salt_${key}`);
      if (!well) return;
      const loopState = f().loop;
      if (loopState !== 'clean') {
        // Dipping a used loop carries the previous sample over
        experiments.count('contaminated');
      }
      await this.tipTo(well.clone().add(new THREE.Vector3(0, 0.05, 0)), 0.5);
      await this.tipTo(well, 0.3);
      soundFx.playGlassSlide();
      labStore.update('flame', { loop: loopState === 'clean' ? key : 'dirty' });
      await this.tipTo(well.clone().add(new THREE.Vector3(0, 0.08, 0)), 0.35);
    } else if (id === 'flame_zone') {
      await this.heatLoop();
    }
  }

  private async lightBurner() {
    const H = this.hands;
    const lighter = this.node('flame_lighter');
    const tip = this.node('anchor_lighter_tip');
    const flameAt = this.pos('anchor_flame');
    if (!lighter || !tip || !flameAt) return;
    const parent = lighter.parent!;
    const homeLocal = lighter.matrix.clone();
    const body = lighter.localToWorld(new THREE.Vector3(0.03, 0.01, 0));
    await H.move('left', { wrist: body.clone().add(new THREE.Vector3(-0.02, 0.05, 0.07)), grip: 0.15, twist: 0, flex: 0 }, 0.45);
    await H.move('left', { wrist: body.clone().add(new THREE.Vector3(-0.02, 0.018, 0.05)) }, 0.2);
    await H.move('left', { grip: 0.7 }, 0.15);
    H.grab('left', lighter);
    const aim = flameAt.clone().add(new THREE.Vector3(0, 0.012, 0));
    const steer = (pose: { wrist: THREE.Vector3 }) => pose.wrist.addScaledVector(aim.clone().sub(tip.getWorldPosition(new THREE.Vector3())), 0.3);
    this.focus(flameAt);
    await H.move('left', { wrist: aim.clone().add(new THREE.Vector3(-0.12, 0.03, 0.03)) }, 0.6, steer);
    // Click the piezo
    await H.move('left', { grip: 0.9 }, 0.1, steer);
    soundFx.playClick();
    if (this.f().gasOn) {
      labStore.update('flame', { lit: true });
      this.gasUnlitFor = 0;
    } else {
      curie.say("Nothing to light yet: turn on the gas tap first, then bring the lighter in.");
    }
    await H.move('left', { grip: 0.7 }, 0.1, steer);
    await H.wait(0.3);
    this.focus(null);
    // Put the lighter back where it was
    await H.move('left', { wrist: body.clone().add(new THREE.Vector3(-0.02, 0.05, 0.06)) }, 0.5);
    await H.move('left', { wrist: body.clone().add(new THREE.Vector3(-0.02, 0.018, 0.05)) }, 0.2);
    H.release('left', parent);
    homeLocal.decompose(lighter.position, lighter.quaternion, lighter.scale);
    await H.move('left', { grip: 0.15 }, 0.12);
    await H.rest('left', 0.45);
  }

  /** Hold the loop at the edge of the flame: burn off acid, or show the sample's colour. */
  private async heatLoop() {
    const flameAt = this.pos('anchor_flame');
    if (!flameAt) return;
    if (!this.f().lit) {
      curie.say('The burner is not lit. Gas on, then the lighter.');
      return;
    }
    await this.pickUpLoop();
    this.focus(flameAt.clone().add(new THREE.Vector3(0, 0.05, 0)));
    const edge = flameAt.clone().add(new THREE.Vector3(0.011, 0.045, 0));
    await this.tipTo(edge, 0.5);
    const loop = this.f().loop;
    const blue = this.f().airOpen;
    if (loop in SALTS) {
      const salt = SALTS[loop as SaltKey];
      this.saltColour.set(salt.hex);
      this.saltStrength = 1;
      soundFx.playSuccessChime();
      if (!blue) experiments.count('luminousTest');
      experiments.addReading({ label: `${salt.name} flame`, value: salt.nm, unit: `nm · ${salt.colour}` });
      curie.say(`${salt.name}: a ${salt.colour} flame (${salt.nm} nm).`);
      await this.hands.wait(2.2);
      labStore.update('flame', { loop: 'dirty' });
    } else if (loop === 'acid') {
      // Burning off the acid: a brief orange flicker, then no colour = clean
      this.saltColour.set('#ffb070');
      this.saltStrength = 0.35;
      await this.hands.wait(1.6);
      labStore.update('flame', { loop: 'clean' });
    } else if (loop === 'dirty') {
      this.saltColour.set('#ff9a50');
      this.saltStrength = 0.5;
      await this.hands.wait(1.5);
    } else {
      await this.hands.wait(0.8);
    }
    this.focus(null);
    await this.tipTo(edge.clone().add(new THREE.Vector3(0.05, 0.08, 0.05)), 0.4);
  }

  private findSash() {
    if (!this.sash) this.sash = this.scene.getObjectByName('hood_sash') ?? null;
    return this.sash;
  }

  update(delta: number) {
    this.t += delta;
    const s = this.f();
    // Sash slides between raised (open, +0.5 m) and lowered to the working height
    const sash = this.findSash();
    if (sash) {
      if (this.sashBaseY === null) this.sashBaseY = sash.position.y;
      sash.position.y = THREE.MathUtils.damp(sash.position.y, this.sashBaseY + (s.sashDown ? 0 : 0.5), 6, delta);
    }

    // Gas running with no flame: Curie steps in after a few seconds
    if (s.gasOn && !s.lit) {
      this.gasUnlitFor += delta;
      if (this.gasUnlitFor > 5 && !this.warnedGas) {
        this.warnedGas = true;
        if (experiments.get().run?.experimentId === 'flame') experiments.count('gasUnlit');
        else curie.say('Gas is running with no flame. Light it or turn it off!');
      }
    } else {
      this.gasUnlitFor = 0;
    }

    // Controls turn smoothly
    const collar = this.node('flame_air_collar');
    if (collar) collar.rotation.y = THREE.MathUtils.damp(collar.rotation.y, this.collarAngle, 8, delta);
    const tap = this.node('flame_gas_tap');
    if (tap) tap.rotation.y = THREE.MathUtils.damp(tap.rotation.y, this.tapAngle, 8, delta);

    // Flame
    this.flame.visible = s.lit;
    if (!s.lit) {
      if (this.light) this.light.intensity = 0;
      return;
    }
    this.saltStrength = Math.max(0, this.saltStrength - delta * 0.35);
    const flick = 1 + Math.sin(this.t * 23) * 0.05 + Math.sin(this.t * 37.3) * 0.04 + Math.sin(this.t * 7.1) * 0.03;
    const outerMat = this.outer.material as THREE.MeshBasicMaterial;
    const innerMat = this.inner.material as THREE.MeshBasicMaterial;
    if (s.airOpen) {
      // Hot, roaring, non-luminous flame: pale blue outer cone and a bright inner cone
      this.outer.scale.set(0.014, 0.085 * flick * (1 + this.saltStrength * 0.25), 0.014);
      this.inner.scale.set(0.0085, 0.032 * (1 + (flick - 1) * 0.5), 0.0085);
      outerMat.color.set('#4a6cff').lerp(this.saltColour, this.saltStrength);
      outerMat.opacity = 0.32 + this.saltStrength * 0.5;
      innerMat.color.set('#8fd3ff');
      innerMat.opacity = 0.75;
      this.flame.rotation.z = 0;
    } else {
      // Luminous yellow flame: taller, lazier, swaying
      this.outer.scale.set(0.02, 0.13 * flick, 0.02);
      this.inner.scale.set(0.009, 0.04, 0.009);
      outerMat.color.set('#ff9d2e').lerp(this.saltColour, this.saltStrength * 0.5);
      outerMat.opacity = 0.8;
      innerMat.color.set('#5a78ff');
      innerMat.opacity = 0.35;
      this.flame.rotation.z = Math.sin(this.t * 3.1) * 0.08;
    }
    if (this.light) {
      this.light.color.copy(outerMat.color);
      this.light.intensity = (s.airOpen ? 0.35 : 1.1) * flick + this.saltStrength * 0.9;
    }
  }

  reset() {
    this.saltStrength = 0;
    this.warnedGas = false;
    this.collarAngle = 0;
    this.tapAngle = 0;
  }
}
