import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import type { DayPhase } from "@/lib/day-cycle";

/**
 * The Great Hall's canvas textures (BB-38). Block-out quality: they make
 * the scene read now, and each gets its own detailing pass later.
 */

/** Coursed sandstone blocks: one tile (2 m square in use), repeating. */
export function makeStoneTexture(): THREE.CanvasTexture {
  const px = 512;
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const ctx = c.getContext("2d")!;
  const r = mulberry32(91);
  ctx.fillStyle = "#5c4c3a";
  ctx.fillRect(0, 0, px, px);
  const rows = 6;
  const rh = px / rows;
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 ? 0.5 : 0;
    const blocks = 3;
    const bw = px / blocks;
    for (let b = -1; b <= blocks; b++) {
      const x = (b + offset) * bw;
      const tone = 150 + r() * 40;
      ctx.fillStyle = `rgb(${tone + 18}, ${tone}, ${tone - 30})`;
      ctx.fillRect(x + 3, row * rh + 3, bw - 6, rh - 6);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Worn flagstones, irregular slabs. One tile, repeating. */
export function makeFlagstoneTexture(): THREE.CanvasTexture {
  const px = 512;
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const ctx = c.getContext("2d")!;
  const r = mulberry32(17);
  ctx.fillStyle = "#3a332b";
  ctx.fillRect(0, 0, px, px);
  const n = 4;
  const s = px / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const tone = 96 + r() * 34;
      ctx.fillStyle = `rgb(${tone + 8}, ${tone}, ${tone - 10})`;
      ctx.fillRect(i * s + 4, j * s + 4, s - 8, s - 8);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * The enchanted ceiling's sky for a part of the day: a winter sky by day,
 * a sunset in the evening, stars at night.
 */
export function makeCeilingSky(phase: DayPhase): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const stops: Record<DayPhase, [string, string]> = {
    day: ["#8fa6c2", "#dfe6ee"],
    evening: ["#3a3870", "#e59468"],
    night: ["#070b20", "#1b2852"],
  };
  // The far end of the hall (top of the canvas) is the deep end of the sky.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, stops[phase][0]);
  g.addColorStop(1, stops[phase][1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = mulberry32(phase.length * 7);
  if (phase === "night") {
    for (let i = 0; i < 700; i++) {
      const a = 0.4 + r() * 0.6;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      const s = r() < 0.06 ? 2.6 : 1.3;
      ctx.fillRect(r() * w, r() * h, s, s);
    }
  } else {
    // Soft winter cloud: overlapping radial puffs.
    for (let i = 0; i < 40; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 60 + r() * 120;
      const puff = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const tint = phase === "evening" ? "255,190,170" : "255,255,255";
      puff.addColorStop(0, `rgba(${tint},0.32)`);
      puff.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = puff;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A soft round glow, white at the centre fading to nothing. */
export function makeGlowTexture(): THREE.CanvasTexture {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

/**
 * A banner's face: a deep colour field, a gold border, and a simple
 * Christmas emblem of our own in gold.
 */
export function makeBannerTexture(colour: string, emblem: "holly" | "star" | "snowflake" | "bell"): THREE.CanvasTexture {
  const w = 256;
  const h = 896;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#d9b45a";
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.fillStyle = "#d9b45a";
  ctx.strokeStyle = "#d9b45a";
  const cx = w / 2;
  const cy = h * 0.38;
  const s = w * 0.3;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  if (emblem === "star") {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? s * 0.45 : s;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  } else if (emblem === "snowflake") {
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
      ctx.stroke();
    }
  } else if (emblem === "bell") {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.8, cy + s * 0.6);
    ctx.quadraticCurveTo(cx - s * 0.6, cy - s, cx, cy - s);
    ctx.quadraticCurveTo(cx + s * 0.6, cy - s, cx + s * 0.8, cy + s * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.75, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sx * s * 0.45, cy, s * 0.55, s * 0.24, sx * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#c8323a";
    for (const [dx, dy] of [[-0.12, 0.14], [0.12, 0.14], [0, -0.04]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s * 2, cy + dy * s * 2, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
