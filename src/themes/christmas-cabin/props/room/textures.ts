import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { grain, plankLayout, type PlankOptions } from "../../lib/planks";
import { RUG } from "../../lib/rug";
import { CHART, fairIsleChart, type Stitch } from "../../lib/fairisle";

/**
 * Canvas textures for the Christmas Cabin's room (BB-35): oak floor,
 * knotty-pine walls and ceiling, walnut beams, stained slats and the
 * Fair Isle knit rug. Everything is drawn here — no image files.
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

/** The knit's three yarns: cranberry, cream and pine. */
const YARN: Record<Stitch, string> = { r: "#b3333a", c: "#f6ead2", g: "#4f8f5a" };

/**
 * The Fair Isle rug's face and bump: every stitch of the chart drawn as a
 * knitted "V" — two plump, slanted loops of yarn with a shadow between
 * them — in its yarn's colour, with a little fibre fuzz. A cream edge
 * runs down both long sides, as on a finished blanket.
 */
export function makeKnitTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const chart = fairIsleChart();
  const edge = 2;
  const cols = CHART.cols + edge * 2;
  const rows = CHART.rows;
  const sw = 10; // pixels per stitch across
  const sh = Math.round((sw * (RUG.depth / rows)) / (RUG.width / cols)); // and down
  const w = cols * sw;
  const h = rows * sh;
  const color = canvas(w, h);
  const bump = canvas(w, h);
  const ctx = color.ctx;
  const bctx = bump.ctx;
  ctx.fillStyle = "#3a1414";
  ctx.fillRect(0, 0, w, h);
  bctx.fillStyle = "#000";
  bctx.fillRect(0, 0, w, h);

  const rand = mulberry32(9);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const stitch: Stitch = c < edge || c >= cols - edge ? "c" : chart[r][c - edge];
      const [yr, yg, yb] = hex(YARN[stitch]);
      const cx = c * sw + sw / 2;
      const cy = r * sh + sh / 2;
      const k = 0.9 + rand() * 0.18; // each stitch a little different
      // Two loops of the V, leaning in.
      for (const side of [-1, 1]) {
        const g = ctx.createRadialGradient(cx + side * sw * 0.22, cy, 0, cx + side * sw * 0.22, cy, sh * 0.62);
        g.addColorStop(0, `rgb(${Math.min(255, yr * k * 1.12)},${Math.min(255, yg * k * 1.12)},${Math.min(255, yb * k * 1.12)})`);
        g.addColorStop(0.7, `rgb(${yr * k * 0.92},${yg * k * 0.92},${yb * k * 0.92})`);
        g.addColorStop(1, `rgba(${yr * 0.5},${yg * 0.5},${yb * 0.5},0)`);
        ctx.save();
        ctx.translate(cx + side * sw * 0.22, cy);
        ctx.rotate(side * 0.55);
        ctx.scale(0.5, 1);
        ctx.translate(-(cx + side * sw * 0.22), -cy);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx + side * sw * 0.22, cy, sh * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const bg = bctx.createRadialGradient(cx + side * sw * 0.22, cy, 0, cx + side * sw * 0.22, cy, sh * 0.6);
        bg.addColorStop(0, "#fff");
        bg.addColorStop(1, "rgba(0,0,0,0)");
        bctx.save();
        bctx.translate(cx + side * sw * 0.22, cy);
        bctx.rotate(side * 0.55);
        bctx.scale(0.5, 1);
        bctx.translate(-(cx + side * sw * 0.22), -cy);
        bctx.fillStyle = bg;
        bctx.beginPath();
        bctx.arc(cx + side * sw * 0.22, cy, sh * 0.6, 0, Math.PI * 2);
        bctx.fill();
        bctx.restore();
      }
    }
  // Fibre fuzz over everything: wool is never crisp.
  for (let i = 0; i < 30000; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI * 2;
    const l = 1.5 + rand() * 3;
    ctx.strokeStyle = `rgba(255,240,220,${0.04 + rand() * 0.05})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  return {
    map: finish(color.c, { repeat: false }),
    bump: finish(bump.c, { srgb: false, repeat: false }),
  };
}
