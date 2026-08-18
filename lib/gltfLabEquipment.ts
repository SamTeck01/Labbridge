import * as THREE from 'three';
import {
  tagInteractive,
  createRealisticMicroscope,
  createRealisticTitrationRig,
  createRealisticPhysicsBench,
  createRealisticAnalyticalBench,
} from './lab3dEquipment';

/**
 * 3D Laboratory Equipment Suite & Procedural Assembly
 * Standardizes real-world metric sizing (meters) for laboratory equipment.
 * Provides guaranteed 0-latency, memory-safe, PBR-rendered laboratory equipment.
 */

// Safe fallback loader for optional custom user models
export function getGLTFLoader(): null {
  return null;
}

export async function loadGLBModel(_url: string): Promise<THREE.Group> {
  return new THREE.Group();
}

/**
 * Strict physical metric auto-fitter for 3D equipment
 * Normalizes raw vertex bounds to exact real-world laboratory sizes (meters)
 */
export function fitModelToDimensions(
  model: THREE.Object3D,
  options: {
    targetHeight?: number;
    targetWidth?: number;
    targetDepth?: number;
    targetMaxDim?: number;
    alignBottom?: boolean;
    centerOrigin?: boolean;
  }
): { scale: number; size: THREE.Vector3 } {
  model.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(model);
  const rawSize = new THREE.Vector3();
  bbox.getSize(rawSize);

  let scale = 1;
  if (options.targetHeight && rawSize.y > 0.0001) {
    scale = options.targetHeight / rawSize.y;
  } else if (options.targetWidth && rawSize.x > 0.0001) {
    scale = options.targetWidth / rawSize.x;
  } else if (options.targetDepth && rawSize.z > 0.0001) {
    scale = options.targetDepth / rawSize.z;
  } else if (options.targetMaxDim) {
    const maxAxis = Math.max(rawSize.x, rawSize.y, rawSize.z);
    if (maxAxis > 0.0001) {
      scale = options.targetMaxDim / maxAxis;
    }
  }

  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  // Recalculate fitted bounding box to align
  const updatedBbox = new THREE.Box3().setFromObject(model);
  const finalSize = new THREE.Vector3();
  updatedBbox.getSize(finalSize);
  const center = new THREE.Vector3();
  updatedBbox.getCenter(center);

  if (options.centerOrigin) {
    model.position.x -= center.x;
    model.position.z -= center.z;
  }
  if (options.alignBottom !== false) {
    model.position.y -= updatedBbox.min.y;
  }

  return { scale, size: finalSize };
}

/**
 * 1. Biology 3D Compound Microscope Suite
 * Real-world physical dimensions: Height 0.38m (38cm), Base 20cm x 22cm
 */
export async function createReadyMadeMicroscope(
  station: 'biology' | 'chemistry' | 'physics' | 'research' = 'biology'
): Promise<THREE.Group> {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'readyMadeMicroscopeRoot';

  // 1. Core Ultra-Realistic Compound Microscope
  const microscope = createRealisticMicroscope(station === 'biology' ? 'biology' : 'biology');
  rootGroup.add(microscope);

  // 2. Slide Preparation Box on the left benchtop (13cm x 13cm x 4.5cm)
  const slideBox = new THREE.Group();
  slideBox.position.set(-0.45, 0, 0.12);
  const boxBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.035, 0.13),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 })
  );
  boxBase.position.y = 0.0175;
  slideBox.add(boxBase);

  const boxLid = new THREE.Mesh(
    new THREE.BoxGeometry(0.134, 0.015, 0.134),
    new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.3, transparent: true, opacity: 0.85 })
  );
  boxLid.position.y = 0.04;
  tagInteractive(boxLid, 'micro_slide', 'Prepared Glass Slide Collection Box', 'Click to Select Specimen Slide', station, 'primary');
  slideBox.add(boxLid);
  rootGroup.add(slideBox);

  // 3. Immersion Oil Dropper Bottle on the right benchtop (12cm tall)
  const oilDropper = new THREE.Group();
  oilDropper.position.set(0.42, 0, 0.12);
  const bottleBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.024, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.3 })
  );
  bottleBody.position.y = 0.04;
  oilDropper.add(bottleBody);

  const dropperCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.035, 16),
    new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.8 })
  );
  dropperCap.position.y = 0.095;
  tagInteractive(dropperCap, 'micro_light_switch', 'Immersion Oil Dropper Pipette', 'Add Cedarwood Oil / Clean Lens', station, 'primary');
  oilDropper.add(dropperCap);
  rootGroup.add(oilDropper);

  // Extract internal references from microscope userData
  const uData = microscope.userData || {};

  rootGroup.userData = {
    type: 'microscope',
    isGLB: false,
    stageAssembly: uData.stageAssembly,
    turret: uData.turret || uData.turretGroup,
    turretGroup: uData.turretGroup || uData.turret,
    coarseKnobL: uData.coarseKnobL,
    fineKnobL: uData.fineKnobL,
    specimenDot: uData.specimenDot,
    glassSlide: uData.glassSlide,
    stageLight: uData.stageLight,
  };

  return rootGroup;
}

/**
 * 2. Chemistry Titration Suite & Glassware Station
 * Real-world physical dimensions: Stand height 0.55m, burette 0.45m, 250mL flask
 */
