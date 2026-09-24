"use client";

/**
 * Canvas textures for Stars Hollow — lettering, brick, siding, glass,
 * gingham and the rest.
 *
 * Everything here is drawn, never downloaded. Surfaces that a material
 * colour tints (brick, siding, grass) are drawn *pale* and let the
 * colour do the colouring, so one texture serves a red-brick shop and a
 * buff one. Anything with lettering is drawn at its final colours.
 */

import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";

const SERIF = "Georgia, 'Times New Roman', 'Liberation Serif', 'DejaVu Serif', serif";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function finish(
  c: HTMLCanvasElement,
  opts: { repeat?: boolean; srgb?: boolean; aniso?: number } = {}
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = opts.aniso ?? 4;
  return t;
}

/** A five-pointed star path centred on (x, y). */
function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Draw text with letter spacing, centred on x. */
function spaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = x - total / 2;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  return total;
}

/* ------------------------------------------------------------------ */
/*  The town sign                                                      */
/* ------------------------------------------------------------------ */

export const SIGN_BLUE = "#4b82d2";
const SIGN_INK = "#fffaf0";

/**
 * The face of the town sign, as it stands on the square: a star between
 * two rules, STARS HOLLOW, another star between rules, and FOUNDED ·
 * 1779 · along the bottom. Cream on cornflower blue, a painted serif.
 */
export function makeSignFaceTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const { c, ctx } = canvas(W, H);

  // The blue, very slightly uneven — it's painted board, not plastic.
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#5189d8");
  g.addColorStop(0.55, SIGN_BLUE);
  g.addColorStop(1, "#447bc9");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rand = mulberry32(1779);
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.035})`;
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 3, 1);
  }

  ctx.fillStyle = SIGN_INK;
  ctx.strokeStyle = SIGN_INK;

  // star between rules, above and below the name
  const rule = (y: number) => {
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(W * 0.24, y);
    ctx.lineTo(W * 0.445, y);
    ctx.moveTo(W * 0.555, y);
    ctx.lineTo(W * 0.76, y);
    ctx.stroke();
    starPath(ctx, W / 2, y, 19);
    ctx.fill();
  };
  rule(H * 0.17);
  rule(H * 0.6);

  ctx.textBaseline = "alphabetic";
  // Tall, slightly condensed capitals, as painted — sized to leave a
  // margin inside the moulding either side.
  let size = 132;
  ctx.font = `600 ${size}px ${SERIF}`;
  while (spacedWidth(ctx, "STARS HOLLOW", 5) * 0.86 > W * 0.8) {
    size -= 2;
    ctx.font = `600 ${size}px ${SERIF}`;
  }
  ctx.save();
  ctx.translate(W / 2, H * 0.5);
  ctx.scale(0.86, 1.1);
  spaced(ctx, "STARS HOLLOW", 0, 0, 5);
  ctx.restore();

  ctx.font = `600 68px ${SERIF}`;
  ctx.save();
  ctx.translate(W / 2, H * 0.86);
  // "FOUNDED" on the left, "· 1779 ·" on the right, as on the real one.
  ctx.textAlign = "left";
  const founded = "FOUNDED";
  const fw = spacedWidth(ctx, founded, 7);
  const year = "1779";
  const yw = spacedWidth(ctx, year, 6);
  const gap = 110;
  const total = fw + gap + yw + 60;
  let x = -total / 2;
  spaced(ctx, founded, x + fw / 2, 0, 7);
  x += fw + gap;
  ctx.beginPath();
  ctx.arc(x - 30, -22, 7, 0, Math.PI * 2);
  ctx.fill();
  spaced(ctx, year, x + yw / 2, 0, 6);
  ctx.beginPath();
  ctx.arc(x + yw + 30, -22, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return finish(c, { aniso: 8 });
}

function spacedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number) {
  return (
    [...text].reduce((a, ch) => a + ctx.measureText(ch).width, 0) +
    spacing * (text.length - 1)
  );
}

/**
 * Painted lattice: laths crossing on the diagonal, the gaps between
 * them transparent. Drawn white — the material tints it.
 *
 * `cells` is how many diamonds across the texture; it wraps on both
 * axes so it can be repeated across a long panel.
 */
export function makeLatticeTexture(cells = 4): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  const step = S / cells;
  const lath = step * 0.2;
  ctx.lineCap = "butt";
  // one direction, then the other over it with a thin shadow line, so
  // the laths read as lying on top of each other
  for (const dir of [1, -1]) {
    for (let i = -cells; i <= cells * 2; i++) {
      const x0 = i * step;
      ctx.strokeStyle = "rgba(60, 55, 45, 0.35)";
      ctx.lineWidth = lath + 3;
      ctx.beginPath();
      ctx.moveTo(x0, dir > 0 ? 0 : S);
      ctx.lineTo(x0 + S, dir > 0 ? S : 0);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = lath;
      ctx.beginPath();
      ctx.moveTo(x0, dir > 0 ? 0 : S);
      ctx.lineTo(x0 + S, dir > 0 ? S : 0);
      ctx.stroke();
    }
  }
  return finish(c, { repeat: true });
}

/* ------------------------------------------------------------------ */
/*  Building surfaces (drawn pale, tinted by the material colour)      */
/* ------------------------------------------------------------------ */

/**
 * Running-bond brick. One tile is 8 courses by 4 bricks; each brick
 * gets its own small shift in tone so a wall doesn't look printed.
 */
export function makeBrickTexture(seed = 3): THREE.CanvasTexture {
  const W = 256;
  const H = 256;
  const { c, ctx } = canvas(W, H);
  const rand = mulberry32(seed);
  // mortar
  ctx.fillStyle = "#e9e3d8";
  ctx.fillRect(0, 0, W, H);
  const rows = 8;
  const cols = 4;
  const bh = H / rows;
  const bw = W / cols;
  const m = 3;
  for (let r = 0; r < rows; r++) {
    const shift = r % 2 ? bw / 2 : 0;
    for (let k = -1; k <= cols; k++) {
      const x = k * bw + shift;
      const tone = 0.72 + rand() * 0.28;
      const v = Math.round(255 * tone);
      const warm = Math.round(v * (0.93 + rand() * 0.07));
      ctx.fillStyle = `rgb(${v}, ${warm}, ${Math.round(warm * 0.96)})`;
      ctx.fillRect(x + m / 2, r * bh + m / 2, bw - m, bh - m);
      // a lighter top edge and darker base on each brick
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + m / 2, r * bh + m / 2, bw - m, 2);
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(x + m / 2, r * bh + bh - m / 2 - 2, bw - m, 2);
    }
  }
  // wear
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.06})`;
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 4, 1 + rand() * 2);
  }
  return finish(c, { repeat: true });
}

