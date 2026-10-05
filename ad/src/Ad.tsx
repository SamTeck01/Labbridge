import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { loadFont } from '@remotion/fonts';
import T from './timeline.json';

const fontFamily = 'InterAd';
loadFont({ family: fontFamily, url: staticFile('Inter.woff2'), weight: '100 900' });
const S = T.scenes;
const TEAL = '#14b8a6';
const AMBER = '#f59e0b';
const PINK = '#ec4899';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Seconds -> 0..1 spring that starts at `at`. */
const useSp = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (at: number, damping = 18, mass = 0.7) => spring({ frame: f - at * fps, fps, config: { damping, mass, stiffness: 140 } });
};
const useT = () => useCurrentFrame() / T.fps;
const inScene = (t: number, i: number, pad = 0.35) => t >= S[i] - 0.05 && t < (S[i + 1] ?? T.total) + pad;
/** Fast camera "whip" out of a scene: 0 until `end - d`, 1 at `end`. */
const out = (t: number, end: number, d = 0.28) => interpolate(t, [end - d, end], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });

const Glow: React.FC<{ vertical: boolean }> = ({ vertical }) => {
  const t = useT();
  const pink = interpolate(t, [20.0, 20.4, 22.0, 22.4], [0, 1, 1, 0], clamp);
  const amber = interpolate(t, [26.8, 27.3, 30.9, 31.4], [0, 1, 1, 0], clamp);
  const on = interpolate(t, [0, 1.2], [0, 1], clamp);
  const a = { x: 50 + Math.sin(t * 0.55) * 14, y: 46 + Math.cos(t * 0.4) * 10 };
  const b = { x: 50 + Math.cos(t * 0.35 + 1) * 22, y: 58 + Math.sin(t * 0.5) * 12 };
  const c2 = pink > 0 ? PINK : AMBER;
  const s = vertical ? '120vh' : '70vw';
  return (
    <AbsoluteFill style={{ background: '#05070a' }}>
      <div style={{ position: 'absolute', left: `${a.x}%`, top: `${a.y}%`, width: s, height: s, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}55 0%, ${TEAL}10 40%, transparent 68%)`, opacity: on * (1 - amber * 0.5), filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: s, height: s, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: `radial-gradient(circle, ${c2}44 0%, ${c2}0c 42%, transparent 70%)`, opacity: on * (0.35 + 0.65 * Math.max(pink, amber)), filter: 'blur(50px)' }} />
      {/* floor reflection line + vignette */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, #000 100%)', opacity: 0.85 }} />
      <AbsoluteFill style={{ opacity: 0.06, backgroundImage: 'radial-gradient(#fff 0.6px, transparent 0.6px)', backgroundSize: '4px 4px', mixBlendMode: 'overlay' }} />
    </AbsoluteFill>
  );
};

/** A floating translucent software window holding a real LabBridge capture. */
const Win: React.FC<{
  src: string; w: number; x: number; y: number; z?: number; rx?: number; ry?: number; rz?: number; o?: number; title?: string;
  crop?: { x: number; y: number; zoom: number }; aspect?: number; glow?: string; radius?: number;
}> = ({ src, w, x, y, z = 0, rx = 0, ry = 0, rz = 0, o = 1, title = 'LabBridge', crop, aspect = 16 / 9, glow = TEAL, radius }) => {
  const h = w / aspect;
  const r = radius ?? Math.max(14, w * 0.014);
  const bar = Math.max(22, w * 0.024);
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h + bar, transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`, opacity: o, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', inset: -w * 0.08, borderRadius: '50%', background: `radial-gradient(closest-side, ${glow}40, transparent)`, filter: 'blur(30px)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: r, overflow: 'hidden', background: 'rgba(18,22,28,0.55)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: `0 ${w * 0.04}px ${w * 0.09}px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.18)`, backdropFilter: 'blur(18px)' }}>
        <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: bar * 0.28, padding: `0 ${bar * 0.5}px`, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ width: bar * 0.32, height: bar * 0.32, borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />)}
          <div style={{ marginLeft: bar * 0.4, fontFamily, fontSize: bar * 0.46, color: 'rgba(255,255,255,0.55)', fontWeight: 500, letterSpacing: 0.2 }}>{title}</div>
        </div>
        <div style={{ position: 'relative', width: w, height: h, overflow: 'hidden' }}>
          <Img src={staticFile(src)} style={crop
            ? { position: 'absolute', width: w * crop.zoom, height: (w * crop.zoom * 9) / 16, left: -(crop.x * w * crop.zoom - w / 2), top: -(crop.y * ((w * crop.zoom * 9) / 16) - h / 2) }
            : { width: w, height: h, objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.10), transparent 35%)' }} />
        </div>
      </div>
    </div>
  );
};

