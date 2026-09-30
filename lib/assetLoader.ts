import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { fitModelToDimensions } from '@/lib/gltfLabEquipment';
import { cheapGlass } from '@/lib/scenePerf';
import { tagInteractive } from '@/lib/lab3dEquipment';

/**
 * Real-asset pipeline.
 *
 * Drop a .glb into /public/models/<name>.glb and add <name> to
 * /public/models/manifest.json; it then replaces the procedural placeholder. Missing files fall back to the procedural build,
 * so the lab always renders.
 *
 * Interactive parts are found by NODE NAME inside the .glb (set them in Blender):
 *   micro_turret, micro_eyepieces, micro_coarse_focus, micro_fine_focus, micro_slide, micro_light_switch
 *   chem_stopcock, chem_stirrer_knob, chem_flask, chem_indicator
 *   phys_knife_switch, phys_potentiometer, phys_bulb
 *   res_balance_door, res_tare_btn, res_centrifuge_start
 * See docs/ASSET_SPEC.md for the full list and sizes.
 */

let loader: GLTFLoader | null = null;
function getLoader() {
  if (!loader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

const cache = new Map<string, Promise<GLTF | null>>();
let manifest: Promise<Set<string>> | null = null;

/** public/models/manifest.json lists which .glb files exist, so missing ones cost no requests. */
function getManifest() {
  if (!manifest) {
    manifest = fetch('/models/manifest.json')
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((m: { models?: string[] }) => new Set(m.models || []))
      .catch(() => new Set<string>());
  }
  return manifest;
}

/** Loads /models/<name>.glb if listed in the manifest; resolves to null otherwise or on error. */
export function loadGLTF(name: string): Promise<GLTF | null> {
  if (!cache.has(name)) {
    cache.set(
      name,
      getManifest().then((m) =>
        m.has(name)
          ? getLoader()
              .loadAsync(`/models/${name}.glb`)
              .catch((err) => {
                console.error(`Failed to load /models/${name}.glb`, err);
                return null;
              })
          : null
      )
    );
  }
  return cache.get(name)!;
}

interface InteractiveSpec {
  label: string;
  action: string;
  category: 'primary' | 'knob' | 'switch' | 'eyepiece' | 'stool';
  /** Key under which the node is exposed on root.userData for animation. */
  ref?: string;
}

export const INTERACTIVE_NODES: Record<string, InteractiveSpec> = {
  micro_eyepieces: { label: 'Binocular Eyepieces', action: 'Look through eyepieces', category: 'eyepiece' },
  micro_turret: { label: 'Objective Turret', action: 'Rotate objective', category: 'knob', ref: 'turret' },
  micro_coarse_focus: { label: 'Coarse Focus Knob', action: 'Adjust coarse focus', category: 'knob', ref: 'coarseKnobL' },
  micro_fine_focus: { label: 'Fine Focus Knob', action: 'Adjust fine focus', category: 'knob', ref: 'fineKnobL' },
  micro_slide: { label: 'Slide Box', action: 'Change specimen slide', category: 'primary' },
  micro_light_switch: { label: 'Illuminator', action: 'Toggle lamp', category: 'switch' },
  micro_stage: { label: 'Mechanical Stage', action: 'Stage', category: 'primary', ref: 'stageAssembly' },
  chem_stopcock: { label: 'Burette Stopcock', action: 'Open / close burette', category: 'knob', ref: 'stopcock' },
  chem_stirrer_knob: { label: 'Magnetic Stirrer', action: 'Change stirrer speed', category: 'knob' },
  chem_stir_bar: { label: 'Stir Bar', action: 'Stir bar', category: 'primary', ref: 'stirBar' },
  chem_flask: { label: 'Conical Flask (25 mL 0.1M HCl)', action: 'Add indicator', category: 'primary' },
  chem_flask_liquid: { label: 'Flask Solution', action: 'Add indicator', category: 'primary', ref: 'flaskLiquid' },
  chem_indicator: { label: 'Phenolphthalein Bottle', action: 'Add indicator', category: 'primary' },
  phys_knife_switch: { label: 'Knife Switch', action: 'Open / close circuit', category: 'switch', ref: 'blade' },
  phys_potentiometer: { label: 'Rheostat', action: 'Change resistance', category: 'knob', ref: 'potKnob' },
  phys_bulb: { label: 'Filament Bulb', action: 'Bulb', category: 'primary', ref: 'bulbGlass' },
  phys_ammeter_needle: { label: 'Ammeter', action: 'Reads circuit current', category: 'primary', ref: 'ammeterNeedle' },
  res_balance_door: { label: 'Analytical Balance Door', action: 'Open / close draft shield', category: 'primary', ref: 'balanceDoor' },
  res_balance_display: { label: 'Balance Readout', action: 'Mass reading', category: 'primary', ref: 'balanceDisplay' },
  res_centrifuge_lid: { label: 'Centrifuge Lid', action: 'Start / stop centrifuge', category: 'primary', ref: 'centrifugeLid' },
  res_centrifuge_rotor: { label: 'Centrifuge Rotor', action: 'Start / stop centrifuge', category: 'primary', ref: 'rotor' },
  res_weigh_boat: { label: 'Weighing Boat', action: 'Add sample to weigh', category: 'primary' },
  res_tare_btn: { label: 'Tare Button', action: 'Tare balance', category: 'switch' },
  res_centrifuge_start: { label: 'Centrifuge', action: 'Start / stop centrifuge', category: 'switch' },
};

/** Tags named nodes as interactive and exposes animated parts on root.userData. */
export function wireInteractiveNodes(root: THREE.Object3D, station: 'biology' | 'chemistry' | 'physics' | 'research') {
  const refs: Record<string, THREE.Object3D> = {};
  root.traverse((node) => {
    const spec = INTERACTIVE_NODES[node.name];
    if (!spec) return;
    if (spec.ref) refs[spec.ref] = node;
    // Tag the node and every mesh below it so raycasts hit.
    node.traverse((m) => tagInteractive(m, node.name, spec.label, spec.action, station, spec.category));
    if (spec.ref === 'bulbGlass' || spec.ref === 'flaskLiquid' || spec.ref === 'balanceDisplay') {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) mesh.material = (mesh.material as THREE.Material).clone();
    }
  });
  if (refs.bulbGlass) {
    const light = new THREE.PointLight('#ffd27a', 0, 2);
    refs.bulbGlass.add(light);
    refs.bulbLight = light;
  }
  root.userData = { ...root.userData, ...refs, isGLB: true };
}

/** Load /models/<name>.glb, fit it to real-world size, enable shadows. Null if missing. */
export async function loadLabModel(
  name: string,
  fit: Parameters<typeof fitModelToDimensions>[1] | null,
  station?: 'biology' | 'chemistry' | 'physics' | 'research'
): Promise<{ root: THREE.Group; gltf: GLTF } | null> {
  const gltf = await loadGLTF(name);
  if (!gltf) return null;
  const root = new THREE.Group();
  // SkeletonUtils.clone keeps skinned meshes bound to their (cloned) bones
  const model = cloneSkinned(gltf.scene);
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  cheapGlass(model);
  if (fit) fitModelToDimensions(model, fit);
  root.add(model);
  if (station) wireInteractiveNodes(root, station);
  return { root, gltf };
}

/** Frees GPU memory for everything under an object. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    mats.forEach((mat) => {
      Object.values(mat).forEach((v) => {
        if (v instanceof THREE.Texture) v.dispose();
      });
      mat.dispose();
    });
  });
}

/**
 * Replaces a procedural group's contents with /models/<name>.glb (unfitted, authored at real size).
 * The group keeps its transform, so placement code stays the same. Resolves true if swapped.
 */
export async function swapInModel(group: THREE.Group, name: string, onLoaded?: (model: THREE.Object3D) => void) {
  group.userData.placeholder = true;
  const loaded = await loadLabModel(name, null);
  if (!loaded || !group.parent) return false;
  [...group.children].forEach((c) => {
    group.remove(c);
    disposeObject(c);
  });
  group.add(loaded.root);
  group.userData.placeholder = false;
  onLoaded?.(loaded.root);
  return true;
}
