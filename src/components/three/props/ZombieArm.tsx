"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type ArmPose, fingerCurl } from "@/lib/zombie";
import { makeToonRamp, mulberry32 } from "../textures";

/**
 * The arm that comes up out of a grave.
 *
 * It was a cylinder, a box and five capsules. This is built the way an
 * arm is: a forearm that tapers to a wrist, a palm with real width
 * across the knuckles, and five fingers of three bones each hinged at
 * the joints — so a grasp is an actual curl rolling down the finger
 * rather than a whole digit pivoting at its base.
 *
 * Three of them, because one arm repeated across a graveyard is one
 * corpse repeated. A `gaunt` one is dried and stringy, a `bloated` one
 * is swollen and dark, and a `skeletal` one is mostly bone with the
 * last of the skin hanging off it.
 *
 * Photoreal is not on the table — no downloaded models, no image
 * assets, and a photoreal arm beside a toon pumpkin looks worse than
 * either. What this goes for is anatomy that holds up and decay drawn
 * in enough detail to be unpleasant at the distance it is seen.
 */

export const ARM_KINDS = ["gaunt", "bloated", "skeletal"] as const;
export type ArmKind = (typeof ARM_KINDS)[number];

interface Build {
  /** Radius at the elbow end and at the wrist. */
  forearm: [number, number];
  forearmLength: number;
  /** Across the knuckles, and front to back. */
  palm: [number, number, number];
  /** Radius of a finger bone at its base. */
  finger: number;
  /** Lengths of the three bones, proximal first. */
  bones: [number, number, number];
  skin: string;
  bone: string;
  /** How far the skin has gone — drives the texture. */
  rot: number;
}

const BUILDS: Record<ArmKind, Build> = {
  gaunt: {
    forearm: [0.075, 0.048],
    forearmLength: 0.52,
    palm: [0.15, 0.17, 0.055],
    finger: 0.0155,
    bones: [0.076, 0.052, 0.036],
    skin: "#c3cba4",
    bone: "#cfc6ac",
    rot: 0.55,
  },
  bloated: {
    forearm: [0.098, 0.072],
    forearmLength: 0.47,
    palm: [0.185, 0.185, 0.08],
    finger: 0.021,
    bones: [0.07, 0.048, 0.034],
    skin: "#a3ada4",
    bone: "#c6bda6",
    rot: 0.3,
  },
  skeletal: {
    forearm: [0.055, 0.036],
    forearmLength: 0.56,
    palm: [0.135, 0.16, 0.042],
    finger: 0.012,
    bones: [0.082, 0.056, 0.04],
    skin: "#d2d5b8",
    bone: "#ded4b8",
    rot: 0.92,
  },
};

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

/**
 * A limb segment: a tube along `points`, tapering `r0` to `r1`, with
 * knuckle swell where it meets the next bone.
 *
 * Same sweep the tree branches use — the thing a capsule cannot do is
 * change thickness along its length, and a finger bone that doesn't is
 * the tell.
 */
export function makeBoneGeometry(
  points: [number, number, number][],
  r0: number,
  r1: number,
  swell = 0,
  /** 1 is round. Fingers are flattened front to back; a forearm is not. */
  flatten = 1,
  tubular = 8,
  radial = 7
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
  );
  const frames = curve.computeFrenetFrames(tubular, false);
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
    // taper, plus a joint bulge at each end
    const knuckle = swell * (Math.pow(1 - u, 6) + Math.pow(u, 6));
    // pow > 1 keeps the fullness up near the elbow and draws the taper
    // in hard towards the wrist, which is where an arm narrows
    const r = r1 + (r0 - r1) * Math.pow(1 - u, 1.7) + knuckle;
    for (let j = 0; j <= radial; j++) {
      const v = j / radial;
      const a = v * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const nx = N.x * c + B.x * sn * flatten;
      const ny = N.y * c + B.y * sn * flatten;
      const nz = N.z * c + B.z * sn * flatten;
      position.push(P.x + nx * r, P.y + ny * r, P.z + nz * r);
      normal.push(nx, ny, nz);
      uv.push(v, u);
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
  geo.computeVertexNormals();
  return geo;
}