/** Kinetic headline: each word drops in with blur, tracking tightens. */
const Kinetic: React.FC<{ text: string; at: number; end: number; size: number; x: number; y: number; align?: 'left' | 'center'; color?: string; accent?: string[] }> = ({ text, at, end, size, x, y, align = 'center', color = '#f5f7fa', accent = [] }) => {
  const sp = useSp();
  const t = useT();
  const words = text.split(' ');
  const gone = out(t, end, 0.3);
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(${align === 'center' ? '-50%' : '0'}, -50%) translateY(${-gone * size * 0.6}px)`, display: 'flex', gap: size * 0.26, flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', width: 'max-content', maxWidth: '92vw', fontFamily, fontWeight: 700, fontSize: size, letterSpacing: -size * 0.035, lineHeight: 1.02, opacity: 1 - gone, filter: `blur(${gone * 14}px)` }}>
      {words.map((wd, i) => {
        const p = sp(at + i * 0.075, 16, 0.6);
        const hot = accent.includes(wd.replace(/[.,]/g, ''));
        return (
          <span key={i} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * size * 0.55}px) scale(${0.92 + 0.08 * p})`, filter: `blur(${(1 - p) * 10}px)`, color: hot ? 'transparent' : color, backgroundImage: hot ? `linear-gradient(90deg, ${TEAL}, #5eead4)` : undefined, WebkitBackgroundClip: hot ? 'text' : undefined }}>
            {wd}
          </span>
        );
      })}
    </div>
  );
};

const Pill: React.FC<{ text: string; x: number; y: number; at: number; color?: string; size?: number }> = ({ text, x, y, at, color = AMBER, size = 26 }) => {
  const sp = useSp();
  const t = useT();
  const p = sp(at, 14);
  const pulse = 0.5 + 0.5 * Math.sin((t - at) * 7);
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${p})`, padding: `${size * 0.35}px ${size * 0.8}px`, borderRadius: 999, fontFamily, fontWeight: 700, fontSize: size, letterSpacing: 1.5, color: '#111', background: color, boxShadow: `0 0 ${20 + 30 * pulse}px ${color}`, whiteSpace: 'nowrap' }}>
      {text}
    </div>
  );
};

const Mark: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.26, background: `linear-gradient(145deg, #2dd4bf, ${TEAL} 55%, #0f766e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 800, fontSize: size * 0.42, color: '#04201d', letterSpacing: -size * 0.02, boxShadow: `0 0 ${size * 0.6}px ${TEAL}88, inset 0 1px 0 rgba(255,255,255,0.5)` }}>
    LB
  </div>
);


const PRACTICALS = [
  ['Biology', 'Cells under the microscope', '#22c55e'],
  ['Chemistry', 'Acid–base titration', TEAL],
  ['Physics', "Ohm's law", '#3b82f6'],
  ['Chemistry', 'Analytical balance', TEAL],
  ['Chemistry', 'Flame tests', '#f97316'],
  ['Physics', 'Measuring g, pendulum', '#8b5cf6'],
  ['Chemistry', 'Rates of reaction', AMBER],
  ['Biology', 'Osmosis in potato', '#22c55e'],
  ['Chemistry', 'Paper chromatography', PINK],
];
const GREEN = '#22c55e';
const BLUE = '#3b82f6';

type WinSpec = { src: string; title: string; x: number; y: number; w: number; vx?: number; vy?: number; vw?: number; ry?: number; rx?: number; from: 'left' | 'right' | 'bottom' | 'depth'; delay?: number; crop?: { x: number; y: number; zoom: number }; aspect?: number; glow?: string; z?: number };
type Scene = { chip?: [string, string]; lines: { text: string; at?: number; accent?: string[] }[]; wins: WinSpec[] };

