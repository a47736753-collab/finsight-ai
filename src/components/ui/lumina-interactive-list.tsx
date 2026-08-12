/**
 * Lumina — Interactive List
 *
 * A full-screen interactive list/slider backed by a real-time WebGL shader.
 * Each list item drives a transition between five effects:
 *   glass, frost, ripple, plasma, timeshift
 * every effect ships with intensity presets that are applied live.
 *
 * GSAP + Three.js are imported from the project's npm packages.
 *
 * Usage (shadcn /components/ui):
 *   import { Component as InteractiveList } from "@/components/ui/lumina-interactive-list";
 *   <InteractiveList className="h-[100svh]" />
 */
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import gsap from "gsap";
import * as THREE from "three";

/* ============================================================================
 * Configuration
 * ========================================================================== */

export interface LuminaSlide {
  index: string;
  title: string;
  subtitle: string;
  description: string;
  /** [deep, mid, bright] gradient stops */
  palette: [string, string, string];
  accent: string;
}

const SLIDER_CONFIG: any = {
  settings: {
    transitionDuration: 2.5,
    autoSlideSpeed: 5000,
    currentEffect: "glass",
    currentEffectPreset: "Default",
    globalIntensity: 1.0,
    speedMultiplier: 1.0,
    distortionStrength: 1.0,
    colorEnhancement: 1.0,
    glassRefractionStrength: 1.0,
    glassChromaticAberration: 1.0,
    glassBubbleClarity: 1.0,
    glassEdgeGlow: 1.0,
    glassLiquidFlow: 1.0,
    frostIntensity: 1.5,
    frostCrystalSize: 1.0,
    frostIceCoverage: 1.0,
    frostTemperature: 1.0,
    frostTexture: 1.0,
    rippleFrequency: 25.0,
    rippleAmplitude: 0.08,
    rippleWaveSpeed: 1.0,
    rippleRippleCount: 1.0,
    rippleDecay: 1.0,
    plasmaIntensity: 1.2,
    plasmaSpeed: 0.8,
    plasmaEnergyIntensity: 0.4,
    plasmaContrastBoost: 0.3,
    plasmaTurbulence: 1.0,
    timeshiftDistortion: 1.6,
    timeshiftBlur: 1.5,
    timeshiftFlow: 1.4,
    timeshiftChromatic: 1.5,
    timeshiftTurbulence: 1.4,
  },
  effectPresets: {
    glass: {
      Subtle: {
        glassRefractionStrength: 0.6,
        glassChromaticAberration: 0.5,
        glassBubbleClarity: 1.3,
        glassEdgeGlow: 0.7,
        glassLiquidFlow: 0.8,
      },
      Default: {
        glassRefractionStrength: 1.0,
        glassChromaticAberration: 1.0,
        glassBubbleClarity: 1.0,
        glassEdgeGlow: 1.0,
        glassLiquidFlow: 1.0,
      },
      Crystal: {
        glassRefractionStrength: 1.5,
        glassChromaticAberration: 1.8,
        glassBubbleClarity: 0.7,
        glassEdgeGlow: 1.4,
        glassLiquidFlow: 0.5,
      },
      Liquid: {
        glassRefractionStrength: 0.8,
        glassChromaticAberration: 0.4,
        glassBubbleClarity: 1.2,
        glassEdgeGlow: 0.8,
        glassLiquidFlow: 1.8,
      },
    },
    frost: {
      Light: {
        frostIntensity: 0.8,
        frostCrystalSize: 1.3,
        frostIceCoverage: 0.6,
        frostTemperature: 0.7,
        frostTexture: 0.8,
      },
      Default: {
        frostIntensity: 1.5,
        frostCrystalSize: 1.0,
        frostIceCoverage: 1.0,
        frostTemperature: 1.0,
        frostTexture: 1.0,
      },
      Heavy: {
        frostIntensity: 2.2,
        frostCrystalSize: 0.7,
        frostIceCoverage: 1.4,
        frostTemperature: 1.3,
        frostTexture: 1.2,
      },
      Arctic: {
        frostIntensity: 3.0,
        frostCrystalSize: 0.5,
        frostIceCoverage: 1.8,
        frostTemperature: 1.6,
        frostTexture: 1.5,
      },
    },
    ripple: {
      Gentle: {
        rippleFrequency: 15.0,
        rippleAmplitude: 0.04,
        rippleWaveSpeed: 0.7,
        rippleRippleCount: 1.0,
        rippleDecay: 1.4,
      },
      Default: {
        rippleFrequency: 25.0,
        rippleAmplitude: 0.08,
        rippleWaveSpeed: 1.0,
        rippleRippleCount: 1.0,
        rippleDecay: 1.0,
      },
      Intense: {
        rippleFrequency: 42.0,
        rippleAmplitude: 0.14,
        rippleWaveSpeed: 1.5,
        rippleRippleCount: 2.0,
        rippleDecay: 0.6,
      },
    },
    plasma: {
      Nebula: {
        plasmaIntensity: 0.9,
        plasmaSpeed: 0.5,
        plasmaEnergyIntensity: 0.7,
        plasmaContrastBoost: 0.5,
        plasmaTurbulence: 1.2,
      },
      Default: {
        plasmaIntensity: 1.2,
        plasmaSpeed: 0.8,
        plasmaEnergyIntensity: 0.4,
        plasmaContrastBoost: 0.3,
        plasmaTurbulence: 1.0,
      },
      Inferno: {
        plasmaIntensity: 1.6,
        plasmaSpeed: 1.2,
        plasmaEnergyIntensity: 0.2,
        plasmaContrastBoost: 0.7,
        plasmaTurbulence: 1.4,
      },
    },
    timeshift: {
      Retro: {
        timeshiftDistortion: 1.0,
        timeshiftBlur: 2.2,
        timeshiftFlow: 1.0,
        timeshiftChromatic: 1.8,
        timeshiftTurbulence: 0.8,
      },
      Default: {
        timeshiftDistortion: 1.6,
        timeshiftBlur: 1.5,
        timeshiftFlow: 1.4,
        timeshiftChromatic: 1.5,
        timeshiftTurbulence: 1.4,
      },
      Neon: {
        timeshiftDistortion: 2.4,
        timeshiftBlur: 0.9,
        timeshiftFlow: 2.0,
        timeshiftChromatic: 2.2,
        timeshiftTurbulence: 1.8,
      },
    },
  },
};

