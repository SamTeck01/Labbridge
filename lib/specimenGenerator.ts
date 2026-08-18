/**
 * High-Fidelity Biological Specimen Procedural Canvas Generator
 * Generates ultra-realistic cellular structures for compound microscope optical simulation.
 */

export interface SpecimenInfo {
  id: string;
  name: string;
  scientificName: string;
  category: 'Cytology' | 'Hematology' | 'Microbiology' | 'Botany' | 'Phycology';
  magnificationOptimal: number; // e.g. 40x or 100x
  optimalFocusHeight: number; // 0 to 1
  description: string;
  stain: string;
  structures: string[];
}

export const SPECIMEN_CATALOG: SpecimenInfo[] = [
  {
    id: 'allium_cepa',
    name: 'Onion Bulb Epidermis',
    scientificName: 'Allium cepa',
    category: 'Cytology',
    magnificationOptimal: 400,
    optimalFocusHeight: 0.52,
    description: 'Classic plant epidermal peel stained with Iodine-Potassium Iodide, revealing rectangular cell walls, translucent cytoplasm, distinct stained nuclei, and large central vacuoles.',
    stain: "Lugol's Iodine / Methylene Blue",
    structures: ['Cellulose Cell Wall', 'Prominent Nucleus & Nucleolus', 'Cytoplasm', 'Central Vacuole Boundary'],
  },
  {
    id: 'blood_smear',
    name: 'Human Peripheral Blood Smear',
    scientificName: 'Homo sapiens (Blood)',
    category: 'Hematology',
    magnificationOptimal: 1000,
    optimalFocusHeight: 0.48,
    description: 'Thin blood film stained with Wright-Giemsa stain showing numerous biconcave non-nucleated erythrocytes, multi-lobed neutrophilic granulocytes, spherical lymphocytes, and small platelet clusters.',
    stain: 'Wright-Giemsa Stain',
    structures: ['Biconcave Erythrocytes (RBCs)', 'Segmented Neutrophil (Granulocyte)', 'Small Lymphocyte', 'Thrombocyte (Platelet) Clusters'],
  },
  {
    id: 'paramecium',
    name: 'Paramecium Caudatum',
    scientificName: 'Paramecium caudatum',
    category: 'Microbiology',
    magnificationOptimal: 400,
    optimalFocusHeight: 0.55,
    description: 'Freshwater ciliated protist displaying characteristic slipper-like morphology, pellicular surface with peripheral cilia, large kidney-shaped macronucleus, oral groove, and radiating contractile vacuoles.',
    stain: 'Vital Janus Green & Neutral Red',
    structures: ['Pellicle & Coordinated Cilia', 'Reniform Macronucleus', 'Contractile Vacuoles (Radial Canals)', 'Cytostome (Oral Groove)'],
  },
  {
    id: 'stem_cross_section',
    name: 'Helianthus Dicot Stem (C.S.)',
    scientificName: 'Helianthus annuus (Stem)',
    category: 'Botany',
    magnificationOptimal: 100,
    optimalFocusHeight: 0.50,
    description: 'Transverse cross-section of young dicotyledonous sunflower stem stained with Safranin-Fast Green showing concentric ring of open collateral vascular bundles, thick-walled xylem vessels, phloem, sclerenchyma fiber caps, and central pith.',
    stain: 'Safranin O & Fast Green FCF',
    structures: ['Lignified Xylem Vessels', 'Phloem Sieve Elements', 'Sclerenchyma Fiber Cap', 'Pith Parenchyma Matrix'],
  },
  {
    id: 'marine_diatoms',
    name: 'Marine Diatom Frustules',
    scientificName: 'Bacillariophyta (Mixed)',
    category: 'Phycology',
    magnificationOptimal: 400,
    optimalFocusHeight: 0.46,
    description: 'Strew slide of cleaned marine diatom frustules showing exquisitely sculptured siliceous valves with punctate striae, raphe fissures, and geometric radial/bilateral symmetry.',
    stain: 'Unstained Silica High-Refractive Mount',
    structures: ['Siliceous Epitheca / Hypotheca', 'Punctate Areolae Pattern', 'Central Raphe Canal', 'Radial Symmetry Costae'],
  },
];

