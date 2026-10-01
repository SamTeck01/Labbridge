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
import EyepieceOcularOverlay from '@/components/EyepieceOcularOverlay';
import ScientistPhoneModal, { PhoneAppTab } from '@/components/ScientistPhoneModal';
import ExperimentPanel from '@/components/ExperimentPanel';
import LabTutorial from '@/components/LabTutorial';
import MiniMapRadar from '@/components/MiniMapRadar';
import VirtualJoystick from '@/components/VirtualJoystick';
import { SnapshotItem } from '@/components/LabNotebookModal';
import { SPECIMEN_CATALOG } from '@/lib/specimenGenerator';
import { createAllLabWallPosters } from '@/lib/labPosters';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { labStore, useLab, type LabState, type Station } from '@/lib/labStore';
import { curie, useCurie, startCurieWatch } from '@/lib/curie';
import { createWhiteboardNotes } from '@/lib/whiteboardNotes';
import { createCurieNPC, type CurieNPC } from '@/lib/curieNPC';
import { disposeObject, loadLabModel, swapInModel, clearModelCache, wireInteractiveNodes } from '@/lib/assetLoader';
import { mergeStaticMeshes, QualityManager, FrameScheduler, releaseCanvasAfterUpload } from '@/lib/scenePerf';
import { FirstPersonHands } from '@/lib/workbench/hands';
import { TitrationBench } from '@/lib/workbench/titrationBench';
import { MicroscopeBench, CircuitBench, BalanceBench, type Workbench } from '@/lib/workbench/benches';
import { FlameBench } from '@/lib/workbench/flameBench';
import { experiments } from '@/lib/experiments';
import { getGraphics, type GraphicsSetting } from '@/lib/graphicsSetting';

export type StationType = Station | null;

