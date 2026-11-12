"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mulberry32 } from "@/components/three/textures";
import { FIREPLACE, ROOM } from "../../lib/layout";
import {
  BREAST,
  FACE_Z,
  FIREBOX_BACK_Z,
  FLUE_FRONT_Z,
  HEARTH,
  LINTEL,
  OPENING,
  stoneCourses,
} from "../../lib/fireplace";
import { makeStoneTextures } from "./textures";

/** Warm fieldstone: buff, grey, brown and a cool blue-grey. */
const STONE_HUES = ["#a3917a", "#8d857a", "#7e6a58", "#767779"];
const MORTAR = "#4f463d";

/** One face of masonry to lay stones on, in the fireplace's own space. */
interface Face {
  /** Bottom-centre of the face. */
  origin: THREE.Vector3;
  /** Along the face (its width), and out of it (its normal). */
  across: THREE.Vector3;
  out: THREE.Vector3;
  width: number;
  height: number;
  seed: number;
}

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

/** Every face of the fireplace that shows stone. */
function faces(): Face[] {
  const W = FIREPLACE.width;
  const D = FIREPLACE.depth;
  const legW = (W - OPENING.width) / 2;
  const legH = LINTEL.top - HEARTH.height;
  const legX = OPENING.width / 2 + legW / 2;
  const revealDepth = FACE_Z - FIREBOX_BACK_Z;
  const revealZ = (FACE_Z + FIREBOX_BACK_Z) / 2;
  const breastH = ROOM.height - BREAST.bottom;
  const breastZ = FACE_Z - 0.1;
  const breastD = D - 0.2;
  const out: Face[] = [];
  for (const s of [-1, 1]) {
    // The two legs' fronts.
    out.push({ origin: new THREE.Vector3(s * legX, HEARTH.height, FACE_Z), across: X, out: Z, width: legW, height: legH, seed: 11 + s });
    // The legs' outer sides.
    out.push({
      origin: new THREE.Vector3(s * (W / 2), HEARTH.height, 0),
      across: new THREE.Vector3(0, 0, -s),
      out: new THREE.Vector3(s, 0, 0),
      width: D,
      height: legH,
      seed: 21 + s,
    });
    // The reveals: inside the opening, facing the fire.
    out.push({
      origin: new THREE.Vector3(s * (OPENING.width / 2), HEARTH.height, revealZ),
      across: new THREE.Vector3(0, 0, s),
      out: new THREE.Vector3(-s, 0, 0),
      width: revealDepth,
      height: OPENING.top - HEARTH.height,
      seed: 31 + s,
    });
    // The chimney breast's sides.
    out.push({
      origin: new THREE.Vector3(s * (BREAST.width / 2), BREAST.bottom, breastZ - breastD / 2),
      across: new THREE.Vector3(0, 0, -s),
      out: new THREE.Vector3(s, 0, 0),
      width: breastD,
      height: breastH,
      seed: 41 + s,
    });
  }
  // The chimney breast's front.
  out.push({ origin: new THREE.Vector3(0, BREAST.bottom, breastZ), across: X, out: Z, width: BREAST.width, height: breastH, seed: 51 });
  return out;
}

/** The long lintel stones over the opening: three big, rough blocks. */
const LINTEL_STONES = [
  { x: -0.62, w: 0.92 },
  { x: 0.05, w: 0.42 },
  { x: 0.66, w: 0.86 },
];

/**
 * The fireplace's masonry (BB-35): about 400 fieldstones in rough
 * courses on every face that shows — the legs, their sides, the reveals
 * round the fire, and the chimney breast up to the ceiling — over a
 * mortar body, with a big stone lintel and a flagstone hearth. All the
 * stones are one instanced mesh, each its own size, colour and tilt.
 */
