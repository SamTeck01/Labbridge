import * as THREE from 'three';

/**
 * 3D Laboratory Equipment & Environment Generator
 * Creates articulated, clinical-grade procedural 3D models with interactive mesh tagging,
 * high-detail textures, authentic scientific materials, and bright modern laboratory architecture.
 */

// Helper to tag meshes for Raycasting
export function tagInteractive(
  mesh: THREE.Object3D,
  id: string,
  label: string,
  action: string,
  station: 'biology' | 'chemistry' | 'physics' | 'research',
  category: 'primary' | 'knob' | 'switch' | 'eyepiece' | 'stool'
) {
  mesh.userData = {
    isInteractive: true,
    interactId: id,
    label,
    action,
    station,
    category,
  };
}

/**
 * Procedural Dynamic Canvas Texture for Periodic Table Poster
 */
export function createPeriodicTableTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header banner
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, canvas.width, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PERIODIC TABLE OF THE ELEMENTS', canvas.width / 2, 46);

  // Grid layout mockup with colored category blocks
  const cols = 18;
  const rows = 9;
  const cellW = 46;
  const cellH = 54;
  const startX = 60;
  const startY = 100;

  const categoryColors = ['#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#ddd6fe', '#cbd5e1'];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c > 0 && c < 17) continue;
      if ((r === 1 || r === 2) && c > 1 && c < 12) continue;

      const color = categoryColors[(r + c) % categoryColors.length];
      const x = startX + c * (cellW + 4);
      const y = startY + r * (cellH + 4);

      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellW, cellH);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${(r * 18 + c + 1) % 118 + 1}`, x + cellW / 2, y + 16);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(String.fromCharCode(65 + ((r * 7 + c) % 26)), x + cellW / 2, y + 36);
    }
  }

  // Footer legend
  ctx.fillStyle = '#0f172a';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Standard International Chemical Registry • IUPAC Certified Standards', canvas.width / 2, 650);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural Canvas Texture for Laboratory Safety & Emergency Station Sign
 */
export function createSafetySignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Clean White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  // Green Safety Header Banner
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(16, 16, 480, 100);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EMERGENCY', 256, 60);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('EYE WASH & DELUGE SHOWER', 256, 96);

  // NFPA 704 Hazard Diamond Mockup in Center
  const cx = 256;
  const cy = 290;
  const s = 65;

  // Blue (Health)
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.moveTo(cx - s * 2, cy);
  ctx.lineTo(cx - s, cy - s);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx - s, cy + s);
  ctx.closePath();
  ctx.fill();

  // Red (Flammability)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s);
  ctx.lineTo(cx, cy - s * 2);
  ctx.lineTo(cx + s, cy - s);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  // Yellow (Instability)
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + s, cy - s);
  ctx.lineTo(cx + s * 2, cy);
  ctx.lineTo(cx + s, cy + s);
  ctx.closePath();
  ctx.fill();

  // White (Special)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(cx - s, cy + s);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + s, cy + s);
  ctx.lineTo(cx, cy + s * 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.stroke();

  // Numbers in diamond
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('3', cx - s, cy + 12);
  ctx.fillText('2', cx, cy - s + 12);
  ctx.fillText('1', cx + s, cy + 12);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('W', cx, cy + s + 10);

  // Footer instructions
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('FLUSH EYES FOR 15 MINUTES MINIMUM', 256, 470);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates Ergonomic Laboratory Swivel Stool
 */
export function createLabStool(
  station: 'biology' | 'chemistry' | 'physics' | 'research',
  x: number,
  z: number,
  rotY: number = 0
): THREE.Group {
  const stool = new THREE.Group();

  // 5-Star Chrome Base
  const baseLegs = 5;
  for (let i = 0; i < baseLegs; i++) {
    const angle = (i * Math.PI * 2) / baseLegs;
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.28),
      new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.9, roughness: 0.15 })
    );
    leg.position.set(Math.sin(angle) * 0.14, 0.04, Math.cos(angle) * 0.14);
    leg.rotation.y = angle;
    stool.add(leg);

    // Caster wheel
    const caster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8 })
    );
    caster.position.set(Math.sin(angle) * 0.26, 0.025, Math.cos(angle) * 0.26);
    caster.rotation.z = Math.PI / 2;
    stool.add(caster);
  }

  // Pneumatic Cylinder Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.035, 0.55, 16),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.2 })
  );
  stem.position.y = 0.32;
  stool.add(stem);

  // Chrome Footrest Ring
  const footrest = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.012, 12, 24),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.9, roughness: 0.15 })
  );
  footrest.position.y = 0.22;
  footrest.rotation.x = Math.PI / 2;
  stool.add(footrest);

  // Thick Padded Seat (Antimicrobial vinyl)
  const seatGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.09, 24);
  const seatMat = new THREE.MeshStandardMaterial({
    color: '#0284c7', // Clinical Medical Blue vinyl
    roughness: 0.45,
    metalness: 0.1,
  });
  const seat = new THREE.Mesh(seatGeo, seatMat);
  seat.position.y = 0.62;
  seat.castShadow = true;
  seat.receiveShadow = true;

  // Tag seat for raycasting & sitting
  tagInteractive(seat, `stool_${station}`, `Lab Swivel Stool`, `Sit Down on Chair`, station, 'stool');
  stool.add(seat);

  // Height Adjustment Lever
  const lever = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.8 })
  );
  lever.position.set(0.12, 0.56, 0);
  lever.rotation.z = 0.8;
  stool.add(lever);

  stool.position.set(x, 0, z);
  stool.rotation.y = rotY;
  return stool;
}

/**
 * Creates Ultra-Realistic Compound Microscope in 3D (White & Clinical Silver Enamel)
 * Standard Real-World Height: 0.38m (38cm), Base: 20cm x 22cm
 */
export function createRealisticMicroscope(station: 'biology' = 'biology') {
  const group = new THREE.Group();

  // 1. Heavy Ergonomic Cast Base (Clinical Off-White Powder-Coated Enamel)
  const baseGeo = new THREE.CylinderGeometry(0.10, 0.12, 0.045, 24);
  const whiteEnamelMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.2, roughness: 0.15 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.85, roughness: 0.2 });

  const baseMesh = new THREE.Mesh(baseGeo, whiteEnamelMat);
  baseMesh.position.y = 0.0225;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Illumination Port with Frosted Field Lens
  const lightPort = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.0, roughness: 0.05 })
  );
  lightPort.position.set(0, 0.048, 0.03);
  tagInteractive(lightPort, 'micro_light_port', 'LED Illuminator', 'Adjust Substage Light Dial', station, 'knob');
  group.add(lightPort);

  // Dynamic Substage SpotLight beaming upward through condenser
  const stageLight = new THREE.SpotLight('#ffffff', 3.5, 1.4, Math.PI / 7, 0.3);
  stageLight.position.set(0, 0.05, 0.03);
  stageLight.target.position.set(0, 0.24, 0.03);
  group.add(stageLight);
  group.add(stageLight.target);

  // 2. Curved Arm Stand (Pristine White Enamel)
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.28, 0.075),
    whiteEnamelMat
  );
  arm.position.set(0, 0.17, -0.065);
  arm.castShadow = true;
  group.add(arm);

  // Top Head Cantilever
  const topArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.05, 0.14),
    whiteEnamelMat
  );
  topArm.position.set(0, 0.29, -0.015);
  topArm.castShadow = true;
  group.add(topArm);

  // 3. Substage Abbe Condenser with Iris Diaphragm Lever
  const condenser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16),
    darkMetalMat
  );
  condenser.position.set(0, 0.11, 0.03);
  tagInteractive(condenser, 'micro_condenser', 'Abbe Condenser N.A. 1.25', 'Adjust Iris Diaphragm', station, 'knob');
  group.add(condenser);

  // 4. Mechanical Stage Sub-Group (Moves up/down with focus)
  const stageAssembly = new THREE.Group();
  stageAssembly.position.set(0, 0.15, 0.03);

  // Main Stage Plate (Anodized Ceramic Black Finish, 14cm x 13cm)
  const stagePlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.014, 0.13),
    new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.2 })
  );
  stagePlate.castShadow = true;
  stagePlate.receiveShadow = true;
  stageAssembly.add(stagePlate);

  // Slide Caliper Clips (Stainless Steel)
  const clip = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.006, 0.012),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.95, roughness: 0.1 })
  );
  clip.position.set(-0.04, 0.009, -0.025);
  stageAssembly.add(clip);

  // Translucent Glass Slide with Specimen Dot (75mm x 25mm x 1mm)
  const glassSlide = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.002, 0.025),
    new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.85,
      roughness: 0.05,
    })
  );
  glassSlide.position.set(0, 0.008, 0);
  tagInteractive(glassSlide, 'micro_slide', 'Specimen Glass Slide', 'Swap Prepared Slide', station, 'primary');
  stageAssembly.add(glassSlide);

  // Stained Specimen Spot in center of slide
  const specimenDot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.002, 16),
    new THREE.MeshBasicMaterial({ color: '#dc2626' })
  );
  specimenDot.position.set(0, 0.01, 0);
  stageAssembly.add(specimenDot);

  group.add(stageAssembly);

  // 5. Coarse & Fine Focus Knobs
  const coarseKnobL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.018, 20),
    darkMetalMat
  );
  coarseKnobL.rotation.z = Math.PI / 2;
  coarseKnobL.position.set(-0.048, 0.14, -0.065);
  tagInteractive(coarseKnobL, 'micro_coarse_focus', 'Coarse Focus Knob', 'Turn to Adjust Stage Height', station, 'knob');
  group.add(coarseKnobL);

  const fineKnobL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.012, 20),
    new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.8, roughness: 0.2 })
  );
  fineKnobL.rotation.z = Math.PI / 2;
  fineKnobL.position.set(-0.062, 0.14, -0.065);
  tagInteractive(fineKnobL, 'micro_fine_focus', 'Fine Focus Micrometer', 'Turn for High-Precision Sharpness', station, 'knob');
  group.add(fineKnobL);

  const coarseKnobR = coarseKnobL.clone();
  coarseKnobR.position.x = 0.048;
  tagInteractive(coarseKnobR, 'micro_coarse_focus', 'Coarse Focus Knob', 'Turn to Adjust Stage Height', station, 'knob');
  group.add(coarseKnobR);

  const fineKnobR = fineKnobL.clone();
  fineKnobR.position.x = 0.062;
  tagInteractive(fineKnobR, 'micro_fine_focus', 'Fine Focus Micrometer', 'Turn for High-Precision Sharpness', station, 'knob');
  group.add(fineKnobR);

  // 6. Revolving Nosepiece Turret with 4 Objective Lenses
  const turretGroup = new THREE.Group();
  turretGroup.position.set(0, 0.28, 0.03);

  const turretMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.022, 20),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.95, roughness: 0.1 })
  );
  tagInteractive(turretMesh, 'micro_turret', 'Revolving Nosepiece Turret', 'Rotate Objective Lenses (4x/10x/40x/100x)', station, 'knob');
  turretGroup.add(turretMesh);

  // 4 Objective Lenses (Red 4x, Yellow 10x, Blue 40x, White 100x)
  const lensConfigs = [
    { name: '4x Scanning Lens', color: '#ef4444', len: 0.035, rot: 0 },
    { name: '10x Low Power Lens', color: '#eab308', len: 0.045, rot: Math.PI / 2 },
    { name: '40x High Dry Lens', color: '#3b82f6', len: 0.060, rot: Math.PI },
    { name: '100x Oil Immersion Lens', color: '#ffffff', len: 0.070, rot: (Math.PI * 3) / 2 },
  ];

  lensConfigs.forEach((cfg) => {
    const lensBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.013, cfg.len, 16),
      darkMetalMat
    );
    lensBody.position.set(Math.sin(cfg.rot) * 0.035, -cfg.len / 2, Math.cos(cfg.rot) * 0.035);

    // Color band ring
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.008, 16),
      new THREE.MeshBasicMaterial({ color: cfg.color })
    );
    band.position.y = -cfg.len * 0.3;
    lensBody.add(band);

    tagInteractive(lensBody, 'micro_turret', cfg.name, 'Rotate Nosepiece to Select', station, 'knob');
    turretGroup.add(lensBody);
  });

  group.add(turretGroup);

  // 7. Binocular Seidentopf Viewing Head with Dual Eyepieces
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.31, 0.01);

  const headPrism = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.055, 0.075),
    whiteEnamelMat
  );
  headGroup.add(headPrism);

  // Dual Eyepiece Ocular Tubes (30° angle, eye level ~0.38m)
  [-0.03, 0.03].forEach((eyeX) => {
    const eyeTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.09, 16),
      darkMetalMat
    );
    eyeTube.position.set(eyeX, 0.05, 0.025);
    eyeTube.rotation.x = -0.45;

    const eyeCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.013, 0.016, 16),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.9 })
    );
    eyeCup.position.y = 0.045;
    eyeTube.add(eyeCup);

    const eyeLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 16),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.05, metalness: 0.9 })
    );
    eyeLens.position.y = 0.052;
    eyeLens.rotation.x = -Math.PI / 2;
    eyeTube.add(eyeLens);

    tagInteractive(eyeTube, 'micro_eyepieces', '10x Widefield Eyepieces', 'Look Through Eyepieces (3D Ocular View)', station, 'eyepiece');
    headGroup.add(eyeTube);
  });

  group.add(headGroup);

  group.userData = {
    type: 'microscope',
    stageAssembly,
    turret: turretGroup,
    turretGroup,
    coarseKnobL,
    fineKnobL,
    stageLight,
    glassSlide,
    specimenDot,
  };

  return group;
}

/**
 * Creates 3D Chemistry Titration Bench Apparatus
 * Standard metric size: Retort stand 0.55m height, 22cm x 14cm base, 50mL burette
 */
export function createRealisticTitrationRig(station: 'chemistry' = 'chemistry') {
  const group = new THREE.Group();

  // White Enamel & Cast Iron Stand Base (22cm x 14cm x 2cm)
  const standBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.02, 0.14),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3, metalness: 0.5 })
  );
  standBase.position.y = 0.01;
  group.add(standBase);

  // Vertical Stainless Steel Rod (55cm height)
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.55, 16),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.95, roughness: 0.1 })
  );
  rod.position.set(-0.08, 0.275, -0.04);
  group.add(rod);

  // Clamp
  const clamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.025, 0.035),
    new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.7 })
  );
  clamp.position.set(-0.03, 0.38, -0.04);
  group.add(clamp);

  // 50mL Graduated Glass Burette (45cm length x 1.4cm diameter)
  const buretteTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.45, 16),
    new THREE.MeshStandardMaterial({ color: '#f0fdf4', transparent: true, opacity: 0.65, roughness: 0.05 })
  );
  buretteTube.position.set(0.02, 0.35, -0.04);
  group.add(buretteTube);

  // Titrant Liquid Column inside burette
  const liquidColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0065, 0.0065, 0.32, 16),
    new THREE.MeshStandardMaterial({ color: '#0284c7', transparent: true, opacity: 0.8, roughness: 0.1 })
  );
  liquidColumn.position.set(0.02, 0.31, -0.04);
  group.add(liquidColumn);

  // PTFE Stopcock Valve
  const stopcock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.035, 12),
    new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.3, roughness: 0.4 })
  );
  stopcock.position.set(0.02, 0.14, -0.04);
  stopcock.rotation.z = Math.PI / 2;
  tagInteractive(stopcock, 'chem_stopcock', 'Burette Stopcock Valve', 'Turn to Dispense Titrant Drops', station, 'switch');
  group.add(stopcock);

  // Modern White Magnetic Stirrer Hotplate (20cm x 18cm x 5cm)
  const stirrerPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.045, 0.18),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2, metalness: 0.2 })
  );
  stirrerPlate.position.set(0.02, 0.0225, -0.04);
  group.add(stirrerPlate);

  // Stirrer Speed Dial
  const stirrerKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.010, 16),
    new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.6 })
  );
  stirrerKnob.position.set(0.02, 0.025, 0.055);
  stirrerKnob.rotation.x = Math.PI / 2;
  tagInteractive(stirrerKnob, 'chem_stirrer_knob', 'Magnetic Stirrer Speed Dial', 'Adjust Stirring Vortex (0-1000 RPM)', station, 'knob');
  group.add(stirrerKnob);

  // 250mL Erlenmeyer Flask (14cm tall x 8.5cm base)
  const flaskGeo = new THREE.ConeGeometry(0.045, 0.14, 16);
  const flaskMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    transparent: true,
    opacity: 0.65,
    roughness: 0.05,
  });
  const flask = new THREE.Mesh(flaskGeo, flaskMat);
  flask.position.set(0.02, 0.115, -0.04);
  tagInteractive(flask, 'chem_flask', '250mL Erlenmeyer Flask', 'Add Indicator / Observe Color Change', station, 'primary');
  group.add(flask);

  // Solution Liquid inside flask
  const flaskLiquid = new THREE.Mesh(
    new THREE.ConeGeometry(0.038, 0.07, 16),
    new THREE.MeshStandardMaterial({ color: '#fbcfe8', transparent: true, opacity: 0.85, roughness: 0.1 })
  );
  flaskLiquid.position.set(0.02, 0.08, -0.04);
  group.add(flaskLiquid);

  // Magnetic Stir Bar (2cm length)
  const stirBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 })
  );
  stirBar.position.set(0.02, 0.05, -0.04);
  stirBar.rotation.z = Math.PI / 2;
  group.add(stirBar);

  // Digital pH Meter (14cm x 10cm x 5cm)
  const phMeterBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.05, 0.10),
    new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.3 })
  );
  phMeterBox.position.set(0.24, 0.025, 0.02);
  tagInteractive(phMeterBox, 'chem_ph_meter', 'Digital pH Meter', 'Inspect pH Buffer Curve', station, 'primary');
  group.add(phMeterBox);

  // pH Backlit LCD Screen
  const phScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.035),
    new THREE.MeshBasicMaterial({ color: '#38bdf8' })
  );
  phScreen.position.set(0.24, 0.051, 0.02);
  phScreen.rotation.x = -Math.PI / 2;
  group.add(phScreen);

  // Phenolphthalein Indicator Bottle (8cm tall)
  const dropperBottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.3 })
  );
  dropperBottle.position.set(-0.20, 0.04, 0.04);
  tagInteractive(dropperBottle, 'chem_indicator', 'Phenolphthalein Indicator Pipette', 'Add Indicator Drops to Flask', station, 'primary');
  group.add(dropperBottle);

  group.userData = {
    type: 'titration_rig',
    stopcock,
    stirBar,
    stirrerKnob,
    flaskLiquid,
    liquidColumn,
  };

  return group;
}

/**
 * Creates 3D Physics Circuit Board & Apparatus
 * Real-world metric size: Breadboard base 45cm x 30cm, Knife switch 16cm
 */
export function createRealisticPhysicsBench(station: 'physics' = 'physics') {
  const group = new THREE.Group();

  // Solid Teak & White Acrylic Circuit Board (45cm x 32cm x 2cm)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.02, 0.32),
    new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.6 })
  );
  base.position.y = 0.01;
  group.add(base);

  const breadboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.015, 0.25),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 })
  );
  breadboard.position.set(0, 0.025, 0);
  group.add(breadboard);

  // Heavy Brass SPST Knife Switch (14cm x 6cm)
  const switchBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.015, 0.06),
    new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.8 })
  );
  switchBase.position.set(-0.12, 0.035, 0.04);
  group.add(switchBase);

  // Knife Switch Brass Blade
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.006, 0.012),
    new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.95, roughness: 0.15 })
  );
  blade.position.set(-0.12, 0.055, 0.04);
  tagInteractive(blade, 'phys_knife_switch', 'Brass Knife Switch', 'Flip Switch (ON/OFF)', station, 'switch');
  group.add(blade);

  // Wirewound Potentiometer (6cm diameter)
  const potBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.022, 16),
    new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.8 })
  );
  potBase.position.set(0.12, 0.04, 0.04);
  group.add(potBase);

  const potKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.020, 0.020, 0.014, 16),
    new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.3 })
  );
  potKnob.position.set(0.12, 0.055, 0.04);
  tagInteractive(potKnob, 'phys_potentiometer', 'Variable Potentiometer (10-100Ω)', 'Twist to Adjust Resistance', station, 'knob');
  group.add(potKnob);

  // Incandescent Light Bulb & Ceramic Socket (8cm height)
  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.028, 0.022, 16),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
  );
  socket.position.set(0, 0.04, -0.04);
  group.add(socket);

  const bulbGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 16, 16),
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#facc15',
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.85,
    })
  );
  bulbGlass.position.set(0, 0.075, -0.04);
  tagInteractive(bulbGlass, 'phys_bulb', 'Incandescent Circuit Lamp', 'Test Ohm’s Law & Power Dissipation', station, 'primary');
  group.add(bulbGlass);

  const bulbLight = new THREE.PointLight('#facc15', 2.2, 4.0);
  bulbLight.position.set(0, 0.09, -0.04);
  group.add(bulbLight);

  // Digital Multimeter in High-Vis Holster (18cm x 9cm x 4.5cm)
  const dmm = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.045, 0.18),
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4 })
  );
  dmm.position.set(0.32, 0.0225, 0);
  tagInteractive(dmm, 'phys_multimeter', 'Digital Multimeter', 'Toggle Voltage / Current / Resistance Modes', station, 'primary');
  group.add(dmm);

  group.userData = {
    type: 'physics_circuit',
    blade,
    potKnob,
    bulbGlass,
    bulbLight,
  };

  return group;
}

/**
 * Creates 3D Analytical Balance & High-Speed Centrifuge
 * Real-world metric dimensions: Balance 28cm x 26cm, Centrifuge 24cm diameter
 */
export function createRealisticAnalyticalBench(station: 'research' = 'research') {
  const group = new THREE.Group();

  // Analytical Balance Chassis (Clinical White Powder Coat: 28cm x 26cm x 6cm)
  const balanceBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.055, 0.26),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2, metalness: 0.3 })
  );
  balanceBody.position.set(-0.28, 0.0275, 0);
  group.add(balanceBody);

  // Glass Draft Shield Chamber (22cm x 18cm x 22cm)
  const draftChamber = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.20),
    new THREE.MeshStandardMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.4, roughness: 0.05 })
  );
  draftChamber.position.set(-0.28, 0.145, 0);
  tagInteractive(draftChamber, 'res_balance_door', 'Glass Draft Shield Door', 'Slide Door Open / Close', station, 'switch');
  group.add(draftChamber);

  // Stainless Steel Weighing Pan (7cm diameter)
  const pan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.008, 24),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.95, roughness: 0.1 })
  );
  pan.position.set(-0.28, 0.075, 0);
  tagInteractive(pan, 'res_balance_pan', 'Analytical Weighing Pan', 'Place Sample / Calibration Weight', station, 'primary');
  group.add(pan);

  // Tare Touch Button
  const tareBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.012, 0.02),
    new THREE.MeshStandardMaterial({ color: '#0284c7' })
  );
  tareBtn.position.set(-0.28, 0.06, 0.105);
  tagInteractive(tareBtn, 'res_tare_btn', 'TARE Button', 'Zero the Digital Scale', station, 'switch');
  group.add(tareBtn);

  // High-Speed Benchtop Centrifuge (24cm diameter x 16cm height)
  const centrifugeBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.16, 24),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2, metalness: 0.3 })
  );
  centrifugeBody.position.set(0.28, 0.08, 0);
  group.add(centrifugeBody);

  const centrifugeLid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.4 })
  );
  centrifugeLid.position.set(0.28, 0.17, 0);
  tagInteractive(centrifugeLid, 'res_centrifuge_lid', 'Centrifuge Safety Lid', 'Open / Lock Centrifuge Lid', station, 'switch');
  group.add(centrifugeLid);

  const centDial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.012, 16),
    new THREE.MeshStandardMaterial({ color: '#4f46e5' })
  );
  centDial.position.set(0.28, 0.09, 0.135);
  centDial.rotation.x = Math.PI / 2;
  tagInteractive(centDial, 'res_centrifuge_start', 'Centrifuge Speed Dial', 'Spin Centrifuge (14,000 RPM)', station, 'knob');
  group.add(centDial);

  group.userData = {
    type: 'analytical_bench',
    draftChamber,
    pan,
    tareBtn,
    centrifugeLid,
    centrifugeBody,
  };

  return group;
}

/**
 * Creates High-Realism Chemical Fume Hood (Pristine White Body & Illuminated Stainless Interior)
 */
export function createFumeHood(): THREE.Group {
  const hood = new THREE.Group();

  // Outer Cabinet
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.8, 1.2),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3, metalness: 0.2 })
  );
  body.position.y = 1.4;
  body.castShadow = true;
  hood.add(body);

  // Interior Stainless Work Cavity
  const interior = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 1.4, 0.9),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.2 })
  );
  interior.position.set(0, 1.4, 0.1);
  hood.add(interior);

  // Sliding Safety Glass Sash
  const sash = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 0.9, 0.02),
    new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.45,
      roughness: 0.05,
    })
  );
  sash.position.set(0, 1.7, 0.55);
  hood.add(sash);

  // Yellow & Black Caution Stripe Bar
  const cautionBar = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.06, 0.04),
    new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.5 })
  );
  cautionBar.position.set(0, 1.25, 0.56);
  hood.add(cautionBar);

  // Internal Bright Daylight Work Light
  const hoodLight = new THREE.PointLight('#ffffff', 3.0, 4.0);
  hoodLight.position.set(0, 1.9, 0.2);
  hood.add(hoodLight);

  return hood;
}

/**
 * Creates Emergency Safety Shower & Eye Wash Station
 */
export function createSafetyShower(): THREE.Group {
  const station = new THREE.Group();

  // High-Vis Yellow Vertical Supply Pipe
  const pipeMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3, metalness: 0.6 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 16), pipeMat);
  pipe.position.y = 1.4;
  station.add(pipe);

  // Overhead Deluge Shower Head
  const showerHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.05, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.95, roughness: 0.1 })
  );
  showerHead.position.set(0.3, 2.7, 0);
  station.add(showerHead);

  const topPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 12), pipeMat);
  topPipe.rotation.z = Math.PI / 2;
  topPipe.position.set(0.15, 2.76, 0);
  station.add(topPipe);

  // Pull Triangle Handle
  const pullHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.01, 8, 16),
    new THREE.MeshStandardMaterial({ color: '#dc2626' })
  );
  pullHandle.position.set(0.3, 2.1, 0);
  station.add(pullHandle);

  // Eye Wash Basin
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.14, 0.1, 20),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.95, roughness: 0.1 })
  );
  basin.position.set(0.22, 1.1, 0);
  station.add(basin);

  return station;
}

/**
 * Creates Scientific Whiteboard with Formulas
 */
export function createLabWhiteboard(): THREE.Group {
  const wb = new THREE.Group();

  // Aluminum Frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.2, 0.06),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.8, roughness: 0.2 })
  );
  wb.add(frame);

  // White Enamel Board Face
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 2.0),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1 })
  );
  board.position.z = 0.035;
  wb.add(board);

  // Marker Tray
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.03, 0.12),
    new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.7 })
  );
  tray.position.set(0, -1.05, 0.08);
  wb.add(tray);

  // Markers
  const colors = ['#dc2626', '#2563eb', '#16a34a', '#0f172a'];
  colors.forEach((col, idx) => {
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: col })
    );
    marker.rotation.z = Math.PI / 2;
    marker.position.set(-0.3 + idx * 0.2, -1.03, 0.08);
    wb.add(marker);
  });

  return wb;
}

/**
 * Creates Overhead Workstation Reagent Shelf with Bottles & Glassware
 */
export function createReagentShelf(): THREE.Group {
  const shelf = new THREE.Group();

  // White Epoxy & Steel Shelf Tier
  const tierMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.8, roughness: 0.2 });
  const plank = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 0.35), tierMat);
  shelf.add(plank);

  // Under-shelf LED task light
  const taskLight = new THREE.PointLight('#ffffff', 1.8, 3.5);
  taskLight.position.set(0, -0.15, 0);
  shelf.add(taskLight);

  // Reagent Bottles
  const bottleColors = ['#78350f', '#1e3a8a', '#e0f2fe', '#064e3b', '#78350f', '#0284c7'];
  bottleColors.forEach((bColor, i) => {
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16),
      new THREE.MeshStandardMaterial({
        color: bColor,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
      })
    );
    bottle.position.set(-1.2 + i * 0.45, 0.1, 0);
    shelf.add(bottle);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.03, 12),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5 })
    );
    cap.position.set(-1.2 + i * 0.45, 0.19, 0);
    shelf.add(cap);
  });

  return shelf;
}