/** Clapboard siding: overlapping horizontal boards with a shadow line. */
export function makeClapboardTexture(boards = 8): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  const rand = mulberry32(8);
  const bh = S / boards;
  for (let i = 0; i < boards; i++) {
    const y = i * bh;
    const g = ctx.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.8, "#f2f0ea");
    g.addColorStop(1, "#d8d4ca");
    ctx.fillStyle = g;
    ctx.fillRect(0, y, S, bh);
    ctx.fillStyle = "rgba(70,65,55,0.35)";
    ctx.fillRect(0, y + bh - 2, S, 2);
    // a butt joint now and then
    if (rand() < 0.5) {
      const x = rand() * S;
      ctx.fillStyle = "rgba(70,65,55,0.2)";
      ctx.fillRect(x, y, 1.5, bh - 2);
    }
  }
  return finish(c, { repeat: true });
}

/** Roof shingles in staggered courses. Pale; tinted by the roof colour. */
export function makeShingleTexture(seed = 5): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  const rand = mulberry32(seed);
  ctx.fillStyle = "#cfcac2";
  ctx.fillRect(0, 0, S, S);
  const rows = 10;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -rand() * 20 : 0;
    while (x < S) {
      const w = 16 + rand() * 20;
      const v = Math.round(200 + rand() * 55);
      ctx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
      ctx.fillRect(x + 1, r * rh, w - 2, rh - 2);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + 1, r * rh + rh - 3, w - 2, 3);
      x += w;
    }
  }
  return finish(c, { repeat: true });
}

/* ------------------------------------------------------------------ */
/*  Windows, curtains and the diner                                    */
/* ------------------------------------------------------------------ */

/**
 * A shop window seen from outside on a bright day: sky reflected in
 * the top of the glass, the warm-lit shop behind, and a couple of
 * shelves and shapes inside. `warmth` 0..1 is how lit the inside is.
 */
