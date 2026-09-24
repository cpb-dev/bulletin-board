"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  branchPlan,
  type FallingLeaf,
  leafFall,
  type Limb,
  type Point3,
  treeShape,
} from "../lib/tree";
import { makeToonRamp, mulberry32 } from "@/components/three/textures";

/**
 * The trees in Haunted Hollow.
 *
 * Every tree is grown from its seed rather than scaled from one model:
 * `src/lib/tree.ts` decides the height, the lean, how many limbs leave
 * the trunk and where, and whether this one has already dropped its
 * leaves. So the wood in the scene is seven different trees, not one
 * tree at seven sizes.
 *
 * The branches are tapered tubes swept along real curves — a straight
 * cylinder is the thing that made the old trees read as scenery — and
 * the foliage hangs on the branch ends rather than sitting in a ball on
 * top of the trunk.
 *
 * Leaves come off the canopies and tumble down. `leafFall` does the
 * motion; the mesh is one instanced quad.
 */

export const AUTUMN_LEAVES = [
  "#d98a24",
  "#c2571f",
  "#a33717",
  "#c99029",
  "#8f4420",
  "#b8471c",
  "#d6a232",
];

/** Blob variants, shared across every cluster in the scene. */
const BLOB_VARIANTS = 3;

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

/**
 * A branch: a tube swept along `points`, tapering from `r0` at the base
 * to `r1` at the tip, with a flare where it leaves its parent.
 *
 * Built by hand rather than with `TubeGeometry` because that has one
 * radius for its whole length, and a branch that doesn't taper reads as
 * a pipe. UVs run along the branch in world units, so the bark is the
 * same size on a trunk and on a twig.
 */
export function makeBranchGeometry(
  points: Point3[],
  r0: number,
  r1: number,
  tubular = 12,
  radial = 7
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
  );
  const frames = curve.computeFrenetFrames(tubular, false);
  const length = Math.max(curve.getLength(), 1e-4);

  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];

  const P = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    curve.getPointAt(u, P);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    // pow > 1 keeps a flare at the base and a long thin tip
    const r = r1 + (r0 - r1) * Math.pow(1 - u, 1.4);

    for (let j = 0; j <= radial; j++) {
      const v = j / radial;
      const a = v * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const nx = N.x * c + B.x * s;
      const ny = N.y * c + B.y * s;
      const nz = N.z * c + B.z * s;
      position.push(P.x + nx * r, P.y + ny * r, P.z + nz * r);
      normal.push(nx, ny, nz);
      uv.push(v, u * length);
    }
  }

  const row = radial + 1;
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      index.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  return geo;
}

/**
 * Every branch of one tree welded into a single geometry, so a tree is
 * one draw call rather than sixteen. Hand-rolled rather than pulled
 * from `BufferGeometryUtils` — the inputs all come from
 * `makeBranchGeometry`, so the attribute sets are known to match.
 */
