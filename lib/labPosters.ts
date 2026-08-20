import * as THREE from 'three';
import { tagInteractive } from './lab3dEquipment';

/**
 * Creates high-resolution canvas texture for any custom lab poster
 */
function createPosterCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, width, height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Helper to create an elegant, beveled 3D framed picture/poster
 */
export function createFramedPosterMesh({
  width = 2.2,
  height = 1.5,
  texture,
  frameColor = '#0f172a',
  interactId,
  label,
  action,
  station = 'biology',
}: {
  width?: number;
  height?: number;
  texture: THREE.CanvasTexture;
  frameColor?: string;
  interactId?: string;
  label?: string;
  action?: string;
  station?: 'biology' | 'chemistry' | 'physics' | 'research';
}): THREE.Group {
  const group = new THREE.Group();

  const frameThickness = 0.06;
  const frameDepth = 0.04;
  const outerW = width + frameThickness * 2;
  const outerH = height + frameThickness * 2;

  // 1. Dark Brushed Anodized Outer Frame Bevel
  const frameMat = new THREE.MeshStandardMaterial({
    color: frameColor,
    roughness: 0.35,
    metalness: 0.65,
  });

  // Top Frame
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(outerW, frameThickness, frameDepth), frameMat);
  topBar.position.set(0, height / 2 + frameThickness / 2, 0);
  topBar.castShadow = true;
  group.add(topBar);

  // Bottom Frame
  const btmBar = new THREE.Mesh(new THREE.BoxGeometry(outerW, frameThickness, frameDepth), frameMat);
  btmBar.position.set(0, -(height / 2 + frameThickness / 2), 0);
  btmBar.castShadow = true;
  group.add(btmBar);

  // Left Frame
  const leftBar = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameDepth), frameMat);
  leftBar.position.set(-(width / 2 + frameThickness / 2), 0, 0);
  leftBar.castShadow = true;
  group.add(leftBar);

  // Right Frame
  const rightBar = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameDepth), frameMat);
  rightBar.position.set(width / 2 + frameThickness / 2, 0, 0);
  rightBar.castShadow = true;
  group.add(rightBar);

  // 2. Inner Recessed Poster Canvas
  const posterGeo = new THREE.PlaneGeometry(width, height);
  const posterMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.3,
    metalness: 0.02,
  });
  const posterMesh = new THREE.Mesh(posterGeo, posterMat);
  posterMesh.position.z = 0.005;
  posterMesh.receiveShadow = true;

  if (interactId && label && action) {
    tagInteractive(posterMesh, interactId, label, action, station, 'primary');
  }
  group.add(posterMesh);

  // 3. Clear Protective Anti-Glare Acrylic Glass Sheet
  const glassGeo = new THREE.PlaneGeometry(width, height);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.9,
    reflectivity: 0.5,
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.z = 0.012;
  group.add(glassMesh);

  return group;
}

/* =========================================================================
   POSTER 1: OPTICAL MICROSCOPY GUIDE (Biology Station Wall)
   ========================================================================= */
export function getMicroscopePosterTexture(): THREE.CanvasTexture {
  return createPosterCanvasTexture(1024, 720, (ctx, w, h) => {
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Top Header Banner
    ctx.fillStyle = '#059669'; // Emerald Green
    ctx.fillRect(0, 0, w, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔬 OPTICAL MICROSCOPY GUIDE', 36, 52);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('STANDARD OPERATING PROCEDURE • COMPOUND LIGHT MICROSCOPE', 38, 76);

    // Left Column: Anatomical Parts Diagram
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(36, 110, 440, 570);
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 110, 440, 570);

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Apparatus Anatomy & Key Controls', 56, 145);

    const parts = [
      { name: '1. Ocular Eyepieces (10x)', desc: 'Provides initial 10x optical magnification with diopter tuning.' },
      { name: '2. Revolving Nosepiece Turret', desc: 'Houses 4x Scanning, 10x Low, 40x High Dry, and 100x Oil lenses.' },
      { name: '3. Mechanical Stage & Slide Clips', desc: 'Holds 75x25mm specimen slides with X-Y vernier translation.' },
      { name: '4. Abbe Condenser & Iris Diaphragm', desc: 'Focuses and meters light beam N.A. 1.25 through specimen.' },
      { name: '5. Coarse & Fine Focus Knobs', desc: 'Coarse: quick specimen acquisition. Fine: optical depth plane.' },
      { name: '6. Substage LED Field Illuminator', desc: 'Variable 6000K daylight LED with brightness control rheostat.' },
    ];

    parts.forEach((p, idx) => {
      const y = 180 + idx * 78;
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(p.name, 56, y);
      ctx.fillStyle = '#334155';
      ctx.font = '12px sans-serif';
      ctx.fillText(p.desc, 56, y + 20);
    });

    // Right Column: 4-Step Standard Operation SOP & Magnification Formula
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(500, 110, 488, 380);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(500, 110, 488, 380);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Step-by-Step Operating Protocol', 520, 145);

    const steps = [
      'Step 1: Lower mechanical stage completely. Rotate turret to 4x scanning lens.',
      'Step 2: Place prepared slide securely under caliper clips over light aperture.',
      'Step 3: Look through eyepieces; turn Coarse Focus until specimen comes into view.',
      'Step 4: Rotate to 10x or 40x objective. Refine focal sharpness using Fine Focus ONLY.',
    ];

    steps.forEach((st, idx) => {
      const y = 185 + idx * 60;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(535, y - 6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, 535, y - 2);

      ctx.fillStyle = '#1e293b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(st, 560, y - 1);
    });

    // Right Bottom Box: Magnification Formula & Lens Color Codes
    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(500, 510, 488, 170);
    ctx.strokeStyle = '#a7f3d0';
    ctx.strokeRect(500, 510, 488, 170);

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Total Magnification = Eyepiece (10x) × Objective Lens', 520, 545);

    // Lens badges
    const lenses = [
      { mag: '4x (Red)', total: '40x Total', color: '#ef4444' },
      { mag: '10x (Yellow)', total: '100x Total', color: '#eab308' },
      { mag: '40x (Blue)', total: '400x Total', color: '#3b82f6' },
      { mag: '100x (White)', total: '1000x Oil', color: '#64748b' },
    ];

    lenses.forEach((l, idx) => {
      const bx = 520 + idx * 115;
      ctx.fillStyle = l.color;
      ctx.fillRect(bx, 570, 105, 80);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(l.mag, bx + 52, 600);
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(l.total, bx + 52, 625);
    });
  });
}