const EFFECT_ORDER: string[] = Object.keys(SLIDER_CONFIG.effectPresets);
const EFFECT_INDEX: Record<string, number> = {
  glass: 0,
  frost: 1,
  ripple: 2,
  plasma: 3,
  timeshift: 4,
};

/** Maps SLIDER_CONFIG.settings keys to fragment-shader uniform names. */
const SETTING_TO_UNIFORM: Record<string, string> = {
  globalIntensity: "uGlobalIntensity",
  speedMultiplier: "uSpeed",
  distortionStrength: "uDistortion",
  colorEnhancement: "uColorEnhance",
  glassRefractionStrength: "uGlassRefraction",
  glassChromaticAberration: "uGlassChromatic",
  glassBubbleClarity: "uGlassBubbles",
  glassEdgeGlow: "uGlassEdge",
  glassLiquidFlow: "uGlassFlow",
  frostIntensity: "uFrostIntensity",
  frostCrystalSize: "uFrostCrystal",
  frostIceCoverage: "uFrostCoverage",
  frostTemperature: "uFrostTemp",
  frostTexture: "uFrostTexture",
  rippleFrequency: "uRippleFrequency",
  rippleAmplitude: "uRippleAmplitude",
  rippleWaveSpeed: "uRippleSpeed",
  rippleRippleCount: "uRippleCount",
  rippleDecay: "uRippleDecay",
  plasmaIntensity: "uPlasmaIntensity",
  plasmaSpeed: "uPlasmaSpeed",
  plasmaEnergyIntensity: "uPlasmaEnergy",
  plasmaContrastBoost: "uPlasmaContrast",
  plasmaTurbulence: "uPlasmaTurbulence",
  timeshiftDistortion: "uTSDistortion",
  timeshiftBlur: "uTSBlur",
  timeshiftFlow: "uTSFlow",
  timeshiftChromatic: "uTSChromatic",
  timeshiftTurbulence: "uTSTurbulence",
};

