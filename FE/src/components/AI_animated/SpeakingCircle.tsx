import { useRef, useEffect, type CSSProperties } from "react";

const BRAND_RGB = "185, 0, 0";
const FORMATION_DURATION = 3.6;

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

interface Particle {
  bx: number;
  by: number;
  phase: number;
  rx: number;
  ry: number;
}

export interface SpeakingCircleProps {
  /** True when mic detects voice (stream) or user is actively recording */
  isSpeaking: boolean;
  size?: number;
  style?: CSSProperties;
  /** Primary accent — defaults to Mirai brand red */
  color?: string;
}

function SpeakingCircle({
  isSpeaking,
  size = 200,
  style,
  color = `rgb(${BRAND_RGB})`,
}: SpeakingCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpeakingRef = useRef(isSpeaking);
  const particlesRef = useRef<Particle[]>([]);
  const formationStartRef = useRef<number | null>(null);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    const N = 64;
    const half = N / 2;
    const ps: Particle[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = (i - half) / half;
        const y = (j - half) / half;
        if (x * x + y * y <= 0.96) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * 0.85;
          ps.push({
            bx: x,
            by: y,
            phase: (i * 3 + j * 7) * 0.1,
            rx: Math.cos(angle) * r,
            ry: Math.sin(angle) * r,
          });
        }
      }
    }
    particlesRef.current = ps;
    formationStartRef.current = performance.now();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalCompositeOperation = "lighter";

    const particles = particlesRef.current;
    const cx = size / 2;
    const cy = size / 2;
    const R = (size / 2) * 0.92;
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

    let animId: number;
    const animate = (now: number) => {
      const speaking = isSpeakingRef.current;
      const t = now * 0.001;

      const start = formationStartRef.current ?? now;
      const formationRaw = Math.min(
        1,
        (now - start) / 1000 / FORMATION_DURATION,
      );
      const formation = easeOutCubic(formationRaw);

      ctx.clearRect(0, 0, size, size);

      // Soft radial backdrop glow
      const breathScale = 1 + Math.sin(t * 0.45) * 0.018;
      const backdropR = R * 1.05 * breathScale;
      const backdrop = ctx.createRadialGradient(cx, cy, 0, cx, cy, backdropR);
      backdrop.addColorStop(0, rgbaFromColor(color, speaking ? 0.18 : 0.08));
      backdrop.addColorStop(0.55, rgbaFromColor(color, speaking ? 0.06 : 0.025));
      backdrop.addColorStop(1, rgbaFromColor(color, 0));
      ctx.fillStyle = backdrop;
      ctx.beginPath();
      ctx.arc(cx, cy, backdropR, 0, Math.PI * 2);
      ctx.fill();

      const idleBreath = 1 + Math.sin(t * 0.45) * 0.012;
      const voicePulse = speaking ? Math.sin(t * 3.2) * 0.055 : 0;
      const voiceBreath = speaking ? Math.sin(t * 1.6) * 0.025 : 0;
      const scale = idleBreath + voicePulse + voiceBreath;
      const radius = R * scale;

      const spd = speaking ? 2.5 : 1.5;
      const amp = speaking ? 0.055 + Math.sin(t * 1.8) * 0.012 : 0.032;

      for (const p of particles) {
        const px0 = p.bx + (p.rx - p.bx) * (1 - formation);
        const py0 = p.by + (p.ry - p.by) * (1 - formation);

        const dist = Math.sqrt(px0 * px0 + py0 * py0);
        const edge = Math.max(0, 1 - dist * 1.08);

        const w1 = Math.sin(px0 * 1.8 + py0 * 0.75 + t * spd + p.phase * 0.25);
        const w2 =
          Math.sin(px0 * 0.6 - py0 * 1.1 + t * spd * 0.62 + p.phase * 0.18) *
          0.38;
        const w3 =
          Math.sin(px0 * 0.35 + py0 * 0.42 + t * spd * 1.55 + p.phase * 0.08) *
          0.18;
        const h = (w1 + w2 + w3) * amp * edge * formation;

        const dh = Math.cos(px0 * 1.3 + py0 * 0.55 + t * spd + p.phase * 0.25);
        const gx = dh * 1.3 * amp * edge * formation * 0.55;
        const gy = dh * 0.55 * amp * edge * formation * 0.55;

        const px = cx + (px0 + gx + h * 0.3) * radius;
        const py = cy + (py0 + gy + h * 0.22) * radius;

        const hn = Math.max(0, Math.min(1, h / (amp * 1.56 + 0.001) + 0.5));

        const dotSize =
          (0.42 + hn * 2.6 * (speaking ? 1.18 : 1.0)) *
          (0.38 + formation * 0.62);

        const alpha =
          (0.12 + hn * 0.78) *
          (0.3 + formation * 0.7) *
          (speaking ? 1.0 : 0.82);

        const r = Math.max(0.32, dotSize);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 1.8);
        grad.addColorStop(0, rgbaFromColor(color, alpha));
        grad.addColorStop(0.4, rgbaFromColor(color, alpha * 0.55));
        grad.addColorStop(1, rgbaFromColor(color, 0));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      if (formation > 0.85) {
        const ringGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius);
        ringGrad.addColorStop(0, rgbaFromColor(color, 0));
        ringGrad.addColorStop(1, rgbaFromColor(color, speaking ? 0.18 : 0.1));
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = speaking ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(animate);
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

export default SpeakingCircle;
