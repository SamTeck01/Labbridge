'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Compass,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  Footprints,
  Eye,
  Info,
  Layers,
  Zap,
  FlaskConical,
  Scale
} from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';

export type StationType = 'biology' | 'chemistry' | 'physics' | 'research' | null;

interface Lab3DSceneProps {
  onOpenStation: (station: 'biology' | 'chemistry' | 'physics' | 'research') => void;
  onOpenNotebook: () => void;
  onOpenAssistant: () => void;
  onExitToLanding: () => void;
}

export default function Lab3DScene({
  onOpenStation,
  onOpenNotebook,
  onOpenAssistant,
  onExitToLanding,
}: Lab3DSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Interaction & HUD State
  const [activeStationPrompt, setActiveStationPrompt] = useState<{
    station: 'biology' | 'chemistry' | 'physics' | 'research';
    title: string;
    action: string;
    icon: string;
    color: string;
  } | null>(null);

  const [playerPosition, setPlayerPosition] = useState<{ x: number; z: number; angle: number }>({
    x: 0,
    z: 6,
    angle: Math.PI,
  });

  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [controlsHintVisible, setControlsHintVisible] = useState<boolean>(true);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const activeStationPromptRef = useRef<{
    station: 'biology' | 'chemistry' | 'physics' | 'research';
    title: string;
    action: string;
    icon: string;
    color: string;
  } | null>(null);

  // Movement State
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const playerVelocity = useRef<THREE.Vector3>(new THREE.Vector3());
  const cameraEuler = useRef<THREE.Euler>(new THREE.Euler(0, Math.PI, 0, 'YXZ'));
  const isWalkingRef = useRef<boolean>(false);
  const stepTimerRef = useRef<number>(0);
  const headBobTimer = useRef<number>(0);

  // Station Positions in 3D Space
  const stationPositions = useRef<{ [key: string]: { x: number; z: number; name: string; type: 'biology' | 'chemistry' | 'physics' | 'research' } }>({
    biology: { x: -4.5, z: -3.5, name: 'Biology & Microscopy', type: 'biology' },
    chemistry: { x: 4.5, z: -3.5, name: 'Chemistry & Titration', type: 'chemistry' },
    physics: { x: -4.5, z: 3.5, name: 'Physics & Circuits', type: 'physics' },
    research: { x: 4.5, z: 3.5, name: 'Analytical Science', type: 'research' },
  });

  // Teleport helper
  const handleTeleport = (dest: 'center' | 'biology' | 'chemistry' | 'physics' | 'research') => {
    if (!cameraRef.current) return;
    soundFx.playClick();
    if (dest === 'center') {
      cameraRef.current.position.set(0, 1.7, 5.5);
      cameraEuler.current.set(0, Math.PI, 0, 'YXZ');
    } else if (dest === 'biology') {
      cameraRef.current.position.set(-4.5, 1.7, -1.8);
      cameraEuler.current.set(0, Math.PI, 0, 'YXZ');
    } else if (dest === 'chemistry') {
      cameraRef.current.position.set(4.5, 1.7, -1.8);
      cameraEuler.current.set(0, Math.PI, 0, 'YXZ');
    } else if (dest === 'physics') {
      cameraRef.current.position.set(-4.5, 1.7, 5.2);
      cameraEuler.current.set(0, Math.PI, 0, 'YXZ');
    } else if (dest === 'research') {
      cameraRef.current.position.set(4.5, 1.7, 5.2);
      cameraEuler.current.set(0, Math.PI, 0, 'YXZ');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setControlsHintVisible(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Three.js 3D Virtual Lab Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    soundFx.startLabAmbience();

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#0c1017');
    scene.fog = new THREE.FogExp2('#0c1017', 0.025);

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    camera.position.set(0, 1.7, 6);
    cameraEuler.current.set(0, Math.PI, 0, 'YXZ');
    camera.quaternion.setFromEuler(cameraEuler.current);
    cameraRef.current = camera;

    // WebGL Renderer with High-Fidelity Tone Mapping & Soft Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // ----------------------------------------------------
    // LIGHTING SYSTEM
    // ----------------------------------------------------
    // Soft Ambient Light
    const ambientLight = new THREE.AmbientLight('#c8d6e5', 0.85);
    scene.add(ambientLight);

    // Ceiling Fluorescent Overhead Panel Lights
    const ceilingLights = [
      { x: -5, z: -3.5 },
      { x: 5, z: -3.5 },
      { x: -5, z: 3.5 },
      { x: 5, z: 3.5 },
      { x: 0, z: 0 },
    ];

    ceilingLights.forEach((pos, idx) => {
      const pLight = new THREE.PointLight('#f1f2f6', 1.1, 14, 1.5);
      pLight.position.set(pos.x, 3.8, pos.z);
      pLight.castShadow = true;
      pLight.shadow.mapSize.width = 1024;
      pLight.shadow.mapSize.height = 1024;
      pLight.shadow.bias = -0.001;
      scene.add(pLight);

      // Light Fixture Model on Ceiling
      const fixtureGeo = new THREE.BoxGeometry(2.4, 0.08, 1.2);
      const fixtureMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const fixtureMesh = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixtureMesh.position.set(pos.x, 3.96, pos.z);
      scene.add(fixtureMesh);

      const frameGeo = new THREE.BoxGeometry(2.5, 0.1, 1.3);
      const frameMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5 });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.position.set(pos.x, 3.98, pos.z);
      scene.add(frameMesh);
    });

    // ----------------------------------------------------
    // ROOM ARCHITECTURE (Floor, Ceiling, Walls)
    // ----------------------------------------------------
    // Floor Canvas Texture (Epoxy Lab Tile Grid)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fCtx = floorCanvas.getContext('2d')!;
    fCtx.fillStyle = '#e2e8f0';
    fCtx.fillRect(0, 0, 512, 512);
    fCtx.strokeStyle = '#cbd5e1';
    fCtx.lineWidth = 4;
    fCtx.strokeRect(0, 0, 512, 512);
    fCtx.strokeRect(256, 0, 256, 256);
    fCtx.strokeRect(0, 256, 256, 256);

    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(10, 10);

    const floorGeo = new THREE.PlaneGeometry(24, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.25,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(24, 24);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = 4.0;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // Wall Material
    const wallMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.7 });
    const wallTrimMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 });

    // Build Walls helper
    const buildWall = (w: number, h: number, x: number, y: number, z: number, rotY: number) => {
      const wGeo = new THREE.PlaneGeometry(w, h);
      const wMesh = new THREE.Mesh(wGeo, wallMat);
      wMesh.position.set(x, y, z);
      wMesh.rotation.y = rotY;
      wMesh.receiveShadow = true;
      scene.add(wMesh);

      // Baseboard trim
      const trimGeo = new THREE.BoxGeometry(w, 0.25, 0.05);
      const trimMesh = new THREE.Mesh(trimGeo, wallTrimMat);
      trimMesh.position.set(x, 0.125, z);
      trimMesh.rotation.y = rotY;
      scene.add(trimMesh);
    };

    buildWall(24, 4, 0, 2, -12, 0); // North Wall
    buildWall(24, 4, 0, 2, 12, Math.PI); // South Wall
    buildWall(24, 4, -12, 2, 0, Math.PI / 2); // West Wall
    buildWall(24, 4, 12, 2, 0, -Math.PI / 2); // East Wall

    // ----------------------------------------------------
    // WALL POSTERS & SCIENTIFIC SIGNAGE
    // ----------------------------------------------------
    const createPoster = (
      title: string,
      subtitle: string,
      color: string,
      symbol: string,
      w: number,
      h: number,
      x: number,
      y: number,
      z: number,
      rotY: number
    ) => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 512;
      pCanvas.height = 360;
      const ctx = pCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 360);

      // Header Banner
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 512, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(title, 24, 44);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(subtitle, 24, 110);

      // Poster Graphic / Decorative lines
      ctx.font = '80px sans-serif';
      ctx.fillText(symbol, 40, 240);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px monospace';
      ctx.fillText('LabBridge Practical Standards Protocol', 24, 320);
      ctx.fillText('Authorized Lab Personnel Only', 24, 340);

      // Border
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      ctx.strokeRect(0, 0, 512, 360);

      const pTex = new THREE.CanvasTexture(pCanvas);
      const pGeo = new THREE.PlaneGeometry(w, h);
      const pMat = new THREE.MeshBasicMaterial({ map: pTex });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(x, y, z);
      pMesh.rotation.y = rotY;
      scene.add(pMesh);
    };

    // North Wall Posters (Periodic Table & Chemistry Safety)
    createPoster('PERIODIC TABLE OF ELEMENTS', 'IUPAC Standard Chemical Series', '#0284c7', '🧪', 3.2, 2.2, 4.5, 2.4, -11.9, 0);
    createPoster('CELL BIOLOGY & GENETICS', 'Eukaryotic Structure & Organelles', '#059669', '🧬', 3.2, 2.2, -4.5, 2.4, -11.9, 0);

    // West Wall Posters (Physics & Electronics)
    createPoster("CIRCUIT LAWS & OPTICS", "Maxwell & Snell's Dispersion", '#d97706', '⚡', 3.0, 2.0, -11.9, 2.4, -2.0, Math.PI / 2);
    createPoster('LAB SAFETY & EYEWASH', 'Emergency Station & PPE Guidelines', '#dc2626', '🛡️', 2.2, 1.8, -11.9, 2.4, 4.0, Math.PI / 2);

    // East Wall Posters (Research Protocols)
    createPoster('ANALYTICAL SCIENCE PROTOCOL', 'Standard Operating Procedures', '#4f46e5', '🔬', 3.0, 2.0, 11.9, 2.4, 0, -Math.PI / 2);

    // ----------------------------------------------------
    // FUME HOOD & LAB SINK ENVIRONMENT FIXTURES
    // ----------------------------------------------------
    // Fume Hood on North Wall
    const fumeHoodGroup = new THREE.Group();
    const fhBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.6, 1.2),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.2, roughness: 0.4 })
    );
    fhBody.position.set(0, 1.3, 0);
    fumeHoodGroup.add(fhBody);

    // Glass Sash
    const sash = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.2, 0.05),
      new THREE.MeshStandardMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.45, roughness: 0.1 })
    );
    sash.position.set(0, 1.5, 0.58);
    fumeHoodGroup.add(sash);

    fumeHoodGroup.position.set(0, 0, -11.3);
    scene.add(fumeHoodGroup);

    // Wall Cabinets on East Wall
    for (let c = -3; c <= 3; c += 2) {
      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.2, 0.5),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.1, roughness: 0.6 })
      );
      cab.position.set(11.7, 2.6, c * 2);
      scene.add(cab);
    }

    // ----------------------------------------------------
    // 4 CENTRAL LABORATORY WORKSTATIONS
    // ----------------------------------------------------
    const createLabBench = (x: number, z: number, accentColor: string, title: string) => {
      const benchGroup = new THREE.Group();

      // Heavy Granite Countertop
      const topGeo = new THREE.BoxGeometry(3.6, 0.15, 2.2);
      const topMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.3 });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.y = 0.95;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      benchGroup.add(topMesh);

      // Stainless Steel / Epoxy Cabinet Base
      const baseGeo = new THREE.BoxGeometry(3.4, 0.88, 2.0);
      const baseMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.5 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.44;
      baseMesh.castShadow = true;
      benchGroup.add(baseMesh);

      // Discipline Accent Trim Line
      const trimGeo = new THREE.BoxGeometry(3.42, 0.06, 2.02);
      const trimMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3, emissive: accentColor, emissiveIntensity: 0.2 });
      const trimMesh = new THREE.Mesh(trimGeo, trimMat);
      trimMesh.position.y = 0.88;
      benchGroup.add(trimMesh);

      // 3D Floating Discipline Hologram Label above table
      const holoCanvas = document.createElement('canvas');
      holoCanvas.width = 512;
      holoCanvas.height = 160;
      const hCtx = holoCanvas.getContext('2d')!;
      hCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      hCtx.roundRect(10, 10, 492, 140, 24);
      hCtx.fill();
      hCtx.strokeStyle = accentColor;
      hCtx.lineWidth = 6;
      hCtx.stroke();

      hCtx.fillStyle = '#ffffff';
      hCtx.font = 'bold 36px sans-serif';
      hCtx.textAlign = 'center';
      hCtx.fillText(title, 256, 75);

      hCtx.fillStyle = accentColor;
      hCtx.font = 'bold 22px monospace';
      hCtx.fillText('[E] Step Up to Interact', 256, 118);

      const holoTex = new THREE.CanvasTexture(holoCanvas);
      const holoMat = new THREE.SpriteMaterial({ map: holoTex, transparent: true });
      const holoSprite = new THREE.Sprite(holoMat);
      holoSprite.scale.set(2.4, 0.75, 1);
      holoSprite.position.set(0, 2.3, 0);
      benchGroup.add(holoSprite);

      benchGroup.position.set(x, 0, z);
      scene.add(benchGroup);
      return benchGroup;
    };

    // 1. BIOLOGY BENCH
    const bioBench = createLabBench(-4.5, -3.5, '#10b981', '🧬 BIOLOGY STATION');

    // 3D Optical Compound Microscope Model on Biology Table
    const microGroup = new THREE.Group();
    // Heavy Cast Iron Horseshoe Base
    const mBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.08, 24),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3, metalness: 0.7 })
    );
    mBase.position.y = 1.05;
    microGroup.add(mBase);

    // Curved Arm Pillar
    const mPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.45, 0.12),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.6 })
    );
    mPillar.position.set(0, 1.28, -0.1);
    microGroup.add(mPillar);

    // Mechanical Stage (Square plate)
    const mStage = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.04, 0.36),
      new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.2, metalness: 0.8 })
    );
    mStage.position.set(0, 1.25, 0.04);
    microGroup.add(mStage);

    // Glass Specimen Slide on stage
    const mSlide = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.015, 0.08),
      new THREE.MeshStandardMaterial({ color: '#a7f3d0', transparent: true, opacity: 0.8 })
    );
    mSlide.position.set(0, 1.28, 0.04);
    microGroup.add(mSlide);

    // Revolving Nosepiece Turret with 4 Objective Lenses
    const mTurret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.2 })
    );
    mTurret.position.set(0, 1.45, 0.04);
    microGroup.add(mTurret);

    // Lenses
    [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((rot, i) => {
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.03, 0.1, 12),
        new THREE.MeshStandardMaterial({
          color: i === 0 ? '#ef4444' : i === 1 ? '#eab308' : i === 2 ? '#3b82f6' : '#f8fafc',
          metalness: 0.8,
          roughness: 0.2,
        })
      );
      lens.position.set(Math.sin(rot) * 0.08, 1.39, 0.04 + Math.cos(rot) * 0.08);
      microGroup.add(lens);
    });

    // Dual Binocular Eyepiece Tubes
    [-0.06, 0.06].forEach((eyeX) => {
      const eyeTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.25, 12),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.6 })
      );
      eyeTube.position.set(eyeX, 1.62, 0.02);
      eyeTube.rotation.x = -0.3;
      microGroup.add(eyeTube);
    });

    // Slide box beside microscope
    const slideBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.08, 0.24),
      new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 })
    );
    slideBox.position.set(0.6, 1.07, 0.2);
    microGroup.add(slideBox);

    // Petri Dishes
    [-0.5, -0.7].forEach((px, idx) => {
      const petri = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.03, 20),
        new THREE.MeshStandardMaterial({ color: idx === 0 ? '#fde68a' : '#bae6fd', transparent: true, opacity: 0.7 })
      );
      petri.position.set(px, 1.05, 0.1 * idx);
      microGroup.add(petri);
    });

    bioBench.add(microGroup);

    // 2. CHEMISTRY BENCH
    const chemBench = createLabBench(4.5, -3.5, '#06b6d4', '🧪 CHEMISTRY STATION');

    // 3D Chemistry Equipment
    const chemGroup = new THREE.Group();

    // Bunsen Burner
    const burnerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.8 })
    );
    burnerBase.position.set(-0.6, 1.05, 0);
    chemGroup.add(burnerBase);

    const burnerChimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.25, 16),
      new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.1 })
    );
    burnerChimney.position.set(-0.6, 1.18, 0);
    chemGroup.add(burnerChimney);

    // Dynamic Flame Light
    const flameLight = new THREE.PointLight('#38bdf8', 0.8, 2);
    flameLight.position.set(-0.6, 1.38, 0);
    chemGroup.add(flameLight);

    // Erlenmeyer Flask with blue solution
    const flaskGeo = new THREE.ConeGeometry(0.16, 0.28, 16);
    const flaskMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', transparent: true, opacity: 0.75, roughness: 0.1 });
    const flask = new THREE.Mesh(flaskGeo, flaskMat);
    flask.position.set(0.1, 1.16, 0);
    chemGroup.add(flask);

    // Beaker with purple solution
    const beakerGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.22, 16);
    const beakerMat = new THREE.MeshStandardMaterial({ color: '#a855f7', transparent: true, opacity: 0.7, roughness: 0.1 });
    const beaker = new THREE.Mesh(beakerGeo, beakerMat);
    beaker.position.set(0.5, 1.14, 0.15);
    chemGroup.add(beaker);

    // Test Tube Rack
    const rackBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.14, 0.15),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.6 })
    );
    rackBase.position.set(-0.1, 1.09, 0.4);
    chemGroup.add(rackBase);

    [-0.16, -0.08, 0, 0.08, 0.16].forEach((tx, i) => {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.22, 12),
        new THREE.MeshStandardMaterial({
          color: i === 0 ? '#ef4444' : i === 1 ? '#3b82f6' : i === 2 ? '#10b981' : i === 3 ? '#eab308' : '#ec4899',
          transparent: true,
          opacity: 0.85,
        })
      );
      tube.position.set(tx - 0.1, 1.2, 0.4);
      chemGroup.add(tube);
    });

    chemBench.add(chemGroup);

    // 3. PHYSICS BENCH
    const physBench = createLabBench(-4.5, 3.5, '#f59e0b', '⚡ PHYSICS STATION');

    // 3D Physics Apparatus
    const physGroup = new THREE.Group();

    // DC Power Supply Box
    const psBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.3),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5, metalness: 0.4 })
    );
    psBox.position.set(-0.6, 1.15, 0);
    physGroup.add(psBox);

    // Glowing LED Screen on power supply
    const psScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.08),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' })
    );
    psScreen.position.set(-0.6, 1.18, 0.151);
    physGroup.add(psScreen);

    // Breadboard Circuit
    const breadboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.03, 0.35),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8 })
    );
    breadboard.position.set(0.1, 1.05, 0.1);
    physGroup.add(breadboard);

    // Miniature Light Bulb on breadboard
    const physBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#eab308', emissiveIntensity: 0.8 })
    );
    physBulb.position.set(0.1, 1.12, 0.1);
    physGroup.add(physBulb);

    // Digital Multimeter (Yellow casing)
    const dmm = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.06, 0.32),
      new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4 })
    );
    dmm.position.set(0.7, 1.05, -0.1);
    physGroup.add(dmm);

    // Triangular Glass Prism
    const prism = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.14, 3),
      new THREE.MeshStandardMaterial({ color: '#c7d2fe', transparent: true, opacity: 0.75, roughness: 0.05 })
    );
    prism.position.set(-0.1, 1.12, -0.3);
    physGroup.add(prism);

    physBench.add(physGroup);

    // 4. RESEARCH & ANALYTICAL BENCH
    const resBench = createLabBench(4.5, 3.5, '#6366f1', '🔬 ANALYTICAL SCIENCE');

    // 3D Analytical Equipment
    const resGroup = new THREE.Group();

    // Analytical Balance Scale inside Glass Draft Chamber
    const scaleBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.35),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.4 })
    );
    scaleBase.position.set(-0.5, 1.07, 0);
    resGroup.add(scaleBase);

    const draftShield = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.3, 0.32),
      new THREE.MeshStandardMaterial({ color: '#bae6fd', transparent: true, opacity: 0.35, roughness: 0.1 })
    );
    draftShield.position.set(-0.5, 1.25, 0);
    resGroup.add(draftShield);

    // Centrifuge Machine
    const centrifuge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 0.28, 20),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.3, metalness: 0.4 })
    );
    centrifuge.position.set(0.4, 1.16, 0.1);
    resGroup.add(centrifuge);

    resBench.add(resGroup);

    // ----------------------------------------------------
    // FIRST-PERSON CONTROLS & POINTER LOCK
    // ----------------------------------------------------
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== container) return;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      cameraEuler.current.y -= movementX * 0.0022;
      cameraEuler.current.x -= movementY * 0.0022;
      // Clamp vertical look
      cameraEuler.current.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, cameraEuler.current.x));

      camera.quaternion.setFromEuler(cameraEuler.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      if (e.code === 'KeyE') {
        // Trigger interaction with nearest active station
        const currentPrompt = activeStationPromptRef.current;
        if (currentPrompt) {
          onOpenStation(currentPrompt.station);
          soundFx.playClick();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Pointer Lock change
    const onPointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === container);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // Resize Handler
    const onResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ----------------------------------------------------
    // ANIMATION & PHYSICS TICK LOOP
    // ----------------------------------------------------
    let lastTime = performance.now();

    const animateLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Handle Keyboard Movement WASD
      const moveSpeed = 4.2;
      const moveVector = new THREE.Vector3();

      if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) moveVector.z -= 1;
      if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) moveVector.z += 1;
      if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) moveVector.x -= 1;
      if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) moveVector.x += 1;

      const isMoving = moveVector.lengthSq() > 0;
      isWalkingRef.current = isMoving;

      if (isMoving) {
        moveVector.normalize();
        // Transform direction according to camera Y angle
        const camYAngle = cameraEuler.current.y;
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), camYAngle);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), camYAngle);

        const worldMove = new THREE.Vector3();
        worldMove.addScaledVector(forward, -moveVector.z);
        worldMove.addScaledVector(right, moveVector.x);
        worldMove.normalize();

        playerVelocity.current.lerp(worldMove.multiplyScalar(moveSpeed), dt * 10);

        // Footstep sounds
        stepTimerRef.current += dt;
        if (stepTimerRef.current > 0.42) {
          soundFx.playFootstep();
          stepTimerRef.current = 0;
        }

        // Head Bobbing
        headBobTimer.current += dt * 10;
        camera.position.y = 1.7 + Math.sin(headBobTimer.current) * 0.035;
      } else {
        playerVelocity.current.lerp(new THREE.Vector3(0, 0, 0), dt * 12);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.7, dt * 8);
      }

      // Apply movement with wall collision bounds
      const nextX = camera.position.x + playerVelocity.current.x * dt;
      const nextZ = camera.position.z + playerVelocity.current.z * dt;

      // Lab Boundary Collisions (Room is 24x24, playable area is -10.5 to 10.5)
      camera.position.x = Math.max(-10.5, Math.min(10.5, nextX));
      camera.position.z = Math.max(-10.5, Math.min(10.5, nextZ));

      // Table Obstacle Soft Collisions (avoid walking through benches)
      const benches = [
        { x: -4.5, z: -3.5 },
        { x: 4.5, z: -3.5 },
        { x: -4.5, z: 3.5 },
        { x: 4.5, z: 3.5 },
      ];

      benches.forEach((b) => {
        const dx = camera.position.x - b.x;
        const dz = camera.position.z - b.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = 1.6;
        if (dist < minDist && dist > 0.001) {
          const push = (minDist - dist) / dist;
          camera.position.x += dx * push;
          camera.position.z += dz * push;
        }
      });

      // Update HUD MiniMap Player Beacon
      setPlayerPosition({
        x: camera.position.x,
        z: camera.position.z,
        angle: cameraEuler.current.y,
      });

      // Distance check to 4 Stations for Interactive Prompt
      let closestStation: {
        station: 'biology' | 'chemistry' | 'physics' | 'research';
        title: string;
        action: string;
        icon: string;
        color: string;
      } | null = null;
      let minStationDist = 3.2; // interaction radius (meters)

      Object.entries(stationPositions.current).forEach(([key, st]) => {
        const dx = camera.position.x - st.x;
        const dz = camera.position.z - st.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minStationDist) {
          minStationDist = d;
          if (st.type === 'biology') {
            closestStation = {
              station: 'biology',
              title: '🧬 Biology Workstation',
              action: 'Use Optical Compound Microscope',
              icon: '🔬',
              color: 'text-emerald-400 border-emerald-500 bg-emerald-950/80',
            };
          } else if (st.type === 'chemistry') {
            closestStation = {
              station: 'chemistry',
              title: '🧪 Chemistry Workstation',
              action: 'Examine Titration Rig & Bunsen Burner',
              icon: '🧪',
              color: 'text-cyan-400 border-cyan-500 bg-cyan-950/80',
            };
          } else if (st.type === 'physics') {
            closestStation = {
              station: 'physics',
              title: '⚡ Physics Workstation',
              action: "Test DC Circuits & Ohm's Law",
              icon: '⚡',
              color: 'text-amber-400 border-amber-500 bg-amber-950/80',
            };
          } else if (st.type === 'research') {
            closestStation = {
              station: 'research',
              title: '🔬 Analytical Science Workstation',
              action: 'Operate Analytical Balance & Centrifuge',
              icon: '⚖️',
              color: 'text-indigo-400 border-indigo-500 bg-indigo-950/80',
            };
          }
        }
      });

      activeStationPromptRef.current = closestStation;
      setActiveStationPrompt(closestStation);

      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(animateLoop);
    };

    animationFrameId.current = requestAnimationFrame(animateLoop);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      soundFx.stopLabAmbience();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onOpenStation]);

  const requestLock = () => {
    if (mountRef.current) {
      mountRef.current.requestPointerLock();
    }
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        onClick={requestLock}
        className="w-full h-full cursor-crosshair"
      />

      {/* Crosshair Center Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white/80 ring-2 ring-slate-900/50 shadow-md" />
      </div>

      {/* Top Navigation HUD Bar */}
      <header className="absolute top-0 left-0 right-0 h-16 px-6 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent flex items-center justify-between pointer-events-auto z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">
            🧪
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              LabBridge Virtual Science Laboratory
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Simulator Active
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Interactive 3D Science Discovery Proof of Concept
            </p>
          </div>
        </div>

        {/* Quick Teleport Station Buttons */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-xl border border-slate-800 text-xs">
          <span className="text-[11px] text-slate-500 mr-1 font-semibold">Jump to:</span>
          <button
            onClick={() => handleTeleport('biology')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 transition-all flex items-center gap-1"
          >
            <span>🧬 Biology</span>
          </button>
          <button
            onClick={() => handleTeleport('chemistry')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 transition-all flex items-center gap-1"
          >
            <span>🧪 Chemistry</span>
          </button>
          <button
            onClick={() => handleTeleport('physics')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-950 hover:text-amber-300 text-slate-300 transition-all flex items-center gap-1"
          >
            <span>⚡ Physics</span>
          </button>
          <button
            onClick={() => handleTeleport('research')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-950 hover:text-indigo-300 text-slate-300 transition-all flex items-center gap-1"
          >
            <span>🔬 Research</span>
          </button>
          <button
            onClick={() => handleTeleport('center')}
            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            title="Room Center"
          >
            Center
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              const m = soundFx.toggleMute();
              setIsMuted(m);
            }}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenNotebook}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Notebook</span>
          </button>

          <button
            onClick={onOpenAssistant}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Dr. Curie (Lab AI)</span>
          </button>

          <button
            onClick={onExitToLanding}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all"
          >
            ← Exit Lab
          </button>
        </div>
      </header>

      {/* Floating Interaction Prompt when near Station */}
      {activeStationPrompt && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto z-30">
          <button
            onClick={() => onOpenStation(activeStationPrompt.station)}
            className={`px-6 py-3 rounded-2xl border-2 shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all hover:scale-105 active:scale-95 animate-bounce ${activeStationPrompt.color}`}
          >
            <span className="text-2xl">{activeStationPrompt.icon}</span>
            <div className="text-left">
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                {activeStationPrompt.title}
              </div>
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>{activeStationPrompt.action}</span>
                <span className="px-2 py-0.5 rounded bg-white/20 text-white font-mono text-xs">
                  [Press E or Click]
                </span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* MiniMap / Lab Radar (Bottom Left) */}
      <div className="absolute bottom-6 left-6 p-3 bg-slate-900/85 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl z-20 pointer-events-auto flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-1 px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Compass className="w-3 h-3 text-emerald-400" />
            Lab Radar
          </span>
          <span className="text-[9px] font-mono text-slate-500">24m x 24m</span>
        </div>

        {/* 2D Radar Canvas */}
        <div className="w-32 h-32 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
          {/* Grid lines */}
          <div className="absolute inset-0 border-b border-slate-800/80 top-1/2" />
          <div className="absolute inset-0 border-r border-slate-800/80 left-1/2" />

          {/* 4 Station Blips */}
          {/* Biology */}
          <div
            onClick={() => handleTeleport('biology')}
            className="absolute w-3.5 h-3.5 rounded bg-emerald-500/80 border border-emerald-300 cursor-pointer hover:scale-125 transition-transform"
            style={{ left: '22%', top: '26%' }}
            title="Biology Workstation"
          />
          {/* Chemistry */}
          <div
            onClick={() => handleTeleport('chemistry')}
            className="absolute w-3.5 h-3.5 rounded bg-cyan-500/80 border border-cyan-300 cursor-pointer hover:scale-125 transition-transform"
            style={{ right: '22%', top: '26%' }}
            title="Chemistry Workstation"
          />
          {/* Physics */}
          <div
            onClick={() => handleTeleport('physics')}
            className="absolute w-3.5 h-3.5 rounded bg-amber-500/80 border border-amber-300 cursor-pointer hover:scale-125 transition-transform"
            style={{ left: '22%', bottom: '26%' }}
            title="Physics Workstation"
          />
          {/* Research */}
          <div
            onClick={() => handleTeleport('research')}
            className="absolute w-3.5 h-3.5 rounded bg-indigo-500/80 border border-indigo-300 cursor-pointer hover:scale-125 transition-transform"
            style={{ right: '22%', bottom: '26%' }}
            title="Analytical Science Workstation"
          />

          {/* Player Arrow Beacon */}
          <div
            className="absolute w-3 h-3 bg-white rounded-full shadow-lg border border-slate-900 z-10 transition-all duration-75"
            style={{
              left: `${50 + (playerPosition.x / 24) * 80}%`,
              top: `${50 + (playerPosition.z / 24) * 80}%`,
              transform: `translate(-50%, -50%) rotate(${playerPosition.angle}rad)`,
            }}
          >
            <div className="w-0.5 h-2 bg-emerald-400 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Movement Controls Overlay Hint */}
      {controlsHintVisible && (
        <div className="absolute bottom-6 right-6 p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl z-20 text-xs text-slate-300 space-y-1.5 pointer-events-auto max-w-xs">
          <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5 text-emerald-400" />
              Movement Controls
            </span>
            <button
              onClick={() => setControlsHintVisible(false)}
              className="text-slate-500 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white">W A S D</span> Walk
            </div>
            <div>
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white">Mouse</span> Look Around
            </div>
            <div>
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white">E</span> Interact
            </div>
            <div>
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white">Click</span> Lock Pointer
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
