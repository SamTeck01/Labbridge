'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Compass,
  Footprints,
  Eye,
  Zap,
  FlaskConical,
  Scale,
  Smartphone,
  RotateCw,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  X,
  Play,
  Pause,
  LogOut,
  Hand
} from 'lucide-react';
import { soundFx } from '@/lib/soundEffects';
import { isMobileOrTouchDevice } from '@/lib/orientation';
import {
  createLabStool,
  createFumeHood,
  createSafetyShower,
  createLabWhiteboard,
  createReagentShelf,
  tagInteractive
} from '@/lib/lab3dEquipment';
import {
  createReadyMadeMicroscope,
  createReadyMadeChemistryStation,
  createReadyMadePhysicsBench,
  createReadyMadeAnalyticalBench,
} from '@/lib/gltfLabEquipment';
import { createFirstPersonScientistRig, updateScientistRig } from '@/lib/scientistCharacter';
import EyepieceOcularOverlay from '@/components/EyepieceOcularOverlay';
import SeatedStationToolbar from '@/components/SeatedStationToolbar';
import ScientistPhoneModal, { PhoneAppTab } from '@/components/ScientistPhoneModal';
import MiniMapRadar from '@/components/MiniMapRadar';
import VirtualJoystick from '@/components/VirtualJoystick';
import { SnapshotItem } from '@/components/LabNotebookModal';
import { SPECIMEN_CATALOG } from '@/lib/specimenGenerator';
import { createAllLabWallPosters } from '@/lib/labPosters';

export type StationType = 'biology' | 'chemistry' | 'physics' | 'research' | null;

interface Lab3DSceneProps {
  initialStation?: 'biology' | 'chemistry' | 'physics' | 'research' | null;
  onOpenNotebook: () => void;
  onOpenAssistant: () => void;
  onExitToLanding: () => void;
  onSaveSnapshot: (snapshot: SnapshotItem) => void;
  onAskAI?: (prompt: string, context: string) => void;
  snapshots?: SnapshotItem[];
}

// Exact human biomechanical eye heights (meters)
const EYE_HEIGHT_STANDING = 1.68;
const EYE_HEIGHT_SITTING = 1.28;

interface CameraTransition {
  active: boolean;
  type: 'sit' | 'stand';
  station?: 'biology' | 'chemistry' | 'physics' | 'research';
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  startYXZ: { pitch: number; yaw: number };
  targetYXZ: { pitch: number; yaw: number };
  progress: number;
  duration: number;
}

