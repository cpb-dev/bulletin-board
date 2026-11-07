import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { ALPHABET_WALL, SNOW_WINDOW } from "../lib/layout";

/**
 * The Christmas Cabin's canvas textures (BB-35). Block-out quality: they
 * make the scene read correctly now, and each one gets its own detailing
 * pass later.
 */

/**
 * Pale wallpaper with the alphabet painted on it in black, three rows,
 * like the letters on a living-room wall. Each letter sits under the
 * bulb that `letterPositions` puts above it.
 */
export function makeAlphabetTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = Math.round((w * ALPHABET_WALL.height) / ALPHABET_WALL.width);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  // Faded floral wallpaper: a cream ground with soft stripes.
  ctx.fillStyle = "#e9dcc0";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(160, 120, 80, 0.12)";
  for (let x = 0; x < w; x += 48) ctx.fillRect(x, 0, 18, h);

  const rand = mulberry32(25);
  ctx.fillStyle = "#151210";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ALPHABET_WALL.rows.forEach((row, r) => {
    const y = h * (0.28 + r * 0.3);
    [...row].forEach((letter, i) => {
      const x = w * ((i + 0.5) / row.length);
      ctx.save();
      ctx.translate(x, y);
      // Painted by hand: a little wonky.
      ctx.rotate((rand() - 0.5) * 0.18);
      ctx.font = `bold ${Math.round(h * (0.15 + rand() * 0.03))}px sans-serif`;
      ctx.fillText(letter, 0, 0);
      ctx.restore();
    });
  });

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Where each letter's bulb hangs, in the wall's local units (centred). */
export function letterPositions(): { letter: string; x: number; y: number }[] {
  const { width, height, rows } = ALPHABET_WALL;
  return rows.flatMap((row, r) => {
    // A bulb sits just above its letter.
    const y = height / 2 - height * (0.28 + r * 0.3) + 0.2;
    return [...row].map((letter, i) => ({
      letter,
      x: -width / 2 + width * ((i + 0.5) / row.length),
      y,
    }));
  });
}

/** A snowy evening through the window: dusk sky, snowy ground, flakes. */
export function makeSnowViewTexture(): THREE.CanvasTexture {
  // Drawn at the window's own proportions, so nothing is stretched.
  const w = 512;
  const s = Math.round((w * SNOW_WINDOW.height) / SNOW_WINDOW.width);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, s * 0.7);
  sky.addColorStop(0, "#1b2347");
  sky.addColorStop(1, "#5a6a9a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, s);
  // snowy hills
  ctx.fillStyle = "#dfe7f2";
  ctx.beginPath();
  ctx.ellipse(w * 0.22, s * 0.82, w * 0.4, s * 0.22, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#c8d3e6";
  ctx.beginPath();
  ctx.ellipse(w * 0.78, s * 0.86, w * 0.4, s * 0.2, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(0, s * 0.85, w, s * 0.15);
  // flakes
  const rand = mulberry32(12);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 140; i++) {
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * s * 0.8, 1 + rand() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
