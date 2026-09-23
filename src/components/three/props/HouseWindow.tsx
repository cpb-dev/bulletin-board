"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  brokenLight,
  candleFlicker,
  lightRect,
  misted,
  paneGrid,
  type PaneGrid,
} from "@/lib/window-pane";
import { decayMark, type MarkKind } from "@/lib/ghost";
import { mulberry32 } from "../textures";
import { CornerWeb } from "./CornerWeb";
import { GlassMark, makeMarkTexture } from "./GlassMark";
import { WindowGhost, type GhostFreeze } from "./WindowGhost";

/**
 * One lit window of the haunted house, recessed into its reveal.
 *
 * It was a rectangle of flat `#d9b25c` behind a single cross of
 * glazing bars — five of them, identical and perfectly steady. Now
 * each has its own filthy glass with a lamp guttering somewhere
 * behind it, a proper grid of lights, and about half the time one
 * light broken out.
 *
 * A ghost drifts behind the glass on its own schedule, and the pane
 * dims as it passes, so a sighting is something you catch in the light
 * changing as much as in the figure.
 *
 * Haunted Hollow only — rendered from `HauntedHouse.tsx`.
 */

/** Width of a glazing bar, as a fraction of the pane's smaller side. */
const BAR = 0.042;

/*
 * Where the parts of the window sit in the reveal, measured from the
 * back of it.
 *
 * The sash sits near the outside face of the wall, not half way down
 * the reveal. That is where a sash actually is, and it also leaves the
 * ghost room to come up to the glass without its shoulders pushing
 * through the glazing bars — which is what the first attempt did, and
 * it read as a ghost standing in the street.
 */
const GLASS_Z = 0.02;
const GHOST_Z = 0.05;
const MARK_Z = 0.14;
const SASH_Z = 0.18;
const WEB_Z = 0.21;

/** How far the thrown light reaches past the opening, in openings. */
const SPILL_W = 2.6;
const SPILL_H = 2.3;

