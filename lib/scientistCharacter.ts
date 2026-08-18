import * as THREE from 'three';

/**
 * Procedural 1st-Person Scientist Character Rig
 * Realistic white lab-coat torso, sleeves, sterile nitrile examination gloves,
 * and seamless biomechanical standing/walking/seated posture transitions.
 */
export function createFirstPersonScientistRig(): THREE.Group {
  const rig = new THREE.Group();
  rig.name = 'scientistFirstPersonRig';

  // Lab Coat Fabric Material (Clean medical white with realistic roughness)
  const coatMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.85,
    metalness: 0.05,
  });

  // Clinical Blue Nitrile Examination Glove Material
  const gloveMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    roughness: 0.35,
    metalness: 0.15,
  });

  // 1. Torso & Upper Body (Visible when looking down, anchors human perspective)
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'torsoGroup';

  // Chest / Shoulders
  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.22, 0.45, 16),
    coatMat
  );
  chest.position.set(0, -0.42, 0.04);
  chest.castShadow = true;
  torsoGroup.add(chest);

  // Lab Coat V-Neck Lapel Collar
  const collarL = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.22, 0.02),
    coatMat
  );
  collarL.position.set(-0.08, -0.26, -0.06);
  collarL.rotation.set(0.2, 0.1, -0.2);
  torsoGroup.add(collarL);

  const collarR = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.22, 0.02),
    coatMat
  );
  collarR.position.set(0.08, -0.26, -0.06);
  collarR.rotation.set(0.2, -0.1, 0.2);
  torsoGroup.add(collarR);

  rig.add(torsoGroup);

  // 2. Left Arm Group
  const leftArm = new THREE.Group();
  leftArm.name = 'leftArm';

  const sleeveL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.064, 0.40, 16),
    coatMat
  );
  sleeveL.position.set(-0.24, -0.28, -0.32);
  sleeveL.rotation.set(0.65, 0.30, -0.30);
  sleeveL.castShadow = true;
  leftArm.add(sleeveL);

  const handL = new THREE.Mesh(
    new THREE.BoxGeometry(0.062, 0.034, 0.095),
    gloveMat
  );
  handL.position.set(-0.20, -0.22, -0.52);
  handL.rotation.set(0.30, 0.15, -0.15);
  handL.castShadow = true;
  leftArm.add(handL);

  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.0065, 0.038, 8),
      gloveMat
    );
    finger.position.set(-0.22 + f * 0.012, -0.21, -0.58);
    finger.rotation.set(0.4, 0, 0);
    leftArm.add(finger);
  }

  const thumbL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.008, 0.036, 8),
    gloveMat
  );
  thumbL.position.set(-0.16, -0.21, -0.50);
  thumbL.rotation.set(0.25, 0.6, -0.25);
  leftArm.add(thumbL);

  rig.add(leftArm);

  // 3. Right Arm Group
  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';

  const sleeveR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.064, 0.40, 16),
    coatMat
  );
  sleeveR.position.set(0.24, -0.28, -0.32);
  sleeveR.rotation.set(0.65, -0.30, 0.30);
  sleeveR.castShadow = true;
  rightArm.add(sleeveR);

  const handR = new THREE.Mesh(
    new THREE.BoxGeometry(0.062, 0.034, 0.095),
    gloveMat
  );
  handR.position.set(0.20, -0.22, -0.52);
  handR.rotation.set(0.30, -0.15, 0.15);
  handR.castShadow = true;
  rightArm.add(handR);

  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.0065, 0.038, 8),
      gloveMat
    );
    finger.position.set(0.22 - f * 0.012, -0.21, -0.58);
    finger.rotation.set(0.4, 0, 0);
    rightArm.add(finger);
  }

  const thumbR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.008, 0.036, 8),
    gloveMat
  );
  thumbR.position.set(0.16, -0.21, -0.50);
  thumbR.rotation.set(0.25, -0.6, 0.25);
  rightArm.add(thumbR);

  rig.add(rightArm);

  rig.userData = {
    leftArm,
    rightArm,
    torsoGroup,
    seatedBlend: 0,
  };

  return rig;
}

/**
 * Updates 1st-person scientist body kinematics based on motion and seated state
 */
export function updateScientistRig(
  rig: THREE.Group,
  options: {
    isWalking: boolean;
    isSeated: boolean;
    walkTimer: number;
    delta: number;
    pitch: number;
  }
) {
  const uData = rig.userData;
  if (!uData) return;

  const targetSeatedBlend = options.isSeated ? 1.0 : 0.0;
  uData.seatedBlend = THREE.MathUtils.lerp(
    uData.seatedBlend,
    targetSeatedBlend,
    Math.min(1.0, options.delta * 5.0)
  );

  const blend = uData.seatedBlend;
  const leftArm = uData.leftArm as THREE.Group;
  const rightArm = uData.rightArm as THREE.Group;
  const torso = uData.torsoGroup as THREE.Group;

  // Natural sway during walking
  const swayY = options.isWalking ? Math.sin(options.walkTimer * 8) * 0.018 : Math.sin(options.walkTimer * 1.5) * 0.003;
  const swayX = options.isWalking ? Math.cos(options.walkTimer * 4) * 0.012 : 0;

  if (torso) {
    torso.position.y = -0.42 + swayY * 0.5 - blend * 0.05;
    // Counteract steep pitch so torso does not clip through camera when looking down
    torso.rotation.x = -options.pitch * 0.35;
  }

  // Standing arms (neutral at sides/chest) vs Seated arms (resting on lab workbench)
  if (leftArm && rightArm) {
    // Left Arm interpolation
    const standPosL = new THREE.Vector3(swayX, swayY, 0);
    const seatPosL = new THREE.Vector3(-0.02, -0.10 + Math.sin(options.walkTimer * 1.2) * 0.002, 0.05);
    leftArm.position.lerpVectors(standPosL, seatPosL, blend);

    // Right Arm interpolation
    const standPosR = new THREE.Vector3(-swayX, -swayY * 0.8, 0);
    const seatPosR = new THREE.Vector3(0.02, -0.10 + Math.sin(options.walkTimer * 1.2 + 0.5) * 0.002, 0.05);
    rightArm.position.lerpVectors(standPosR, seatPosR, blend);

    leftArm.rotation.x = THREE.MathUtils.lerp(0, -0.15, blend);
    rightArm.rotation.x = THREE.MathUtils.lerp(0, -0.15, blend);
  }
}