const LUMINA_SLIDES: LuminaSlide[] = [
  {
    index: "01",
    title: "Aurora Garden",
    subtitle: "Generative light field · 01",
    description:
      "Layered aurora gradients fold over themselves in real time — a study of color interacting with light, rendered at 60fps.",
    palette: ["#05060f", "#2b1f66", "#a34ba0"],
    accent: "#c084fc",
  },
  {
    index: "02",
    title: "Glass Meridian",
    subtitle: "Liquid refraction study · 02",
    description:
      "Refraction, chromatic aberration and suspended bubbles turn a still frame into liquid optics that drift with your cursor.",
    palette: ["#031014", "#0b3b4a", "#4fd1c5"],
    accent: "#5eead4",
  },
  {
    index: "03",
    title: "Permafrost",
    subtitle: "Ice crystal lattice · 03",
    description:
      "Voronoi ice crystals creep across the frame as temperature drives coverage and clarity, grain by grain.",
    palette: ["#0a1220", "#1e3a5f", "#a5d8ff"],
    accent: "#93c5fd",
  },
  {
    index: "04",
    title: "Ink Ripple",
    subtitle: "Sonar waveform · 04",
    description:
      "Sonar-like waves radiate from your pointer, bending the artwork as they decay into the deep.",
    palette: ["#0d0a14", "#2a1a3e", "#e06c9f"],
    accent: "#f472b6",
  },
  {
    index: "05",
    title: "Chrono Shift",
    subtitle: "Time-sliced motion · 05",
    description:
      "Time-sliced distortion with chromatic bleed — motion blur for images that never actually move.",
    palette: ["#16090d", "#4a1030", "#ffb86b"],
    accent: "#fdba74",
  },
];

export interface LuminaListProps {
  className?: string;
  slides?: LuminaSlide[];
  /** Renders the internal brand/status header. Hide when embedding under your own nav. */
  showBrand?: boolean;
  autoplay?: boolean;
}

/* ============================================================================
 * Shaders
 * ========================================================================== */

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uTexture;
uniform sampler2D uNextTexture;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uProgress;

uniform float uEffect;
uniform float uGlobalIntensity;
uniform float uSpeed;
uniform float uDistortion;
uniform float uColorEnhance;

uniform float uGlassRefraction;
uniform float uGlassChromatic;
uniform float uGlassBubbles;
uniform float uGlassEdge;
uniform float uGlassFlow;

uniform float uFrostIntensity;
uniform float uFrostCrystal;
uniform float uFrostCoverage;
uniform float uFrostTemp;
uniform float uFrostTexture;

uniform float uRippleFrequency;
uniform float uRippleAmplitude;
uniform float uRippleSpeed;
uniform float uRippleCount;
uniform float uRippleDecay;

uniform float uPlasmaIntensity;
uniform float uPlasmaSpeed;
uniform float uPlasmaEnergy;
uniform float uPlasmaContrast;
uniform float uPlasmaTurbulence;

uniform float uTSDistortion;
uniform float uTSBlur;
uniform float uTSFlow;
uniform float uTSChromatic;
uniform float uTSTurbulence;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = mat2(0.825, 0.565, -0.565, 0.825) * p * 2.03;
    a *= 0.55;
  }
  return v;
}

vec2 voronoi(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float md = 8.0;
  vec2 mg = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash21(i + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) { md = d; mg = r; }
    }
  }
  return vec2(md, length(mg));
}

