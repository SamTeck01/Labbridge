import * as THREE from 'three';

/**
 * Outlines for "what you're aiming at" (teal) and "what to do next" (amber, pulsing): an inverted
 * hull drawn just outside each mesh. Children of the meshes, so they follow anything that moves.
 */
/** A glowing edge: bright where the surface turns away from the eye, clear in the middle (works on glass). */
function outlineMaterial(color: string, width: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uWidth: { value: width }, opacity: { value: 0.9 } },
    vertexShader: `
      uniform float uWidth;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 p = position + normalize(normal) * uWidth;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float opacity;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        gl_FragColor = vec4(uColor, rim * opacity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export class Highlighter {
  private shells: THREE.Mesh[] = [];
  readonly material: THREE.ShaderMaterial;
  current: string | null = null;
  constructor(private scene: THREE.Scene, color: string, width = 0.0016) {
    this.material = outlineMaterial(color, width);
  }
  /** Outline every mesh tagged with this interactive id (null clears). */
  set(id: string | null) {
    if (id === this.current) return;
    this.clear();
    this.current = id;
    if (!id) return;
    const meshes: THREE.Mesh[] = [];
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh && m.visible && (m.material as THREE.Material).visible !== false && m.userData?.interactId === id && !m.userData.isOutline && m.geometry?.attributes?.normal) meshes.push(m);
    });
    for (const m of meshes.slice(0, 40)) {
      const shell = new THREE.Mesh(m.geometry, this.material);
      shell.userData = { isOutline: true, keepSeparate: true };
      shell.renderOrder = 6;
      shell.raycast = () => {};
      m.add(shell);
      this.shells.push(shell);
    }
  }
  clear() {
    this.shells.forEach((s) => s.removeFromParent());
    this.shells = [];
    this.current = null;
  }
  set opacity(v: number) {
    this.material.uniforms.opacity.value = v;
  }
  get active() {
    return this.shells.length > 0;
  }
}
