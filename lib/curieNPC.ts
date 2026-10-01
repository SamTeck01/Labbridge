import * as THREE from 'three';
import { loadLabModel } from '@/lib/assetLoader';
import { tagInteractive } from '@/lib/lab3dEquipment';
import type { Station } from '@/lib/labStore';

/**
 * Dr. Curie, the lab manager NPC.
 * Uses /public/models/dr-curie.glb (rigged, with "Idle" and "Walk" clips) when present,
 * otherwise a stylised procedural placeholder with the same behaviour.
 */

const HOME = new THREE.Vector3(1.8, 0, 9.2);
// Standing spots across the bench from the student, so she demonstrates face-to-face and stays in view.
const STATION_SPOTS: Record<Station, THREE.Vector3> = {
  biology: new THREE.Vector3(-4.0, 0, -4.75),
  chemistry: new THREE.Vector3(5.0, 0, -4.75),
  physics: new THREE.Vector3(-4.0, 0, 2.25),
  research: new THREE.Vector3(5.0, 0, 2.25),
  // Beside the student at the fume hood (the hood is against the back wall)
  hood: new THREE.Vector3(1.0, 0, -10.05),
  // Side benches: across the bench from the student
  pendulum: new THREE.Vector3(8.3, 0, -1.25),
  rates: new THREE.Vector3(10.1, 0, -1.25),
  osmosis: new THREE.Vector3(-10.1, 0, -1.25),
  chroma: new THREE.Vector3(-8.3, 0, -1.25),
};
const BENCH_CENTRES: Record<Station, THREE.Vector3> = {
  biology: new THREE.Vector3(-4.5, 0, -3.5),
  chemistry: new THREE.Vector3(4.5, 0, -3.5),
  physics: new THREE.Vector3(-4.5, 0, 3.5),
  research: new THREE.Vector3(4.5, 0, 3.5),
  hood: new THREE.Vector3(0, 0, -11.3),
  pendulum: new THREE.Vector3(8.3, 0, 0.45),
  rates: new THREE.Vector3(10.1, 0, 0.45),
  osmosis: new THREE.Vector3(-10.1, 0, 0.45),
  chroma: new THREE.Vector3(-8.3, 0, 0.45),
};
const AISLE_X = 1.5; // benches occupy |x| >= 2.7, so |x| <= 1.5 is always clear

/** True if the straight walk from a to b stays clear of every bench (with 0.3 m clearance). */
function clearLine(a: THREE.Vector3, b: THREE.Vector3) {
  const steps = Math.ceil(a.distanceTo(b) / 0.1);
  for (let i = 0; i <= steps; i++) {
    const p = new THREE.Vector3().lerpVectors(a, b, i / steps);
    for (const c of Object.values(BENCH_CENTRES)) {
      if (Math.abs(p.x - c.x) < 2.1 && Math.abs(p.z - c.z) < 1.2) return false;
    }
  }
  return true;
}

/** Walk straight when possible, otherwise route through the central aisle so Curie never walks through a bench. */
function planPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  if (clearLine(from, to)) return [to.clone()];
  const clampX = (x: number) => THREE.MathUtils.clamp(x, -AISLE_X, AISLE_X);
  return [
    new THREE.Vector3(clampX(from.x), 0, from.z),
    new THREE.Vector3(clampX(to.x), 0, to.z),
    to.clone(),
  ];
}
const WALK_SPEED = 1.3;

export interface CurieNPC {
  root: THREE.Group;
  /** Returns true while Curie is standing at her target. */
  update(delta: number, playerPos: THREE.Vector3, target: Station | null, operating: boolean): boolean;
}

/**
 * Clicks on Curie hit an invisible capsule, not her skinned mesh: raycasting a skinned mesh
 * deforms every vertex on the CPU, which was the single biggest per-frame cost on phones.
 */
function addHitbox(root: THREE.Object3D) {
  const hitbox = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.1, 4, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hitbox.position.y = 0.85;
  hitbox.name = 'curie_hitbox';
  tagInteractive(hitbox, 'npc_curie', 'Dr. Curie — Lab Manager', 'Talk to Dr. Curie', 'research', 'primary');
  root.add(hitbox);
  root.traverse((o) => {
    if (o !== hitbox && (o as THREE.Mesh).isMesh) o.raycast = () => {};
  });
}

