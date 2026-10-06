import * as THREE from 'three';
import { loadLabModel } from '@/lib/assetLoader';
import { tagInteractive } from '@/lib/lab3dEquipment';
import { soundFx } from '@/lib/soundEffects';
import { curie } from '@/lib/curie';
import { experiments } from '@/lib/experiments';
import { FirstPersonHands } from '@/lib/workbench/hands';
import { Drops, LiquidColumn, LiquidInVessel, PourStream } from '@/lib/workbench/liquids';
import { MAT, glassVessel, label } from '@/lib/workbench/kit';
import { titration, flowFor, pourRate, permanentPink, SPLASH_TILT, PIPETTE, type PourTarget, type Under } from '@/lib/titration/sim';
import { handsUI, titrationControls, type HeldKind, type TitrationControls } from '@/lib/titration/ui';

/**
 * Titration by direct manipulation. Nothing here plays a canned animation: the student picks
 * things up, carries them over the bench, lifts and tilts them to pour, turns the burette tap a
 * little or a lot, swirls the flask and leans in to read the scale. The physics and chemistry live
 * in lib/titration/sim.ts; this file is the bench they happen on and the hands that do it.
 *
 * Bench layout (x right, z toward the student, from the burette tip):
 *   back:  HCl stock beaker (left) ............ NaOH bottle (right)
 *   mid:   pipette rack, clipboard (left)  [stand + burette + white tile]  waste beaker, rinse basin (right)
 *   front: indicator bottle sits right of the tile, inside the right hand's reach
 */

type Kind = Exclude<HeldKind, null>;

interface Movable {
  id: string;
  name: string;
  kind: Kind;
  obj: THREE.Object3D;
  radius: number; // footprint (m)
  height: number; // how tall it stands
  bottom: number; // origin height above its base (m)
  grip: number; // where the hand holds it, above the base (m)
  yaw: number; // turn so its pouring lip faces left (toward the burette)
  lip: THREE.Vector3 | null; // local pouring lip
  heavy: number; // follow stiffness (lower = heavier)
  socket: string | null;
  homePos: THREE.Vector3;
  homeQuat: THREE.Quaternion;
  homeSocket: string | null;
  canTilt: boolean;
}

interface Socket {
  id: string;
  pos: THREE.Vector3; // base position (world)
  accepts: string[]; // movable ids
  quat?: THREE.Quaternion;
}

interface Opening {
  id: PourTarget;
  pos: () => THREE.Vector3;
  r: number;
}

const BOTTLE_ML = 500;
const CLEAR = new THREE.Color('#eaf2ff');
const PINK = new THREE.Color('#ff3d9a');
const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

// Flask inner profile (height, radius), unscaled rig units
const FLASK_PROFILE: [number, number][] = [
  [0, 0.035], [0.003, 0.0395], [0.008, 0.0405], [0.045, 0.0325], [0.085, 0.0205], [0.105, 0.0145], [0.128, 0.014],
];

export class TitrationBench {
  readonly ids = ['chem_flask', 'chem_funnel', 'chem_dropper', 'chem_naoh_bottle', 'chem_pipette', 'chem_waste', 'chem_stopcock', 'chem_indicator', 'chem_stock', 'chem_clipboard', 'chem_burette', 'chem_basin'];
  private movables = new Map<string, Movable>();
  private sockets: Socket[] = [];
  private openings: Opening[] = [];
  private held: Movable | null = null;
  private settling: { m: Movable; from: THREE.Vector3; to: THREE.Vector3; fromQ: THREE.Quaternion; toQ: THREE.Quaternion; t: number } | null = null;

  // continuous inputs
  private input = { tilt: 0, lift: 0, lever: 0, eye: 0 };
  private keys = new Set<string>();
  private pointer = new THREE.Vector2();
  private tilt = 0;
  private lift = 0.08;
  private tiltDrag = false;
  private onTap = false;
  private swirlOn = false;
  private swirlGesture = 0;
  private lastMoveAngle: number | null = null;
  private swirlPhase = 0;
  private reading: null | { kind: 'burette' | 'pipette'; eye: number } = null;

  // geometry
  private benchY = 0.94;
  private s = 1; // rig scale
  private tip = new THREE.Vector3();
  private zeroY = 0;
  private mlToM = 0.0062;
  private buretteTop = new THREE.Vector3();
  private tileSpot = new THREE.Vector3();
  private standBase = new THREE.Box3();
  private stopcock: THREE.Object3D | null = null;
  private stopcockPos = new THREE.Vector3();
  private indicatorBottle: THREE.Object3D | null = null;
  private stockPos = new THREE.Vector3();
  private basinPos = new THREE.Vector3();

  // visuals
  private buretteMain!: LiquidColumn;
  private buretteStem!: LiquidColumn;
  private bubbleMesh!: THREE.Mesh;
  private flaskLiquid!: LiquidInVessel;
  private flaskBlob!: THREE.Mesh;
  private bottleLiquid: LiquidColumn | null = null;
  private wasteLiquid!: LiquidColumn;
  private pipetteLiquid!: LiquidColumn;
  private drops: Drops;
  private stream: PourStream;
  private tipStream: PourStream;
  private bottleML = BOTTLE_ML;
  private pourInfo: { from: THREE.Vector3; to: THREE.Vector3; flow: number } | null = null;
  private lastDetent = 0;
  private dropSoundAt = 0;
  private raycaster = new THREE.Raycaster();
  private unsub: (() => void)[] = [];

  private constructor(
    private scene: THREE.Scene,
    private rig: THREE.Object3D,
    private hands: FirstPersonHands,
    private camera: THREE.Camera,
    private focus: (p: THREE.Vector3 | null) => void,
    private lean: (eye: THREE.Vector3 | null, look: THREE.Vector3 | null) => void,
    private openSheet: () => void
  ) {
    this.drops = new Drops(scene, '#dfeaff', 0.0022, 32);
    this.stream = new PourStream(scene, '#dfeaff');
    this.tipStream = new PourStream(scene, '#dfeaff');
  }

  /** Call as soon as the rig is in the scene (before static meshes are merged): frees the parts the hands will move. */
  static prepareRig(rig: THREE.Object3D) {
    for (const name of ['stirrer_body', 'stirrer_top', 'knob_mesh', 'led', 'chem_stirrer_knob', 'chem_stir_bar']) {
      rig.getObjectByName(name)?.traverse((o) => (o.visible = false));
      const n = rig.getObjectByName(name);
      if (n) n.visible = false;
    }
    for (const name of ['chem_flask', 'chem_funnel', 'chem_dropper', 'chem_indicator', 'chem_stopcock']) {
      const n = rig.getObjectByName(name);
      if (n) n.userData.keepSeparate = true;
    }
  }

  static async create(
    scene: THREE.Scene,
    rig: THREE.Object3D,
    hands: FirstPersonHands,
    camera: THREE.Camera,
    focus: (p: THREE.Vector3 | null) => void,
    lean: (eye: THREE.Vector3 | null, look: THREE.Vector3 | null) => void,
    openSheet: () => void
  ) {
    const b = new TitrationBench(scene, rig, hands, camera, focus, lean, openSheet);
    await b.setup();
    titrationControls.register(b.controls);
    titration.start();
    return b;
  }

  // ------------------------------------------------------------------------------------------
  // Setup
  // ------------------------------------------------------------------------------------------

  private world(name: string) {
    const o = this.rig.getObjectByName(name);
    return o ? o.getWorldPosition(new THREE.Vector3()) : null;
  }

  private tag(o: THREE.Object3D, id: string, name: string, action: string) {
    o.traverse((m) => tagInteractive(m, id, name, action, 'chemistry', 'primary'));
    o.userData.keepSeparate = true;
  }

