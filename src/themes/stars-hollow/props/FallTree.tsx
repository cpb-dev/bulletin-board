"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import { planTree, type Point3, type TreeSpecies } from "../lib/tree";
import { useKit, useRepeated } from "./kit";

/**
 * A tree on the square, grown from `planTree`: a bent, tapering trunk,
 * limbs off the top of it, and a crown of lumpy foliage masses in
 * October colours.
 *
 * Maples are the full round trees turning red and orange on the green;
 * street trees are the small lollipops along Main Street's kerb;
 * sycamores are tall and pale-barked and have already lost most of
 * their leaves.
 *
 * Origin at the foot of the trunk.
 */

/** Crown colours by tone, gold to deep red. */
const TONES: Record<TreeSpecies, string[]> = {
  maple: ["#eec052", "#f2a13a", "#ec7f31", "#df5e2e", "#c8452e"],
  street: ["#f0c04c", "#f19c38", "#e8742f", "#d8562f"],
  sycamore: ["#dcbc58", "#c9a14a", "#b08440", "#946a3a"],
};

const BARK: Record<TreeSpecies, string> = {
  maple: "#6a5242",
  street: "#6d5646",
  sycamore: "#ddd6c7",
};

function toneColour(species: TreeSpecies, tone: number, out: THREE.Color): THREE.Color {
  const list = TONES[species];
  const f = tone * (list.length - 1);
  const i = Math.floor(f);
  const j = Math.min(list.length - 1, i + 1);
  return out.set(list[i]).lerp(new THREE.Color(list[j]), f - i);
}

/**
 * A tube along a curve that tapers from r0 to r1. `TubeGeometry` is one
 * radius all the way; this squeezes each ring towards the curve.
 */
export function taperedTube(
  points: Point3[],
  r0: number,
  r1: number,
  segments = 10,
  radial = 7
): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  const pos = g.attributes.position;
  const centre = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, centre);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(centre).multiplyScalar(r).add(centre);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** A lumpy ball, shared by every foliage mass on one tree. */
function makeBlobGeometry(seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const rand = mulberry32(seed);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  // A few broad bumps, not per-vertex noise: lumps, not a cracked egg.
  const bumps = Array.from({ length: 6 }, () => ({
    dir: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
    amt: 0.08 + rand() * 0.12,
  }));
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1;
    for (const b of bumps) r += Math.max(0, v.dot(b.dir)) ** 3 * b.amt;
    // flatter underneath, where a crown's mass is shaded and hangs
    if (v.y < 0) r *= 1 - (-v.y) * 0.18;
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  g.computeVertexNormals();
  return g;
}

