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
// Standing spots beside each bench, on the central aisle side (x = ±2.2 keeps paths clear of benches).
const STATION_SPOTS: Record<Station, THREE.Vector3> = {
  biology: new THREE.Vector3(-2.2, 0, -2.4),
  chemistry: new THREE.Vector3(2.2, 0, -2.4),
  physics: new THREE.Vector3(-2.2, 0, 4.8),
  research: new THREE.Vector3(2.2, 0, 4.8),
};
const WALK_SPEED = 1.3;

export interface CurieNPC {
  root: THREE.Group;
  update(delta: number, playerPos: THREE.Vector3, target: Station | null): void;
}

function tagAll(root: THREE.Object3D) {
  root.traverse((o) => tagInteractive(o, 'npc_curie', 'Dr. Curie — Lab Manager', 'Talk to Dr. Curie', 'research', 'primary'));
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

export async function createCurieNPC(): Promise<CurieNPC> {
  const root = new THREE.Group();
  root.name = 'drCurie';
  root.position.copy(HOME);

  const real = await loadLabModel('dr-curie', { targetHeight: 1.7, centerOrigin: true });
  let mixer: THREE.AnimationMixer | null = null;
  let idle: THREE.AnimationAction | null = null;
  let walk: THREE.AnimationAction | null = null;
  let head: THREE.Object3D | null = null;
  let parts: ReturnType<typeof buildPlaceholder> | null = null;

  if (real) {
    root.add(real.root);
    mixer = new THREE.AnimationMixer(real.root.children[0]);
    const clip = (n: string) => real.gltf.animations.find((a) => a.name.toLowerCase().includes(n));
    const idleClip = clip('idle');
    const walkClip = clip('walk');
    if (idleClip) (idle = mixer.clipAction(idleClip)).play();
    if (walkClip) (walk = mixer.clipAction(walkClip)).play().setEffectiveWeight(0);
    real.root.traverse((o) => {
      if (!head && /head/i.test(o.name) && (o as THREE.Bone).isBone) head = o;
    });
  } else {
    parts = buildPlaceholder();
    root.add(parts.group);
    head = parts.head;
  }
  tagAll(root);

  let t = 0;
  let walkBlend = 0;
  const toTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  return {
    root,
    update(delta, playerPos, target) {
      t += delta;
      const goal = target ? STATION_SPOTS[target] : HOME;
      toTarget.subVectors(goal, root.position).setY(0);
      const dist = toTarget.length();
      const walking = dist > 0.08;

      if (walking) {
        const step = Math.min(dist, WALK_SPEED * delta);
        root.position.addScaledVector(toTarget.normalize(), step);
        const yaw = Math.atan2(toTarget.x, toTarget.z);
        const d = Math.atan2(Math.sin(yaw - root.rotation.y), Math.cos(yaw - root.rotation.y));
        root.rotation.y += d * Math.min(1, 8 * delta);
      } else {
        // Turn to face the student.
        const yaw = Math.atan2(playerPos.x - root.position.x, playerPos.z - root.position.z);
        let diff = yaw - root.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        root.rotation.y += diff * Math.min(1, 3 * delta);
      }

      walkBlend = THREE.MathUtils.damp(walkBlend, walking ? 1 : 0, 6, delta);

      if (mixer) {
        idle?.setEffectiveWeight(1 - walkBlend);
        walk?.setEffectiveWeight(walkBlend);
        mixer.update(delta);
      } else if (parts) {
        const swing = Math.sin(t * 7) * 0.5 * walkBlend;
        parts.legs[0].rotation.x = swing;
        parts.legs[1].rotation.x = -swing;
        parts.arms[0].rotation.x = -swing * 0.8;
        parts.arms[1].rotation.x = swing * 0.8;
        parts.group.position.y = Math.abs(Math.sin(t * 7)) * 0.03 * walkBlend + Math.sin(t * 1.6) * 0.004;
      }

      // Head tracks the student when close.
      if (head && !walking && root.position.distanceTo(playerPos) < 6) {
        lookTarget.copy(playerPos);
        const local = root.worldToLocal(lookTarget.clone());
        const headYaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.8, 0.8);
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, headYaw, 5, delta);
      }
    },
  };
}