function buildPlaceholder() {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: '#f5f5f4', roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: '#e0b394', roughness: 0.6 });
  const hair = new THREE.MeshStandardMaterial({ color: '#3f3f46', roughness: 0.9 });
  const trousers = new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.8 });

  const legs: THREE.Mesh[] = [];
  [-0.09, 0.09].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.7, 4, 12), trousers);
    leg.geometry.translate(0, -0.41, 0);
    leg.position.set(x, 0.88, 0);
    g.add(leg);
    legs.push(leg);
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.62, 6, 20), coat);
  body.position.y = 1.18;
  body.scale.set(1, 1, 0.72);
  g.add(body);

  const arms: THREE.Mesh[] = [];
  [-0.25, 0.25].forEach((x) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.55, 4, 12), coat);
    arm.geometry.translate(0, -0.3, 0);
    arm.position.set(x, 1.48, 0);
    g.add(arm);
    arms.push(arm);
  });

  const head = new THREE.Group();
  head.position.y = 1.62;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 18), skin);
  face.scale.set(0.9, 1.08, 0.95);
  head.add(face);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.117, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairCap.rotation.x = -0.35;
  head.add(hairCap);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), hair);
  bun.position.set(0, 0.06, -0.1);
  head.add(bun);
  const glassMat = new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.6, roughness: 0.3 });
  [-0.04, 0.04].forEach((x) => {
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.004, 8, 20), glassMat);
    lens.position.set(x, 0.01, 0.1);
    head.add(lens);
  });
  g.add(head);

  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group: g, head, arms, legs };
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qw = new THREE.Quaternion();
const _qp = new THREE.Quaternion();

/** Rotate the upper arm so the arm points at `target` (world), blended by `amount` on top of the animation. */
function applyReach(arm: THREE.Bone, fore: THREE.Bone, target: THREE.Vector3, amount: number) {
  arm.updateWorldMatrix(true, true);
  const shoulder = arm.getWorldPosition(_a);
  const elbow = fore.getWorldPosition(_b);
  const current = _c.subVectors(elbow, shoulder).normalize();
  const desired = target.clone().sub(shoulder).normalize();
  const delta = _q.setFromUnitVectors(current, desired);
  delta.slerp(new THREE.Quaternion(), 1 - amount);
  // Apply the world-space rotation in the bone's local frame
  arm.getWorldQuaternion(_qw);
  arm.parent!.getWorldQuaternion(_qp);
  arm.quaternion.copy(_qp.invert().multiply(delta.multiply(_qw)));
  // Slightly bend the elbow toward the work
  fore.rotateX(-0.35 * amount);
}

