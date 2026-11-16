import * as THREE from 'three';
import { labStore, osmosisChange } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';
import { curie } from '@/lib/curie';
import { FirstPersonHands } from '@/lib/workbench/hands';
import { KnobBench, type Focus } from '@/lib/workbench/benches';
import { Holder, type HoldItem } from '@/lib/workbench/holder';
import { MAT, glassVessel, label, tagAll } from '@/lib/workbench/kit';

/**
 * Osmosis in potato strips: five boiling tubes of sucrose (0.0-0.8 M), a top-pan balance and a
 * paper towel. The student weighs each strip, puts it in a tube, leaves them (time skip), then
 * removes, blots and reweighs. Strips swell in dilute solutions and shrink in concentrated ones.
 */

export const MOLARITY = [0, 0.2, 0.4, 0.6, 0.8];

export class OsmosisBench extends KnobBench {
  protected ids = ['osm_strips', 'osm_balance', ...MOLARITY.map((_, i) => `osm_tube_${i}`)];
  private kit = new THREE.Group();
  private tubes: THREE.Group[] = [];
  private stripsInTube: THREE.Mesh[] = [];
  private loose: THREE.Mesh;
  private onBalance: number | null = null; // tube index whose strip is on the pan
  private display: { ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture };
  private masses = MOLARITY.map(() => Math.round((2.0 + Math.random() * 0.6) * 100) / 100);
  private pan = new THREE.Vector3(0.2, 0.05, 0.05);

