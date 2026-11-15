import type { PaperPattern } from "@/lib/paper-pattern";

/**
 * Draws a printed paper pattern (BB-46) over a note's paper colour. The
 * caller has already filled the paper and clipped to its outline, so the
 * pattern can paint the whole canvas. Prints are kept soft enough that
 * handwriting in the paper's ink still reads over them.
 *
 * Only ever called for a paper that has a `pattern`, so plain papers on
 * every theme are drawn exactly as they always were.
 */
export function drawPaperPattern(
  ctx: CanvasRenderingContext2D,
  pattern: PaperPattern,
  w: number,
  h: number
): void {
  ctx.save();
  switch (pattern) {
    case "candy":
      candy(ctx, w, h);
      break;
    case "tartan":
      tartan(ctx, w, h);
      break;
    case "kraft":
      kraft(ctx, w, h);
      break;
    case "snowflakes":
      snowflakes(ctx, w, h);
      break;
  }
  ctx.restore();
}

/** Seeded PRNG (the same as `mulberry32` in textures.ts, kept local to avoid an import cycle). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Peppermint stripes: a broad red band and a thin one, on the diagonal. */
function candy(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pitch = w / 5;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 4);
  const span = Math.hypot(w, h);
  for (let x = -span; x < span; x += pitch) {
    ctx.fillStyle = "rgba(200, 38, 46, 0.42)";
    ctx.fillRect(x, -span, pitch * 0.3, span * 2);
    ctx.fillStyle = "rgba(46, 125, 72, 0.3)";
    ctx.fillRect(x + pitch * 0.48, -span, pitch * 0.06, span * 2);
  }
}

/** A Christmas tartan over a red paper: dark and green bands, cream pinstripes. */
function tartan(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sett = w / 3.2;
  const bands: [number, number, string][] = [
    // offset, width, colour — the same sett both ways, so the crossings darken
    [0.0, 0.26, "rgba(18, 40, 28, 0.32)"],
    [0.3, 0.06, "rgba(30, 92, 52, 0.42)"],
    [0.4, 0.06, "rgba(30, 92, 52, 0.42)"],
    [0.62, 0.02, "rgba(255, 238, 200, 0.32)"],
    [0.82, 0.04, "rgba(12, 20, 30, 0.28)"],
  ];
  for (let base = -sett; base < Math.max(w, h) + sett; base += sett) {
    for (const [o, bw, c] of bands) {
      ctx.fillStyle = c;
      ctx.fillRect(base + o * sett, 0, bw * sett, h);
      ctx.fillRect(0, base + o * sett, w, bw * sett);
    }
  }
}

/** Brown paper: fibres, and a length of twine tied across one corner. */
function kraft(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = mulberry32(31);
  for (let i = 0; i < 900; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = r() * Math.PI;
    const len = 4 + r() * 14;
    ctx.strokeStyle = r() < 0.5 ? "rgba(90, 60, 30, 0.12)" : "rgba(255, 240, 210, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // Twine across the top-right corner, two twisted strands, and a bow.
  const x0 = w * 0.6;
  const y1 = h * 0.4;
  for (const [dx, col] of [
    [0, "rgba(240, 226, 192, 1)"],
    [6, "rgba(196, 168, 120, 1)"],
  ] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 8;
    ctx.setLineDash([12, 6]);
    ctx.lineDashOffset = dx;
    ctx.beginPath();
    ctx.moveTo(x0 + dx * 0.3, -5);
    ctx.lineTo(w + 5, y1 + dx * 0.3);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const bx = w * 0.8;
  const by = h * 0.2;
  const k = w / 512;
  ctx.strokeStyle = "rgba(236, 220, 182, 1)";
  ctx.lineWidth = 8 * k;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(bx + s * 32 * k, by - s * 6 * k, 32 * k, 16 * k, s * 0.5 - 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - 20 * k, by + 50 * k);
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + 14 * k, by + 52 * k);
  ctx.stroke();
  ctx.fillStyle = "rgba(206, 182, 138, 1)";
  ctx.beginPath();
  ctx.arc(bx, by, 9 * k, 0, Math.PI * 2);
  ctx.fill();
}

/** Little six-armed snowflakes scattered over a dusk-blue paper. */
function snowflakes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = mulberry32(12);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const x = r() * w;
    const y = r() * h;
    const s = w * (0.018 + r() * 0.03);
    const turn = r() * Math.PI;
    ctx.lineWidth = Math.max(1.5, s * 0.12);
    for (let k = 0; k < 6; k++) {
      const a = turn + (k * Math.PI) / 3;
      const cx = Math.cos(a);
      const cy = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + cx * s, y + cy * s);
      // a little V on each arm
      const mx = x + cx * s * 0.6;
      const my = y + cy * s * 0.6;
      for (const t of [-0.6, 0.6]) {
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(a + t) * s * 0.3, my + Math.sin(a + t) * s * 0.3);
      }
      ctx.stroke();
    }
  }
}