  private async setup() {
    const rig = this.rig;
    TitrationBench.prepareRig(rig);
    rig.updateMatrixWorld(true);
    this.s = rig.getWorldScale(new THREE.Vector3()).x;
    const s = this.s;
    const zero = this.world('anchor_burette_zero');
    const fifty = this.world('anchor_burette_fifty');
    const tip = this.world('anchor_burette_tip');
    if (!zero || !fifty || !tip) throw new Error('titration rig anchors missing');
    this.tip.copy(tip);
    this.zeroY = zero.y;
    this.mlToM = (zero.y - fifty.y) / 50;
    const base = rig.getObjectByName('stand_base');
    const box = new THREE.Box3().setFromObject(base ?? rig);
    this.standBase.copy(box);
    this.benchY = new THREE.Box3().setFromObject(rig).min.y;
    const standTop = base ? box.max.y : this.benchY;

    // ---- The burette, its liquid, the bubble in the jet, the tap ----
    const r = 0.0052 * s;
    this.buretteStem = new LiquidColumn(this.scene, new THREE.Vector3(tip.x, tip.y + 0.004 * s, tip.z), r * 0.5, fifty.y - tip.y - 0.004 * s, '#cfe0f6');
    this.buretteMain = new LiquidColumn(this.scene, fifty, r, (zero.y - fifty.y) + 3 * this.mlToM, '#cfe0f6', true);
    this.bubbleMesh = new THREE.Mesh(new THREE.SphereGeometry(0.0022 * s, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, roughness: 0.05 }));
    this.bubbleMesh.position.set(tip.x, tip.y + 0.012 * s, tip.z);
    this.bubbleMesh.visible = false;
    this.bubbleMesh.userData.keepSeparate = true;
    this.scene.add(this.bubbleMesh);
    this.buretteTop.set(tip.x, zero.y + 0.022 * s, tip.z);
    this.stopcock = rig.getObjectByName('chem_stopcock') ?? null;
    if (this.stopcock) {
      this.stopcockPos = this.stopcock.getWorldPosition(new THREE.Vector3());
      this.tag(this.stopcock, 'chem_stopcock', 'Burette tap', 'Put your hand on the tap');
    }
    // The scale itself: tap it to lean in and read it
    const scaleHit = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, zero.y - fifty.y + 0.02, 8), new THREE.MeshBasicMaterial({ visible: false }));
    scaleHit.position.set(tip.x, (zero.y + fifty.y) / 2, tip.z);
    this.tag(scaleHit, 'chem_burette', 'Burette scale', 'Lean in and read it (Space)');
    this.scene.add(scaleHit);

    // ---- White tile on the stand base, flask on it ----
    this.tileSpot.set(tip.x, standTop + 0.005, tip.z);
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.005, 0.15), MAT.white);
    tile.position.set(tip.x, standTop + 0.0025, tip.z);
    tile.userData.keepSeparate = true;
    this.scene.add(tile);
    this.sockets.push({ id: 'tile', pos: this.tileSpot.clone(), accepts: ['chem_flask', 'chem_waste'] });

    const flask = rig.getObjectByName('chem_flask');
    if (flask) {
      this.scene.attach(flask);
      flask.position.copy(this.tileSpot);
      flask.rotation.set(0, 0, 0);
      const baseLocal = rig.getObjectByName('anchor_flask_base')?.position.clone() ?? new THREE.Vector3(0, 0.0015, 0);
      this.flaskLiquid = new LiquidInVessel(flask, baseLocal, FLASK_PROFILE, '#eaf2ff');
      this.flaskBlob = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#ff3d9a', transparent: true, opacity: 0.0, roughness: 0.2, depthWrite: false }));
      this.flaskBlob.renderOrder = 3;
      flask.add(this.flaskBlob);
      this.tag(flask, 'chem_flask', 'Conical flask', 'Pick up');
      this.addMovable({ id: 'chem_flask', name: 'Conical flask', kind: 'flask', obj: flask, radius: 0.042 * s, height: 0.134 * s, bottom: 0, grip: 0.105 * s, yaw: 0, lip: new THREE.Vector3(-0.0175, 0.134, 0), heavy: 16, socket: 'tile', canTilt: true });
      this.openings.push({ id: 'flask', pos: () => flask.localToWorld(new THREE.Vector3(0, 0.134, 0)), r: 0.017 * s });
    }

    // ---- Funnel in the top of the burette ----
    const funnel = rig.getObjectByName('chem_funnel');
    if (funnel) {
      const fq = funnel.getWorldQuaternion(new THREE.Quaternion());
      this.scene.attach(funnel);
      TitrationBench.recenter(funnel);
      const seat = funnel.position.clone();
      this.sockets.push({ id: 'buretteTop', pos: seat, accepts: ['chem_funnel'], quat: fq });
      this.tag(funnel, 'chem_funnel', 'Filter funnel', 'Pick up (take it out before titrating)');
      this.addMovable({ id: 'chem_funnel', name: 'Funnel', kind: 'funnel', obj: funnel, radius: 0.032 * s, height: 0.072 * s, bottom: 0.02 * s, grip: 0.03 * s, yaw: 0, lip: new THREE.Vector3(-0.0035, -0.02, 0), heavy: 18, socket: 'buretteTop', canTilt: false });
      this.openings.push({ id: 'funnel', pos: () => (this.movables.get('chem_funnel')!.socket === 'buretteTop' ? funnel.localToWorld(new THREE.Vector3(0, 0.05, 0)) : new THREE.Vector3(0, -99, 0)), r: 0.042 * s });
    }
    this.openings.push({ id: 'burette', pos: () => (this.movables.get('chem_funnel')?.socket === 'buretteTop' ? new THREE.Vector3(0, -99, 0) : this.buretteTop.clone()), r: 0.0075 * s });

    // ---- Indicator bottle (stays) and its dropper (moves) ----
    this.indicatorBottle = rig.getObjectByName('chem_indicator') ?? null;
    const dropper = rig.getObjectByName('chem_dropper');
    if (dropper && this.indicatorBottle) {
      this.scene.attach(dropper);
      TitrationBench.recenter(dropper);
      const seat = dropper.position.clone();
      this.sockets.push({ id: 'indicatorBottle', pos: seat, accepts: ['chem_dropper'] });
      this.tag(this.indicatorBottle, 'chem_indicator', 'Phenolphthalein indicator', 'Take the dropper out');
      this.tag(dropper, 'chem_dropper', 'Indicator dropper', 'Pick up');
      this.addMovable({ id: 'chem_dropper', name: 'Indicator dropper', kind: 'dropper', obj: dropper, radius: 0.008, height: 0.075, bottom: 0.049 * s, grip: 0.012 * s, yaw: 0, lip: null, heavy: 22, socket: 'indicatorBottle', canTilt: false });
    }

    const at = (dx: number, dz: number, y = this.benchY) => new THREE.Vector3(tip.x + dx, y, tip.z + dz);

    // ---- NaOH bottle (back right) ----
    const bottle = await loadLabModel('naoh-bottle', null);
    if (bottle) {
      const o = bottle.root;
      o.position.copy(at(0.3, -0.05));
      this.scene.add(o);
      const baseL = o.getObjectByName('anchor_base')?.position.clone() ?? new THREE.Vector3();
      const lip = o.getObjectByName('anchor_lip')?.position.clone() ?? new THREE.Vector3(0, 0.184, 0.0175);
      this.bottleLiquid = new LiquidColumn(o, baseL, 0.0375, 0.118, '#cfe0f6');
      this.tag(o, 'chem_naoh_bottle', '0.100 M sodium hydroxide', 'Pick up');
      this.addMovable({ id: 'chem_naoh_bottle', name: 'NaOH bottle', kind: 'bottle', obj: o, radius: 0.045, height: 0.2, bottom: 0, grip: 0.1, yaw: -Math.PI / 2, lip, heavy: 9, socket: null, canTilt: true });
    }

    // ---- Waste beaker (front right) ----
    const waste = new THREE.Group();
    waste.add(glassVessel([[0, 0], [0.035, 0], [0.035, 0.09], [0.038, 0.093]]));
    const wl = label('WASTE', 0.04, 0.012);
    wl.position.set(0, 0.05, 0.0355);
    waste.add(wl);
    this.wasteLiquid = new LiquidColumn(waste, new THREE.Vector3(0, 0.002, 0), 0.033, 0.085, '#e8eef6');
    waste.position.copy(at(0.19, 0.13));
    this.scene.add(waste);
    this.tag(waste, 'chem_waste', 'Waste beaker', 'Pick up');
    this.addMovable({ id: 'chem_waste', name: 'Waste beaker', kind: 'beaker', obj: waste, radius: 0.038, height: 0.093, bottom: 0, grip: 0.05, yaw: 0, lip: new THREE.Vector3(-0.037, 0.093, 0), heavy: 14, socket: null, canTilt: true });
    this.openings.push({ id: 'waste', pos: () => waste.localToWorld(new THREE.Vector3(0, 0.09, 0)), r: 0.034 });

    // ---- HCl stock (back left, stays put) ----
    const stock = new THREE.Group();
    stock.add(glassVessel([[0, 0], [0.042, 0], [0.042, 0.11], [0.045, 0.113]]));
    const stockLiquid = new LiquidColumn(stock, new THREE.Vector3(0, 0.002, 0), 0.04, 0.1, '#eef4fb');
    stockLiquid.setFraction(0.62);
    const sl = label('0.100 M HCl', 0.05, 0.014);
    sl.position.set(0, 0.085, 0.043);
    stock.add(sl);
    stock.position.copy(at(-0.27, -0.06));
    this.stockPos.copy(stock.position);
    this.scene.add(stock);
    this.tag(stock, 'chem_stock', '0.100 M hydrochloric acid', 'Dip the pipette in to fill it');
    this.openings.push({ id: 'stock', pos: () => this.stockPos.clone().setY(this.benchY + 0.064), r: 0.04 });

    // ---- 25 mL volumetric pipette with a filler, resting on its rack (left) ----
    const pip = this.buildPipette();
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.05), MAT.wood);
    rack.position.copy(at(-0.2, 0.15, this.benchY + 0.01));
    rack.userData.keepSeparate = true;
    this.scene.add(rack);
    pip.position.copy(at(-0.2, 0.15, this.benchY + 0.024));
    this.scene.add(pip);
    this.tag(pip, 'chem_pipette', '25.00 mL pipette + filler', 'Pick up');
    this.addMovable({ id: 'chem_pipette', name: '25 mL pipette', kind: 'pipette', obj: pip, radius: 0.012, height: 0.47, bottom: 0, grip: 0.4, yaw: 0, lip: null, heavy: 18, socket: 'pipetteRack', canTilt: false });
    this.sockets.push({ id: 'pipetteRack', pos: pip.position.clone(), accepts: ['chem_pipette'], quat: pip.quaternion.clone() });

    // ---- Rinse basin (right): put the flask in it to empty and rinse it ----
    const basin = new THREE.Group();
    const tub = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.2), new THREE.MeshStandardMaterial({ color: '#9aa3ab', roughness: 0.5, metalness: 0.4 }));
    tub.position.y = 0.025;
    const water = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.002, 0.19), new THREE.MeshStandardMaterial({ color: '#cfe3f0', transparent: true, opacity: 0.6 }));
    water.position.y = 0.035;
    basin.add(tub, water);
    basin.position.copy(at(0.43, 0.02));
    this.basinPos.copy(basin.position);
    this.scene.add(basin);
    this.tag(basin, 'chem_basin', 'Rinse basin', 'Put the flask here to empty and rinse it');
    this.sockets.push({ id: 'basin', pos: basin.position.clone().setY(this.benchY + 0.04), accepts: ['chem_flask', 'chem_waste'] });
    this.openings.push({ id: 'sink', pos: () => this.basinPos.clone().setY(this.benchY + 0.05), r: 0.08 });

    // ---- Clipboard with the lab sheet (left front) ----
    const board = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.006, 0.22), new THREE.MeshStandardMaterial({ color: '#8a6b4a', roughness: 0.7 }));
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.002, 0.2), MAT.paper);
    paper.position.y = 0.004;
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.02), MAT.steel);
    clip.position.set(0, 0.008, -0.1);
    const title = label('TITRATION', 0.1, 0.02, '#fbfbf7');
    title.rotation.x = -Math.PI / 2;
    title.position.set(0, 0.0055, -0.07);
    board.add(back, paper, clip, title);
    board.position.copy(at(-0.4, 0.17, this.benchY + 0.003));
    board.rotation.y = 0.25;
    this.scene.add(board);
    this.tag(board, 'chem_clipboard', 'Lab sheet', 'Pick up the sheet (S)');

    // The old measuring cylinder is replaced by the pipette
    this.rig.getObjectByName('hcl_cylinder')?.removeFromParent();

    this.unsub.push(titration.onEvent((e) => this.onSim(e)));
    this.syncVisuals(0);
  }

  /**
   * Some exported parts have their origin off to one side of the glass. Move the origin to the
   * middle of what you see (keeping it where it is), so aiming, sockets and pouring line up.
   */
  private static recenter(o: THREE.Object3D) {
    o.updateMatrixWorld(true);
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    const local = o.worldToLocal(c.clone());
    local.y = 0;
    o.children.forEach((ch) => ch.position.sub(local));
    o.position.add(local.clone().multiply(o.scale).applyQuaternion(o.quaternion));
    o.updateMatrixWorld(true);
  }

  private addMovable(m: Omit<Movable, 'homePos' | 'homeQuat' | 'homeSocket'>) {
    if (m.yaw && !m.socket) m.obj.quaternion.setFromAxisAngle(UP, m.yaw);
    this.movables.set(m.id, { ...m, homePos: m.obj.position.clone(), homeQuat: m.obj.quaternion.clone(), homeSocket: m.socket });
  }

  private buildPipette() {
    const g = new THREE.Group();
    const glass = MAT.glass;
    const stem = (y0: number, y1: number, r: number) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 10, 1, true), glass);
      m.position.y = (y0 + y1) / 2;
      m.renderOrder = 3;
      return m;
    };
    g.add(stem(0, 0.12, 0.0035)); // lower stem to the bulb
    const bulb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.07, 6, 14), glass);
    bulb.position.y = 0.165;
    bulb.renderOrder = 3;
    g.add(bulb);
    g.add(stem(0.21, 0.4, 0.0035)); // upper stem with the line
    const line = new THREE.Mesh(new THREE.TorusGeometry(0.0037, 0.0005, 4, 16), MAT.black);
    line.rotation.x = Math.PI / 2;
    line.position.y = 0.3;
    g.add(line);
    const filler = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 0.07, 16), new THREE.MeshStandardMaterial({ color: '#2f7a3c', roughness: 0.6 }));
    filler.position.y = 0.435;
    g.add(filler);
    this.pipetteLiquid = new LiquidColumn(g, new THREE.Vector3(0, 0.001, 0), 0.003, 0.398, '#eef4fb');
    // Lying in the rack to start with
    g.rotation.z = Math.PI / 2;
    return g;
  }

  /** Height of the pipette liquid for a volume: thin stem, wide bulb, thin stem with the line at 25.00. */
  private pipetteHeight(ml: number) {
    if (ml <= 0.05) return 0;
    if (ml < 1) return (ml / 1) * 0.12;
    if (ml < 24) return 0.12 + ((ml - 1) / 23) * 0.09;
    // 24..25 = 0.21..0.30 at the line; above the line ~0.09 m per mL in the thin stem (sensitive!)
    if (ml <= PIPETTE.LINE) return 0.21 + (ml - 24) * 0.09;
    return Math.min(0.398, 0.3 + (ml - PIPETTE.LINE) * 0.016);
  }

  // ------------------------------------------------------------------------------------------
  // Picking up, carrying, setting down
  // ------------------------------------------------------------------------------------------

  private grab(id: string) {
    if (this.held) this.setDown();
    if (this.reading) this.readMode(false);
    const m = this.movables.get(id);
    if (!m) return;
    if (this.onTap) this.toggleTap(false);
    this.settling = null;
    this.carryOverride = null;
    this.held = m;
    if (m.id === 'chem_funnel' && m.socket === 'buretteTop') titration.setFunnelIn(false);
    if (m.id === 'chem_flask') titration.setFlaskAt('held');
    m.socket = null;
    this.tilt = 0;
    this.input.tilt = 0;
    this.hudTilt = false;
    this.pourBias = 0;
    // Pick it straight up a little, keeping where it is
    const bottomY = m.obj.position.y - m.bottom;
    const floor = this.floorAt(m.obj.position.x, m.obj.position.z);
    this.lift = Math.max(0.05, bottomY - floor + 0.05);
    this.carryTarget.copy(m.obj.position).setY(m.obj.position.y + 0.05);
    this.pointerPlaneFromObj = true;
    this.justGrabbed = true;
    this.steer.set(0, 0, 0);
    soundFx.playGlassSlide();
    this.publish();
  }
  private justGrabbed = false;

  private carryTarget = new THREE.Vector3();
  private pointerPlaneFromObj = false;

  /** Put down what is held: into a socket if it's right there, else on the bench where it is. */
  private setDown() {
    const m = this.held;
    if (!m) return;
    this.held = null;
    this.tiltDrag = false;
    this.hudTilt = false;
    const p = m.obj.position;
    let target: THREE.Vector3;
    let quat = new THREE.Quaternion().setFromAxisAngle(UP, m.yaw);
    const sock = this.sockets.find((s) => s.accepts.includes(m.id) && Math.hypot(s.pos.x - p.x, s.pos.z - p.z) < 0.05);
    if (sock) {
      target = sock.pos.clone();
      if (sock.quat) quat = sock.quat.clone();
      m.socket = sock.id;
    } else {
      const floor = this.floorAt(p.x, p.z);
      target = new THREE.Vector3(p.x, floor + m.bottom, p.z);
      m.socket = null;
      if (m.kind === 'pipette') {
        // Lay it back down flat rather than balancing it on its tip
        quat = new THREE.Quaternion().setFromAxisAngle(Z, Math.PI / 2);
        target.y = floor + 0.014;
      }
    }
    this.settling = { m, from: p.clone(), to: target, fromQ: m.obj.quaternion.clone(), toQ: quat, t: 0 };
    if (m.id === 'chem_funnel') titration.setFunnelIn(m.socket === 'buretteTop');
    if (m.id === 'chem_flask') {
      if (m.socket === 'basin') {
        titration.rinseFlask();
        curie.say('Rinsed. Pipette a fresh 25.00 cm³ of acid in for the next run.');
      }
      titration.setFlaskAt(m.socket === 'tile' ? 'tile' : m.socket === 'basin' ? 'sink' : 'bench');
    }
    if (m.id === 'chem_waste' && m.socket === 'basin') titration.emptyWaste();
    this.hands.undrive('right');
    this.focus(null);
    this.publish();
  }

  /** Bench surface height under a point (the stand base is a raised step). */
  private floorAt(x: number, z: number) {
    const b = this.standBase;
    if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z) return b.max.y;
    return this.benchY;
  }

  /** Where the pointer ray meets the carrying height. */
  private pointerTarget(m: Movable, extraY = 0) {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const y = this.benchY + this.lift + m.bottom + extraY;
    const hit = new THREE.Vector3();
    // Where the crosshair meets the bench is where it goes (held above that spot); looking up
    // above the bench, it follows the crosshair at the carrying height instead
    const onBench = this.raycaster.ray.intersectPlane(new THREE.Plane(UP.clone(), -this.benchY), new THREE.Vector3());
    if (onBench && Math.abs(onBench.x - this.tip.x) < 0.6 && onBench.z - this.tip.z < 0.4 && onBench.z - this.tip.z > -0.4) {
      hit.copy(onBench).setY(y);
    } else if (!this.raycaster.ray.intersectPlane(new THREE.Plane(UP.clone(), -y), hit)) return null;
    // Keep it on the bench in front of the student
    hit.x = THREE.MathUtils.clamp(hit.x, this.tip.x - 0.55, this.tip.x + 0.55);
    hit.z = THREE.MathUtils.clamp(hit.z, this.tip.z - 0.32, this.tip.z + 0.36);
    return hit;
  }

  /**
   * Aiming at an opening (funnel, flask mouth, beaker) with something that pours or drips: snap so
   * the lip / tip goes right over it, like placement snapping in any sim.
   */
  private snapToOpening(m: Movable) {
    if (!m.lip && m.kind !== 'dropper' && m.kind !== 'pipette') return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const ray = this.raycaster.ray;
    let best: THREE.Vector3 | null = null;
    let bestD = Infinity;
    for (const o of this.openings) {
      if (o.id === 'flask' && m.id === 'chem_flask') continue;
      if (o.id === 'waste' && m.id === 'chem_waste') continue;
      const at = o.pos();
      if (at.y < -50) continue;
      const hit = new THREE.Vector3();
      if (!ray.intersectPlane(new THREE.Plane(UP.clone(), -at.y), hit)) continue;
      const d = Math.hypot(hit.x - at.x, hit.z - at.z);
      if (d < o.r + 0.03 && d < bestD) {
        bestD = d;
        best = new THREE.Vector3(at.x, this.benchY + this.lift + m.bottom + (m.lip ? m.lip.y * m.obj.scale.y : 0), at.z);
      }
    }
    if (best && m.kind === 'dropper') best.x += 0; // the dropper's tip is under its bulb
    return best;
  }

  /** Push the held thing out of whatever it would pass through. */
  private resolveCollisions(m: Movable, p: THREE.Vector3) {
    const bottom = p.y - m.bottom;
    const tipOnly = m.kind === 'pipette' || m.kind === 'dropper';
    const obstacles: { x: number; z: number; r: number; top: number; open: number }[] = [];
    for (const o of this.movables.values()) {
      if (o === m) continue;
      const op = o.obj.position;
      const open = o.kind === 'flask' ? 0.016 * this.s : o.kind === 'beaker' ? 0.033 : 0;
      if (o.kind === 'pipette' && o.socket === 'pipetteRack') obstacles.push({ x: op.x, z: op.z, r: 0.03, top: op.y + 0.015, open: 0 });
      else obstacles.push({ x: op.x, z: op.z, r: o.radius, top: op.y - o.bottom + o.height, open });
    }
    obstacles.push({ x: this.stockPos.x, z: this.stockPos.z, r: 0.045, top: this.benchY + 0.113, open: 0.04 });
    if (this.indicatorBottle) {
      const ib = this.indicatorBottle.getWorldPosition(new THREE.Vector3());
      const box = new THREE.Box3().setFromObject(this.indicatorBottle);
      obstacles.push({ x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2, r: 0.017, top: box.max.y, open: 0 });
      void ib;
    }
    // Burette tube and the stand rod
    obstacles.push({ x: this.tip.x, z: this.tip.z, r: 0.009, top: this.buretteTop.y + 0.06, open: 0 });
    const rod = this.rig.getObjectByName('stand_rod');
    if (rod) {
      const rp = rod.getWorldPosition(new THREE.Vector3());
      obstacles.push({ x: rp.x, z: rp.z, r: 0.008, top: this.benchY + 0.65, open: 0 });
    }
    for (const o of obstacles) {
      // The burette tube only blocks from its tip upward
      const isBurette = o.x === this.tip.x && o.z === this.tip.z && o.r === 0.009;
      if (isBurette && p.y - m.bottom + m.height < this.tip.y) continue;
      if (bottom >= o.top) continue;
      const dx = p.x - o.x;
      const dz = p.z - o.z;
      const d = Math.hypot(dx, dz);
      if (tipOnly && o.open > 0 && d < o.open - 0.004) continue; // tip down inside a vessel
      const min = o.r + m.radius;
      if (d < min) {
        if (d < 1e-5) {
          p.x += min;
        } else {
          p.x = o.x + (dx / d) * min;
          p.z = o.z + (dz / d) * min;
        }
      }
    }
    const floor = this.floorAt(p.x, p.z);
    const lowest = tipOnly ? this.lowestTipY(p) : floor;
    if (p.y - m.bottom < lowest) p.y = lowest + m.bottom;
  }

  /** A pipette or dropper tip can go down inside a vessel, but not through its bottom. */
  private lowestTipY(p: THREE.Vector3) {
    const inside = (c: THREE.Vector3, r: number) => Math.hypot(p.x - c.x, p.z - c.z) < r;
    if (inside(this.stockPos, 0.038)) return this.benchY + 0.004;
    const f = this.movables.get('chem_flask');
    if (f && inside(f.obj.position, 0.014 * this.s)) return f.obj.position.y + 0.004;
    const w = this.movables.get('chem_waste');
    if (w && inside(w.obj.position, 0.03)) return w.obj.position.y + 0.004;
    return this.floorAt(p.x, p.z);
  }

  // ------------------------------------------------------------------------------------------
  // Pouring, dropping, the tap
  // ------------------------------------------------------------------------------------------

  /** What is directly below a point (a pouring lip, a pipette tip), within reach of falling liquid. */
  private targetBelow(p: THREE.Vector3): { id: PourTarget; at: THREE.Vector3 } {
    let best: { id: PourTarget; at: THREE.Vector3 } | null = null;
    let bestD = -Infinity;
    for (const o of this.openings) {
      const at = o.pos();
      if (at.y < -50) continue;
      if (p.y < at.y - 0.03) continue; // below the rim: not pouring into it
      if (this.held && o.id === 'flask' && this.held.id === 'chem_flask') continue;
      if (this.held && o.id === 'waste' && this.held.id === 'chem_waste') continue;
      const d = Math.hypot(p.x - at.x, p.z - at.z);
      // Falling liquid lands in the highest opening under it (the funnel, not the flask below it)
      if (d < o.r + 0.004 && at.y > bestD) {
        best = { id: o.id, at };
        bestD = at.y;
      }
    }
    return best ?? { id: null, at: new THREE.Vector3(p.x, this.floorAt(p.x, p.z), p.z) };
  }

  /** Where the pipette tip is: in the stock, in the flask, over the waste… */
  private tipIn(p: THREE.Vector3): PourTarget {
    const inR = (c: THREE.Vector3, r: number) => Math.hypot(p.x - c.x, p.z - c.z) < r;
    if (inR(this.stockPos, 0.04) && p.y < this.benchY + 0.064) return 'stock';
    // Tip down inside the neck of the flask or in the waste beaker
    const f = this.movables.get('chem_flask');
    if (f && this.held !== f && inR(f.obj.position, 0.016 * this.s) && p.y < f.obj.position.y + 0.16 * this.s) return 'flask';
    const w = this.movables.get('chem_waste');
    if (w && this.held !== w && inR(w.obj.position, 0.034) && p.y < w.obj.position.y + 0.12) return 'waste';
    return this.targetBelow(p).id;
  }

  private underTip(): Under {
    const f = this.movables.get('chem_flask');
    const w = this.movables.get('chem_waste');
    const near = (m: Movable | undefined, r: number) => m && Math.hypot(m.obj.position.x - this.tip.x, m.obj.position.z - this.tip.z) < r && m.obj.position.y - m.bottom + m.height < this.tip.y + 0.03;
    if (near(f, 0.016 * this.s)) return 'flask';
    if (near(w, 0.03)) return 'waste';
    return null;
  }

  private toggleTap(on = !this.onTap) {
    if (on && this.held) this.setDown();
    if (this.reading) this.readMode(false);
    this.onTap = on;
    if (!on) this.hands.undrive('right');
    this.publish();
  }

  private setValve(v: number) {
    const before = titration.get().valve;
    const next = Math.max(0, Math.min(1, v));
    titration.setValve(next);
    // Detents every tenth of a turn
    const d = Math.round(next * 10);
    if (d !== this.lastDetent) {
      this.lastDetent = d;
      soundFx.playKnobTick();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(8);
    }
    if (before <= 0.001 && next > 0.001) experiments.event('tapOpened');
    this.publish();
  }

  private squeeze() {
    const m = this.held;
    if (!m || m.kind !== 'dropper') return;
    const tip = m.obj.localToWorld(new THREE.Vector3(0, -0.049, 0));
    const below = this.targetBelow(tip);
    this.drops.spawn(tip, below.id === 'flask' ? this.flaskSurfaceY() : below.at.y, () => {
      titration.indicatorDrop(below.id);
      soundFx.playDropLiquid();
    });
    this.squeezeAnim = 0.18;
  }
  private squeezeAnim = 0;

  // ------------------------------------------------------------------------------------------
  // Reading the scale
  // ------------------------------------------------------------------------------------------

  private readMode(on: boolean) {
    if (!on) {
      this.reading = null;
      this.lean(null, null);
      this.publish();
      return;
    }
    if (this.onTap) this.toggleTap(false);
    const kind = this.held?.kind === 'pipette' ? 'pipette' : 'burette';
    // You start by looking from where you stand (above the meniscus): get down to eye level
    this.reading = { kind, eye: 0.06 };
    this.publish();
  }

  /** The meniscus being read (world). */
  private meniscusPoint() {
    if (this.reading?.kind === 'pipette' && this.held) {
      return this.held.obj.localToWorld(new THREE.Vector3(0, this.pipetteHeight(titration.get().pipetteML), 0));
    }
    const r = Math.max(-3, Math.min(50.5, titration.get().reading));
    return new THREE.Vector3(this.tip.x, this.zeroY - r * this.mlToM, this.tip.z);
  }

  // ------------------------------------------------------------------------------------------
  // Input from the scene (mouse, touch, keys) and the HUD
  // ------------------------------------------------------------------------------------------

  private hit(ndc: THREE.Vector2) {
    this.raycaster.setFromCamera(ndc, this.camera);
    const objs: THREE.Object3D[] = [];
    this.scene.traverse((o) => {
      if (o.userData?.isInteractive && o.userData.station === 'chemistry' && this.ids.includes(o.userData.interactId) && (o as THREE.Mesh).isMesh) objs.push(o);
    });
    const h = this.raycaster.intersectObjects(objs, false)[0];
    return h ? String(h.object.userData.interactId) : null;
  }

  get isHolding() {
    return !!this.held;
  }

  get heldId() {
    return this.held?.id ?? null;
  }

  /** Returns true if the bench used the press (the scene must not look/act with it). */
  pointerDown(ndc: THREE.Vector2, button: number): boolean {
    this.pointer.copy(ndc);
    if (button === 2) {
      if (this.held?.canTilt) {
        this.tiltDrag = true;
        return true;
      }
      return false;
    }
    const id = this.hit(ndc);
    if (this.held) return true; // decided on release: a click puts it down, a drag looks around
    if (!id) {
      if (this.onTap) this.toggleTap(false);
      if (this.reading) this.readMode(false);
      return false;
    }
    if (id === 'chem_stopcock') {
      this.toggleTap(true);
      return true;
    }
    if (id === 'chem_clipboard') {
      this.openSheet();
      return true;
    }
    if (id === 'chem_burette') {
      this.readMode(true);
      return true;
    }
    if (id === 'chem_indicator') {
      this.grab('chem_dropper');
      return true;
    }
    if (id === 'chem_stock' || id === 'chem_basin') return true;
    if (this.movables.has(id)) {
      this.grab(id);
      return true;
    }
    return false;
  }

  /** A click (or tap) while holding: put it down there. */
  release() {
    if (this.held) this.setDown();
  }

  pointerMove(ndc: THREE.Vector2, dx: number, dy: number): boolean {
    if (this.tiltDrag && this.held) {
      this.tilt = THREE.MathUtils.clamp(this.tilt + dy * 0.008, 0, this.maxTilt(this.held));
      return true;
    }
    if (this.reading) {
      return false;
    }
    if (!this.held) return false;
    this.pointerPlaneFromObj = false;
    this.carryOverride = null;
    this.steer.set(0, 0, 0);
    this.pointer.copy(ndc);
    // Small circles with the pointer while holding the flask = swirling
    if (this.held.kind === 'flask' && Math.hypot(dx, dy) > 0.5) {
      const a = Math.atan2(dy, dx);
      if (this.lastMoveAngle !== null) {
        let d = a - this.lastMoveAngle;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) < 1.2) this.swirlGesture = Math.min(1.5, this.swirlGesture + Math.abs(d) * 0.12);
      }
      this.lastMoveAngle = a;
    }
    return true;
  }

  pointerUp(button: number): boolean {
    if (button === 2 && this.tiltDrag) {
      this.tiltDrag = false; // let go of the tilt: it rights itself
      return true;
    }
    return false;
  }

  wheel(dy: number): boolean {
    if (this.reading) {
      this.reading = { ...this.reading, eye: THREE.MathUtils.clamp(this.reading.eye - dy * 0.00008, -0.08, 0.08) };
      this.publish();
      return true;
    }
    if (this.held) {
      if (this.keys.has('KeyR')) this.pourBias = THREE.MathUtils.clamp(this.pourBias - dy * 0.0006, -0.25, 0.6);
      else this.lift = THREE.MathUtils.clamp(this.lift - dy * 0.0004, 0, 0.62);
      return true;
    }
    if (this.onTap) {
      const fine = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      this.setValve(titration.get().valve - dy * (fine ? 0.0002 : 0.001));
      return true;
    }
    return false;
  }

  key(code: string, down: boolean): boolean {
    const handled = ['KeyR', 'KeyF', 'KeyQ', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyE', 'Space', 'Escape', 'ShiftLeft', 'ShiftRight'];
    if (!handled.includes(code)) return false;
    if (code === 'KeyE' && this.held?.kind !== 'dropper') return false; // E elsewhere = use what the crosshair is on
    if (down) this.keys.add(code);
    else this.keys.delete(code);
    if (!down) {
      if (code === 'KeyW') this.swirl(false);
      return code !== 'Escape' && code !== 'Space' && code !== 'KeyQ';
    }
    if (code === 'Space') {
      this.readMode(!this.reading);
      return true;
    }
    if (code === 'Escape' || code === 'KeyQ') {
      if (this.reading) this.readMode(false);
      else if (this.held) this.setDown();
      else if (this.onTap) this.toggleTap(false);
      else return false;
      return true;
    }
    if (code === 'KeyW') this.swirl(true);
    if (code === 'KeyE') this.squeeze();
    return true;
  }

  private swirl(on: boolean) {
    this.swirlOn = on;
    this.publish();
  }

  private maxTilt(m: Movable) {
    return m.kind === 'flask' ? 0.6 : 2.1;
  }

  /** One object with the same verbs the HUD, keyboard and Dr. Curie use. */
  readonly controls: TitrationControls = {
    grab: (id) => this.grab(id),
    setDown: () => this.setDown(),
    setInput: (name, v) => {
      this.input[name] = v;
    },
    setTilt: (rad) => {
      this.hudTilt = rad > 0;
      if (this.held?.canTilt) this.tilt = THREE.MathUtils.clamp(rad, 0, this.maxTilt(this.held));
    },
    tiltBy: (rad) => {
      if (this.held?.canTilt) this.tilt = THREE.MathUtils.clamp(this.tilt + rad, 0, this.maxTilt(this.held));
    },
    liftBy: (m) => {
      this.lift = THREE.MathUtils.clamp(this.lift + m, 0, 0.62);
    },
    valveBy: (d) => this.setValve(titration.get().valve + d),
    setValve: (v) => this.setValve(v),
    toggleTap: (on) => this.toggleTap(on),
    swirl: (on) => this.swirl(on),
    squeeze: () => this.squeeze(),
    read: (on) => this.readMode(on ?? !this.reading),
    eyeBy: (m) => {
      if (this.reading) {
        this.reading = { ...this.reading, eye: THREE.MathUtils.clamp(this.reading.eye + m, -0.08, 0.08) };
        this.publish();
      }
    },
    settled: () => !this.held || this.carryGap < 0.012,
    carryTo: (place) => {
      const m = this.held;
      if (!m) return;
      const spots: Record<string, THREE.Vector3> = {
        tile: this.tileSpot,
        funnel: this.sockets.find((s) => s.id === 'buretteTop')!.pos,
        flask: this.movables.get('chem_flask')!.obj.position,
        stock: this.stockPos,
        waste: this.movables.get('chem_waste')!.obj.position,
        basin: this.basinPos,
        indicator: this.sockets.find((s) => s.id === 'indicatorBottle')?.pos ?? this.tileSpot,
        rack: this.sockets.find((s) => s.id === 'pipetteRack')!.pos,
        home: m.homePos,
        aside: this.tileSpot.clone().add(new THREE.Vector3(-0.14, 0, 0.13)),
      };
      // '@dx,dz': a spot on the bench relative to the tile
      const rel = place.startsWith('@') ? place.slice(1).split(',').map(Number) : null;
      const p = rel ? this.tileSpot.clone().add(new THREE.Vector3(rel[0], 0, rel[1])) : spots[place];
      if (!p) return;
      this.carryTarget.set(p.x, this.carryTarget.y, p.z);
      this.carryOverride = p.clone();
      this.steer.set(0, 0, 0);
      this.pointerPlaneFromObj = true;
    },
  };
  private carryOverride: THREE.Vector3 | null = null;
  private hudTilt = false;
  private pourBias = 0;

  /** Compatibility with the bench interface: clicks are handled by pointerDown. */
  tap(id: string): boolean {
    return this.ids.includes(id);
  }

  // ------------------------------------------------------------------------------------------
  // Per frame
  // ------------------------------------------------------------------------------------------

  private v = new THREE.Vector3();
  private q = new THREE.Quaternion();

  update(delta: number) {
    const dt = Math.min(0.25, delta); // low frame rates still pour and fill at real speed
    // Keyboard / HUD continuous inputs
    const k = (a: string, b: string) => (this.keys.has(a) ? 1 : 0) - (this.keys.has(b) ? 1 : 0);
    const tiltIn = k('KeyR', 'KeyF') + this.input.tilt;
    const liftIn = this.input.lift;
    const arrow = k('ArrowUp', 'ArrowDown');
    const fine = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 0.2 : 1;

    const m = this.held;
    if (m) {
      if (m.canTilt && this.keys.has('KeyR')) {
        // Hold R: ease to a steady pour for how full it is; scroll while holding pours more or less
        const fill = m.id === 'chem_naoh_bottle' ? this.bottleML / BOTTLE_ML : m.id === 'chem_waste' ? Math.min(1, titration.get().wasteML / 200) : 0;
        const start = ((78 - fill * 66) * Math.PI) / 180;
        const goal = THREE.MathUtils.clamp(start + 0.28 + this.pourBias, 0, this.maxTilt(m));
        this.tilt += (goal - this.tilt) * Math.min(1, dt * 5);
      } else if (m.canTilt && tiltIn > 0) this.tilt = THREE.MathUtils.clamp(this.tilt + tiltIn * 1.0 * dt, 0, this.maxTilt(m));
      // Hold to pour: let go (no key, no drag, no pour button) and it rights itself, F faster
      else if (!this.tiltDrag && !this.hudTilt && this.tilt > 0) this.tilt = Math.max(0, this.tilt - (tiltIn < 0 ? 4 : 2.2) * dt);
      if (liftIn !== 0) this.lift = THREE.MathUtils.clamp(this.lift + liftIn * 0.25 * dt, 0, 0.62);
      // Pipette filler: up draws, down lets out
      if (m.kind === 'pipette') {
        const lever = arrow * fine + this.input.lever;
        if (lever !== 0) {
          const tip = m.obj.position;
          titration.pipette(lever * 5 * dt, this.tipIn(tip));
        }
      }
      this.updateHeld(m, dt);
    } else if (this.onTap) {
      if (arrow !== 0) this.setValve(titration.get().valve + arrow * 0.35 * fine * dt);
      if (this.input.lever !== 0) this.setValve(this.input.lever);
    }

    if (this.reading) {
      const eyeIn = arrow * 0.05 * dt * (this.held ? 0 : 1) + this.input.eye * 0.06 * dt;
      if (eyeIn) this.reading = { ...this.reading, eye: THREE.MathUtils.clamp(this.reading.eye + eyeIn, -0.08, 0.08) };
      const look = this.meniscusPoint();
      const eye = look.clone().add(new THREE.Vector3(0, this.reading.eye, 0.2));
      this.lean(eye, look);
    }

    // Settling something down
    if (this.settling) {
      const st = this.settling;
      st.t = Math.min(1, st.t + dt / 0.28);
      const e = st.t * st.t * (3 - 2 * st.t);
      st.m.obj.position.lerpVectors(st.from, st.to, e);
      st.m.obj.quaternion.slerpQuaternions(st.fromQ, st.toQ, e);
      if (st.t >= 1) {
        this.settling = null;
        soundFx.playGlassSlide();
      }
    }

    // Swirling: left hand on the flask (W / Swirl button), or circling the pointer while holding it
    this.swirlGesture = Math.max(0, this.swirlGesture - dt * 1.2);
    const flask = this.movables.get('chem_flask');
    const swirl = Math.min(1, (this.swirlOn ? 1 : 0) + (this.held?.kind === 'flask' ? this.swirlGesture : 0));
    titration.setSwirl(swirl);
    if (flask && swirl > 0.05) {
      this.swirlPhase += dt * 9;
      if (this.held !== flask && !this.settling) {
        const base = flask.socket === 'tile' ? this.tileSpot : flask.obj.position.clone();
        const amp = 0.004 * swirl;
        flask.obj.position.set(base.x + Math.cos(this.swirlPhase) * amp, base.y, base.z + Math.sin(this.swirlPhase) * amp);
        const neck = flask.obj.localToWorld(new THREE.Vector3(-0.02, 0.1, 0.012));
        this.hands.drive('left', { wrist: neck, grip: 0.6, twist: 0, flex: 0 }, 30, dt);
      }
    } else if (flask && this.hands.isDriven('left')) {
      if (flask.socket === 'tile' && !this.settling) flask.obj.position.copy(this.tileSpot);
      this.hands.undrive('left');
    }

    // Right hand on the tap
    if (this.onTap && this.stopcock) {
      const v = titration.get().valve;
      const wrist = this.stopcockPos.clone().add(new THREE.Vector3(0.035, -0.006, 0.05));
      this.hands.drive('right', { wrist, grip: 0.5, twist: v * 1.3, flex: 0.1 }, 26, dt);
    }

    this.syncVisuals(dt);
    this.publishLight();
  }

  private gripPos = new THREE.Vector3();
  private aimPoint: THREE.Vector3 | null = null;
  private steer = new THREE.Vector3();
  /** How far what's held still is from where it's going (m), for scripted steps to wait on. */
  private carryGap = 0;

  private updateHeld(m: Movable, dt: number) {
    // Where it should be (its base, upright): under the pointer, or carried to a named place
    let target: THREE.Vector3 | null;
    if (this.carryOverride) {
      target = this.carryOverride.clone().add(this.steer).setY(this.benchY + this.lift + m.bottom);
    } else if (this.pointerPlaneFromObj) {
      target = this.carryTarget.clone().setY(this.benchY + this.lift + m.bottom);
    } else {
      // Aiming: what matters sits on the crosshair (a pouring lip), the rest hangs below and to the side
      // (aim at the lip's height, so the lip is exactly under the crosshair)
      const aimAt = this.snapToOpening(m) ?? this.pointerTarget(m, m.lip ? m.lip.y * m.obj.scale.y : 0);
      this.aimPoint = aimAt ? aimAt.clone() : null;
      target = aimAt ? aimAt.add(this.steer).setY(this.benchY + this.lift + m.bottom) : null;
    }
    this.carryGap = target ? m.obj.position.distanceTo(target) : 0;
    if (!target) return;
    this.resolveCollisions(m, target);
    this.carryTarget.copy(target);

    // The hand carries it by the grip; it turns about the hand, like a bottle in a real hand
    const gripOffset = new THREE.Vector3(0, m.grip, 0);
    const want = target.clone().add(gripOffset);
    if (this.gripPos.lengthSq() === 0 || this.justGrabbed) {
      this.gripPos.copy(m.obj.position).add(gripOffset.clone().applyQuaternion(m.obj.quaternion));
      this.justGrabbed = false;
    }
    const kf = 1 - Math.exp(-m.heavy * dt);
    const vel = want.clone().sub(this.gripPos);
    this.gripPos.addScaledVector(vel, kf);

    // Upright (the pipette swings vertical), lip turned to the left, tilted to pour, with a little lag
    const lean = THREE.MathUtils.clamp(-vel.x * 3, -0.1, 0.1);
    const tilt = this.tilt + lean;
    this.q.setFromAxisAngle(Z, tilt).multiply(new THREE.Quaternion().setFromAxisAngle(UP, m.yaw));
    m.obj.quaternion.slerp(this.q, 1 - Math.exp(-14 * dt));
    m.obj.position.copy(this.gripPos).sub(gripOffset.applyQuaternion(m.obj.quaternion));
    const p = m.obj.position;

    // Keep the pouring lip on the place it's carried to, or on the crosshair, as it tilts
    const lipGoal = this.carryOverride ?? (this.pointerPlaneFromObj ? null : this.aimPoint);
    if (lipGoal && m.lip) {
      const lip = m.obj.localToWorld(m.lip.clone());
      this.steer.x += (lipGoal.x - lip.x) * Math.min(1, dt * 6);
      this.steer.z += (lipGoal.z - lip.z) * Math.min(1, dt * 6);
      this.steer.clampLength(0, 0.2);
    }

    // The hand that holds it
    const side = new THREE.Vector3(m.radius + 0.018, -0.01, 0.035).applyAxisAngle(Z, tilt);
    const grip = m.kind === 'dropper' ? 0.45 + (this.squeezeAnim > 0 ? 0.35 : 0) : m.kind === 'pipette' ? 0.55 : 0.7;
    this.squeezeAnim = Math.max(0, this.squeezeAnim - dt);
    this.hands.drive('right', { wrist: this.gripPos.clone().add(side), twist: tilt * 0.9, grip, flex: 0 }, 28, dt);

    // Keep it in view when lifted high (up to the funnel)
    // (only when carried for you; when you aim yourself the view is yours)
    if (this.lift > 0.2 && this.carryOverride) this.focus(p.clone());
    else this.focus(null);

    // Pouring
    this.pourInfo = null;
    if (m.lip && this.tilt > 0.05) {
      const lip = m.obj.localToWorld(m.lip.clone());
      const fill = m.id === 'chem_naoh_bottle' ? this.bottleML / BOTTLE_ML : m.id === 'chem_waste' ? Math.min(1, titration.get().wasteML / 200) : m.id === 'chem_flask' ? 0 : 0;
      const cap = m.id === 'chem_naoh_bottle' ? BOTTLE_ML : 200;
      const rate = pourRate(this.tilt, fill, cap);
      if (rate > 0) {
        const ml = Math.min(rate * dt, m.id === 'chem_naoh_bottle' ? this.bottleML : titration.get().wasteML);
        const below = this.targetBelow(lip);
        const splash = this.tilt > SPLASH_TILT ? Math.min(0.6, (this.tilt - SPLASH_TILT) * 1.5) : 0;
        if (m.id === 'chem_naoh_bottle') {
          this.bottleML -= ml;
          titration.pourBase(ml, below.id, splash);
        } else if (m.id === 'chem_waste') {
          if (below.id !== 'sink') titration.pourBase(0, null, 0);
          titration.takeWaste(ml);
        }
        this.pourInfo = { from: lip, to: below.id === 'flask' ? new THREE.Vector3(below.at.x, this.flaskSurfaceY(), below.at.z) : below.at, flow: Math.min(1, rate / 30) };
      }
    }
  }

  private flaskSurfaceY() {
    const f = this.movables.get('chem_flask');
    if (!f) return this.benchY;
    return f.obj.position.y + this.flaskLiquid.surfaceHeight() * f.obj.scale.y + 0.0015;
  }

  private onSim(e: { type: string; into?: Under; what?: string; past?: number }) {
    if (e.type === 'drop') {
      const flow = flowFor(titration.get().valve);
      if (flow < 0.7) {
        const floor = e.into === 'flask' ? this.flaskSurfaceY() : e.into === 'waste' ? this.movables.get('chem_waste')!.obj.position.y + 0.01 : this.floorAt(this.tip.x, this.tip.z);
        this.drops.spawn(this.tip, floor);
      }
      const now = performance.now();
      if (now - this.dropSoundAt > 140) {
        this.dropSoundAt = now;
        soundFx.playDropLiquid();
      }
    } else if (e.type === 'spill') {
      experiments.count('spill');
      curie.say(`Careful: ${e.what} went on the bench. Wipe it up and go slower.`);
    } else if (e.type === 'funnelOverflow') {
      experiments.count('spill');
      curie.say('The funnel overflowed. Pour slowly: the funnel drains slower than you can pour.');
    } else if (e.type === 'bubbleCleared') {
      experiments.event('bubbleCleared');
      curie.say('Good, the air bubble is out of the jet. Now it reads true.');
    } else if (e.type === 'bubbleLeft') {
      experiments.event('bubbleLeft');
    } else if (e.type === 'fillerFlooded') {
      experiments.event('fillerFlooded');
      curie.say('Too far: acid has gone up into the filler. Draw up slowly and stop just above the line.');
    } else if (e.type === 'funnelLeft') {
      curie.say('The funnel is still in the burette. Drips from it will change your reading. Take it out before you titrate.');
    } else if (e.type === 'noIndicator') {
      curie.say('No indicator in the flask: you will not see the end point. Add 2 or 3 drops first.');
    } else if (e.type === 'endpoint') {
      soundFx.playBeep();
    } else if (e.type === 'overshoot') {
      experiments.event('overshoot');
      curie.say('That is deep pink: you went past the end point. Note it, rinse the flask and do another run.');
    }
  }

  private syncVisuals(dt: number) {
    const s = titration.get();
    // Burette level, the bubble and the tap handle
    const visible = s.hasLiquid && s.reading < 50.6;
    this.buretteMain.setFraction(visible ? Math.max(0.0005, (50 - Math.min(50, s.reading)) / 53) : 0);
    this.buretteStem.setFraction(s.hasLiquid && s.reading < 51.1 ? 1 : 0);
    this.bubbleMesh.visible = s.bubble && s.hasLiquid;
    if (this.stopcock) this.stopcock.rotation.z = (1 - s.valve) * (Math.PI / 2);
    this.bottleLiquid?.setFraction(this.bottleML / BOTTLE_ML * 0.92);
    this.wasteLiquid.setFraction(Math.min(1, s.wasteML / 250));
    this.pipetteLiquid.setFraction(this.pipetteHeight(s.pipetteML) / 0.398);

    // Flask: level, colour, the pink flash where base lands
    const vol = s.acidMmol / 0.1 + s.baseMmol / 0.1 + s.waterML + s.indicatorDrops * 0.05;
    this.flaskLiquid.update(vol, s.swirl * 0.4);
    const pink = permanentPink(s);
    this.flaskLiquid.material.color.copy(CLEAR).lerp(PINK, pink * 0.85);
    const blobR = 0.004 + s.flash * 0.012;
    this.flaskBlob.scale.setScalar(blobR);
    this.flaskBlob.position.set(0, Math.max(0.004, this.flaskLiquid.surfaceHeight() - blobR * 0.6), 0);
    (this.flaskBlob.material as THREE.MeshStandardMaterial).opacity = s.flash * 0.75;
    this.flaskBlob.visible = s.flash > 0.02 && vol > 1;

    // Liquid leaving the burette: drops, or a stream when wide open
    const flow = s.hasLiquid && s.reading < 51 ? flowFor(s.valve) : 0;
    if (flow >= 0.7) {
      const u = this.underTip();
      const to = u === 'flask' ? new THREE.Vector3(this.tip.x, this.flaskSurfaceY(), this.tip.z) : u === 'waste' ? this.movables.get('chem_waste')!.obj.position.clone().add(new THREE.Vector3(0, 0.01, 0)) : new THREE.Vector3(this.tip.x, this.floorAt(this.tip.x, this.tip.z), this.tip.z);
      this.tipStream.update(dt, this.tip, to, Math.min(1, flow / 2.4));
    } else this.tipStream.update(dt, this.tip, this.tip, 0);
    titration.setUnder(this.underTip());

    this.drops.update(dt);
    if (this.pourInfo) this.stream.update(dt, this.pourInfo.from, this.pourInfo.to, this.pourInfo.flow);
    else this.stream.update(dt, this.tip, this.tip, 0);
  }

  /** Over what / in what is the held thing (for the HUD). */
  private overText(): string | null {
    const m = this.held;
    if (!m) return null;
    if (m.kind === 'pipette') {
      const t = this.tipIn(m.obj.position);
      return t === 'stock' ? 'Tip in the HCl' : t === 'flask' ? 'Tip in the flask' : t === 'waste' ? 'Over the waste beaker' : null;
    }
    if (m.kind === 'dropper') {
      const t = this.targetBelow(m.obj.localToWorld(new THREE.Vector3(0, -0.049, 0))).id;
      return t === 'flask' ? 'Over the flask' : null;
    }
    if (m.lip) {
      const t = this.targetBelow(m.obj.localToWorld(m.lip.clone())).id;
      const names: Record<string, string> = { funnel: 'Lip over the funnel', burette: 'Over the burette (no funnel!)', flask: 'Over the flask', waste: 'Over the waste beaker', sink: 'Over the basin', stock: 'Over the HCl stock' };
      return t ? names[t] : null;
    }
    const near = this.sockets.find((sk) => sk.accepts.includes(m.id) && Math.hypot(sk.pos.x - m.obj.position.x, sk.pos.z - m.obj.position.z) < 0.05);
    const names: Record<string, string> = { tile: 'Under the burette', buretteTop: 'In the burette top', indicatorBottle: 'Back in the bottle', pipetteRack: 'On the rack', basin: 'In the rinse basin' };
    return near ? names[near.id] : null;
  }

  private publishAt = 0;
  private publish() {
    const m = this.held;
    handsUI.set({
      held: m ? { id: m.id, name: m.name, kind: m.kind } : null,
      onTap: this.onTap,
      valve: titration.get().valve,
      swirling: this.swirlOn,
      reading: this.reading,
      tilt: this.tilt,
      lift: this.lift,
      over: this.overText(),
      pouring: !!this.pourInfo,
      splashing: this.tilt > SPLASH_TILT,
    });
  }
  private publishLight() {
    const now = performance.now();
    if (now - this.publishAt < 100) return;
    this.publishAt = now;
    this.publish();
  }

  get isBusy() {
    return !!this.held || !!this.settling || this.onTap || this.swirlOn || !!this.reading || titration.get().valve > 0 || titration.get().flash > 0.01;
  }

  /** Fresh apparatus for a new practical: everything back where it lives, burette empty. */
  reset() {
    if (this.held) this.setDown();
    if (this.reading) this.readMode(false);
    this.onTap = false;
    this.swirlOn = false;
    this.settling = null;
    for (const m of this.movables.values()) {
      m.obj.position.copy(m.homePos);
      m.obj.quaternion.copy(m.homeQuat);
      m.socket = m.homeSocket;
    }
    this.bottleML = BOTTLE_ML;
    titration.reset();
    this.hands.undrive('right');
    this.hands.undrive('left');
    this.publish();
  }

  /** Where something is on screen (CSS px), for tests that drive the real mouse. */
  screenOf(id: string, canvas: HTMLCanvasElement) {
    const target = id === 'chem_stopcock' ? this.stopcockPos : id === 'chem_burette' ? this.meniscusPoint() : this.movables.get(id)?.obj.localToWorld(new THREE.Vector3(0, (this.movables.get(id)!.grip * 0.6) / this.movables.get(id)!.obj.scale.y, 0));
    if (!target) return null;
    const v = target.clone().project(this.camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  dispose() {
    this.unsub.forEach((u) => u());
    titrationControls.register(null);
  }
}
