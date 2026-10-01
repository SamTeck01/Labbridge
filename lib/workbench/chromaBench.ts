import * as THREE from 'three';
import { labStore, INKS } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';
import { curie } from '@/lib/curie';
import { FirstPersonHands } from '@/lib/workbench/hands';
import { BenchBase, type Focus } from '@/lib/workbench/benches';
import { MAT, glassVessel, label, tagAll } from '@/lib/workbench/kit';

/**
 * Paper chromatography: draw a pencil baseline, spot three inks, hang the paper in a beaker of
 * solvent and watch the solvent front rise and separate the dyes. The paper is a canvas texture,
 * redrawn only when something on it changes.
 */

const PAPER_W = 0.09;
const PAPER_H = 0.16;
const BASELINE = 0.15; // fraction of the paper height
const FRONT_MAX = 0.85; // where the solvent front stops rising
const SPOT_X = [0.25, 0.5, 0.75];

export class ChromaBench extends BenchBase {
  protected ids = ['chroma_pencil', 'chroma_inks', 'chroma_paper', 'chroma_beaker'];
  private kit = new THREE.Group();
  private paper: THREE.Mesh;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private drawnFront = -1;
  private drawnKey = '';
  private onBench = new THREE.Vector3(-0.14, 0.002, 0.1);
  private inBeaker = new THREE.Vector3(0.08, 0.012, -0.02);

