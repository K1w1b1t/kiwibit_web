'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dictionary } from '@/shared/i18n/get-dictionary';

interface ThreatRadarProps {
  dict: Dictionary['radar'];
}

interface Blip {
  angleDeg: number;
  radius: number;
}

const CENTER = 200;
const MAX_RADIUS = 170;
const RINGS = [50, 95, 140, 170];
const SWEEP_SECONDS = 6;

// Deterministic blips (no Math.random in render — hydration + React Compiler safe).
const BLIPS: Blip[] = [
  { angleDeg: 25, radius: 120 },
  { angleDeg: 80, radius: 70 },
  { angleDeg: 150, radius: 150 },
  { angleDeg: 205, radius: 100 },
  { angleDeg: 270, radius: 135 },
  { angleDeg: 325, radius: 60 },
];

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

interface TransientBlip {
  id: number;
  x: number;
  y: number;
}

export function ThreatRadar({ dict }: ThreatRadarProps) {
  const [transient, setTransient] = useState<TransientBlip[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastSpawn = useRef(0);
  const nextId = useRef(0);

  useEffect(() => {
    if (transient.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      setTransient((current) => current.slice(1));
    }, 1200);
    return () => clearTimeout(timer);
  }, [transient]);

  const handlePointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const now = event.timeStamp;
    if (now - lastSpawn.current < 260) {
      return;
    }
    lastSpawn.current = now;

    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 400;
    const y = ((event.clientY - rect.top) / rect.height) * 400;

    const dx = x - CENTER;
    const dy = y - CENTER;
    if (Math.sqrt(dx * dx + dy * dy) > MAX_RADIUS) {
      return;
    }

    nextId.current += 1;
    const id = nextId.current;
    setTransient((current) => [...current.slice(-4), { id, x, y }]);
  }, []);

  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">{dict.label}</p>
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
          <span className="accent-pulse inline-block h-2 w-2 rounded-full bg-accent" />
          {dict.active}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 400 400"
        role="img"
        aria-label={dict.label}
        onPointerMove={handlePointerMove}
        className="mt-4 aspect-square w-full touch-pan-y"
      >
        <defs>
          <linearGradient id="radar-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {RINGS.map((r) => (
          <circle
            key={r}
            cx={CENTER}
            cy={CENTER}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1}
          />
        ))}
        <line
          x1={CENTER - MAX_RADIUS}
          y1={CENTER}
          x2={CENTER + MAX_RADIUS}
          y2={CENTER}
          stroke="rgba(255,255,255,0.08)"
        />
        <line
          x1={CENTER}
          y1={CENTER - MAX_RADIUS}
          x2={CENTER}
          y2={CENTER + MAX_RADIUS}
          stroke="rgba(255,255,255,0.08)"
        />

        {/* Rotating sweep wedge */}
        <g className="radar-sweep">
          <path
            d={`M ${CENTER} ${CENTER} L ${CENTER + MAX_RADIUS} ${CENTER} A ${MAX_RADIUS} ${MAX_RADIUS} 0 0 0 ${
              polar(-45, MAX_RADIUS).x
            } ${polar(-45, MAX_RADIUS).y} Z`}
            fill="url(#radar-beam)"
          />
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + MAX_RADIUS}
            y2={CENTER}
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeOpacity={0.7}
          />
        </g>

        {/* Static threat blips — ping fires as the beam passes each one */}
        {BLIPS.map((blip, index) => {
          const { x, y } = polar(blip.angleDeg, blip.radius);
          const delay = `${(((blip.angleDeg + 360) % 360) / 360) * SWEEP_SECONDS}s`;
          return (
            <g key={`blip-${index}`}>
              <circle cx={x} cy={y} r={2.5} fill="var(--accent)" fillOpacity={0.9} />
              <circle
                className="radar-ping"
                cx={x}
                cy={y}
                r={7}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.5}
                style={{ animationDelay: delay }}
              />
            </g>
          );
        })}

        {/* Transient blips spawned on pointer move */}
        {transient.map((blip) => (
          <circle key={blip.id} cx={blip.x} cy={blip.y} r={3} fill="#fff" fillOpacity={0.85} />
        ))}
      </svg>

      <p className="mt-4 font-mono text-xs text-white/60">
        <span className="text-accent">[ {dict.status} ]</span> {BLIPS.length} {dict.signals} ·{' '}
        {dict.active}
      </p>
    </div>
  );
}
