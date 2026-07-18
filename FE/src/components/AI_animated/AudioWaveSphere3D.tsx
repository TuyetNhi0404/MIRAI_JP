import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

const PARTICLE_COUNT = 720;
const FIELD_RADIUS = 0.82;
const ORBIT_RING_COUNT = 3;
const ORBIT_DOT_COUNT = 28;

function fibonacciSphere(n: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius));
  }
  return pts;
}

function buildFieldGeometry() {
  const pts = fibonacciSphere(PARTICLE_COUNT, FIELD_RADIUS);
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const seeds = new Float32Array(PARTICLE_COUNT);
  const tints = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const p = pts[i];
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    seeds[i] = i * 0.137;
    tints[i] = Math.sin(i * 12.9898 + 78.233) * 0.5 + 0.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aTint", new THREE.BufferAttribute(tints, 1));
  return geo;
}

function buildOrbitGeometry() {
  const total = ORBIT_RING_COUNT * ORBIT_DOT_COUNT;
  const positions = new Float32Array(total * 3);
  const seeds = new Float32Array(total);
  const ringIndex = new Float32Array(total);

  const ringAxes: THREE.Vector3[] = [
    new THREE.Vector3(0, 1, 0).normalize(),
    new THREE.Vector3(0.7, 0, 0.7).normalize(),
    new THREE.Vector3(0.2, 0.85, -0.45).normalize(),
  ];
  const ringRadii = [1.05, 1.18, 0.95];

  for (let r = 0; r < ORBIT_RING_COUNT; r += 1) {
    const axis = ringAxes[r];
    const radius = ringRadii[r];
    const baseAngle = (r * Math.PI) / 3;
    const tangent = new THREE.Vector3(1, 0, 0);
    if (Math.abs(axis.x) > 0.5) tangent.set(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(axis, tangent).normalize();
    const up = new THREE.Vector3().crossVectors(right, axis).normalize();

    for (let d = 0; d < ORBIT_DOT_COUNT; d += 1) {
      const idx = r * ORBIT_DOT_COUNT + d;
      const angle = (d / ORBIT_DOT_COUNT) * Math.PI * 2 + baseAngle;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const pos = new THREE.Vector3()
        .copy(axis)
        .multiplyScalar(0)
        .addScaledVector(right, x)
        .addScaledVector(up, y);
      positions[idx * 3] = pos.x;
      positions[idx * 3 + 1] = pos.y;
      positions[idx * 3 + 2] = pos.z;
      seeds[idx] = r * 0.4 + d * 0.137;
      ringIndex[idx] = r;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aRing", new THREE.BufferAttribute(ringIndex, 1));
  return geo;
}

function buildFieldMaterial(tipColor: THREE.Color, midColor: THREE.Color, blending: THREE.Blending) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending,
    uniforms: {
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uSpeak: { value: 0 },
      uTip: { value: tipColor },
      uMid: { value: midColor },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aTint;
      uniform float uTime;
      uniform float uAudio;
      uniform float uSpeak;
      varying float vFrontness;
      varying float vTint;
      varying float vGlow;

      void main() {
        float wave = 0.5 + 0.5 * sin(uTime * 1.6 + aSeed * 6.2831);
        float settle = 0.5 + 0.5 * sin(uTime * 0.6 + aSeed * 3.1);
        float pulse = uAudio * wave + uAudio * 0.4 * settle;
        vGlow = pulse;
        float worldSize = mix(0.012, 0.026, uAudio) + uSpeak * 0.005 + pulse * 0.012;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 toCam = normalize(cameraPosition - worldPos.xyz);
        vFrontness = dot(normalize(position), toCam);
        vTint = aTint;
        vec4 mvPos = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = worldSize * 290.0 / -mvPos.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vFrontness;
      varying float vTint;
      varying float vGlow;
      uniform vec3 uTip;
      uniform vec3 uMid;
      uniform float uAudio;
      uniform float uSpeak;

      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c) * 2.0;
        if (d > 1.0) discard;
        float core = pow(1.0 - d, 1.6);

        float frontMix = clamp(vFrontness, -1.0, 1.0) * 0.5 + 0.5;
        float depthShade = mix(0.25, 1.0, frontMix);
        vec3 col = mix(uMid, uTip, 0.4 + vTint * 0.6);
        float activity = mix(0.85, 1.2, uAudio) * mix(0.9, 1.1, uSpeak);
        col = col * depthShade * activity;
        col += uTip * vGlow * 0.35;

        float alpha = core * mix(0.55, 1.0, frontMix);
        alpha *= mix(0.8, 1.0, uSpeak);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function buildOrbitMaterial(tipColor: THREE.Color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uSpeak: { value: 0 },
      uColor: { value: tipColor },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aRing;
      uniform float uTime;
      uniform float uAudio;
      uniform float uSpeak;
      varying float vGlow;
      varying float vRing;

      void main() {
        vRing = aRing;
        float wave = 0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 6.2831);
        vGlow = uAudio * wave + uSpeak * 0.4;
        float worldSize = mix(0.010, 0.022, uAudio) + uSpeak * 0.004 + vGlow * 0.010;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec4 mvPos = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = worldSize * 290.0 / -mvPos.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vGlow;
      varying float vRing;
      uniform vec3 uColor;
      uniform float uAudio;
      uniform float uSpeak;

      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c) * 2.0;
        if (d > 1.0) discard;
        float core = pow(1.0 - d, 1.4);
        float ringFade = 0.7 + vRing * 0.15;
        vec3 col = uColor * ringFade * (1.0 + vGlow * 0.5);
        float alpha = core * mix(0.6, 1.0, uAudio) * mix(0.85, 1.0, uSpeak);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function buildCoreMaterial(tipColor: THREE.Color, midColor: THREE.Color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uSpeak: { value: 0 },
      uCore: { value: midColor.clone().lerp(new THREE.Color("#FFFFFF"), 0.5) },
      uEdge: { value: tipColor },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform vec3 uCore;
      uniform vec3 uEdge;
      uniform float uTime;
      uniform float uAudio;
      uniform float uSpeak;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c) * 2.0;
        float radial = pow(1.0 - smoothstep(0.0, 1.0, d), 2.4);
        vec3 col = mix(uCore, uEdge, pow(d, 1.4));
        float intensity = 0.7 + uSpeak * 0.25 + uAudio * 0.2;
        gl_FragColor = vec4(col, radial * intensity);
      }
    `,
  });
}

function buildHaloMaterial(haloColor: THREE.Color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uColor: { value: haloColor.clone().lerp(new THREE.Color("#FFFFFF"), 0.6) },
      uSpeak: { value: 0 },
      uAudio: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uSpeak;
      uniform float uAudio;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c) * 2.0;
        float core = pow(1.0 - smoothstep(0.0, 1.0, d), 2.6);
        float intensity = 0.22 + uSpeak * 0.22 + uAudio * 0.18;
        gl_FragColor = vec4(uColor, core * intensity);
      }
    `,
  });
}

