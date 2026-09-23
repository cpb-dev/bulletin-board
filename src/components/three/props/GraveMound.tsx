"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { makeToonRamp, mulberry32 } from "../textures";

/**
 * The patch of turned soil in front of a headstone.
 *
 * It was a squashed sphere in one flat brown. A grave that has been
 * dug and filled in doesn't look like that: the soil comes back as
 * broken clods rather than a smooth heap, it settles into a dip over
 * the years, and there is always a scatter of spoil around the edge
 * that never made it back in.
 *
 * `age` runs 0 (turned last week, heaped and raw) to 1 (long settled,
 * sunken, with the grass growing back over it).
 */

const RADIUS = 0.62;

/**
 * The mound. A dome broken up by clods, sagging in the middle as it
 * ages, with its rim pushed about so the edge is never a circle.
 */
export function makeMoundGeometry(
  seed = 3,
  age = 0.5,
  segW = 30,
  segH = 16
): THREE.BufferGeometry {
  const rand = mulberry32(seed * 7717 + 1);
  // A handful of lumps, each pushing the surface out where it sits.
  const clods = Array.from({ length: 11 }, () => ({
    a: rand() * Math.PI * 2,
    r: rand() * 0.85,
    size: 0.16 + rand() * 0.3,
    h: 0.02 + rand() * 0.055,
  }));
  const wob = Array.from({ length: 5 }, () => ({
    k: 2 + Math.floor(rand() * 6),
    ph: rand() * Math.PI * 2,
    amp: 0.012 + rand() * 0.026,
  }));

  const position: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];

  for (let j = 0; j <= segH; j++) {
    // v 0 at the rim, 1 at the crown
    const v = j / segH;
    for (let i = 0; i <= segW; i++) {
      const u = i / segW;
      const a = u * Math.PI * 2;
      // the rim wanders, so the patch is never a clean disc
      let edge = RADIUS;
      for (const w of wob) edge += Math.sin(a * w.k + w.ph) * w.amp;
      const r = edge * (1 - v);

      const px = Math.cos(a) * r;
      const pz = Math.sin(a) * r;

      // A fresh grave is heaped; an old one has settled into a dip.
      const dome = Math.pow(Math.max(0, 1 - Math.pow(1 - v, 2)), 0.7);
      const heap = 0.2 * (1 - age * 0.55);
      const dip = age * 0.11 * Math.pow(v, 1.4);
      let y = dome * heap - dip;
      // Broken open at the crown: this is not the first time something
      // has come up through it, and an arm that rises out of unbroken
      // soil reads as an arm passing through a wall.
      const crater = Math.max(0, 1 - Math.hypot(px, pz) / (RADIUS * 0.34));
      y -= Math.pow(crater, 1.6) * 0.1;

      for (const c of clods) {
        const cx = Math.cos(c.a) * c.r * RADIUS;
        const cz = Math.sin(c.a) * c.r * RADIUS;
        const d = Math.hypot(px - cx, pz - cz) / (c.size * RADIUS);
        if (d < 1) y += Math.cos(d * Math.PI * 0.5) * c.h;
      }
      // never below the ground it sits on
      position.push(px, Math.max(-0.1, y), pz);
      uv.push(u * 2, v);
    }
  }

  const row = segW + 1;
  for (let j = 0; j < segH; j++) {
    for (let i = 0; i < segW; i++) {
      const p = j * row + i;
      index.push(p, p + 1, p + row, p + 1, p + row + 1, p + row);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Turned earth: wet clods, the cut ends of roots, small stones and the
 * leaves that have blown into it since.
 *
 * Pale, like the ground's own map — the material colour tints it.
 */
export function makeSoilTexture(seed = 23): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  // Pale: the material colour tints this, and the clods and hollows
  // below are all darkening passes. Start low and the mound comes out
  // black whatever colour it is given.
  ctx.fillStyle = "#e6dbc4";
  ctx.fillRect(0, 0, S, S);

  const wrapped = (x: number, y: number, m: number, draw: (x: number, y: number) => void) => {
    const xs = [x, ...(x < m ? [x + S] : []), ...(x > S - m ? [x - S] : [])];
    const ys = [y, ...(y < m ? [y + S] : []), ...(y > S - m ? [y - S] : [])];
    for (const xx of xs) for (const yy of ys) draw(xx, yy);
  };

  // Clods: lumps with a lit top and a shadow under them. This is what
  // makes soil read as broken rather than as a brown surface.
  for (let i = 0; i < 260; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 6 + rand() * 30;
    wrapped(x, y, r + 8, (xx, yy) => {
      ctx.beginPath();
      for (let a = 0; a <= 11; a++) {
        const ang = (a / 11) * Math.PI * 2;
        const rad = r * (0.62 + rand() * 0.6);
        const px = xx + Math.cos(ang) * rad;
        const py = yy + Math.sin(ang) * rad * 0.82;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(${86 + rand() * 46}, ${68 + rand() * 38}, ${
        46 + rand() * 28
      }, ${0.1 + rand() * 0.16})`;
      ctx.fill();
      // catchlight on the upper edge
      ctx.strokeStyle = `rgba(255, 250, 232, ${0.1 + rand() * 0.18})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(xx, yy, r * 0.8, Math.PI * 1.15, Math.PI * 1.9);
      ctx.stroke();
    });
  }

  // Wet hollows between the clods.
  for (let i = 0; i < 60; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 8 + rand() * 26;
    wrapped(x, y, r, (xx, yy) => {
      const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
      g.addColorStop(0, `rgba(44, 34, 24, ${0.12 + rand() * 0.16})`);
      g.addColorStop(1, "rgba(44, 34, 24, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Roots, cut through by whoever dug it.
  for (let i = 0; i < 26; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const len = 20 + rand() * 60;
    const ang = rand() * Math.PI * 2;
    wrapped(x, y, len, (xx, yy) => {
      ctx.strokeStyle = `rgba(212, 198, 166, ${0.2 + rand() * 0.24})`;
      ctx.lineWidth = 1 + rand() * 2.4;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.quadraticCurveTo(
        xx + Math.cos(ang + 0.6) * len * 0.5,
        yy + Math.sin(ang + 0.6) * len * 0.5,
        xx + Math.cos(ang) * len,
        yy + Math.sin(ang) * len
      );
      ctx.stroke();
    });
  }

  // Stones and grit.
  for (let i = 0; i < 120; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 1.2 + rand() * 4.5;
    wrapped(x, y, r + 2, (xx, yy) => {
      ctx.beginPath();
      ctx.ellipse(xx, yy, r, r * 0.72, rand() * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(216, 212, 200, ${0.18 + rand() * 0.3})`;
      ctx.fill();
    });
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1.4);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function GraveMound({
  seed = 3,
  age = 0.5,
  onPointerDown,
}: {
  seed?: number;
  age?: number;
  onPointerDown?: (e: import("@react-three/fiber").ThreeEvent<PointerEvent>) => void;
}) {
  const ramp = useMemo(() => makeToonRamp([58, 104, 150, 196, 236, 255]), []);
  const soil = useMemo(() => makeSoilTexture(seed * 13 + 5), [seed]);
  const geo = useMemo(() => makeMoundGeometry(seed, age), [seed, age]);

  /** Spoil that never made it back into the hole. */
  const spill = useMemo(() => {
    const rand = mulberry32(seed * 911 + 3);
    return Array.from({ length: 9 }, () => {
      const a = rand() * Math.PI * 2;
      const r = RADIUS * (0.86 + rand() * 0.42);
      const s = 0.028 + rand() * 0.042;
      return {
        p: [Math.cos(a) * r, s * 0.35, Math.sin(a) * r] as [number, number, number],
        rot: [rand() * 3, rand() * 3, rand() * 3] as [number, number, number],
        s,
      };
    });
  }, [seed]);

  const clod = useMemo(() => {
    // detail 1: at detail 0 twenty flat faces read as a crystal
    const g = new THREE.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position;
    const rand = mulberry32(seed * 5 + 11);
    for (let i = 0; i < pos.count; i++) {
      const k = 0.7 + rand() * 0.55;
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.7, pos.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, [seed]);

  useEffect(
    () => () => {
      ramp.dispose();
      soil.dispose();
      geo.dispose();
      clod.dispose();
    },
    [ramp, soil, geo, clod]
  );

  return (
    <group onPointerDown={onPointerDown} onClick={(e) => e.stopPropagation()}>
      <mesh geometry={geo} receiveShadow castShadow>
        <meshToonMaterial map={soil} color="#a98e68" gradientMap={ramp} />
      </mesh>
      {/* The dark inside the break. Set just under the crown so the
          crater has depth rather than being a dimple. */}
      <mesh position={[0, -0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[RADIUS * 0.3, 0.2, 14, 1, true]} />
        <meshBasicMaterial color="#160f0a" side={THREE.BackSide} />
      </mesh>
      {spill.map((s, i) => (
        <mesh
          key={i}
          geometry={clod}
          position={s.p}
          rotation={s.rot}
          scale={s.s}
          castShadow
          receiveShadow
        >
          <meshToonMaterial map={soil} color="#997f5c" gradientMap={ramp} />
        </mesh>
      ))}
    </group>
  );
}