export function HouseWindow({
  x,
  y,
  w,
  h,
  seed,
  /** Z of the back of the reveal — the glass sits just in front. */
  inner,
  frontZ,
  ramp,
  web,
  freeze,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  inner: number;
  frontZ: number;
  ramp: THREE.Texture;
  web: THREE.Texture;
  /** Dev harness only: hold a ghost still part-way through a pass. */
  freeze?: GhostFreeze;
}) {
  const grid = useMemo(() => paneGrid(w, h), [w, h]);
  const broken = useMemo(() => brokenLight(seed, grid), [seed, grid]);

  const pane = useMemo(
    () => makePaneTexture(seed, grid, broken, misted(seed)),
    [seed, grid, broken]
  );
  const spill = useMemo(
    () => makeSpillTexture(1 / SPILL_W, 1 / SPILL_H),
    []
  );
  useEffect(() => {
    return () => {
      pane.dispose();
      spill.dispose();
    };
  }, [pane, spill]);

  const paneMat = useRef<THREE.MeshBasicMaterial>(null);
  const spillMat = useRef<THREE.MeshBasicMaterial>(null);
  const markMat = useRef<THREE.MeshBasicMaterial>(null);
  /** The ghost writes what it is doing to this window here. */
  const shadow = useRef(0);
  const pressing = useRef(0);
  const markKind = useRef<MarkKind>("none");
  /** How much of a print is currently on the glass. */
  const marked = useRef(0);
  const [shownMark, setShownMark] = useState<MarkKind>("none");

  const marks = useMemo(
    () => ({
      palms: makeMarkTexture("palms", seed),
      drag: makeMarkTexture("drag", seed),
      face: makeMarkTexture("face", seed),
    }),
    [seed]
  );
  useEffect(() => {
    const held = marks;
    return () => {
      for (const t of Object.values(held)) t.dispose();
    };
  }, [marks]);

  useFrame((state, rawDelta) => {
    const f = candleFlicker(state.clock.elapsedTime, seed);
    // A basic material's colour multiplies its map, so a grey dims the
    // whole pane without touching the warmth the texture carries.
    const lit = f * (1 - shadow.current * 0.72);
    paneMat.current?.color.setScalar(lit);
    // the light thrown onto the boards follows the lamp, a touch softer
    if (spillMat.current) spillMat.current.opacity = 0.3 * (0.45 + lit * 0.55);

    /*
     * The print on the glass. It outlives whatever made it — that is
     * the whole point of a handprint — so this decays on its own and
     * takes what the ghost is pressing right now as a floor.
     */
    const kind = markKind.current;
    if (kind !== "none" && pressing.current > 0 && shownMark !== kind) {
      setShownMark(kind);
    }
    marked.current = decayMark(
      marked.current,
      kind === "none" ? 0 : pressing.current,
      Math.min(rawDelta, 1 / 20)
    );
    if (markMat.current) {
      // brighter while the lamp is up, since it is the lamp coming
      // through the glass the hand wiped clean
      markMat.current.opacity = marked.current * 0.85 * (0.5 + lit * 0.5);
    }
  });

  const bar = Math.min(w, h) * BAR;

  return (
    <group position={[x, y, 0]}>
      {/* the filthy glass, at the back of the reveal */}
      <mesh position={[0, 0, inner + GLASS_Z]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial ref={paneMat} map={pane} toneMapped={false} />
      </mesh>

      {/* The ghost lives between the glass and the glazing bars, so it
          genuinely reads as being behind them. */}
      <group position={[0, 0, inner + GHOST_Z]}>
        <WindowGhost
          w={w}
          h={h}
          seed={seed}
          shadow={shadow}
          mark={pressing}
          markKind={markKind}
          freeze={freeze}
        />
      </group>

      {/* What it left behind, sitting in the grime on the glass. */}
      <GlassMark
        w={w}
        h={h}
        z={inner + MARK_Z}
        texture={shownMark === "none" ? null : marks[shownMark]}
        material={markMat}
      />

      {/* Glazing bars on the grid the glass was painted from, so a bar
          always lands on the join between two lights. */}
      <Muntins
        w={w}
        h={h}
        grid={grid}
        bar={bar}
        z={inner + SASH_Z}
        ramp={ramp}
      />

      {/* sash frame around the opening */}
      {([[0, h / 2], [0, -h / 2]] as const).map(([bx, by], i) => (
        <mesh key={`h${i}`} position={[bx, by, inner + SASH_Z]}>
          <boxGeometry args={[w + bar, bar * 1.5, 0.035]} />
          <meshToonMaterial color="#2a2028" gradientMap={ramp} />
        </mesh>
      ))}
      {([[-w / 2, 0], [w / 2, 0]] as const).map(([bx, by], i) => (
        <mesh key={`v${i}`} position={[bx, by, inner + SASH_Z]}>
          <boxGeometry args={[bar * 1.5, h + bar, 0.035]} />
          <meshToonMaterial color="#2a2028" gradientMap={ramp} />
        </mesh>
      ))}

      {/* sill, proud of the facade and rotted at the ends */}
      <mesh position={[0, -h / 2 - 0.05, frontZ + 0.04]} castShadow>
        <boxGeometry args={[w * 1.2, 0.09, 0.22]} />
        <meshToonMaterial color="#3a3140" gradientMap={ramp} />
      </mesh>

      {/* Lamplight thrown onto the boards around the opening. Additive,
          so it brightens the clapboard rather than painting a grey
          rectangle over it. */}
      <mesh position={[0, 0, frontZ + 0.012]}>
        <planeGeometry args={[w * SPILL_W, h * SPILL_H]} />
        <meshBasicMaterial
          ref={spillMat}
          map={spill}
          color="#ffca72"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Webs across the top corners of the opening, in front of the
          glazing bars. Tinted dark: a pale web on a lit pane is
          invisible, a dark one silhouettes against it. */}
      <CornerWeb
        texture={web}
        x={-w / 2}
        y={h / 2}
        z={inner + WEB_Z}
        size={w * 0.5}
        corner="tl"
        opacity={0.85}
        color="#2b2430"
      />
      <CornerWeb
        texture={web}
        x={w / 2}
        y={h / 2}
        z={inner + WEB_Z}
        size={w * 0.4}
        corner="tr"
        opacity={0.7}
        color="#2b2430"
      />
    </group>
  );
}