export default function Lab3DScene({
  initialStation = null,
  onOpenNotebook,
  onOpenAssistant,
  onExitToLanding,
  onSaveSnapshot,
  onAskAI,
  snapshots = [],
}: Lab3DSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Seating & Interaction State
  const [isSeated, setIsSeated] = useState<boolean>(false);
  const [seatedStation, setSeatedStation] = useState<'biology' | 'chemistry' | 'physics' | 'research' | null>(null);
  const [isViewingEyepieces, setIsViewingEyepieces] = useState<boolean>(false);

  // Phone State
  const [isPhoneOpen, setIsPhoneOpen] = useState<boolean>(false);
  const [phoneInitialTab, setPhoneInitialTab] = useState<PhoneAppTab>('home');
  const [phoneAIPrompt, setPhoneAIPrompt] = useState<string | undefined>(undefined);
  const [phoneAIContext, setPhoneAIContext] = useState<string | undefined>(undefined);

  // Live Player Coordinates for Radar Mini-Map
  const [playerCoords, setPlayerCoords] = useState<{ x: number; z: number; yaw: number }>({
    x: 0,
    z: 5.5,
    yaw: Math.PI,
  });

  // Center Reticle Hover Target
  const [hoveredAction, setHoveredAction] = useState<{
    id: string;
    label: string;
    action: string;
    station: 'biology' | 'chemistry' | 'physics' | 'research';
    category: string;
  } | null>(null);

  // 3D Equipment Live States
  const [biologyState, setBiologyState] = useState({
    slideIndex: 0,
    objective: '10x' as '4x' | '10x' | '40x' | '100x',
    coarseFocus: 0.5,
    fineFocus: 0.5,
    stageX: 0,
    stageY: 0,
    lightIntensity: 1.0,
  });

  const [chemistryState, setChemistryState] = useState({
    buretteOpen: false,
    dispensedML: 0,
    stirrerRPM: 0,
    indicatorAdded: false,
    phValue: 2.8,
  });
  const chemistryStateRef = useRef(chemistryState);

  const [physicsState, setPhysicsState] = useState({
    switchClosed: false,
    resistance: 25,
    voltage: 12.0,
  });

  const [analyticalState, setAnalyticalState] = useState({
    doorsOpen: false,
    balanceWeight: 0.0,
    centrifugeRunning: false,
  });

  const [isTouch] = useState<boolean>(() => (typeof window !== 'undefined' ? isMobileOrTouchDevice() : false));

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const scientistRigRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Interactive 3D Equipment Refs
  const microEquipmentRef = useRef<THREE.Group | null>(null);
  const chemEquipmentRef = useRef<THREE.Group | null>(null);
  const physEquipmentRef = useRef<THREE.Group | null>(null);
  const resEquipmentRef = useRef<THREE.Group | null>(null);
  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);

  // Movement & Camera State
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const touchMoveVector = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const touchLookId = useRef<number | null>(null);
  const touchLookLastPos = useRef<{ x: number; y: number } | null>(null);
  const playerVelocity = useRef<THREE.Vector3>(new THREE.Vector3());
  const cameraEuler = useRef<THREE.Euler>(new THREE.Euler(0, Math.PI, 0, 'YXZ'));
  const isWalkingRef = useRef<boolean>(false);
  const stepTimerRef = useRef<number>(0);
  const walkTimerRef = useRef<number>(0);
  const idleTimerRef = useRef<number>(0);

  // Camera Smooth Cinematic Transition Ref
  const transitionRef = useRef<CameraTransition | null>(null);

  // Bench Seating Anchor Coordinates (Eye-Level 1st-Person Operating Vantage)
  const seatAnchors = useRef<{
    [key in 'biology' | 'chemistry' | 'physics' | 'research']: {
      pos: THREE.Vector3;
      lookAt: THREE.Vector3;
      baseYaw: number;
    };
  }>({
    biology: {
      pos: new THREE.Vector3(-4.5, EYE_HEIGHT_SITTING, -2.35),
      lookAt: new THREE.Vector3(-4.5, 1.10, -3.5),
      baseYaw: 0,
    },
    chemistry: {
      pos: new THREE.Vector3(4.5, EYE_HEIGHT_SITTING, -2.35),
      lookAt: new THREE.Vector3(4.5, 1.10, -3.5),
      baseYaw: 0,
    },
    physics: {
      pos: new THREE.Vector3(-4.5, EYE_HEIGHT_SITTING, 4.75),
      lookAt: new THREE.Vector3(-4.5, 1.10, 3.5),
      baseYaw: Math.PI,
    },
    research: {
      pos: new THREE.Vector3(4.5, EYE_HEIGHT_SITTING, 4.75),
      lookAt: new THREE.Vector3(4.5, 1.10, 3.5),
      baseYaw: Math.PI,
    },
  });

  // Sitting down mechanic with smooth transition
  const sitDownAt = useCallback((station: 'biology' | 'chemistry' | 'physics' | 'research') => {
    soundFx.playSitDown();
    const anchor = seatAnchors.current[station];
    if (anchor && cameraRef.current) {
      const startPos = cameraRef.current.position.clone();
      const lookDir = new THREE.Vector3().subVectors(anchor.lookAt, anchor.pos).normalize();
      const targetYaw = Math.atan2(-lookDir.x, -lookDir.z);
      const targetPitch = -0.22; // Natural angle looking slightly down at bench apparatus

      transitionRef.current = {
        active: true,
        type: 'sit',
        station,
        startPos,
        targetPos: anchor.pos.clone(),
        startYXZ: { pitch: cameraEuler.current.x, yaw: cameraEuler.current.y },
        targetYXZ: { pitch: targetPitch, yaw: targetYaw },
        progress: 0,
        duration: 0.55,
      };

      setIsSeated(true);
      setSeatedStation(station);
    }
  }, []);

  // Auto-seat at requested initialStation on entry
  useEffect(() => {
    if (initialStation && seatAnchors.current[initialStation]) {
      const timer = setTimeout(() => {
        sitDownAt(initialStation);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [initialStation, sitDownAt]);

  // Standing up mechanic with smooth step-back
  const standUp = useCallback(() => {
    soundFx.playStandUp();
    setIsSeated(false);
    setSeatedStation(null);
    setIsViewingEyepieces(false);

    if (cameraRef.current) {
      const curr = cameraRef.current.position.clone();
      // Step back from the stool into the laboratory aisle
      const standZ = curr.z < 0 ? curr.z + 0.85 : curr.z - 0.85;
      const targetPos = new THREE.Vector3(curr.x, EYE_HEIGHT_STANDING, standZ);

      transitionRef.current = {
        active: true,
        type: 'stand',
        startPos: curr,
        targetPos,
        startYXZ: { pitch: cameraEuler.current.x, yaw: cameraEuler.current.y },
        targetYXZ: { pitch: 0, yaw: cameraEuler.current.y },
        progress: 0,
        duration: 0.55,
      };
    }
  }, []);

  // Handle direct 3D raycast click
  const handleObjectClick = useCallback((obj: THREE.Object3D) => {
    const data = obj.userData;
    if (!data) return;

    if (data.category === 'stool') {
      sitDownAt(data.station);
      return;
    }

    if (data.interactId && String(data.interactId).startsWith('poster_')) {
      soundFx.playSuccessChime();
      const title = data.label || 'Lab Instructional Guide';
      const prompt = `Can you explain the principles shown on the "${title}" lab poster on the classroom wall, and provide clear step-by-step guidance on how to perform experiments using the equipment here in the lab?`;
      const context = `The student clicked on the framed educational wall poster "${title}" in the 3D science classroom. Provide concise, high-yield scientific explanations and practical laboratory procedures.`;
      setPhoneInitialTab('ai');
      setPhoneAIPrompt(prompt);
      setPhoneAIContext(context);
      setIsPhoneOpen(true);
      return;
    }

    if (data.station === 'biology') {
      if (data.interactId === 'micro_eyepieces') {
        soundFx.playClick();
        setIsViewingEyepieces(true);
      } else if (data.interactId === 'micro_turret') {
        soundFx.playLensTurretClick();
        setBiologyState((prev) => {
          const objs: ('4x' | '10x' | '40x' | '100x')[] = ['4x', '10x', '40x', '100x'];
          const nextIdx = (objs.indexOf(prev.objective) + 1) % objs.length;
          return { ...prev, objective: objs[nextIdx] };
        });
      } else if (data.interactId === 'micro_slide') {
        soundFx.playGlassSlide();
        setBiologyState((prev) => ({
          ...prev,
          slideIndex: (prev.slideIndex + 1) % SPECIMEN_CATALOG.length,
        }));
      } else if (data.interactId === 'micro_coarse_focus') {
        soundFx.playKnobTick();
        setBiologyState((prev) => ({
          ...prev,
          coarseFocus: (prev.coarseFocus + 0.1) % 1.0,
        }));
      } else if (data.interactId === 'micro_fine_focus') {
        soundFx.playKnobTick();
        setBiologyState((prev) => ({
          ...prev,
          fineFocus: (prev.fineFocus + 0.05) % 1.0,
        }));
      } else if (data.interactId === 'micro_light_switch') {
        soundFx.playClick();
        setBiologyState((prev) => ({
          ...prev,
          lightIntensity: prev.lightIntensity > 0.5 ? 0.3 : 1.0,
        }));
      }
    } else if (data.station === 'chemistry') {
      if (data.interactId === 'chem_stopcock' || data.interactId === 'chem_burette_valve') {
        soundFx.playClick();
        setChemistryState((prev) => ({ ...prev, buretteOpen: !prev.buretteOpen }));
      } else if (data.interactId === 'chem_stirrer_knob') {
        soundFx.playKnobTick();
        setChemistryState((prev) => ({
          ...prev,
          stirrerRPM: prev.stirrerRPM === 0 ? 400 : prev.stirrerRPM === 400 ? 800 : 0,
        }));
      } else if (data.interactId === 'chem_indicator' || data.interactId === 'chem_flask' || data.interactId === 'chem_beaker') {
        soundFx.playDropLiquid();
        setChemistryState((prev) => ({ ...prev, indicatorAdded: true }));
      }
    } else if (data.station === 'physics') {
      if (data.interactId === 'phys_knife_switch') {
        soundFx.playSwitchToggle(!physicsState.switchClosed);
        setPhysicsState((prev) => ({ ...prev, switchClosed: !prev.switchClosed }));
      } else if (data.interactId === 'phys_potentiometer') {
        soundFx.playKnobTick();
        setPhysicsState((prev) => ({
          ...prev,
          resistance: prev.resistance >= 90 ? 10 : prev.resistance + 20,
        }));
      }
    } else if (data.station === 'research') {
      if (data.interactId === 'res_balance_door') {
        soundFx.playClick();
        setAnalyticalState((prev) => ({ ...prev, doorsOpen: !prev.doorsOpen }));
      } else if (data.interactId === 'res_tare_btn') {
        soundFx.playBeep();
        setAnalyticalState((prev) => ({ ...prev, balanceWeight: 0.0 }));
      } else if (data.interactId === 'res_centrifuge_start' || data.interactId === 'res_centrifuge_lid') {
        soundFx.playCentrifugeSpin();
        setAnalyticalState((prev) => ({ ...prev, centrifugeRunning: !prev.centrifugeRunning }));
      }
    }
  }, [sitDownAt, physicsState.switchClosed]);

  // Teleport helper
  const handleTeleport = useCallback((dest: 'center' | 'biology' | 'chemistry' | 'physics' | 'research') => {
    if (!cameraRef.current) return;
    soundFx.playClick();
    if (dest === 'center') {
      standUp();
      cameraRef.current.position.set(0, EYE_HEIGHT_STANDING, 5.5);
      cameraEuler.current.set(0, Math.PI, 0, 'YXZ');
    } else {
      sitDownAt(dest);
    }
  }, [sitDownAt, standUp]);

  // Open Scientist Phone helper
  const handleOpenPhoneWithTab = (tab: PhoneAppTab, prompt?: string, context?: string) => {
    soundFx.playClick();
    setPhoneInitialTab(tab);
    setPhoneAIPrompt(prompt);
    setPhoneAIContext(context);
    setIsPhoneOpen(true);
  };

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      // Space or Escape stands up if seated
      if ((e.code === 'Space' || e.code === 'Escape') && isSeated) {
        standUp();
      }

      // 'F' key looks through eyepieces if seated at biology
      if (e.code === 'KeyF' && isSeated && seatedStation === 'biology') {
        setIsViewingEyepieces((prev) => !prev);
      }

      // 'P' or 'M' key opens Scientist Phone
      if (e.code === 'KeyP' || e.code === 'KeyM') {
        setIsPhoneOpen((prev) => !prev);
        soundFx.playClick();
      }

      // 'E' key interacts with hovered action
      if (e.code === 'KeyE' && hoveredAction) {
        if (hoveredAction.category === 'stool') {
          sitDownAt(hoveredAction.station);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSeated, seatedStation, hoveredAction, sitDownAt, standUp]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#f8fafc');
    scene.fog = new THREE.FogExp2('#f8fafc', 0.005);

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    camera.position.set(0, EYE_HEIGHT_STANDING, 5.5);
    cameraEuler.current.set(0, Math.PI, 0, 'YXZ');
    camera.quaternion.setFromEuler(cameraEuler.current);
    cameraRef.current = camera;

    // Attach Scientist Character 1st-Person Rig
    const scientistRig = createFirstPersonScientistRig();
    scientistRigRef.current = scientistRig;
    camera.add(scientistRig);
    scene.add(camera);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Bright Ambient & Hemisphere Illumination (Daylight White 6000K)
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.35);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#cbd5e1', 0.65);
    scene.add(hemiLight);

    const mainCeilingLight = new THREE.DirectionalLight('#ffffff', 1.8);
    mainCeilingLight.position.set(0, 8, 0);
    mainCeilingLight.castShadow = true;
    mainCeilingLight.shadow.mapSize.width = 2048;
    mainCeilingLight.shadow.mapSize.height = 2048;
    scene.add(mainCeilingLight);

    // Realistic Overhead Fluorescent Troffers with Bright Downlights
    const trofferPositions = [
      [-4.5, 4.8, -3.5],
      [4.5, 4.8, -3.5],
      [-4.5, 4.8, 3.5],
      [4.5, 4.8, 3.5],
      [0, 4.8, 0],
    ];

    trofferPositions.forEach(([tx, ty, tz]) => {
      const troffer = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.08, 0.6),
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          emissive: '#ffffff',
          emissiveIntensity: 1.0,
          roughness: 0.1,
        })
      );
      troffer.position.set(tx, ty, tz);
      scene.add(troffer);

      const downLight = new THREE.PointLight('#ffffff', 1.6, 7.5);
      downLight.position.set(tx, ty - 0.2, tz);
      scene.add(downLight);
    });

    // Laboratory Room Floor (High-Gloss White/Light-Gray Chemical Epoxy Resin)
    const floorGeo = new THREE.PlaneGeometry(24, 24, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.14,
      metalness: 0.18,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Epoxy floor grid demarcation lines
    const gridHelper = new THREE.GridHelper(24, 24, '#0284c7', '#cbd5e1');
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Realistic Clean Antimicrobial Laboratory Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.45, metalness: 0.05 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), wallMat);
    backWall.position.set(0, 4, -12);
    scene.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), wallMat);
    frontWall.position.set(0, 4, 12);
    frontWall.rotation.y = Math.PI;
    scene.add(frontWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), wallMat);
    rightWall.position.set(12, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), wallMat);
    leftWall.position.set(-12, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // Sunlit Panoramic Windows on Left Wall
    [-6, 0, 6].forEach((wz) => {
      const skyPane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.0, 3.8),
        new THREE.MeshBasicMaterial({ color: '#bae6fd' })
      );
      skyPane.position.set(-11.92, 4.0, wz);
      skyPane.rotation.y = Math.PI / 2;
      scene.add(skyPane);

      const winFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 4.0, 3.2),
        new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.5, roughness: 0.2 })
      );
      winFrame.position.set(-11.9, 4.0, wz);
      scene.add(winFrame);
    });

    // Add Chemical Fume Hood at Center Back Wall
    const fumeHood = createFumeHood();
    fumeHood.position.set(0, 0, -11.3);
    scene.add(fumeHood);

    // Add Emergency Safety Shower & Eye Wash Station
    const safetyShower = createSafetyShower();
    safetyShower.position.set(11.2, 0, 4.0);
    safetyShower.rotation.y = -Math.PI / 2;
    scene.add(safetyShower);

    // Add Science Whiteboard on Front Wall
    const whiteboard = createLabWhiteboard();
    whiteboard.position.set(0, 2.5, 11.85);
    whiteboard.rotation.y = Math.PI;
    scene.add(whiteboard);

    // 4 Workstation Benches with Overhead Shelves & Swivel Stools
    const interactiveList: THREE.Object3D[] = [];

    // Add Framed Laboratory Educational Posters & Equipment Usage Infographics on Classroom Walls
    const { group: postersGroup, interactiveMeshes: posterMeshes } = createAllLabWallPosters();
    scene.add(postersGroup);
    posterMeshes.forEach((mesh) => interactiveList.push(mesh));

    const benchConfigs: Array<{
      station: 'biology' | 'chemistry' | 'physics' | 'research';
      x: number;
      z: number;
      label: string;
      stoolZ: number;
    }> = [
      { station: 'biology', x: -4.5, z: -3.5, label: 'Biology & Microscopy', stoolZ: -2.3 },
      { station: 'chemistry', x: 4.5, z: -3.5, label: 'Chemistry & Titration', stoolZ: -2.3 },
      { station: 'physics', x: -4.5, z: 3.5, label: 'Physics & Circuits', stoolZ: 4.7 },
      { station: 'research', x: 4.5, z: 3.5, label: 'Analytical Science', stoolZ: 4.7 },
    ];

    benchConfigs.forEach((cfg) => {
      // Table group
      const bench = new THREE.Group();
      bench.position.set(cfg.x, 0, cfg.z);

      // Clean Solid White Chemical-Grade Resin Tabletop (Height 0.88m, Depth 1.8m)
      const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.12, 1.8),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18, metalness: 0.15 })
      );
      tableTop.position.y = 0.88;
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      bench.add(tableTop);

      // Brushed Stainless Steel Frame Legs
      const legMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.15 });
      [
        [-1.6, -0.7],
        [1.6, -0.7],
        [-1.6, 0.7],
        [1.6, 0.7],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.88, 16), legMat);
        leg.position.set(lx, 0.44, lz);
        leg.castShadow = true;
        bench.add(leg);
      });

      scene.add(bench);

      // Add Overhead Reagent Shelf above each bench
      const shelf = createReagentShelf();
      shelf.position.set(cfg.x, 2.1, cfg.z + (cfg.z < 0 ? -0.6 : 0.6));
      scene.add(shelf);

      // Add Swivel Lab Stool (Seat cushion at 0.62m)
      const stool = createLabStool(cfg.station, cfg.x, cfg.stoolZ, cfg.stoolZ > 0 ? Math.PI : 0);
      scene.add(stool);
      stool.traverse((c) => {
        if (c.userData && c.userData.isInteractive) {
          interactiveList.push(c);
        }
      });
    });

    // 1. Biology 3D Microscope Setup (Ready-Made High-Fidelity GLB Model)
    createReadyMadeMicroscope('biology').then((microscope) => {
      microscope.position.set(-4.5, 0.94, -3.5);
      scene.add(microscope);
      microEquipmentRef.current = microscope;
      microscope.traverse((c) => {
        if (c.userData && c.userData.isInteractive) interactiveList.push(c);
      });
      interactiveObjectsRef.current = [...interactiveList];
    });

    // 2. Chemistry 3D Titration Suite & Ready-Made Glassware GLB Setup
    createReadyMadeChemistryStation('chemistry').then((chemRig) => {
      chemRig.position.set(4.5, 0.94, -3.5);
      scene.add(chemRig);
      chemEquipmentRef.current = chemRig;
      chemRig.traverse((c) => {
        if (c.userData && c.userData.isInteractive) interactiveList.push(c);
      });
      interactiveObjectsRef.current = [...interactiveList];
    });

    // 3. Physics 3D Circuit & Apparatus Ready-Made Setup
    createReadyMadePhysicsBench('physics').then((physBench) => {
      physBench.position.set(-4.5, 0.94, 3.5);
      scene.add(physBench);
      physEquipmentRef.current = physBench;
      physBench.traverse((c) => {
        if (c.userData && c.userData.isInteractive) interactiveList.push(c);
      });
      interactiveObjectsRef.current = [...interactiveList];
    });

    // 4. Research 3D Analytical Suite Ready-Made Setup
    createReadyMadeAnalyticalBench('research').then((resBench) => {
      resBench.position.set(4.5, 0.94, 3.5);
      scene.add(resBench);
      resBench.traverse((c) => {
        if (c.userData && c.userData.isInteractive) interactiveList.push(c);
      });
      interactiveObjectsRef.current = [...interactiveList];
    });

    interactiveObjectsRef.current = interactiveList;

    // Raycaster for Center Reticle Hover & Click
    const raycaster = new THREE.Raycaster();
    const centerScreen = new THREE.Vector2(0, 0);

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        const sensitivity = 0.0022;
        cameraEuler.current.y -= e.movementX * sensitivity;
        cameraEuler.current.x -= e.movementY * sensitivity;

        // When seated, constrain head swivel to realistic cervical rotation range
        if (isSeated) {
          cameraEuler.current.x = Math.max(-0.9, Math.min(0.65, cameraEuler.current.x));
        } else {
          cameraEuler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraEuler.current.x));
        }
      }
    };

    const handleCanvasClick = () => {
      if (document.pointerLockElement !== renderer.domElement && !isTouch) {
        renderer.domElement.requestPointerLock();
      }

      // Check raycast click on center dot
      if (cameraRef.current) {
        raycaster.setFromCamera(centerScreen, cameraRef.current);
        const hits = raycaster.intersectObjects(interactiveObjectsRef.current, true);
        if (hits.length > 0) {
          const hitObj = hits[0].object;
          if (hitObj.userData && hitObj.userData.isInteractive) {
            handleObjectClick(hitObj);
          }
        }
      }
    };

    // Mobile / Touch Look Handler on right half of canvas
    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX > window.innerWidth / 2 && touchLookId.current === null) {
          touchLookId.current = t.identifier;
          touchLookLastPos.current = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchLookId.current && touchLookLastPos.current) {
          const dx = t.clientX - touchLookLastPos.current.x;
          const dy = t.clientY - touchLookLastPos.current.y;
          touchLookLastPos.current = { x: t.clientX, y: t.clientY };

          const sensitivity = 0.004;
          cameraEuler.current.y -= dx * sensitivity;
          cameraEuler.current.x -= dy * sensitivity;
          if (isSeated) {
            cameraEuler.current.x = Math.max(-0.9, Math.min(0.65, cameraEuler.current.x));
          } else {
            cameraEuler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraEuler.current.x));
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchLookId.current) {
          touchLookId.current = null;
          touchLookLastPos.current = null;
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleCanvasClick);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Animation & Physics Loop
    let lastTime = performance.now();
    let coordUpdateCounter = 0;

    const animateLoop = () => {
      animationFrameId.current = requestAnimationFrame(animateLoop);

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Check for motion key intent to auto-stand up if seated
      const moveIntent =
        keysPressed.current['KeyW'] ||
        keysPressed.current['ArrowUp'] ||
        keysPressed.current['KeyS'] ||
        keysPressed.current['ArrowDown'] ||
        keysPressed.current['KeyA'] ||
        keysPressed.current['ArrowLeft'] ||
        keysPressed.current['KeyD'] ||
        keysPressed.current['ArrowRight'] ||
        touchMoveVector.current.x !== 0 ||
        touchMoveVector.current.z !== 0;

      if (isSeated && moveIntent && !transitionRef.current?.active) {
        standUp();
      }

      // Handle Smooth Cinematic Camera Transitions (Sitting down / Standing up)
      if (transitionRef.current?.active && cameraRef.current) {
        const tr = transitionRef.current;
        tr.progress += delta / tr.duration;

        if (tr.progress >= 1.0) {
          tr.progress = 1.0;
          tr.active = false;
          cameraRef.current.position.copy(tr.targetPos);
          cameraEuler.current.x = tr.targetYXZ.pitch;
          cameraEuler.current.y = tr.targetYXZ.yaw;
          transitionRef.current = null;
        } else {
          // Smooth Hermite S-Curve Interpolation: t * t * (3 - 2 * t)
          const p = tr.progress;
          const ease = p * p * (3 - 2 * p);

          cameraRef.current.position.lerpVectors(tr.startPos, tr.targetPos, ease);
          cameraEuler.current.x = THREE.MathUtils.lerp(tr.startYXZ.pitch, tr.targetYXZ.pitch, ease);
          cameraEuler.current.y = THREE.MathUtils.lerp(tr.startYXZ.yaw, tr.targetYXZ.yaw, ease);
        }
      } else if (!isSeated && cameraRef.current) {
        // First-Person Walking Physics & Eye Height Enforcement
        const moveVector = new THREE.Vector3();
        if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) moveVector.z -= 1;
        if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) moveVector.z += 1;
        if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) moveVector.x -= 1;
        if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) moveVector.x += 1;

        if (touchMoveVector.current.x !== 0 || touchMoveVector.current.z !== 0) {
          moveVector.x += touchMoveVector.current.x;
          moveVector.z += touchMoveVector.current.z;
        }

        const isMoving = moveVector.lengthSq() > 0.01;
        isWalkingRef.current = isMoving;

        if (isMoving) {
          moveVector.normalize();
          const speed = 4.0;
          const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraEuler.current.y);
          const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraEuler.current.y);

          const desiredVelocity = new THREE.Vector3()
            .addScaledVector(forward, -moveVector.z * speed)
            .addScaledVector(right, moveVector.x * speed);

          playerVelocity.current.lerp(desiredVelocity, 10 * delta);

          walkTimerRef.current += delta * 8.5;
          stepTimerRef.current += delta;
          if (stepTimerRef.current > 0.38) {
            soundFx.playFootstep();
            stepTimerRef.current = 0;
          }
        } else {
          playerVelocity.current.lerp(new THREE.Vector3(0, 0, 0), 10 * delta);
          idleTimerRef.current += delta * 1.8;
        }

        // Apply Velocity to Player Position
        cameraRef.current.position.x += playerVelocity.current.x * delta;
        cameraRef.current.position.z += playerVelocity.current.z * delta;

        // Biomechanical Eye Height & Natural Head-Bobbing
        const headBobY = isMoving
          ? Math.sin(walkTimerRef.current) * 0.016
          : Math.sin(idleTimerRef.current) * 0.0025;

        // Strict Human Eye Level Enforcement (1.68m)
        cameraRef.current.position.y = EYE_HEIGHT_STANDING + headBobY;

        // Laboratory Boundaries
        cameraRef.current.position.x = Math.max(-10.5, Math.min(10.5, cameraRef.current.position.x));
        cameraRef.current.position.z = Math.max(-10.5, Math.min(10.5, cameraRef.current.position.z));
      } else if (isSeated && cameraRef.current && !transitionRef.current?.active) {
        // Gentle seated breathing
        idleTimerRef.current += delta * 1.5;
        const breathY = Math.sin(idleTimerRef.current) * 0.0018;
        cameraRef.current.position.y = EYE_HEIGHT_SITTING + breathY;
      }

      // Apply Camera Orientation & Reticle Raycast
      if (cameraRef.current) {
        cameraRef.current.quaternion.setFromEuler(cameraEuler.current);

        // Center Reticle Raycast
        raycaster.setFromCamera(centerScreen, cameraRef.current);
        const hits = raycaster.intersectObjects(interactiveObjectsRef.current, true);
        if (hits.length > 0) {
          const hit = hits[0].object;
          if (hit.userData && hit.userData.isInteractive) {
            setHoveredAction({
              id: hit.userData.interactId,
              label: hit.userData.label,
              action: hit.userData.action,
              station: hit.userData.station,
              category: hit.userData.category,
            });
          }
        } else {
          setHoveredAction(null);
        }

        // Update coordinates for Mini Map Radar throttled
        coordUpdateCounter++;
        if (coordUpdateCounter % 4 === 0) {
          setPlayerCoords({
            x: cameraRef.current.position.x,
            z: cameraRef.current.position.z,
            yaw: cameraEuler.current.y,
          });
        }
      }

      // Update 1st-Person Scientist Kinematics (Zero float, realistic posture)
      if (scientistRigRef.current) {
        updateScientistRig(scientistRigRef.current, {
          isWalking: isWalkingRef.current,
          isSeated,
          walkTimer: isWalkingRef.current ? walkTimerRef.current : idleTimerRef.current,
          delta,
          pitch: cameraEuler.current.x,
        });
      }

      // Animate Chemistry Stirrer
      if (chemEquipmentRef.current) {
        const uData = chemEquipmentRef.current.userData;
        if (uData && uData.stirBar && chemistryStateRef.current.stirrerRPM > 0) {
          uData.stirBar.rotation.y += (chemistryStateRef.current.stirrerRPM / 60) * Math.PI * 2 * delta;
        }
      }

      renderer.render(scene, camera);
    };

    animateLoop();

    // Resize Handler
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, [handleObjectClick, isSeated, isTouch, standUp]);

  // Update 3D Microscope Mesh States
  useEffect(() => {
    if (!microEquipmentRef.current) return;
    const uData = microEquipmentRef.current.userData;
    if (!uData) return;

    if (uData.stageAssembly) {
      uData.stageAssembly.position.y = 0.16 + (1 - biologyState.coarseFocus) * 0.02;
    }

    if (uData.turret) {
      const angles: { [key: string]: number } = {
        '4x': 0,
        '10x': Math.PI / 2,
        '40x': Math.PI,
        '100x': -Math.PI / 2,
      };
      uData.turret.rotation.y = angles[biologyState.objective] || 0;
    }
  }, [biologyState]);

  // Update 3D Chemistry Mesh States
  useEffect(() => {
    chemistryStateRef.current = chemistryState;
    if (!chemEquipmentRef.current) return;
    const uData = chemEquipmentRef.current.userData;
    if (!uData) return;

    if (uData.stopcock) {
      uData.stopcock.rotation.z = chemistryState.buretteOpen ? 0 : Math.PI / 2;
    }

    if (uData.flaskLiquid) {
      const mat = uData.flaskLiquid.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (chemistryState.indicatorAdded) {
          mat.color.set(chemistryState.dispensedML >= 25.0 ? '#f43f5e' : '#fce7f3');
        } else {
          mat.color.set('#e0f2fe');
        }
      }
    }
  }, [chemistryState]);

  // Update 3D Physics Mesh States
  useEffect(() => {
    if (!physEquipmentRef.current) return;
    const uData = physEquipmentRef.current.userData;
    if (!uData) return;

    if (uData.blade) {
      uData.blade.rotation.z = physicsState.switchClosed ? 0 : 0.6;
    }

    if (uData.potKnob) {
      uData.potKnob.rotation.y = (physicsState.resistance / 100) * Math.PI * 1.5;
    }

    if (uData.bulbLight && uData.bulbGlass) {
      const isLit = physicsState.switchClosed;
      const power = isLit ? (physicsState.voltage ** 2 / physicsState.resistance) * 0.08 : 0;
      uData.bulbLight.intensity = Math.min(3.5, power * 2.5);
      const glassMat = uData.bulbGlass.material as THREE.MeshStandardMaterial;
      if (glassMat) {
        glassMat.emissiveIntensity = isLit ? 1.0 : 0.05;
      }
    }
  }, [physicsState]);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Center Reticle Crosshair ("The Dot") */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <div
          className={`w-2.5 h-2.5 rounded-full border transition-all duration-150 ${
            hoveredAction
              ? 'bg-emerald-400 border-emerald-200 scale-150 shadow-[0_0_14px_#34d399]'
              : 'bg-white/70 border-slate-900/60 scale-100'
          }`}
        />

        {/* Hover Action Badge */}
        {hoveredAction && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-6 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-emerald-500/50 shadow-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <div className="text-left">
                <span className="text-[11px] font-bold text-white block">{hoveredAction.label}</span>
                <span className="text-[10px] text-emerald-300 block font-medium">
                  [Click / E] {hoveredAction.action}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Left Clean Status Pill & Home Button */}
      <div className="absolute top-4 left-4 z-40 pointer-events-auto flex items-center gap-2">
        <button
          onClick={onExitToLanding}
          className="flex items-center gap-2.5 bg-slate-950/85 hover:bg-slate-900/90 backdrop-blur-xl px-3.5 py-2 rounded-full border border-slate-700/80 hover:border-emerald-500/50 shadow-2xl transition-all group"
          title="Exit 3D Lab and Return to Landing Page"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 border border-emerald-500/40 flex items-center justify-center text-xs text-emerald-400 font-bold transition-transform group-hover:scale-105">
            🔬
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">LabBridge 3D</span>
              <span className="text-[10px] text-slate-400 group-hover:text-emerald-300 font-medium">← Home</span>
            </div>
            <span className="text-[9px] text-emerald-400 block font-mono">
              {isSeated && seatedStation ? `Seated @ ${seatedStation.toUpperCase()}` : 'Exploring Laboratory'}
            </span>
          </div>
        </button>
      </div>

      {/* Top-Right Round Mini Map Radar (Click to Pause) */}
      <MiniMapRadar
        playerX={playerCoords.x}
        playerZ={playerCoords.z}
        playerYaw={playerCoords.yaw}
        isSeated={isSeated}
        seatedStation={seatedStation}
        onTeleport={handleTeleport}
        onExitToLanding={onExitToLanding}
        onOpenPhone={() => setIsPhoneOpen(true)}
      />

      {/* Virtual Walking Joystick on Bottom-Left */}
      {!isSeated && (
        <div className="absolute bottom-6 left-6 z-40 pointer-events-auto">
          <VirtualJoystick
            onMove={(vec) => {
              touchMoveVector.current = vec;
            }}
          />
        </div>
      )}

      {/* Round Glassmorphism Phone Button at ~30% from the bottom */}
      <div className="absolute bottom-[28%] right-6 z-40 pointer-events-auto">
        <button
          onClick={() => {
            soundFx.playClick();
            setIsPhoneOpen(true);
          }}
          className="relative w-14 h-14 rounded-full bg-slate-950/80 backdrop-blur-2xl border-2 border-emerald-500/40 hover:border-emerald-400 text-emerald-400 flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.8)] active:scale-95 transition-all group"
          title="Open Scientist Smartphone (AI, Teleport, Protocols, Calculator)"
        >
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors animate-pulse" />
          <Smartphone className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-950 animate-bounce" />
        </button>
      </div>

      {/* Contextual Action Buttons (Sit / Stand / Eyepieces) */}
      <div className="absolute bottom-6 right-6 z-40 pointer-events-auto flex items-center gap-3">
        {!isSeated && hoveredAction && (
          <button
            onClick={() => {
              if (hoveredAction.category === 'stool') {
                sitDownAt(hoveredAction.station);
              }
            }}
            className="px-4 py-3 rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-xl shadow-emerald-950/60 backdrop-blur-xl border border-emerald-300 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Hand className="w-4 h-4" />
            <span>{hoveredAction.category === 'stool' ? 'Sit Down' : 'Interact'}</span>
          </button>
        )}

        {isSeated && (
          <button
            onClick={standUp}
            className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 text-rose-400 border border-rose-500/40 shadow-xl backdrop-blur-xl flex items-center justify-center active:scale-95 transition-all"
            title="Stand Up [Space / WASD]"
          >
            <Footprints className="w-5 h-5" />
          </button>
        )}

        {isSeated && seatedStation === 'biology' && (
          <button
            onClick={() => setIsViewingEyepieces(true)}
            className="px-4 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-xl backdrop-blur-xl border border-emerald-300 flex items-center gap-2 active:scale-95 transition-all"
            title="Look through Eyepieces [F]"
          >
            <Eye className="w-4 h-4" />
            <span>Look in Oculars</span>
          </button>
        )}
      </div>

      {/* Seated Station Direct 3D Equipment Toolbar */}
      {isSeated && seatedStation && (
        <SeatedStationToolbar
          station={seatedStation}
          onStandUp={standUp}
          onOpenNotebook={() => handleOpenPhoneWithTab('notebook')}
          onOpenAssistant={() => handleOpenPhoneWithTab('ai')}
          onLookThroughEyepieces={() => setIsViewingEyepieces(true)}
          onRotateTurret={() =>
            setBiologyState((prev) => {
              const objs: ('4x' | '10x' | '40x' | '100x')[] = ['4x', '10x', '40x', '100x'];
              const nextIdx = (objs.indexOf(prev.objective) + 1) % objs.length;
              return { ...prev, objective: objs[nextIdx] };
            })
          }
          onSwapSlide={() =>
            setBiologyState((prev) => ({
              ...prev,
              slideIndex: (prev.slideIndex + 1) % SPECIMEN_CATALOG.length,
            }))
          }
          activeObjective={biologyState.objective}
          activeSlideName={SPECIMEN_CATALOG[biologyState.slideIndex].name}
          buretteOpen={chemistryState.buretteOpen}
          onToggleBurette={() => setChemistryState((prev) => ({ ...prev, buretteOpen: !prev.buretteOpen }))}
          stirrerRPM={chemistryState.stirrerRPM}
          onToggleStirrer={() =>
            setChemistryState((prev) => ({
              ...prev,
              stirrerRPM: prev.stirrerRPM === 0 ? 400 : prev.stirrerRPM === 400 ? 800 : 0,
            }))
          }
          onAddIndicator={() => setChemistryState((prev) => ({ ...prev, indicatorAdded: true }))}
          phValue={chemistryState.phValue}
          dispensedML={chemistryState.dispensedML}
          switchClosed={physicsState.switchClosed}
          onToggleSwitch={() => setPhysicsState((prev) => ({ ...prev, switchClosed: !prev.switchClosed }))}
          resistance={physicsState.resistance}
          onChangeResistance={(val) => setPhysicsState((prev) => ({ ...prev, resistance: val }))}
          currentMA={(physicsState.voltage / physicsState.resistance) * 1000}
          voltageV={physicsState.voltage}
          balanceDoorsOpen={analyticalState.doorsOpen}
          onToggleBalanceDoor={() => setAnalyticalState((prev) => ({ ...prev, doorsOpen: !prev.doorsOpen }))}
          onTareBalance={() => setAnalyticalState((prev) => ({ ...prev, balanceWeight: 0.0 }))}
          balanceWeight={analyticalState.balanceWeight}
          centrifugeRunning={analyticalState.centrifugeRunning}
          onToggleCentrifuge={() => setAnalyticalState((prev) => ({ ...prev, centrifugeRunning: !prev.centrifugeRunning }))}
        />
      )}

      {/* In-World 3D Microscope Eyepiece Ocular Mode */}
      {isViewingEyepieces && (
        <EyepieceOcularOverlay
          onClose={() => setIsViewingEyepieces(false)}
          onSaveSnapshot={onSaveSnapshot}
          onAskAI={onAskAI}
          initialSpecimenId={SPECIMEN_CATALOG[biologyState.slideIndex].id}
          initialObjective={biologyState.objective}
          initialCoarse={biologyState.coarseFocus}
          initialFine={biologyState.fineFocus}
          initialLight={biologyState.lightIntensity}
          onStateChange={(st) => {
            setBiologyState((prev) => ({
              ...prev,
              objective: st.objective,
              coarseFocus: st.coarseFocus,
              fineFocus: st.fineFocus,
              stageX: st.stageX,
              stageY: st.stageY,
              lightIntensity: st.lightIntensity,
            }));
          }}
        />
      )}

      {/* Scientist Smartphone Device Modal */}
      <ScientistPhoneModal
        isOpen={isPhoneOpen}
        onClose={() => setIsPhoneOpen(false)}
        onTeleport={handleTeleport}
        onOpenEyepieces={() => setIsViewingEyepieces(true)}
        seatedStation={seatedStation}
        isSeated={isSeated}
        snapshots={snapshots}
        initialTab={phoneInitialTab}
        initialAIPrompt={phoneAIPrompt}
        initialAIContext={phoneAIContext}
        onSaveSnapshot={onSaveSnapshot}
      />
    </div>
  );
}
