import * as THREE from 'three';
import { releaseCanvasAfterUpload } from '@/lib/scenePerf';

/** Dr. Curie's handwritten notes for today's practical, drawn as a marker-on-whiteboard texture. */
export function createWhiteboardNotes(width = 4.0, height = 2.0): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const hand = (size: number) => `${size}px "Comic Sans MS", "Segoe Print", "Bradley Hand", cursive`;
  // Slight jitter per line so it reads as handwriting rather than type.
  const write = (text: string, x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.012);
    ctx.fillStyle = color;
    ctx.font = hand(size);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  const blue = '#1d3f8f';
  const black = '#1a1a1a';
  const red = '#b3261e';
  const green = '#1f6b35';

  write("Today's Practical — Acid–Base Titration", 90, 120, 78, blue);
  ctx.strokeStyle = blue;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(90, 145);
  ctx.bezierCurveTo(600, 138, 1100, 152, 1480, 142);
  ctx.stroke();

  const steps = [
    '1. Rinse burette with NaOH, fill to 0.00 mL',
    '2. Pipette 25.0 mL 0.1 M HCl into flask',
    '3. Add 2–3 drops phenolphthalein',
    '4. Titrate — swirl! — until faint pink persists',
    '5. Record titre, repeat to ±0.10 mL',
  ];
  steps.forEach((t, i) => write(t, 110, 250 + i * 88, 56, black));

  write('HCl + NaOH → NaCl + H₂O', 1250, 300, 58, green);
  write('n = c × V', 1330, 400, 58, green);
  write('endpoint ≈ 25.0 mL', 1300, 500, 58, green);

  write('SAFETY: goggles ON · NaOH is corrosive', 110, 760, 60, red);
  write('Lab coats buttoned. No food or drink.', 110, 850, 52, red);
  write('— Dr. Curie', 1600, 940, 56, blue);

  const texture = releaseCanvasAfterUpload(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.3, depthWrite: false })
  );
  mesh.name = 'whiteboard_notes';
  return mesh;
}