export async function createReadyMadeChemistryStation(
  station: 'biology' | 'chemistry' | 'physics' | 'research' = 'chemistry'
): Promise<THREE.Group> {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'readyMadeChemistryRoot';

  // 1. Core Titration Rig with Burette, Magnetic Stirrer, Flask & pH meter
  const chemRig = createRealisticTitrationRig(station === 'chemistry' ? 'chemistry' : 'chemistry');
  rootGroup.add(chemRig);

  // 2. 250mL Borosilicate Beaker on the left (9.5cm tall x 7cm diameter)
  const beaker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.095, 16),
    new THREE.MeshStandardMaterial({ color: '#f0fdf4', transparent: true, opacity: 0.6, roughness: 0.05 })
  );
  beaker.position.set(-0.45, 0.0475, 0.14);
  tagInteractive(beaker, 'chem_beaker', '250ml Borosilicate Beaker', 'Stock Standard Titrant Solution (0.1M NaOH)', station, 'primary');
  rootGroup.add(beaker);

  // 3. Class-A Volumetric Flask (18cm tall)
  const volFlask = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.16, 16),
    new THREE.MeshStandardMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.6, roughness: 0.05 })
  );
  volFlask.position.set(-0.48, 0.08, -0.16);
  tagInteractive(volFlask, 'chem_volumetric', 'Class-A Volumetric Flask (100mL)', 'Standard Solution Reserve', station, 'primary');
  rootGroup.add(volFlask);

  // 4. Test Tube Rack on the right (22cm wide x 12cm tall)
  const tubeRack = new THREE.Group();
  tubeRack.position.set(0.48, 0, -0.16);
  const rackStand = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.09, 0.06),
    new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4 })
  );
  rackStand.position.y = 0.045;
  tubeRack.add(rackStand);

  for (let i = -2; i <= 2; i++) {
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.10, 12),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', transparent: true, opacity: 0.7, roughness: 0.05 })
    );
    tube.position.set(i * 0.035, 0.055, 0);
    tubeRack.add(tube);
  }
  tagInteractive(rackStand, 'chem_test_tubes', 'Test Tube Rack & Aliquots', 'Select Sample Aliquots', station, 'primary');
  rootGroup.add(tubeRack);

  // Extract internal references from titration rig userData
  const uData = chemRig.userData || {};

  rootGroup.userData = {
    type: 'titration',
    isGLB: false,
    stopcock: uData.stopcock,
    stirrerKnob: uData.stirrerKnob,
    flaskLiquid: uData.flaskLiquid,
    stirBar: uData.stirBar,
    phMeter: uData.phMeter,
  };

  return rootGroup;
}

/**
 * 3. Physics Circuit & Electronics Bench
 * Real-world physical dimensions: Breadboard 45cm x 32cm, Knife switch 14cm
 */
export async function createReadyMadePhysicsBench(
  station: 'biology' | 'chemistry' | 'physics' | 'research' = 'physics'
): Promise<THREE.Group> {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'readyMadePhysicsRoot';

  // Core Physics Apparatus Rig
  const physBench = createRealisticPhysicsBench(station === 'physics' ? 'physics' : 'physics');
  rootGroup.add(physBench);

  // Extract internal references
  const uData = physBench.userData || {};

  rootGroup.userData = {
    type: 'physics',
    isGLB: false,
    blade: uData.blade,
    potKnob: uData.potKnob,
    needle: uData.needle,
    bulbGlass: uData.bulbGlass,
    bulbLight: uData.bulbLight,
    dmm: uData.dmm,
  };

  return rootGroup;
}

/**
 * 4. Analytical & Research Suite
 * Real-world physical dimensions: Balance 28cm x 26cm, Centrifuge 24cm diameter
 */
export async function createReadyMadeAnalyticalBench(
  station: 'biology' | 'chemistry' | 'physics' | 'research' = 'research'
): Promise<THREE.Group> {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'readyMadeAnalyticalRoot';

  // Core Analytical & Centrifuge Bench Apparatus
  const analyticalBench = createRealisticAnalyticalBench(station === 'research' ? 'research' : 'research');
  rootGroup.add(analyticalBench);

  // Variable Volume Micropipette on Stand (24cm length)
  const pipetteGroup = new THREE.Group();
  pipetteGroup.position.set(0.04, 0, -0.16);

  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.045, 0.02, 16),
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 })
  );
  stand.position.y = 0.01;
  pipetteGroup.add(stand);

  const pipetteBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.006, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2 })
  );
  pipetteBody.position.y = 0.12;
  pipetteGroup.add(pipetteBody);

  const plunger = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.025, 16),
    new THREE.MeshStandardMaterial({ color: '#0284c7' })
  );
  plunger.position.y = 0.23;
  tagInteractive(plunger, 'res_tare_btn', 'P1000 Variable Micropipette', 'Calibrate Microliter Aspiration Volume (100 - 1000µL)', station, 'primary');
  pipetteGroup.add(plunger);
  rootGroup.add(pipetteGroup);

  // Cryogenic / Sample Grid Box (13.3cm x 13.3cm x 5.2cm)
  const cryoBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.045, 0.12),
    new THREE.MeshStandardMaterial({ color: '#0284c7', transparent: true, opacity: 0.85, roughness: 0.3 })
  );
  cryoBox.position.set(-0.06, 0.0225, 0.16);
  tagInteractive(cryoBox, 'res_tare_btn', 'Cryo Tube Sample Grid Storage Box', 'Inspect Aliquot Samples', station, 'primary');
  rootGroup.add(cryoBox);

  // Extract internal references
  const uData = analyticalBench.userData || {};

  rootGroup.userData = {
    type: 'analytical',
    isGLB: false,
    draftShield: uData.draftShield || uData.draftChamber,
    rotor: uData.rotor || uData.centrifugeBody,
    tareBtn: uData.tareBtn,
    pan: uData.pan,
  };

  return rootGroup;
}