  constructor(scene: THREE.Scene, origin: THREE.Vector3, hands: FirstPersonHands, focus: Focus) {
    const kit = new THREE.Group();
    kit.position.copy(origin);
    super(scene, kit, hands, focus);
    this.kit = kit;

    // Tile with five fresh potato strips
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.08), MAT.white);
    tile.position.set(-0.2, 0.003, 0.1);
    const strips = new THREE.Group();
    strips.add(tile);
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.05), MAT.potato);
      st.position.set(-0.24 + i * 0.02, 0.01, 0.1);
      st.name = `fresh_strip_${i}`;
      strips.add(st);
    }
    tagAll(strips, 'osm_strips', 'Potato strips (cut to the same size)', 'Weigh a strip', 'osmosis');
    this.kit.add(strips);

    // Rack with five labelled boiling tubes of sucrose
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.04), new THREE.MeshStandardMaterial({ color: '#2b5aa8', roughness: 0.5 }));
    rack.position.set(0, 0.025, -0.08);
    this.kit.add(rack);
    MOLARITY.forEach((m, i) => {
      const g = new THREE.Group();
      const tube = glassVessel([[0, 0], [0.011, 0], [0.011, 0.15], [0.012, 0.152]]);
      const sol = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.09, 14), new THREE.MeshStandardMaterial({ color: '#eef3f6', transparent: true, opacity: 0.45 }));
      sol.position.y = 0.045;
      const tag = label(`${m.toFixed(1)} M`, 0.026, 0.011);
      tag.position.set(0, 0.12, 0.0125);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.008), MAT.potato);
      strip.position.y = 0.035;
      strip.visible = false;
      g.add(tube, sol, tag, strip);
      g.position.set(-0.08 + i * 0.04, 0.0, -0.08);
      tagAll(g, `osm_tube_${i}`, `Boiling tube: ${m.toFixed(1)} M sucrose`, 'Put a strip in / take it out', 'osmosis');
      this.kit.add(g);
      this.tubes.push(g);
      this.stripsInTube.push(strip);
    });

    // Top-pan balance with a readable display, and a paper towel for blotting
    const bal = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.13), new THREE.MeshStandardMaterial({ color: '#d9dcdf', roughness: 0.4 }));
    body.position.y = 0.0175;
    const panMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.004, 24), MAT.steel);
    panMesh.position.set(0, 0.037, -0.01);
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 80;
    const ctx = c.getContext('2d')!;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.019), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.7 }));
    screen.position.set(0, 0.02, 0.0655);
    bal.add(body, panMesh, screen);
    bal.position.set(this.pan.x, 0, this.pan.z);
    tagAll(bal, 'osm_balance', 'Top-pan balance', 'Take the strip off the pan', 'osmosis');
    this.kit.add(bal);
    this.display = { ctx, tex };
    const towel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.002, 0.08), new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 1 }));
    towel.position.set(0.05, 0.001, 0.12);
    this.kit.add(towel);

    this.loose = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.05), MAT.potato);
    this.loose.visible = false;
    this.kit.add(this.loose);
    scene.add(this.kit);
    this.showMass(null);
    this.setupHands(scene, hands, origin);
  }

  // ---------------- Hands-on: carry each strip with your fingers ----------------
  protected station = 'osmosis';
  protected idleHints = ['Click the potato strips to take one', 'Put it on the balance pan, then into a tube', 'After 30 minutes: click a tube to take the strip out, blot it on the towel, weigh it'];
  private stripItem: HoldItem | null = null;
  private strip: { fresh: number | null; tube: number | null; phase: 'fresh' | 'weighed' | 'wet' | 'blotted' | 'done'; mass: number } | null = null;

  private setupHands(scene: THREE.Scene, hands: FirstPersonHands, origin: THREE.Vector3) {
    this.holder = new Holder(scene, () => this.camera, hands, origin.y, origin.clone(), {
      onPutDown: (_it, home) => {
        if (home) this.loose.visible = false;
      },
    });
    this.stripItem = this.holder.add({ id: 'strip', name: 'Potato strip', obj: this.loose, grip: 0.006, bottom: 0.004, radius: 0.012, tip: new THREE.Vector3(), freePlace: true });
    const w = (v: THREE.Vector3) => () => this.kit.localToWorld(v.clone());
    this.holder.zone({
      id: 'pan',
      name: 'balance pan',
      pos: w(this.pan.clone().add(new THREE.Vector3(0, 0.04, -0.01))),
      r: 0.04,
      accepts: (it) => it.id === 'strip' && this.onBalance === null,
      rest: () => ({ pos: this.kit.localToWorld(this.pan.clone().add(new THREE.Vector3(0, 0.045, -0.01))) }),
      onDrop: () => this.weigh(),
    });
    this.tubes.forEach((g, i) =>
      this.holder!.zone({
        id: `tube_${i}`,
        name: `${MOLARITY[i].toFixed(1)} M tube`,
        pos: w(g.position.clone().add(new THREE.Vector3(0, 0.16, 0))),
        r: 0.014,
        accepts: (it) => it.id === 'strip' && !!this.strip && this.strip.phase === 'weighed' && !this.st().tubes[i].inTube && this.st().tubes[i].final == null,
        rest: () => null,
        onDrop: () => this.intoTube(i),
      })
    );
    this.holder.zone({
      id: 'towel',
      name: 'paper towel',
      pos: w(new THREE.Vector3(0.05, 0.004, 0.12)),
      r: 0.05,
      accepts: (it) => it.id === 'strip' && this.strip?.phase === 'wet',
      rest: () => ({ pos: this.kit.localToWorld(new THREE.Vector3(0.05, 0.006, 0.12)) }),
      onDrop: () => {
        if (this.strip) this.strip.phase = 'blotted';
        soundFx.playGlassSlide();
      },
    });
  }

  /** Clicking the strips tile (a new strip) or a tube (taking a strip out after 30 min). */
  protected spawnPick(id: string) {
    if (!this.holder || !this.stripItem || this.strip && this.strip.phase !== 'done' && this.loose.visible) return false;
    const s = this.st();
    if (id === 'osm_strips') {
      const i = s.tubes.findIndex((t, k) => t.initial == null && this.kit.getObjectByName(`fresh_strip_${k}`)?.visible);
      if (i < 0) return curie.say('All the strips are used.'), true;
      const fresh = this.kit.getObjectByName(`fresh_strip_${i}`)!;
      fresh.visible = false;
      this.loose.position.copy(fresh.getWorldPosition(new THREE.Vector3()));
      this.loose.quaternion.identity();
      this.loose.visible = true;
      this.strip = { fresh: i, tube: null, phase: 'fresh', mass: this.masses[i] };
      return this.holder.pick(this.stripItem);
    }
    if (id.startsWith('osm_tube_')) {
      const i = Number(id.slice(9));
      const t = s.tubes[i];
      if (!t.inTube) return false;
      if (s.minutes < 30) return curie.say('Leave the strips in the solutions for 30 minutes first.'), true;
      this.stripsInTube[i].visible = false;
      labStore.update('osmosis', { tubes: s.tubes.map((x, k) => (k === i ? { ...x, inTube: false } : x)) });
      const mass = Math.round(t.initial! * (1 + osmosisChange(MOLARITY[i]) / 100 + (Math.random() - 0.5) * 0.01) * 100) / 100;
      this.strip = { fresh: null, tube: i, phase: 'wet', mass };
      this.loose.position.copy(this.kit.localToWorld(this.tubes[i].position.clone().add(new THREE.Vector3(0, 0.16, 0))));
      this.loose.visible = true;
      return this.holder.pick(this.stripItem);
    }
    return false;
  }

  /** On the pan: the display shows its mass. */
  private weigh() {
    const st = this.strip;
    if (!st) return;
    this.onBalance = 0;
    soundFx.playBeep();
    if (st.phase === 'fresh') {
      st.phase = 'weighed';
      this.showMass(st.mass);
    } else if (st.phase === 'wet' || st.phase === 'blotted') {
      // Unblotted, surface water adds to the mass
      const m = st.phase === 'wet' ? Math.round(st.mass * 1.04 * 100) / 100 : st.mass;
      if (st.phase === 'wet') curie.say('Blot it first: water on the surface adds to the mass.');
      this.showMass(m);
      const s = this.st();
      labStore.update('osmosis', { tubes: s.tubes.map((x, k) => (k === st.tube ? { ...x, final: m } : x)) });
      st.phase = 'done';
    } else this.showMass(st.mass);
    // Lifting it off the pan clears the display
    const off = () => {
      if (this.holder?.held?.id === 'strip' || !this.loose.visible) {
        this.onBalance = null;
        this.showMass(null);
      } else setTimeout(off, 300);
    };
    setTimeout(off, 300);
  }

  private intoTube(i: number) {
    const st = this.strip;
    if (!st) return;
    this.loose.visible = false;
    this.stripsInTube[i].visible = true;
    const s = this.st();
    labStore.update('osmosis', { tubes: s.tubes.map((x, k) => (k === i ? { ...x, initial: st.mass, inTube: true } : x)) });
    this.strip = null;
    soundFx.playDropLiquid();
  }

  private showMass(g: number | null) {
    const { ctx, tex } = this.display;
    ctx.fillStyle = '#0d2a20';
    ctx.fillRect(0, 0, 256, 80);
    ctx.fillStyle = '#7dffcf';
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(g == null ? '0.00 g' : `${g.toFixed(2)} g`, 244, 42);
    tex.needsUpdate = true;
  }

  private st() {
    return labStore.get().osmosis;
  }

  /** Move a strip with the right hand between two kit-local points. */
  private async carry(from: THREE.Vector3, to: THREE.Vector3) {
    const H = this.hands;
    const wFrom = this.kit.localToWorld(from.clone());
    const wTo = this.kit.localToWorld(to.clone());
    await H.move('right', { wrist: wFrom.clone().add(new THREE.Vector3(0.03, 0.05, 0.06)), grip: 0.15, twist: 0, flex: 0 }, 0.4);
    await H.move('right', { wrist: wFrom.clone().add(new THREE.Vector3(0.03, 0.015, 0.05)), grip: 0.55 }, 0.2);
    this.loose.position.copy(from);
    this.loose.visible = true;
    H.grab('right', this.loose);
    await H.move('right', { wrist: wTo.clone().add(new THREE.Vector3(0.03, 0.06, 0.06)) }, 0.5);
    await H.move('right', { wrist: wTo.clone().add(new THREE.Vector3(0.03, 0.02, 0.05)) }, 0.2);
    H.release('right', this.kit);
    this.loose.visible = false;
    await H.move('right', { grip: 0.15 }, 0.1);
  }

  protected async perform(id: string) {
    const s = this.st();
    const panTop = this.pan.clone().add(new THREE.Vector3(0, 0.045, -0.01));
    if (id === 'osm_strips') {
      // Weigh the next fresh strip: it goes on the pan, waiting to be put in its tube
      if (this.onBalance !== null) return curie.say('There is already a strip on the balance. Put it in a tube first.');
      const i = s.tubes.findIndex((t) => t.initial == null);
      if (i < 0) return curie.say('All five strips are weighed.');
      await this.carry(new THREE.Vector3(-0.24 + i * 0.02, 0.01, 0.1), panTop);
      this.kit.getObjectByName(`fresh_strip_${i}`)!.visible = false;
      this.onBalance = i;
      this.showMass(this.masses[i]);
      const tubes = s.tubes.map((t, k) => (k === i ? { ...t, initial: this.masses[i] } : t));
      labStore.update('osmosis', { tubes });
      soundFx.playBeep();
      await this.hands.rest('right', 0.4);
    } else if (id.startsWith('osm_tube_')) {
      const i = Number(id.slice('osm_tube_'.length));
      const t = s.tubes[i];
      const tubeTop = this.tubes[i].position.clone().add(new THREE.Vector3(0, 0.16, 0));
      if (this.onBalance === i && !t.inTube && t.final == null) {
        // Strip from the balance into its tube
        await this.carry(panTop, tubeTop);
        this.onBalance = null;
        this.showMass(null);
        this.stripsInTube[i].visible = true;
        labStore.update('osmosis', { tubes: s.tubes.map((x, k) => (k === i ? { ...x, inTube: true } : x)) });
        soundFx.playDropLiquid();
      } else if (t.inTube) {
        if (s.minutes < 30) return curie.say('Leave the strips in the solutions for 30 minutes first.');
        if (this.onBalance !== null) return curie.say('Clear the balance first.');
        // Out of the tube, blot on the towel, back on the balance
        this.stripsInTube[i].visible = false;
        await this.carry(tubeTop, new THREE.Vector3(0.05, 0.01, 0.12));
        soundFx.playGlassSlide();
        await this.carry(new THREE.Vector3(0.05, 0.01, 0.12), panTop);
        const final = Math.round(t.initial! * (1 + osmosisChange(MOLARITY[i]) / 100 + (Math.random() - 0.5) * 0.01) * 100) / 100;
        this.onBalance = i;
        this.showMass(final);
        labStore.update('osmosis', { tubes: s.tubes.map((x, k) => (k === i ? { ...x, inTube: false, final } : x)) });
        soundFx.playBeep();
        await this.hands.rest('right', 0.4);
      } else if (t.initial == null) {
        curie.say('Weigh a strip first: tap the potato strips.');
      }
    } else if (id === 'osm_balance') {
      if (this.onBalance === null) return;
      // Clear the pan (finished strips go on the tile)
      await this.carry(panTop, new THREE.Vector3(-0.2, 0.012, 0.1));
      this.onBalance = null;
      this.showMass(null);
      await this.hands.rest('right', 0.4);
    }
  }

  update(delta = 1 / 60) {
    this.updateKnobHand(delta);
    // Strips visibly swell or shrink while they sit in solution
    const s = this.st();
    this.stripsInTube.forEach((strip, i) => {
      const k = 1 + (osmosisChange(MOLARITY[i]) / 100) * Math.min(1, s.minutes / 30) * 0.5;
      strip.scale.set(k, 1, k);
    });
  }

  reset() {
    this.strip = null;
    this.loose.visible = false;
    this.onBalance = null;
    this.showMass(null);
    this.stripsInTube.forEach((s) => (s.visible = false));
    for (let i = 0; i < 5; i++) {
      const f = this.kit.getObjectByName(`fresh_strip_${i}`);
      if (f) f.visible = true;
    }
    this.masses = MOLARITY.map(() => Math.round((2.0 + Math.random() * 0.6) * 100) / 100);
  }
}
