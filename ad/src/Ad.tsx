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
  const pink = interpolate(t, [6.1, 6.5, 7.4, 7.8], [0, 1, 1, 0], clamp);
  const amber = interpolate(t, [9.4, 9.9, 11.9, 12.4], [0, 1, 1, 0], clamp);
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

export const Ad: React.FC<{ vertical: boolean }> = ({ vertical }) => {
  const t = useT();
  const sp = useSp();
  const { width: W, height: H } = useVideoConfig();
  const cx = W / 2;
  const cy = H / 2;
  const big = vertical ? 96 : 118;
  const head = vertical ? H * 0.2 : H * 0.17;
  const ww = vertical ? W * 0.9 : W * 0.62; // main window width

  // camera drift for the whole stage
  const camRY = Math.sin(t * 0.5) * 2.5;
  const camRX = Math.cos(t * 0.4) * 1.5;

  return (
    <AbsoluteFill style={{ background: '#05070a', fontFamily }}>
      <Audio src={staticFile('mix.wav')} />
      <Glow vertical={vertical} />
      <CameraMotionBlur shutterAngle={200} samples={5}>
        <AbsoluteFill style={{ perspective: vertical ? 1600 : 1900, perspectiveOrigin: '50% 45%' }}>
          <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `rotateX(${camRX}deg) rotateY(${camRY}deg)` }}>
            {/* 1 — a window rises out of the dark */}
            {inScene(t, 0) && (() => {
              const p = sp(0.35, 20, 0.9);
              const whip = out(t, S[1], 0.32);
              return (
                <Win src="landing.png" title="labbridge — Experience practical science" w={ww} x={cx} y={cy + H * 0.08 + (1 - p) * H * 0.5}
                  z={-600 * (1 - p) + whip * 1600} rx={22 * (1 - p) + 6} o={Math.min(1, p * 1.4)} />
              );
            })()}
            {/* 2 — whip into the lab */}
            {inScene(t, 1) && (() => {
              const p = sp(S[1], 15, 0.6);
              const whip = out(t, S[2], 0.3);
              return (
                <Win src="lab.png" title="LabBridge · Main lab" w={ww * 1.05} x={cx + (1 - p) * W * 0.8 - whip * W * 0.9} y={cy + H * 0.08}
                  ry={-34 * (1 - p) - 6 + whip * 30} z={-200 * (1 - p)} o={p} />
              );
            })()}
            {/* 3 — turn the tap, watch for the pink */}
            {inScene(t, 2) && (() => {
              const a = sp(S[2], 16);
              const b = sp(6.2, 16);
              const whip = out(t, S[3], 0.3);
              const half = vertical ? W * 0.86 : W * 0.4;
              return (
                <>
                  <Win src="tap.png" title="Burette tap" w={half} crop={{ x: 0.45, y: 0.55, zoom: 1.5 }}
                    x={vertical ? cx : cx - W * 0.21 - (1 - a) * W * 0.6} y={vertical ? cy - H * 0.04 - (1 - a) * H * 0.4 : cy + H * 0.1}
                    ry={vertical ? 0 : 16} rx={vertical ? 10 : 0} z={-whip * 900} o={a * (1 - whip)} />
                  <Win src="pink.png" title="Conical flask" w={half} crop={{ x: 0.5, y: 0.62, zoom: 1.6 }} glow={PINK}
                    x={vertical ? cx : cx + W * 0.21 + (1 - b) * W * 0.6} y={vertical ? cy + H * 0.27 + (1 - b) * H * 0.4 : cy + H * 0.1}
                    ry={vertical ? 0 : -16} rx={vertical ? -10 : 0} z={-whip * 900 + (1 - b) * 200} o={b * (1 - whip)} />
                </>
              );
            })()}
            {/* 4 — read the scale: the lens is pulled out of the screen */}
            {inScene(t, 3) && (() => {
              const a = sp(S[3], 18);
              const l = sp(8.05, 13, 0.6);
              const whip = out(t, S[4], 0.3);
              const lw = vertical ? W * 0.62 : W * 0.24;
              return (
                <>
                  <Win src="read.png" title="Reading the burette" w={ww * 0.95} x={cx - (vertical ? 0 : W * 0.08)} y={cy + H * (vertical ? -0.02 : 0.09)}
                    rx={8} ry={vertical ? 0 : 10} z={-300 + a * 200 - whip * 800} o={a * (1 - whip) * (1 - 0.45 * l)} />
                  <Win src="read.png" title="Lens · eye level" w={lw} aspect={0.62} crop={{ x: 0.917, y: 0.6, zoom: 4.4 }} glow={AMBER}
                    x={vertical ? cx : cx + W * 0.19} y={cy + H * (vertical ? 0.18 : 0.08) + (1 - l) * H * 0.3} z={(1 - l) * -500 + 120 - whip * 600}
                    ry={vertical ? 0 : -14 * (1 - l) - 6} o={l * (1 - whip)} />
                </>
              );
            })()}
            {/* 5 — Dr. Curie guides */}
            {inScene(t, 4) && (() => {
              const a = sp(S[4], 18);
              const c = sp(10.05, 15);
              const whip = out(t, S[5], 0.3);
              const line = 'Titration today. Fill the burette through the funnel, then take the funnel out.';
              const shown = line.slice(0, Math.max(0, Math.floor((t - 10.35) * 34)));
              const cw = vertical ? W * 0.82 : W * 0.3;
              return (
                <>
                  <Win src="bench.png" title="Chemistry bench" w={ww} x={cx - (vertical ? 0 : W * 0.1)} y={cy + H * (vertical ? -0.03 : 0.1)}
                    rx={6} ry={vertical ? 0 : 12} z={-260 + a * 160 - whip * 900} o={a * (1 - whip)} glow={AMBER} />
                  <div style={{ position: 'absolute', left: vertical ? cx - cw / 2 : cx + W * 0.08, top: cy + H * (vertical ? 0.17 : 0.02), width: cw, transform: `translateZ(${140 - (1 - c) * 400 - whip * 600}px) rotateY(${vertical ? 0 : -10}deg) translateY(${(1 - c) * 120}px)`, opacity: c * (1 - whip), padding: cw * 0.06, borderRadius: 22, background: 'rgba(14,18,24,0.62)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${AMBER}33, inset 0 1px 0 rgba(255,255,255,0.2)`, backdropFilter: 'blur(20px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div style={{ width: cw * 0.11, height: cw * 0.11, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${TEAL}` }}>
                        <Img src={staticFile('read.png')} style={{ width: cw * 0.11 * 7, marginLeft: -cw * 0.11 * 3.95, marginTop: -cw * 0.11 * 1.55 }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: cw * 0.052, color: '#fff' }}>Dr. Curie</div>
                        <div style={{ fontWeight: 600, fontSize: cw * 0.036, color: TEAL, letterSpacing: 1.2 }}>LAB MANAGER</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: cw * 0.054, lineHeight: 1.35, color: 'rgba(255,255,255,0.92)', minHeight: cw * 0.22 }}>
                      {shown}<span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0, color: TEAL }}>▍</span>
                    </div>
                  </div>
                  <Pill text="NEXT · FUNNEL" at={11.0} x={vertical ? cx : cx - W * 0.12} y={cy + H * (vertical ? -0.06 : 0.0)} size={vertical ? 30 : 26} />
                </>
              );
            })()}
            {/* 6 — nine practicals, real marks: a curved wall of cards */}
            {inScene(t, 5) && (() => {
              const whip = out(t, S[6], 0.32);
              const cols = vertical ? 3 : 3;
              const cw = vertical ? W * 0.29 : W * 0.17;
              const chH = cw * 0.62;
              const lock = sp(13.3, 12);
              return (
                <>
                  {PRACTICALS.map(([sub, name, col], i) => {
                    const p = sp(12.4 + i * 0.1, 15, 0.6);
                    const r = Math.floor(i / cols);
                    const k = (i % cols) - 1;
                    const x = vertical ? cx + k * (cw + 16) : cx - W * 0.17 + k * (cw + 22);
                    const y = (vertical ? cy - H * 0.1 : cy + H * 0.07) + (r - 1) * (chH + 18);
                    return (
                      <div key={i} style={{ position: 'absolute', left: x - cw / 2, top: y - chH / 2, width: cw, height: chH, transform: `translateZ(${-Math.abs(k) * 90 + (1 - p) * -900 - whip * 1200}px) rotateY(${-k * 14 + (1 - p) * 60}deg)`, opacity: p * (1 - whip), borderRadius: 18, padding: cw * 0.08, background: 'rgba(16,20,26,0.6)', border: `1px solid ${col}55`, boxShadow: `0 20px 50px rgba(0,0,0,0.55), 0 0 ${30 + lock * 20}px ${col}${lock > 0.5 ? '44' : '22'}, inset 0 1px 0 rgba(255,255,255,0.16)`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: cw * 0.07, fontWeight: 700, letterSpacing: 1.6, color: col }}>{sub.toUpperCase()}</div>
                        <div style={{ fontSize: cw * 0.105, fontWeight: 700, color: '#fff', letterSpacing: -0.5, lineHeight: 1.1 }}>{name}</div>
                      </div>
                    );
                  })}
                  {(() => {
                    const p = sp(13.3, 15);
                    return (
                      <Win src="sheet.png" title="Lab sheet · marked" w={vertical ? W * 0.84 : W * 0.3} aspect={1.25} crop={{ x: 0.375, y: 0.6, zoom: 2.4 }} glow={AMBER}
                        x={vertical ? cx : cx + W * 0.3} y={vertical ? cy + H * 0.3 + (1 - p) * H * 0.3 : cy + H * 0.08} z={(1 - p) * -700 + 60 - whip * 900}
                        ry={vertical ? 0 : -12} o={p * (1 - whip)} />
                    );
                  })()}
                </>
              );
            })()}
          </AbsoluteFill>
        </AbsoluteFill>
      </CameraMotionBlur>

      {/* kinetic type layer */}
      <Kinetic text="A real science lab." at={0.95} end={S[1]} size={big} x={cx} y={head} accent={['lab']} />
      <Kinetic text="In your browser." at={S[1] + 0.2} end={S[2]} size={big} x={cx} y={head} accent={['browser']} />
      <Kinetic text="Turn the tap." at={S[2] + 0.2} end={S[3]} size={big * 0.86} x={cx} y={head - big * 0.5} />
      <Kinetic text="Watch for the pink." at={6.25} end={S[3]} size={big * 0.86} x={cx} y={head + big * 0.5} accent={['pink']} />
      <Kinetic text="Read the scale yourself." at={S[3] + 0.2} end={S[4]} size={big * 0.86} x={cx} y={head} accent={['yourself']} />
      <Kinetic text="Dr. Curie guides every step." at={S[4] + 0.2} end={S[5]} size={big * 0.8} x={cx} y={head} accent={['Curie']} />
      <Kinetic text="Nine practicals. Real marks." at={S[5] + 0.2} end={S[6]} size={big * 0.8} x={cx} y={vertical ? H * 0.13 : head} accent={['marks']} />

      {/* 7 — logo */}
      {t >= S[6] - 0.05 && t < S[7] + 0.4 && (() => {
        const p = sp(S[6] + 0.05, 13, 0.7);
        const w = sp(S[6] + 0.25, 16);
        const g = out(t, S[7], 0.3);
        const ms = vertical ? 150 : 132;
        return (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - g, filter: `blur(${g * 16}px)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: ms * 0.28, transform: `scale(${0.7 + 0.3 * p})`, flexDirection: vertical ? 'column' : 'row' }}>
              <div style={{ transform: `rotate(${(1 - p) * -90}deg) scale(${p})` }}><Mark size={ms} /></div>
              <div style={{ fontWeight: 800, fontSize: ms * 0.95, letterSpacing: -ms * 0.045, color: '#fff', opacity: w, transform: `translateX(${(1 - w) * -40}px)`, clipPath: `inset(0 ${(1 - w) * 100}% 0 0)` }}>
                Lab<span style={{ color: TEAL }}>Bridge</span>
              </div>
            </div>
            <div style={{ marginTop: ms * 0.4, fontSize: ms * 0.24, fontWeight: 500, color: 'rgba(255,255,255,0.7)', opacity: sp(S[6] + 0.7), letterSpacing: 0.3, textAlign: 'center' }}>
              Experience practical science. Anywhere.
            </div>
          </AbsoluteFill>
        );
      })()}

      {/* 8 — end card */}
      {t >= S[7] - 0.05 && (() => {
        const a = sp(S[7] + 0.05, 16);
        const b = sp(S[7] + 0.3, 16);
        return (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <div style={{ fontSize: vertical ? 34 : 30, fontWeight: 500, letterSpacing: 6, color: 'rgba(255,255,255,0.55)', opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>MADE WITH</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: b, transform: `translateY(${(1 - b) * 30}px) scale(${0.94 + 0.06 * b})` }}>
              <Mark size={vertical ? 84 : 72} />
              <div style={{ fontSize: vertical ? 78 : 68, fontWeight: 800, color: '#fff', letterSpacing: -2 }}>LabBridge</div>
            </div>
            <div style={{ marginTop: 10, fontSize: vertical ? 30 : 26, color: TEAL, fontWeight: 600, opacity: sp(S[7] + 0.6) }}>Free in your browser. No lab needed.</div>
          </AbsoluteFill>
        );
      })()}
    </AbsoluteFill>
  );
};