/* =========================================================================
   POSTER 2: CHEMICAL VOLUMETRIC TITRATION GUIDE (Chemistry Station Wall)
   ========================================================================= */
export function getTitrationPosterTexture(): THREE.CanvasTexture {
  return createPosterCanvasTexture(1024, 720, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Top Banner
    ctx.fillStyle = '#0284c7'; // Deep Sky Blue
    ctx.fillRect(0, 0, w, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🧪 VOLUMETRIC TITRATION PROTOCOL', 36, 52);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#bae6fd';
    ctx.fillText('ACID-BASE NEUTRALIZATION & QUANTITATIVE ANALYSIS SOP', 38, 76);

    // Left Column: Reaction Chemistry & Indicator Transition
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(36, 110, 440, 570);
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 110, 440, 570);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Reaction Principle & pH Endpoint', 56, 145);

    // Chemical Equation Box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(56, 165, 400, 60);
    ctx.strokeStyle = '#0284c7';
    ctx.strokeRect(56, 165, 400, 60);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HCl(aq) + NaOH(aq) ➔ NaCl(aq) + H2O(l)', 256, 202);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '13px sans-serif';
    ctx.fillText('At Equivalence Point: Moles of Acid = Moles of Base (n_A = n_B)', 56, 255);
    ctx.fillText('Formula: C_Acid × V_Acid = C_Base × V_Base', 56, 280);

    // Indicator Color Scale Diagram
    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Phenolphthalein pH Transition Range', 56, 330);

    // Gradient bar
    const grad = ctx.createLinearGradient(56, 350, 456, 350);
    grad.addColorStop(0, '#f8fafc'); // Colorless acid
    grad.addColorStop(0.65, '#f8fafc');
    grad.addColorStop(0.75, '#fbcfe8'); // Pale pink endpoint (pH 8.2)
    grad.addColorStop(1.0, '#ec4899'); // Deep pink basic (pH 10)
    ctx.fillStyle = grad;
    ctx.fillRect(56, 350, 400, 45);
    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(56, 350, 400, 45);

    ctx.fillStyle = '#0f172a';
    ctx.font = '12px sans-serif';
    ctx.fillText('pH 1-7 (Acidic: Colorless)', 60, 420);
    ctx.fillText('pH 8.2-10 (Endpoint: Pale Pink)', 250, 420);

    ctx.fillStyle = '#475569';
    ctx.font = '13px sans-serif';
    ctx.fillText('• Stopcock horizontal = Closed | Stopcock vertical = Dispensing', 56, 475);
    ctx.fillText('• Keep magnetic stirrer at 400-600 RPM for instant mixing.', 56, 505);
    ctx.fillText('• Read bottom of liquid meniscus at eye level to avoid parallax.', 56, 535);

    // Right Column: 4-Step Titration Procedure
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(500, 110, 488, 570);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(500, 110, 488, 570);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Titration Step-by-Step Procedure', 520, 145);

    const chemSteps = [
      { title: '1. Fill Burette with Standard Titrant', desc: 'Rinse burette with 0.10M NaOH. Fill to 0.00 mL mark. Expel air bubbles from jet tip.' },
      { title: '2. Prepare Analyte in Erlenmeyer Flask', desc: 'Pipette 25.00 mL of unknown HCl into flask. Add 2-3 drops of Phenolphthalein indicator.' },
      { title: '3. Activate Magnetic Stir Bar', desc: 'Place flask on stirring plate. Activate stirrer to establish a gentle uniform vortex.' },
      { title: '4. Dispense Titrant & Catch Endpoint', desc: 'Open stopcock to deliver titrant dropwise until a faint pink color persists for 30s.' },
      { title: '5. Record Final Volume & Calculate', desc: 'Note V_final on graduated scale (±0.02 mL). Compute unknown acid concentration.' },
    ];

    chemSteps.forEach((cs, idx) => {
      const y = 185 + idx * 92;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(535, y - 6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, 535, y - 2);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(cs.title, 560, y - 2);

      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.fillText(cs.desc, 560, y + 18);
    });
  });
}