export function makeShopWindowTexture(seed = 1, warmth = 0.7): THREE.CanvasTexture {
  const W = 256;
  const H = 256;
  const { c, ctx } = canvas(W, H);
  const rand = mulberry32(seed);
  const inside = ctx.createLinearGradient(0, 0, 0, H);
  inside.addColorStop(0, `rgb(${60 + warmth * 60}, ${48 + warmth * 42}, ${36 + warmth * 18})`);
  inside.addColorStop(1, `rgb(${34 + warmth * 30}, ${28 + warmth * 18}, ${22 + warmth * 8})`);
  ctx.fillStyle = inside;
  ctx.fillRect(0, 0, W, H);
  // pendant lamps
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 88 + rand() * 20;
    const g = ctx.createRadialGradient(x, 50, 0, x, 50, 60);
    g.addColorStop(0, `rgba(255, 214, 150, ${0.35 * warmth + 0.1})`);
    g.addColorStop(1, "rgba(255, 214, 150, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 60, 0, 120, 120);
    ctx.fillStyle = `rgba(255, 238, 200, ${0.5 + warmth * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(x, 44, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // shelves and stock
  for (let s = 0; s < 3; s++) {
    const y = 110 + s * 42;
    ctx.fillStyle = "rgba(20, 14, 10, 0.55)";
    ctx.fillRect(0, y, W, 5);
    for (let x = 4; x < W; ) {
      const w = 8 + rand() * 18;
      const h = 12 + rand() * 22;
      const hue = Math.floor(rand() * 360);
      ctx.fillStyle = `hsla(${hue}, 35%, ${30 + rand() * 25}%, 0.8)`;
      ctx.fillRect(x, y - h, w, h);
      x += w + 2 + rand() * 6;
    }
  }
  // sky reflected across the top of the pane, and a diagonal glint
  const refl = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  refl.addColorStop(0, "rgba(200, 222, 245, 0.55)");
  refl.addColorStop(1, "rgba(200, 222, 245, 0)");
  ctx.fillStyle = refl;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.beginPath();
  ctx.moveTo(W * 0.55, 0);
  ctx.lineTo(W * 0.8, 0);
  ctx.lineTo(W * 0.35, H);
  ctx.lineTo(W * 0.1, H);
  ctx.closePath();
  ctx.fill();
  return finish(c);
}

/**
 * An upstairs window: a dim room, curtains drawn back to either side,
 * and the sky reflected across the glass.
 */
export function makeHomeWindowTexture(seed = 1): THREE.CanvasTexture {
  const W = 128;
  const H = 192;
  const { c, ctx } = canvas(W, H);
  const rand = mulberry32(seed);
  ctx.fillStyle = "#3d3a3a";
  ctx.fillRect(0, 0, W, H);
  // a lamp glow somewhere in the room
  const gx = W * (0.3 + rand() * 0.4);
  const g = ctx.createRadialGradient(gx, H * 0.55, 0, gx, H * 0.55, W * 0.6);
  g.addColorStop(0, "rgba(255, 210, 150, 0.35)");
  g.addColorStop(1, "rgba(255, 210, 150, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const hue = [30, 200, 350, 80][Math.floor(rand() * 4)];
  ctx.fillStyle = `hsl(${hue}, 30%, 78%)`;
  for (const side of [0, 1]) {
    ctx.beginPath();
    const x0 = side ? W : 0;
    const x1 = side ? W * 0.72 : W * 0.28;
    ctx.moveTo(x0, 0);
    ctx.lineTo(x1, 0);
    ctx.quadraticCurveTo(x1 + (side ? 10 : -10), H * 0.5, side ? W * 0.86 : W * 0.14, H);
    ctx.lineTo(x0, H);
    ctx.closePath();
    ctx.fill();
  }
  const refl = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  refl.addColorStop(0, "rgba(205, 225, 245, 0.6)");
  refl.addColorStop(1, "rgba(205, 225, 245, 0.05)");
  ctx.fillStyle = refl;
  ctx.fillRect(0, 0, W, H);
  return finish(c);
}

/**
 * Luke's through the window: the counter, the stools, the coffee-pot
 * glow and the pendant lamps, with the square's sky reflected over it.
 */
export function makeDinerWindowTexture(seed = 2): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const { c, ctx } = canvas(W, H);
  const rand = mulberry32(seed);
  // blue-green walls, as inside the real one
  ctx.fillStyle = "#4f6f6a";
  ctx.fillRect(0, 0, W, H);
  // back wall: shelves, the kitchen door, a chalkboard
  ctx.fillStyle = "#2a2b27";
  ctx.fillRect(60, 60, 70, 46);
  ctx.fillStyle = "#c8b89a";
  ctx.fillRect(210, 40, 90, 120);
  ctx.fillStyle = "#6e4e34";
  ctx.fillRect(214, 44, 82, 112);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = "rgba(240, 220, 180, 0.6)";
    ctx.fillRect(340 + i * 34, 70, 24, 14);
  }
  // counter
  ctx.fillStyle = "#b9b6ae";
  ctx.fillRect(0, 150, W, 10);
  ctx.fillStyle = "#6b4a33";
  ctx.fillRect(0, 160, W, 50);
  // red stools and chairs
  for (let i = 0; i < 7; i++) {
    const x = 30 + i * 70 + rand() * 10;
    ctx.fillStyle = "#b8372c";
    ctx.beginPath();
    ctx.ellipse(x, 200, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9a9a96";
    ctx.fillRect(x - 2, 204, 4, 40);
  }
  // pendant lamps
  for (let i = 0; i < 4; i++) {
    const x = 70 + i * 120;
    const g = ctx.createRadialGradient(x, 26, 0, x, 26, 70);
    g.addColorStop(0, "rgba(255, 224, 160, 0.55)");
    g.addColorStop(1, "rgba(255, 224, 160, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 70, 0, 140, 110);
    ctx.fillStyle = "#fff4d8";
    ctx.beginPath();
    ctx.ellipse(x, 22, 14, 9, 0, 0, Math.PI);
    ctx.fill();
  }
  // reflection
  const refl = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  refl.addColorStop(0, "rgba(205, 225, 245, 0.5)");
  refl.addColorStop(1, "rgba(205, 225, 245, 0)");
  ctx.fillStyle = refl;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(W * 0.62, 0);
  ctx.lineTo(W * 0.74, 0);
  ctx.lineTo(W * 0.5, H);
  ctx.lineTo(W * 0.38, H);
  ctx.closePath();
  ctx.fill();
  return finish(c);
}

/** Leaded transom glass: pale hexagonal lights in thin grey cames. */
export function makeTransomTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 64;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = "#c9d3d6";
  ctx.fillRect(0, 0, W, H);
  const refl = ctx.createLinearGradient(0, 0, W, H);
  refl.addColorStop(0, "rgba(255,255,255,0.35)");
  refl.addColorStop(1, "rgba(120,140,150,0.2)");
  ctx.fillStyle = refl;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#6b6f70";
  ctx.lineWidth = 2;
  const cw = 32;
  for (let x = 0; x <= W; x += cw) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - cw / 2, H * 0.25);
    ctx.lineTo(x - cw / 2, H * 0.75);
    ctx.lineTo(x, H);
    ctx.moveTo(x, 0);
    ctx.lineTo(x + cw / 2, H * 0.25);
    ctx.lineTo(x + cw / 2, H * 0.75);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  return finish(c, { repeat: true });
}

/** Green-and-white gingham with gathered folds, for café curtains. */
export function makeGinghamTexture(): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = "#f3f3ec";
  ctx.fillRect(0, 0, S, S);
  const n = 8;
  const step = S / n;
  ctx.fillStyle = "rgba(122, 150, 120, 0.55)";
  for (let i = 0; i < n; i += 2) {
    ctx.fillRect(i * step, 0, step, S);
    ctx.fillRect(0, i * step, S, step);
  }
  // gathers: vertical shading across the width
  for (let x = 0; x < S; x++) {
    const v = Math.sin((x / S) * Math.PI * 6);
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v * 0.18})` : `rgba(0,0,0,${-v * 0.2})`;
    ctx.fillRect(x, 0, 1, S);
  }
  return finish(c, { repeat: true });
}