// x, y, w are fractions of the frame (16:9); vx, vy, vw override them for 9:16
const SCENES: Scene[] = [
  { lines: [{ text: 'Science is meant to be done.', accent: ['done.'] }, { text: 'Not just read about.', at: 2.0 }], wins: [] },
  { lines: [{ text: 'A real lab. In your browser.', accent: ['lab.', 'browser.'] }], wins: [
    { src: 'landing.png', title: 'labbridge', x: 0.32, y: 0.58, w: 0.42, vx: 0.5, vy: 0.4, vw: 0.88, ry: 14, from: 'depth' },
    { src: 'lab.png', title: 'LabBridge · Main lab', x: 0.66, y: 0.6, w: 0.46, vx: 0.5, vy: 0.66, vw: 0.92, ry: -12, from: 'right', delay: 0.9, z: 80 },
  ] },
  { chip: ['BIOLOGY', GREEN], lines: [{ text: 'Focus on living cells.', accent: ['cells.'] }], wins: [
    { src: 'biology.png', title: 'Microscope', x: 0.42, y: 0.6, w: 0.6, vx: 0.5, vy: 0.45, vw: 0.94, ry: 10, from: 'left', glow: GREEN },
    { src: 'biology.png', title: 'Eyepiece', x: 0.78, y: 0.56, w: 0.24, vx: 0.5, vy: 0.72, vw: 0.6, aspect: 1, crop: { x: 0.57, y: 0.55, zoom: 2.4 }, ry: -16, from: 'depth', delay: 1.0, glow: GREEN, z: 120 },
  ] },
  { chip: ['PHYSICS', BLUE], lines: [{ text: "Build it. Test Ohm's law.", accent: ['law.'] }], wins: [
    { src: 'physics.png', title: "Ohm's law", x: 0.5, y: 0.6, w: 0.64, vx: 0.5, vy: 0.55, vw: 0.96, rx: 8, from: 'bottom', glow: BLUE },
  ] },
  { chip: ['PHYSICS', '#8b5cf6'], lines: [{ text: 'Measure g yourself.', accent: ['g'] }], wins: [
    { src: 'pendulum.png', title: 'Simple pendulum', x: 0.5, y: 0.6, w: 0.6, vx: 0.5, vy: 0.55, vw: 0.94, ry: -10, from: 'right', glow: '#8b5cf6' },
  ] },
  { chip: ['CHEMISTRY', TEAL], lines: [{ text: 'Titrate to the first pink.', accent: ['pink.'] }], wins: [
    { src: 'tap.png', title: 'Burette tap', x: 0.29, y: 0.6, w: 0.4, vx: 0.5, vy: 0.4, vw: 0.88, crop: { x: 0.45, y: 0.55, zoom: 1.5 }, ry: 16, from: 'left' },
    { src: 'pink.png', title: 'Conical flask', x: 0.71, y: 0.6, w: 0.4, vx: 0.5, vy: 0.7, vw: 0.88, crop: { x: 0.5, y: 0.62, zoom: 1.6 }, ry: -16, from: 'right', delay: 1.2, glow: PINK },
  ] },
  { lines: [{ text: 'Flame tests. Rates. Chromatography.', accent: ['Chromatography.'] }], wins: [
    { src: 'hood.png', title: 'Flame tests', x: 0.2, y: 0.6, w: 0.3, vx: 0.5, vy: 0.33, vw: 0.86, ry: 22, from: 'left', glow: '#f97316' },
    { src: 'rates.png', title: 'Rates of reaction', x: 0.5, y: 0.62, w: 0.3, vx: 0.5, vy: 0.56, vw: 0.86, from: 'bottom', delay: 0.6, glow: AMBER, z: 60 },
    { src: 'chroma.png', title: 'Chromatography', x: 0.8, y: 0.6, w: 0.3, vx: 0.5, vy: 0.79, vw: 0.86, ry: -22, from: 'right', delay: 1.2, glow: PINK },
  ] },
];

