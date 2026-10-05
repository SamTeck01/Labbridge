import * as THREE from 'three';
import { soundFx } from '@/lib/soundEffects';
import { FirstPersonHands } from '@/lib/workbench/hands';

/**
 * Hold-and-use for any bench: aim at an item and click to pick it up, carry it over the bench
 * (it goes where the crosshair meets the bench), click a place to put it in (sockets snap),
 * hold R to pour (items with a lip), E to use it on whatever its working end is over (a loop in
 * acid, a spatula over the boat, a pencil on paper), Q to put it back. The bench only says what
 * the items and places are and what happens; the hands, carrying and aiming are all here.
 */

export interface HoldItem {
  id: string;
  name: string;
  obj: THREE.Object3D;
  /** Height of the hand above the item's origin (m). */
  grip: number;
  /** Height of the item's origin above what it stands on (m). */
  bottom: number;
  radius: number;
  /** Local pouring lip: makes R pour. */
  lip?: THREE.Vector3;
  /** Local working end (loop, spatula, pencil tip): what E and dipping use. */
  tip?: THREE.Vector3;
  /** Orientation while carried (default: upright). */
  carryQuat?: THREE.Quaternion;
  /** Can be set down anywhere on the bench; otherwise Q / a click on the bench puts it back home. */
  freePlace?: boolean;
  /** Orientation when set down on the bench (default: as carried). */
  restQuat?: THREE.Quaternion;
  /** What E does with it, for the hints ("Dip / tap off", "Draw a line"…). */
  useLabel?: string;
}

export interface Zone {
  id: string;
  name: string;
  pos: () => THREE.Vector3;
  r: number;
  accepts: (item: HoldItem) => boolean;
  /** Where a dropped item rests (null: the bench takes it, e.g. a slide that becomes part of the stage). */
  rest?: (item: HoldItem) => { pos: THREE.Vector3; quat?: THREE.Quaternion } | null;
  onDrop?: (item: HoldItem) => void;
}

export interface HolderHooks {
  canPick?: (item: HoldItem) => boolean;
  onPick?: (item: HoldItem) => void;
  onUse?: (item: HoldItem, over: Zone | null) => void;
  /** Called every frame while pouring (tilt > 0) with how fast it pours (0..1). */
  onPour?: (item: HoldItem, over: Zone | null, rate: number, dt: number, lip: THREE.Vector3) => void;
  /** Called every frame while held, with what the working end is in/over. */
  onHeld?: (item: HoldItem, over: Zone | null, dt: number) => void;
  onPutDown?: (item: HoldItem, home: boolean) => void;
}

const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

interface Home {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  parent: THREE.Object3D;
}

export class Holder {
  readonly items = new Map<string, HoldItem>();
  readonly zones: Zone[] = [];
  private homes = new Map<string, Home>();
  held: HoldItem | null = null;
  private lift = 0.08;
  private tilt = 0;
  private pourKey = false;
  private gripPos = new THREE.Vector3();
  private settling: { item: HoldItem; from: THREE.Vector3; to: THREE.Vector3; fq: THREE.Quaternion; tq: THREE.Quaternion; t: number; parent: THREE.Object3D } | null = null;
  private raycaster = new THREE.Raycaster();
  private aimNdc = new THREE.Vector2(0, 0);
  over: Zone | null = null;

  constructor(
    private scene: THREE.Scene,
    private camera: () => THREE.Camera | null,
    private hands: FirstPersonHands,
    private benchY: number,
    private center: THREE.Vector3,
    private hooks: HolderHooks = {}
  ) {}

  add(item: HoldItem) {
    this.items.set(item.id, item);
    this.homes.set(item.id, { pos: item.obj.position.clone(), quat: item.obj.quaternion.clone(), parent: item.obj.parent ?? this.scene });
    item.obj.traverse((o) => (o.userData.holdId = item.id));
    item.obj.userData.keepSeparate = true;
    return item;
  }

  zone(z: Zone) {
    this.zones.push(z);
    return z;
  }

  /** Where an item is kept between uses (e.g. the oil bottle's spot) can move. */
  setHome(id: string, pos: THREE.Vector3, quat?: THREE.Quaternion, parent?: THREE.Object3D) {
    const h = this.homes.get(id);
    if (h) this.homes.set(id, { pos: pos.clone(), quat: quat?.clone() ?? h.quat, parent: parent ?? h.parent });
  }

  get isHolding() {
    return !!this.held;
  }

  get busy() {
    return !!this.held || !!this.settling;
  }

  // ------------------------------------------------------------------------------------------