/** The yellow of Luke's sign and its lettering. */
export const LUKES_YELLOW = "#f2cf3a";
const LUKES_BROWN = "#6b2c1c";

/**
 * Luke's sign: a yellow coffee cup on its saucer, cut out of board, with
 * "Luke's" painted across it in brown. The shape is in the alpha, so
 * the sign's outline is the cup's outline.
 */
export function makeLukesSignTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 384;
  const { c, ctx } = canvas(W, H);
  ctx.clearRect(0, 0, W, H);

  const cup = new Path2D();
  // saucer — a long lozenge along the bottom
  cup.ellipse(W * 0.46, H * 0.83, W * 0.42, H * 0.1, 0, 0, Math.PI * 2);
  // the cup — a tapering bowl with a lip
  cup.moveTo(W * 0.12, H * 0.2);
  cup.lineTo(W * 0.8, H * 0.2);
  cup.quadraticCurveTo(W * 0.8, H * 0.76, W * 0.58, H * 0.8);
  cup.lineTo(W * 0.34, H * 0.8);
  cup.quadraticCurveTo(W * 0.12, H * 0.76, W * 0.12, H * 0.2);
  cup.closePath();
  // the handle, a thick loop on the right
  const handle = new Path2D();
  handle.ellipse(W * 0.82, H * 0.42, W * 0.1, H * 0.14, 0, 0, Math.PI * 2);
  const hole = new Path2D();
  hole.ellipse(W * 0.83, H * 0.42, W * 0.045, H * 0.07, 0, 0, Math.PI * 2);

  // a darker edge, so the cut-out reads as board with some thickness
  ctx.save();
  ctx.fillStyle = "#b8941e";
  ctx.translate(4, 5);
  ctx.fill(cup);
  ctx.fill(handle);
  ctx.restore();
  ctx.fillStyle = LUKES_YELLOW;
  ctx.fill(cup);
  ctx.fill(handle);
  ctx.globalCompositeOperation = "destination-out";
  ctx.fill(hole);
  ctx.globalCompositeOperation = "source-over";

  // wear on the paint
  const rand = mulberry32(27);
  ctx.save();
  ctx.clip(cup);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(150, 110, 20, ${rand() * 0.12})`;
    ctx.fillRect(rand() * W, rand() * H, 2 + rand() * 8, 1 + rand() * 2);
  }
  ctx.restore();

  // "Luke's", hand-painted, climbing a little to the right
  ctx.save();
  ctx.translate(W * 0.46, H * 0.56);
  ctx.rotate(-0.12);
  ctx.scale(0.78, 1.15);
  ctx.fillStyle = LUKES_BROWN;
  ctx.font = `italic 700 128px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Luke's", 0, 0);
  ctx.restore();

  const t = finish(c, { aniso: 8 });
  return t;
}

