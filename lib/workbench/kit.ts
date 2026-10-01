import * as THREE from 'three';
import { tagInteractive } from '@/lib/lab3dEquipment';
import type { Station } from '@/lib/labStore';

/**
 * Small building blocks for the procedural practical kits (glassware, labels, a stopwatch).
 * Materials are shared so the static parts merge into few draw calls.
 */

export const MAT = {
  glass: new THREE.MeshStandardMaterial({ color: '#cfe0ea', transparent: true, opacity: 0.32, roughness: 0.05, depthWrite: false, envMapIntensity: 1.8 }),
  steel: new THREE.MeshStandardMaterial({ color: '#c9cdd2', metalness: 1, roughness: 0.28 }),
  black: new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.5 }),
  white: new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.7 }),
  wood: new THREE.MeshStandardMaterial({ color: '#c79a5b', roughness: 0.7 }),
  cork: new THREE.MeshStandardMaterial({ color: '#a8764a', roughness: 0.9 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c9a24b', metalness: 1, roughness: 0.3 }),
  paper: new THREE.MeshStandardMaterial({ color: '#fbfbf7', roughness: 0.95 }),
  potato: new THREE.MeshStandardMaterial({ color: '#efe1b0', roughness: 0.8 }),
};

/** Thin-walled glass vessel from an inner profile [(radius, height)…]. */
export function glassVessel(profile: [number, number][], segments = 24) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, segments), MAT.glass);
  m.renderOrder = 3;
  return m;
}

/** Text label as a small plane (canvas texture, released after upload by the caller's material). */
export function label(text: string, w = 0.05, h = 0.016, bg = '#f4f1e6', fg = '#111') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.round((256 * h) / w);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.round(c.height * 0.55)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
}

export function tagAll(o: THREE.Object3D, id: string, labelText: string, action: string, station: Station) {
  o.traverse((m) => tagInteractive(m, id, labelText, action, station, 'primary'));
  o.userData.keepSeparate = true;
}

/** Stopwatches by id, so a practical can read the time the student measured. */
export const stopwatches: Record<string, Stopwatch> = {};

/** A digital stopwatch on the bench. Tap to start/stop; reset by starting again. */
export class Stopwatch {
  readonly root = new THREE.Group();
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private start: number | null = null;
  elapsed = 0;
  private shown = '';

  constructor(id: string, station: Station) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.075), new THREE.MeshStandardMaterial({ color: '#1f6f5c', roughness: 0.5 }));
    body.position.y = 0.006;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    this.ctx = c.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.048, 0.018),
      new THREE.MeshStandardMaterial({ map: this.tex, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: 0.6 })
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.0125, -0.012);
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.004, 16), new THREE.MeshStandardMaterial({ color: '#d33', roughness: 0.4 }));
    button.position.set(0, 0.014, 0.02);
    this.root.add(body, screen, button);
    tagAll(this.root, id, 'Stopwatch', 'Start / stop timing', station);
    stopwatches[id] = this;
    this.draw();
  }

  get running() {
    return this.start !== null;
  }

  toggle() {
    if (this.start === null) {
      this.start = performance.now();
      this.elapsed = 0;
    } else {
      this.elapsed = (performance.now() - this.start) / 1000;
      this.start = null;
    }
    this.draw();
  }

  update() {
    if (this.start !== null) {
      this.elapsed = (performance.now() - this.start) / 1000;
      this.draw();
    }
  }

  private draw() {
    const text = this.elapsed.toFixed(2).padStart(6, ' ') + ' s';
    if (text === this.shown) return;
    this.shown = text;
    const g = this.ctx;
    g.fillStyle = '#c8d6b9';
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = '#1b2414';
    g.font = 'bold 64px monospace';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.fillText(text, 244, 50);
    this.tex.needsUpdate = true;
  }
}