export function mergeGeometries(
  parts: THREE.BufferGeometry[]
): THREE.BufferGeometry {
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  let offset = 0;

  for (const g of parts) {
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const t = g.attributes.uv.array;
    const i = g.getIndex()!.array;
    for (let k = 0; k < p.length; k++) position.push(p[k]);
    for (let k = 0; k < n.length; k++) normal.push(n[k]);
    for (let k = 0; k < t.length; k++) uv.push(t[k]);
    for (let k = 0; k < i.length; k++) index.push(i[k] + offset);
    offset += p.length / 3;
    g.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * A lump of foliage: an icosahedron with its vertices pushed about, so
 * the silhouette is ragged instead of a faceted ball. Unit radius —
 * callers scale it, unevenly, which is most of what makes one cluster
 * differ from the next.
 */
export function makeBlobGeometry(seed: number): THREE.BufferGeometry {
  // Detail 2 rather than 1: at detail 1 the flat faces are big enough
  // that a cluster reads as crumpled paper rather than leaves. It is
  // one geometry shared by every cluster in the scene, so the cost is
  // paid once.
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const rand = mulberry32(seed * 7919 + 3);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  // shared vertices are duplicated per face, so displace by direction
  // rather than by index or the seams split open
  const cache = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let scale = cache.get(key);
    if (scale === undefined) {
      scale = 0.82 + rand() * 0.34;
      cache.set(key, scale);
    }
    pos.setXYZ(i, v.x * scale, v.y * scale, v.z * scale);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Textures                                                           */
/* ------------------------------------------------------------------ */

/** Bark: deep vertical furrows, cracked across, with lichen in them. */
export function makeBarkTexture(seed = 5): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  ctx.fillStyle = "#5a4232";
  ctx.fillRect(0, 0, S, S);

  // furrows run the length of the branch, which is the V axis
  for (let i = 0; i < 26; i++) {
    const x = rand() * S;
    const w = 2 + rand() * 11;
    const dark = rand() < 0.55;
    ctx.fillStyle = dark
      ? `rgba(26, 17, 11, ${0.2 + rand() * 0.4})`
      : `rgba(138, 112, 88, ${0.06 + rand() * 0.14})`;
    // The furrow wanders down the canvas as a sum of sines over the
    // tile's height. A random walk would be more natural but would not
    // arrive back where it started, and the mismatch shows up on the
    // trunk as a hard ring every time the texture repeats.
    const a1 = (rand() - 0.5) * 14;
    const a2 = (rand() - 0.5) * 7;
    const ph = rand() * Math.PI * 2;
    for (let y = 0; y < S; y += 4) {
      const k = (y / S) * Math.PI * 2;
      const cx = x + Math.sin(k) * a1 + Math.sin(k * 2 + ph) * a2;
      const xx = ((cx % S) + S) % S;
      ctx.fillRect(xx, y, w, 5);
      if (xx + w > S) ctx.fillRect(xx - S, y, w, 5);
    }
  }

  // cracks across the furrows
  ctx.strokeStyle = "rgba(20, 13, 9, 0.45)";
  for (let i = 0; i < 18; i++) {
    const y = rand() * S;
    const x = rand() * S;
    ctx.lineWidth = 0.6 + rand() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8 + rand() * 26, y + (rand() - 0.5) * 6);
    ctx.stroke();
  }

  // lichen and moss collecting in the grooves
  for (let i = 0; i < 70; i++) {
    const x = rand() * S;
    const y = rand() * S;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rand() * 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${74 + rand() * 30}, ${86 + rand() * 30}, 56, ${
      0.05 + rand() * 0.14
    })`;
    ctx.fill();
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  // UVs are (around, world units along), so one tile per 0.5m of branch
  t.repeat.set(1, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A mass of overlapping leaves, wrapped onto the foliage blobs. Without
 * it a cluster is a flat-shaded lump; with it the canopy has leaves in
 * it even though no leaf is modelled.
 */
export function makeCanopyTexture(seed = 9): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  // Deliberately pale. This map is multiplied by each cluster's colour,
  // so if the leaves are drawn in full autumn red here the tint has
  // nothing left to do and every canopy comes out the same dark meat
  // colour. Draw the *light*, tint on the instance.
  const LIGHT = [
    "#f2e6cd",
    "#e8d2a4",
    "#dcbb86",
    "#f0dcae",
    "#e0c48f",
    "#cfa872",
  ];
  ctx.fillStyle = "#c9ab7c";
  ctx.fillRect(0, 0, S, S);

  const leaf = (x: number, y: number, r: number, a: number, fill: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    // a pointed oval — a leaf, near enough at this size
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.75, 0, 0, r);
    ctx.quadraticCurveTo(-r * 0.75, 0, 0, -r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(108, 78, 44, 0.4)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  };

  for (let i = 0; i < 170; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 7 + rand() * 13;
    const a = rand() * Math.PI * 2;
    const tint = LIGHT[Math.floor(rand() * LIGHT.length)];
    // draw wrapped copies so the tile joins on both axes
    for (const dx of [0, x < r ? S : x > S - r ? -S : 0]) {
      for (const dy of [0, y < r ? S : y > S - r ? -S : 0]) {
        if ((dx || dy) === 0 && (dx !== 0 || dy !== 0)) continue;
        leaf(x + dx, y + dy, r, a, tint);
      }
    }
  }

  // depth: a few shadowed pockets where the canopy is thick
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    ctx.arc(rand() * S, rand() * S, 6 + rand() * 20, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(74, 52, 28, ${0.08 + rand() * 0.16})`;
    ctx.fill();
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** One leaf, with a stalk and a notched edge, on transparency. */
export function makeLeafTexture(): THREE.CanvasTexture {
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);

  ctx.translate(S / 2, S / 2);
  ctx.beginPath();
  ctx.moveTo(0, -26);
  // lobed on the way down each side, so the silhouette isn't an almond
  ctx.bezierCurveTo(10, -20, 20, -12, 15, -4);
  ctx.bezierCurveTo(24, -4, 26, 4, 16, 10);
  ctx.bezierCurveTo(20, 16, 12, 22, 2, 20);
  ctx.lineTo(1, 30);
  ctx.lineTo(-1, 30);
  ctx.lineTo(-2, 20);
  ctx.bezierCurveTo(-12, 22, -20, 16, -16, 10);
  ctx.bezierCurveTo(-26, 4, -24, -4, -15, -4);
  ctx.bezierCurveTo(-20, -12, -10, -20, 0, -26);
  ctx.closePath();
  ctx.fillStyle = "#ffffff"; // tinted per instance
  ctx.fill();

  // veins, darker so the leaf reads as a leaf when it turns edge-on
  ctx.strokeStyle = "rgba(90, 44, 16, 0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 28);
  ctx.lineTo(0, -24);
  for (const y of [-14, -4, 6]) {
    ctx.moveTo(0, y + 6);
    ctx.lineTo(13, y);
    ctx.moveTo(0, y + 6);
    ctx.lineTo(-13, y);
  }
  ctx.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ */
/*  Assets, shared by every tree in the grove                          */
/* ------------------------------------------------------------------ */

export interface TreeAssets {
  bark: THREE.CanvasTexture;
  canopy: THREE.CanvasTexture;
  leaf: THREE.CanvasTexture;
  ramp: THREE.DataTexture;
  blobs: THREE.BufferGeometry[];
}

function makeTreeAssets(): TreeAssets {
  return {
    bark: makeBarkTexture(5),
    canopy: makeCanopyTexture(9),
    leaf: makeLeafTexture(),
    // more steps than the shared ramp: the taper and the furrows only
    // read if the shading has somewhere to go
    ramp: makeToonRamp([62, 108, 154, 200, 238, 255]),
    blobs: Array.from({ length: BLOB_VARIANTS }, (_, i) =>
      makeBlobGeometry(i + 1)
    ),
  };
}

function disposeTreeAssets(a: TreeAssets) {
  a.bark.dispose();
  a.canopy.dispose();
  a.leaf.dispose();
  a.ramp.dispose();
  a.blobs.forEach((b) => b.dispose());
}

/* ------------------------------------------------------------------ */
/*  The grove                                                          */
/* ------------------------------------------------------------------ */

export interface TreePlacement {
  x: number;
  z: number;
  scale: number;
  seed: number;
}

interface Cluster {
  variant: number;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: THREE.Color;
}

/**
 * A stand of trees, plus the leaves coming off them.
 *
 * The wood is welded per tree and the foliage is instanced across the
 * whole grove, so seven trees cost seven draw calls for branches and
 * three for every leaf cluster in the scene.
 */
export function AutumnGrove({
  trees,
  leaves = true,
}: {
  trees: TreePlacement[];
  /** Off in the model harness, where one tree is the subject. */
  leaves?: boolean;
}) {
  const assets = useMemo(makeTreeAssets, []);
  useEffect(() => () => disposeTreeAssets(assets), [assets]);

  const { wood, batches, leafField } = useMemo(() => {
    const wood: { geo: THREE.BufferGeometry; at: TreePlacement }[] = [];
    const clusters: Cluster[] = [];
    const leafField: FallingLeaf[] = [];

    trees.forEach((t) => {
      const shape = treeShape(t.seed);
      const plan = branchPlan(t.seed, shape);
      const rand = mulberry32(t.seed * 31 + 7);

      wood.push({
        geo: mergeGeometries(
          plan.map((b: Limb) =>
            makeBranchGeometry(
              b.points,
              b.r0,
              b.r1,
              b.level === 0 ? 14 : 8,
              b.level === 2 ? 5 : 7
            )
          )
        ),
        at: t,
      });

      let canopyTop = shape.height;
      for (const b of plan) {
        if (b.cluster <= 0) continue;
        const tip = b.points[b.points.length - 1];
        // sit the lump on the end of the branch, pulled back a little so
        // it swallows the tip instead of balancing on it
        const prev = b.points[b.points.length - 2];
        const px = tip[0] + (tip[0] - prev[0]) * 0.1;
        const py = tip[1] + (tip[1] - prev[1]) * 0.1;
        const pz = tip[2] + (tip[2] - prev[2]) * 0.1;

        // Warmth pushes the pick towards the red end of the palette, so
        // one tree turns before another.
        const pick = Math.min(
          AUTUMN_LEAVES.length - 1,
          Math.floor(
            (b.hue * 0.55 + shape.warmth * 0.45) * AUTUMN_LEAVES.length
          )
        );
        // A spread of sizes as well as shapes: clusters that are all one
        // size read as a pattern however ragged each one is.
        const bulk = b.cluster * t.scale * (0.72 + rand() * 0.62);
        clusters.push({
          variant: Math.floor(rand() * BLOB_VARIANTS),
          position: [t.x + px * t.scale, py * t.scale, t.z + pz * t.scale],
          scale: [
            bulk * (0.85 + rand() * 0.4),
            bulk * (0.7 + rand() * 0.4),
            bulk * (0.85 + rand() * 0.4),
          ],
          rotation: [rand() * 3, rand() * 3, rand() * 3],
          color: new THREE.Color(AUTUMN_LEAVES[pick]),
        });
        canopyTop = Math.max(canopyTop, py);
      }

      if (!leaves || shape.bare) return;
      // Leaves fall from this tree's canopy, not from a box over the
      // whole scene — they should look like they came off something.
      const spread = shape.height * 0.6 * t.scale;
      const count = Math.round(9 + shape.fullness * 7);
      for (let i = 0; i < count; i++) {
        leafField.push({
          x: t.x + (rand() - 0.5) * 2 * spread,
          z: t.z + (rand() - 0.5) * 2 * spread,
          top: canopyTop * t.scale * (0.75 + rand() * 0.3),
          fallSeconds: 7 + rand() * 7,
          cycleOffset: rand(),
          sway: 0.6 + rand() * 0.9,
          drift: 0.35 + rand() * 0.75,
          swayPhase: rand() * Math.PI * 2,
          spin: (rand() - 0.5) * 2.2,
          flutter: 1.4 + rand() * 1.8,
        });
      }
    });

    // Bucketed here rather than filtered at render time, so each batch
    // gets a stable array and doesn't rebuild its instance matrices on
    // every re-render of the scene.
    const batches = Array.from({ length: BLOB_VARIANTS }, (_, v) =>
      clusters.filter((c) => c.variant === v)
    );
    return { wood, batches, leafField };
  }, [trees, leaves]);

  useEffect(
    () => () => wood.forEach((w) => w.geo.dispose()),
    [wood]
  );

  return (
    <group>
      {wood.map((w, i) => (
        <mesh
          key={i}
          geometry={w.geo}
          position={[w.at.x, 0, w.at.z]}
          scale={w.at.scale}
          castShadow
          receiveShadow
        >
          <meshToonMaterial map={assets.bark} gradientMap={assets.ramp} />
        </mesh>
      ))}

      {assets.blobs.map((geo, variant) => (
        <ClusterBatch
          key={variant}
          geometry={geo}
          canopy={assets.canopy}
          ramp={assets.ramp}
          clusters={batches[variant]}
        />
      ))}

      {leafField.length > 0 && (
        <FallingLeaves leaves={leafField} texture={assets.leaf} />
      )}
    </group>
  );
}

/** Every cluster of one blob shape, in a single instanced draw. */
function ClusterBatch({
  geometry,
  canopy,
  ramp,
  clusters,
}: {
  geometry: THREE.BufferGeometry;
  canopy: THREE.Texture;
  ramp: THREE.Texture;
  clusters: Cluster[];
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const m = mesh.current;
    if (!m || clusters.length === 0) return;
    const dummy = new THREE.Object3D();
    clusters.forEach((c, i) => {
      dummy.position.set(...c.position);
      dummy.rotation.set(...c.rotation);
      dummy.scale.set(...c.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, c.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [clusters]);

  if (clusters.length === 0) return null;

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, clusters.length]}
      castShadow
      receiveShadow
    >
      <meshToonMaterial map={canopy} gradientMap={ramp} />
    </instancedMesh>
  );
}

/** The leaves, tumbling down out of the canopies. One instanced quad. */
function FallingLeaves({
  leaves,
  texture,
}: {
  leaves: FallingLeaf[];
  texture: THREE.Texture;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tints = useMemo(() => {
    const rand = mulberry32(551);
    return leaves.map(
      () =>
        new THREE.Color(
          AUTUMN_LEAVES[Math.floor(rand() * AUTUMN_LEAVES.length)]
        )
    );
  }, [leaves]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    tints.forEach((c, i) => m.setColorAt(i, c));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [tints]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    leaves.forEach((leaf, i) => {
      const p = leafFall(t, leaf);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(0.24);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, leaves.length]}
      // Instanced meshes are culled by the base geometry's bounds at the
      // origin, which culls the whole field the moment you turn.
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshToonMaterial
        map={texture}
        transparent
        alphaTest={0.35}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