vec4 applyEffect(vec2 uv, sampler2D tex) {
  float t = uTime;
  float pulse = 1.0 + sin(uProgress * 3.14159) * 0.55 * uDistortion;
  vec4 col = vec4(0.0);

  if (uEffect < 0.5) {
    // ---------------- GLASS ----------------
    vec2 d = uv - 0.5;
    float r = length(d);
    vec2 flow = vec2(
      sin(uv.y * 8.0 + t * uGlassFlow * 0.8),
      cos(uv.x * 8.0 - t * uGlassFlow * 0.6)
    ) * 0.012 * uGlassRefraction * uGlobalIntensity * pulse;
    vec2 warped = uv + flow + d * r * 0.05 * uGlassRefraction * uGlobalIntensity * pulse;

    float ca = (0.004 + r * 0.008) * uGlassChromatic * uGlobalIntensity;
    float rb = texture2D(tex, warped + vec2(ca, 0.0)).r;
    float gg = texture2D(tex, warped).g;
    float bb = texture2D(tex, warped - vec2(ca, 0.0)).b;
    vec3 rgb = vec3(rb, gg, bb);

    vec2 bp = warped * 11.0 + vec2(t * 0.05, -t * 0.04);
    float b1 = vnoise(bp);
    float b2 = vnoise(bp * 2.3 + 7.0);
    float rings = smoothstep(0.55, 0.85, b1) + smoothstep(0.6, 0.9, b2);
    rings *= 0.5 + 0.5 * sin(b1 * 6.28318 - t * 0.5);
    float bub = rings * uGlassBubbles * 0.3 * uGlobalIntensity;

    float edge = smoothstep(0.25, 1.05, r) * uGlassEdge;
    vec3 glow = mix(vec3(0.35, 0.55, 1.0), vec3(0.75, 0.3, 0.95), sin(t * 0.3) * 0.5 + 0.5);
    rgb += glow * edge * 0.3 * uGlobalIntensity;
    rgb += vec3(0.85, 0.95, 1.0) * bub * 0.22;
    col = vec4(rgb, 1.0);
  } else if (uEffect < 1.5) {
    // ---------------- FROST ----------------
    vec2 p = uv * (4.0 + uFrostCrystal * 5.0);
    p += fbm(uv * 3.0 + t * 0.015 * uSpeed) * 1.6;
    vec2 v = voronoi(p);
    float cell = 1.0 - smoothstep(0.02, 0.55, v.x);
    float crystals = cell * (0.35 + uFrostIntensity * 0.45);
    float coverage = smoothstep(0.25, 0.75, uFrostCoverage) * (0.35 + uFrostIntensity * 0.35);
    float grain = vnoise(uv * 46.0 + vec2(t * 0.03, -t * 0.02));
    vec4 base = texture2D(tex, uv + (cell - 0.5) * 0.015 * uFrostTexture);
    vec3 frostCol = vec3(0.72, 0.86, 1.0);
    float temp = clamp(uFrostTemp, 0.0, 2.0) * 0.35 + 0.2;
    float mixAmt = clamp(coverage + crystals * uFrostTexture * 0.5, 0.0, 0.98);
    vec3 rgb = mix(base.rgb, frostCol, mixAmt * temp * 1.4);
    rgb = mix(rgb, rgb * vec3(0.75, 0.9, 1.2), grain * 0.3 * uFrostTexture);
    rgb += vec3(0.6, 0.75, 1.0) * crystals * 0.12;
    col = vec4(rgb, 1.0);
  } else if (uEffect < 2.5) {
    // ---------------- RIPPLE ----------------
    vec2 asp = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    vec2 p = uv * asp;
    vec2 m = uMouse * asp;
    float dist = length(p - m);
    vec2 dir = normalize(uv - uMouse + vec2(0.0001));
    float total = 0.0;
    for (int i = 0; i < 4; i++) {
      float k = float(i);
      if (k < uRippleCount) {
        float phase = dist * uRippleFrequency - t * uRippleSpeed * 2.5 * uSpeed + k * 0.7;
        float wave = sin(phase) * uRippleAmplitude * exp(-dist * (0.9 + uRippleDecay * 1.1));
        total += wave * (0.55 + 0.45 * cos(k * 2.0));
      }
    }
    vec2 warped = uv + dir * total * uGlobalIntensity * 0.02 * pulse;
    vec4 base = texture2D(tex, warped);
    float crest = smoothstep(0.75, 1.0, sin(dist * uRippleFrequency - t * uRippleSpeed * 2.5) * 0.5 + 0.5);
    base.rgb += vec3(0.3, 0.42, 0.6) * crest * uRippleAmplitude * 2.2 * uGlobalIntensity * exp(-dist * 1.6);
    col = base;
  } else if (uEffect < 3.5) {
    // ---------------- PLASMA ----------------
    vec2 p = uv * (1.6 + uPlasmaTurbulence * 1.3);
    float tt = t * uPlasmaSpeed * uSpeed;
    float m1 = fbm(p * 2.0 + vec2(tt * 0.16, -tt * 0.11));
    float m2 = fbm(p * 3.0 + m1 * 2.6 * uPlasmaTurbulence + vec2(tt * 0.1, 0.0));
    vec3 cA = vec3(0.08, 0.02, 0.24);
    vec3 cB = vec3(0.55, 0.08, 0.68);
    vec3 cC = vec3(0.18, 0.62, 0.95);
    vec3 cD = vec3(0.95, 0.42, 0.28);
    vec3 plasma = cA + cB * cos(6.28318 * (m2 * 1.5 + vec3(0.0, 0.33, 0.67)));
    vec3 alt = cC + cD * cos(6.28318 * (m2 + vec3(0.0, 0.2, 0.4)));
    plasma = mix(plasma, alt, clamp(uPlasmaEnergy * 0.7 + 0.3, 0.0, 1.0));
    float contrast = 1.0 + uPlasmaContrast * 1.8;
    plasma = (plasma - 0.5) * contrast + 0.5;
    vec4 base = texture2D(tex, uv + (plasma.rg - 0.5) * 0.025 * uPlasmaEnergy);
    float amt = smoothstep(0.15, 0.85, m1) * uPlasmaIntensity;
    col = vec4(mix(base.rgb, plasma, clamp(amt * 0.7, 0.0, 1.0)), 1.0);
  } else {
    // ---------------- TIMESHIFT ----------------
    vec2 shift = vec2(
      sin(uv.y * 12.0 + t * uTSFlow * 2.0 * uSpeed),
      cos(uv.x * 10.0 - t * uTSFlow * 1.6 * uSpeed)
    ) * 0.011 * uTSDistortion * uGlobalIntensity * pulse;

    vec2 p1 = uv + shift;
    vec2 p2 = uv - shift * 0.6;
    vec2 p3 = uv + shift * 0.35;
    vec2 p4 = uv + shift * 1.4;
    float bl = 0.0022 * uTSBlur;

    vec3 acc = texture2D(tex, p1 + vec2(bl, 0.0)).rgb;
    acc += texture2D(tex, p2 - vec2(bl, 0.0)).rgb;
    acc += texture2D(tex, p3 + vec2(0.0, bl)).rgb;
    acc += texture2D(tex, p4 - vec2(0.0, bl)).rgb;
    acc += texture2D(tex, p1).rgb;
    vec3 rgb = acc / 5.0;

    float ca = 0.005 * uTSChromatic * uGlobalIntensity * (1.0 + uDistortion * 0.5);
    rgb.r = texture2D(tex, p1 + vec2(ca, 0.0)).r;
    rgb.b = texture2D(tex, p1 - vec2(ca, 0.0)).b;

    float turb = fbm(uv * 6.0 + vec2(t * 0.18 * uTSTurbulence, -t * 0.12 * uTSTurbulence));
    rgb *= 1.0 + (turb - 0.5) * 0.3 * uTSTurbulence;
    col = vec4(rgb, 1.0);
  }
  return col;
}

