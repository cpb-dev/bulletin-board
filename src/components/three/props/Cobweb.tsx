"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BOARD, BOARD_SURFACE_Z } from "@/lib/board-geometry";
import {
  EDGE_SWEEP,
  SPIDER_LIFT,
  WEB_LIFT,
  webLayout,
  webPattern,
  WEB_VARIANTS,
  type WebKind,
  type WebPattern,
} from "@/lib/cobweb";
import { scatterStarts } from "@/lib/spider";
import { Spider } from "./Spider";

/**
 * The cobwebs on the Haunted Hollow board, and the spiders that live
 * on them.
 *
 * Four identical quarter-discs, one per corner, each sprawling 0.68
 * units past the frame onto the cork: that is a pattern, and the eye
 * finds a pattern instantly. These hug the frame instead — corners
 * still, but also strung along the top rail and both stiles, at
 * varying sizes, densities and states of repair.
 *
 * Where each one goes and what threads it has is decided in
 * `src/lib/cobweb.ts`; this file only draws.
 *
 * Rendered from the `cobwebs` branch of the board's decor switch, so
 * haunted-hollow alone.
 */

/** Spiders on the board. */
const SPIDERS = 6;

/** Both measured off the cork; see `src/lib/cobweb.ts` for why. */
const WEB_Z = BOARD_SURFACE_Z + WEB_LIFT;
const SPIDER_Z = BOARD_SURFACE_Z + SPIDER_LIFT;

/** A thread's slight wander — nothing a spider spins is straight. */
function thread(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bow: number
) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  // bow perpendicular to the run
  ctx.quadraticCurveTo(mx - dy * bow, my + dx * bow, x1, y1);
  ctx.stroke();
}

/**
 * Draws one web onto a transparent canvas.
 *
 * A corner web is anchored at the canvas's top-left and sweeps a
 * quarter turn; an edge web hangs from the middle of the canvas's top
 * edge and sweeps a half turn, so it drapes off a rail rather than
 * filling a corner. Both leave the rest of the canvas clear, so the
 * plane drapes over the frame instead of sitting on a visible panel.
 */
