import * as THREE from 'three';
import { labStore, obscureTime } from '@/lib/labStore';
import { soundFx } from '@/lib/soundEffects';
import { curie } from '@/lib/curie';
import { FirstPersonHands } from '@/lib/workbench/hands';
import { BenchBase, type Focus } from '@/lib/workbench/benches';
import { LiquidInVessel, PourStream } from '@/lib/workbench/liquids';
import { MAT, Stopwatch, glassVessel, label, tagAll } from '@/lib/workbench/kit';

/**
 * Rates of reaction: sodium thiosulfate + hydrochloric acid -> sulfur precipitate. The conical flask
 * stands on paper marked with a black cross; the student times how long until the cloudy yellow
 * sulfur hides the cross, for several thiosulfate concentrations (rate ∝ concentration).
 */

// Inner profile of the 250 cm3 conical flask as (height, radius) pairs
const FLASK: [number, number][] = [
  [0, 0.04], [0.004, 0.044], [0.06, 0.03], [0.1, 0.017], [0.12, 0.015], [0.14, 0.015],
];
/** (height, radius) -> lathe (radius, height), closed at the base. */
const toLathe = (p: [number, number][]): [number, number][] => [[0, 0], ...p.map(([y, r]) => [r, y] as [number, number])];
const STOCK = [10, 20, 30, 40, 50]; // cm3 of thiosulfate stock (made up to 50 cm3 with water)

export class RatesBench extends BenchBase {
  protected ids = ['rates_flask', 'rates_acid', 'rates_watch', ...STOCK.map((v) => `rates_thio_${v}`)];
  private kit = new THREE.Group();
  private flask: LiquidInVessel;
  private flaskBase = new THREE.Vector3();
  private stream: PourStream;
  private pour: { from: () => THREE.Vector3; to: THREE.Vector3 } | null = null;
  private bottles: Record<number, THREE.Group> = {};
  private acidCyl = new THREE.Group();
  readonly watch = new Stopwatch('rates_watch', 'rates');
  private cloud = 0;
  private flaskVolume = 0;

