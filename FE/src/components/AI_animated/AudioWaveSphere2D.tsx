import { useRef, useEffect, type CSSProperties } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// Fibonacci sphere point distribution (same as AudioOrb in 3D)
function fibonacciSphere(n: number): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return pts;
}

// Simple simplex-like noise (no dep)
function noise(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = x * x * x * (x * (x * 6 - 15) + 10);
  const v = y * y * y * (y * (y * 6 - 15) + 10);
  const a = (X + Y * 57 + 131) * 1234567 & 0x7fffffff;
  const b = (X + 1 + Y * 57 + 131) * 1234567 & 0x7fffffff;
  const c = (X + (Y + 1) * 57 + 131) * 1234567 & 0x7fffffff;
  const d = (X + 1 + (Y + 1) * 57 + 131) * 1234567 & 0x7fffffff;
  const lerp = (t: number, a: number, b: number) => a + t * (b - a);
  return lerp(v, lerp(u, (a / 0x7fffffff) * 2 - 1, (b / 0x7fffffff) * 2 - 1), lerp(u, (c / 0x7fffffff) * 2 - 1, (d / 0x7fffffff) * 2 - 1));
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTICLE_COUNT = 620;
const ORBIT_RING_COUNT = 3;
const ORBIT_DOT_COUNT = 28;

// Precompute fibonacci positions (unit sphere)
const FIELD_PTS = fibonacciSphere(PARTICLE_COUNT);
const FIELD_SEEDS = FIELD_PTS.map((_, i) => i * 0.137);
const FIELD_TINTS = FIELD_PTS.map((_, i) => Math.sin(i * 12.9898 + 78.233) * 0.5 + 0.5);

// Orbit ring positions on unit sphere, tilted axes
const RING_AXES: Array<[number, number, number]> = [
  [0, 1, 0],
  [0.7, 0, 0.7],
  [0.2, 0.85, -0.45],
];
const RING_RADII = [1.05, 1.18, 0.95];

function normalize3(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

const ORBIT_PTS: Array<{ x: number; y: number; z: number; seed: number; ring: number }> = [];
for (let r = 0; r < ORBIT_RING_COUNT; r++) {
  const axisRaw = RING_AXES[r];
  const radius = RING_RADII[r];
  const axis = normalize3(axisRaw);
  const baseAngle = (r * Math.PI) / 3;
  let tangentRaw: [number, number, number] = [1, 0, 0];
  if (Math.abs(axis[0]) > 0.5) tangentRaw = [0, 1, 0];
  const right = normalize3(cross3(axis, tangentRaw));
  const up = normalize3(cross3(right, axis));
  for (let d = 0; d < ORBIT_DOT_COUNT; d++) {
    const angle = (d / ORBIT_DOT_COUNT) * Math.PI * 2 + baseAngle;
    const cx = Math.cos(angle) * radius;
    const cy = Math.sin(angle) * radius;
    ORBIT_PTS.push({
      x: right[0] * cx + up[0] * cy,
      y: right[1] * cx + up[1] * cy,
      z: right[2] * cx + up[2] * cy,
      seed: r * 0.4 + d * 0.137,
      ring: r,
    });
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AudioWaveSphere2DProps {
  isSpeaking: boolean;
  isResponding?: boolean;
  audioLevel?: number;
  size?: number;
  colorTop?: string;
  colorMid?: string;
  colorBottom?: string;
  style?: CSSProperties;
}

export default function AudioWaveSphere2D({
  isSpeaking,
  isResponding = false,
  audioLevel = 0,
  size = 240,
  colorTop = "#FFD0D0",
  colorMid = "#E5484D",
  colorBottom = "#B90000",
  style,
}: AudioWaveSphere2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpeakingRef = useRef(isSpeaking);
  const isRespondingRef = useRef(isResponding);
  const audioLevelRef = useRef(audioLevel);

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isRespondingRef.current = isResponding; }, [isResponding]);
  useEffect(() => { audioLevelRef.current = audioLevel; }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const sphereRadius = size * 0.38; // projected sphere radius in px

    // Parse colors
    const [tr, tg, tb] = hexToRgb(colorTop);
    const [mr, mg, mb] = hexToRgb(colorMid);
    const [br, bg, bb] = hexToRgb(colorBottom);

    // State for smooth lerp
    let uAudio = 0;
    let uSpeak = 0;

    // Rotation state  (slow continuous rotation like GSAP in 3D version)
    let fieldRotX = 0;
    let fieldRotY = 0;
    let orbitRotX = 0;
    let orbitRotY = 0;
    let orbitRotZ = 0;
    let orbScale = 0.6;

    const t0 = performance.now();
    let animId = 0;

    function rotateY(x: number, y: number, z: number, a: number): [number, number, number] {
      return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
    }
    function rotateX(x: number, y: number, z: number, a: number): [number, number, number] {
      return [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
    }
    function rotateZ(x: number, y: number, z: number, a: number): [number, number, number] {
      return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
    }

    const draw = (now: number) => {
      const t = (now - t0) / 1000;

      const speaking = isSpeakingRef.current;
      const responding = isRespondingRef.current;
      const isActive = speaking || responding;
      const rawAudio = audioLevelRef.current;
      const targetAudio = speaking ? Math.max(0.18, Math.min(0.9, rawAudio)) : (responding ? 0.12 : 0.07);
      const targetSpeak = speaking ? 1 : 0;

      uAudio += (targetAudio - uAudio) * 0.12;
      uSpeak += (targetSpeak - uSpeak) * 0.06;

      // Slow orb intro scale
      if (orbScale < 1) orbScale = Math.min(1, orbScale + 0.025);
      const breathScale = isActive
        ? 1 + Math.sin(t * 1.4) * 0.035
        : 1 + Math.sin(t * 0.9) * 0.008;
      const scale = orbScale * breathScale;

      // Continuous rotation (matches GSAP durations: field 60s/95s, orbit 28s/44s/70s)
      fieldRotY = (t / 60) * Math.PI * 2;
      fieldRotX = (t / 95) * Math.PI * 2;
      orbitRotY = (t / 28) * Math.PI * 2;
      orbitRotX = -(t / 44) * Math.PI * 2;
      orbitRotZ = (t / 70) * Math.PI * 2;

      ctx.clearRect(0, 0, size, size);

      // ---- Halo glow ----
      const haloIntensity = 0.22 + uSpeak * 0.22 + uAudio * 0.18;
      const haloRadius = sphereRadius * scale * 1.08;
      const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius * 1.15);
      haloGrad.addColorStop(0, rgba(tr, tg, tb, haloIntensity * 0.85));
      haloGrad.addColorStop(0.55, rgba(tr, tg, tb, haloIntensity * 0.25));
      haloGrad.addColorStop(1, rgba(tr, tg, tb, 0));
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // ---- Halo ring border (circle outline) ----
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(tr, tg, tb, 0.18 + uSpeak * 0.12);
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.restore();

      // ---- Core glow disc ----
      const coreRadius = sphereRadius * scale * 0.42;
      const coreIntensity = 0.7 + uSpeak * 0.25 + uAudio * 0.2;
      const coreBreath = 1 + Math.sin(t * 0.9) * 0.02 + uAudio * 0.18;
      const coreR = coreRadius * coreBreath;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      // blend from mid (white-ish) at center to tip at edge
      const coreInnR = Math.round((mr + tr * 0.5) / 1.5);
      const coreInnG = Math.round((mg + tg * 0.5) / 1.5);
      const coreInnB = Math.round((mb + tb * 0.5) / 1.5);
      coreGrad.addColorStop(0, rgba(coreInnR, coreInnG, coreInnB, coreIntensity * 0.9));
      coreGrad.addColorStop(0.55, rgba(mr, mg, mb, coreIntensity * 0.5));
      coreGrad.addColorStop(1, rgba(br, bg, bb, 0));
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // ---- Field particles ----
      // Build sorted array by projected Z for depth ordering
      type Dot = { px: number; py: number; pz: number; seed: number; tint: number };
      const fieldDots: Dot[] = FIELD_PTS.map(([fx, fy, fz], i) => {
        // Apply field rotation
        let [rx, ry, rz] = rotateY(fx, fy, fz, fieldRotY);
        [rx, ry, rz] = rotateX(rx, ry, rz, fieldRotX);
        // Project: simple orthographic scaled to sphereRadius
        const px = cx + rx * sphereRadius * scale;
        const py = cy - ry * sphereRadius * scale;
        return { px, py, pz: rz, seed: FIELD_SEEDS[i], tint: FIELD_TINTS[i] };
      });
      fieldDots.sort((a, b) => a.pz - b.pz); // back to front

      for (const dot of fieldDots) {
        const { px, py, pz, seed, tint } = dot;

        // Frontness: how much it faces the camera (positive z = front)
        const frontness = Math.max(-1, Math.min(1, pz)); // -1..1
        const frontMix = frontness * 0.5 + 0.5; // 0..1

        // Wave animation on size
        const wave = 0.5 + 0.5 * Math.sin(t * 1.6 + seed * 6.2831);
        const settle = 0.5 + 0.5 * Math.sin(t * 0.6 + seed * 3.1);
        const pulse = uAudio * wave + uAudio * 0.4 * settle;

        const worldSize = (0.012 + (0.026 - 0.012) * uAudio + uSpeak * 0.005 + pulse * 0.012);
        const dotRadius = Math.max(0.5, worldSize * sphereRadius * 0.9);

        // Depth shading
        const depthShade = 0.25 + 0.75 * frontMix;

        // Color mix: tip vs mid
        const mixFactor = 0.4 + tint * 0.6;
        const colR = mr + (br - mr) * mixFactor;
        const colG = mg + (bg - mg) * mixFactor;
        const colB = mb + (bb - mb) * mixFactor;

        const activity = (0.85 + 0.35 * uAudio) * (0.9 + 0.2 * uSpeak);
        const fr = Math.round(Math.min(255, colR * depthShade * activity + br * pulse * 0.35));
        const fg = Math.round(Math.min(255, colG * depthShade * activity + bg * pulse * 0.35));
        const fb = Math.round(Math.min(255, colB * depthShade * activity + bb * pulse * 0.35));

        const alpha = (0.55 + 0.45 * frontMix) * (0.8 + 0.2 * uSpeak);

        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = rgba(fr, fg, fb, alpha);
        ctx.fill();
      }

      // ---- Orbit ring dots ----
      for (const op of ORBIT_PTS) {
        let [rx, ry, rz] = rotateY(op.x, op.y, op.z, orbitRotY);
        [rx, ry, rz] = rotateX(rx, ry, rz, orbitRotX);
        [rx, ry, rz] = rotateZ(rx, ry, rz, orbitRotZ);

        const px = cx + rx * sphereRadius * scale;
        const py = cy - ry * sphereRadius * scale;

        const wave = 0.5 + 0.5 * Math.sin(t * 2.2 + op.seed * 6.2831);
        const glow = uAudio * wave + uSpeak * 0.4;
        const worldSize = 0.010 + (0.022 - 0.010) * uAudio + uSpeak * 0.004 + glow * 0.010;
        const dotRadius = Math.max(0.4, worldSize * sphereRadius * 0.9);

        const ringFade = 0.7 + op.ring * 0.15;
        const bright = ringFade * (1 + glow * 0.5);
        const fr = Math.round(Math.min(255, br * bright));
        const fg = Math.round(Math.min(255, bg * bright));
        const fb = Math.round(Math.min(255, bb * bright));
        const alpha = (0.6 + 0.4 * uAudio) * (0.85 + 0.15 * uSpeak);

        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = rgba(fr, fg, fb, alpha);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [size, colorTop, colorMid, colorBottom]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ display: "block", ...style }}
    />
  );
}