/**
 * Renders high-resolution specimen imagery to a 2D Canvas context
 */
export function drawSpecimenToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  specimenId: string,
  magnification: number, // 40, 100, 400, 1000
  offsetX: number = 0,
  offsetY: number = 0,
  focusSharpness: number = 1.0, // 0 (completely blurred) to 1.0 (crisp)
  lightIntensity: number = 1.0,
  diaphragmAperture: number = 0.8
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Background Illumination Field
  const radius = Math.min(width, height) / 2;
  const cx = width / 2;
  const cy = height / 2;

  // Substage Light Color Temperature
  const lightLuminance = Math.min(1.4, Math.max(0.1, lightIntensity));
  const baseR = Math.min(255, Math.floor(248 * lightLuminance));
  const baseG = Math.min(255, Math.floor(250 * lightLuminance));
  const baseB = Math.min(255, Math.floor(255 * lightLuminance));

  const bgGrad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  bgGrad.addColorStop(0, `rgb(${baseR}, ${baseG}, ${baseB})`);
  bgGrad.addColorStop(0.85, `rgb(${Math.floor(baseR * 0.9)}, ${Math.floor(baseG * 0.92)}, ${Math.floor(baseB * 0.95)})`);
  bgGrad.addColorStop(1, `rgb(${Math.floor(baseR * 0.65)}, ${Math.floor(baseG * 0.68)}, ${Math.floor(baseB * 0.72)})`);

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Translate by Stage Knobs X/Y
  ctx.translate(cx + offsetX, cy + offsetY);

  // Scale based on selected Objective (4x, 10x, 40x, 100x)
  const scale = magnification / 100;
  ctx.scale(scale, scale);

  // Apply optical focus blur if out of focal plane
  if (focusSharpness < 0.95) {
    const blurAmount = Math.max(0, (1.0 - focusSharpness) * 16);
    ctx.filter = `blur(${blurAmount.toFixed(1)}px)`;
  } else {
    ctx.filter = 'none';
  }

  // Draw Specific Specimen Architecture
  switch (specimenId) {
    case 'allium_cepa':
      drawOnionEpidermis(ctx);
      break;
    case 'blood_smear':
      drawBloodSmear(ctx);
      break;
    case 'paramecium':
      drawParamecium(ctx);
      break;
    case 'stem_cross_section':
      drawStemCrossSection(ctx);
      break;
    case 'marine_diatoms':
      drawMarineDiatoms(ctx);
      break;
    default:
      drawOnionEpidermis(ctx);
      break;
  }

  ctx.restore();
}

