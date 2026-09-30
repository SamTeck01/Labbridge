import * as THREE from 'three';

/**
 * Visible liquids: every volume in the lab store is drawn as a real level in real glassware,
 * plus falling drops and pour streams. Geometry is tiny and rebuilt only when the level moves.
 */

function liquidMaterial(color: THREE.ColorRepresentation, opacity = 0.55) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.08,
    metalness: 0,
    depthWrite: false,
    envMapIntensity: 1.2,
  });
}

/** Liquid in a straight tube (burette, measuring cylinder, bottle body). */
export class LiquidColumn {
  readonly mesh: THREE.Mesh;
  private meniscus: THREE.Mesh | null = null;
  constructor(parent: THREE.Object3D, base: THREE.Vector3, private radius: number, private maxHeight: number, color: THREE.ColorRepresentation, withMeniscus = false) {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 20, 1);
    geo.translate(0, 0.5, 0);
    this.mesh = new THREE.Mesh(geo, liquidMaterial(color));
    this.mesh.position.copy(base);
    this.mesh.renderOrder = 2;
    this.mesh.userData.keepSeparate = true;
    parent.add(this.mesh);
    if (withMeniscus) {
      // Dark curved band at the surface: what you read the burette against
      this.meniscus = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, radius * 0.5, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: '#1e3a5f', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })
      );
      this.meniscus.userData.keepSeparate = true;
      this.meniscus.renderOrder = 3;
      parent.add(this.meniscus);
    }
    this.setFraction(0);
  }
  /** 0 = empty, 1 = full to maxHeight. */
  setFraction(f: number) {
    const h = Math.max(0.0001, Math.min(1, f) * this.maxHeight);
    this.mesh.scale.set(this.radius, h, this.radius);
    this.mesh.visible = f > 0.002;
    if (this.meniscus) {
      this.meniscus.visible = this.mesh.visible;
      this.meniscus.position.copy(this.mesh.position).add(new THREE.Vector3(0, h - this.radius * 0.2, 0));
    }
  }
  /** Height of the liquid surface above the base (m). */
  surfaceHeight() {
    return this.mesh.visible ? this.mesh.scale.y : 0;
  }
  get material() {
    return this.mesh.material as THREE.MeshStandardMaterial;
  }
}

/**
 * Liquid in a vessel of varying radius (conical flask). Level follows volume exactly, and the
 * surface dips into a vortex when stirred.
 */
export class LiquidInVessel {
  readonly mesh: THREE.Mesh;
  private heightForVolume: (ml: number) => number;
  private lastH = -1;
  private lastDip = -1;