function AudioOrb({
  isSpeaking,
  isResponding,
  audioLevel,
  tipColor,
  midColor,
  haloColor,
  tone,
}: {
  isSpeaking: boolean;
  isResponding: boolean;
  audioLevel: number;
  tipColor: THREE.Color;
  midColor: THREE.Color;
  haloColor: THREE.Color;
  tone: "light" | "dark";
}) {
  const orbRef = useRef<THREE.Group>(null);
  const fieldGroupRef = useRef<THREE.Group>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const breathingMounted = useRef(false);

  const fieldGeo = useMemo(() => buildFieldGeometry(), []);
  const orbitGeo = useMemo(() => buildOrbitGeometry(), []);
  const blending = tone === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending;
  const fieldMat = useMemo(() => buildFieldMaterial(tipColor, midColor, blending), [tipColor, midColor, blending]);
  const orbitMat = useMemo(() => buildOrbitMaterial(tipColor), [tipColor]);
  const coreMat = useMemo(() => buildCoreMaterial(tipColor, midColor), [tipColor, midColor]);
  const haloMat = useMemo(() => buildHaloMaterial(haloColor), [haloColor]);

  useEffect(() => {
    return () => {
      fieldGeo.dispose();
      orbitGeo.dispose();
      fieldMat.dispose();
      orbitMat.dispose();
      coreMat.dispose();
      haloMat.dispose();
    };
  }, [fieldGeo, orbitGeo, fieldMat, orbitMat, coreMat, haloMat]);

  useGSAP(
    () => {
      const orbT = orbRef.current;
      const fieldT = fieldGroupRef.current;
      const orbitT = orbitGroupRef.current;
      if (!orbT || !fieldT || !orbitT) return;

      gsap.fromTo(
        orbT.scale,
        { x: 0.6, y: 0.6, z: 0.6 },
        { x: 1, y: 1, z: 1, duration: 1.4, ease: "elastic.out(1, 0.55)" },
      );

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(fieldT.rotation, { y: Math.PI * 2, duration: 60, repeat: -1, ease: "none" });
        gsap.to(fieldT.rotation, { x: Math.PI * 2, duration: 95, repeat: -1, ease: "none" });
        gsap.to(orbitT.rotation, { y: Math.PI * 2, duration: 28, repeat: -1, ease: "none" });
        gsap.to(orbitT.rotation, { x: -Math.PI * 2, duration: 44, repeat: -1, ease: "none" });
        gsap.to(orbitT.rotation, { z: Math.PI * 2, duration: 70, repeat: -1, ease: "none" });
      });
      return () => mm.revert();
    },
    [],
  );

  const isActive = isSpeaking || isResponding;

  useEffect(() => {
    const orbT = orbRef.current;
    if (!orbT) return;
    if (!breathingMounted.current) {
      breathingMounted.current = true;
      return;
    }

    gsap.killTweensOf(orbT.scale);

    if (isActive) {
      gsap.to(orbT.scale, {
        x: 1.06,
        y: 1.06,
        z: 1.06,
        duration: 1.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    } else {
      gsap.to(orbT.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.6,
        ease: "power2.out",
      });
    }

    return () => {
      gsap.killTweensOf(orbT.scale);
    };
  }, [isActive]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const target = isSpeaking ? Math.max(0.18, Math.min(0.9, audioLevel)) : 0.1;

    const f = fieldMat.uniforms;
    f.uTime.value = t;
    f.uAudio.value += (target - f.uAudio.value) * 0.12;
    f.uSpeak.value += ((isSpeaking ? 1 : 0) - f.uSpeak.value) * 0.06;

    orbitMat.uniforms.uTime.value = t;
    orbitMat.uniforms.uAudio.value = f.uAudio.value;
    orbitMat.uniforms.uSpeak.value = f.uSpeak.value;

    coreMat.uniforms.uAudio.value = f.uAudio.value;
    coreMat.uniforms.uSpeak.value = f.uSpeak.value;

    haloMat.uniforms.uAudio.value = f.uAudio.value;
    haloMat.uniforms.uSpeak.value = f.uSpeak.value;

    if (coreRef.current) {
      const breath = 1 + Math.sin(t * 0.9) * 0.02 + f.uAudio.value * 0.18;
      coreRef.current.scale.setScalar(breath);
    }
    if (haloRef.current) {
      const breath = 1 + Math.sin(t * 0.7) * 0.018 + f.uAudio.value * 0.07;
      haloRef.current.scale.setScalar(breath);
    }
  });

  return (
    <group ref={orbRef}>
      <mesh ref={haloRef} material={haloMat} renderOrder={-3}>
        <planeGeometry args={[2.0, 2.0]} />
      </mesh>
      <mesh ref={coreRef} material={coreMat} renderOrder={-2}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>
      <group ref={orbitGroupRef}>
        <points geometry={orbitGeo} material={orbitMat} renderOrder={-1} />
      </group>
      <group ref={fieldGroupRef}>
        <points geometry={fieldGeo} material={fieldMat} renderOrder={1} />
      </group>
    </group>
  );
}

export interface AudioWaveSphere3DProps {
  isSpeaking: boolean;
  isResponding?: boolean;
  audioLevel?: number;
  size?: number;
  colorTop?: string;
  colorMid?: string;
  colorBottom?: string;
  tone?: "light" | "dark";
}

export default function AudioWaveSphere3D({
  isSpeaking,
  isResponding = false,
  audioLevel = 0,
  size = 240,
  colorTop = "#FFD0D0",
  colorMid = "#E5484D",
  colorBottom = "#B90000",
  tone = "light",
}: AudioWaveSphere3DProps) {
  const tipColor = useMemo(() => new THREE.Color(colorBottom), [colorBottom]);
  const midColor = useMemo(() => new THREE.Color(colorMid), [colorMid]);
  const haloColor = useMemo(() => new THREE.Color(colorTop), [colorTop]);

  return (
    <Canvas
      style={{ width: size, height: size, display: "block" }}
      camera={{ position: [0, 0, 2.4], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <AudioOrb
        isSpeaking={isSpeaking}
        isResponding={isResponding}
        audioLevel={audioLevel}
        tipColor={tipColor}
        midColor={midColor}
        haloColor={haloColor}
        tone={tone}
      />
    </Canvas>
  );
}