function drawWeb(
  kind: WebKind,
  pattern: WebPattern,
  w: number,
  h: number
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(236, 236, 243, 1)";

  /*
   * The hub is where every spoke converges.
   *
   * A corner web's hub is the corner itself. An edge web's sits back
   * *behind* the rail, off the top of the canvas, so its spokes cross
   * the rail at a spread of points and diverge from there — a sheet
   * slung under a ledge rather than a fan pinned at one spot. That one
   * offset is the difference between a cobweb and a scallop shell.
   */
  const hx = kind === "corner" ? 0 : w / 2;
  const hy = kind === "corner" ? 0 : -h * 0.62;
  const R = kind === "corner" ? w * 0.8 : h * 1.6;
  // An edge canvas is three times as wide as it is deep precisely so
  // the widest spokes land inside it. A fan clipped by the edge of its
  // own plane shows as a dead straight cut across the threads.
  // an edge web's fan is centred on straight down from the hub
  const turn = kind === "corner" ? 0 : Math.PI / 2 - EDGE_SWEEP / 2;
  const at = (a: number, r: number): [number, number] => [
    hx + Math.cos(a + turn) * r,
    hy + Math.sin(a + turn) * r,
  ];

  /*
   * A wash of dust under the threads.
   *
   * On a board seen from across the room a web is thirty pixels across
   * and every thread in it is a fraction of a pixel wide, so a web
   * drawn as threads alone disappears entirely at any distance. What
   * you actually see from there is the haze the threads add up to — so
   * draw that too, and let the threads be the detail you find when you
   * walk up.
   */
  const wash = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
  wash.addColorStop(0, "rgba(226, 226, 236, 0.26)");
  wash.addColorStop(0.62, "rgba(226, 226, 236, 0.15)");
  wash.addColorStop(1, "rgba(226, 226, 236, 0)");
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.arc(
    hx,
    hy,
    R,
    pattern.spokes[0] + turn,
    pattern.spokes[pattern.spokes.length - 1] + turn
  );
  ctx.closePath();
  ctx.fill();

  // spokes, out from the hub
  for (const a of pattern.spokes) {
    const [x, y] = at(a, R);
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = 0.95;
    thread(ctx, hx, hy, x, y, 0.035);
  }

  // Rings, sagging back towards the hub between each pair of spokes.
  // Each crossing sits at its own radius, so no ring is a true arc.
  pattern.rings.forEach((rr, ring) => {
    ctx.lineWidth = 2.3 - rr * 0.9;
    ctx.globalAlpha = 0.95 - rr * 0.3;
    for (let i = 0; i < pattern.spokes.length - 1; i++) {
      if (pattern.tears.some((t) => t[0] === ring && t[1] === i)) continue;
      const a1 = pattern.spokes[i];
      const a2 = pattern.spokes[i + 1];
      const r1 = rr * R * pattern.wobble[ring][i];
      const r2 = rr * R * pattern.wobble[ring][i + 1];
      const [x1, y1] = at(a1, r1);
      const [x2, y2] = at(a2, r2);
      const mid = (a1 + a2) / 2;
      const [cx, cy] = at(mid, ((r1 + r2) / 2) * (1 - pattern.sag[ring]));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
    }
  });

  // a loose thread trailing off the outer edge
  if (pattern.trail) {
    const outer = pattern.rings[pattern.rings.length - 1] * R;
    const [x0, y0] = at(pattern.trail.angle, outer);
    const [x1, y1] = at(pattern.trail.angle, outer * pattern.trail.length);
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.55;
    thread(ctx, x0, y0, x1, y1, 0.22);
  }

  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Cobwebs() {
  // A handful of textures shared out between the webs, rather than one
  // each: eleven 256px canvases is a few megabytes on a phone, and
  // size, tilt and mirroring already stop them reading as repeats.
  const webs = useMemo(() => {
    const make = (kind: WebKind) =>
      Array.from({ length: WEB_VARIANTS }, (_, i) =>
        kind === "corner"
          ? drawWeb(kind, webPattern(i + 1, kind), 256, 256)
          : drawWeb(kind, webPattern(i + 91, kind), 384, 128)
      );
    return { corner: make("corner"), edge: make("edge") };
  }, []);

  useEffect(
    () => () => {
      for (const t of [...webs.corner, ...webs.edge]) t.dispose();
    },
    [webs]
  );

  /*
   * Anchored to the middle of the frame band rather than its outer
   * edge, so a web sits astride the join of frame and cork — tight to
   * the frame, with nothing hanging out over the wall behind.
   */
  const frame = useMemo(
    () => ({
      halfW: (BOARD.width + 0.24) / 2 - 0.06,
      halfH: (BOARD.height + 0.24) / 2 - 0.06,
    }),
    []
  );
  const layout = useMemo(() => webLayout(7, frame), [frame]);

  const bounds = useMemo(
    () => ({ x: (BOARD.width - 0.5) / 2, y: (BOARD.height - 0.5) / 2 }),
    []
  );
  const starts = useMemo(() => scatterStarts(SPIDERS, bounds, 3), [bounds]);

  return (
    <group>
      {layout.map((web, i) => (
        <mesh
          key={i}
          position={[web.x, BOARD.centerY + web.y, WEB_Z]}
          rotation={[0, 0, web.rot]}
          scale={[web.flip ? -1 : 1, 1, 1]}
        >
          <planeGeometry
            args={
              web.kind === "corner"
                ? [web.size, web.size]
                : [web.size * 3, web.size]
            }
          />
          <meshBasicMaterial
            map={
              web.kind === "corner"
                ? webs.corner[web.variant]
                : webs.edge[web.variant]
            }
            transparent
            opacity={web.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Kept inside the frame, with a margin so no leg pokes over the
          edge. Six of them, started one to a cell of the board so they
          are scattered across it rather than huddled in the middle. */}
      <group position={[0, BOARD.centerY, 0]}>
        {starts.map((start, i) => (
          <Spider
            key={i}
            seed={i + 1}
            start={start}
            bounds={bounds}
            z={SPIDER_Z}
          />
        ))}
      </group>
    </group>
  );
}
