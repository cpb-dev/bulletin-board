"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { makeToonRamp } from "../textures";

/**
 * A graveyard headstone.
 *
 * One bevelled extrusion rather than a box with a half-cylinder stuck on
 * top: the silhouette is cut as a profile, so the shoulders are a real
 * curve and every edge catches light. Vertices are then nudged by a
 * deterministic noise so no two stones are identical and none of them
 * reads as machined.
 *
 * Used only by the Haunted Hollow scene.
 */

export type HeadstoneKind = "round" | "gabled" | "cross";

const WIDTH = 0.62;
const HEIGHT = 0.95;
const DEPTH = 0.13;

/** Cheap deterministic noise — same vertex always moves the same way. */
function wobble(x: number, y: number, z: number, seed: number): number {
  return (
    Math.sin(x * 23.1 + seed * 1.3) *
    Math.cos(y * 19.7 + seed * 2.1) *
    Math.sin(z * 17.3 + seed * 3.7)
  );
}

/**
 * The stone's silhouette, extruded and bevelled. `seed` drives the
 * weathering, so stones in the same graveyard differ from one another.
 */
export function makeHeadstoneGeometry(
  kind: HeadstoneKind = "round",
  seed = 1,
  /** 0 = recently set, 1 = ancient and crumbling. */
  age = 0.5
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hw = WIDTH / 2;

  if (kind === "round") {
    shape.moveTo(-hw, 0);
    shape.lineTo(-hw, HEIGHT - hw);
    // top semicircle: π → 0 is a decreasing angle, so clockwise
    shape.absarc(0, HEIGHT - hw, hw, Math.PI, 0, true);
    shape.lineTo(hw, 0);
  } else if (kind === "gabled") {
    shape.moveTo(-hw, 0);
    shape.lineTo(-hw, HEIGHT - hw * 0.85);
    shape.lineTo(0, HEIGHT);
    shape.lineTo(hw, HEIGHT - hw * 0.85);
    shape.lineTo(hw, 0);
  } else {
    // a standing cross: stem up the middle, arms partway up
    const vw = WIDTH * 0.19; // half-width of the stem
    const armY = HEIGHT * 0.52;
    const armH = WIDTH * 0.38;
    shape.moveTo(-vw, 0);
    shape.lineTo(-vw, armY);
    shape.lineTo(-hw, armY);
    shape.lineTo(-hw, armY + armH);
    shape.lineTo(-vw, armY + armH);
    shape.lineTo(-vw, HEIGHT);
    shape.lineTo(vw, HEIGHT);
    shape.lineTo(vw, armY + armH);
    shape.lineTo(hw, armY + armH);
    shape.lineTo(hw, armY);
    shape.lineTo(vw, armY);
    shape.lineTo(vw, 0);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelSize: 0.022,
    bevelThickness: 0.02,
    bevelSegments: 2,
    curveSegments: 18,
  });
  // extrusion runs 0..DEPTH, so recentre it on the origin
  geo.translate(0, 0, -DEPTH / 2);

  // Weather it. Wear is strongest at the top, where rain and frost get at
  // the stone, and near zero at the base so it still sits flat.
  //
  // Displacement stays IN the XY plane. The extruded front and back faces
  // are triangulated fans over the outline, so nudging vertices along Z
  // breaks their flatness and the triangulation shows up as a crease
  // straight across the stone's face.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const exposure = Math.min(1, Math.max(0, y / HEIGHT));
    const amount = 0.012 * (0.2 + exposure) * (0.5 + age * 1.6);
    pos.setXY(
      i,
      x + wobble(x, y, z, seed) * amount,
      y + wobble(y, z, x, seed + 11) * amount * 0.6
    );
  }
  pos.needsUpdate = true;

  // ExtrudeGeometry's default WorldUVGenerator writes raw x/y as UVs, so
  // they come out in world units (~0.6 x 0.95 here) and a texture would
  // sample one clamped corner. Remap them to 0..1 over the stone.
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv.setXY(i, (x + WIDTH / 2) / WIDTH, y / HEIGHT);
  }
  uv.needsUpdate = true;

  geo.computeVertexNormals();
  return geo;
}

/**
 * The stone's surface: mottled granite, cracks that branch and taper,
 * and moss creeping up from the base. `age` drives how far gone it is —
 * a fresh stone gets a little mottling, an ancient one is split and
 * half-green.
 */