/** The internal glazing bars, one per join between lights. */
function Muntins({
  w,
  h,
  grid,
  bar,
  z,
  ramp,
}: {
  w: number;
  h: number;
  grid: PaneGrid;
  bar: number;
  z: number;
  ramp: THREE.Texture;
}) {
  return (
    <group position={[0, 0, z]}>
      {Array.from({ length: grid.cols - 1 }, (_, i) => (
        <mesh key={`c${i}`} position={[(-0.5 + (i + 1) / grid.cols) * w, 0, 0]}>
          <boxGeometry args={[bar, h, 0.03]} />
          <meshToonMaterial color="#241c22" gradientMap={ramp} />
        </mesh>
      ))}
      {Array.from({ length: grid.rows - 1 }, (_, i) => (
        <mesh key={`r${i}`} position={[0, (-0.5 + (i + 1) / grid.rows) * h, 0]}>
          <boxGeometry args={[w, bar, 0.03]} />
          <meshToonMaterial color="#241c22" gradientMap={ramp} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Draws the glass: a lamp burning somewhere back in the room, seen
 * through years of grime.
 *
 * Painted pale and warm rather than at full strength, because the
 * material's colour multiplies this and the flicker needs headroom to
 * push it either way.
 */
function makePaneTexture(
  seed: number,
  grid: PaneGrid,
  broken: number | null,
  fogged: boolean
): THREE.CanvasTexture {
  const W = 256;
  const H = 332;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed * 40961 + 7);

  /** Pane coords (0..1 from the bottom left) to canvas pixels. */
  const px = (u: number) => u * W;
  const py = (v: number) => (1 - v) * H;

  // the room behind, which is mostly not lit at all
  ctx.fillStyle = "#0d0907";
  ctx.fillRect(0, 0, W, H);

  /*
   * The lamp, low and off to one side so the light has a direction
   * rather than sitting dead centre like a bulb.
   *
   * The falloff is the whole thing. Spread over the full pane it
   * covers every corner at close to full strength and the window
   * comes out as a rectangle of cream paint; pulled in to about half
   * the pane it reads as one small flame a long way back in a room
   * that is otherwise dark.
   */
  const lampU = 0.32 + rand() * 0.36;
  const lampV = 0.22 + rand() * 0.22;
  // a dim wash first, so the dark parts are a room and not a void
  const room = ctx.createRadialGradient(
    px(lampU),
    py(lampV),
    0,
    px(lampU),
    py(lampV),
    W * 1.25
  );
  room.addColorStop(0, "rgba(140, 92, 40, 0.5)");
  room.addColorStop(0.5, "rgba(96, 60, 24, 0.24)");
  room.addColorStop(1, "rgba(60, 36, 14, 0)");
  ctx.fillStyle = room;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(
    px(lampU),
    py(lampV),
    1,
    px(lampU),
    py(lampV),
    W * 0.6
  );
  glow.addColorStop(0, "#fff1c9");
  glow.addColorStop(0.1, "#f4cd83");
  glow.addColorStop(0.3, "#b9762f");
  glow.addColorStop(0.62, "#4a2c12");
  glow.addColorStop(1, "rgba(13, 9, 7, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Something standing between the lamp and the glass. Soft-edged —
  // a hard ellipse reads as a thumbprint on the lens.
  const obU = rand() < 0.5 ? 0.14 : 0.86;
  const ob = ctx.createRadialGradient(
    px(obU),
    py(0.12),
    0,
    px(obU),
    py(0.12),
    W * 0.34
  );
  ob.addColorStop(0, "rgba(9, 6, 5, 0.75)");
  ob.addColorStop(0.6, "rgba(9, 6, 5, 0.4)");
  ob.addColorStop(1, "rgba(9, 6, 5, 0)");
  ctx.fillStyle = ob;
  ctx.fillRect(0, 0, W, H);

  /*
   * Grime, as streaks running down the glass.
   *
   * Drawn as a sum of sines across the pane rather than a random walk:
   * the streaks have to stay vertical and stay put, and a walk wanders
   * off into a smear that reads as a smudged thumbprint on the lens.
   */
  for (let i = 0; i < 34; i++) {
    const u = rand();
    const width = 1 + rand() * 6;
    const top = rand() * 0.5;
    const drop = 0.3 + rand() * 0.7;
    const g = ctx.createLinearGradient(0, py(1 - top), 0, py(1 - top - drop));
    const a = 0.1 + rand() * 0.28;
    g.addColorStop(0, `rgba(26, 20, 14, ${a})`);
    g.addColorStop(1, "rgba(26, 20, 14, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(px(u), py(1 - top), width, H * drop);
  }

  // dust gathered in every corner of every light
  for (let i = 0; i < grid.cols * grid.rows; i++) {
    const r = lightRect(grid, i);
    for (const [cu, cv] of [
      [r.x0, r.y0],
      [r.x1, r.y0],
      [r.x0, r.y1],
      [r.x1, r.y1],
    ]) {
      const rad = W * (0.035 + rand() * 0.035);
      const d = ctx.createRadialGradient(px(cu), py(cv), 0, px(cu), py(cv), rad);
      d.addColorStop(0, "rgba(16, 11, 8, 0.5)");
      d.addColorStop(1, "rgba(16, 11, 8, 0)");
      ctx.fillStyle = d;
      ctx.fillRect(px(cu) - rad, py(cv) - rad, rad * 2, rad * 2);
    }
  }

  // dirt washed down to the bottom rebate of each light
  for (let i = 0; i < grid.cols * grid.rows; i++) {
    const r = lightRect(grid, i);
    const band = (r.y1 - r.y0) * 0.26;
    const g = ctx.createLinearGradient(0, py(r.y0 + band), 0, py(r.y0));
    g.addColorStop(0, "rgba(20, 14, 9, 0)");
    g.addColorStop(1, `rgba(20, 14, 9, ${0.35 + rand() * 0.25})`);
    ctx.fillStyle = g;
    ctx.fillRect(px(r.x0), py(r.y0 + band), px(r.x1 - r.x0), H * band);
  }

  // flyspeck
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(14, 10, 7, ${0.2 + rand() * 0.5})`;
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, 0.4 + rand() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  /*
   * Condensation, on the windows that have it: a bloom across the
   * middle of each light where the warm side meets the cold, with a
   * few tracks run down out of it.
   */
  if (fogged) {
    for (let i = 0; i < grid.cols * grid.rows; i++) {
      const r = lightRect(grid, i);
      const mx = px((r.x0 + r.x1) / 2);
      const my = py((r.y0 + r.y1) / 2 - 0.02);
      const rad = px(r.x1 - r.x0) * 0.72;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, rad);
      g.addColorStop(0, "rgba(236, 226, 206, 0.2)");
      g.addColorStop(0.6, "rgba(236, 226, 206, 0.1)");
      g.addColorStop(1, "rgba(236, 226, 206, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(mx - rad, my - rad, rad * 2, rad * 2);

      for (let n = 0; n < 3; n++) {
        const tx = px(r.x0) + rand() * px(r.x1 - r.x0);
        const from = my + rand() * 10;
        const to = py(r.y0);
        const tg = ctx.createLinearGradient(0, from, 0, to);
        tg.addColorStop(0, "rgba(246, 238, 218, 0)");
        tg.addColorStop(1, `rgba(246, 238, 218, ${0.1 + rand() * 0.12})`);
        ctx.fillStyle = tg;
        ctx.fillRect(tx, from, 1 + rand() * 2, to - from);
      }
    }
  }

  // a crack or two, catching the light along their length
  const cracks = 1 + Math.floor(rand() * 2);
  ctx.lineCap = "round";
  for (let i = 0; i < cracks; i++) {
    const ox = rand() * W;
    const oy = rand() * H;
    const arms = 2 + Math.floor(rand() * 3);
    for (let a = 0; a < arms; a++) {
      let ang = rand() * Math.PI * 2;
      let cx = ox;
      let cy = oy;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const steps = 2 + Math.floor(rand() * 3);
      for (let s = 0; s < steps; s++) {
        ang += (rand() - 0.5) * 0.9;
        const len = 6 + rand() * 20;
        cx += Math.cos(ang) * len;
        cy += Math.sin(ang) * len;
        ctx.lineTo(cx, cy);
      }
      ctx.strokeStyle = `rgba(246, 240, 226, ${0.18 + rand() * 0.22})`;
      ctx.lineWidth = 0.7 + rand() * 0.6;
      ctx.stroke();
    }
  }

  // The light that went. Black, because there is nothing behind it but
  // the room, with the shards that stayed in the rebate around it.
  if (broken !== null) {
    const r = lightRect(grid, broken);
    const x0 = px(r.x0);
    const x1 = px(r.x1);
    const y0 = py(r.y1);
    const y1 = py(r.y0);
    ctx.fillStyle = "#0b0705";
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // a little of the lamp still finds its way through the hole
    const hole = ctx.createRadialGradient(
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      0,
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      (x1 - x0) * 0.75
    );
    hole.addColorStop(0, "rgba(104, 66, 26, 0.3)");
    hole.addColorStop(1, "rgba(104, 66, 26, 0)");
    ctx.fillStyle = hole;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    /*
     * The glass that stayed in the rebate, as teeth pointing into the
     * hole from all four edges.
     *
     * Small and dim. The first attempt drew them white and up to a
     * fifth of the light deep, which from across the room read as a
     * cartoon set of jaws rather than as broken glass.
     */
    ctx.fillStyle = "rgba(196, 209, 214, 0.34)";
    const shards = (
      along: number,
      from: number,
      to: number,
      at: (a: number, d: number) => [number, number]
    ) => {
      let a = from;
      while (a < to) {
        const wid = Math.min(2 + rand() * 6, to - a);
        const deep = 1.5 + rand() * 4.5;
        const [x1p, y1p] = at(a, 0);
        const [x2p, y2p] = at(a + wid, 0);
        const [xa, ya] = at(a + wid / 2, deep);
        ctx.beginPath();
        ctx.moveTo(x1p, y1p);
        ctx.lineTo(x2p, y2p);
        ctx.lineTo(xa, ya);
        ctx.closePath();
        ctx.fill();
        a += wid + rand() * 3;
      }
      void along;
    };
    shards(0, 0, y1 - y0, (a, d) => [x0 + d, y0 + a]);
    shards(1, 0, y1 - y0, (a, d) => [x1 - d, y0 + a]);
    shards(2, 0, x1 - x0, (a, d) => [x0 + a, y0 + d]);
    shards(3, 0, x1 - x0, (a, d) => [x0 + a, y1 - d]);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A soft pool of light for spilling onto the boards round an opening,
 * with the opening itself punched out of it.
 *
 * The hole is the point. Without it the plane is an additive
 * rectangle sitting in front of the whole window, and it washes warm
 * light back over the glass, the glazing bars and the ghost — which
 * looked like the glass had simply come out too bright, and cost a
 * couple of passes chasing the wrong thing.
 */
function makeSpillTexture(holeW: number, holeH: number): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  g.addColorStop(0.34, "rgba(255, 255, 255, 0.34)");
  g.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  /*
   * Punch the opening out, feathering *inwards* from its edge.
   *
   * Inwards matters. Feathering outwards erases a ring of glow right
   * where the light should be strongest, and leaves a dark square
   * halo hugging the window with the glow sitting further out — which
   * reads as a shadow cast by nothing.
   *
   * The hard edge this leaves lands exactly on the edge of the
   * opening, where the wall stops, so there is nothing there to see
   * it against.
   */
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 6; i++) {
    const hw = (holeW * S) / 2 - i * 1.1;
    const hh = (holeH * S) / 2 - i * 1.1;
    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.fillRect(S / 2 - hw, S / 2 - hh, hw * 2, hh * 2);
  }
  ctx.globalCompositeOperation = "source-over";

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