export function Stonework() {
  const { map, bump } = useMemo(makeStoneTextures, []);
  useEffect(
    () => () => {
      map.dispose();
      bump.dispose();
    },
    [map, bump]
  );
  // A rounded box with its vertices nudged, so no stone is a perfect block.
  const geometry = useMemo(() => {
    // Two segments of rounding: enough to read as weathered stone, at about
    // half the triangles of three (there are ~400 of them).
    const g = new RoundedBoxGeometry(1, 1, 1, 2, 0.22);
    const pos = g.attributes.position;
    const rand = mulberry32(5);
    const bumps = Array.from({ length: 6 }, () => ({ d: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), k: 0.05 + rand() * 0.06 }));
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();
      let push = 0;
      for (const b of bumps) push += Math.max(0, n.dot(b.d)) * b.k;
      v.addScaledVector(n, push - 0.04);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const placements = useMemo(() => {
    const list: { pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3; color: THREE.Color }[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (const f of faces()) {
      const rand = mulberry32(f.seed * 97);
      // A frame whose x runs across the face, y up it, z out of it.
      const basis = new THREE.Matrix4().makeBasis(f.across, up, f.out);
      for (const s of stoneCourses(f.width, f.height, f.seed)) {
        const depth = 0.05 + rand() * 0.05;
        const pos = f.origin
          .clone()
          .addScaledVector(f.across, s.x)
          .addScaledVector(up, s.y)
          .addScaledVector(f.out, depth / 2 - 0.012);
        const tilt = new THREE.Euler((rand() - 0.5) * 0.08, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.06);
        const quat = new THREE.Quaternion().setFromRotationMatrix(basis).multiply(new THREE.Quaternion().setFromEuler(tilt));
        const base = new THREE.Color(STONE_HUES[s.hue]);
        const l = 1 + s.tone * 0.16;
        list.push({ pos, quat, scale: new THREE.Vector3(s.w, s.h, depth), color: base.multiplyScalar(l) });
      }
    }
    return list;
  }, []);

  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    placements.forEach((p, i) => {
      mat.compose(p.pos, p.quat, p.scale);
      m.setMatrixAt(i, mat);
      m.setColorAt(i, p.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [placements]);

  const W = FIREPLACE.width;
  const D = FIREPLACE.depth;
  const legW = (W - OPENING.width) / 2;
  const legH = LINTEL.top - HEARTH.height;
  const breastH = ROOM.height - BREAST.bottom;

  return (
    <group>
      <instancedMesh ref={mesh} args={[geometry, undefined, placements.length]} castShadow receiveShadow>
        <meshStandardMaterial map={map} bumpMap={bump} bumpScale={2} roughness={0.92} />
      </instancedMesh>

      {/* the mortar body the stones are set in */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (OPENING.width / 2 + legW / 2), HEARTH.height + legH / 2, 0]}>
          <boxGeometry args={[legW - 0.02, legH, D - 0.02]} />
          <meshStandardMaterial color={MORTAR} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, BREAST.bottom + breastH / 2, -0.1]}>
        <boxGeometry args={[BREAST.width - 0.02, breastH, D - 0.22]} />
        <meshStandardMaterial color={MORTAR} roughness={1} />
      </mesh>

      {/* Solid masonry over the opening, behind the lintel: the rounded
          lintel stones leave slits, and without this you could see
          through them into the flue — and Santa's legs coming down. Only
          the throat behind it is open. */}
      <mesh position={[0, (OPENING.top + BREAST.bottom) / 2, (FLUE_FRONT_Z + FACE_Z - 0.08) / 2]}>
        <boxGeometry args={[OPENING.width + 0.04, BREAST.bottom - OPENING.top, FACE_Z - 0.08 - FLUE_FRONT_Z]} />
        <meshStandardMaterial color={MORTAR} roughness={1} />
      </mesh>

      {/* the lintel: three long, rough blocks spanning the opening */}
      {LINTEL_STONES.map((l) => (
        <mesh
          key={l.x}
          geometry={geometry}
          position={[l.x, (OPENING.top + LINTEL.top) / 2, FACE_Z - 0.06]}
          scale={[l.w - 0.02, LINTEL.top - OPENING.top - 0.02, 0.2]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial map={map} bumpMap={bump} bumpScale={2} color="#9a8b78" roughness={0.9} />
        </mesh>
      ))}

      {/* the flagstone hearth, standing proud of the floor */}
      <mesh
        geometry={geometry}
        position={[0, HEARTH.height / 2, HEARTH.overhang / 2]}
        scale={[W + 0.3, HEARTH.height, D + HEARTH.overhang]}
        receiveShadow
      >
        <meshStandardMaterial map={map} bumpMap={bump} bumpScale={1.5} color="#7c7469" roughness={0.85} />
      </mesh>
    </group>
  );
}