const SceneWins: React.FC<{ i: number; vertical: boolean }> = ({ i, vertical }) => {
  const t = useT();
  const sp = useSp();
  const { width: W, height: H } = useVideoConfig();
  if (!inScene(t, i)) return null;
  const whip = out(t, S[i + 1], 0.3);
  return (
    <>
      {SCENES[i].wins.map((w, k) => {
        const p = sp(S[i] + 0.1 + (w.delay ?? 0), 16, 0.65);
        const x = (vertical ? w.vx ?? w.x : w.x) * W;
        const y = (vertical ? w.vy ?? w.y : w.y) * H;
        const ww = (vertical ? w.vw ?? w.w : w.w) * W;
        const q = 1 - p;
        const dx = w.from === 'left' ? -W * 0.7 : w.from === 'right' ? W * 0.7 : 0;
        const dy = w.from === 'bottom' ? H * 0.6 : 0;
        const dz = w.from === 'depth' ? -1400 : -200;
        const ry = (vertical ? 0 : w.ry ?? 0) + q * (w.from === 'left' ? 40 : w.from === 'right' ? -40 : 0);
        const rx = (vertical ? 0 : w.rx ?? 0) + q * (w.from === 'bottom' ? 30 : 0) + (vertical ? 4 : 0);
        const drift = Math.sin((t - S[i]) * 0.9 + k) * 8;
        return (
          <Win key={k} src={w.src} title={w.title} w={ww} crop={w.crop} aspect={w.aspect} glow={w.glow}
            x={x + dx * q - (k % 2 ? -1 : 1) * whip * W * 0.5} y={y + dy * q + drift} z={(w.z ?? 0) + dz * q - whip * 1500}
            ry={ry + whip * (k % 2 ? -25 : 25)} rx={rx} o={Math.min(1, p * 1.3) * (1 - whip)} />
        );
      })}
    </>
  );
};

const SceneType: React.FC<{ i: number; vertical: boolean }> = ({ i, vertical }) => {
  const t = useT();
  const sp = useSp();
  const { width: W, height: H } = useVideoConfig();
  if (!inScene(t, i, 0.1)) return null;
  const sc = SCENES[i];
  const solo = sc.wins.length === 0;
  const big = (vertical ? 92 : 112) * (solo ? 1.25 : 1);
  const y0 = solo ? H * 0.45 : vertical ? H * 0.1 : H * 0.15;
  const chipP = sp(S[i] + 0.05, 14);
  const gone = out(t, S[i + 1], 0.3);
  return (
    <>
      {sc.chip && (
        <div style={{ position: 'absolute', left: W / 2, top: y0 - big * 0.95, transform: `translate(-50%,-50%) scale(${chipP})`, opacity: 1 - gone, padding: '8px 20px', borderRadius: 999, border: `1px solid ${sc.chip[1]}88`, background: `${sc.chip[1]}22`, color: sc.chip[1], fontFamily, fontWeight: 700, fontSize: vertical ? 30 : 26, letterSpacing: 5, boxShadow: `0 0 30px ${sc.chip[1]}44` }}>
          {sc.chip[0]}
        </div>
      )}
      {sc.lines.map((l, k) => (
        <Kinetic key={k} text={l.text} at={S[i] + 0.25 + (l.at ?? 0)} end={S[i + 1]} size={big * (k ? 0.62 : 1)} x={W / 2} y={y0 + k * big * 1.1} accent={l.accent?.map((a) => a.replace(/[.,]/g, ''))} color={k ? 'rgba(245,247,250,0.7)' : undefined} />
      ))}
    </>
  );
};

