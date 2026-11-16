import * as THREE from 'three';
import { loadLabModel } from '@/lib/assetLoader';

/**
 * First-person gloved hands (cut from the Dr. Curie rig). Each hand is driven by a target wrist
 * position in world space; the forearm is aimed from a plausible elbow, fingers curl for grips,
 * and held objects ride on the hand so tilting the wrist really pours.
 */

type Side = 'right' | 'left';

interface HandPose {
  wrist: THREE.Vector3; // world
  twist: number; // roll about the forearm (rad): pouring
  flex: number; // wrist bend (rad)
  grip: number; // 0 open .. 1 closed
}

interface Hand {
  side: Side;
  forearm: THREE.Bone;
  handBone: THREE.Bone;
  fingers: THREE.Bone[];
  thumbs: THREE.Bone[];
  fingerRest: THREE.Quaternion[];
  thumbRest: THREE.Quaternion[];
  restQuat: THREE.Quaternion;
  restDir: THREE.Vector3; // forearm->wrist direction in forearm parent frame at rest
  length: number;
  handRestQuat: THREE.Quaternion;
  pose: HandPose;
  from: HandPose | null;
  to: HandPose | null;
  t: number;
  dur: number;
  resolve: (() => void) | null;
  holdPivot: THREE.Object3D;
  held: THREE.Object3D | null;
  /** Called every frame while moving; can nudge the wrist target (used to keep a pour lip on target). */
  steer: ((pose: HandPose) => void) | null;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export class FirstPersonHands {
  readonly root = new THREE.Group();
  private hands: Partial<Record<Side, Hand>> = {};
  ready = false;

  constructor(private camera: THREE.Camera) {
    this.root.name = 'fpHands';
    this.root.visible = false;
  }

  async load() {
    const loaded = await loadLabModel('fp-arms', null);
    if (!loaded) return false;
    const model = loaded.root;
    model.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isMesh) {
        m.frustumCulled = false;
        m.castShadow = false;
        m.renderOrder = 5;
      }
    });
    this.root.add(model);
    this.camera.add(this.root);
    this.root.updateMatrixWorld(true);

    for (const side of ['right', 'left'] as Side[]) {
      const S = side === 'right' ? 'Right' : 'Left';
      const find = (re: RegExp) => {
        let found: THREE.Bone | null = null;
        model.traverse((o) => {
          if (!found && (o as THREE.Bone).isBone && re.test(o.name)) found = o as THREE.Bone;
        });
        return found as THREE.Bone | null;
      };
      const forearm = find(new RegExp(`${S}ForeArm$`));
      const handBone = find(new RegExp(`${S}Hand$`));
      if (!forearm || !handBone) return false;
      const fingers: THREE.Bone[] = [];
      const thumbs: THREE.Bone[] = [];
      model.traverse((o) => {
        if (!(o as THREE.Bone).isBone) return;
        if (new RegExp(`${S}Hand(Index|Middle|Ring|Pinky)[123]$`).test(o.name)) fingers.push(o as THREE.Bone);
        if (new RegExp(`${S}HandThumb[23]$`).test(o.name)) thumbs.push(o as THREE.Bone);
      });
      const restDir = handBone.position.clone().normalize().applyQuaternion(forearm.quaternion);
      const holdPivot = new THREE.Object3D();
      // Palm centre, slightly in front of the wrist (hand bone space)
      holdPivot.position.set(0, handBone.position.length() * 0.35, 0.02);
      handBone.add(holdPivot);
      this.hands[side] = {
        side,
        forearm,
        handBone,
        fingers,
        thumbs,
        fingerRest: fingers.map((b) => b.quaternion.clone()),
        thumbRest: thumbs.map((b) => b.quaternion.clone()),
        restQuat: forearm.quaternion.clone(),
        restDir,
        length: handBone.position.length(),
        handRestQuat: handBone.quaternion.clone(),
        pose: { wrist: this.idleWrist(side), twist: 0, flex: 0, grip: 0.15 },
        from: null,
        to: null,
        t: 0,
        dur: 0,
        resolve: null,
        holdPivot,
        held: null,
        steer: null,
      };
    }
    this.ready = true;
    return true;
  }

  /** True while any hand is moving or steering (the frame scheduler keeps full rate). */
  get isAnimating() {
    return Object.values(this.hands).some((h) => h && h.from !== null);
  }

  show(visible: boolean) {
    this.root.visible = visible && this.ready;
  }

  /** The hand on the same side of the view as a point (people reach with the nearer hand). */
  sideFor(world: THREE.Vector3): Side {
    return this.camera.worldToLocal(world.clone()).x < -0.02 ? 'left' : 'right';
  }

  /** True if point a appears left of point b from the student's eyes. */
  leftOf(a: THREE.Vector3, b: THREE.Vector3) {
    return this.camera.worldToLocal(a.clone()).x < this.camera.worldToLocal(b.clone()).x;
  }

  /** Resting position: low in view, like hands hovering over the bench edge. */
  idleWrist(side: Side) {
    const local = new THREE.Vector3(side === 'right' ? 0.16 : -0.16, -0.15, -0.36);
    return this.camera.localToWorld(local);
  }

  /** Move a hand; resolves when it arrives. */
  move(side: Side, target: Partial<HandPose>, dur = 0.6, steer: Hand['steer'] = null): Promise<void> {
    const h = this.hands[side];
    if (!h) return Promise.resolve();
    h.resolve?.();
    h.from = { ...h.pose, wrist: h.pose.wrist.clone() };
    h.to = { ...h.pose, ...target, wrist: (target.wrist ?? h.pose.wrist).clone() };
    h.t = 0;
    h.dur = Math.max(0.05, dur);
    h.steer = steer;
    return new Promise((res) => (h.resolve = res));
  }

  rest(side: Side, dur = 0.6) {
    return this.move(side, { wrist: this.idleWrist(side), twist: 0, flex: 0, grip: 0.15 }, dur);
  }

  wait(s: number) {
    return new Promise<void>((res) => setTimeout(res, s * 1000));
  }

  /** Current palm position (world): where held objects sit. */
  palm(side: Side) {
    return this.hands[side]!.holdPivot.getWorldPosition(new THREE.Vector3());
  }

  /** Put obj in the hand, keeping its current world transform. */
  grab(side: Side, obj: THREE.Object3D) {
    const h = this.hands[side];
    if (!h) return;
    h.holdPivot.attach(obj);
    h.held = obj;
  }

  /** Hand the object back to `parent`, keeping its world transform. */
  release(side: Side, parent: THREE.Object3D) {
    const h = this.hands[side];
    if (!h?.held) return null;
    const obj = h.held;
    parent.attach(obj);
    h.held = null;
    return obj;
  }

  update(delta: number) {
    if (!this.ready || !this.root.visible) return;
    for (const h of Object.values(this.hands)) {
      if (!h) continue;
      if (h.from && h.to) {
        h.t = Math.min(1, h.t + delta / h.dur);
        const k = smooth(h.t);
        h.pose.wrist.lerpVectors(h.from.wrist, h.to.wrist, k);
        h.pose.twist = THREE.MathUtils.lerp(h.from.twist, h.to.twist, k);
        h.pose.flex = THREE.MathUtils.lerp(h.from.flex, h.to.flex, k);
        h.pose.grip = THREE.MathUtils.lerp(h.from.grip, h.to.grip, k);
        if (h.t >= 1) {
          h.from = h.to = null;
          const r = h.resolve;
          h.resolve = null;
          r?.();
        }
      } else if (h.held === null && !h.steer) {
        // Idle hands follow the camera gently
        h.pose.wrist.lerp(this.idleWrist(h.side), Math.min(1, delta * 6));
      }
      h.steer?.(h.pose);
      this.apply(h);
    }
  }

  // Scratch objects: apply() runs every frame per hand, so it must not allocate (GC stutter on phones)
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private q1 = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private static X = new THREE.Vector3(1, 0, 0);

  private apply(h: Hand) {
    const parent = h.forearm.parent!;
    const wristLocal = parent.worldToLocal(this.v1.copy(h.pose.wrist));
    // Elbow sits back, down and out from the wrist (in camera terms), like a person leaning on a bench
    const out = h.side === 'right' ? 1 : -1;
    const elbowCam = this.camera.worldToLocal(this.v2.copy(h.pose.wrist));
    elbowCam.x += 0.09 * out;
    elbowCam.y -= 0.13;
    elbowCam.z += 0.2;
    const elbowLocal = parent.worldToLocal(this.camera.localToWorld(elbowCam));
    const dir = this.v3.copy(wristLocal).sub(elbowLocal).normalize();
    const q = this.q1.setFromUnitVectors(h.restDir, dir).multiply(h.restQuat);
    q.premultiply(this.q2.setFromAxisAngle(dir, h.pose.twist * (h.side === 'right' ? -1 : 1)));
    h.forearm.quaternion.copy(q);
    h.forearm.position.copy(wristLocal).addScaledVector(dir, -h.length);

    h.handBone.quaternion.copy(h.handRestQuat).multiply(this.q2.setFromAxisAngle(FirstPersonHands.X, h.pose.flex));

    const curl = h.pose.grip * 1.25;
    for (let i = 0; i < h.fingers.length; i++) h.fingers[i].quaternion.copy(h.fingerRest[i]).multiply(this.q2.setFromAxisAngle(FirstPersonHands.X, curl));
    for (let i = 0; i < h.thumbs.length; i++) h.thumbs[i].quaternion.copy(h.thumbRest[i]).multiply(this.q2.setFromAxisAngle(FirstPersonHands.X, curl * 0.5));
  }
}