/** "Food" in the diner window: yellow, with a dark outline, on clear. */
export function makeFoodTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 128;
  const { c, ctx } = canvas(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H * 0.55);
  ctx.rotate(-0.08);
  ctx.scale(0.85, 1.1);
  ctx.font = `italic 700 92px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#4a3a14";
  ctx.strokeText("Food", 0, 0);
  ctx.fillStyle = LUKES_YELLOW;
  ctx.fillText("Food", 0, 0);
  ctx.restore();
  // the swash underline
  ctx.strokeStyle = "#4a3a14";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, H * 0.9);
  ctx.quadraticCurveTo(W * 0.55, H * 0.78, W * 0.85, H * 0.8);
  ctx.stroke();
  ctx.strokeStyle = LUKES_YELLOW;
  ctx.lineWidth = 5;
  ctx.stroke();
  return finish(c);
}

/**
 * Painted fascia lettering: `text` in capitals, centred, on `bg`.
 * Sized to fit — a long shop name gets a smaller face, never clipped.
 */
export function makeFasciaTexture(
  text: string,
  bg: string,
  ink: string,
  aspect = 6
): THREE.CanvasTexture {
  const H = 96;
  const W = Math.round(H * aspect);
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // a painted border line
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  let size = 58;
  ctx.font = `600 ${size}px ${SERIF}`;
  while (spacedWidth(ctx, text, 6) > W * 0.86 && size > 20) {
    size -= 2;
    ctx.font = `600 ${size}px ${SERIF}`;
  }
  spaced(ctx, text, W / 2, H / 2 + 3, 6);
  return finish(c, { aniso: 8 });
}

/** Awning canvas: bold stripes with a scalloped valance edge. */
export function makeAwningTexture(a: string, b: string): THREE.CanvasTexture {
  const W = 256;
  const H = 128;
  const { c, ctx } = canvas(W, H);
  const n = 10;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? b : a;
    ctx.fillRect((i * W) / n, 0, W / n + 1, H);
  }
  // fold shading down the slope
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0.12)");
  g.addColorStop(0.7, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0.15)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return finish(c, { repeat: true });
}

/* ------------------------------------------------------------------ */
/*  Nature                                                             */
/* ------------------------------------------------------------------ */

/**
 * A single maple leaf, pale — the instance colour makes it red, orange
 * or gold. Alpha is the leaf's outline.
 */
export function makeLeafTexture(): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  ctx.translate(S / 2, S / 2 + 6);
  // five lobes, the middle one longest
  const lobes = [
    { a: -Math.PI / 2, r: 54 },
    { a: -Math.PI / 2 - 0.95, r: 46 },
    { a: -Math.PI / 2 + 0.95, r: 46 },
    { a: -Math.PI / 2 - 1.95, r: 30 },
    { a: -Math.PI / 2 + 1.95, r: 30 },
  ];
  ctx.fillStyle = "#f4efe6";
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  for (const l of lobes) {
    ctx.beginPath();
    const tx = Math.cos(l.a) * l.r;
    const ty = Math.sin(l.a) * l.r;
    const px = Math.cos(l.a + Math.PI / 2);
    const py = Math.sin(l.a + Math.PI / 2);
    ctx.moveTo(px * 12, py * 12);
    ctx.lineTo(tx * 0.55 + px * 13, ty * 0.55 + py * 13);
    ctx.lineTo(tx * 0.62 + px * 20, ty * 0.62 + py * 20);
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx * 0.62 - px * 20, ty * 0.62 - py * 20);
    ctx.lineTo(tx * 0.55 - px * 13, ty * 0.55 - py * 13);
    ctx.lineTo(-px * 12, -py * 12);
    ctx.closePath();
    ctx.fill();
  }
  // veins
  ctx.strokeStyle = "rgba(120, 90, 60, 0.35)";
  ctx.lineWidth = 2;
  for (const l of lobes) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(l.a) * l.r * 0.85, Math.sin(l.a) * l.r * 0.85);
    ctx.stroke();
  }
  // stem
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(3, 50);
  ctx.stroke();
  return finish(c);
}

/**
 * Foliage for the tree crowns: dappled light and shade over a pale
 * base, so the instance colour carries the hue and the crown still has
 * texture where the toon ramp is flat.
 */
export function makeFoliageTexture(seed = 17): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = canvas(S, S);
  const rand = mulberry32(seed);
  ctx.fillStyle = "#f1ece2";
  ctx.fillRect(0, 0, S, S);
  // Small leaf-sized dabs, light and shade, drawn wrapped so the tile
  // joins. Kept gentle: this is a texture on a toon ramp, not a photo.
  for (let i = 0; i < 520; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 2 + rand() * 3.5;
    const light = rand() < 0.55;
    ctx.fillStyle = light
      ? `rgba(255, 253, 244, ${0.35 + rand() * 0.4})`
      : `rgba(140, 105, 80, ${0.1 + rand() * 0.16})`;
    const rot = rand() * Math.PI;
    for (const dx of [-S, 0, S])
      for (const dy of [-S, 0, S]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, r, r * 0.6, rot, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  return finish(c, { repeat: true });
}

/** Bark: vertical fissures. Pale; tinted by the trunk colour. */
export function makeBarkTexture(seed = 4, patchy = false): THREE.CanvasTexture {
  const W = 128;
  const H = 256;
  const { c, ctx } = canvas(W, H);
  const rand = mulberry32(seed);
  ctx.fillStyle = "#ece6dc";
  ctx.fillRect(0, 0, W, H);
  if (patchy) {
    // sycamore bark flakes off in pale patches over darker
    for (let i = 0; i < 40; i++) {
      const x = rand() * W;
      const y = rand() * H;
      ctx.fillStyle = `rgba(${150 + rand() * 40}, ${140 + rand() * 30}, ${110 + rand() * 30}, 0.5)`;
      ctx.beginPath();
      ctx.ellipse(x, y, 6 + rand() * 14, 10 + rand() * 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 26; i++) {
      const x0 = rand() * W;
      ctx.strokeStyle = `rgba(60, 45, 35, ${0.25 + rand() * 0.3})`;
      ctx.lineWidth = 1.5 + rand() * 3;
      ctx.beginPath();
      // a sum of sines down the height: periodic, so the tile joins
      const a = rand() * 6;
      const b = rand() * 3;
      for (let y = 0; y <= H; y += 8) {
        const x = x0 + Math.sin((y / H) * Math.PI * 2 + a) * 4 + Math.sin((y / H) * Math.PI * 4 + b) * 2;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  return finish(c, { repeat: true });
}

/**
 * Mown grass, pale, for the square. Stripes from the mower are too
 * regular for a town green in autumn; this is tufts, worn patches and
 * a few stray leaves ground into it.
 */
export function makeGrassTexture(seed = 21): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rand = mulberry32(seed);
  ctx.fillStyle = "#e6ecd6";
  ctx.fillRect(0, 0, S, S);
  const wrap = (x: number, y: number, m: number, draw: (x: number, y: number) => void) => {
    for (const dx of x < m ? [0, S] : x > S - m ? [0, -S] : [0])
      for (const dy of y < m ? [0, S] : y > S - m ? [0, -S] : [0]) draw(x + dx, y + dy);
  };
  for (let i = 0; i < 40; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 30 + rand() * 80;
    const light = rand() < 0.5;
    wrap(x, y, r, (xx, yy) => {
      const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
      const col = light ? "255, 255, 235" : "150, 160, 120";
      g.addColorStop(0, `rgba(${col}, ${0.12 + rand() * 0.14})`);
      g.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(xx - r, yy - r, r * 2, r * 2);
    });
  }
  for (let i = 0; i < 9000; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const l = 3 + rand() * 6;
    const a = -Math.PI / 2 + (rand() - 0.5) * 0.9;
    ctx.strokeStyle =
      rand() < 0.5
        ? `rgba(120, 140, 90, ${0.18 + rand() * 0.2})`
        : `rgba(255, 255, 240, ${0.15 + rand() * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  return finish(c, { repeat: true, aniso: 8 });
}

/** Concrete paving slabs with joints, for the pavements and paths. */
export function makePavingTexture(seed = 9): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  const rand = mulberry32(seed);
  ctx.fillStyle = "#e8e4dc";
  ctx.fillRect(0, 0, S, S);
  const n = 4;
  const step = S / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const v = 220 + Math.round(rand() * 30);
      ctx.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
      ctx.fillRect(i * step + 2, j * step + 2, step - 4, step - 4);
    }
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.07})`;
    ctx.fillRect(rand() * S, rand() * S, 1 + rand() * 3, 1 + rand() * 3);
  }
  ctx.fillStyle = "rgba(90, 85, 75, 0.45)";
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(i * step - 1.5, 0, 3, S);
    ctx.fillRect(0, i * step - 1.5, S, 3);
  }
  return finish(c, { repeat: true, aniso: 8 });
}

/** Worn asphalt with a few patched cracks. */
export function makeAsphaltTexture(seed = 12): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  const rand = mulberry32(seed);
  ctx.fillStyle = "#d6d3cf";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i++) {
    const v = Math.round(150 + rand() * 105);
    ctx.fillStyle = `rgba(${v},${v},${v - 4},0.5)`;
    ctx.fillRect(rand() * S, rand() * S, 1.5, 1.5);
  }
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = "rgba(60,60,60,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let x = rand() * S;
    let y = rand() * S;
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (rand() - 0.5) * 30;
      y += (rand() - 0.5) * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return finish(c, { repeat: true, aniso: 8 });
}

/** Straw, for the hay bales: short strokes laid mostly one way. */
export function makeStrawTexture(seed = 33): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = canvas(S, S);
  const rand = mulberry32(seed);
  ctx.fillStyle = "#efe2b8";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const l = 5 + rand() * 12;
    const a = (rand() - 0.5) * 0.6;
    ctx.strokeStyle =
      rand() < 0.5 ? `rgba(160, 120, 50, ${0.25 + rand() * 0.3})` : `rgba(255, 245, 210, ${0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const dx of [-S, 0, S]) {
      ctx.moveTo(x + dx, y);
      ctx.lineTo(x + dx + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    ctx.stroke();
  }
  return finish(c, { repeat: true });
}
