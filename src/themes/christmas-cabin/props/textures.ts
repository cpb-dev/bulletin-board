import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { ALPHABET_WALL } from "../lib/layout";
import { letterSpots } from "../lib/letterlights";

/**
 * The Christmas Cabin's canvas textures (BB-35). Block-out quality: they
 * make the scene read correctly now, and each one gets its own detailing
 * pass later.
 */

/**
 * The alphabet, hand-painted straight onto the pine boards in cream
 * paint: chunky capitals, a little wonky, with dry-brush wear where the
 * wood shows through and the odd drip. Transparent everywhere else, so
 * the wall is the background and the room's light falls on the paint.
 */
export function makePaintedLettersTexture(): THREE.CanvasTexture {
  const { width, height } = ALPHABET_WALL;
  const w = 2048;
  const h = Math.round((w * height) / width);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const px = w / width;
  const rand = mulberry32(25);
  // Letters scale with the row, so a smaller wall keeps its proportions.
  const font = Math.round((height / ALPHABET_WALL.rows.length) * 0.47 * px);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const s of letterSpots()) {
    const x = (s.x + width / 2) * px;
    const y = (height / 2 - s.y) * px;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.14);
    // A touch condensed, so nine to a row still breathe.
    ctx.scale(0.84, 1);
    const size = font * (0.94 + rand() * 0.1);
    ctx.font = `900 ${Math.round(size)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    // Brushed on in a few slightly offset coats: soft, uneven edges.
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = `rgba(243, 233, 212, ${k === 0 ? 0.95 : 0.35})`;
      ctx.fillText(s.letter, (rand() - 0.5) * 5, (rand() - 0.5) * 5);
    }
    // The odd drip from the bottom of a stroke.
    if (rand() < 0.35) {
      const dx = (rand() - 0.5) * size * 0.4;
      const top = size * 0.3;
      const len = size * (0.12 + rand() * 0.22);
      const dw = 3 + rand() * 4;
      ctx.fillStyle = "rgba(243, 233, 212, 0.9)";
      ctx.beginPath();
      ctx.moveTo(dx - dw / 2, top);
      ctx.lineTo(dx - dw * 0.3, top + len);
      ctx.arc(dx, top + len, dw * 0.55, Math.PI, 0, true);
      ctx.lineTo(dx + dw / 2, top);
      ctx.fill();
    }
    ctx.restore();
  }

  // Dry-brush wear: horizontal streaks and specks rubbed out of the paint,
  // so the boards show through.
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 2600; i++) {
    const sx = rand() * w;
    const sy = rand() * h;
    ctx.fillStyle = `rgba(0,0,0,${0.25 + rand() * 0.6})`;
    ctx.fillRect(sx, sy, 6 + rand() * 40, 1 + rand() * 2.5);
  }
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.3 + rand() * 0.5})`;
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
  ctx.globalCompositeOperation = "source-over";

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A soft round glow, white at the centre fading to nothing: tinted per bulb. */
export function makeBulbGlowTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.12, "rgba(255,255,255,0.55)");
  g.addColorStop(0.4, "rgba(255,255,255,0.14)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}
