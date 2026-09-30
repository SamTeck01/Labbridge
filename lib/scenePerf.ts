import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Performance helpers. The lab is authored as hundreds of small meshes (cabinet doors, handles,
 * graduation marks...). Drawn one by one that is ~900 draw calls per frame, far too many for phones.
 */

/** True if this object, or any ancestor, moves or can be clicked (so it must stay separate). */
function isDynamic(o: THREE.Object3D): boolean {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) {
    // placeholder: procedural stand-ins that a real model will replace; never bake them in
    if (n.userData?.isInteractive || n.userData?.keepSeparate || n.userData?.placeholder) return true;
  }
  return false;
}

function materialKey(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial;
  return [
    m.type,
    s.color?.getHexString(),
    s.emissive?.getHexString(),
    s.roughness?.toFixed(2),
    s.metalness?.toFixed(2),
    m.transparent ? m.opacity.toFixed(2) : 1,
    s.map?.uuid ?? '',
    s.emissiveMap?.uuid ?? '',
  ].join('|');
}

/**
 * Bakes every static mesh under `root` into one mesh per material (world space).
 * Interactive/animated parts are left untouched. Typically cuts draw calls by 5-10x.
 */
export function mergeStaticMeshes(scene: THREE.Scene, root: THREE.Object3D = scene): THREE.Group {
  scene.updateMatrixWorld(true);
  const buckets = new Map<string, { material: THREE.Material; geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[]; castShadow: boolean }>();

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as unknown as THREE.SkinnedMesh).isSkinnedMesh || Array.isArray(mesh.material)) return;
    if (!mesh.visible || isDynamic(mesh) || mesh.userData.merged) return;
    const src = mesh.geometry;
    if (!src.attributes.position || !src.attributes.normal) return;

    // Normalise attributes so geometries from different sources can be merged. Compressed models store
    // quantised integer attributes; getX/getY/... de-quantise them into plain floats.
    const flat = src.index ? src.toNonIndexed() : src;
    const g = new THREE.BufferGeometry();
    for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]] as const) {
      const attr = flat.getAttribute(name) as THREE.BufferAttribute | undefined;
      const count = flat.getAttribute('position').count;
      const out = new Float32Array(count * size);
      if (attr) {
        for (let i = 0; i < count; i++) {
          out[i * size] = attr.getX(i);
          out[i * size + 1] = attr.getY(i);
          if (size === 3) out[i * size + 2] = attr.getZ(i);
        }
      }
      g.setAttribute(name, new THREE.BufferAttribute(out, size));
    }
    if (flat !== src) flat.dispose();
    g.morphAttributes = {};
    g.applyMatrix4(mesh.matrixWorld);

    const key = `${materialKey(mesh.material)}|${mesh.castShadow}`;
    const bucket = buckets.get(key) ?? { material: mesh.material, geos: [], meshes: [], castShadow: mesh.castShadow };
    bucket.geos.push(g);
    bucket.meshes.push(mesh);
    buckets.set(key, bucket);
  });

  const group = new THREE.Group();
  group.name = 'mergedStatic';
  for (const { material, geos, meshes, castShadow } of buckets.values()) {
    const merged = geos.length > 1 ? mergeGeometries(geos, false) : null;
    geos.forEach((g) => g.dispose());
    if (!merged) continue; // single mesh or failed merge: leave the originals in place
    const m = new THREE.Mesh(merged, material);
    m.castShadow = castShadow;
    m.receiveShadow = true;
    m.userData.merged = true;
    m.matrixAutoUpdate = false;
    group.add(m);
    meshes.forEach((orig) => orig.removeFromParent());
  }
  scene.add(group);
  return group;
}

/**
 * Real refraction ("transmission") renders the scene a second time. Swap it for a cheap transparent
 * look: still reflects the environment, costs almost nothing.
 */
export function cheapGlass(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mat) => {
      const m = mat as THREE.MeshPhysicalMaterial;
      if (!m.isMeshPhysicalMaterial || !(m.transmission > 0)) return;
      const strength = m.transmission;
      m.transmission = 0;
      m.transparent = true;
      // Faint blue-grey tint + stronger reflections so glass reads against white walls
      m.opacity = Math.max(0.3, 0.6 - strength * 0.3);
      m.color.lerp(new THREE.Color('#9fc1dd'), 0.45);
      m.depthWrite = false;
      m.roughness = Math.min(m.roughness, 0.08);
      m.envMapIntensity = 1.8;
      m.needsUpdate = true;
    });
  });
}

/** Keeps frame time near target by nudging the render resolution up or down. */
export class AdaptiveResolution {
  private samples: number[] = [];
  private ratio: number;
  constructor(private renderer: THREE.WebGLRenderer, private max: number, private min = 0.7) {
    this.ratio = max;
  }
  frame(deltaMs: number, onResize: () => void) {
    this.samples.push(deltaMs);
    if (this.samples.length < 90) return;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.samples = [];
    let next = this.ratio;
    if (avg > 22) next = Math.max(this.min, this.ratio - 0.15); // below ~45 fps: drop resolution
    else if (avg < 14) next = Math.min(this.max, this.ratio + 0.1); // headroom: sharpen back up
    if (next !== this.ratio) {
      this.ratio = next;
      this.renderer.setPixelRatio(next);
      onResize();
    }
  }
}
