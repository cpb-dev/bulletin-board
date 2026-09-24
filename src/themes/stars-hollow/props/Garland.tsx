"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { useOptionalKit } from "./kit";
import { LEAF_COLOURS } from "./colours";

/**
 * A garland of autumn leaves along one or more curves — wound up the
 * gazebo's columns, swagged between them, and strung across the top of
 * the board.
 *
 * Every leaf on every curve is one instance of one quad, so a whole
 * gazebo's worth of garland is a single draw call. The leaves are laid
 * thick and at every angle so the garland reads as a rope of foliage,
 * not a string of cards.
 */
export function Garland({
  curves,
  perMetre = 60,
  size = 0.13,
  thickness = 0.06,
  seed = 1,
  colours = LEAF_COLOURS,
  castShadow = false,
  map,
}: {
  curves: THREE.Curve<THREE.Vector3>[];
  /** Leaves per metre of curve. */
  perMetre?: number;
  /** Leaf size, metres. */
  size?: number;
  /** How far leaves stray from the curve. */
  thickness?: number;
  seed?: number;
  colours?: string[];
  castShadow?: boolean;
  /**
   * The leaf texture. Taken from the kit when there is one; the board's
   * garland hangs outside the scene's kit and brings its own.
   */
  map?: THREE.Texture;
}) {
  const kit = useOptionalKit();
  const leafMap = map ?? kit?.leaf;
  const ref = useRef<THREE.InstancedMesh>(null);

  const leaves = useMemo(() => {
    const rand = mulberry32(seed);
    const out: { p: THREE.Vector3; q: THREE.Quaternion; s: number; c: string }[] = [];
    const e = new THREE.Euler();
    for (const curve of curves) {
      const n = Math.max(2, Math.round(curve.getLength() * perMetre));
      for (let i = 0; i < n; i++) {
        const p = curve.getPointAt((i + rand() * 0.8) / n);
        p.x += (rand() - 0.5) * thickness * 2;
        p.y += (rand() - 0.5) * thickness * 2;
        p.z += (rand() - 0.5) * thickness * 2;
        e.set(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2);
        out.push({
          p,
          q: new THREE.Quaternion().setFromEuler(e),
          s: size * (0.75 + rand() * 0.5),
          c: colours[Math.floor(rand() * colours.length)],
        });
      }
    }
    return out;
  }, [curves, perMetre, size, thickness, seed, colours]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    leaves.forEach((l, i) => {
      sc.setScalar(l.s);
      m.compose(l.p, l.q, sc);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set(l.c));
    });
    mesh.count = leaves.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [leaves]);

  return (
    <instancedMesh
      // Remount when the count changes: an instanced mesh's capacity is
      // fixed when it is made.
      key={leaves.length}
      ref={ref}
      args={[undefined, undefined, leaves.length]}
      castShadow={castShadow}
    >
      <planeGeometry args={[1, 1]} />
      <meshLambertMaterial map={leafMap} alphaTest={0.5} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/** A helix wound round a vertical post, bottom to top. */
export function helix(
  x: number,
  z: number,
  radius: number,
  y0: number,
  y1: number,
  turns: number,
  phase = 0
): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const n = Math.max(8, Math.round(turns * 12));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = phase + t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(x + Math.cos(a) * radius, y0 + (y1 - y0) * t, z + Math.sin(a) * radius));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/** A swag hanging between two points, sagging by `sag` in the middle. */
export function swag(a: THREE.Vector3, b: THREE.Vector3, sag: number): THREE.QuadraticBezierCurve3 {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  // A quadratic's midpoint sits halfway to its control point, so the
  // control drops twice the sag.
  mid.y -= sag * 2;
  return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
}