  constructor(scene: THREE.Scene, origin: THREE.Vector3, hands: FirstPersonHands, focus: Focus) {
    const kit = new THREE.Group();
    kit.position.copy(origin);
    super(scene, kit, hands, focus);
    this.kit = kit;

    // Beaker with a shallow layer of solvent, a glass rod across the top to hang the paper from
    const beaker = new THREE.Group();
    beaker.add(glassVessel([[0, 0], [0.045, 0], [0.045, 0.2], [0.048, 0.203]], 28));
    const solvent = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.012, 28), new THREE.MeshStandardMaterial({ color: '#e6eef4', transparent: true, opacity: 0.5, roughness: 0.05 }));
    solvent.position.y = 0.006;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 8), MAT.glass);
    rod.rotation.z = Math.PI / 2;
    rod.position.y = 0.205;
    beaker.add(solvent, rod);
    beaker.position.set(0.08, 0, -0.02);
    tagAll(beaker, 'chroma_beaker', 'Beaker of solvent (water)', 'Hang the paper in / take it out', 'chroma');
    this.kit.add(beaker);

    // Pencil and three ink pens
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.14, 6), new THREE.MeshStandardMaterial({ color: '#e0b100', roughness: 0.6 }));
    pencil.rotation.z = Math.PI / 2;
    pencil.position.set(-0.12, 0.004, 0.2);
    tagAll(pencil, 'chroma_pencil', 'Pencil', 'Draw the baseline (pencil, not pen: it won’t run)', 'chroma');
    this.kit.add(pencil);
    const inks = new THREE.Group();
    INKS.forEach((ink, i) => {
      const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.13, 10), new THREE.MeshStandardMaterial({ color: ink.dyes[0].colour, roughness: 0.4 }));
      pen.rotation.z = Math.PI / 2;
      pen.position.set(-0.12, 0.005, -0.06 + i * 0.022);
      inks.add(pen);
      const tag = label(ink.name, 0.03, 0.01);
      tag.rotation.x = -Math.PI / 2;
      tag.position.set(-0.03, 0.002, -0.06 + i * 0.022);
      inks.add(tag);
    });
    tagAll(inks, 'chroma_inks', 'Inks: A, B and the unknown', 'Spot all three on the baseline', 'chroma');
    this.kit.add(inks);

    // Chromatography paper (canvas texture), lying on the bench to start with
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 224;
    this.ctx = c.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.paper = new THREE.Mesh(new THREE.PlaneGeometry(PAPER_W, PAPER_H), new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.95, side: THREE.DoubleSide }));
    this.paper.geometry.translate(0, PAPER_H / 2, 0);
    tagAll(this.paper, 'chroma_paper', 'Chromatography paper', 'Pick up / put down', 'chroma');
    this.kit.add(this.paper);
    this.placePaper(false);
    scene.add(this.kit);
    this.redraw();
  }

  private st() {
    return labStore.get().chroma;
  }

  /** Paper lying flat on the bench, or hanging in the beaker from the rod. */
  private placePaper(hanging: boolean) {
    if (hanging) {
      this.paper.position.copy(this.inBeaker);
      this.paper.rotation.set(0, 0, 0);
    } else {
      this.paper.position.copy(this.onBench);
      this.paper.rotation.set(-Math.PI / 2, 0, 0);
    }
  }

  private redraw() {
    const s = this.st();
    const key = `${s.baseline}|${s.spots}|${s.front.toFixed(3)}`;
    if (key === this.drawnKey) return;
    this.drawnKey = key;
    const g = this.ctx;
    const W = 128;
    const H = 224;
    const y = (f: number) => H * (1 - f); // fraction up the paper -> canvas y
    g.fillStyle = '#fbfbf6';
    g.fillRect(0, 0, W, H);
    // Wetted region below the solvent front
    if (s.front > 0) {
      g.fillStyle = '#e8eef2';
      g.fillRect(0, y(s.front), W, H - y(s.front));
      g.strokeStyle = '#b8c7d2';
      g.beginPath();
      g.moveTo(0, y(s.front));
      g.lineTo(W, y(s.front));
      g.stroke();
    }
    if (s.baseline) {
      g.strokeStyle = '#555';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(6, y(BASELINE));
      g.lineTo(W - 6, y(BASELINE));
      g.stroke();
    }
    // Spots: each dye travels Rf x (front - baseline) once the solvent passes it
    for (let i = 0; i < s.spots; i++) {
      INKS[i].dyes.forEach((d) => {
        const run = Math.max(0, s.front - BASELINE);
        const at = BASELINE + d.rf * run;
        const spread = 4 + run * 10;
        const grad = g.createRadialGradient(W * SPOT_X[i], y(at), 0, W * SPOT_X[i], y(at), spread);
        grad.addColorStop(0, d.colour);
        grad.addColorStop(1, d.colour + '00');
        g.fillStyle = grad;
        g.beginPath();
        g.ellipse(W * SPOT_X[i], y(at), spread, spread * 0.8, 0, 0, Math.PI * 2);
        g.fill();
      });
    }
    this.tex.needsUpdate = true;
  }

  protected async perform(id: string) {
    const H = this.hands;
    const s = this.st();
    const paperWorld = () => this.paper.getWorldPosition(new THREE.Vector3());
    if (id === 'chroma_pencil') {
      if (s.inSolvent || s.removed) return;
      const p = paperWorld();
      await H.move('right', { wrist: p.clone().add(new THREE.Vector3(-0.03, 0.03, 0.06)), grip: 0.6, twist: 0, flex: 0.3 }, 0.5);
      await H.move('right', { wrist: p.clone().add(new THREE.Vector3(0.05, 0.03, 0.06)) }, 0.6);
      labStore.update('chroma', { baseline: true });
      soundFx.playGlassSlide();
      await H.rest('right', 0.45);
    } else if (id === 'chroma_inks') {
      if (s.inSolvent || s.removed) return;
      if (!s.baseline) curie.say('Draw a pencil baseline first, so you can measure from it.');
      const p = paperWorld();
      for (let i = s.spots; i < INKS.length; i++) {
        await H.move('right', { wrist: p.clone().add(new THREE.Vector3(-0.05 + i * 0.025, 0.03, 0.05)), grip: 0.6, flex: 0.3 }, 0.35);
        await H.move('right', { wrist: p.clone().add(new THREE.Vector3(-0.05 + i * 0.025, 0.012, 0.05)) }, 0.12);
        labStore.update('chroma', { spots: i + 1 });
        soundFx.playDropLiquid();
        await H.move('right', { wrist: p.clone().add(new THREE.Vector3(-0.05 + i * 0.025, 0.03, 0.05)) }, 0.12);
      }
      await H.rest('right', 0.45);
    } else if (id === 'chroma_paper' || id === 'chroma_beaker') {
      if (!s.inSolvent && !s.removed) {
        if (s.spots < INKS.length) return curie.say('Spot all three inks on the baseline before it goes in.');
        // Lift the paper and hang it from the rod, baseline just above the solvent
        const from = paperWorld();
        await H.move('right', { wrist: from.clone().add(new THREE.Vector3(0.03, 0.04, 0.06)), grip: 0.55 }, 0.45);
        this.placePaper(true);
        const to = paperWorld().add(new THREE.Vector3(0, PAPER_H, 0));
        await H.move('right', { wrist: to.clone().add(new THREE.Vector3(0.03, 0.02, 0.06)) }, 0.6);
        labStore.update('chroma', { inSolvent: true });
        soundFx.playGlassSlide();
        curie.say('Watch the solvent creep up the paper. Take it out before the front reaches the top, and mark where it got to.');
        await H.rest('right', 0.45);
      } else if (s.inSolvent) {
        const top = paperWorld().add(new THREE.Vector3(0, PAPER_H, 0));
        await H.move('right', { wrist: top.clone().add(new THREE.Vector3(0.03, 0.02, 0.06)), grip: 0.55 }, 0.45);
        this.placePaper(false);
        labStore.update('chroma', { inSolvent: false, removed: true });
        soundFx.playGlassSlide();
        await H.rest('right', 0.45);
      }
    }
  }

  update(delta: number) {
    const s = this.st();
    if (s.inSolvent && s.front < FRONT_MAX) {
      // Capillary rise slows as the front climbs (~25 s for the full run)
      const rate = 0.06 * (1.2 - s.front);
      labStore.update('chroma', { front: Math.min(FRONT_MAX, Math.max(0.02, s.front + rate * delta)) });
    }
    if (Math.abs(s.front - this.drawnFront) > 0.004 || this.drawnFront < 0) {
      this.drawnFront = s.front;
      this.redraw();
    } else {
      this.redraw();
    }
  }

  protected isAnimatingExtra() {
    const s = this.st();
    return s.inSolvent && s.front < FRONT_MAX;
  }

  reset() {
    this.placePaper(false);
    this.drawnKey = '';
    this.redraw();
  }

  /** Geometry the measuring dialog needs (fractions of the paper height). */
  static readonly geometry = { BASELINE, FRONT_MAX };
}
