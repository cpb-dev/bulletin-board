import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import type { Wrap } from "../../lib/layout";

/**
 * Canvas textures for the tree and presents (BB-35): a spray of fir
 * needles for the branches, and the wrapping papers. Drawn in code.
 */

function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function tex(c: HTMLCanvasElement, repeat: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/**
 * One fir branch seen flat: a twig up the middle with side shoots, and
 * hundreds of short needles fanning forward off them, dark near the twig
 * and fresher green at the tips. It narrows to the branch's tip at the
 * top of the canvas. Transparent between needles (used with alphaTest).
 */
export function makeNeedleSprayTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const { c, ctx } = canvas(w, h);
  const rand = mulberry32(47);
  const cx = w / 2;

  // The width the spray has at height y (0 at the base, h at the tip).
  const half = (y: number) => (w * 0.46) * Math.sin(Math.min(1, (1 - y / h) * 1.25) * Math.PI * 0.5 + 0.15);

  const needle = (x: number, y: number, a: number, len: number, shade: number) => {
    const g = Math.floor(70 + shade * 70);
    ctx.strokeStyle = `rgb(${Math.floor(g * 0.38)},${g},${Math.floor(g * 0.5)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  };

  // Side shoots: short twigs angled up the branch, each densely needled.
  for (let y = h * 0.97; y > h * 0.05; y -= 9) {
    for (const side of [-1, 1]) {
      const reach = half(h - y) * (0.75 + rand() * 0.25);
      const ex = cx + side * reach;
      const ey = y - reach * 0.55;
      for (let k = 0; k < 22; k++) {
        const f = k / 22;
        const px = cx + (ex - cx) * f;
        const py = y + (ey - y) * f;
        const len = 7 + rand() * 5;
        for (const s of [-1, 1]) {
          const a = Math.atan2(ey - y, ex - cx) + s * (0.8 + rand() * 0.3) - 0.25 * side;
          needle(px, py, a, len, 0.35 + f * 0.6 * rand() + 0.15);
        }
      }
    }
  }
  // The main twig, then needles all along it.
  ctx.strokeStyle = "#4a3a24";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, h);
  ctx.lineTo(cx, h * 0.04);
  ctx.stroke();
  for (let y = h; y > h * 0.03; y -= 3) {
    for (const s of [-1, 1]) needle(cx, y, -Math.PI / 2 + s * (0.7 + rand() * 0.4), 10 + rand() * 6, 0.5 + rand() * 0.5);
  }
  return tex(c, false);
}

/** Each paper: its texture, and how shiny it is. */
export interface Paper {
  map: THREE.CanvasTexture;
  metalness: number;
  roughness: number;
}

const draw: Record<Wrap, (ctx: CanvasRenderingContext2D, s: number, r: () => number) => void> = {
  plaid(ctx, s) {
    ctx.fillStyle = "#a8222b";
    ctx.fillRect(0, 0, s, s);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#1c3b26";
    for (const o of [0, s / 2]) {
      ctx.fillRect(o + s * 0.08, 0, s * 0.14, s);
      ctx.fillRect(0, o + s * 0.08, s, s * 0.14);
    }
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#e8c560";
    for (const o of [0, s / 2]) {
      ctx.fillRect(o + s * 0.34, 0, 3, s);
      ctx.fillRect(0, o + s * 0.34, s, 3);
    }
    ctx.globalAlpha = 1;
  },
  gold(ctx, s, r) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#e7c46a");
    g.addColorStop(0.5, "#c99a36");
    g.addColorStop(1, "#e9cd7c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(255,240,200,0.35)";
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.moveTo(r() * s, r() * s);
      ctx.lineTo(r() * s, r() * s);
      ctx.stroke();
    }
  },
  dots(ctx, s) {
    ctx.fillStyle = "#2b5a3a";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#f2e8d2";
    const n = 6;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        ctx.beginPath();
        ctx.arc(((x + (y % 2) * 0.5) / n) * s, ((y + 0.5) / n) * s, s * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
  },
  kraft(ctx, s, r) {
    ctx.fillStyle = "#b08a5c";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const v = 120 + r() * 70;
      ctx.strokeStyle = `rgba(${v},${v * 0.78},${v * 0.52},0.35)`;
      const x = r() * s;
      const y = r() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 8, y + (r() - 0.5) * 3);
      ctx.stroke();
    }
    // a little stamped star or two
    ctx.fillStyle = "rgba(120,30,30,0.6)";
    for (const [x, y] of [[0.25, 0.3], [0.72, 0.68]]) star(ctx, x * s, y * s, s * 0.06, s * 0.025);
  },
  snowflakes(ctx, s) {
    ctx.fillStyle = "#f3ebdc";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#b3202a";
    ctx.lineWidth = 2;
    for (const [x, y] of [[0.25, 0.25], [0.75, 0.25], [0.5, 0.6], [0.0, 0.6], [1.0, 0.6], [0.25, 0.95], [0.75, 0.95]]) {
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(x * s - Math.cos(a) * s * 0.07, y * s - Math.sin(a) * s * 0.07);
        ctx.lineTo(x * s + Math.cos(a) * s * 0.07, y * s + Math.sin(a) * s * 0.07);
        ctx.stroke();
      }
    }
  },
  candy(ctx, s) {
    ctx.fillStyle = "#f6efe4";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#c22f2f";
    for (let k = -4; k < 8; k++) {
      ctx.beginPath();
      ctx.moveTo(k * s * 0.25, 0);
      ctx.lineTo(k * s * 0.25 + s * 0.12, 0);
      ctx.lineTo(k * s * 0.25 + s * 0.12 + s, s);
      ctx.lineTo(k * s * 0.25 + s, s);
      ctx.fill();
    }
  },
  stars(ctx, s) {
    ctx.fillStyle = "#1f3566";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#e8c46a";
    for (const [x, y] of [[0.2, 0.2], [0.7, 0.3], [0.45, 0.7], [0.9, 0.85], [0.1, 0.75]]) star(ctx, x * s, y * s, s * 0.07, s * 0.03);
  },
  tartan(ctx, s) {
    ctx.fillStyle = "#1f4a33";
    ctx.fillRect(0, 0, s, s);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#1e2c55";
    ctx.fillRect(s * 0.3, 0, s * 0.25, s);
    ctx.fillRect(0, s * 0.3, s, s * 0.25);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#c22f2f";
    ctx.fillRect(s * 0.7, 0, 4, s);
    ctx.fillRect(0, s * 0.7, s, 4);
    ctx.globalAlpha = 1;
  },
  berry(ctx, s) {
    ctx.fillStyle = "#6e1622";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgba(240,228,206,0.9)";
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        ctx.beginPath();
        ctx.arc(((x + 0.5 + (y % 2) * 0.5) / 8) * s, ((y + 0.5) / 8) * s, 2, 0, Math.PI * 2);
        ctx.fill();
      }
  },
};

function star(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const rad = k % 2 ? inner : outer;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

/** A wrapping paper, ready to tile across a present. */
export function makePaper(wrap: Wrap): Paper {
  const s = 256;
  const { c, ctx } = canvas(s);
  draw[wrap](ctx, s, mulberry32(wrap.length * 31));
  const shiny = wrap === "gold";
  return { map: tex(c, true), metalness: shiny ? 0.6 : 0, roughness: shiny ? 0.35 : 0.75 };
}

/**
 * A light's glow: a hot centre falling off smoothly to nothing, with no
 * hard edge anywhere, so overlapping glows from neighbouring bulbs melt
 * into one warm haze. Used additively, in white; the bulb's colour tints.
 */
export function makeGlowTexture(): THREE.CanvasTexture {
  const s = 128;
  const { c, ctx } = canvas(s);
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - s / 2 + 0.5, y - s / 2 + 0.5) / (s / 2);
      // A bright core with a long, soft tail, reaching zero at the edge.
      const v = d >= 1 ? 0 : Math.exp(-d * d * 7) * 0.85 + Math.exp(-d * 3.2) * 0.25 * (1 - d);
      const i = (y * s + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.min(1, v) * 255);
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  return t;
}