export const Ad: React.FC<{ vertical: boolean }> = ({ vertical }) => {
  const t = useT();
  const sp = useSp();
  const { width: W, height: H } = useVideoConfig();
  const cx = W / 2;
  const cy = H / 2;
  const big = vertical ? 92 : 112;
  const head = vertical ? H * 0.1 : H * 0.15;
  const ww = vertical ? W * 0.92 : W * 0.6;
  const camRY = Math.sin(t * 0.5) * 2.5;
  const camRX = Math.cos(t * 0.4) * 1.5;
  const C = 7; // Curie scene index
  return (
    <AbsoluteFill style={{ background: '#05070a', fontFamily }}>
      <Audio src={staticFile('mix.wav')} />
      <Glow vertical={vertical} />
      <CameraMotionBlur shutterAngle={200} samples={5}>
        <AbsoluteFill style={{ perspective: vertical ? 1600 : 1900, perspectiveOrigin: '50% 45%' }}>
          <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `rotateX(${camRX}deg) rotateY(${camRY}deg)` }}>
            {SCENES.map((_, i) => <SceneWins key={i} i={i} vertical={vertical} />)}
            {/* Dr. Curie guides */}
            {inScene(t, C) && (() => {
              const a = sp(S[C], 18);
              const c = sp(S[C] + 0.5, 15);
              const whip = out(t, S[C + 1], 0.3);
              const line = 'Titration today. Fill the burette through the funnel, then take the funnel out.';
              const shown = line.slice(0, Math.max(0, Math.floor((t - S[C] - 0.8) * 30)));
              const cw = vertical ? W * 0.84 : W * 0.3;
              return (
                <>
                  <Win src="bench.png" title="Chemistry bench" w={ww} x={cx - (vertical ? 0 : W * 0.12)} y={cy + H * (vertical ? -0.06 : 0.1)}
                    rx={6} ry={vertical ? 0 : 12} z={-260 + a * 160 - whip * 900} o={a * (1 - whip)} glow={AMBER} />
                  <div style={{ position: 'absolute', left: vertical ? cx - cw / 2 : cx + W * 0.1, top: cy + H * (vertical ? 0.14 : 0.0), width: cw, transform: `translateZ(${140 - (1 - c) * 400 - whip * 600}px) rotateY(${vertical ? 0 : -10}deg) translateY(${(1 - c) * 120}px)`, opacity: c * (1 - whip), padding: cw * 0.06, borderRadius: 22, background: 'rgba(14,18,24,0.66)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${AMBER}33, inset 0 1px 0 rgba(255,255,255,0.2)`, backdropFilter: 'blur(20px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div style={{ width: cw * 0.12, height: cw * 0.12, borderRadius: '50%', background: `linear-gradient(145deg, #2dd4bf, ${TEAL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: cw * 0.05, color: '#04201d' }}>DC</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: cw * 0.052, color: '#fff' }}>Dr. Curie</div>
                        <div style={{ fontWeight: 600, fontSize: cw * 0.036, color: TEAL, letterSpacing: 1.2 }}>LAB MANAGER</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: cw * 0.054, lineHeight: 1.35, color: 'rgba(255,255,255,0.92)', minHeight: cw * 0.3 }}>
                      {shown}<span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0, color: TEAL }}>▍</span>
                    </div>
                  </div>
                  <Pill text="NEXT · FUNNEL" at={S[C] + 1.6} x={vertical ? cx : cx - W * 0.14} y={cy + H * (vertical ? -0.1 : 0.0)} size={vertical ? 30 : 26} />
                </>
              );
            })()}
            {/* nine practicals, real marks */}
            {inScene(t, 8) && (() => {
              const whip = out(t, S[9], 0.32);
              const cw = vertical ? W * 0.29 : W * 0.17;
              const chH = cw * 0.62;
              const lock = sp(S[8] + 1.2, 12);
              return (
                <>
                  {PRACTICALS.map(([sub, name, col], i) => {
                    const p = sp(S[8] + 0.25 + i * 0.1, 15, 0.6);
                    const r = Math.floor(i / 3);
                    const k = (i % 3) - 1;
                    const x = vertical ? cx + k * (cw + 16) : cx - W * 0.17 + k * (cw + 22);
                    const y = (vertical ? cy - H * 0.12 : cy + H * 0.07) + (r - 1) * (chH + 18);
                    return (
                      <div key={i} style={{ position: 'absolute', left: x - cw / 2, top: y - chH / 2, width: cw, height: chH, transform: `translateZ(${-Math.abs(k) * 90 + (1 - p) * -900 - whip * 1200}px) rotateY(${-k * 14 + (1 - p) * 60}deg)`, opacity: p * (1 - whip), borderRadius: 18, padding: cw * 0.08, background: 'rgba(16,20,26,0.6)', border: `1px solid ${col}55`, boxShadow: `0 20px 50px rgba(0,0,0,0.55), 0 0 ${30 + lock * 20}px ${col}${lock > 0.5 ? '44' : '22'}, inset 0 1px 0 rgba(255,255,255,0.16)`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: cw * 0.07, fontWeight: 700, letterSpacing: 1.6, color: col }}>{sub.toUpperCase()}</div>
                        <div style={{ fontSize: cw * 0.105, fontWeight: 700, color: '#fff', letterSpacing: -0.5, lineHeight: 1.1 }}>{name}</div>
                      </div>
                    );
                  })}
                  {(() => {
                    const p = sp(S[8] + 1.2, 15);
                    return (
                      <Win src="sheet.png" title="Lab sheet · marked" w={vertical ? W * 0.84 : W * 0.3} aspect={1.25} crop={{ x: 0.375, y: 0.6, zoom: 2.4 }} glow={AMBER}
                        x={vertical ? cx : cx + W * 0.3} y={vertical ? cy + H * 0.27 + (1 - p) * H * 0.3 : cy + H * 0.08} z={(1 - p) * -700 + 60 - whip * 900}
                        ry={vertical ? 0 : -12} o={p * (1 - whip)} />
                    );
                  })()}
                </>
              );
            })()}
          </AbsoluteFill>
        </AbsoluteFill>
      </CameraMotionBlur>

      {SCENES.map((_, i) => <SceneType key={i} i={i} vertical={vertical} />)}
      <Kinetic text="Dr. Curie guides every step." at={S[C] + 0.25} end={S[C + 1]} size={big * 0.85} x={cx} y={head} accent={['Curie']} />
      <Kinetic text="Nine practicals. Real marks." at={S[8] + 0.25} end={S[9]} size={big * 0.85} x={cx} y={vertical ? H * 0.1 : head} accent={['marks']} />

      {/* logo */}
      {t >= S[9] - 0.05 && t < S[10] + 0.4 && (() => {
        const p = sp(S[9] + 0.05, 13, 0.7);
        const w = sp(S[9] + 0.25, 16);
        const g = out(t, S[10], 0.3);
        const ms = vertical ? 150 : 132;
        return (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - g, filter: `blur(${g * 16}px)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: ms * 0.28, transform: `scale(${0.7 + 0.3 * p})`, flexDirection: vertical ? 'column' : 'row' }}>
              <div style={{ transform: `rotate(${(1 - p) * -90}deg) scale(${p})` }}><Mark size={ms} /></div>
              <div style={{ fontWeight: 800, fontSize: ms * 0.95, letterSpacing: -ms * 0.045, color: '#fff', opacity: w, transform: `translateX(${(1 - w) * -40}px)`, clipPath: `inset(0 ${(1 - w) * 100}% 0 0)` }}>
                Lab<span style={{ color: TEAL }}>Bridge</span>
              </div>
            </div>
            <div style={{ marginTop: ms * 0.4, fontSize: ms * 0.24, fontWeight: 500, color: 'rgba(255,255,255,0.7)', opacity: sp(S[9] + 0.9), letterSpacing: 0.3, textAlign: 'center' }}>
              Practical science. Anywhere.
            </div>
          </AbsoluteFill>
        );
      })()}

      {/* end card */}
      {t >= S[10] - 0.05 && (() => {
        const a = sp(S[10] + 0.05, 16);
        const b = sp(S[10] + 0.3, 16);
        return (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <div style={{ fontSize: vertical ? 34 : 30, fontWeight: 500, letterSpacing: 6, color: 'rgba(255,255,255,0.55)', opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>MADE WITH</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: b, transform: `translateY(${(1 - b) * 30}px) scale(${0.94 + 0.06 * b})` }}>
              <Mark size={vertical ? 84 : 72} />
              <div style={{ fontSize: vertical ? 78 : 68, fontWeight: 800, color: '#fff', letterSpacing: -2 }}>LabBridge</div>
            </div>
            <div style={{ marginTop: 10, fontSize: vertical ? 30 : 26, color: TEAL, fontWeight: 600, opacity: sp(S[10] + 0.6) }}>Free in your browser. No lab needed.</div>
          </AbsoluteFill>
        );
      })()}
    </AbsoluteFill>
  );
};
