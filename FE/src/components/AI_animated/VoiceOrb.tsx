import { useRef, useEffect, type CSSProperties } from "react";

const BRAND_RGB = "185, 0, 0";

function rgbaFromColor(color: string, alpha: number): string {
  const a = alpha.toFixed(3);
  if (color.startsWith("#") && color.length >= 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${a})`);
  }
  return `rgba(${BRAND_RGB}, ${a})`;
}

export interface VoiceOrbProps {
  /** True when AI is talking to user (TTS playing). False when AI is listening / idle. */
  isSpeaking: boolean;
  size?: number;
  style?: CSSProperties;
  color?: string;
}

const BAR_COUNT = 72;
const ROTATION_IDLE = 0.16;
const ROTATION_ACTIVE = 0.04;

function VoiceOrb({
  isSpeaking,
  size = 168,
  style,
  color = `rgb(${BRAND_RGB})`,
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.lineCap = "round";

    const cx = size / 2;
    const cy = size / 2;
    const innerRadius = size * 0.14;
    const maxBarLength = size * 0.36;
    const ringRadius = size * 0.21;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let animId = 0;
    let last = performance.now();
    const t0 = last;

    const animate = (now: number) => {
      last = now;
      const t = (now - t0) / 1000;
      const speaking = isSpeakingRef.current;

      ctx.clearRect(0, 0, size, size);

      const pulseHalo = speaking
        ? 0.85 + Math.sin(t * 4.2) * 0.12
        : 0.55 + Math.sin(t * 1.4) * 0.08;

      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringRadius + maxBarLength + 8);
      halo.addColorStop(0, rgbaFromColor(color, speaking ? 0.22 * pulseHalo : 0.1 * pulseHalo));
      halo.addColorStop(0.5, rgbaFromColor(color, speaking ? 0.08 : 0.03));
      halo.addColorStop(1, rgbaFromColor(color, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius + maxBarLength + 8, 0, Math.PI * 2);
      ctx.fill();

      if (speaking) {
        const expandPhase = (t * 1.6) % 1;
        const ringR = ringRadius + maxBarLength + 4 + expandPhase * 18;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = rgbaFromColor(color, 0.18 * (1 - expandPhase));
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const coreBase = speaking ? 5.5 : 4.2;
      const coreAmp = speaking ? 1.4 : 0.5;
      const coreFreq = speaking ? 7.5 : 1.8;
      const corePulse = coreBase + Math.sin(t * coreFreq) * coreAmp;
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, corePulse * 3);
      coreGlow.addColorStop(0, rgbaFromColor(color, speaking ? 0.55 : 0.32));
      coreGlow.addColorStop(0.4, rgbaFromColor(color, speaking ? 0.18 : 0.1));
      coreGlow.addColorStop(1, rgbaFromColor(color, 0));
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, corePulse * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, corePulse * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = rgbaFromColor(color, speaking ? 0.95 : 0.7);
      ctx.fill();

      const rotation = speaking ? t * ROTATION_ACTIVE : t * ROTATION_IDLE;
      const speed = speaking ? 5.6 : 1.4;
      const amp = speaking ? 1 : 0.28;

      for (let i = 0; i < BAR_COUNT; i++) {
        const angle = (i / BAR_COUNT) * Math.PI * 2 + rotation;
        const phase = i * 0.18;

        const w1 = Math.sin(t * speed + phase);
        const w2 = Math.sin(t * speed * 1.7 + phase * 1.3 + 1.1) * 0.55;
        const w3 = Math.sin(t * speed * 0.55 + phase * 0.6 + 2.3) * 0.32;
        const raw = (w1 + w2 + w3) / 1.87;
        const norm = (raw + 1) / 2;

        const peak = easeOutCubic(norm);
        const length = innerRadius + peak * maxBarLength * amp;

        const thicknessBase = speaking ? 1.6 : 1.1;
        const thickness = thicknessBase + peak * (speaking ? 0.9 : 0.3);

        const x1 = cx + Math.cos(angle) * ringRadius;
        const y1 = cy + Math.sin(angle) * ringRadius;
        const x2 = cx + Math.cos(angle) * (ringRadius + length);
        const y2 = cy + Math.sin(angle) * (ringRadius + length);

        const fadeBase = speaking ? 0.42 : 0.18;
        const fadePeak = speaking ? 0.55 : 0.18;
        const alpha = fadeBase + norm * fadePeak;

        ctx.beginPath();
        ctx.strokeStyle = rgbaFromColor(color, alpha);
        ctx.lineWidth = thickness;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (speaking && norm > 0.6) {
          const tipX = x2;
          const tipY = y2;
          const tipGlow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 4);
          tipGlow.addColorStop(0, rgbaFromColor(color, 0.5 * norm));
          tipGlow.addColorStop(1, rgbaFromColor(color, 0));
          ctx.fillStyle = tipGlow;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!prefersReduced) {
        animId = requestAnimationFrame(animate);
      } else {
        ctx.globalCompositeOperation = "source-over";
      }
    };

    animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
      ctx.globalCompositeOperation = "source-over";
    };
  }, [size, color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        display: "block",
        borderRadius: "100%",
        ...style,
      }}
    />
  );
}

export default VoiceOrb;