  /** profile: inner radius (m) at height y (m), ascending in y. */
  constructor(parent: THREE.Object3D, base: THREE.Vector3, private profile: [number, number][], color: THREE.ColorRepresentation) {
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), liquidMaterial(color, 0.6));
    this.mesh.position.copy(base);
    this.mesh.renderOrder = 2;
    this.mesh.userData.keepSeparate = true;
    parent.add(this.mesh);

    // Volume table by integrating pi r^2 dy
    const table: [number, number][] = [[0, 0]];
    let vol = 0;
    const top = profile[profile.length - 1][0];
    const dy = top / 200;
    for (let y = dy; y <= top; y += dy) {
      const r = this.radiusAt(y - dy / 2);
      vol += Math.PI * r * r * dy * 1e6; // m^3 -> mL
      table.push([vol, y]);
    }
    this.heightForVolume = (ml) => {
      for (let i = 1; i < table.length; i++) {
        if (table[i][0] >= ml) {
          const [v0, y0] = table[i - 1];
          const [v1, y1] = table[i];
          return y0 + ((ml - v0) / (v1 - v0 || 1)) * (y1 - y0);
        }
      }
      return top;
    };
  }

  radiusAt(y: number) {
    const p = this.profile;
    if (y <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i++) {
      if (p[i][0] >= y) {
        const t = (y - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
        return p[i - 1][1] + t * (p[i][1] - p[i - 1][1]);
      }
    }
    return p[p.length - 1][1];
  }

  surfaceHeight() {
    return Math.max(0, this.lastH);
  }

  /** volumeMl: liquid volume; swirl: 0..1 stir strength (vortex depth). */
  update(volumeMl: number, swirl: number) {
    const h = this.heightForVolume(Math.max(0, volumeMl));
    const dip = Math.min(h * 0.6, 0.012 * swirl);
    if (Math.abs(h - this.lastH) < 0.0003 && Math.abs(dip - this.lastDip) < 0.0003) return;
    this.lastH = h;
    this.lastDip = dip;
    this.mesh.visible = h > 0.0008;
    if (!this.mesh.visible) return;

    const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
    const rings = 10;
    for (let i = 0; i <= rings; i++) {
      const y = (h * i) / rings;
      pts.push(new THREE.Vector2(this.radiusAt(y), y));
    }
    // Surface: flat, or a parabolic vortex when stirred
    const rTop = this.radiusAt(h);
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const r = rTop * (1 - t);
      pts.push(new THREE.Vector2(r, h - dip * t * t));
    }
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.LatheGeometry(pts, 28);
  }

  get material() {
    return this.mesh.material as THREE.MeshStandardMaterial;
  }
}

/** Pool of falling drops (burette tip, dropper). */
export class Drops {
  private mesh: THREE.InstancedMesh;
  private live: { pos: THREE.Vector3; vel: number; floorY: number; onLand?: () => void }[] = [];
  private tmp = new THREE.Matrix4();
  constructor(scene: THREE.Object3D, color: THREE.ColorRepresentation, private size = 0.0022, max = 24) {
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), liquidMaterial(color, 0.75), max);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.userData.keepSeparate = true;
    scene.add(this.mesh);
  }
  spawn(from: THREE.Vector3, floorY: number, onLand?: () => void) {
    if (this.live.length >= this.mesh.instanceMatrix.count) return;
    this.live.push({ pos: from.clone(), vel: 0, floorY, onLand });
  }
  update(delta: number) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const d = this.live[i];
      d.vel += 9.8 * delta;
      d.pos.y -= d.vel * delta;
      if (d.pos.y <= d.floorY) {
        d.onLand?.();
        this.live.splice(i, 1);
      }
    }
    this.mesh.count = this.live.length;
    this.live.forEach((d, i) => {
      // Drops stretch as they fall
      const stretch = 1 + Math.min(1.5, d.vel * 0.6);
      this.tmp.makeScale(this.size, this.size * stretch, this.size).setPosition(d.pos);
      this.mesh.setMatrixAt(i, this.tmp);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** A curved stream of liquid from a pouring lip into a target. */
export class PourStream {
  private mesh: THREE.Mesh;
  private t = 0;
  constructor(scene: THREE.Object3D, color: THREE.ColorRepresentation) {
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), liquidMaterial(color, 0.7));
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.userData.keepSeparate = true;
    scene.add(this.mesh);
  }
  /** flow 0..1 (0 hides the stream). */
  update(delta: number, from: THREE.Vector3, to: THREE.Vector3, flow: number) {
    this.t += delta;
    this.mesh.visible = flow > 0.02;
    if (!this.mesh.visible) return;
    // Liquid leaves the lip with a little forward speed, then falls
    const mid = from.clone().lerp(to, 0.35);
    mid.y = from.y - (from.y - to.y) * 0.15;
    const wobble = Math.sin(this.t * 30) * 0.0008;
    mid.x += wobble;
    const curve = new THREE.CatmullRomCurve3([from, mid, to]);
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.TubeGeometry(curve, 12, 0.0018 + flow * 0.0022, 6, false);
  }
  set color(c: THREE.ColorRepresentation) {
    (this.mesh.material as THREE.MeshStandardMaterial).color.set(c);
  }
}