/* =========================================================================
   POSTER 3: DC CIRCUITS & OHM'S LAW (Physics Station Wall)
   ========================================================================= */
export function getPhysicsCircuitsPosterTexture(): THREE.CanvasTexture {
  return createPosterCanvasTexture(1024, 720, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Top Banner
    ctx.fillStyle = '#d97706'; // Amber Gold
    ctx.fillRect(0, 0, w, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ DC ELECTRICAL CIRCUITS & OHM\'S LAW', 36, 52);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('BREADBOARD WIRING, POTENTIOMETERS & LOAD CHARACTERISTICS', 38, 76);

    // Left Column: Ohm's Law Formulas & Magic Triangle
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(36, 110, 440, 570);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 110, 440, 570);

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Ohm\'s Law & Power Equations', 56, 145);

    // Equations Box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(56, 165, 400, 140);
    ctx.strokeStyle = '#d97706';
    ctx.strokeRect(56, 165, 400, 140);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('V = I × R', 256, 205);
    ctx.font = 'bold 18px monospace';
    ctx.fillText('I = V / R    •    R = V / I', 256, 240);
    ctx.fillText('Power: P = V × I = I² × R', 256, 275);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '14px sans-serif';
    ctx.fillText('• V = Electrical Potential Difference (Volts, V)', 56, 340);
    ctx.fillText('• I = Direct Current Flow (Amperes, A)', 56, 370);
    ctx.fillText('• R = Resistance to Current Flow (Ohms, Ω)', 56, 400);
    ctx.fillText('• P = Electrical Power Dissipation (Watts, W)', 56, 430);

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Filament Glow Characteristic:', 56, 485);
    ctx.fillStyle = '#475569';
    ctx.font = '13px sans-serif';
    ctx.fillText('Tungsten filament thermal radiation scales with P = I²R.', 56, 510);
    ctx.fillText('Increasing circuit resistance decreases current & filament brightness.', 56, 535);

    // Right Column: Circuit Schematic & Safety Protocol
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(500, 110, 488, 570);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(500, 110, 488, 570);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Circuit Breadboard Architecture', 520, 145);

    const circuitNodes = [
      { name: '1. DC Regulated Power Supply', desc: 'Provides steady 12.0V DC potential across circuit rails.' },
      { name: '2. Heavy Single-Pole Knife Switch', desc: 'Safely makes/breaks current flow with audible mechanical snap.' },
      { name: '3. Rotary Wirewound Potentiometer', desc: 'Variable resistor (10Ω to 100Ω) dialing continuous current limit.' },
      { name: '4. Incandescent Filament Indicator Bulb', desc: 'Converts electrical energy into lumen radiance & Joule heating.' },
      { name: '5. Dual Digital Multimeters', desc: 'Measures live Amperage in series and Voltage across load in parallel.' },
    ];

    circuitNodes.forEach((cn, idx) => {
      const y = 185 + idx * 78;
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(535, y - 6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, 535, y - 2);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(cn.name, 560, y - 2);

      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.fillText(cn.desc, 560, y + 18);
    });

    // Safety Banner
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(520, 585, 448, 75);
    ctx.strokeStyle = '#fca5a5';
    ctx.strokeRect(520, 585, 448, 75);

    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('⚡ SAFETY MANDATE:', 535, 610);
    ctx.fillStyle = '#7f1d1d';
    ctx.font = '12px sans-serif';
    ctx.fillText('Always open the knife switch before adjusting resistor knobs or wire leads.', 535, 632);
  });
}

/* =========================================================================
   POSTER 4: ANALYTICAL BALANCE & CENTRIFUGE SOP (Analytical Science Wall)
   ========================================================================= */