/**
 * The palm: widest across the knuckles, narrowing to the wrist,
 * slightly cupped and thicker on the thumb side. A box reads as a
 * block of wood.
 */
export function makePalmGeometry(
  w: number,
  h: number,
  d: number,
  segW = 10,
  segH = 12
): THREE.BufferGeometry {
  const position: number[] = [];
  const index: number[] = [];
  const uv: number[] = [];

  // Two sheets — back of the hand and palm side — joined at the rim.
  for (const side of [1, -1]) {
    const base = position.length / 3;
    for (let j = 0; j <= segH; j++) {
      const v = j / segH;
      // narrow at the wrist, widest at the knuckles, rounding off
      const width =
        w * (0.62 + 0.38 * Math.sin(Math.min(1, v * 1.15) * Math.PI * 0.72));
      for (let i = 0; i <= segW; i++) {
        const u = i / segW;
        const x = (u - 0.5) * width;
        const y = v * h;
        // the cup: the palm side hollows, the back domes
        const across = 1 - Math.pow(Math.abs(u - 0.5) * 2, 2);
        // Never allowed to thin out at the knuckle edge: the fingers
        // are carried there, and a palm thinner than the fingers on it
        // leaves each one apparently stuck to a sheet of card.
        const along = 0.72 + 0.28 * Math.sin(v * Math.PI);
        const thick = (d / 2) * (0.5 + 0.5 * across) * along;
        const cup = side < 0 ? -0.42 * across * along * d : 0;
        position.push(x, y, side * thick + cup);
        uv.push(u, v);
      }
    }
    const row = segW + 1;
    for (let j = 0; j < segH; j++) {
      for (let i = 0; i < segW; i++) {
        const a = base + j * row + i;
        if (side > 0) index.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
        else index.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
      }
    }
  }

  // stitch the two sheets around their shared rim
  const perSide = (segW + 1) * (segH + 1);
  const row = segW + 1;
  const rim: [number, number][] = [];
  for (let i = 0; i <= segW; i++) rim.push([i, perSide + i]); // wrist
  for (let j = 0; j <= segH; j++)
    rim.push([j * row + segW, perSide + j * row + segW]); // one edge
  for (let i = segW; i >= 0; i--)
    rim.push([segH * row + i, perSide + segH * row + i]); // knuckles
  for (let j = segH; j >= 0; j--) rim.push([j * row, perSide + j * row]); // other
  for (let k = 0; k < rim.length - 1; k++) {
    const [a, b] = rim[k];
    const [c, d2] = rim[k + 1];
    index.push(a, b, c, c, b, d2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Texture                                                            */
/* ------------------------------------------------------------------ */

/**
 * Dead skin: mottled and drained, with veins gone dark under it,
 * bruising where the blood settled, grave dirt worked into it, and
 * torn patches where it has split and dried back.
 *
 * `rot` runs 0 (recently dead) to 1 (little left but bone), and moves
 * the balance from bruised flesh towards bare, stained bone.
 */
export function makeFleshTexture(kind: ArmKind, seed = 17): THREE.CanvasTexture {
  const S = 512;
  const build = BUILDS[kind];
  const rot = build.rot;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  // Pale, so the material colour still does the tinting.
  // Pale, so the material colour still does the tinting. Every pass
  // below darkens, and there are a lot of them — start too low and the
  // arm comes out near black however it is lit.
  ctx.fillStyle = "#efe9d8";
  ctx.fillRect(0, 0, S, S);

  const wrapped = (x: number, y: number, m: number, draw: (x: number, y: number) => void) => {
    const xs = [x, ...(x < m ? [x + S] : []), ...(x > S - m ? [x - S] : [])];
    const ys = [y, ...(y < m ? [y + S] : []), ...(y > S - m ? [y - S] : [])];
    for (const xx of xs) for (const yy of ys) draw(xx, yy);
  };

  // Blotching — the uneven drained look of skin with no blood in it.
  for (let i = 0; i < 60; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 14 + rand() * 72;
    wrapped(x, y, r, (xx, yy) => {
      const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
      const dark = rand() < 0.55;
      const a = 0.04 + rand() * 0.1;
      g.addColorStop(0, dark ? `rgba(92, 96, 78, ${a})` : `rgba(255, 252, 238, ${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Bruising where the blood pooled, strongest on a fresher body.
  for (let i = 0; i < Math.round(26 * (1 - rot) + 4); i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 18 + rand() * 54;
    wrapped(x, y, r, (xx, yy) => {
      const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
      g.addColorStop(0, `rgba(74, 58, 86, ${0.06 + rand() * 0.1})`);
      g.addColorStop(0.6, `rgba(96, 74, 66, ${0.04 + rand() * 0.06})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Veins, gone dark and standing out under thin skin. Branching, not
  // drawn as single strokes — a vein that doesn't fork reads as a wire.
  const vein = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
    if (depth > 3 || len < 5) return;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    ctx.strokeStyle = `rgba(58, 62, 74, ${0.1 + 0.16 / (depth + 1)})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(ang + 0.5) * len * 0.6,
      y + Math.sin(ang + 0.5) * len * 0.6,
      ex,
      ey
    );
    ctx.stroke();
    if (rand() < 0.85) vein(ex, ey, ang + 0.4 + rand() * 0.4, len * 0.62, w * 0.64, depth + 1);
    if (rand() < 0.7) vein(ex, ey, ang - 0.4 - rand() * 0.4, len * 0.58, w * 0.6, depth + 1);
  };
  for (let i = 0; i < 16; i++) {
    vein(rand() * S, rand() * S, rand() * Math.PI * 2, 30 + rand() * 46, 1.9, 0);
  }

  // Splits in the skin, drying back to show what's underneath. More of
  // them the further gone the body is.
  for (let i = 0; i < Math.round(8 + rot * 22); i++) {
    const x = rand() * S;
    const y = rand() * S;
    const w = 12 + rand() * 46;
    const h = 5 + rand() * 16;
    const ang = rand() * Math.PI;
    wrapped(x, y, w, (xx, yy) => {
      ctx.save();
      ctx.translate(xx, yy);
      ctx.rotate(ang);
      // the wound
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(58, 40, 36, ${0.4 + rand() * 0.35})`;
      ctx.fill();
      // dried lip of skin curled back along one edge
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.38, w / 2, h * 0.3, 0, 0, Math.PI, true);
      ctx.strokeStyle = "rgba(255, 250, 236, 0.35)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    });
  }

  // Grave dirt, worked in and never coming out.
  for (let i = 0; i < 90; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 3 + rand() * 22;
    wrapped(x, y, r, (xx, yy) => {
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${56 + rand() * 24}, ${44 + rand() * 20}, ${
        30 + rand() * 16
      }, ${0.04 + rand() * 0.11})`;
      ctx.fill();
    });
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ */
/*  The arm                                                            */
/* ------------------------------------------------------------------ */

/** Where each finger sits across the knuckles, and how long it runs. */
const FINGERS = [
  { x: -0.38, y: 0.94, scale: 1.0, splay: -0.17 }, // index
  { x: -0.13, y: 1.0, scale: 1.12, splay: -0.05 }, // middle
  { x: 0.13, y: 0.97, scale: 1.03, splay: 0.07 }, // ring
  { x: 0.37, y: 0.87, scale: 0.8, splay: 0.2 }, // little — set lower
];

/**
 * One arm.
 *
 * The pose arrives in a ref and is applied to object transforms inside
 * a frame loop, never through state. Posing this through React would
 * re-render a tree of twenty-odd meshes sixty times a second for the
 * whole of a rise, which is not a thing to do to a phone.
 *
 * The caller owns the timing — this does none — so the motion stays in
 * `src/lib/zombie.ts` where it can be tested.
 */
export function ZombieArm({
  kind,
  pose,
  seed = 1,
}: {
  kind: ArmKind;
  /** Live pose. Read every frame; never causes a render. */
  pose: React.RefObject<ArmPose>;
  seed?: number;
}) {
  const root = useRef<THREE.Group>(null);
  /** Every finger's joints, outermost first: [finger][joint]. */
  const joints = useRef<(THREE.Group | null)[][]>([]);
  const build = BUILDS[kind];
  /**
   * Nearly continuous, unlike every other prop here.
   *
   * A six-step ramp under the scene's flat overcast puts the whole
   * forearm in one band, and a cylinder that shades as a single flat
   * value reads as a plank however round it actually is. Twenty steps
   * still quantises — it is the same material as everything else — but
   * leaves enough gradient for the limb to have form.
   */
  const ramp = useMemo(
    () =>
      makeToonRamp(
        Array.from({ length: 20 }, (_, i) =>
          Math.round(34 + (i / 19) * (255 - 34))
        )
      ),
    []
  );
  const flesh = useMemo(() => makeFleshTexture(kind, seed * 31 + 7), [kind, seed]);

  const geo = useMemo(() => {
    const [r0, r1] = build.forearm;
    const L = build.forearmLength;
    // A forearm is not straight: it bows out towards the elbow and the
    // wrist sits slightly off the line of it.
    const forearm = makeBoneGeometry(
      [
        [0, -L, 0.02],
        [0.012, -L * 0.62, -0.005],
        [0.006, -L * 0.28, 0],
        [0, 0, 0],
      ],
      r0,
      r1,
      0,
      1,
      12,
      11
    );
    const palm = makePalmGeometry(...build.palm);
    const [b0, b1, b2] = build.bones;
    const bones = [b0, b1, b2].map((len, i) =>
      makeBoneGeometry(
        [
          [0, 0, 0],
          [0, len * 0.5, i === 0 ? 0.004 : 0.002],
          [0, len, 0],
        ],
        build.finger * (1 - i * 0.16),
        build.finger * (1 - (i + 1) * 0.16),
        build.finger * 0.2,
        0.78,
        5,
        7
      )
    );
    const nail = new THREE.SphereGeometry(build.finger * 0.95, 8, 6);
    // Unit blob, scaled per joint. Knuckles and the wrist are what stop
    // a thin finger meeting a thick palm at a visible step.
    const joint = new THREE.SphereGeometry(1, 10, 8);
    return { forearm, palm, bones, nail, joint };
  }, [build]);

  useEffect(
    () => () => {
      ramp.dispose();
      flesh.dispose();
      geo.forearm.dispose();
      geo.palm.dispose();
      geo.bones.forEach((b) => b.dispose());
      geo.nail.dispose();
      geo.joint.dispose();
    },
    [ramp, flesh, geo]
  );

  const skin = (
    <meshToonMaterial map={flesh} color={build.skin} gradientMap={ramp} />
  );

  // Even limp, a dead hand is slightly hooked — flat fingers read as a
  // mitten. Each joint keeps a little bend at rest.
  const REST = [0.22, 0.3, 0.26];
  const BEND = [1.15, 1.35, 0.92];

  useFrame(() => {
    const g = root.current;
    const p = pose.current;
    if (!g || !p) return;
    g.position.set(p.drag, p.y, 0);
    g.rotation.set(p.shake, p.twist, p.lean + p.shake * 0.5);

    for (let f = 0; f < joints.current.length; f++) {
      const curl = fingerCurl(p.grasp, f);
      const chain = joints.current[f];
      for (let j = 0; j < chain.length; j++) {
        const node = chain[j];
        // Negative: the palm's cup faces -Z, so a positive bend about X
        // would curl the fingers over the BACK of the hand.
        if (node) node.rotation.x = -(REST[j] + curl * BEND[j]);
      }
    }
  });

  const register = (finger: number, joint: number) => (g: THREE.Group | null) => {
    (joints.current[finger] ??= [])[joint] = g;
  };

  return (
    <group ref={root}>
      <mesh geometry={geo.forearm} castShadow receiveShadow>
        {skin}
      </mesh>

      {/* Wrist: bridges the round forearm into the flat palm. Without
          it the two meet at a step you can see from across the yard. */}
      <mesh
        geometry={geo.joint}
        position={[0, 0.005, 0]}
        scale={[
          build.palm[0] * 0.34,
          build.forearm[1] * 1.05,
          build.palm[2] * 0.6,
        ]}
        castShadow
      >
        {skin}
      </mesh>

      <mesh geometry={geo.palm} position={[0, 0.01, 0]} castShadow receiveShadow>
        {skin}
      </mesh>

      {/* Knuckles. They belong to the palm, not the finger, so the
          joint stays covered however far the finger curls — which is
          what the fingers were missing: at any curl past a few degrees
          the bone swung clear of the palm edge and left a gap. */}
      {FINGERS.map((f, i) => (
        <mesh
          key={`k${i}`}
          geometry={geo.joint}
          position={[
            f.x * build.palm[0],
            build.palm[1] * f.y,
            build.palm[2] * 0.06,
          ]}
          scale={[
            build.finger * 1.2,
            build.finger * 1.05,
            build.finger * 1.15,
          ]}
          castShadow
        >
          {skin}
        </mesh>
      ))}

      {FINGERS.map((f, i) => (
        <Finger
          key={i}
          geo={geo}
          build={build}
          ramp={ramp}
          skin={skin}
          at={[
            f.x * build.palm[0],
            build.palm[1] * f.y - build.finger * 0.5,
            build.palm[2] * 0.06,
          ]}
          splay={f.splay}
          scale={f.scale}
          register={register}
          finger={i}
        />
      ))}

      {/* Thumb: set low on the side and turned across the palm. */}
      <group
        // On the palm side and tucked in. Splayed further out than this
        // it reads as a separate thing floating beside the hand.
        // Up beside the index knuckle and turned across the palm. Set
        // any lower and it reads as growing out of the wrist.
        position={[
          -build.palm[0] * 0.4,
          build.palm[1] * 0.58,
          -build.palm[2] * 0.6,
        ]}
        rotation={[-0.4, 0.45, 0.48]}
      >
        <mesh
          geometry={geo.joint}
          scale={[build.finger * 1.3, build.finger * 1.2, build.finger * 1.25]}
          castShadow
        >
          {skin}
        </mesh>
        <Finger
          geo={geo}
          build={build}
          ramp={ramp}
          skin={skin}
          at={[0, -build.finger * 0.4, 0]}
          splay={0}
          scale={0.92}
          register={register}
          finger={4}
          segments={2}
        />
      </group>
    </group>
  );
}

/**
 * One finger: three bones, each hinged on the end of the last, so a
 * curl rolls down it rather than the whole digit pivoting at its base.
 *
 * The joints are handed back to the arm through `register`, which
 * drives them from its frame loop.
 */
function Finger({
  geo,
  build,
  ramp,
  skin,
  at,
  splay,
  scale,
  register,
  finger,
  segments = 3,
}: {
  geo: { bones: THREE.BufferGeometry[]; nail: THREE.BufferGeometry };
  build: Build;
  ramp: THREE.Texture;
  skin: React.ReactElement;
  at: [number, number, number];
  splay: number;
  scale: number;
  register: (finger: number, joint: number) => (g: THREE.Group | null) => void;
  finger: number;
  segments?: number;
}) {
  const bones = build.bones;

  let node = (
    <mesh
      geometry={geo.nail}
      // on the back of the fingertip, not sticking out of the end
      position={[0, bones[segments - 1] * scale * 0.72, build.finger * 0.5]}
      scale={[0.85, 1.25, 0.3]}
      castShadow
    >
      <meshToonMaterial color={build.bone} gradientMap={ramp} />
    </mesh>
  );

  // Built from the tip back, so each bone can parent the one past it.
  for (let i = segments - 1; i >= 0; i--) {
    const child = node;
    node = (
      <group
        ref={register(finger, i)}
        position={i === 0 ? [0, 0, 0] : [0, bones[i - 1] * scale, 0]}
        rotation={[0, 0, i === 0 ? splay : 0]}
      >
        <mesh geometry={geo.bones[i]} scale={[1, scale, 1]} castShadow receiveShadow>
          {skin}
        </mesh>
        {child}
      </group>
    );
  }

  return <group position={at}>{node}</group>;
}