interface Lab3DSceneProps {
  initialStation?: Station | null;
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

// Furniture the student can't walk through: [centre x, centre z, half-width x, half-depth z]
const PLAYER_RADIUS = 0.3;
const OBSTACLES: [number, number, number, number][] = [
  [-4.5, -3.5, 1.8, 0.9], // biology bench
  [4.5, -3.5, 1.8, 0.9], // chemistry bench
  [-4.5, 3.5, 1.8, 0.9], // physics bench
  [4.5, 3.5, 1.8, 0.9], // analytical bench
  [0, -11.3, 1.2, 0.6], // fume hood
  [11.2, 4.0, 0.5, 0.5], // safety shower
];

interface CameraTransition {
  active: boolean;
  type: 'sit' | 'stand';
  station?: Station;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  startYXZ: { pitch: number; yaw: number };
  targetYXZ: { pitch: number; yaw: number };
  progress: number;
  duration: number;
}

function makeSetter<K extends keyof LabState>(key: K) {
  return (patch: LabState[K] | ((prev: LabState[K]) => LabState[K])) => labStore.update(key, patch);
}

const setBiologyState = makeSetter('biology');
const setChemistryState = makeSetter('chemistry');
const setPhysicsState = makeSetter('physics');
const setAnalyticalState = makeSetter('research');

/** Applies analytical-bench state to its meshes (balance door, readout). */
function applyResearchState(root: THREE.Object3D | null, analyticalState: LabState['research']) {
  const uData = root?.userData;
  if (!uData) return;
  const door = uData.balanceDoor as THREE.Object3D | undefined;
  if (door && !uData.benchOwnsDoor) {
    if (door.userData.baseZ === undefined) door.userData.baseZ = door.position.z;
    door.position.z = door.userData.baseZ - (analyticalState.doorsOpen ? 0.2 : 0); // slides toward the back
  }
  const display = uData.balanceDisplay as THREE.Mesh | undefined;
  if (display) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0b2a22';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#7dffcf';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${analyticalState.balanceWeight.toFixed(4)} g`, 244, 46);
    const mat = display.material as THREE.MeshStandardMaterial;
    mat.map?.dispose();
    mat.map = releaseCanvasAfterUpload(new THREE.CanvasTexture(canvas));
    mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.color.set('#ffffff');
    mat.emissive.set('#ffffff');
    mat.emissiveMap = mat.map;
    mat.emissiveIntensity = 0.8;
    mat.needsUpdate = true;
  }
}

/** Mini-map that polls the player pose at 8 Hz, isolating its re-renders from the 3D scene component. */
function LiveMiniMap({
  poseRef,
  ...rest
}: { poseRef: React.RefObject<{ x: number; z: number; yaw: number }> } & Omit<React.ComponentProps<typeof MiniMapRadar>, 'playerX' | 'playerZ' | 'playerYaw'>) {
  const [pose, setPose] = useState({ x: 0, z: 5.5, yaw: Math.PI });
  useEffect(() => {
    const id = setInterval(() => {
      const p = poseRef.current;
      setPose((prev) => (Math.abs(prev.x - p.x) + Math.abs(prev.z - p.z) + Math.abs(prev.yaw - p.yaw) > 0.01 ? { ...p } : prev));
    }, 125);
    return () => clearInterval(id);
  }, [poseRef]);
  return <MiniMapRadar playerX={pose.x} playerZ={pose.z} playerYaw={pose.yaw} {...rest} />;
}

/**
 * Keeps non-bench apparatus meshes in sync with lab state. It lives in its own component so lab
 * state ticks (5x/s while titrating) re-render only this, never the whole 3D scene component.
 */
function ApparatusSync({
  microEquipmentRef,
  chemEquipmentRef,
  physEquipmentRef,
  resEquipmentRef,
  benchesRef,
  physicsVersion,
  researchVersion,
}: {
  microEquipmentRef: React.RefObject<THREE.Group | null>;
  chemEquipmentRef: React.RefObject<THREE.Group | null>;
  physEquipmentRef: React.RefObject<THREE.Group | null>;
  resEquipmentRef: React.RefObject<THREE.Group | null>;
  benchesRef: React.RefObject<Partial<Record<string, unknown>>>;
  physicsVersion: number;
  researchVersion: number;
}) {
  const biologyState = useLab((st) => st.biology);
  const chemistryState = useLab((st) => st.chemistry);
  const physicsState = useLab((st) => st.physics);
  const analyticalState = useLab((st) => st.research);

  // Update 3D Microscope Mesh States
  useEffect(() => {
    if (!microEquipmentRef.current || benchesRef.current.biology) return;
    const uData = microEquipmentRef.current.userData;
    if (!uData) return;

    if (uData.stageAssembly) {
      // Offset from the modelled rest height, so both GLB and procedural stages work
      const stage = uData.stageAssembly as THREE.Object3D;
      if (stage.userData.baseY === undefined) stage.userData.baseY = stage.position.y;
      stage.position.y = stage.userData.baseY + (biologyState.coarseFocus - 0.5) * 0.02;
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
  }, [biologyState, microEquipmentRef, benchesRef]);

  // Update 3D Chemistry Mesh States
  useEffect(() => {
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
          mat.color.set(chemistryState.phValue >= 8.2 ? '#f472b6' : '#f8fafc');
        } else {
          mat.color.set('#e0f2fe');
        }
      }
    }
  }, [chemistryState, chemEquipmentRef]);

  // Update 3D Physics Mesh States
  useEffect(() => {
    if (!physEquipmentRef.current || benchesRef.current.physics) return;
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

    // Ammeter needle: 0-1 A full scale, sweeps left to right
    if (uData.ammeterNeedle) {
      const amps = physicsState.switchClosed ? physicsState.voltage / physicsState.resistance : 0;
      (uData.ammeterNeedle as THREE.Object3D).rotation.z = 0.87 - Math.min(1, amps) * 1.74;
    }
  }, [physicsState, physicsVersion, physEquipmentRef, benchesRef]);

  // Update 3D Analytical Bench States
  useEffect(() => {
    applyResearchState(resEquipmentRef.current, analyticalState);
  }, [analyticalState, researchVersion, resEquipmentRef]);

  return null;
}

/** Thin goggle rims around the view while safety goggles are on (static CSS, no rendering cost). */
function GogglesFrame() {
  const on = useLab((st) => st.player.goggles);
  if (!on) return null;
  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 120% 115% at 50% 50%, transparent 82%, rgba(20,45,65,0.18) 90%, rgba(15,35,55,0.45) 100%)',
        boxShadow: 'inset 0 0 0 3px rgba(40,70,90,0.25)',
      }}
    />
  );
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
  const [seatedStation, setSeatedStation] = useState<Station | null>(null);
  const [isViewingEyepieces, setIsViewingEyepieces] = useState<boolean>(false);

  // Phone State
  const [isPhoneOpen, setIsPhoneOpen] = useState<boolean>(false);
  const [phoneInitialTab, setPhoneInitialTab] = useState<PhoneAppTab>('home');
  const [phoneAIPrompt, setPhoneAIPrompt] = useState<string | undefined>(undefined);
  const [phoneAIContext, setPhoneAIContext] = useState<string | undefined>(undefined);

  // Live Player Coordinates for Radar Mini-Map
  // Written by the render loop; only the mini-map polls it, so the scene never re-renders for movement
  const poseRef = useRef<{ x: number; z: number; yaw: number }>({ x: 0, z: 5.5, yaw: Math.PI });

  // Center Reticle Hover Target
  const [hoveredAction, setHoveredAction] = useState<{
    id: string;
    label: string;
    action: string;
    station: Station;
    category: string;
  } | null>(null);

  // 3D Equipment Live States (shared lab store: scene, HUD and Dr. Curie all read the same data)
  const curieSpeech = useCurie((st) => st.speech);
  const atWorkbench = isSeated && !!seatedStation;
  // Bumped when async-loaded equipment arrives so state effects re-apply to the new meshes
  const [labReady, setLabReady] = useState(false);
  const [researchVersion, setResearchVersion] = useState(0);
  const [physicsVersion, setPhysicsVersion] = useState(0);

  const [isTouch] = useState<boolean>(() => (typeof window !== 'undefined' ? isMobileOrTouchDevice() : false));

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
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
    [key in Station]: {
      pos: THREE.Vector3;
      lookAt: THREE.Vector3;
      baseYaw: number;
    };
  }>({
    biology: {
      pos: new THREE.Vector3(-4.5, 1.3, -2.42),
      lookAt: new THREE.Vector3(-4.5, 1.1, -2.98),
      baseYaw: 0,
    },
    // Chemistry is a standing workbench: apparatus at the front edge, student standing close over it
    chemistry: {
      pos: new THREE.Vector3(4.5, 1.44, -2.34),
      lookAt: new THREE.Vector3(4.5, 1.04, -2.98),
      baseYaw: 0,
    },
    physics: {
      pos: new THREE.Vector3(-4.5, 1.46, 4.72),
      lookAt: new THREE.Vector3(-4.5, 1.0, 4.02),
      baseYaw: Math.PI,
    },
    research: {
      pos: new THREE.Vector3(4.62, 1.42, 4.72),
      lookAt: new THREE.Vector3(4.62, 1.02, 4.04),
      baseYaw: Math.PI,
    },
    // Fume hood against the back wall: stand at the sash and look down at the worktop (flame test)
    hood: {
      pos: new THREE.Vector3(0, 1.45, -10.2),
      lookAt: new THREE.Vector3(0, 1.02, -11.0),
      baseYaw: 0,
    },
  });

  // Sitting down mechanic with smooth transition
  const sitDownAt = useCallback((station: Station) => {
    soundFx.playSitDown();
    const anchor = seatAnchors.current[station];
    if (anchor && cameraRef.current) {
      const startPos = cameraRef.current.position.clone();
      const lookDir = new THREE.Vector3().subVectors(anchor.lookAt, anchor.pos).normalize();
      const targetYaw = Math.atan2(-lookDir.x, -lookDir.z);
      // Look down at the apparatus from the work position
      const targetPitch = Math.atan2(anchor.lookAt.y - anchor.pos.y, Math.hypot(anchor.lookAt.x - anchor.pos.x, anchor.lookAt.z - anchor.pos.z));

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
      labStore.update('player', { station, seated: true });
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
    labStore.update('player', { station: null, seated: false });
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

    if (data.interactId === 'npc_curie') {
      soundFx.playClick();
      setPhoneInitialTab('ai');
      setPhoneAIPrompt(undefined);
      setIsPhoneOpen(true);
      return;
    }

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

    // Walking around: tapping a bench's equipment steps you up to that bench to work on it
    if (!isSeated && data.station && data.interactId !== 'npc_curie' && !String(data.interactId).startsWith('poster_')) {
      sitDownAt(data.station);
      return;
    }

    // At a hands-on bench, the hands perform it
    if (data.station && benchesRef.current[data.station as 'biology']?.tap(String(data.interactId), lastHitPointRef.current ?? undefined)) {
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
        soundFx.playSwitchToggle(!labStore.get().physics.switchClosed);
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
      } else if (data.interactId === 'res_weigh_boat') {
        if (!labStore.get().research.doorsOpen) {
          curie.say('Slide the draft shield open before you add sample to the boat.');
        } else {
          // One small spatula tip of sample, 20-50 mg
          soundFx.playGlassSlide();
          setAnalyticalState((prev) => ({ ...prev, massOnPan: prev.massOnPan + 0.02 + Math.random() * 0.03 }));
        }
      } else if (data.interactId === 'res_tare_btn') {
        soundFx.playBeep();
        setAnalyticalState((prev) => ({ ...prev, tareOffset: prev.massOnPan }));
      } else if (data.interactId === 'res_centrifuge_start' || data.interactId === 'res_centrifuge_lid') {
        soundFx.playCentrifugeSpin();
        setAnalyticalState((prev) => ({ ...prev, centrifugeRunning: !prev.centrifugeRunning }));
      }
    }
  }, [sitDownAt, isSeated]);

  // Teleport helper
  const handleTeleport = useCallback((dest: 'center' | Station) => {
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

      // Escape closes the eyepiece view first; otherwise Space/Escape steps back from the bench
      if (isViewingEyepieces && (e.code === 'Escape' || e.code === 'Space')) {
        if (e.code === 'Escape') setIsViewingEyepieces(false);
        return;
      }
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
  }, [isSeated, seatedStation, hoveredAction, sitDownAt, standUp, isViewingEyepieces]);

  // Latest values for the render loop, so the scene is built exactly once
  const isSeatedRef = useRef(isSeated);
  const seatedStationRef = useRef(seatedStation);
  const handsRef = useRef<FirstPersonHands | null>(null);
  const titrationBenchRef = useRef<TitrationBench | null>(null);
  // Hands-on bench for each station (created once its apparatus and the hands are loaded)
  const benchesRef = useRef<Partial<Record<Station, Workbench | TitrationBench>>>({});
  // Where the view should turn while the hands work (e.g. up to the burette funnel)
  const focusRef = useRef<THREE.Vector3 | null>(null);
  const lastHitPointRef = useRef<THREE.Vector3 | null>(null);
  // True while a full-screen overlay hides the 3D view: the render loop does no work at all
  const pausedRef = useRef(false);
  // View the student had before an automatic "look at the action" turn
  const savedLookRef = useRef<{ x: number; y: number } | null>(null);
  // Pointer position at a workbench (tap/click targets and hover)
  const pointerRef = useRef(new THREE.Vector2(0, 0));
  const handleObjectClickRef = useRef(handleObjectClick);
  const standUpRef = useRef(standUp);
  const hoveredIdRef = useRef<string | null>(null);
  useEffect(() => {
    isSeatedRef.current = isSeated;
    pausedRef.current = isViewingEyepieces;
    seatedStationRef.current = seatedStation;
    handleObjectClickRef.current = handleObjectClick;
    standUpRef.current = standUp;
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __sitDownAt: sitDownAt });
  }, [sitDownAt]);

  useEffect(() => {
    startCurieWatch();
    const onDrop = () => titrationBenchRef.current?.visualDrop();
    window.addEventListener('labbridge:drop', onDrop);
    const off = experiments.onEvent((e) => {
      if (e.type === 'started' || e.type === 'reset') Object.values(benchesRef.current).forEach((b) => b?.reset());
    });
    return () => {
      window.removeEventListener('labbridge:drop', onDrop);
      off();
    };
  }, []);

  // Main Three.js Scene Setup & Render Loop (runs once)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;

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
    scene.add(camera);

    // First-person gloved hands for hands-on work at the bench
    const hands = new FirstPersonHands(camera);
    handsRef.current = hands;
    const handsPromise = hands.load().catch(() => false);
    const setFocus = (p: THREE.Vector3 | null) => (focusRef.current = p ? p.clone() : null);

    // WebGL Renderer
    // Phones: lower pixel ratio and cheaper shadows keep the frame rate up (AO is also desktop-only)
    const renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
    renderer.shadowMap.enabled = !isTouch; // phones: no real-time shadows (AO/env light carry the look)
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // The room is static: shadows are re-rendered a few times a second, not every frame
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __renderer: renderer, __scene: scene, __camera: camera, __benches: benchesRef.current, __euler: cameraEuler.current });

    // Ambient occlusion: soft contact shadows in corners, under benches and around equipment.
    // Desktop only; phones render directly to keep the frame rate up.
    let composer: EffectComposer | null = null;
    if (!isTouch) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const gtao = new GTAOPass(scene, camera, width, height);
      gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1, scale: 1.2 });
      gtao.blendIntensity = 0.9;
      composer.addPass(gtao);
      composer.addPass(new OutputPass());
    }

    // Image-based lighting: gives metal, glass and the epoxy floor something real to reflect.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();

    // Click targets are whatever is tagged interactive in the scene right now (rebuilt after async loads/swaps)
    const collectInteractives = () => {
      const list: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o.userData?.isInteractive) list.push(o);
      });
      interactiveObjectsRef.current = list;
    };

    // Bake static geometry into a few big meshes once models stop arriving (debounced)
    let mergeTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleMerge = () => {
      if (mergeTimer) clearTimeout(mergeTimer);
      mergeTimer = setTimeout(() => {
        if (!disposed) mergeStaticMeshes(scene);
      }, 1500);
    };

    // Procedural room shell; replaced by /models/lab-room.glb when that asset exists
    const proceduralRoom = new THREE.Group();
    proceduralRoom.userData.placeholder = true;
    scene.add(proceduralRoom);
    loadLabModel('lab-room', null).then((room) => {
      if (disposed) return;
      setLabReady(true);
      if (!room) return;
      room.root.traverse((o) => {
        // The shell only receives shadows; the ceiling must not block the key light.
        if (/^(ceiling|led_|wall|window|win_|exterior|skirt|floor)/.test(o.name)) o.castShadow = false;
      });
      scene.remove(proceduralRoom);
      disposeObject(proceduralRoom);
      scene.add(room.root);
      scheduleMerge();
    });

    // Bright Ambient & Hemisphere Illumination (Daylight White 6000K)
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.25);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#cbd5e1', 0.35);
    scene.add(hemiLight);

    const mainCeilingLight = new THREE.DirectionalLight('#fff8ee', 1.1);
    mainCeilingLight.position.set(0, 8, 0);
    mainCeilingLight.castShadow = true;
    mainCeilingLight.shadow.mapSize.width = 1024;
    mainCeilingLight.shadow.mapSize.height = 1024;
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
      proceduralRoom.add(troffer);

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
    proceduralRoom.add(floor);


    // Realistic Clean Antimicrobial Laboratory Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.45, metalness: 0.05 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), wallMat);
    backWall.position.set(0, 4, -12);
    proceduralRoom.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), wallMat);
    frontWall.position.set(0, 4, 12);
    frontWall.rotation.y = Math.PI;
    proceduralRoom.add(frontWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), wallMat);
    rightWall.position.set(12, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    proceduralRoom.add(rightWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), wallMat);
    leftWall.position.set(-12, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    proceduralRoom.add(leftWall);

    // Sunlit Panoramic Windows on Left Wall
    [-6, 0, 6].forEach((wz) => {
      const skyPane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.0, 3.8),
        new THREE.MeshBasicMaterial({ color: '#bae6fd' })
      );
      skyPane.position.set(-11.92, 4.0, wz);
      skyPane.rotation.y = Math.PI / 2;
      proceduralRoom.add(skyPane);

      const winFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 4.0, 3.2),
        new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.5, roughness: 0.2 })
      );
      winFrame.position.set(-11.9, 4.0, wz);
      proceduralRoom.add(winFrame);
    });

    // Add Chemical Fume Hood at Center Back Wall
    const fumeHood = createFumeHood();
    fumeHood.position.set(0, 0, -11.3);
    scene.add(fumeHood);
    swapInModel(fumeHood, 'fume-hood', (model) => {
      // Sash is a moving, tappable part; its glass must not catch taps meant for the kit behind it
      wireInteractiveNodes(model, 'hood');
      model.traverse((o) => {
        if (o.name.startsWith('sash_glass')) o.raycast = () => {};
      });
      collectInteractives();
    }).then(scheduleMerge);

    // Add Emergency Safety Shower & Eye Wash Station
    const safetyShower = createSafetyShower();
    safetyShower.position.set(11.2, 0, 4.0);
    safetyShower.rotation.y = -Math.PI / 2;
    scene.add(safetyShower);
    swapInModel(safetyShower, 'safety-shower').then(scheduleMerge);

    // Add Science Whiteboard on Front Wall
    const whiteboard = createLabWhiteboard();
    whiteboard.position.set(0, 2.5, 11.85);
    whiteboard.rotation.y = Math.PI;
    scene.add(whiteboard);
    swapInModel(whiteboard, 'whiteboard', (model) => {
      const notes = createWhiteboardNotes();
      notes.position.z = 0.012; // just proud of the board surface (model front is local +z)
      model.add(notes);
    }).then(scheduleMerge);

    // 4 Workstation Benches with Overhead Shelves & Swivel Stools
    const interactiveList: THREE.Object3D[] = [];

    // Add Framed Laboratory Educational Posters & Equipment Usage Infographics on Classroom Walls
    const { group: postersGroup, interactiveMeshes: posterMeshes } = createAllLabWallPosters();
    scene.add(postersGroup);
    posterMeshes.forEach((mesh) => interactiveList.push(mesh));

    const benchConfigs: Array<{
      station: Station;
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

      proceduralRoom.add(bench);

      // Add Overhead Reagent Shelf above each bench
      const shelf = createReagentShelf();
      shelf.position.set(cfg.x, 2.1, cfg.z + (cfg.z < 0 ? -0.6 : 0.6));
      scene.add(shelf);
      swapInModel(shelf, 'reagent-shelf').then(scheduleMerge);

      // Add Swivel Lab Stool (Seat cushion at 0.62m)
      const stool = createLabStool(cfg.station, cfg.x, cfg.stoolZ, cfg.stoolZ > 0 ? Math.PI : 0);
      scene.add(stool);
      swapInModel(stool, 'lab-stool', (model) => {
        model.traverse((o) => tagInteractive(o, `stool_${cfg.station}`, 'Lab Swivel Stool', 'Sit Down on Chair', cfg.station, 'stool'));
        collectInteractives();
      scheduleMerge();
      });
      stool.traverse((c) => {
        if (c.userData && c.userData.isInteractive) {
          interactiveList.push(c);
        }
      });
    });

    // 1. Biology 3D Microscope Setup (Ready-Made High-Fidelity GLB Model)
    createReadyMadeMicroscope('biology').then((microscope) => {
      microscope.position.set(-4.5, 0.94, -2.98); // front edge, within reach
      scene.add(microscope);
      microEquipmentRef.current = microscope;
      handsPromise.then((ok) => {
        if (ok && !disposed) {
          benchesRef.current.biology = new MicroscopeBench(scene, microscope, hands, setFocus, () => setIsViewingEyepieces(true));
          collectInteractives();
        }
      });
      microscope.traverse((c) => {
        if (c.userData && c.userData.isInteractive) interactiveList.push(c);
      });
      collectInteractives();
      scheduleMerge();
    });

    // 2. Chemistry 3D Titration Suite & Ready-Made Glassware GLB Setup
    createReadyMadeChemistryStation('chemistry').then((chemRig) => {
      chemRig.position.set(4.5, 0.94, -2.98); // front edge of the bench, within reach
      scene.add(chemRig);
      chemEquipmentRef.current = chemRig;
      chemRig.traverse((c) => {
        if (c.userData && c.userData.isInteractive) interactiveList.push(c);
      });
      collectInteractives();
      scheduleMerge();
      // Hands-on titration once the hands are ready
      handsPromise.then((ok) => {
        if (!ok || disposed) return;
        TitrationBench.create(scene, chemRig, hands, setFocus)
          .then((bench) => {
            if (disposed) return;
            titrationBenchRef.current = bench;
            benchesRef.current.chemistry = bench;
            if (process.env.NODE_ENV !== 'production') Object.assign(window, { __titration: bench });
            collectInteractives();
          })
          .catch((err) => console.error('Titration bench setup failed', err));
      });
    });

    // 3. Physics 3D Circuit & Apparatus Ready-Made Setup
    createReadyMadePhysicsBench('physics').then((physBench) => {
      physBench.position.set(-4.5, 0.94, 4.0);
      scene.add(physBench);
      handsPromise.then((ok) => {
        if (ok && !disposed) benchesRef.current.physics = new CircuitBench(scene, physBench, hands, setFocus);
      });
      setPhysicsVersion((v) => v + 1);
      physEquipmentRef.current = physBench;
      physBench.traverse((c) => {
        if (c.userData && c.userData.isInteractive) interactiveList.push(c);
      });
      collectInteractives();
      scheduleMerge();
    });

    // 5. Flame test kit on the fume hood worktop
    loadLabModel('flame-test', null, 'hood').then((kit) => {
      if (!kit || disposed) return;
      kit.root.position.set(0, 0.93, -11.05);
      scene.add(kit.root);
      collectInteractives();
      scheduleMerge();
      handsPromise.then((ok) => {
        if (ok && !disposed) {
          benchesRef.current.hood = new FlameBench(scene, kit.root, hands, setFocus);
          collectInteractives();
        }
      });
    });

    // 4. Research 3D Analytical Suite Ready-Made Setup
    createReadyMadeAnalyticalBench('research').then((resBench) => {
      resBench.position.set(4.85, 0.94, 4.04); // balance (model x -0.35) centred in front of the student, centrifuge to the right
      scene.add(resBench);
      resEquipmentRef.current = resBench;
      handsPromise.then((ok) => {
        if (ok && !disposed) {
          benchesRef.current.research = new BalanceBench(scene, resBench, hands, setFocus);
          resBench.userData.benchOwnsDoor = true;
          collectInteractives();
        }
      });
      setResearchVersion((v) => v + 1);
      resBench.traverse((c) => {
        if (c.userData && c.userData.isInteractive) interactiveList.push(c);
      });
      collectInteractives();
      scheduleMerge();
    });

    interactiveObjectsRef.current = interactiveList;

    // Dr. Curie, the lab manager NPC
    let curieNPC: CurieNPC | null = null;
    createCurieNPC().then((npc) => {
      if (disposed) return;
      curieNPC = npc;
      if (process.env.NODE_ENV !== 'production') Object.assign(window, { __curieNPC: npc });
      scene.add(npc.root);
      interactiveList.push(npc.root);
      collectInteractives();
      scheduleMerge();
    });

    // Raycaster for Center Reticle Hover & Click
    const raycaster = new THREE.Raycaster();
    const centerScreen = new THREE.Vector2(0, 0);

    // ---- Input: drag to look, tap/click to act (never both) ----
    const clampLook = () => {
      if (isSeatedRef.current) {
        cameraEuler.current.x = Math.max(-1.25, Math.min(0.6, cameraEuler.current.x));
      } else {
        cameraEuler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraEuler.current.x));
      }
    };
    const lookBy = (dx: number, dy: number, sensitivity: number) => {
      cameraEuler.current.y -= dx * sensitivity;
      cameraEuler.current.x -= dy * sensitivity;
      clampLook();
      savedLookRef.current = null; // the student's own view wins over any automatic turn
    };
    const toNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    };
    /** Raycast at a screen point and act on the first usable thing there. */
    const actAt = (ndc: THREE.Vector2) => {
      if (!cameraRef.current) return;
      raycaster.setFromCamera(ndc, cameraRef.current);
      const hit = raycaster.intersectObjects(interactiveObjectsRef.current, true).find((h) => h.object.userData?.isInteractive);
      if (hit) {
        lastHitPointRef.current = hit.point.clone();
        handleObjectClickRef.current(hit.object);
      }
    };

    let suppressClickUntil = 0;
    let mouseDown: { x: number; y: number; dragged: boolean } | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      pointerRef.current.copy(toNdc(e.clientX, e.clientY));
      if (document.pointerLockElement === renderer.domElement) {
        lookBy(e.movementX, e.movementY, 0.0022);
      } else if (mouseDown && e.buttons & 1) {
        // Drag to look (used at a bench, where the mouse is free for clicking things)
        if (!mouseDown.dragged && Math.hypot(e.clientX - mouseDown.x, e.clientY - mouseDown.y) > 5) mouseDown.dragged = true;
        if (mouseDown.dragged) lookBy(e.movementX, e.movementY, 0.004);
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      mouseDown = { x: e.clientX, y: e.clientY, dragged: false };
    };
    const handleMouseUp = () => {
      if (mouseDown?.dragged) suppressClickUntil = performance.now() + 50;
      mouseDown = null;
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntil) return; // end of a drag, or a touch already handled
      const atWorkbench = isSeatedRef.current && !!seatedStationRef.current;
      if (!atWorkbench && !isTouch && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
      }
      // Walking with a locked pointer: act on what the reticle is on. Otherwise: on what was clicked.
      actAt(document.pointerLockElement === renderer.domElement ? centerScreen : toNdc(e.clientX, e.clientY));
    };

    // Touch: any drag on the 3D view looks around; a tap (no drag) acts on what was tapped.
    // (The walking joystick is its own element, so its touches never reach the canvas.)
    const touches = new Map<number, { x: number; y: number; lastX: number; lastY: number; dragged: boolean }>();
    const handleTouchStart = (e: TouchEvent) => {
      if (e.target !== renderer.domElement) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        touches.set(t.identifier, { x: t.clientX, y: t.clientY, lastX: t.clientX, lastY: t.clientY, dragged: false });
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const tr = touches.get(t.identifier);
        if (!tr) continue;
        if (!tr.dragged && Math.hypot(t.clientX - tr.x, t.clientY - tr.y) > 8) tr.dragged = true;
        if (tr.dragged) lookBy(t.clientX - tr.lastX, t.clientY - tr.lastY, 0.005);
        tr.lastX = t.clientX;
        tr.lastY = t.clientY;
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const tr = touches.get(t.identifier);
        if (!tr) continue;
        touches.delete(t.identifier);
        suppressClickUntil = performance.now() + 500; // the browser's synthetic click must not act twice
        if (!tr.dragged) {
          pointerRef.current.copy(toNdc(t.clientX, t.clientY));
          actAt(toNdc(t.clientX, t.clientY));
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('click', handleCanvasClick);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Adaptive quality: keeps every device smooth by trading AO, then resolution, then shadows
    let useComposer = !!composer;
    const quality = new QualityManager(renderer, isTouch, (t) => {
      useComposer = t.ao && !!composer;
      const shadowsChanged = renderer.shadowMap.enabled !== t.shadows;
      renderer.shadowMap.enabled = t.shadows;
      renderer.shadowMap.needsUpdate = true;
      composer?.setSize(container.clientWidth, container.clientHeight);
      // Recompiling every material causes a hitch; only needed when shadows switch on/off
      if (shadowsChanged) {
        scene.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.Material | undefined;
          if (m) m.needsUpdate = true;
        });
      }
    });
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __quality: quality });
    // Student's graphics setting (Auto / Low / High) from the pause menu
    const applyGraphics = (g: GraphicsSetting) => quality.force(g === 'auto' ? null : g);
    applyGraphics(getGraphics());
    const onGraphics = (e: Event) => applyGraphics((e as CustomEvent<GraphicsSetting>).detail);
    window.addEventListener('labbridge:graphics', onGraphics);
    let shadowFrame = 0;

    // ---- Frame scheduling: what counts as "something is happening" ----
    const scheduler = new FrameScheduler();
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __scheduler: scheduler });
    let curieMoving = false;
    const isAnimating = () => {
      const lab = labStore.get();
      const c = curie.get();
      return (
        !!transitionRef.current?.active ||
        Object.values(keysPressed.current).some(Boolean) ||
        touchMoveVector.current.x !== 0 ||
        touchMoveVector.current.z !== 0 ||
        !!focusRef.current ||
        !!savedLookRef.current ||
        hands.isAnimating ||
        Object.values(benchesRef.current).some((bench) => bench?.isBusy) ||
        lab.chemistry.buretteOpen ||
        lab.chemistry.stirrerRPM > 0 ||
        lab.research.centrifugeRunning ||
        lab.flame.lit ||
        curieMoving ||
        c.operating ||
        c.loading
      );
    };
    if (process.env.NODE_ENV !== 'production') {
      Object.assign(window, {
        __whyActive: () => ({
          transition: !!transitionRef.current?.active,
          keys: Object.values(keysPressed.current).some(Boolean),
          focus: !!focusRef.current,
          savedLook: !!savedLookRef.current,
          hands: hands.isAnimating,
          benchBusy: Object.values(benchesRef.current).some((bench) => bench?.isBusy),
          curieMoving,
          curieOperating: curie.get().operating,
          curieLoading: curie.get().loading,
          lab: labStore.get().chemistry.buretteOpen || labStore.get().chemistry.stirrerRPM > 0 || labStore.get().research.centrifugeRunning || labStore.get().flame.lit,
        }),
      });
    }
    const poke = () => scheduler.poke();
    const unsubscribeLab = labStore.subscribe(poke); // any state change animates for a moment
    const pokeEvents = ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart', 'touchmove'] as const;
    pokeEvents.forEach((ev) => window.addEventListener(ev, poke, { passive: true }));

    // Animation & Physics Loop
    let lastTime = performance.now();
    let coordUpdateCounter = 0;

    const animateLoop = () => {
      animationFrameId.current = requestAnimationFrame(animateLoop);

      const now = performance.now();
      // Nothing to draw while a full-screen view (the eyepieces) covers the lab
      if (pausedRef.current) return;
      // Render only when needed: full rate while something moves, a trickle when idle (keeps laptops cool)
      if (!scheduler.shouldRender(now, isAnimating())) return;
      const frameMs = now - lastTime;
      const delta = Math.min(frameMs / 1000, 0.1);
      if (scheduler.mode === 'active') quality.frame(frameMs); // idle frames are slow on purpose
      if (renderer.shadowMap.enabled && ++shadowFrame % 6 === 0) renderer.shadowMap.needsUpdate = true;
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

      if (isSeatedRef.current && moveIntent && !transitionRef.current?.active) {
        standUpRef.current();
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
      } else if (!isSeatedRef.current && cameraRef.current) {
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
        // Solid furniture: slide along benches, hood and shower instead of walking through them
        const pos = cameraRef.current.position;
        for (const [cx, cz, hx, hz] of OBSTACLES) {
          const dx = pos.x - cx;
          const dz = pos.z - cz;
          const px = hx + PLAYER_RADIUS - Math.abs(dx);
          const pz = hz + PLAYER_RADIUS - Math.abs(dz);
          if (px > 0 && pz > 0) {
            // Push out along the shallower axis and stop velocity into the obstacle
            if (px < pz) {
              pos.x += Math.sign(dx || 1) * px;
              playerVelocity.current.x = 0;
            } else {
              pos.z += Math.sign(dz || 1) * pz;
              playerVelocity.current.z = 0;
            }
          }
        }
      } else if (isSeatedRef.current && cameraRef.current && !transitionRef.current?.active) {
        // Gentle seated breathing
        idleTimerRef.current += delta * 1.5;
        const breathY = Math.sin(idleTimerRef.current) * 0.0018;
        const eye = seatedStationRef.current ? seatAnchors.current[seatedStationRef.current].pos.y : EYE_HEIGHT_SITTING;
        cameraRef.current.position.y = eye + breathY;
        // The student controls the view. It only turns by itself to follow an action (e.g. up to the
        // burette funnel), then returns to wherever the student was looking.
        const k = Math.min(1, delta * 3);
        const steerTo = (yaw: number, pitch: number) => {
          cameraEuler.current.y += Math.atan2(Math.sin(yaw - cameraEuler.current.y), Math.cos(yaw - cameraEuler.current.y)) * k;
          cameraEuler.current.x += (pitch - cameraEuler.current.x) * k;
        };
        if (focusRef.current) {
          if (!savedLookRef.current) savedLookRef.current = { x: cameraEuler.current.x, y: cameraEuler.current.y };
          const d = focusRef.current.clone().sub(cameraRef.current.position);
          steerTo(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)));
        } else if (savedLookRef.current) {
          const back = savedLookRef.current;
          steerTo(back.y, back.x);
          if (Math.abs(back.x - cameraEuler.current.x) + Math.abs(Math.atan2(Math.sin(back.y - cameraEuler.current.y), Math.cos(back.y - cameraEuler.current.y))) < 0.01) {
            savedLookRef.current = null;
          }
        }
      }

      // Apply Camera Orientation & Reticle Raycast
      if (cameraRef.current) {
        cameraRef.current.quaternion.setFromEuler(cameraEuler.current);

        // Hover raycast (every 3rd frame): reticle when exploring, pointer at a workbench
        if (coordUpdateCounter % 3 === 0) {
          const atBench = isSeatedRef.current && !!seatedStationRef.current;
          raycaster.setFromCamera(atBench ? pointerRef.current : centerScreen, cameraRef.current);
          const hits = raycaster.intersectObjects(interactiveObjectsRef.current, true).filter((h) => h.object.userData?.isInteractive);
          if (hits.length > 0) {
            const hit = hits[0].object;
            if (hit.userData && hit.userData.isInteractive && hoveredIdRef.current !== hit.userData.interactId) {
              hoveredIdRef.current = hit.userData.interactId;
              setHoveredAction({
                id: hit.userData.interactId,
                label: hit.userData.label,
                action: hit.userData.action,
                station: hit.userData.station,
                category: hit.userData.category,
              });
            }
          } else if (hoveredIdRef.current !== null) {
            hoveredIdRef.current = null;
            setHoveredAction(null);
          }
        }

        // Update coordinates for Mini Map Radar throttled
        coordUpdateCounter++;
        if (coordUpdateCounter % 4 === 0) {
          poseRef.current = {
            x: cameraRef.current.position.x,
            z: cameraRef.current.position.z,
            yaw: cameraEuler.current.y,
          };
        }
      }

      // Update 1st-Person Scientist Kinematics (Zero float, realistic posture)

      // Animate Chemistry Stirrer
      if (chemEquipmentRef.current) {
        const uData = chemEquipmentRef.current.userData;
        if (uData && uData.stirBar && labStore.get().chemistry.stirrerRPM > 0) {
          uData.stirBar.rotation.y += (labStore.get().chemistry.stirrerRPM / 60) * Math.PI * 2 * delta;
        }
      }

      const working = isSeatedRef.current && !!seatedStationRef.current;
      hands.show(working && !transitionRef.current?.active);
      // Lean in at the workbench: narrower field of view for a close-up of the apparatus
      const targetFov = working ? 50 : 65;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, delta * 4);
        camera.updateProjectionMatrix();
      }
      const realDelta = Math.min(frameMs / 1000, 0.5);
      hands.update(realDelta);
      Object.values(benchesRef.current).forEach((b) => b?.update(realDelta));

      const rotor = resEquipmentRef.current?.userData.rotor as THREE.Object3D | undefined;
      if (rotor && labStore.get().research.centrifugeRunning) rotor.rotation.y += 40 * delta;

      if (curieNPC) {
        const c = curie.get();
        // Real time (not the capped physics delta) so she never walks in slow motion on slow devices
        const atTarget = curieNPC.update(Math.min(frameMs / 1000, 0.5), camera.position, c.targetStation, c.operating);
        curieMoving = !atTarget;
        if (atTarget && c.pending.length && !c.operating) curie.arrived();
      }

      if (useComposer && composer) composer.render(delta);
      else renderer.render(scene, camera);
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
      composer?.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      disposed = true;
      unsubscribeLab();
      window.removeEventListener('labbridge:graphics', onGraphics);
      pokeEvents.forEach((ev) => window.removeEventListener(ev, poke));
      if (mergeTimer) clearTimeout(mergeTimer);
      disposeObject(scene);
      clearModelCache();
      envTexture.dispose();
      composer?.dispose();
      renderer.dispose();
      // Release the WebGL context now (browsers cap live contexts; re-entering the lab would pile them up)
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isTouch]);


  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Loading cover so the placeholder room never flashes */}
      {!labReady && (
        <div className="absolute inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Preparing the laboratory…</p>
        </div>
      )}

      <ApparatusSync
        microEquipmentRef={microEquipmentRef}
        chemEquipmentRef={chemEquipmentRef}
        physEquipmentRef={physEquipmentRef}
        resEquipmentRef={resEquipmentRef}
        benchesRef={benchesRef}
        physicsVersion={physicsVersion}
        researchVersion={researchVersion}
      />

      {/* Practical brief / checklist / results */}
      <ExperimentPanel station={isSeated ? seatedStation : null} compact={atWorkbench} onGoTo={sitDownAt} />

      <GogglesFrame />
      {labReady && <LabTutorial isTouch={isTouch} />}

      {/* Dr. Curie speech bubble */}
      {curieSpeech && !isPhoneOpen && (
        <button
          onClick={() => {
            setPhoneInitialTab('ai');
            setPhoneAIPrompt(undefined);
            setIsPhoneOpen(true);
          }}
          className={`absolute ${atWorkbench ? 'top-3 max-w-[min(60vw,520px)] py-2' : 'bottom-24'} [@media(max-height:500px)]:bottom-auto [@media(max-height:500px)]:top-3 [@media(max-height:500px)]:max-w-[42vw] [@media(max-height:500px)]:py-2 left-1/2 -translate-x-1/2 z-40 max-w-[min(92vw,520px)] text-left bg-white/95 text-slate-900 rounded-2xl px-4 py-3 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2`}
        >
          <span className="block text-xs font-semibold text-teal-700 mb-0.5">Dr. Curie · Lab Manager</span>
          <span className="block text-sm [@media(max-height:500px)]:text-xs leading-snug [@media(max-height:500px)]:line-clamp-3">{curieSpeech}</span>
        </button>
      )}

      {/* At a workbench: no reticle; what's under the pointer is named at the top */}
      {atWorkbench && hoveredAction && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-slate-900/90 px-3 py-1.5 rounded-full border border-emerald-500/50 text-xs text-white">
          {hoveredAction.label} <span className="text-emerald-300">· {hoveredAction.action}</span>
        </div>
      )}

      {/* Center Reticle Crosshair ("The Dot") */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-30 ${atWorkbench ? 'hidden' : ''}`}>
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
      <LiveMiniMap
        poseRef={poseRef}
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
      {/* At the workbench the hands do the work: just a way to step back */}
      {atWorkbench && (
        <button
          onClick={standUp}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-slate-900/85 border border-slate-600 text-sm text-white hover:bg-slate-800"
        >
          Step back from the bench
        </button>
      )}


      {/* In-World 3D Microscope Eyepiece Ocular Mode */}
      {isViewingEyepieces && (
        <EyepieceOcularOverlay
          onClose={() => setIsViewingEyepieces(false)}
          onSaveSnapshot={onSaveSnapshot}
          onAskAI={onAskAI}
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