export function FallTree({
  species,
  seed,
  leaves = true,
}: {
  species: TreeSpecies;
  seed: number;
  /** False for a bare tree, whatever the plan says. */
  leaves?: boolean;
}) {
  const kit = useKit();
  const plan = useMemo(() => planTree(species, seed), [species, seed]);

  const trunk = useMemo(
    () => taperedTube(plan.trunk, plan.trunkRadius * 1.25, plan.trunkRadius * 0.7, 10, 9),
    [plan]
  );
  const limbs = useMemo(
    () => plan.limbs.map((l) => taperedTube(l.points, l.radius, l.radius * 0.3, 8, 6)),
    [plan]
  );
  // Twigs off each limb tip, for the sycamore's open crown.
  const twigs = useMemo(() => {
    if (species !== "sycamore") return [];
    const rand = mulberry32(seed * 7);
    const out: THREE.TubeGeometry[] = [];
    for (const l of plan.limbs) {
      const tip = l.points[2];
      for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2;
        const len = 0.7 + rand() * 0.8;
        out.push(
          taperedTube(
            [
              [tip[0] * 0.85, tip[1] - 0.5, tip[2] * 0.85],
              [tip[0] + Math.cos(a) * len * 0.5, tip[1] + len * 0.4, tip[2] + Math.sin(a) * len * 0.5],
              [tip[0] + Math.cos(a) * len, tip[1] + len * 0.6, tip[2] + Math.sin(a) * len],
            ],
            l.radius * 0.35,
            0.012,
            5,
            4
          )
        );
      }
    }
    return out;
  }, [plan, species, seed]);
  const blob = useMemo(() => makeBlobGeometry(seed), [seed]);
  useEffect(
    () => () => {
      trunk.dispose();
      limbs.forEach((g) => g.dispose());
      twigs.forEach((g) => g.dispose());
      blob.dispose();
    },
    [trunk, limbs, twigs, blob]
  );

  const foliage = useRepeated((k) => k.foliage, 3, 2);
  const crown = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = crown.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    const rand = mulberry32(seed * 13);
    plan.blobs.forEach((b, i) => {
      e.set(rand() * 6, rand() * 6, rand() * 6);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(...b.at),
        q,
        new THREE.Vector3(b.r, b.r * (0.85 + rand() * 0.2), b.r)
      );
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, toneColour(species, b.tone, col));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [plan, species, seed]);

  // A sycamore's last leaves are loose sprigs, not masses of foliage.
  const masses = species !== "sycamore";

  const bark = species === "sycamore" ? kit.barkPale : kit.bark;
  const barkMat = <meshToonMaterial color={BARK[species]} map={bark} gradientMap={kit.ramp} />;

  return (
    <group>
      <mesh geometry={trunk} castShadow receiveShadow>
        {barkMat}
      </mesh>
      {limbs.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          {barkMat}
        </mesh>
      ))}
      {twigs.map((g, i) => (
        <mesh key={`t${i}`} geometry={g} castShadow>
          {barkMat}
        </mesh>
      ))}
      {leaves && masses && plan.blobs.length > 0 && (
        <instancedMesh
          ref={crown}
          args={[blob, undefined, plan.blobs.length]}
          castShadow
          receiveShadow
        >
          <meshToonMaterial map={foliage} gradientMap={kit.leafRamp} />
        </instancedMesh>
      )}
      {leaves && <Sprigs species={species} seed={seed} />}
    </group>
  );
}

/**
 * Loose leaves standing proud of the crown, so its outline is ragged
 * with leaves rather than the smooth edge of a ball. On a sycamore,
 * these are all the leaves there are.
 */
function Sprigs({ species, seed }: { species: TreeSpecies; seed: number }) {
  const kit = useKit();
  const ref = useRef<THREE.InstancedMesh>(null);
  const plan = useMemo(() => planTree(species, seed), [species, seed]);

  const leaves = useMemo(() => {
    const rand = mulberry32(seed * 31 + 5);
    const loose = species === "sycamore";
    const per = loose ? 16 : species === "street" ? 7 : 6;
    const size = loose ? 0.2 : species === "street" ? 0.2 : 0.3;
    const out: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const e = new THREE.Euler();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    // the core mass is inside everything else; nothing shows on it
    plan.blobs.slice(loose ? 0 : 1).forEach((b) => {
      for (let k = 0; k < per; k++) {
        const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.25, rand() - 0.5).normalize();
        const d = loose ? rand() * b.r * 1.3 : b.r * (0.92 + rand() * 0.1);
        const p = new THREE.Vector3(...b.at).addScaledVector(dir, d);
        e.set(rand() * 6, rand() * 6, rand() * 6);
        q.setFromEuler(e);
        const s = size * (0.75 + rand() * 0.5);
        toneColour(species, Math.min(1, Math.max(0, b.tone + (rand() - 0.5) * 0.3)), col);
        out.push({
          m: new THREE.Matrix4().compose(p, q, new THREE.Vector3(s, s, s)),
          c: col.clone(),
        });
      }
    });
    return out;
  }, [plan, species, seed]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    leaves.forEach((l, i) => {
      mesh.setMatrixAt(i, l.m);
      mesh.setColorAt(i, l.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [leaves]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, leaves.length]} castShadow>
      <planeGeometry args={[1, 1]} />
      <meshLambertMaterial map={kit.leaf} alphaTest={0.5} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