export function getAnalyticalSOPPosterTexture(): THREE.CanvasTexture {
  return createPosterCanvasTexture(1024, 720, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Top Banner
    ctx.fillStyle = '#4f46e5'; // Indigo
    ctx.fillRect(0, 0, w, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚖️ ANALYTICAL MEASUREMENT & CENTRIFUGATION', 36, 52);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#c7d2fe';
    ctx.fillText('PRECISION 4-DECIMAL WEIGHING & SAMPLE SEPARATION SOP', 38, 76);

    // Left Column: Analytical Balance Protocol
    ctx.fillStyle = '#eef2ff';
    ctx.fillRect(36, 110, 440, 570);
    ctx.strokeStyle = '#c7d2fe';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 110, 440, 570);

    ctx.fillStyle = '#3730a3';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('4-Decimal Analytical Balance (±0.1 mg)', 56, 145);

    const balanceSteps = [
      '1. Leveling Check: Verify spirit bubble is centered in circle.',
      '2. Draft Shield Doors: Keep glass doors closed during measurement to prevent air draft buoyancy errors.',
      '3. Tare Operation: Place clean weighing boat on pan and press [TARE] to zero display (0.0000 g).',
      '4. Sample Transfer: Add analyte in micro-quantities using spatula outside draft chamber to avoid spills.',
      '5. Stability Indicator: Record value only when stable marker (g) illuminates without fluctuating.',
    ];

    balanceSteps.forEach((bs, idx) => {
      const y = 185 + idx * 80;
      ctx.fillStyle = '#312e81';
      ctx.font = '13px sans-serif';
      ctx.fillText(bs, 56, y, 400);
    });

    // Right Column: Centrifuge Counterbalance Mandate
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(500, 110, 488, 570);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(500, 110, 488, 570);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('High-Speed Centrifuge Operations', 520, 145);

    // Critical Counterbalance Warning Box
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(520, 170, 448, 120);
    ctx.strokeStyle = '#ef4444';
    ctx.strokeRect(520, 170, 448, 120);

    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('⚠️ CRITICAL RULE: ROTOR COUNTERBALANCING', 535, 200);

    ctx.fillStyle = '#7f1d1d';
    ctx.font = '13px sans-serif';
    ctx.fillText('Always place sample tubes in OPPOSITE pairs (180° apart).', 535, 230);
    ctx.fillText('Both tubes must have equal mass to within ±0.05 grams.', 535, 255);
    ctx.fillText('Unbalanced spinning causes catastrophic motor spindle damage.', 535, 278);

    const centrifugeRules = [
      '• Inspect microcentrifuge tubes for cracks before loading.',
      '• Securely click the aerosol-tight inner safety lid in place.',
      '• Never attempt to bypass lid interlock while rotor is decelerating.',
      '• Relative Centrifugal Force (RCF = 1.118 × 10⁻⁵ × r × RPM²).',
    ];

    centrifugeRules.forEach((cr, idx) => {
      const y = 330 + idx * 45;
      ctx.fillStyle = '#334155';
      ctx.font = '13px sans-serif';
      ctx.fillText(cr, 520, y);
    });

    // Separation Diagram
    ctx.fillStyle = '#e0e7ff';
    ctx.fillRect(520, 520, 448, 140);
    ctx.strokeStyle = '#a5b4fc';
    ctx.strokeRect(520, 520, 448, 140);

    ctx.fillStyle = '#3730a3';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Centrifugal Sedimentation Result:', 535, 548);
    ctx.fillStyle = '#1e1b4b';
    ctx.font = '12px sans-serif';
    ctx.fillText('• Supernatant (Liquid Phase): Decant gently with micropipette.', 535, 575);
    ctx.fillText('• Insoluble Pellet (Dense Fraction): Resuspend in buffer as required.', 535, 600);
    ctx.fillText('• Typical Run: 8,000 to 14,000 RPM for 5-10 minutes at 4°C.', 535, 625);
  });
}

/* =========================================================================
   POSTER 5: PERIODIC TABLE OF ELEMENTS (Full Wall Master Chart)
   ========================================================================= */