export async function createCurieNPC(): Promise<CurieNPC> {
  const root = new THREE.Group();
  root.name = 'drCurie';
  root.position.copy(HOME);

  const real = await loadLabModel('dr-curie', { targetHeight: 1.7, centerOrigin: true });
  let mixer: THREE.AnimationMixer | null = null;
  let idle: THREE.AnimationAction | null = null;
  let walk: THREE.AnimationAction | null = null;
  let head: THREE.Object3D | null = null;
  let armBone: THREE.Bone | null = null;
  let foreBone: THREE.Bone | null = null;
  let parts: ReturnType<typeof buildPlaceholder> | null = null;

  if (real) {
    root.add(real.root);
    // Mixamo materials import glossy; fabric and skin should be matte.
    real.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        if (std.isMeshStandardMaterial) {
          std.metalness = 0;
          std.roughness = /hair/i.test(std.name) ? 0.6 : 0.85;
        }
      });
      mesh.frustumCulled = false; // skinned bounds don't follow the animation
    });
    mixer = new THREE.AnimationMixer(real.root.children[0]);
    const clip = (n: string) => real.gltf.animations.find((a) => a.name.toLowerCase().includes(n));
    const idleClip = clip('idle');
    const walkClip = clip('walk');
    if (idleClip) (idle = mixer.clipAction(idleClip)).play();
    if (walkClip) (walk = mixer.clipAction(walkClip)).play().setEffectiveWeight(0);
    real.root.traverse((o) => {
      if (!head && /head/i.test(o.name) && (o as THREE.Bone).isBone) head = o;
      if (/RightArm$/.test(o.name)) armBone = o as THREE.Bone;
      if (/RightForeArm$/.test(o.name)) foreBone = o as THREE.Bone;
    });
  } else {
    parts = buildPlaceholder();
    root.add(parts.group);
    head = parts.head;
  }
  addHitbox(root);

  let t = 0;
  let walkBlend = 0;
  let reach = 0;
  let path: THREE.Vector3[] = [];
  let pathTarget: Station | null | undefined = undefined;
  let walkingFor = 0;
  const toTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  const turnTowards = (x: number, z: number, rate: number, delta: number) => {
    const yaw = Math.atan2(x - root.position.x, z - root.position.z);
    const d = Math.atan2(Math.sin(yaw - root.rotation.y), Math.cos(yaw - root.rotation.y));
    root.rotation.y += d * Math.min(1, rate * delta);
  };

  return {
    root,
    update(delta, playerPos, target, operating) {
      t += delta;
      if (target !== pathTarget) {
        pathTarget = target;
        path = planPath(root.position, target ? STATION_SPOTS[target] : HOME);
      }
      // Drop waypoints already reached.
      while (path.length > 1 && root.position.distanceTo(path[0]) < 0.1) path.shift();
      // Safety net: never walk forever (a blocked path would keep the scene rendering at full rate)
      walkingFor = path.length && root.position.distanceTo(path[path.length - 1]) > 0.08 ? walkingFor + delta : 0;
      if (walkingFor > 25 && path.length) {
        root.position.copy(path[path.length - 1]);
        path = [path[path.length - 1]];
        walkingFor = 0;
      }
      const goal = path[0] ?? root.position;
      toTarget.subVectors(goal, root.position).setY(0);
      const dist = toTarget.length();
      const walking = dist > 0.08;
      const arrived = !walking && path.length <= 1;

      if (walking) {
        const step = Math.min(dist, WALK_SPEED * delta);
        root.position.addScaledVector(toTarget.normalize(), step);
        turnTowards(goal.x, goal.z, 8, delta);
      } else if (operating && target) {
        // Face the apparatus while working on it.
        turnTowards(BENCH_CENTRES[target].x, BENCH_CENTRES[target].z, 5, delta);
      } else {
        turnTowards(playerPos.x, playerPos.z, 3, delta);
      }
      reach = THREE.MathUtils.damp(reach, operating && arrived ? 1 : 0, 5, delta);

      walkBlend = THREE.MathUtils.damp(walkBlend, walking ? 1 : 0, 6, delta);

      if (mixer) {
        idle?.setEffectiveWeight(1 - walkBlend);
        walk?.setEffectiveWeight(walkBlend);
        mixer.update(delta);
        // Reach for the apparatus: swing the right arm (real skeleton) to point at the bench
        if (reach > 0.01 && armBone && foreBone && target) {
          applyReach(armBone, foreBone, BENCH_CENTRES[target].clone().setY(1.0), reach);
        }
      } else if (parts) {
        const swing = Math.sin(t * 7) * 0.5 * walkBlend;
        parts.legs[0].rotation.x = swing;
        parts.legs[1].rotation.x = -swing;
        // Walking arm swing, blended into a forward reach when operating equipment
        const work = Math.sin(t * 5) * 0.08 * reach;
        parts.arms[0].rotation.x = -swing * 0.8 - reach * 1.1 + work;
        parts.arms[1].rotation.x = swing * 0.8 - reach * 1.1 - work;
        parts.group.position.y = Math.abs(Math.sin(t * 7)) * 0.03 * walkBlend + Math.sin(t * 1.6) * 0.004;
      }

      // Head tracks the student when close.
      if (head && !walking && !operating && root.position.distanceTo(playerPos) < 6) {
        lookTarget.copy(playerPos);
        const local = root.worldToLocal(lookTarget.clone());
        const headYaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.8, 0.8);
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, headYaw, 5, delta);
      } else if (head) {
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, 0, 5, delta);
      }
      return arrived;
    },
  };
}