  /** The item under the crosshair, if any. */
  itemAt(ndc: THREE.Vector2) {
    const cam = this.camera();
    if (!cam) return null;
    const objs: THREE.Object3D[] = [];
    for (const it of this.items.values()) if (it.obj.visible) it.obj.traverse((o) => (o as THREE.Mesh).isMesh && objs.push(o));
    // Small things (a plug, a pencil) are easy to miss: also accept a press a few pixels off
    const d = 0.015;
    for (const [ox, oy] of [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d]]) {
      this.raycaster.setFromCamera(new THREE.Vector2(ndc.x + ox, ndc.y + oy), cam);
      const h = this.raycaster.intersectObjects(objs, false)[0];
      const id = h?.object.userData.holdId as string | undefined;
      if (id) return this.items.get(id) ?? null;
    }
    return null;
  }

  /** Take an item into the right hand (also used to spawn one, e.g. a slide from the box). */
  pick(item: HoldItem) {
    if (this.held) this.putDown();
    if (this.hooks.canPick && !this.hooks.canPick(item)) return false;
    this.settling = null;
    this.held = item;
    this.scene.attach(item.obj);
    this.tilt = 0;
    const floor = this.benchY;
    this.lift = Math.max(0.05, item.obj.position.y - item.bottom - floor + 0.05);
    this.gripPos.copy(item.obj.position).add(new THREE.Vector3(0, item.grip, 0));
    this.carryTarget = item.obj.position.clone();
    this.followAim = false;
    soundFx.playGlassSlide();
    this.hooks.onPick?.(item);
    return true;
  }

  private carryTarget = new THREE.Vector3();
  private followAim = false;

  /** Press: put the held item into the place you aim at, or pick up what you aim at. */
  pointerDown(ndc: THREE.Vector2) {
    this.aimNdc.copy(ndc);
    if (this.held) {
      const z = this.aimedZone(ndc) ?? this.over;
      if (z && z.accepts(this.held)) this.dropInto(z);
      else this.putDown();
      return true;
    }
    const it = this.itemAt(ndc);
    if (it) return this.pick(it);
    return false;
  }

  /** Pointer moved: the held item follows the crosshair. */
  aim(ndc: THREE.Vector2) {
    this.aimNdc.copy(ndc);
    this.followAim = true;
  }

  wheel(dy: number) {
    if (!this.held) return false;
    this.lift = THREE.MathUtils.clamp(this.lift - dy * 0.0004, 0, 0.5);
    return true;
  }

  key(code: string, down: boolean) {
    if (!this.held) return false;
    if (code === 'KeyR') {
      this.pourKey = down && !!this.held.lip;
      return !!this.held.lip;
    }
    if (!down) return code === 'KeyE' || code === 'KeyQ';
    if (code === 'KeyQ' || code === 'Escape') {
      this.putDown(true);
      return true;
    }
    if (code === 'KeyE') {
      this.hooks.onUse?.(this.held, this.over);
      this.squeeze = 0.2;
      return true;
    }
    return false;
  }
  private squeeze = 0;

  /** Put it down: on the bench where it is (if it can go anywhere), else back home. */
  putDown(home = false) {
    const it = this.held;
    if (!it) return;
    this.held = null;
    this.pourKey = false;
    const p = it.obj.position;
    const h = this.homes.get(it.id)!;
    let to: THREE.Vector3;
    let tq: THREE.Quaternion;
    let parent = this.scene as THREE.Object3D;
    const goHome = home || !it.freePlace;
    if (goHome) {
      parent = h.parent;
      to = h.parent.localToWorld(h.pos.clone());
      tq = h.parent.getWorldQuaternion(new THREE.Quaternion()).multiply(h.quat);
    } else {
      to = new THREE.Vector3(p.x, this.benchY + it.bottom, p.z);
      tq = it.restQuat?.clone() ?? it.carryQuat?.clone() ?? new THREE.Quaternion();
    }
    this.settling = { item: it, from: p.clone(), to, fq: it.obj.quaternion.clone(), tq, t: 0, parent };
    this.hands.undrive('right');
    this.hooks.onPutDown?.(it, goHome);
  }

  private dropInto(z: Zone) {
    const it = this.held!;
    this.held = null;
    this.pourKey = false;
    const rest = z.rest ? z.rest(it) : { pos: z.pos().clone().setY(z.pos().y + it.bottom) };
    if (rest) {
      this.settling = { item: it, from: it.obj.position.clone(), to: rest.pos, fq: it.obj.quaternion.clone(), tq: rest.quat ?? it.carryQuat?.clone() ?? new THREE.Quaternion(), t: 0, parent: this.scene };
    }
    this.hands.undrive('right');
    z.onDrop?.(it);
    soundFx.playGlassSlide();
  }

  /** A place near where the crosshair meets it. */
  private aimedZone(ndc: THREE.Vector2, mustAccept = true) {
    const cam = this.camera();
    if (!cam || !this.held) return null;
    this.raycaster.setFromCamera(ndc, cam);
    let best: Zone | null = null;
    let bd = Infinity;
    for (const z of this.zones) {
      if (mustAccept && !z.accepts(this.held)) continue;
      const at = z.pos();
      const hit = this.raycaster.ray.intersectPlane(new THREE.Plane(UP.clone(), -at.y), new THREE.Vector3());
      if (!hit) continue;
      const d = Math.hypot(hit.x - at.x, hit.z - at.z);
      if (d < z.r + 0.04 && d < bd) {
        bd = d;
        best = z;
      }
    }
    return best;
  }

  /** The working end (tip, else lip, else the item's base) in world space. */
  private workPoint(it: HoldItem) {
    return it.obj.localToWorld((it.tip ?? it.lip ?? new THREE.Vector3()).clone());
  }

  private zoneUnder(p: THREE.Vector3) {
    let best: Zone | null = null;
    let bd = Infinity;
    for (const z of this.zones) {
      const at = z.pos();
      const d = Math.hypot(p.x - at.x, p.z - at.z);
      if (d < z.r + 0.02 && p.y > at.y - 0.1 && p.y < at.y + 0.3 && d < bd) {
        bd = d;
        best = z;
      }
    }
    return best;
  }

  update(dt: number) {
    if (this.settling) {
      const s = this.settling;
      s.t = Math.min(1, s.t + dt / 0.28);
      const e = s.t * s.t * (3 - 2 * s.t);
      s.item.obj.position.lerpVectors(s.from, s.to, e);
      s.item.obj.quaternion.slerpQuaternions(s.fq, s.tq, e);
      if (s.t >= 1) {
        s.parent.attach(s.item.obj);
        this.settling = null;
      }
    }
    const it = this.held;
    if (!it) return;
    const cam = this.camera();
    if (!cam) return;

    // Tilt: hold R to pour steadily; let go and it rights itself
    if (this.pourKey) this.tilt += (0.9 - this.tilt) * Math.min(1, dt * 4);
    else this.tilt = Math.max(0, this.tilt - dt * 2.5);
    const q = new THREE.Quaternion().setFromAxisAngle(Z, this.tilt).multiply(it.carryQuat ?? new THREE.Quaternion());

    // Where it should be: over where the crosshair meets the bench (or a place it snaps to)
    let target = this.carryTarget.clone();
    let snapped: Zone | null = null;
    if (this.followAim) {
      this.raycaster.setFromCamera(this.aimNdc, cam);
      const ray = this.raycaster.ray;
      const z = this.aimedZone(this.aimNdc, false); // snap the working end over any place (pour into, dip into…)
      const onBench = ray.intersectPlane(new THREE.Plane(UP.clone(), -this.benchY), new THREE.Vector3());
      if (z && (it.tip || it.lip)) {
        snapped = z;
        // Snap: the working end goes right over the place, at the angle it is being tilted to
        const wp = (it.tip ?? it.lip)!.clone().multiply(it.obj.scale).applyQuaternion(q);
        target = z.pos().clone().sub(new THREE.Vector3(wp.x, 0, wp.z));
      } else if (onBench && onBench.distanceTo(this.center) < 0.9) target = onBench;
      else ray.intersectPlane(new THREE.Plane(UP.clone(), -(this.benchY + this.lift)), target);
      target.x = THREE.MathUtils.clamp(target.x, this.center.x - 0.7, this.center.x + 0.7);
      target.z = THREE.MathUtils.clamp(target.z, this.center.z - 0.45, this.center.z + 0.45);
      this.carryTarget.copy(target);
    }
    // Height: the lift above the bench; over a place, low enough to dip the working end in
    let y = this.benchY + this.lift + it.bottom;
    const wpRot = (it.tip ?? it.lip ?? new THREE.Vector3()).clone().multiply(it.obj.scale).applyQuaternion(q);
    const overNow = snapped ?? this.zoneUnder(this.workPoint(it));
    // A lip pours from just above the opening; a working tip may dip just into it
    const minWork = overNow ? overNow.pos().y + (it.lip && !it.tip ? 0.01 : -0.03) : this.benchY + 0.004;
    const workY = y + wpRot.y;
    if (workY < minWork) y += minWork - workY;
    target.y = y;

    // The item turns about the hand: place it so its origin (not the grip) lands on the target
    const grip = new THREE.Vector3(0, it.grip, 0);
    const want = target.clone().add(grip.clone().applyQuaternion(q));
    this.gripPos.lerp(want, 1 - Math.exp(-16 * dt));
    it.obj.quaternion.slerp(q, 1 - Math.exp(-14 * dt));
    it.obj.position.copy(this.gripPos).sub(grip.clone().applyQuaternion(it.obj.quaternion));

    this.over = this.zoneUnder(this.workPoint(it));
    this.squeeze = Math.max(0, this.squeeze - dt);
    const side = new THREE.Vector3(it.radius + 0.02, -0.01, 0.035).applyAxisAngle(Z, this.tilt);
    this.hands.drive('right', { wrist: this.gripPos.clone().add(side), twist: this.tilt * 0.9, grip: this.squeeze > 0 ? 0.85 : 0.62, flex: 0 }, 26, dt);

    if (it.lip && this.tilt > 0.15) this.hooks.onPour?.(it, this.over, Math.min(1, (this.tilt - 0.15) / 0.6), dt, it.obj.localToWorld(it.lip.clone()));
    this.hooks.onHeld?.(it, this.over, dt);
  }

  hints(): string[] {
    const it = this.held;
    if (!it) return [];
    return [
      'Move to carry',
      'Scroll lift / lower',
      'Click: put it where you aim',
      ...(it.lip ? ['Hold R pour'] : []),
      ...(it.useLabel ? [`E ${it.useLabel}`] : []),
      'Q put back',
    ];
  }
}