export function getPeriodicTableMasterPosterTexture(): THREE.CanvasTexture {
  return createPosterCanvasTexture(1280, 800, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Banner
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, 80);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PERIODIC TABLE OF THE ELEMENTS', w / 2, 46);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('IUPAC CERTIFIED INTERNATIONAL STANDARD • RELATIVE ATOMIC MASSES', w / 2, 68);

    // Elements grid mockup
    const cols = 18;
    const rows = 7;
    const startX = 40;
    const startY = 100;
    const cellW = 64;
    const cellH = 68;

    const sampleElements: { [key: string]: { sym: string; name: string; num: number; mass: string; color: string } } = {
      '0,0': { sym: 'H', name: 'Hydrogen', num: 1, mass: '1.008', color: '#fecaca' },
      '0,17': { sym: 'He', name: 'Helium', num: 2, mass: '4.003', color: '#e9d5ff' },
      '1,0': { sym: 'Li', name: 'Lithium', num: 3, mass: '6.941', color: '#fed7aa' },
      '1,1': { sym: 'Be', name: 'Beryllium', num: 4, mass: '9.012', color: '#fef08a' },
      '1,12': { sym: 'B', name: 'Boron', num: 5, mass: '10.81', color: '#bbf7d0' },
      '1,13': { sym: 'C', name: 'Carbon', num: 6, mass: '12.01', color: '#bbf7d0' },
      '1,14': { sym: 'N', name: 'Nitrogen', num: 7, mass: '14.01', color: '#bbf7d0' },
      '1,15': { sym: 'O', name: 'Oxygen', num: 8, mass: '16.00', color: '#bbf7d0' },
      '1,16': { sym: 'F', name: 'Fluorine', num: 9, mass: '19.00', color: '#bfdbfe' },
      '1,17': { sym: 'Ne', name: 'Neon', num: 10, mass: '20.18', color: '#e9d5ff' },
      '2,0': { sym: 'Na', name: 'Sodium', num: 11, mass: '22.99', color: '#fed7aa' },
      '2,1': { sym: 'Mg', name: 'Magnesium', num: 12, mass: '24.31', color: '#fef08a' },
      '2,12': { sym: 'Al', name: 'Aluminum', num: 13, mass: '26.98', color: '#cbd5e1' },
      '2,13': { sym: 'Si', name: 'Silicon', num: 14, mass: '28.09', color: '#bbf7d0' },
      '2,14': { sym: 'P', name: 'Phosphorus', num: 15, mass: '30.97', color: '#bbf7d0' },
      '2,15': { sym: 'S', name: 'Sulfur', num: 16, mass: '32.06', color: '#bbf7d0' },
      '2,16': { sym: 'Cl', name: 'Chlorine', num: 17, mass: '35.45', color: '#bfdbfe' },
      '2,17': { sym: 'Ar', name: 'Argon', num: 18, mass: '39.95', color: '#e9d5ff' },
      '3,0': { sym: 'K', name: 'Potassium', num: 19, mass: '39.10', color: '#fed7aa' },
      '3,1': { sym: 'Ca', name: 'Calcium', num: 20, mass: '40.08', color: '#fef08a' },
      '3,2': { sym: 'Sc', name: 'Scandium', num: 21, mass: '44.96', color: '#ddd6fe' },
      '3,3': { sym: 'Ti', name: 'Titanium', num: 22, mass: '47.87', color: '#ddd6fe' },
      '3,4': { sym: 'V', name: 'Vanadium', num: 23, mass: '50.94', color: '#ddd6fe' },
      '3,5': { sym: 'Cr', name: 'Chromium', num: 24, mass: '52.00', color: '#ddd6fe' },
      '3,6': { sym: 'Mn', name: 'Manganese', num: 25, mass: '54.94', color: '#ddd6fe' },
      '3,7': { sym: 'Fe', name: 'Iron', num: 26, mass: '55.85', color: '#ddd6fe' },
      '3,8': { sym: 'Co', name: 'Cobalt', num: 27, mass: '58.93', color: '#ddd6fe' },
      '3,9': { sym: 'Ni', name: 'Nickel', num: 28, mass: '58.69', color: '#ddd6fe' },
      '3,10': { sym: 'Cu', name: 'Copper', num: 29, mass: '63.55', color: '#ddd6fe' },
      '3,11': { sym: 'Zn', name: 'Zinc', num: 30, mass: '65.38', color: '#ddd6fe' },
      '3,12': { sym: 'Ga', name: 'Gallium', num: 31, mass: '69.72', color: '#cbd5e1' },
      '3,13': { sym: 'Ge', name: 'Germanium', num: 32, mass: '72.63', color: '#bbf7d0' },
      '3,14': { sym: 'As', name: 'Arsenic', num: 33, mass: '74.92', color: '#bbf7d0' },
      '3,15': { sym: 'Se', name: 'Selenium', num: 34, mass: '78.96', color: '#bbf7d0' },
      '3,16': { sym: 'Br', name: 'Bromine', num: 35, mass: '79.90', color: '#bfdbfe' },
      '3,17': { sym: 'Kr', name: 'Krypton', num: 36, mass: '83.80', color: '#e9d5ff' },
    };

    const categoryColors = ['#fecaca', '#fed7aa', '#fef08a', '#ddd6fe', '#cbd5e1', '#bbf7d0', '#bfdbfe', '#e9d5ff'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 && c > 0 && c < 17) continue;
        if ((r === 1 || r === 2) && c > 1 && c < 12) continue;

        const x = startX + c * cellW;
        const y = startY + r * cellH;

        const key = `${r},${c}`;
        const item = sampleElements[key] || {
          sym: String.fromCharCode(65 + ((r * 7 + c) % 26)),
          name: 'Element',
          num: (r * 18 + c + 1) % 118 + 1,
          mass: `${(r * 20 + c * 3 + 40).toFixed(2)}`,
          color: categoryColors[(r + c) % categoryColors.length],
        };

        ctx.fillStyle = item.color;
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${item.num}`, x + 6, y + 16);

        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.sym, x + cellW / 2, y + 38);

        ctx.font = '9px sans-serif';
        ctx.fillText(item.name.slice(0, 7), x + cellW / 2, y + 50);
        ctx.font = '8px monospace';
        ctx.fillText(item.mass, x + cellW / 2, y + 61);
      }
    }

    // Legend at bottom
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(startX, 620, w - startX * 2, 140);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ELEMENT CLASSIFICATION FAMILIES:', startX + 20, 650);

    const legendItems = [
      { name: 'Alkali Metals', color: '#fed7aa' },
      { name: 'Alkaline Earth', color: '#fef08a' },
      { name: 'Transition Metals', color: '#ddd6fe' },
      { name: 'Post-Transition', color: '#cbd5e1' },
      { name: 'Metalloids & Nonmetals', color: '#bbf7d0' },
      { name: 'Halogens', color: '#bfdbfe' },
      { name: 'Noble Gases', color: '#e9d5ff' },
    ];

    legendItems.forEach((lg, idx) => {
      const lx = startX + 20 + idx * 165;
      ctx.fillStyle = lg.color;
      ctx.fillRect(lx, 675, 20, 20);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(lx, 675, 20, 20);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px sans-serif';
      ctx.fillText(lg.name, lx + 28, 690);
    });
  });
}

/* =========================================================================
   POSTER 6: LABORATORY SAFETY PROTOCOL & GHS PICTOGRAMS
   ========================================================================= */
export function getLabSafetyPosterTexture(): THREE.CanvasTexture {
  return createPosterCanvasTexture(1024, 720, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Top Banner
    ctx.fillStyle = '#dc2626'; // Vibrant Warning Red
    ctx.fillRect(0, 0, w, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚠️ LABORATORY SAFETY & GHS HAZARDS', 36, 52);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#fee2e2';
    ctx.fillText('OSHA & ISO 17025 STANDARD SAFETY COMPLIANCE CODE', 38, 76);

    // Left Column: Mandatory PPE Checklist
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(36, 110, 440, 570);
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 110, 440, 570);

    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Mandatory Personal Protective Equipment', 56, 145);

    const ppeList = [
      { rule: '1. Eye Protection (ANSI Z87.1)', desc: 'Safety goggles must be worn at all times in active chemical areas.' },
      { rule: '2. Buttoned Lab Coat', desc: 'Flame-retardant 100% cotton coat protects skin and street clothing.' },
      { rule: '3. Nitrile Gloves', desc: 'Inspect for pinholes. Replace immediately after solvent exposure.' },
      { rule: '4. Closed-Toe Enclosed Footwear', desc: 'Open sandals, heels, or mesh footwear strictly prohibited.' },
      { rule: '5. Fume Hood Utilization', desc: 'Always manipulate volatile, toxic, or odorous acids in active fume hood.' },
      { rule: '6. Chemical Waste Segregation', desc: 'Never pour heavy metals, organic halogens, or sharps down sink drains.' },
    ];

    ppeList.forEach((item, idx) => {
      const y = 185 + idx * 78;
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(item.rule, 56, y);
      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.desc, 56, y + 20);
    });

    // Right Column: GHS Hazard Pictograms & Emergency Actions
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(500, 110, 488, 570);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(500, 110, 488, 570);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('GHS Hazard Symbol Classification', 520, 145);

    const hazards = [
      { sym: '🔥', title: 'Flammable Liquids', desc: 'Keep away from open flames and Bunsen burner sparks.' },
      { sym: '☣️', title: 'Toxic / Biohazard', desc: 'Fatal if inhaled or ingested. Avoid cutaneous contact.' },
      { sym: '🧪', title: 'Corrosive Chemicals', desc: 'Causes severe skin burns and serious irreversible eye damage.' },
      { sym: '💥', title: 'Explosive / Pressure', desc: 'Sensitive to mechanical shock, friction, heat, or overpressure.' },
    ];

    hazards.forEach((hz, idx) => {
      const y = 185 + idx * 70;
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(hz.sym, 525, y + 10);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(hz.title, 570, y - 2);

      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.fillText(hz.desc, 570, y + 18);
    });

    // Emergency Protocol Box
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(520, 490, 448, 170);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('🚨 EMERGENCY EYEWASH & SHOWER PROTOCOL', 535, 525);

    ctx.font = '13px sans-serif';
    ctx.fillText('1. Flush eyes or body continuously for 15 MINUTES minimum.', 535, 560);
    ctx.fillText('2. Hold eyelids open with fingers while rotating eyeballs.', 535, 588);
    ctx.fillText('3. Shout for instructor assistance immediately; summon medical EMT.', 535, 616);
    ctx.fillText('4. Neutralize acid spills with sodium bicarbonate absorbent.', 535, 642);
  });
}

/* =========================================================================
   POSTER 7: THE SCIENTIFIC METHOD & EXPERIMENTAL DESIGN FLOWCHART
   ========================================================================= */
export function getScientificMethodPosterTexture(): THREE.CanvasTexture {
  return createPosterCanvasTexture(1024, 720, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Banner
    ctx.fillStyle = '#7c3aed'; // Purple
    ctx.fillRect(0, 0, w, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔬 THE SCIENTIFIC METHOD & EXPERIMENTATION', 36, 52);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ddd6fe';
    ctx.fillText('EMPIRICAL RESEARCH METHODOLOGY & HYPOTHESIS TESTING FRAMEWORK', 38, 76);

    // 6 Sequential Steps in Connected Flowchart Cards
    const steps = [
      { num: '01', title: 'Observation & Inquiry', desc: 'Identify natural phenomena and formulate a specific, testable scientific question.' },
      { num: '02', title: 'Hypothesis Formulation', desc: 'Propose a falsifiable prediction (Null Hypothesis H₀ and Alternative Hypothesis H₁).' },
      { num: '03', title: 'Controlled Experiment', desc: 'Isolate Independent Variable while holding all Control Variables rigorously constant.' },
      { num: '04', title: 'Quantitative Data Capture', desc: 'Perform triplicate trials (n=3) using calibrated instruments to minimize systematic error.' },
      { num: '05', title: 'Statistical Analysis', desc: 'Calculate standard deviation (±σ), p-values, regression fits, and error margins.' },
      { num: '06', title: 'Conclusion & Peer Review', desc: 'Evaluate if data supports or rejects hypothesis. Publish replicable scientific findings.' },
    ];

    steps.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 36 + col * 475;
      const y = 110 + row * 185;

      ctx.fillStyle = '#faf5ff';
      ctx.fillRect(x, y, 450, 165);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 450, 165);

      // Number badge
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(x + 16, y + 16, 42, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(st.num, x + 37, y + 38);

      ctx.fillStyle = '#581c87';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(st.title, x + 70, y + 38);

      ctx.fillStyle = '#334155';
      ctx.font = '13px sans-serif';
      ctx.fillText(st.desc, x + 20, y + 80, 410);
    });
  });
}

/* =========================================================================
   POSTER 8: CELL BIOLOGY & HISTOLOGY SPECIMEN ATLAS
   ========================================================================= */
export function getCellBiologyPosterTexture(): THREE.CanvasTexture {
  return createPosterCanvasTexture(1024, 720, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Banner
    ctx.fillStyle = '#0d9488'; // Teal
    ctx.fillRect(0, 0, w, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🧫 CELL BIOLOGY ATLAS & CYTOLOGY', 36, 52);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#99f6e4';
    ctx.fillText('PLANT VS ANIMAL ORGANELLES & HISTOLOGICAL STAINING REFERENCE', 38, 76);

    // Left Column: Plant vs Animal Cell Comparison
    ctx.fillStyle = '#f0fdfa';
    ctx.fillRect(36, 110, 440, 570);
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 110, 440, 570);

    ctx.fillStyle = '#115e59';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Comparative Cytology Matrix', 56, 145);

    const organelleRows = [
      { name: 'Nucleus / Chromatin', plant: 'Present (Periphery)', animal: 'Present (Central)', role: 'Houses genomic DNA' },
      { name: 'Cell Wall (Cellulose)', plant: 'Rigid Outer Wall', animal: 'ABSENT', role: 'Maintains turgor pressure' },
      { name: 'Chloroplasts / Stroma', plant: 'Photosynthetic', animal: 'ABSENT', role: 'Calvin cycle & ATP' },
      { name: 'Mitochondria', plant: 'Present', animal: 'Abundant', role: 'Oxidative phosphorylation' },
      { name: 'Central Vacuole', plant: 'Large (90% vol)', animal: 'Small vesicles', role: 'Osmotic equilibrium' },
      { name: 'Plasma Membrane', plant: 'Inside cell wall', animal: 'Outer boundary', role: 'Selective permeability' },
    ];

    organelleRows.forEach((r, idx) => {
      const y = 185 + idx * 78;
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(r.name, 56, y);
      ctx.fillStyle = '#1e293b';
      ctx.font = '12px sans-serif';
      ctx.fillText(`• Plant: ${r.plant} | Animal: ${r.animal}`, 56, y + 20);
      ctx.fillStyle = '#64748b';
      ctx.fillText(`• Function: ${r.role}`, 56, y + 38);
    });

    // Right Column: Slide Specimen Staining Protocols
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(500, 110, 488, 570);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(500, 110, 488, 570);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Microscope Specimen Staining Guide', 520, 145);

    const stains = [
      { name: '1. Onion Epidermis (Allium cepa)', stain: 'Lugol\'s Iodine (I₂KI)', desc: 'Stains cellulose walls and starch granules golden-brown. Clearly reveals nuclei.' },
      { name: '2. Human Buccal Epithelium (Cheek)', stain: 'Methylene Blue (0.1%)', desc: 'Cationic dye binding acidic nuclear DNA dark blue against translucent cytoplasm.' },
      { name: '3. Euglena Viridis (Freshwater)', stain: 'Live Wet Mount', desc: 'Single-celled flagellated protist with emerald chloroplasts and phototactic eyespot.' },
      { name: '4. Paramecium Caudatum (Ciliate)', stain: 'Methyl Cellulose Trap', desc: 'Slows down cilia locomotion for observing oral groove feeding and contractile vacuoles.' },
    ];

    stains.forEach((s, idx) => {
      const y = 185 + idx * 115;
      ctx.fillStyle = '#0d9488';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(s.name, 520, y);

      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`Stain: ${s.stain}`, 520, y + 24);

      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.fillText(s.desc, 520, y + 46, 450);
    });
  });
}

/**
 * Creates and attaches all framed posters, diagrams, and SOP infographics to the classroom walls
 */
export function createAllLabWallPosters(): {
  group: THREE.Group;
  interactiveMeshes: THREE.Object3D[];
} {
  const masterGroup = new THREE.Group();
  const interactiveList: THREE.Object3D[] = [];

  // Poster specs for all 4 classroom walls
  const posterConfigs = [
    // ------------------------------------------------------------------------
    // BACK WALL (z = -11.95, facing +z)
    // ------------------------------------------------------------------------
    {
      texture: getMicroscopePosterTexture(),
      w: 2.4,
      h: 1.6,
      x: -4.5,
      y: 2.8,
      z: -11.92,
      rotY: 0,
      id: 'poster_microscope_sop',
      label: 'Microscope SOP & Optics Guide',
      action: 'Read Microscope Operation Instructions',
      station: 'biology' as const,
    },
    {
      texture: getTitrationPosterTexture(),
      w: 2.4,
      h: 1.6,
      x: 4.5,
      y: 2.8,
      z: -11.92,
      rotY: 0,
      id: 'poster_titration_sop',
      label: 'Titration Protocol & pH Chart',
      action: 'Read Titration & Burette Instructions',
      station: 'chemistry' as const,
    },
    {
      texture: getCellBiologyPosterTexture(),
      w: 2.2,
      h: 1.5,
      x: -8.8,
      y: 2.8,
      z: -11.92,
      rotY: 0,
      id: 'poster_cell_biology',
      label: 'Cell Biology & Cytology Atlas',
      action: 'Inspect Cell Organelles & Stains',
      station: 'biology' as const,
    },
    {
      texture: getPeriodicTableMasterPosterTexture(),
      w: 2.6,
      h: 1.6,
      x: 8.8,
      y: 2.8,
      z: -11.92,
      rotY: 0,
      id: 'poster_periodic_table',
      label: 'IUPAC Periodic Table of Elements',
      action: 'Inspect Chemical Elements Registry',
      station: 'chemistry' as const,
    },

    // ------------------------------------------------------------------------
    // FRONT WALL (z = 11.95, facing -z, rotY = PI)
    // ------------------------------------------------------------------------
    {
      texture: getPhysicsCircuitsPosterTexture(),
      w: 2.4,
      h: 1.6,
      x: -4.5,
      y: 2.8,
      z: 11.92,
      rotY: Math.PI,
      id: 'poster_physics_circuits',
      label: 'DC Circuitry & Ohm\'s Law Chart',
      action: 'Read Circuit Wiring & Electrical Equations',
      station: 'physics' as const,
    },
    {
      texture: getAnalyticalSOPPosterTexture(),
      w: 2.4,
      h: 1.6,
      x: 4.5,
      y: 2.8,
      z: 11.92,
      rotY: Math.PI,
      id: 'poster_analytical_sop',
      label: 'Analytical Balance & Centrifugation SOP',
      action: 'Read Precision Weighing & Centrifuge Protocol',
      station: 'research' as const,
    },
    {
      texture: getScientificMethodPosterTexture(),
      w: 2.2,
      h: 1.5,
      x: -8.8,
      y: 2.8,
      z: 11.92,
      rotY: Math.PI,
      id: 'poster_scientific_method',
      label: 'The Scientific Method & Research Design',
      action: 'Review Empirical Hypothesis Framework',
      station: 'research' as const,
    },
    {
      texture: getLabSafetyPosterTexture(),
      w: 2.2,
      h: 1.5,
      x: 8.8,
      y: 2.8,
      z: 11.92,
      rotY: Math.PI,
      id: 'poster_lab_safety',
      label: 'Laboratory Safety & GHS Hazard Codes',
      action: 'Review Safety Rules & Emergency SOP',
      station: 'chemistry' as const,
    },

    // ------------------------------------------------------------------------
    // RIGHT WALL (x = 11.95, facing -x, rotY = -PI/2)
    // ------------------------------------------------------------------------
    {
      texture: getLabSafetyPosterTexture(),
      w: 2.2,
      h: 1.5,
      x: 11.92,
      y: 2.8,
      z: -4.0,
      rotY: -Math.PI / 2,
      id: 'poster_right_emergency',
      label: 'Emergency Deluge Shower & First Aid',
      action: 'Inspect Emergency Procedures',
      station: 'chemistry' as const,
    },
    {
      texture: getTitrationPosterTexture(),
      w: 2.2,
      h: 1.5,
      x: 11.92,
      y: 2.8,
      z: 8.0,
      rotY: -Math.PI / 2,
      id: 'poster_right_solutions',
      label: 'Volumetric Solution Preparation',
      action: 'Read Solution Molarity Equations',
      station: 'chemistry' as const,
    },

    // ------------------------------------------------------------------------
    // LEFT WALL (x = -11.95, facing +x, rotY = PI/2) between windows
    // ------------------------------------------------------------------------
    {
      texture: getMicroscopePosterTexture(),
      w: 2.0,
      h: 1.4,
      x: -11.92,
      y: 2.8,
      z: -3.0,
      rotY: Math.PI / 2,
      id: 'poster_left_optics',
      label: 'Ray Optics & Focal Length Diagram',
      action: 'Review Lens Refraction Optics',
      station: 'biology' as const,
    },
    {
      texture: getPhysicsCircuitsPosterTexture(),
      w: 2.0,
      h: 1.4,
      x: -11.92,
      y: 2.8,
      z: 3.0,
      rotY: Math.PI / 2,
      id: 'poster_left_si_units',
      label: 'SI Measurement Standards & Prefixes',
      action: 'Review Dimensional Metric Standards',
      station: 'physics' as const,
    },
  ];

  posterConfigs.forEach((cfg) => {
    const poster = createFramedPosterMesh({
      width: cfg.w,
      height: cfg.h,
      texture: cfg.texture,
      frameColor: '#0f172a',
      interactId: cfg.id,
      label: cfg.label,
      action: cfg.action,
      station: cfg.station,
    });

    poster.position.set(cfg.x, cfg.y, cfg.z);
    poster.rotation.y = cfg.rotY;
    masterGroup.add(poster);

    poster.traverse((child) => {
      if (child.userData && child.userData.isInteractive) {
        interactiveList.push(child);
      }
    });
  });

  return {
    group: masterGroup,
    interactiveMeshes: interactiveList,
  };
}
