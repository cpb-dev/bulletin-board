"use client";

import * as THREE from "three";
import { mulberry32 } from "../textures";
import type { MarkKind } from "@/lib/ghost";

/**
 * What a ghost leaves on the window after it touches it.
 *
 * This is the part that actually frightens anybody. A figure crossing
 * a pane is a figure crossing a pane; a handprint still sitting on the
 * glass ten seconds after whatever made it has gone is something else.
 *
 * Drawn as cleared grime rather than as a white shape: a palm flat on
 * a filthy window wipes it, so more of the lamp comes through where it
 * pressed and a little less around the edge where the dirt piled up.
 * That is why these are additive — a light print on the glass, not a
 * decal stuck to it.
 *
 * Haunted Hollow only.
 */

/** Canvas the marks are drawn on. Tall, like the panes. */
const W = 192;
const H = 248;

/**
 * One splayed hand, palm flat against the glass.
 *
 * Drawn small onto its own canvas and then scaled up, which is what
 * softens it. Built from radial smears instead, each finger comes out
 * as its own glowing bead and the whole thing reads as a firework —
 * the pads have to stay joined to the palm to read as a hand.
 */
function handCanvas(seed: number): HTMLCanvasElement {
  const rand = mulberry32(seed * 7919 + 5);
  const w = 46;
  const h = 58;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffe9be";

  // the heel and palm, which take most of the weight
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.68, 12, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  /** A finger: a line from the knuckle out, with a fatter pad on the end. */
  const finger = (ang: number, len: number, wide: number) => {
    const ox = w / 2 + Math.sin(ang) * 8;
    const oy = h * 0.6 - Math.cos(ang) * 8;
    const tx = w / 2 + Math.sin(ang) * len;
    const ty = h * 0.6 - Math.cos(ang) * len;
    ctx.lineCap = "round";
    ctx.lineWidth = wide;
    ctx.strokeStyle = "#ffe9be";
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // the pad presses hardest of all
    ctx.beginPath();
    ctx.ellipse(tx, ty, wide * 0.62, wide * 0.72, ang, 0, Math.PI * 2);
    ctx.fill();
  };

  const spread: [number, number][] = [
    [-0.62, 24],
    [-0.22, 28],
    [0.16, 27],
    [0.54, 23],
  ];
  for (const [a, l] of spread) {
    finger(a + (rand() - 0.5) * 0.12, l * (0.94 + rand() * 0.12), 5.4);
  }
  // thumb, out to one side and much lower
  finger(-1.35, 22, 6.2);

  return c;
}

/** Stamps a soft hand onto the glass. */
function drawHand(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  flip: number,
  seed: number,
  alpha = 0.8
) {
  const hand = handCanvas(seed);
  const dw = hand.width * size;
  const dh = hand.height * size;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.translate(cx, cy);
  ctx.scale(flip, 1);
  // Scaling a small canvas up is what blurs it: a print on a dirty
  // window has no hard edge anywhere.
  ctx.drawImage(hand, -dw / 2, -dh / 2, dw, dh);
  // one soft pass around it, for the grime pushed aside at the edge
  ctx.globalAlpha = alpha * 0.28;
  ctx.drawImage(hand, -dw * 0.56, -dh * 0.56, dw * 1.12, dh * 1.12);
  ctx.restore();
}

/**
 * The tracks a hand leaves as it is pulled down the glass.
 *
 * Five thin runs from where the fingers started to where they are
 * now, brightest at the bottom where the hand still is. Drawn without
 * a bead at the head of each run: a blob at the top of a track reads
 * as a row of little lights strung across the window, which is what
 * the first attempt looked like.
 */
function drawRunnels(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottom: number,
  top: number,
  size: number,
  seed: number
) {
  const rand = mulberry32(seed * 104729 + 11);
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * 9.5 * size + (rand() - 0.5) * 4;
    const from = top + rand() * 18;
    const g = ctx.createLinearGradient(0, from, 0, bottom);
    g.addColorStop(0, "rgba(255, 226, 176, 0)");
    g.addColorStop(0.6, `rgba(255, 230, 186, ${0.1 + rand() * 0.08})`);
    g.addColorStop(1, `rgba(255, 233, 190, ${0.2 + rand() * 0.12})`);
    ctx.fillStyle = g;
    const wdt = (1.4 + rand() * 1.8) * size;
    ctx.fillRect(x - wdt / 2, from, wdt, bottom - from);
  }
}

/**
 * The mist a face leaves — breath on cold glass, with the shape of
 * what was behind it just about readable in the middle.
 */
function drawFaceMark(ctx: CanvasRenderingContext2D, seed: number) {
  const rand = mulberry32(seed * 40961);
  const cx = W / 2 + (rand() - 0.5) * 16;
  const cy = H * 0.42;
  const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, 52);
  halo.addColorStop(0, "rgba(255, 232, 188, 0.5)");
  halo.addColorStop(0.5, "rgba(255, 228, 180, 0.24)");
  halo.addColorStop(1, "rgba(255, 228, 180, 0)");
  ctx.fillStyle = halo;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.82, 1);
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // brow, nose and chin, where the glass was actually touched
  const dab = (x: number, y: number, rx: number, ry: number, a: number) => {
    const g = ctx.createRadialGradient(cx + x, cy + y, 0, cx + x, cy + y, rx);
    g.addColorStop(0, `rgba(255, 240, 206, ${a})`);
    g.addColorStop(1, "rgba(255, 240, 206, 0)");
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cx + x, cy + y);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  dab(0, -18, 22, 9, 0.55);
  dab(0, 2, 8, 13, 0.6);
  dab(0, 26, 15, 8, 0.45);
}

/** Draws one kind of mark onto a transparent canvas. */
export function makeMarkTexture(
  kind: Exclude<MarkKind, "none">,
  seed: number
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);

  if (kind === "palms") {
    // both hands, set a shoulder-width apart and never quite level
    drawHand(ctx, W * 0.38, H * 0.45, 0.6, 1, seed, 0.55);
    drawHand(ctx, W * 0.62, H * 0.42, 0.58, -1, seed + 3, 0.55);
  } else if (kind === "drag") {
    // the streak runs from where the fingers started down to the hand
    const bottom = H * 0.62;
    drawRunnels(ctx, W * 0.46, bottom, H * 0.32, 0.6, seed);
    drawHand(ctx, W * 0.46, bottom, 0.6, 1, seed, 0.55);
  } else {
    drawFaceMark(ctx, seed);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * The mark on the glass.
 *
 * Additive and depth-write off, so it sits in the grime rather than
 * over it, and so it never occludes the ghost that made it.
 */
export function GlassMark({
  w,
  h,
  z,
  texture,
  material,
}: {
  w: number;
  h: number;
  z: number;
  texture: THREE.Texture | null;
  material: React.Ref<THREE.MeshBasicMaterial>;
}) {
  if (!texture) return null;
  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        ref={material}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