void main() {
  vec4 cur = applyEffect(vUv, uTexture);
  vec4 nxt = applyEffect(vUv, uNextTexture);
  float amt = smoothstep(0.0, 1.0, uProgress);
  vec3 rgb = mix(cur.rgb, nxt.rgb, amt);
  float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
  rgb = mix(vec3(lum), rgb, 1.0 + uColorEnhance * 0.45);
  rgb = clamp(rgb, 0.0, 1.0);
  gl_FragColor = vec4(rgb, 1.0);
}
`;

/* ============================================================================
 * Procedural slide artwork (deterministic, offline-safe)
 * ========================================================================== */

function createSlideTexture(
  slide: LuminaSlide,
  seed: number,
): THREE.CanvasTexture | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const [c0, c1, c2] = slide.palette;

  // base diagonal gradient
  const base = ctx.createLinearGradient(0, 0, 1280, 720);
  base.addColorStop(0, c0);
  base.addColorStop(0.55, c1);
  base.addColorStop(1, c2);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1280, 720);

  // large soft glow
  const gx = 700 + rnd() * 400;
  const gy = 120 + rnd() * 300;
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 640);
  glow.addColorStop(0, `${slide.accent}66`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1280, 720);

  // diagonal light beams
  ctx.save();
  ctx.translate(640, 360);
  ctx.rotate(-0.35);
  for (let i = 0; i < 5; i++) {
    const bw = 40 + rnd() * 140;
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.04})`;
    ctx.fillRect(-900, -500 + i * 220 + rnd() * 80, 1800, bw);
  }
  ctx.restore();

  // concentric rings
  ctx.strokeStyle = `${slide.accent}22`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(980, 560, 40 + i * 46 + rnd() * 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  // floating orbs
  for (let i = 0; i < 14; i++) {
    const ox = rnd() * 1280;
    const oy = rnd() * 720;
    const or_ = 6 + rnd() * 30;
    const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, or_ * 2);
    og.addColorStop(0, `rgba(255,255,255,${0.04 + rnd() * 0.1})`);
    og.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = og;
    ctx.fillRect(ox - or_ * 2, oy - or_ * 2, or_ * 4, or_ * 4);
  }

  // film grain
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 2400; i++) {
    const gs = 1 + rnd() * 2;
    ctx.fillStyle = rnd() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(rnd() * 1280, rnd() * 720, gs, gs);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/* ============================================================================
 * Imperative engine (Three.js scene + GSAP transitions + autoplay)
 * ========================================================================== */

interface EngineOptions {
  autoplay: boolean;
  progressEl: HTMLElement | null;
  onChange: (index: number) => void;
}

function createEngine(
  container: HTMLElement,
  slides: LuminaSlide[],
  opts: EngineOptions,
) {
  const settings = SLIDER_CONFIG.settings;
  const count = slides.length;

  const engine: any = {
    disposed: false,
    locked: false,
    currentIndex: 0,
    autoplayEnabled: opts.autoplay,
    mouse: { x: 0.5, y: 0.5 },
    mouseTarget: { x: 0.5, y: 0.5 },
  };

  /* ---------- renderer / scene ---------- */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(
    container.clientWidth || window.innerWidth,
    container.clientHeight || window.innerHeight,
  );
  Object.assign(renderer.domElement.style, {
    position: "absolute",
    inset: "0",
    zIndex: "0",
    width: "100%",
    height: "100%",
  });
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms: Record<string, any> = {
    uTexture: { value: null },
    uNextTexture: { value: null },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uProgress: { value: 0 },
    uEffect: { value: 0 },
    uGlobalIntensity: { value: 1 },
    uSpeed: { value: 1 },
    uDistortion: { value: 1 },
    uColorEnhance: { value: 1 },
    uGlassRefraction: { value: 1 },
    uGlassChromatic: { value: 1 },
    uGlassBubbles: { value: 1 },
    uGlassEdge: { value: 1 },
    uGlassFlow: { value: 1 },
    uFrostIntensity: { value: 1.5 },
    uFrostCrystal: { value: 1 },
    uFrostCoverage: { value: 1 },
    uFrostTemp: { value: 1 },
    uFrostTexture: { value: 1 },
    uRippleFrequency: { value: 25 },
    uRippleAmplitude: { value: 0.08 },
    uRippleSpeed: { value: 1 },
    uRippleCount: { value: 1 },
    uRippleDecay: { value: 1 },
    uPlasmaIntensity: { value: 1.2 },
    uPlasmaSpeed: { value: 0.8 },
    uPlasmaEnergy: { value: 0.4 },
    uPlasmaContrast: { value: 0.3 },
    uPlasmaTurbulence: { value: 1 },
    uTSDistortion: { value: 1.6 },
    uTSBlur: { value: 1.5 },
    uTSFlow: { value: 1.4 },
    uTSChromatic: { value: 1.5 },
    uTSTurbulence: { value: 1.4 },
  };

  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const textures = slides
    .map((slide, i) => createSlideTexture(slide, i + 7))
    .filter(Boolean) as THREE.CanvasTexture[];

  if (textures.length === 0) {
    console.error("[Lumina] No textures created");
    return engine;
  }

  uniforms.uTexture.value = textures[0];
  uniforms.uNextTexture.value = textures[1] || textures[0];
  uniforms.uResolution.value.set(
    container.clientWidth || window.innerWidth,
    container.clientHeight || window.innerHeight,
  );

  const syncUniforms = () => {
    for (const key of Object.keys(SETTING_TO_UNIFORM)) {
      const uname = SETTING_TO_UNIFORM[key];
      if (uniforms[uname]) uniforms[uname].value = settings[key];
    }
  };

  const setEffect = (effect: string, preset: string) => {
    settings.currentEffect = effect;
    settings.currentEffectPreset = preset;
    const p = SLIDER_CONFIG.effectPresets[effect]?.[preset];
    if (p) Object.assign(settings, p);
    uniforms.uEffect.value = EFFECT_INDEX[effect] ?? 0;
    syncUniforms();
  };

  /* ---------- autoplay + progress ---------- */
  let autoplayProxy = { p: 0 };
  let autoplayTween: gsap.core.Tween | null = null;
  const progressEl = opts.progressEl;

  const stopAutoplay = () => {
    if (autoplayTween) {
      autoplayTween.kill();
      autoplayTween = null;
    }
    if (progressEl) progressEl.style.transform = "scaleX(0)";
  };

  const startAutoplay = () => {
    if (!engine.autoplayEnabled || engine.disposed) return;
    stopAutoplay();
    if (progressEl) progressEl.style.transform = "scaleX(0)";
    autoplayProxy = { p: 0 };
    autoplayTween = gsap.to(autoplayProxy, {
      p: 1,
      duration: settings.autoSlideSpeed / 1000,
      ease: "none",
      onUpdate: () => {
        if (progressEl)
          progressEl.style.transform = `scaleX(${autoplayProxy.p})`;
      },
      onComplete: () => {
        autoplayTween = null;
        goTo(engine.currentIndex + 1);
      },
    });
  };

  /* ---------- transitions ---------- */
  function goTo(index: number) {
    if (engine.disposed || engine.locked) return;
    const target = ((index % count) + count) % count;
    if (target === engine.currentIndex) return;
    engine.locked = true;
    const tex = textures[target];
    uniforms.uNextTexture.value = tex;
    uniforms.uProgress.value = 0;
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      duration: settings.transitionDuration,
      ease: "power2.inOut",
      onUpdate: () => {
        uniforms.uProgress.value = proxy.p;
      },
      onComplete: () => {
        uniforms.uTexture.value = tex;
        uniforms.uProgress.value = 0;
        engine.currentIndex = target;
        engine.locked = false;
        opts.onChange(target);
        startAutoplay();
      },
    });
  }

  /* ---------- events ---------- */
  const onPointerMove = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    engine.mouseTarget.x = (e.clientX - rect.left) / rect.width;
    engine.mouseTarget.y = 1 - (e.clientY - rect.top) / rect.height;
  };
  container.addEventListener("pointermove", onPointerMove);

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    uniforms.uResolution.value.set(w, h);
  };
  window.addEventListener("resize", onResize);

  /* ---------- render loop ---------- */
  const animate = () => {
    if (engine.disposed) return;
    engine.raf = requestAnimationFrame(animate);
    uniforms.uTime.value =
      (performance.now() / 1000) * settings.speedMultiplier;
    engine.mouse.x += (engine.mouseTarget.x - engine.mouse.x) * 0.045;
    engine.mouse.y += (engine.mouseTarget.y - engine.mouse.y) * 0.045;
    uniforms.uMouse.value.set(engine.mouse.x, engine.mouse.y);
    renderer.render(scene, camera);
  };

  /* ---------- public API ---------- */
  const setAutoplay = (on: boolean) => {
    engine.autoplayEnabled = on;
    if (on) startAutoplay();
    else stopAutoplay();
  };

  const dispose = () => {
    engine.disposed = true;
    cancelAnimationFrame(engine.raf);
    stopAutoplay();
    container.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("resize", onResize);
    geometry.dispose();
    material.dispose();
    textures.forEach((t) => {
      if (t && t.dispose) t.dispose();
    });
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };

  engine.goTo = goTo;
  engine.next = () => goTo(engine.currentIndex + 1);
  engine.prev = () => goTo(engine.currentIndex - 1);
  engine.setEffect = setEffect;
  engine.setAutoplay = setAutoplay;
  engine.pause = () => {
    if (autoplayTween) autoplayTween.pause();
  };
  engine.resume = () => {
    if (autoplayTween) autoplayTween.resume();
  };
  engine.dispose = dispose;

  /* ---------- boot ---------- */
  setEffect(settings.currentEffect, settings.currentEffectPreset);
  startAutoplay();
  engine.raf = requestAnimationFrame(animate);

  return engine;
}