export function makeStoneTexture(seed: number, age: number): THREE.CanvasTexture {
  const W = 384;
  const H = 576;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const r = mulberry(seed * 2654435761);

  ctx.fillStyle = "#87847e";
  ctx.fillRect(0, 0, W, H);

  // mottling, so the stone is never a flat fill
  for (let i = 0; i < 260; i++) {
    const x = r() * W;
    const y = r() * H;
    const rad = 6 + r() * 30;
    const dark = r() > 0.5;
    ctx.fillStyle = dark
      ? `rgba(110, 106, 100, ${0.05 + r() * 0.12})`
      : `rgba(186, 182, 174, ${0.05 + r() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * (0.6 + r() * 0.7), r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // cracks — a jagged walk, with the odd branch splitting off it
  const crackCount = Math.round(1 + age * 5);
  const drawCrack = (
    x: number,
    y: number,
    angle: number,
    len: number,
    width: number
  ) => {
    // walk the crack once, then stroke it twice: a pale lip offset down
    // and right, then the dark fissure itself on top. One flat line reads
    // as a pen mark; the pair reads as a split in the surface.
    const pts: [number, number][] = [[x, y]];
    let cx = x;
    let cy = y;
    let a = angle;
    const steps = Math.max(3, Math.round(len / 16));
    for (let i = 0; i < steps; i++) {
      a += (r() - 0.5) * 1.1;
      cx += Math.cos(a) * 16;
      cy += Math.sin(a) * 16;
      pts.push([cx, cy]);
    }
    const trace = (dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0] + dx, pts[0][1] + dy);
      for (const [px, py] of pts.slice(1)) ctx.lineTo(px + dx, py + dy);
      ctx.stroke();
    };
    ctx.lineCap = "round";
    ctx.lineWidth = width * 0.9;
    ctx.strokeStyle = `rgba(214, 210, 198, ${0.3 + age * 0.25})`;
    trace(1.6, 1.6);
    ctx.lineWidth = width;
    ctx.strokeStyle = `rgba(42, 38, 34, ${0.6 + age * 0.35})`;
    trace(0, 0);
    return { cx, cy, a };
  };

  for (let i = 0; i < crackCount; i++) {
    // start on an edge — cracks propagate inward from where stone chips
    const edge = Math.floor(r() * 4);
    const x = edge === 1 ? W : edge === 3 ? 0 : r() * W;
    const y = edge === 0 ? 0 : edge === 2 ? H : r() * H;
    const toward = Math.atan2(H / 2 - y, W / 2 - x) + (r() - 0.5) * 0.9;
    const len = 90 + r() * 200;
    const end = drawCrack(x, y, toward, len, 2.2 + age * 3);
    if (r() < 0.6 + age * 0.3) {
      drawCrack(end.cx, end.cy, end.a + (r() - 0.5) * 2, len * 0.5, 1.4 + age * 1.6);
    }
  }

  // moss climbing from the base, heaviest on an old stone
  const mossCount = Math.round(10 + age * 46);
  for (let i = 0; i < mossCount; i++) {
    const x = r() * W;
    // biased low: squaring pushes most of them towards the bottom
    const y = H - Math.pow(r(), 1.9) * H * (0.4 + age * 0.5);
    const rad = 10 + r() * 34;
    ctx.fillStyle =
      r() > 0.45
        ? `rgba(96, 116, 72, ${0.14 + r() * 0.3 * (0.4 + age)})`
        : `rgba(126, 142, 86, ${0.12 + r() * 0.26 * (0.4 + age)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * 0.62, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lichen: irregular clustered patches. Stroked circles read as soap
  // bubbles, so each patch is a scatter of small overlapping blobs.
  const lichen = Math.round(2 + age * 7);
  for (let i = 0; i < lichen; i++) {
    const px = r() * W;
    const py = r() * H;
    const spread = 10 + r() * 22;
    const tint = r() > 0.5 ? "196, 200, 176" : "172, 178, 150";
    for (let b = 0; b < 9; b++) {
      const bx = px + (r() - 0.5) * spread * 2;
      const by = py + (r() - 0.5) * spread * 1.4;
      ctx.fillStyle = `rgba(${tint}, ${0.09 + r() * 0.16})`;
      ctx.beginPath();
      ctx.ellipse(
        bx,
        by,
        3 + r() * 9,
        3 + r() * 7,
        r() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function Headstone({
  kind = "round",
  seed = 1,
  size = 1,
  epitaph,
  /** Slight lean, in radians — nothing in a graveyard stands straight. */
  lean = 0,
  /** 0 = recently set, 1 = ancient: more wear, more cracks, more moss. */
  age = 0.5,
  onPointerDown,
}: {
  kind?: HeadstoneKind;
  seed?: number;
  size?: number;
  epitaph?: string;
  lean?: number;
  age?: number;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  // More steps than the shared ramp so the bevelled edges and the worn
  // surface actually read; grey needs the midtones most.
  const ramp = useMemo(() => makeToonRamp([58, 104, 150, 196, 236, 255]), []);
  const stone = useMemo(
    () => makeHeadstoneGeometry(kind, seed, age),
    [kind, seed, age]
  );
  const surface = useMemo(() => makeStoneTexture(seed, age), [seed, age]);
  const carved = useMemo(
    () => (epitaph ? makeEpitaphTexture(epitaph) : null),
    [epitaph]
  );

  // Moss creeps up the shaded side of the base.
  const moss = useMemo(() => {
    const r = mulberry(seed * 9176);
    // Clumped around the OUTSIDE of the plinth — inside it they're simply
    // swallowed by the slab.
    const plinthX = (WIDTH * 1.28) / 2;
    const plinthZ = (DEPTH * 2.1) / 2;
    return Array.from({ length: 4 + Math.round(age * 7) }, () => {
      const side = r();
      const along = (r() - 0.5) * 2;
      const pos: [number, number, number] =
        side > 0.5
          ? [along * plinthX * 1.15, 0.03 + r() * 0.03, (r() > 0.5 ? 1 : -1) * plinthZ * (0.95 + r() * 0.3)]
          : [(r() > 0.5 ? 1 : -1) * plinthX * (0.95 + r() * 0.25), 0.03 + r() * 0.03, along * plinthZ * 1.1];
      return {
        pos,
        s: 0.045 + r() * 0.05,
        tint: r() > 0.5 ? "#5f7348" : "#74875a",
      };
    });
  }, [seed, age]);

  useEffect(
    () => () => {
      ramp.dispose();
      stone.dispose();
      surface.dispose();
      carved?.dispose();
    },
    [ramp, stone, surface, carved]
  );

  return (
    // Origin at the base, so callers place it on the ground.
    <group scale={size}>
      {/* The stone and anything carved into it share one transform, so
          the lettering stays flush however far the stone leans. */}
      <group rotation={[0.05, 0, lean]}>
        <mesh
          geometry={stone}
          castShadow
          receiveShadow
          onPointerDown={onPointerDown}
          onClick={(e) => e.stopPropagation()}
        >
          {/* white base colour so the surface map carries the tone */}
          <meshToonMaterial color="#ffffff" map={surface} gradientMap={ramp} />
        </mesh>

        {carved && (
          <mesh position={[0, HEIGHT * 0.52, DEPTH / 2 + 0.032]}>
            <planeGeometry args={[WIDTH * 0.82, WIDTH * 0.82]} />
            <meshBasicMaterial map={carved} transparent depthWrite={false} />
          </mesh>
        )}
      </group>

      {/* plinth — a wider slab the stone is set into */}
      <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
        <boxGeometry args={[WIDTH * 1.28, 0.07, DEPTH * 2.1]} />
        <meshToonMaterial color="#7e7b78" gradientMap={ramp} />
      </mesh>

      {moss.map((m, i) => (
        <mesh key={i} position={m.pos} scale={[1, 0.55, 1]}>
          <icosahedronGeometry args={[m.s, 0]} />
          <meshToonMaterial color={m.tint} gradientMap={ramp} />
        </mesh>
      ))}
    </group>
  );
}

/** Local copy of the seeded RNG, so this prop stands on its own. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lettering chiselled into a stone face, transparent around the text. */
export function makeEpitaphTexture(text: string): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  const lines = text.split("\n");
  const lineHeight = 108;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 86px Georgia, 'Times New Roman', serif";

  const top = size / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    const y = top + i * lineHeight;
    // a pale lip below each letter sells the chiselled groove
    ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
    ctx.fillText(line, size / 2, y + 5);
    ctx.fillStyle = "#3c3833";
    ctx.fillText(line, size / 2, y);
  });

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
