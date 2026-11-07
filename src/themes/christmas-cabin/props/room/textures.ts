import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { grain, plankLayout, type PlankOptions } from "../../lib/planks";
import { flecks, latticeLines, RUG } from "../../lib/rug";

/**
 * Canvas textures for the Christmas Cabin's room (BB-35): oak floor and
 * ceiling boards, limewashed walls, walnut beams, oak slats and the
 * Berber rug. Everything is drawn here — no image files.
 *
 * Colours are drawn as real colours (the materials are left white), and
 * each wooden surface also gets a matching bump map so gaps and grain
 * catch the light.
 */

type RGB = [number, number, number];

function hex(c: string): RGB {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function finish(
  c: HTMLCanvasElement,
  { srgb = true, repeat = true }: { srgb?: boolean; repeat?: boolean } = {}
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export interface WoodLook {
  /** The average board colour. */
  base: string;
  /** How much boards differ from each other, 0..1. */
  toneSpread: number;
  /** How strong the grain is, 0..1. */
  grainStrength: number;
  /** Chance of a knot per board. */
  knots: number;
}

/**
 * Boards laid side by side: `rows` across the canvas's width, each row
 * cut into lengths running down its height. Returns a colour map and a
 * matching bump map. The tile repeats in both directions.
 */
export function makePlankTextures(
  size: number,
  layout: PlankOptions,
  look: WoodLook,
  /** World length of the tile, so grain scales with real boards. */
  tileMetres: number
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const rows = plankLayout(layout);
  const rowW = size / layout.rows;
  const color = canvas(size, size);
  const bump = canvas(size, size);
  const img = color.ctx.createImageData(size, size);
  const bimg = bump.ctx.createImageData(size, size);
  const [br, bg, bb] = hex(look.base);
  const boardMetres = tileMetres / layout.rows;

  // Knots: a few per tile, on the boards that drew one.
  const knots = rows.flat().flatMap((seg) => {
    const r = mulberry32(seg.seed);
    return r() < look.knots
      ? [{ seg, along: seg.start + seg.length * (0.2 + r() * 0.6), across: 0.25 + r() * 0.5, size: 0.006 + r() * 0.006 }]
      : [];
  });

  for (let x = 0; x < size; x++) {
    const rowIndex = Math.min(layout.rows - 1, Math.floor(x / rowW));
    const row = rows[rowIndex];
    const acrossPx = x - rowIndex * rowW;
    const across = (acrossPx / rowW) * boardMetres;
    const edgeGap = acrossPx < 1.2 || acrossPx > rowW - 1.2;
    const bevel = acrossPx < 3 ? 0.05 : acrossPx > rowW - 3 ? -0.06 : 0;

    for (let y = 0; y < size; y++) {
      const v = y / size;
      // Which board of this row covers v (they wrap round the tile).
      let seg = row[0];
      let into = 0;
      for (const s of row) {
        const d = (v - s.start + 1) % 1;
        if (d < s.length) {
          seg = s;
          into = d;
          break;
        }
      }
      const endPx = into * size;
      const endGap = endPx < 1.1 || (seg.length - into) * size < 1.1;
      const along = into * tileMetres;

      let shade = 1 + seg.tone * look.toneSpread * 0.14;
      shade += grain(along, across, seg.seed) * look.grainStrength * 0.09;
      // Slow sheen across each board, as boards are never quite flat.
      shade += Math.sin((acrossPx / rowW) * Math.PI) * 0.03 + bevel;

      // Knots: dark rings, with the grain swirled round them.
      for (const k of knots) {
        if (k.seg !== seg) continue;
        const du = ((v - k.along + 1.5) % 1) - 0.5;
        const dv = acrossPx / rowW - k.across;
        const d = Math.hypot(du / k.size, dv / (k.size * size / rowW) * 0.6);
        if (d < 3) shade -= Math.max(0, 0.35 - d * 0.1) * (0.6 + 0.4 * Math.sin(d * 6));
      }

      let bumpV = 0.55 + grain(along, across, seg.seed) * 0.12 + bevel * 2;
      if (edgeGap || endGap) {
        shade = 0.32;
        bumpV = 0;
      }
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, br * shade);
      img.data[i + 1] = Math.min(255, bg * shade);
      img.data[i + 2] = Math.min(255, bb * shade);
      img.data[i + 3] = 255;
      const b = Math.max(0, Math.min(255, bumpV * 255));
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = b;
      bimg.data[i + 3] = 255;
    }
  }
  color.ctx.putImageData(img, 0, 0);
  bump.ctx.putImageData(bimg, 0, 0);
  return { map: finish(color.c), bump: finish(bump.c, { srgb: false }) };
}

/**
 * Limewash: a soft, cloudy mineral finish. Overlapping feathered blobs
 * in close tones, drawn wrapped round the tile so it repeats without a
 * seam, then a fine grain and a few long, faint brush sweeps.
 */
export function makeLimewashTexture(base: string): THREE.CanvasTexture {
  const s = 512;
  const { c, ctx } = canvas(s, s);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  const rand = mulberry32(41);
  const tones = ["#f3eadc", "#ddcab3", "#e9dac6", "#d6c1a8", "#f7f0e4"];
  for (let i = 0; i < 90; i++) {
    const x = rand() * s;
    const y = rand() * s;
    const r = 30 + rand() * 120;
    const tone = tones[i % tones.length];
    const a = 0.05 + rand() * 0.09;
    // Draw at every wrapped position so the blob carries across edges.
    for (const ox of [-s, 0, s])
      for (const oy of [-s, 0, s]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        const [cr, cg, cb] = hex(tone);
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
        g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
  }
  // Fine mineral grain.
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 9;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  return finish(c);
}

/** Straight grain down a narrow canvas, for beams and slats. */
export function makeGrainStrip(base: string, seed: number, contrast: number): THREE.CanvasTexture {
  const w = 64;
  const h = 512;
  const { c, ctx } = canvas(w, h);
  const img = ctx.createImageData(w, h);
  const [r, g, b] = hex(base);
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      const shade = 1 + grain((y / h) * 2, (x / w) * 0.2, seed) * contrast;
      const i = (y * w + x) * 4;
      img.data[i] = Math.min(255, r * shade);
      img.data[i + 1] = Math.min(255, g * shade);
      img.data[i + 2] = Math.min(255, b * shade);
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return finish(c);
}

const RUG_CREAM = "#f8f1e6";
const RUG_INK = "#5a463a";
const FLECK = { rust: "#c46d4c", green: "#7f9070" };

/**
 * The rug's face: cream wool with a fibrous texture, the hand-knotted
 * charcoal lattice and a few coloured flecks. Drawn at the rug's own
 * proportions so nothing is stretched.
 */
export function makeRugTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = Math.round((w * RUG.depth) / RUG.width);
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = RUG_CREAM;
  ctx.fillRect(0, 0, w, h);

  const rand = mulberry32(5);
  // Wool: thousands of short, soft strokes in near-cream tones.
  for (let i = 0; i < 26000; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI;
    const l = 2 + rand() * 4;
    const t = 222 + rand() * 33;
    ctx.strokeStyle = `rgba(${t},${t - 6},${t - 16},0.35)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }

  // The lattice: each line drawn as several rough passes, so its edges
  // fray like knotted pile rather than ink.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const line of latticeLines()) {
    for (let pass = 0; pass < 5; pass++) {
      ctx.strokeStyle = pass === 0 ? RUG_INK : `rgba(74,58,50,${0.22 - pass * 0.04})`;
      ctx.lineWidth = pass === 0 ? w * 0.0042 : w * (0.0042 + pass * 0.002);
      ctx.beginPath();
      line.forEach((p, i) => {
        const jx = (rand() - 0.5) * 2;
        const jy = (rand() - 0.5) * 2;
        const x = p.u * w + jx;
        const y = p.v * h + jy;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  // Accent diamonds: a small solid diamond woven in short rows, so its
  // edges step like knotted pile.
  const d = w * 0.022;
  for (const f of flecks()) {
    ctx.fillStyle = FLECK[f.color];
    const cx = f.u * w;
    const cy = f.v * h;
    for (let row = -d; row <= d; row += 3) {
      const half = d - Math.abs(row);
      ctx.globalAlpha = 0.8 + rand() * 0.2;
      ctx.fillRect(cx - half + (rand() - 0.5) * 2, cy + row, half * 2, 3);
    }
    ctx.globalAlpha = 1;
  }

  return finish(c, { repeat: false });
}

/**
 * Pile for the rug's shells: a field of soft tufts of random height.
 * Each shell above the rug keeps only the tufts taller than its own
 * height (via alphaTest), so the pile thins towards its tips like real
 * wool. Grey values, not colour.
 */
export function makePileTexture(): THREE.CanvasTexture {
  const s = 256;
  const { c, ctx } = canvas(s, s);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, s, s);
  const rand = mulberry32(17);
  for (let i = 0; i < 3600; i++) {
    const x = rand() * s;
    const y = rand() * s;
    const r = 1.3 + rand() * 2.2;
    const v = Math.floor(90 + rand() * 165);
    for (const ox of [-s, 0, s])
      for (const oy of [-s, 0, s]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, `rgb(${v},${v},${v})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
  }
  return finish(c, { srgb: false });
}