/* ============================================================================
 * React component
 * ========================================================================== */

export function Component({
  className,
  slides = LUMINA_SLIDES,
  showBrand = true,
  autoplay = true,
}: LuminaListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [effect, setEffectName] = useState<string>(
    SLIDER_CONFIG.settings.currentEffect,
  );
  const [preset, setPresetName] = useState<string>(
    SLIDER_CONFIG.settings.currentEffectPreset,
  );
  const [playing, setPlaying] = useState(autoplay);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) return;

    // gsap and three are imported from npm — no CDN loading needed
    try {
      engineRef.current = createEngine(container, slides, {
        autoplay,
        progressEl: progressRef.current,
        onChange: (i: number) => setActiveIndex(i),
      });
    } catch (err) {
      console.error("[Lumina] Failed to initialize engine:", err);
    }
    if (!disposed) setReady(true);

    return () => {
      disposed = true;
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (i: number) => {
    setActiveIndex(i);
    engineRef.current?.goTo(i);
  };

  const handleEffect = (e: string) => {
    setEffectName(e);
    setPresetName("Default");
    engineRef.current?.setEffect(e, "Default");
  };

  const handlePreset = (p: string) => {
    setPresetName(p);
    engineRef.current?.setEffect(effect, p);
  };

  const handlePrev = () => {
    engineRef.current?.prev();
  };

  const handleNext = () => {
    engineRef.current?.next();
  };

  const togglePlay = () => {
    const next = !playing;
    setPlaying(next);
    engineRef.current?.setAutoplay(next);
  };

  const activeSlide = slides[activeIndex] ?? slides[0];
  const presets = Object.keys(
    SLIDER_CONFIG.effectPresets[effect] ?? {},
  );
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => engineRef.current?.pause()}
      onMouseLeave={() => engineRef.current?.resume()}
      className={cn(
        "lumina-interactive-list relative h-[100svh] min-h-[540px] w-full select-none overflow-hidden bg-[#05060c] text-white",
        className,
      )}
    >
      {/* canvas injected by the engine */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(120%_95%_at_50%_0%,transparent_45%,rgba(2,4,12,0.6)_100%)]" />

      <div className="relative z-10 flex h-full flex-col">
        {showBrand && (
          <header className="flex items-center justify-between px-5 pt-5 sm:px-10 sm:pt-8 lg:px-16">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 font-display text-sm font-semibold tracking-widest backdrop-blur-sm">
                L
              </span>
              <div className="leading-none">
                <p className="font-display text-sm font-semibold tracking-[0.3em]">
                  LUMINA
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Interactive List
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60 backdrop-blur-sm sm:flex">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    ready ? "bg-emerald-400" : "animate-pulse bg-amber-400",
                  )}
                />
                {ready ? "WebGL · Live" : "Initializing"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 backdrop-blur-sm">
                {cap(effect)}
              </span>
            </div>
          </header>
        )}

        {/* main: interactive list + detail panel */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-4 px-5 sm:px-10 lg:flex-row lg:items-center lg:gap-16 lg:px-16",
            showBrand ? "pt-6" : "pt-24 sm:pt-28 lg:pt-10",
          )}
        >
          <div className="flex w-full flex-col gap-1 lg:w-1/2">
            {slides.map((s, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => handleSelect(i)}
                  className={cn(
                    "group relative flex cursor-pointer items-baseline gap-3 border-l-2 px-3 py-3 text-left transition-all duration-500 sm:gap-4 sm:py-4",
                    active
                      ? "border-white/80 bg-white/[0.07]"
                      : "border-white/10 hover:border-white/30 hover:bg-white/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-xs tracking-widest transition-colors duration-500",
                      active ? "text-white/80" : "text-white/30",
                    )}
                  >
                    {s.index}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span
                      className={cn(
                        "truncate font-display text-2xl font-medium tracking-tight transition-all duration-500 sm:text-4xl",
                        active
                          ? "text-white"
                          : "text-white/35 group-hover:text-white/70",
                      )}
                    >
                      {s.title}
                    </span>
                    <span
                      className={cn(
                        "truncate text-[10px] uppercase tracking-[0.2em] transition-colors duration-500 sm:text-xs",
                        active ? "text-white/60" : "text-white/25",
                      )}
                    >
                      {s.subtitle}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "ml-auto hidden size-2 shrink-0 rounded-full transition-all duration-500 sm:block",
                      active ? "opacity-100" : "opacity-0",
                    )}
                    style={{ backgroundColor: s.accent }}
                  />
                </button>
              );
            })}
          </div>

          {/* detail panel (desktop) */}
          <div className="hidden w-full flex-col gap-4 lg:flex lg:w-1/2">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-5"
            >
              <span className="font-display text-[7rem] leading-none text-white/[0.08]">
                {activeSlide.index}
              </span>
              <h2 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
                {activeSlide.title}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-white/55">
                {activeSlide.description}
              </p>
              <div className="flex items-center gap-3">
                {activeSlide.palette.map((c) => (
                  <span
                    key={c}
                    className="size-7 rounded-full border border-white/20"
                    style={{ backgroundColor: c }}
                  />
                ))}
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                  {cap(effect)} · {preset}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* footer: progress + effects + controls */}
        <div className="px-5 pb-5 sm:px-10 sm:pb-7 lg:px-16">
          <div className="mb-5 h-px w-full overflow-hidden bg-white/10">
            <div
              ref={progressRef}
              className="h-full w-full origin-left bg-white/70"
              style={{ transform: "scaleX(0)" }}
            />
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="font-mono text-xs tracking-[0.3em] text-white/50">
              <span className="text-white">
                {String(activeIndex + 1).padStart(2, "0")}
              </span>{" "}
              / {String(slides.length).padStart(2, "0")}
            </p>

            <div className="flex flex-col items-start gap-3 lg:items-center">
              <div className="flex flex-wrap items-center gap-2">
                {EFFECT_ORDER.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => handleEffect(e)}
                    className={cn(
                      "cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] transition-all duration-300",
                      effect === e
                        ? "border-white bg-white text-black"
                        : "border-white/15 text-white/50 hover:border-white/40 hover:text-white",
                    )}
                  >
                    {cap(e)}
                  </button>
                ))}
              </div>
              {presets.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePreset(p)}
                      className={cn(
                        "cursor-pointer rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-all duration-300",
                        preset === p
                          ? "border-white/40 bg-white/15 text-white"
                          : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/70",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={playing ? "Pause autoplay" : "Play autoplay"}
                onClick={togglePlay}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/70 transition-all duration-300 hover:border-white/40 hover:text-white"
              >
                {playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </button>
              <button
                type="button"
                aria-label="Previous exhibit"
                onClick={handlePrev}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/70 transition-all duration-300 hover:border-white/40 hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next exhibit"
                onClick={handleNext}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/70 transition-all duration-300 hover:border-white/40 hover:text-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { SLIDER_CONFIG, LUMINA_SLIDES, EFFECT_ORDER };

export default Component;
