"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { doorSwing } from "@/lib/haunted";
import { makeToonRamp, mulberry32 } from "../textures";
import { WindowGhost } from "./WindowGhost";

/**
 * The house at the edge of Haunted Hollow.
 *
 * Built as a shell rather than a stack of boxes: the facade is an
 * extruded shape with the doorway and every window cut out of it, so
 * the openings are real holes with real reveals. The glass sits 0.2
 * back inside them, which is what lets the ghosts read as being
 * behind it and lets cobwebs hang in the corners rather than float on
 * a flat wall.
 *
 * Everything is weathered from canvas: clapboard with the paint
 * peeling off it, shingles with gaps where they've blown away, moss
 * down the damp side. The front door hangs on its hinges and the wind
 * works it — see `doorSwing` in `src/lib/haunted.ts`.
 *
 * Used only by the Haunted Hollow scene.
 */

const BLOCK_W = 6.4;
const BLOCK_H = 5.2;
const BLOCK_D = 4.0;
/** Wall thickness — this is the depth of every window reveal. */
const WALL_T = 0.22;
const FRONT_Z = BLOCK_D / 2;

const ROOF_RISE = 2.4;
const ROOF_HALF_SPAN = 3.55; // overhangs the block by 0.35 each side
const ROOF_DEPTH = 4.6;
const ROOF_SAG = 0.35;

const TOWER_X = -3.5;
const TOWER_H = 6.8;

/** The lit windows, in facade coordinates (x from the centre, y from the ground). */
const WINDOWS: { x: number; y: number; w: number; h: number }[] = [
  { x: -1.9, y: 2.65, w: 0.9, h: 1.1 },
  { x: 0.1, y: 2.65, w: 0.9, h: 1.1 },
  { x: 2.1, y: 2.65, w: 0.9, h: 1.1 },
  { x: -1.0, y: 4.3, w: 0.8, h: 0.9 },
  { x: 1.2, y: 4.3, w: 0.8, h: 0.9 },
];

/** The one nobody bothered to re-glaze. No ghost — it's boarded over. */
const BOARDED = { x: 2.45, y: 0.95, w: 0.65, h: 0.85 };

const DOOR = { x: 0.1, w: 1.2, h: 1.9 };

const WALL_TILE = 1.6; // world units covered by one wrap of the plank texture

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

/** A rectangle centred on `cx, cy`, as a path that can be cut as a hole. */
function holePath(cx: number, cy: number, w: number, h: number): THREE.Path {
  const p = new THREE.Path();
  p.moveTo(cx - w / 2, cy - h / 2);
  p.lineTo(cx + w / 2, cy - h / 2);
  p.lineTo(cx + w / 2, cy + h / 2);
  p.lineTo(cx - w / 2, cy + h / 2);
  p.closePath();
  return p;
}

/** A wall panel: a `w` x `h` rectangle standing on y = 0, less any openings. */
export function makeWallGeometry(
  w: number,
  h: number,
  holes: THREE.Path[] = []
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h);
  shape.lineTo(-w / 2, h);
  shape.closePath();
  shape.holes = holes;
  // No bevel: a bevelled opening reads as moulded plastic at this size,
  // and the reveal is doing that job already.
  return new THREE.ExtrudeGeometry(shape, {
    depth: WALL_T,
    bevelEnabled: false,
    curveSegments: 1,
  });
}

/**
 * The roof: one surface running over both slopes, with the ridge
 * sagging towards the middle of its span the way a roof does once the
 * purlins have gone. `y` is measured from the top of the walls.
 *
 * UVs are (along the ridge, up the slope), so a shingle texture's rows
 * land parallel to the eaves.
 */
export function makeRoofGeometry(
  seed = 1,
  nu = 28,
  nv = 14
): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  // a little per-rafter waviness, so the eave line isn't laser-straight
  const wobble: number[] = [];
  for (let i = 0; i <= nu; i++) wobble.push((rand() - 0.5) * 0.07);

  const position: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];

  for (let j = 0; j <= nv; j++) {
    const tv = j / nv;
    const z = (tv - 0.5) * ROOF_DEPTH;
    for (let i = 0; i <= nu; i++) {
      const tu = i / nu;
      const x = (tu - 0.5) * 2 * ROOF_HALF_SPAN;
      // 0 at the eave, 1 at the ridge
      const k = Math.max(0, 1 - Math.abs(x) / ROOF_HALF_SPAN);
      // The sag is zero at the gable ends, where the walls hold it up.
      const dip = Math.sin(Math.PI * tv) * ROOF_SAG * (0.35 + 0.65 * k);
      const y = ROOF_RISE * Math.pow(k, 1.08) - dip + wobble[i] * (1 - k);
      position.push(x, y, z);
      uv.push(tv, tu);
    }
  }

  const row = nu + 1;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * row + i;
      index.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** The triangle of wall that fills the gable end, with an attic vent cut out. */
function makeGableGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-BLOCK_W / 2, 0);
  shape.lineTo(BLOCK_W / 2, 0);
  shape.lineTo(0, ROOF_RISE);
  shape.closePath();
  shape.holes = [holePath(0, 0.85, 0.78, 0.66)];
  return new THREE.ExtrudeGeometry(shape, {
    depth: WALL_T,
    bevelEnabled: false,
    curveSegments: 1,
  });
}

/* ------------------------------------------------------------------ */
/*  Textures                                                           */
/* ------------------------------------------------------------------ */

/**
 * Weathered clapboard. Horizontal boards with a shadow under each lap,
 * grain along them, paint flaking off in patches, and damp creeping up
 * from the bottom of the tile.
 */
export function makePlankTexture(seed = 3): THREE.CanvasTexture {
  const S = 512;
  const ROWS = 8;
  const rowH = S / ROWS;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  ctx.fillStyle = "#4b4150";
  ctx.fillRect(0, 0, S, S);

  /** Draw at x, and again wrapped, so features cross the tile seam. */
  const wrapped = (x: number, draw: (x: number) => void) => {
    draw(x);
    if (x < 40) draw(x + S);
    if (x > S - 40) draw(x - S);
  };

  for (let r = 0; r < ROWS; r++) {
    const top = r * rowH;
    // every board a slightly different age
    const tone = 62 + Math.floor(rand() * 26);
    ctx.fillStyle = `rgb(${tone + 12}, ${tone}, ${tone + 18})`;
    ctx.fillRect(0, top, S, rowH);

    // grain: long streaks running with the board
    for (let g = 0; g < 26; g++) {
      const y = top + 3 + rand() * (rowH - 6);
      const len = 40 + rand() * 180;
      const x = rand() * S;
      ctx.strokeStyle = `rgba(20, 14, 26, ${0.05 + rand() * 0.13})`;
      ctx.lineWidth = 0.7 + rand() * 1.3;
      wrapped(x, (xx) => {
        ctx.beginPath();
        ctx.moveTo(xx, y);
        ctx.quadraticCurveTo(xx + len / 2, y + (rand() - 0.5) * 3, xx + len, y);
        ctx.stroke();
      });
    }

    // knots
    if (rand() < 0.75) {
      const kx = rand() * S;
      const ky = top + rowH * (0.3 + rand() * 0.4);
      wrapped(kx, (xx) => {
        ctx.beginPath();
        ctx.ellipse(xx, ky, 3 + rand() * 3, 2 + rand() * 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(16, 11, 20, 0.6)";
        ctx.fill();
      });
    }

    // the lap: light lip along the top, hard shadow along the bottom
    ctx.fillStyle = "rgba(230, 222, 240, 0.09)";
    ctx.fillRect(0, top, S, 2);
    ctx.fillStyle = "rgba(12, 8, 16, 0.55)";
    ctx.fillRect(0, top + rowH - 4, S, 4);

    // a sprung board here and there — a black gap where it's pulled away
    if (rand() < 0.3) {
      const gx = rand() * (S - 120);
      const gw = 30 + rand() * 90;
      ctx.fillStyle = "rgba(8, 5, 11, 0.85)";
      ctx.fillRect(gx, top + rowH - 9, gw, 7);
    }
  }

  // peeling paint: ragged lighter patches, the old colour showing through
  for (let p = 0; p < 22; p++) {
    const px = rand() * S;
    const py = rand() * S;
    const rr = 12 + rand() * 46;
    wrapped(px, (xx) => {
      ctx.beginPath();
      for (let a = 0; a <= 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        const rad = rr * (0.55 + rand() * 0.6);
        const vx = xx + Math.cos(ang) * rad;
        const vy = py + Math.sin(ang) * rad * 0.45; // flattened, like flaking
        if (a === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(150, 140, 160, ${0.03 + rand() * 0.06})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(14, 10, 18, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // Mould, spread evenly. It wants to pool at the foot of the wall, but
  // a gradient baked into the tile repeats up the wall as banding —
  // that belongs on the wall, not in the tile. See `DampStain`.
  for (let m = 0; m < 70; m++) {
    const mx = rand() * S;
    const my = rand() * S;
    ctx.beginPath();
    ctx.arc(mx, my, 3 + rand() * 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${48 + rand() * 20}, ${62 + rand() * 24}, 42, ${
      0.06 + rand() * 0.12
    })`;
    ctx.fill();
  }

  // nail heads, rusted
  for (let r = 0; r < ROWS; r++) {
    for (let n = 0; n < 5; n++) {
      const nx = (n + 0.5) * (S / 5) + (rand() - 0.5) * 12;
      const ny = r * rowH + rowH * 0.28;
      ctx.beginPath();
      ctx.arc(nx, ny, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(96, 58, 34, 0.7)";
      ctx.fill();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Shingles in staggered rows, with tabs missing, corners curled and
 * moss along the laps. Rows run across the tile so they land parallel
 * to the eaves.
 */
export function makeShingleTexture(seed = 7): THREE.CanvasTexture {
  const S = 512;
  const ROWS = 12;
  const TABS = 8;
  const rowH = S / ROWS;
  const tabW = S / TABS;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  ctx.fillStyle = "#1d1a24"; // the felt underneath, seen through the gaps
  ctx.fillRect(0, 0, S, S);

  for (let r = 0; r < ROWS; r++) {
    const top = r * rowH;
    const offset = (r % 2) * (tabW / 2);
    for (let t = -1; t < TABS + 1; t++) {
      const x = t * tabW + offset;
      if (rand() < 0.07) continue; // blown clean off
      const tone = 46 + Math.floor(rand() * 24);
      ctx.fillStyle = `rgb(${tone + 8}, ${tone + 2}, ${tone + 14})`;
      ctx.fillRect(x + 1, top, tabW - 2, rowH * 1.35);
      // curled lower edge catches the light
      if (rand() < 0.3) {
        ctx.fillStyle = "rgba(216, 208, 226, 0.13)";
        ctx.fillRect(x + 1, top + rowH * 1.35 - 3, tabW - 2, 3);
      }
      // grain down the tab
      ctx.strokeStyle = "rgba(10, 7, 14, 0.25)";
      ctx.lineWidth = 0.8;
      for (let g = 0; g < 2; g++) {
        const gx = x + 4 + rand() * (tabW - 8);
        ctx.beginPath();
        ctx.moveTo(gx, top + 2);
        ctx.lineTo(gx + (rand() - 0.5) * 3, top + rowH * 1.25);
        ctx.stroke();
      }
    }
    // shadow cast by the course above
    ctx.fillStyle = "rgba(8, 5, 12, 0.45)";
    ctx.fillRect(0, top, S, 3);
  }

  // moss gathering along the laps
  for (let m = 0; m < 90; m++) {
    const mx = rand() * S;
    const my = Math.floor(rand() * ROWS) * rowH + rand() * 6;
    ctx.beginPath();
    ctx.arc(mx, my, 2 + rand() * 9, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${52 + rand() * 22}, ${70 + rand() * 26}, 44, ${
      0.08 + rand() * 0.18
    })`;
    ctx.fill();
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Vertical planks, iron straps, and daylight showing through the splits. */
export function makeDoorTexture(seed = 11): THREE.CanvasTexture {
  const W = 256;
  const H = 400;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  ctx.fillStyle = "#0d0910"; // the dark of the house, behind the splits
  ctx.fillRect(0, 0, W, H);

  const PLANKS = 5;
  const pw = W / PLANKS;
  for (let p = 0; p < PLANKS; p++) {
    const tone = 40 + Math.floor(rand() * 22);
    ctx.fillStyle = `rgb(${tone + 14}, ${tone + 4}, ${tone})`;
    // each plank a hair narrower than its slot, so the gaps read black
    ctx.fillRect(p * pw + 2, 0, pw - 4, H);
    for (let g = 0; g < 14; g++) {
      const gx = p * pw + 4 + rand() * (pw - 8);
      ctx.strokeStyle = `rgba(12, 8, 14, ${0.15 + rand() * 0.25})`;
      ctx.lineWidth = 0.7 + rand();
      ctx.beginPath();
      ctx.moveTo(gx, rand() * 40);
      ctx.bezierCurveTo(gx + 4, H * 0.35, gx - 4, H * 0.7, gx + 2, H);
      ctx.stroke();
    }
    // a split running part-way up
    if (rand() < 0.6) {
      const sx = p * pw + 6 + rand() * (pw - 12);
      const sy = rand() < 0.5 ? 0 : H;
      ctx.strokeStyle = "rgba(6, 4, 8, 0.9)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rand() - 0.5) * 8, sy === 0 ? H * 0.45 : H * 0.55);
      ctx.stroke();
    }
  }

  // damp at the foot
  const damp = ctx.createLinearGradient(0, H, 0, H * 0.6);
  damp.addColorStop(0, "rgba(24, 34, 24, 0.55)");
  damp.addColorStop(1, "rgba(24, 34, 24, 0)");
  ctx.fillStyle = damp;
  ctx.fillRect(0, 0, W, H);

  // keyhole and a ring handle, drawn rather than modelled — they're
  // 20mm details on a door that's four metres from the camera
  ctx.fillStyle = "rgba(8, 5, 10, 0.95)";
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.54, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(W * 0.78 - 2, H * 0.54, 4, 11);
  ctx.strokeStyle = "rgba(112, 96, 78, 0.85)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.44, 16, 0, Math.PI * 2);
  ctx.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A corner web, with its hub in the top-left of the canvas so a caller
 * can rotate the plane to put it in whichever corner it needs.
 *
 * Spokes out from the hub, then rings strung between them that sag
 * under their own weight, and a couple of strands already broken.
 */
export function makeCobwebTexture(seed = 5): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);
  ctx.clearRect(0, 0, S, S);

  const SPOKES = 6 + Math.floor(rand() * 3);
  const angles: number[] = [];
  for (let i = 0; i < SPOKES; i++) {
    // fanned across the quarter turn the corner gives us
    angles.push(((i + 0.5) / SPOKES) * (Math.PI / 2) + (rand() - 0.5) * 0.08);
  }
  const reach = S * (0.85 + rand() * 0.15);

  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(232, 238, 250, 0.42)";
  ctx.lineWidth = 1.2;
  for (const a of angles) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * reach, Math.sin(a) * reach);
    ctx.stroke();
  }
  // the two anchor lines along the walls themselves
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(reach, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, reach);
  ctx.stroke();

  const RINGS = 9;
  for (let r = 1; r <= RINGS; r++) {
    const rad = (r / RINGS) * reach * (0.92 + rand() * 0.12);
    const broken = rand() < 0.22 ? Math.floor(rand() * SPOKES) : -1;
    ctx.strokeStyle = `rgba(226, 234, 248, ${0.6 - r * 0.022})`;
    ctx.lineWidth = 1.15;
    const all = [0, ...angles, Math.PI / 2];
    for (let i = 0; i < all.length - 1; i++) {
      if (i === broken) continue; // a strand that's given way
      const a0 = all[i];
      const a1 = all[i + 1];
      const x0 = Math.cos(a0) * rad;
      const y0 = Math.sin(a0) * rad;
      const x1 = Math.cos(a1) * rad;
      const y1 = Math.sin(a1) * rad;
      // The control point sits a little inside the ring, which is what
      // gives each strand its sag. Pull it much further in than this
      // and the rings vanish, leaving a starburst of spokes.
      const am = (a0 + a1) / 2;
      const sag = rad * (0.94 - r * 0.006);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(Math.cos(am) * sag, Math.sin(am) * sag, x1, y1);
      ctx.stroke();
    }
  }

  // a few torn strands trailing off the web
  ctx.strokeStyle = "rgba(226, 234, 248, 0.3)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const a = rand() * (Math.PI / 2);
    const r0 = reach * (0.4 + rand() * 0.5);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.quadraticCurveTo(
      Math.cos(a) * r0 + (rand() - 0.5) * 40,
      Math.sin(a) * r0 + 20 + rand() * 30,
      Math.cos(a) * r0 + (rand() - 0.5) * 30,
      Math.sin(a) * r0 + 40 + rand() * 40
    );
    ctx.stroke();
  }

  // dust caught in it, which is what makes a web visible at all
  for (let i = 0; i < 40; i++) {
    const a = rand() * (Math.PI / 2);
    const r0 = rand() * reach;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r0, Math.sin(a) * r0, 0.8 + rand() * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(214, 222, 238, ${0.12 + rand() * 0.25})`;
    ctx.fill();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ */
/*  Parts                                                              */
/* ------------------------------------------------------------------ */

type Corner = "tl" | "tr" | "bl" | "br";

/** Rotation that moves the texture's hub to the requested corner. */
const CORNER_SPIN: Record<Corner, number> = {
  tl: 0,
  tr: -Math.PI / 2,
  br: Math.PI,
  bl: Math.PI / 2,
};
/** Which way the plane's centre sits from that corner, per half-size. */
const CORNER_SHIFT: Record<Corner, [number, number]> = {
  tl: [1, -1],
  tr: [-1, -1],
  br: [-1, 1],
  bl: [1, 1],
};

/**
 * A web strung across one corner of an opening. `x, y` is the corner
 * itself; the plane is placed and spun so the web's hub lands on it.
 */
function Cobweb({
  texture,
  x,
  y,
  z,
  size,
  corner,
  opacity = 0.85,
  color = "#ffffff",
}: {
  texture: THREE.Texture;
  x: number;
  y: number;
  z: number;
  size: number;
  corner: Corner;
  opacity?: number;
  /** Tints the strands. A web over a lit pane has to read dark. */
  color?: string;
}) {
  const [sx, sy] = CORNER_SHIFT[corner];
  return (
    <mesh
      position={[x + (sx * size) / 2, y + (sy * size) / 2, z]}
      rotation={[0, 0, CORNER_SPIN[corner]]}
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * One lit window, recessed into its reveal. A ghost drifts behind the
 * glass on its own random schedule, so sightings never line up across
 * windows.
 */
function Window({
  x,
  y,
  w,
  h,
  seed,
  ramp,
  web,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  ramp: THREE.Texture;
  web: THREE.Texture;
}) {
  const inner = FRONT_Z - WALL_T; // the back of the reveal
  return (
    <group position={[x, y, 0]}>
      {/* the lit pane, sitting at the back of the reveal */}
      <mesh position={[0, 0, inner + 0.02]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#d9b25c" />
      </mesh>

      {/* the ghost lives between the pane and the glazing bars, so it
          genuinely reads as being behind the glass */}
      <group position={[0, 0, inner + 0.06]}>
        <WindowGhost w={w} h={h} seed={seed} />
      </group>

      {/* glazing bars, in front of the ghost */}
      <mesh position={[0, 0, inner + 0.15]}>
        <boxGeometry args={[w * 0.05, h, 0.03]} />
        <meshToonMaterial color="#241c22" gradientMap={ramp} />
      </mesh>
      <mesh position={[0, 0, inner + 0.15]}>
        <boxGeometry args={[w, h * 0.05, 0.03]} />
        <meshToonMaterial color="#241c22" gradientMap={ramp} />
      </mesh>

      {/* sill, proud of the facade and rotted at the ends */}
      <mesh position={[0, -h / 2 - 0.05, FRONT_Z + 0.04]} castShadow>
        <boxGeometry args={[w * 1.2, 0.09, 0.22]} />
        <meshToonMaterial color="#3a3140" gradientMap={ramp} />
      </mesh>

      {/* Webs across the top corners of the opening, in front of the
          glazing bars. Tinted dark: a pale web on a lit pane is
          invisible, a dark one silhouettes against it. */}
      <Cobweb
        texture={web}
        x={-w / 2}
        y={h / 2}
        z={inner + 0.19}
        size={w * 0.5}
        corner="tl"
        opacity={0.85}
        color="#2b2430"
      />
      <Cobweb
        texture={web}
        x={w / 2}
        y={h / 2}
        z={inner + 0.19}
        size={w * 0.4}
        corner="tr"
        opacity={0.7}
        color="#2b2430"
      />
    </group>
  );
}

/**
 * The front door, hung on the face of the wall so it never swings
 * through it. `doorSwing` turns the wind into an angle; the door only
 * ever opens outwards, towards whoever is standing there.
 */
function FrontDoor({
  ramp,
  texture,
  web,
}: {
  ramp: THREE.Texture;
  texture: THREE.Texture;
  web: THREE.Texture;
}) {
  const hinge = useRef<THREE.Group>(null);
  const LEAF_W = 1.26;
  const LEAF_H = 2.0;
  // hinged on the left jamb, a hair proud of the facade
  const hingeX = DOOR.x - DOOR.w / 2 - 0.05;

  useFrame((state) => {
    if (hinge.current) {
      hinge.current.rotation.y = -doorSwing(state.clock.elapsedTime, 1);
    }
  });

  return (
    <group>
      {/* Sickly light from somewhere inside, so the opening isn't a
          black rectangle when the door stands wide. */}
      <mesh position={[DOOR.x, DOOR.h / 2, FRONT_Z - WALL_T - 0.01]}>
        <planeGeometry args={[DOOR.w, DOOR.h]} />
        <meshBasicMaterial color="#2a1d12" />
      </mesh>
      <pointLight
        position={[DOOR.x, 1.1, FRONT_Z - 0.5]}
        color="#c2761f"
        intensity={1.1}
        distance={3.2}
        decay={2}
      />

      {/* lintel over the opening */}
      <mesh position={[DOOR.x, DOOR.h + 0.09, FRONT_Z + 0.05]} castShadow>
        <boxGeometry args={[DOOR.w + 0.5, 0.18, 0.26]} />
        <meshToonMaterial color="#332b38" gradientMap={ramp} />
      </mesh>

      <group ref={hinge} position={[hingeX, 0, FRONT_Z + 0.03]}>
        <mesh position={[LEAF_W / 2, LEAF_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[LEAF_W, LEAF_H, 0.07]} />
          <meshToonMaterial map={texture} gradientMap={ramp} />
        </mesh>
        {/* iron straps, rusted through */}
        {[0.35, 1.62].map((sy, i) => (
          <mesh key={i} position={[LEAF_W / 2 - 0.08, sy, 0.05]}>
            <boxGeometry args={[LEAF_W * 0.8, 0.09, 0.03]} />
            <meshToonMaterial color="#2b2118" gradientMap={ramp} />
          </mesh>
        ))}
        {/* a web in the hinge corner, stretched by the swing */}
        <Cobweb
          texture={web}
          x={0.02}
          y={LEAF_H - 0.02}
          z={0.06}
          size={0.5}
          corner="tl"
          opacity={0.7}
        />
      </group>

      {/* webs across the top of the doorway itself */}
      <Cobweb
        texture={web}
        x={DOOR.x - DOOR.w / 2 - 0.12}
        y={DOOR.h + 0.02}
        z={FRONT_Z + 0.16}
        size={0.62}
        corner="tl"
      />
      <Cobweb
        texture={web}
        x={DOOR.x + DOOR.w / 2 + 0.12}
        y={DOOR.h + 0.02}
        z={FRONT_Z + 0.16}
        size={0.54}
        corner="tr"
        opacity={0.7}
      />

      {/* two sunken steps up to the threshold */}
      <mesh position={[DOOR.x, 0.07, FRONT_Z + 0.32]} receiveShadow castShadow>
        <boxGeometry args={[1.8, 0.14, 0.55]} />
        <meshToonMaterial color="#514a52" gradientMap={ramp} />
      </mesh>
      <mesh
        position={[DOOR.x - 0.05, 0.03, FRONT_Z + 0.82]}
        rotation={[0, 0.04, 0.015]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[2.05, 0.11, 0.5]} />
        <meshToonMaterial color="#4a444d" gradientMap={ramp} />
      </mesh>
    </group>
  );
}

/** The window they gave up on: dark glass with planks nailed across it. */
function BoardedWindow({ ramp }: { ramp: THREE.Texture }) {
  const boards = [
    { y: 0.22, tilt: 0.09, w: 1.05 },
    { y: -0.04, tilt: -0.05, w: 1.15 },
    { y: -0.28, tilt: 0.13, w: 0.95 },
  ];
  return (
    <group position={[BOARDED.x, BOARDED.y, 0]}>
      <mesh position={[0, 0, FRONT_Z - WALL_T + 0.02]}>
        <planeGeometry args={[BOARDED.w, BOARDED.h]} />
        <meshBasicMaterial color="#120d15" />
      </mesh>
      {boards.map((b, i) => (
        <mesh
          key={i}
          position={[0, b.y, FRONT_Z + 0.03]}
          rotation={[0, 0, b.tilt]}
          castShadow
        >
          <boxGeometry args={[BOARDED.w * b.w, 0.17, 0.05]} />
          <meshToonMaterial color="#463a2e" gradientMap={ramp} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  The house                                                          */
/* ------------------------------------------------------------------ */

export function HauntedHouse() {
  // More steps than the scene's shared 3-step ramp: the clapboard laps
  // and the roof sag only read if the shading has somewhere to go.
  const ramp = useMemo(() => makeToonRamp([58, 100, 146, 192, 234, 255]), []);

  const wallMap = useMemo(() => {
    const t = makePlankTexture(3);
    t.repeat.set(1 / WALL_TILE, 1 / WALL_TILE);
    return t;
  }, []);
  const roofMap = useMemo(() => {
    const t = makeShingleTexture(7);
    t.repeat.set(1.5, 3);
    return t;
  }, []);
  const towerMap = useMemo(() => {
    const t = makeShingleTexture(19);
    t.repeat.set(4, 2.4);
    return t;
  }, []);
  const doorMap = useMemo(() => makeDoorTexture(11), []);
  const webs = useMemo(
    () => [makeCobwebTexture(5), makeCobwebTexture(23), makeCobwebTexture(61)],
    []
  );

  const front = useMemo(
    () =>
      makeWallGeometry(BLOCK_W, BLOCK_H, [
        holePath(DOOR.x, DOOR.h / 2, DOOR.w, DOOR.h),
        holePath(BOARDED.x, BOARDED.y, BOARDED.w, BOARDED.h),
        ...WINDOWS.map((w) => holePath(w.x, w.y, w.w, w.h)),
      ]),
    []
  );
  const back = useMemo(() => makeWallGeometry(BLOCK_W, BLOCK_H), []);
  const side = useMemo(() => makeWallGeometry(BLOCK_D, BLOCK_H), []);
  const roof = useMemo(() => makeRoofGeometry(4), []);
  const gable = useMemo(() => makeGableGeometry(), []);

  useEffect(
    () => () => {
      ramp.dispose();
      wallMap.dispose();
      roofMap.dispose();
      towerMap.dispose();
      doorMap.dispose();
      webs.forEach((w) => w.dispose());
      front.dispose();
      back.dispose();
      side.dispose();
      roof.dispose();
      gable.dispose();
    },
    [ramp, wallMap, roofMap, towerMap, doorMap, webs, front, back, side, roof, gable]
  );

  return (
    // The whole house leans a touch, and is sunk far enough that the
    // low corner still meets the ground.
    <group position={[0, -0.05, 0]} rotation={[0, 0, -0.013]}>
      {/* Darkness behind every opening. Slightly inside the shell, so
          it can't poke through a reveal. */}
      <mesh position={[0, BLOCK_H / 2, 0]}>
        <boxGeometry args={[BLOCK_W - 0.5, BLOCK_H - 0.1, BLOCK_D - 0.5]} />
        <meshBasicMaterial color="#0b0810" />
      </mesh>

      {/* four wall panels, so the openings are holes rather than paint */}
      <mesh geometry={front} position={[0, 0, FRONT_Z - WALL_T]} castShadow receiveShadow>
        <meshToonMaterial map={wallMap} gradientMap={ramp} />
      </mesh>
      <mesh geometry={back} position={[0, 0, -FRONT_Z]} castShadow receiveShadow>
        <meshToonMaterial map={wallMap} gradientMap={ramp} />
      </mesh>
      <mesh
        geometry={side}
        position={[-BLOCK_W / 2, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshToonMaterial map={wallMap} gradientMap={ramp} />
      </mesh>
      <mesh
        geometry={side}
        position={[BLOCK_W / 2 - WALL_T, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshToonMaterial map={wallMap} gradientMap={ramp} />
      </mesh>

      {/* roof, gable ends and the eave boards that give it an edge */}
      <mesh geometry={roof} position={[0, BLOCK_H, 0]} castShadow receiveShadow>
        <meshToonMaterial
          map={roofMap}
          gradientMap={ramp}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[FRONT_Z - WALL_T, -FRONT_Z].map((z, i) => (
        <mesh key={i} geometry={gable} position={[0, BLOCK_H, z]} castShadow>
          <meshToonMaterial map={wallMap} gradientMap={ramp} />
        </mesh>
      ))}
      {/* the attic vent, boarded over like everything else */}
      <mesh position={[0, BLOCK_H + 0.85, FRONT_Z - WALL_T - 0.01]}>
        <planeGeometry args={[0.78, 0.66]} />
        <meshBasicMaterial color="#0e0a12" />
      </mesh>
      {[-0.11, 0.13].map((y, i) => (
        <mesh
          key={i}
          position={[0, BLOCK_H + 0.85 + y, FRONT_Z + 0.02]}
          rotation={[0, 0, i ? -0.08 : 0.06]}
        >
          <boxGeometry args={[0.86, 0.12, 0.04]} />
          <meshToonMaterial color="#413527" gradientMap={ramp} />
        </mesh>
      ))}
      {/* Bargeboards down the gable rake — the trim that rots first,
          and the thing that stops the roof meeting the wall in a bare
          line. */}
      {[-1, 1].map((s) => {
        const rake = Math.atan2(ROOF_RISE, BLOCK_W / 2);
        return (
          <mesh
            key={`rake${s}`}
            position={[(s * BLOCK_W) / 4, BLOCK_H + ROOF_RISE / 2, FRONT_Z + 0.02]}
            rotation={[0, 0, -s * rake]}
            castShadow
          >
            <boxGeometry
              args={[Math.hypot(BLOCK_W / 2, ROOF_RISE) + 0.25, 0.19, 0.11]}
            />
            <meshToonMaterial color="#332a37" gradientMap={ramp} />
          </mesh>
        );
      })}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (ROOF_HALF_SPAN - 0.06), BLOCK_H - 0.02, 0]}
          rotation={[0, 0, s * 0.58]}
          castShadow
        >
          <boxGeometry args={[0.16, 0.13, ROOF_DEPTH]} />
          <meshToonMaterial color="#2a232f" gradientMap={ramp} />
        </mesh>
      ))}

      {/* tower, for the lopsided silhouette */}
      <mesh position={[TOWER_X, TOWER_H / 2, 0.4]} castShadow receiveShadow>
        <boxGeometry args={[1.9, TOWER_H, 1.9]} />
        <meshToonMaterial map={wallMap} gradientMap={ramp} />
      </mesh>
      <mesh
        position={[TOWER_X, TOWER_H + 1.5, 0.4]}
        rotation={[0.02, 0.2, -0.045]}
        castShadow
      >
        <coneGeometry args={[1.5, 3.0, 8]} />
        <meshToonMaterial map={towerMap} gradientMap={ramp} />
      </mesh>

      {/* chimney, half fallen down */}
      <mesh position={[2.35, 6.3, -0.7]} castShadow>
        <boxGeometry args={[0.75, 2.4, 0.75]} />
        <meshToonMaterial map={wallMap} gradientMap={ramp} />
      </mesh>
      <mesh position={[2.5, 7.52, -0.62]} rotation={[0.04, 0.3, 0.07]} castShadow>
        <boxGeometry args={[0.82, 0.22, 0.82]} />
        <meshToonMaterial color="#2f2833" gradientMap={ramp} />
      </mesh>
      <mesh position={[2.18, 7.36, -0.86]} rotation={[0.1, -0.2, -0.2]} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.3]} />
        <meshToonMaterial color="#332b38" gradientMap={ramp} />
      </mesh>

      <FrontDoor ramp={ramp} texture={doorMap} web={webs[0]} />
      <BoardedWindow ramp={ramp} />
      {WINDOWS.map((w, i) => (
        <Window
          key={i}
          {...w}
          seed={i + 1}
          ramp={ramp}
          web={webs[i % webs.length]}
        />
      ))}

      {/* a couple of boards sprung off the facade */}
      <mesh position={[-2.8, 3.9, FRONT_Z + 0.06]} rotation={[0.2, 0, 0.22]} castShadow>
        <boxGeometry args={[0.9, 0.16, 0.05]} />
        <meshToonMaterial color="#3e3444" gradientMap={ramp} />
      </mesh>
      <mesh position={[2.9, 4.6, FRONT_Z + 0.05]} rotation={[-0.15, 0, -0.3]} castShadow>
        <boxGeometry args={[0.7, 0.15, 0.05]} />
        <meshToonMaterial color="#443a49" gradientMap={ramp} />
      </mesh>

      {/* small webs tucked under the eaves — these were a metre across
          and read as sheeting hung over the front of the house */}
      <Cobweb
        texture={webs[1]}
        x={BLOCK_W / 2 - 0.06}
        y={BLOCK_H - 0.06}
        z={FRONT_Z + 0.02}
        size={0.5}
        corner="tr"
        opacity={0.5}
      />
      <Cobweb
        texture={webs[2]}
        x={-BLOCK_W / 2 + 0.06}
        y={BLOCK_H - 0.06}
        z={FRONT_Z + 0.02}
        size={0.44}
        corner="tl"
        opacity={0.45}
      />
    </group>
  );
}