function drawOnionEpidermis(ctx: CanvasRenderingContext2D) {
  // Brick-like mosaic of elongated plant cells
  const cellWidth = 140;
  const cellHeight = 52;
  const cols = 12;
  const rows = 20;

  for (let r = -rows / 2; r < rows / 2; r++) {
    const rowOffset = (r % 2) * (cellWidth * 0.45);
    for (let c = -cols / 2; c < cols / 2; c++) {
      const x = c * cellWidth + rowOffset;
      const y = r * cellHeight;

      // Cell cytoplasm with amber/iodine tint
      ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
      ctx.strokeStyle = 'rgba(161, 98, 7, 0.75)';
      ctx.lineWidth = 3.5;

      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4, 6);
      ctx.fill();
      ctx.stroke();

      // Cellulose Cell Wall double membrane
      ctx.strokeStyle = 'rgba(113, 63, 18, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);

      // Large Golden-Brown Stained Nucleus pushed near cell periphery
      const nX = x + cellWidth * 0.65 + (Math.sin(r * 3 + c) * 12);
      const nY = y + cellHeight * 0.5 + (Math.cos(c * 2 + r) * 6);
      const nRad = 11;

      const nGrad = ctx.createRadialGradient(nX - 2, nY - 2, 2, nX, nY, nRad);
      nGrad.addColorStop(0, 'rgba(180, 83, 9, 0.95)');
      nGrad.addColorStop(0.7, 'rgba(146, 64, 14, 0.85)');
      nGrad.addColorStop(1, 'rgba(120, 53, 15, 0.9)');

      ctx.fillStyle = nGrad;
      ctx.beginPath();
      ctx.ellipse(nX, nY, nRad, nRad * 0.85, (r + c) * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Nucleolus
      ctx.fillStyle = 'rgba(69, 26, 3, 0.9)';
      ctx.beginPath();
      ctx.arc(nX - 2, nY - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Cytoplasmic strands and vacuole granules
      ctx.fillStyle = 'rgba(217, 119, 6, 0.35)';
      for (let g = 0; g < 4; g++) {
        const gx = x + 15 + ((g * 27 + r * 11) % (cellWidth - 30));
        const gy = y + 10 + ((g * 17 + c * 7) % (cellHeight - 20));
        ctx.beginPath();
        ctx.arc(gx, gy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawBloodSmear(ctx: CanvasRenderingContext2D) {
  // Dense population of pinkish-salmon biconcave Erythrocytes (RBCs)
  const count = 350;
  for (let i = 0; i < count; i++) {
    const angle = (i * 137.5 * Math.PI) / 180;
    const r = Math.sqrt(i) * 22;
    const x = Math.cos(angle) * r + (Math.sin(i * 5) * 6);
    const y = Math.sin(angle) * r + (Math.cos(i * 3) * 6);

    const rbcGrad = ctx.createRadialGradient(x, y, 2, x, y, 14);
    rbcGrad.addColorStop(0, 'rgba(254, 205, 211, 0.45)'); // Pale central pallor (biconcave depression)
    rbcGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.7)');
    rbcGrad.addColorStop(0.85, 'rgba(225, 29, 72, 0.85)');
    rbcGrad.addColorStop(1, 'rgba(190, 18, 60, 0.95)');

    ctx.fillStyle = rbcGrad;
    ctx.beginPath();
    ctx.arc(x, y, 13.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Highlighted Leukocytes (Neutrophils with segmented lobed nuclei & Lymphocyte)
  const drawNeutrophil = (nx: number, ny: number) => {
    // Cytoplasm with faint lilac granules
    const cytoGrad = ctx.createRadialGradient(nx, ny, 5, nx, ny, 25);
    cytoGrad.addColorStop(0, 'rgba(243, 232, 255, 0.95)');
    cytoGrad.addColorStop(1, 'rgba(216, 180, 254, 0.85)');
    ctx.fillStyle = cytoGrad;
    ctx.beginPath();
    ctx.arc(nx, ny, 24, 0, Math.PI * 2);
    ctx.fill();

    // 3-4 connected dark purple chromatin nuclear lobes
    ctx.fillStyle = 'rgba(88, 28, 135, 0.95)';
    const lobes = [
      { x: nx - 8, y: ny - 7, r: 7.5 },
      { x: nx + 7, y: ny - 6, r: 6.8 },
      { x: nx + 6, y: ny + 7, r: 7.2 },
      { x: nx - 7, y: ny + 6, r: 6.5 },
    ];
    lobes.forEach((l) => {
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Chromatin bridges
    ctx.strokeStyle = 'rgba(88, 28, 135, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lobes[0].x, lobes[0].y);
    ctx.lineTo(lobes[1].x, lobes[1].y);
    ctx.lineTo(lobes[2].x, lobes[2].y);
    ctx.lineTo(lobes[3].x, lobes[3].y);
    ctx.stroke();
  };

  drawNeutrophil(-80, -50);
  drawNeutrophil(110, 70);

  // Lymphocyte (Large deep purple spherical nucleus with thin rim of pale blue cytoplasm)
  const lx = -40;
  const ly = 95;
  ctx.fillStyle = 'rgba(191, 219, 254, 0.85)';
  ctx.beginPath();
  ctx.arc(lx, ly, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(76, 29, 149, 0.98)';
  ctx.beginPath();
  ctx.arc(lx + 1, ly, 15, 0, Math.PI * 2);
  ctx.fill();

  // Tiny Platelet clusters (Thrombocytes)
  ctx.fillStyle = 'rgba(147, 51, 234, 0.9)';
  for (let p = 0; p < 15; p++) {
    const px = (p * 47) % 300 - 150;
    const py = (p * 61) % 300 - 150;
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 4, py + 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParamecium(ctx: CanvasRenderingContext2D) {
  // Slipper-shaped single celled ciliate
  ctx.save();
  ctx.rotate(0.35);

  // Peripheral beating Cilia border
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.55)';
  ctx.lineWidth = 1.2;
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const rX = Math.cos(a) * 165;
    const rY = Math.sin(a) * 65;
    const outX = Math.cos(a) * 178;
    const outY = Math.sin(a) * 78;
    ctx.beginPath();
    ctx.moveTo(rX, rY);
    ctx.lineTo(outX, outY);
    ctx.stroke();
  }

  // Pellicle body
  const bodyGrad = ctx.createRadialGradient(-20, -10, 20, 0, 0, 160);
  bodyGrad.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
  bodyGrad.addColorStop(0.6, 'rgba(186, 230, 253, 0.7)');
  bodyGrad.addColorStop(1, 'rgba(56, 189, 248, 0.6)');

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = 'rgba(2, 132, 199, 0.9)';
  ctx.lineWidth = 3.5;

  ctx.beginPath();
  ctx.ellipse(0, 0, 160, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Oral Groove (Cytostome funnel)
  ctx.fillStyle = 'rgba(125, 211, 252, 0.6)';
  ctx.beginPath();
  ctx.ellipse(20, 18, 45, 18, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Large Kidney-Shaped Macronucleus
  ctx.fillStyle = 'rgba(30, 64, 175, 0.85)';
  ctx.beginPath();
  ctx.ellipse(-15, -10, 32, 18, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Compact spherical Micronucleus
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.beginPath();
  ctx.arc(-22, -18, 5, 0, Math.PI * 2);
  ctx.fill();

  // Anterior & Posterior Contractile Vacuoles with radial ampullae canals
  const drawVacuole = (vx: number, vy: number) => {
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.8)';
    ctx.lineWidth = 2;
    for (let c = 0; c < 6; c++) {
      const cAng = (c * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + Math.cos(cAng) * 22, vy + Math.sin(cAng) * 22);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(vx, vy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  drawVacuole(-95, 0);
  drawVacuole(95, -5);

  // Food vacuoles floating in endoplasm
  for (let f = 0; f < 9; f++) {
    const fx = -70 + (f * 18);
    const fy = Math.sin(f * 2.2) * 25;
    ctx.fillStyle = f % 2 === 0 ? 'rgba(234, 179, 8, 0.75)' : 'rgba(239, 68, 68, 0.7)';
    ctx.beginPath();
    ctx.arc(fx, fy, 7 + (f % 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawStemCrossSection(ctx: CanvasRenderingContext2D) {
  // Circular stem with vascular bundles arranged in concentric ring
  const stemRadius = 180;

  // Outer Epidermis & Cuticle
  ctx.strokeStyle = 'rgba(22, 101, 52, 0.9)';
  ctx.lineWidth = 4;
  ctx.fillStyle = 'rgba(240, 253, 244, 0.65)';
  ctx.beginPath();
  ctx.arc(0, 0, stemRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cortex layer
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.arc(0, 0, stemRadius - 12, 0, Math.PI * 2);
  ctx.stroke();

  // Central Pith Parenchyma cells (large hexagonal cells)
  ctx.strokeStyle = 'rgba(187, 247, 208, 0.7)';
  ctx.lineWidth = 1.5;
  for (let x = -80; x <= 80; x += 22) {
    for (let y = -80; y <= 80; y += 22) {
      if (Math.hypot(x, y) < 85) {
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // 10 Vascular Bundles in a circle
  const bundleCount = 10;
  const bundleRadius = 115;

  for (let i = 0; i < bundleCount; i++) {
    const angle = (i * Math.PI * 2) / bundleCount;
    const bx = Math.cos(angle) * bundleRadius;
    const by = Math.sin(angle) * bundleRadius;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);

    // Sclerenchyma cap (Red-stained thick fibers)
    ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
    ctx.beginPath();
    ctx.arc(0, -18, 12, Math.PI, 0);
    ctx.fill();

    // Phloem patch (Green/blue sieve tubes)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.beginPath();
    ctx.rect(-10, -14, 20, 10);
    ctx.fill();

    // Vascular Cambium line
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -3);
    ctx.lineTo(11, -3);
    ctx.stroke();

    // Xylem Vessels (Red thick ring pores)
    ctx.fillStyle = 'rgba(254, 226, 226, 0.8)';
    ctx.strokeStyle = 'rgba(185, 28, 28, 0.95)';
    ctx.lineWidth = 3;

    const xylemPores = [
      { x: -5, y: 8, r: 6 },
      { x: 5, y: 8, r: 6.5 },
      { x: 0, y: 18, r: 8 },
    ];
    xylemPores.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }
}

function drawMarineDiatoms(ctx: CanvasRenderingContext2D) {
  // Centric radial diatom (Coscinodiscus) in center
  const cx = 0;
  const cy = 0;
  const cRadius = 90;

  // Silica Shell Rim
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.9)';
  ctx.lineWidth = 4;
  ctx.fillStyle = 'rgba(240, 249, 255, 0.7)';
  ctx.beginPath();
  ctx.arc(cx, cy, cRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Intricate Areolae Pattern (Radial porous lattice)
  ctx.fillStyle = 'rgba(2, 132, 199, 0.75)';
  for (let ring = 10; ring < cRadius - 6; ring += 9) {
    const dotsInRing = Math.floor((ring * Math.PI * 2) / 10);
    for (let d = 0; d < dotsInRing; d++) {
      const a = (d * Math.PI * 2) / dotsInRing;
      const dx = Math.cos(a) * ring;
      const dy = Math.sin(a) * ring;
      ctx.beginPath();
      ctx.arc(dx, dy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Pennate boat-shaped diatom (Navicula) at upper-right
  ctx.save();
  ctx.translate(125, -75);
  ctx.rotate(-0.6);

  ctx.strokeStyle = 'rgba(3, 105, 161, 0.95)';
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(224, 242, 254, 0.8)';

  ctx.beginPath();
  ctx.moveTo(-70, 0);
  ctx.bezierCurveTo(-40, -25, 40, -25, 70, 0);
  ctx.bezierCurveTo(40, 25, -40, 25, -70, 0);
  ctx.fill();
  ctx.stroke();

  // Longitudinal Raphe Line
  ctx.strokeStyle = 'rgba(12, 74, 110, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-60, 0);
  ctx.lineTo(60, 0);
  ctx.stroke();

  // Transverse Striae ribs
  ctx.strokeStyle = 'rgba(2, 132, 199, 0.65)';
  ctx.lineWidth = 1.2;
  for (let rx = -50; rx <= 50; rx += 5) {
    ctx.beginPath();
    ctx.moveTo(rx, -16);
    ctx.lineTo(rx, 16);
    ctx.stroke();
  }

  ctx.restore();
}