  constructor(scene: THREE.Scene, origin: THREE.Vector3, hands: FirstPersonHands, focus: Focus) {
    const kit = new THREE.Group();
    kit.position.copy(origin);
    super(scene, kit, hands, focus);
    this.kit = kit;

    // White paper with a bold black cross; the flask stands on it
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.001, 0.16), MAT.paper);
    paper.position.set(0, 0.0005, 0.02);
    const x1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.0012, 0.012), MAT.black);
    x1.rotation.y = Math.PI / 4;
    x1.position.set(0, 0.0012, 0.02);
    const x2 = x1.clone();
    x2.rotation.y = -Math.PI / 4;
    this.kit.add(paper, x1, x2);

    const flaskGlass = glassVessel([...toLathe(FLASK), [0.016, 0.15]]);
    this.flaskBase.set(0, 0.0015, 0.02);
    flaskGlass.position.copy(this.flaskBase);
    const flaskGroup = new THREE.Group();
    flaskGroup.add(flaskGlass);
    tagAll(flaskGroup, 'rates_flask', 'Conical flask on the cross', 'Empty & rinse for the next run', 'rates');
    this.kit.add(flaskGroup);
    scene.add(this.kit);
    this.kit.updateMatrixWorld(true);
    this.flask = new LiquidInVessel(scene, this.kit.localToWorld(this.flaskBase.clone()), FLASK.map(([y, r]) => [y, r - 0.002]), '#eef4f8');

    // Five reagent bottles of thiosulfate mixtures (stock made up to 50 cm3 with water)
    STOCK.forEach((v, i) => {
      const g = new THREE.Group();
      const body = glassVessel([[0, 0], [0.024, 0], [0.024, 0.07], [0.012, 0.085], [0.01, 0.095]]);
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 18), new THREE.MeshStandardMaterial({ color: '#e8f0f6', transparent: true, opacity: 0.55, roughness: 0.1 }));
      liquid.position.y = 0.031;
      const tag = label(`${v} cm³`, 0.034, 0.014);
      tag.position.set(0, 0.045, 0.0245);
      g.add(body, liquid, tag);
      g.position.set(-0.24 + i * 0.055, 0, -0.1);
      tagAll(g, `rates_thio_${v}`, `Sodium thiosulfate: ${v} cm³ stock + ${50 - v} cm³ water`, 'Pour into the flask', 'rates');
      this.kit.add(g);
      this.bottles[v] = g;
    });

    // Measuring cylinder of 10 cm3 dilute HCl
    const cyl = glassVessel([[0, 0], [0.012, 0], [0.012, 0.16], [0.014, 0.165]]);
    const acid = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 14), new THREE.MeshStandardMaterial({ color: '#f1f6fb', transparent: true, opacity: 0.5 }));
    acid.position.y = 0.036;
    acid.name = 'acid_liquid';
    const atag = label('HCl', 0.022, 0.01);
    atag.position.set(0, 0.11, 0.0125);
    this.acidCyl.add(cyl, acid, atag);
    this.acidCyl.position.set(0.16, 0, 0.0);
    tagAll(this.acidCyl, 'rates_acid', '10 cm³ dilute hydrochloric acid', 'Add the acid (start the stopwatch!)', 'rates');
    this.kit.add(this.acidCyl);

    this.watch.root.position.set(0.15, 0, 0.16);
    this.watch.root.rotation.y = -0.3;
    this.kit.add(this.watch.root);

    this.stream = new PourStream(scene, '#eef4f8');
  }

  private st() {
    return labStore.get().rates;
  }

  /** Pick up a vessel group, pour into the flask while the volume rises, put it back. */
  private async pourFrom(vessel: THREE.Group, ml: number, onDone: () => void) {
    const H = this.hands;
    const home = vessel.position.clone();
    const homeQ = vessel.quaternion.clone();
    const grab = vessel.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.05, 0));
    await H.move('right', { wrist: grab.clone().add(new THREE.Vector3(0.03, 0.04, 0.07)), grip: 0.15, twist: 0, flex: 0 }, 0.45);
    await H.move('right', { wrist: grab.clone().add(new THREE.Vector3(0.03, 0, 0.05)) }, 0.2);
    await H.move('right', { grip: 0.65 }, 0.15);
    H.grab('right', vessel);
    const mouth = this.kit.localToWorld(this.flaskBase.clone().add(new THREE.Vector3(0, 0.15, 0)));
    await H.move('right', { wrist: mouth.clone().add(new THREE.Vector3(0.09, 0.08, 0.05)) }, 0.55);
    await H.move('right', { twist: 1.7 }, 0.5);
    const lip = () => vessel.localToWorld(new THREE.Vector3(0, 0.09, 0));
    this.pour = { from: lip, to: mouth };
    soundFx.playDropLiquid();
    const start = this.flaskVolume;
    for (let i = 1; i <= 10; i++) {
      this.flaskVolume = start + (ml * i) / 10;
      await H.wait(0.08);
    }
    this.pour = null;
    onDone();
    await H.move('right', { twist: 0 }, 0.4);
    await H.move('right', { wrist: grab.clone().add(new THREE.Vector3(0.03, 0, 0.05)) }, 0.55);
    H.release('right', this.kit);
    vessel.position.copy(home);
    vessel.quaternion.copy(homeQ);
    await H.move('right', { grip: 0.15 }, 0.12);
    await H.rest('right', 0.45);
  }

  protected async perform(id: string) {
    const s = this.st();
    if (id === 'rates_watch') {
      const at = this.watch.root.getWorldPosition(new THREE.Vector3());
      await this.press(this.hands.sideFor(at), at.clone().add(new THREE.Vector3(0, 0.012, 0)), () => {
        this.watch.toggle();
        soundFx.playClick();
      });
    } else if (id.startsWith('rates_thio_')) {
      if (s.thioCm3) {
        curie.say('The flask already has a mixture in it. Empty and rinse it first (tap the flask).');
        return;
      }
      const v = Number(id.slice('rates_thio_'.length));
      await this.pourFrom(this.bottles[v], 50, () => labStore.update('rates', { thioCm3: v, acidAdded: false, startedAt: null, obscureAfter: obscureTime(v) * (0.95 + Math.random() * 0.1) }));
    } else if (id === 'rates_acid') {
      if (!s.thioCm3) {
        curie.say('Thiosulfate first: pour one of the mixtures into the flask, then add the acid.');
        return;
      }
      if (s.acidAdded) return;
      await this.pourFrom(this.acidCyl, 10, () => {
        labStore.update('rates', { acidAdded: true, startedAt: performance.now() });
        curie.say('Acid in! Look down through the flask at the cross and stop the clock when you can no longer see it.');
      });
    } else if (id === 'rates_flask') {
      if (!s.thioCm3) return;
      // Empty into the sink and rinse
      const H = this.hands;
      const at = this.kit.localToWorld(this.flaskBase.clone().add(new THREE.Vector3(0, 0.1, 0)));
      await H.move('right', { wrist: at.clone().add(new THREE.Vector3(0.04, 0.02, 0.05)), grip: 0.6 }, 0.45);
      await H.wait(0.4);
      this.flaskVolume = 0;
      this.cloud = 0;
      labStore.update('rates', { thioCm3: 0, acidAdded: false, startedAt: null });
      soundFx.playGlassSlide();
      await H.rest('right', 0.45);
    }
  }

  update(delta: number) {
    this.watch.update();
    const s = this.st();
    // Sulfur precipitate: milky yellow cloud thickening; the cross is hidden at cloud = 1
    if (s.acidAdded && s.startedAt != null) {
      const elapsed = (performance.now() - s.startedAt) / 1000;
      this.cloud = Math.min(1.25, Math.pow(elapsed / s.obscureAfter, 1.4));
    }
    const m = this.flask.material;
    m.color.set('#eef4f8').lerp(new THREE.Color('#efe6b0'), Math.min(1, this.cloud));
    m.opacity = 0.35 + Math.min(1, this.cloud) * 0.63;
    this.flask.update(this.flaskVolume, 0);
    if (this.pour) this.stream.update(delta, this.pour.from(), this.pour.to, 1);
    else this.stream.update(delta, new THREE.Vector3(), new THREE.Vector3(), 0);
  }

  protected isAnimatingExtra() {
    const s = this.st();
    return this.watch.running || (s.acidAdded && this.cloud < 1.25);
  }

  /** Seconds since the acid went in and the true time the cross disappears (for scoring). */
  get trueTime() {
    return this.st().obscureAfter;
  }

  reset() {
    this.flaskVolume = 0;
    this.cloud = 0;
  }
}
