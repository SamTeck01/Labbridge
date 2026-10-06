import React from 'react';
import { ClipboardList, Droplet, Droplets, FlaskConical, Funnel, Pipette, RotateCw, ScanEye } from 'lucide-react';

/**
 * LabBridge's icon set: Lucide where it has the object, hand-drawn in Lucide's style where it
 * doesn't (burette, stopcock, a bubble in the jet). See .claude/skills/svg-icons.
 */

type P = { className?: string; strokeWidth?: number };
const Svg = ({ className, strokeWidth = 1.75, children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

/** A burette with an arrow pouring in at the top: "fill the burette". */
export const BuretteFill = (p: P) => (
  <Svg {...p}>
    <path d="M10 8v9.5h4V8" />
    <path d="M10 12.5h4" />
    <path d="M8.5 19h7" />
    <path d="M12 19.5V22" />
    <path d="M12 2v4" />
    <path d="M10 4.5L12 6.5 14 4.5" />
  </Svg>
);

/** The jet under the tap with an air bubble in it. */
export const JetBubble = (p: P) => (
  <Svg {...p}>
    <path d="M10 2v8h4V2" />
    <path d="M7.5 11.5h9" />
    <path d="M12 12v4.5" />
    <circle cx="12" cy="19.5" r="2" />
    <circle cx="17.5" cy="17" r="1.25" />
  </Svg>
);

/** Stopcock turned open with a running stream. */
export const TapRun = (p: P) => (
  <Svg {...p}>
    <path d="M10 2v6h4V2" />
    <path d="M12 6.5v3" />
    <circle cx="12" cy="10.5" r="2" />
    <path d="M12 6.5v8" />
    <path d="M12 16v2.5" />
    <path d="M12 20.5V22" />
  </Svg>
);

/** Stopcock turned across: closed. */
export const TapClose = (p: P) => (
  <Svg {...p}>
    <path d="M10 2v6h4V2" />
    <circle cx="12" cy="10.5" r="2" />
    <path d="M6 10.5h3.5" />
    <path d="M14.5 10.5H18" />
    <path d="M12 12.5V16" />
    <path d="M9 19l6 0" />
  </Svg>
);

export const LabIcon = {
  fill: BuretteFill,
  funnel: (p: P) => <Funnel strokeWidth={1.75} {...p} />,
  bubble: JetBubble,
  pipette: (p: P) => <Pipette strokeWidth={1.75} {...p} />,
  dropper: (p: P) => <Droplets strokeWidth={1.75} {...p} />,
  flask: (p: P) => <FlaskConical strokeWidth={1.75} {...p} />,
  eye: (p: P) => <ScanEye strokeWidth={1.75} {...p} />,
  stream: TapRun,
  drop: (p: P) => <Droplet strokeWidth={1.75} {...p} />,
  stop: TapClose,
  swirl: (p: P) => <RotateCw strokeWidth={1.75} {...p} />,
  sheet: (p: P) => <ClipboardList strokeWidth={1.75} {...p} />,
};
