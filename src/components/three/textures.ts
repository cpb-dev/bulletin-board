"use client";

import * as THREE from "three";
import { wrapLines } from "@/lib/board-geometry";

/** Tiny deterministic PRNG so textures look identical every render. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Three-step gradient map that gives materials the cel/toon look. */
export function makeToonGradient(): THREE.DataTexture {
  const data = new Uint8Array([90, 160, 255, 255]);
  const texture = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Speckled cork/linen surface for the board. */
export function makeCorkTexture(
  surface: string,
  speckle: string
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, size, size);
  const rand = mulberry32(42);
  ctx.fillStyle = speckle;
  for (let i = 0; i < 420; i++) {
    const r = 0.8 + rand() * 2.2;
    ctx.globalAlpha = 0.25 + rand() * 0.4;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function handwritingFont(px: number): string {
  if (typeof window === "undefined") return `${px}px cursive`;
  const family = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-hand")
    .trim();
  return `${px}px ${family || "cursive"}`;
}

export interface NoteTextureOptions {
  text: string;
  bg: string;
  ink: string;
  /** Transparent background strip (used for photo captions). */
  transparent?: boolean;
  /** Little "posted by · date" stamp drawn at the foot of the note. */
  footer?: string;
  width?: number;
  height?: number;
}

/**
 * Draw a sticky note (or caption strip) onto a canvas texture.
 * Auto-shrinks the handwriting until the text fits.
 */
export function drawNoteTexture(
  options: NoteTextureOptions
): THREE.CanvasTexture {
  const w = options.width ?? 512;
  const h = options.height ?? 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  if (!options.transparent) {
    // Paper with slightly irregular hand-cut edges.
    ctx.fillStyle = options.bg;
    roundRect(ctx, 6, 6, w - 12, h - 12, 18);
    ctx.fill();
    // A faint top strip where the paper catches the light.
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    roundRect(ctx, 6, 6, w - 12, 26, 12);
    ctx.fill();
  }

  const pad = options.transparent ? 8 : 44;
  // Reserve a strip at the foot for the "posted by" stamp.
  const footerH = options.footer && !options.transparent ? 58 : 0;
  const maxWidth = w - pad * 2;
  const areaTop = pad;
  const areaBottom = h - pad - footerH;
  const maxHeight = areaBottom - areaTop;
  ctx.fillStyle = options.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = options.text.trim() || "♡";
  let fontSize = options.transparent ? h - 16 : 88;
  let lines: string[] = [text];
  while (fontSize > 22) {
    ctx.font = handwritingFont(fontSize);
    lines = wrapLines(text, maxWidth, (s) => ctx.measureText(s).width);
    const lineHeight = fontSize * 1.18;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length * lineHeight <= maxHeight && widest <= maxWidth) break;
    fontSize -= 6;
  }

  const lineHeight = fontSize * 1.18;
  const centerY = (areaTop + areaBottom) / 2;
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, startY + i * lineHeight, maxWidth);
  });

  if (footerH > 0) {
    // hand-drawn divider + small stamp
    ctx.strokeStyle = withAlpha(options.ink, 0.25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, areaBottom + 10);
    ctx.lineTo(w - pad, areaBottom + 10);
    ctx.stroke();
    ctx.fillStyle = withAlpha(options.ink, 0.7);
    ctx.font = handwritingFont(30);
    ctx.fillText(options.footer!, w / 2, h - pad - footerH / 2 + 14, maxWidth);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** "#rrggbb" + alpha -> "rgba(r,g,b,a)" for translucent stamp ink. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
