"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ghostPose,
  nextGhostTime,
  PASS_SECONDS,
  pickPass,
  type PassKind,
} from "@/lib/ghost";
import { mulberry32 } from "../textures";

/**
 * A ghost behind a window of the haunted house.
 *
 * It used to be a figure drawn onto a canvas and mapped to a flat
 * card, which always faced straight out however it moved — so it could
 * cross the glass and it could billow, but it could never turn, and it
 * never caught the lamplight. This one is a real shroud: a lathed
 * solid of revolution with a torn hem, two sleeves hanging off it, and
 * a face carried on the front of its own head. Turn it and the
 * silhouette changes, because there is something there to turn.
 *
 * What it does on any given pass — drift across, stop and look out,
 * come up against the glass, or dissolve half way — is decided in
 * `src/lib/ghost.ts`, along with how much of the lamp it blocks while
 * it does it.
 *
 * Haunted Hollow only.
 */

/** Dev harness only: hold a ghost still part-way through a pass. */
export interface GhostFreeze {
  kind: PassKind;
  /** 0 at the start of the pass, 1 at the end. */
  p: number;
}

/** Segments round the shroud. Enough to turn without faceting. */
const RADIAL = 18;

/**
 * How much the figure is flattened front to back.
 *
 * A reveal is only as deep as the wall, and a solid of revolution as
 * wide as this one is deep enough to push its chest through the
 * glazing bars and stand in front of them — which is where the first
 * version of the face-at-the-window ended up. Squashed, it stays in
 * the room, and turning it still changes the silhouette, which was the
 * whole reason for modelling it rather than drawing it.
 */
const SQUASH = 0.55;

export function WindowGhost({
  w,
  h,
  seed,
  /**
   * The window reads how much of its lamp is blocked from here each
   * frame. A ref rather than a callback: this changes every frame and
   * must never touch React.
   */
  shadow,
  freeze,
}: {
  w: number;
  h: number;
  seed: number;
  shadow?: RefObject<number>;
  freeze?: GhostFreeze;
}) {
  const group = useRef<THREE.Group>(null);
  const rest = useRef<Float32Array | null>(null);
  const mats = useRef<THREE.Material[]>([]);

  const rand = useMemo(() => mulberry32(seed * 104729), [seed]);
  /** Stagger the first sighting so five windows never line up. */
  const nextAt = useRef(seed * 2.2 + rand() * 6);
  const kind = useRef<PassKind>(pickPass(rand));

  /*
   * Small enough to be *in* a room rather than filling the window.
   * The first pass made the figure nearly pane-height, which read as a
   * cardboard cut-out wedged behind the glass — and put its face
   * squarely behind a glazing bar, where all you could see of it was
   * two thin arcs.
   */
  const gh = h * 0.5;
  /** Its own half-width, which is what limits how far it can travel. */
  const gw = gh * SHROUD_HALF;
  /** Room left to move without any part of it crossing the rebate. */
  const travel = Math.max(0, w / 2 - gw * 1.15);

  const geo = useMemo(() => {
    const shroud = makeShroudGeometry(gh, seed);
    const sleeve = makeSleeveGeometry(gh);
    return { shroud, sleeve };
  }, [gh, seed]);

  const face = useMemo(() => makeFaceTexture(seed), [seed]);

  useEffect(() => {
    return () => {
      geo.shroud.dispose();
      geo.sleeve.dispose();
      face.dispose();
    };
  }, [geo, face]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    let pose: ReturnType<typeof ghostPose>;
    if (freeze) {
      pose = ghostPose(freeze.kind, freeze.p);
    } else {
      const p = (t - nextAt.current) / PASS_SECONDS[kind.current];
      pose = ghostPose(kind.current, p);
      if (!pose && p > 1) {
        // Once the pass is over, book the next one and choose what it
        // will be, so the kind is settled before it is needed.
        nextAt.current = nextGhostTime(t, rand);
        kind.current = pickPass(rand);
      }
    }

    if (!pose) {
      g.visible = false;
      if (shadow) shadow.current = 0;
      return;
    }
    g.visible = true;
    if (shadow) shadow.current = pose.shadow;

    // Scaled so the figure's full width stays inside the pane at both
    // ends — there's no cheap way to clip to the glass, so it must
    // never wander onto the wall.
    // Set a little low, so the head lands inside a light rather than
    // behind the bar between two of them.
    g.position.set(
      pose.x * travel,
      pose.y * h - gh / 2 - h * 0.06,
      pose.z * 0.07
    );
    g.rotation.y = pose.turn;
    // a slow, uneasy lean as it goes
    g.rotation.z = Math.sin(t * 0.9 + seed) * 0.05;
    g.scale.set(pose.scale, pose.scale, pose.scale * SQUASH);

    for (const m of mats.current) {
      m.opacity = pose.opacity * 0.85;
    }

    // Billow the shroud: nothing at the crown, everything at the hem.
    const geometry = geo.shroud;
    const pos = geometry.attributes.position;
    if (!rest.current) {
      rest.current = Float32Array.from(pos.array as ArrayLike<number>);
    }
    const b = rest.current;
    for (let i = 0; i < pos.count; i++) {
      const bx = b[i * 3];
      const by = b[i * 3 + 1];
      const bz = b[i * 3 + 2];
      const d = Math.max(0, 1 - by / (gh * 0.62));
      const fall = d * d;
      pos.setXYZ(
        i,
        bx + Math.sin(t * 2.2 + by * 9 + seed) * gw * 0.22 * fall,
        by + Math.sin(t * 3.1 + bx * 7 + seed) * gh * 0.03 * fall,
        bz + Math.sin(t * 1.9 + bz * 6 + seed) * gw * 0.22 * fall
      );
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  const register = (m: THREE.Material | null) => {
    if (m && !mats.current.includes(m)) mats.current.push(m);
  };

  return (
    <group ref={group} visible={false}>
      {/* the shroud itself */}
      <mesh geometry={geo.shroud}>
        <meshBasicMaterial
          ref={register}
          color="#e6eefb"
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sleeves. Not hands — at this size a suggestion of reaching
          beats a pair of modelled fingers. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={geo.sleeve}
          position={[side * gh * 0.135, gh * 0.64, gh * 0.03]}
          rotation={[0.18, 0, side * 0.26]}
          scale={[side, 1, 1]}
        >
          <meshBasicMaterial
            ref={register}
            color="#e2ebf8"
            vertexColors
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* The face, on the front of the head. Turn the ghost and this
          goes edge-on and vanishes, which is exactly what a face on a
          head does. */}
      <mesh position={[0, gh * FACE_AT, gh * (FACE_OUT + 0.004)]}>
        <planeGeometry args={[gh * 0.32, gh * 0.32]} />
        <meshBasicMaterial
          ref={register}
          map={face}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * The profile the shroud is turned from: [height, radius], both as
 * fractions of the figure's height.
 *
 * The neck is the part that matters. The first attempt pinched it
 * barely at all, so head and shoulders ran together into one bell and
 * the thing read as a chess pawn.
 */
const PROFILE: [number, number][] = [
  [0.0, 0.3],
  [0.08, 0.265],
  [0.18, 0.228],
  [0.32, 0.196],
  [0.45, 0.176],
  [0.56, 0.166],
  [0.66, 0.158],
  [0.72, 0.142],
  [0.78, 0.075],
  [0.81, 0.108],
  [0.845, 0.127],
  [0.88, 0.136],
  [0.915, 0.133],
  [0.945, 0.115],
  [0.975, 0.075],
  [1.0, 0.0],
];

/** The widest the shroud gets, as a fraction of its height. */
export const SHROUD_HALF = 0.3;
/** Where the face sits: height, and how far out the head bulges. */
const FACE_AT = 0.885;
const FACE_OUT = 0.142;

/**
 * Shades a geometry into its vertex colours.
 *
 * The scene's light is a dreary overcast — ambient 1.0 and a weak key
 * — which is flat by design and leaves a lit material with no form at
 * all. So the form is baked instead: bright at the head falling away
 * to nothing at the hem, the way the drawn figure this replaced did
 * it, lifted again wherever the surface turns edge-on so the shroud
 * has a rim rather than a silhouette cut out of fog.
 */
function shadeGhost(
  geo: THREE.BufferGeometry,
  height: number,
  /**
   * Where this part hangs on the figure, 0 hem to 1 crown.
   *
   * A sleeve is modelled from its shoulder downwards, so every vertex
   * in it has a negative y and the ramp reads the whole thing as hem —
   * which came out as a pair of near-black daggers pinned to a white
   * body.
   */
  from = 0
) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = Math.max(0, Math.min(1, pos.getY(i) / height + from));
    // solid at the head, wisping away at the hem
    const body = 0.42 + v * v * 0.5 + v * 0.14;
    // edge-on to the front reads brightest
    const rim = 1 - Math.abs(nrm.getZ(i));
    /*
     * Squared on the way in. Vertex colours are read as linear, so a
     * value of 0.6 leaves the screen at about 0.8 and the whole figure
     * comes out as one flat marshmallow — which is exactly how the
     * first attempt looked.
     */
    const shade = Math.min(1, body * (0.78 + rim * 0.34)) ** 2;
    col[i * 3] = shade;
    col[i * 3 + 1] = shade;
    col[i * 3 + 2] = Math.min(1, shade * 1.08);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
}

/**
 * The shroud: a solid of revolution from hem to crown, then roughened
 * so it is not a vase.
 *
 * Left open at the bottom, so the hem is a torn edge rather than a
 * rim, and the inside of the cloth shows when it lifts.
 */
export function makeShroudGeometry(
  height: number,
  seed: number
): THREE.BufferGeometry {
  const rand = mulberry32(seed * 7717 + 3);
  const points = PROFILE.map(
    ([v, r]) =>
      new THREE.Vector2(
        // a little wobble, so no two ghosts are the same vase
        r * height * (1 + (rand() - 0.5) * 0.14),
        v * height
      )
  );
  const geo = new THREE.LatheGeometry(points, RADIAL);

  /*
   * Tear the hem and fold the cloth.
   *
   * The lathe's bottom ring is a clean circle, which on a shroud reads
   * as a lampshade. Each vertex of it lifts by a different amount —
   * from a sum of sines in the angle round the axis, so the first and
   * last segment still meet exactly and the hem has no seam.
   */
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const hem = Math.max(0, 1 - y / (height * 0.3));
    const tear =
      Math.sin(a * 3 + seed) * 0.5 +
      Math.sin(a * 5 - seed * 1.7) * 0.3 +
      Math.sin(a * 8 + seed * 2.3) * 0.2;
    const lift = hem * hem * (0.5 + tear * 0.5) * height * 0.09;
    // folds running up the cloth, strongest low down
    const fold =
      1 +
      Math.sin(a * 5 + y * 2 + seed) * 0.095 * Math.max(0, 1 - y / height) +
      Math.sin(a * 9 - y * 4 + seed * 2.1) * 0.035 * Math.max(0, 1 - y / height);
    pos.setXYZ(i, x * fold, y + lift, z * fold);
  }
  geo.computeVertexNormals();
  shadeGhost(geo, height);
  return geo;
}

/** A sleeve: a tapered tube hanging down and forward from a shoulder. */
export function makeSleeveGeometry(height: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(height * 0.05, -height * 0.11, height * 0.04),
    new THREE.Vector3(height * 0.09, -height * 0.23, height * 0.1),
    new THREE.Vector3(height * 0.1, -height * 0.33, height * 0.14),
  ]);
  const STEPS = 12;
  const RING = 7;
  const verts: number[] = [];
  const idx: number[] = [];
  const frames = curve.computeFrenetFrames(STEPS, false);
  for (let i = 0; i <= STEPS; i++) {
    const u = i / STEPS;
    const p = curve.getPoint(u);
    // full at the shoulder, tapering away to where a hand would be
    const r = height * 0.048 * (1 - u * 0.82);
    const n = frames.normals[i];
    const bi = frames.binormals[i];
    for (let j = 0; j < RING; j++) {
      const a = (j / RING) * Math.PI * 2;
      verts.push(
        p.x + (n.x * Math.cos(a) + bi.x * Math.sin(a)) * r,
        p.y + (n.y * Math.cos(a) + bi.y * Math.sin(a)) * r,
        p.z + (n.z * Math.cos(a) + bi.z * Math.sin(a)) * r
      );
    }
  }
  for (let i = 0; i < STEPS; i++) {
    for (let j = 0; j < RING; j++) {
      const a = i * RING + j;
      const b = i * RING + ((j + 1) % RING);
      const c = (i + 1) * RING + j;
      const d = (i + 1) * RING + ((j + 1) % RING);
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // shaded off the shoulder it hangs from, so it matches the body
  shadeGhost(geo, height, 0.64);
  return geo;
}

/**
 * The face: two sunken sockets with a rim of light and a long wailing
 * mouth, on a transparent ground so only the features show.
 *
 * `seed` shifts them, so the five windows aren't haunted by identical
 * twins.
 */
export function makeFaceTexture(seed: number): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  const rand = mulberry32(seed * 7717);
  const lean = (rand() - 0.5) * 7;

  /*
   * Kept tight together vertically.
   *
   * The head is only a fifth of the figure, so features spread across
   * the canvas the way a portrait would put them land with the eyes
   * on the crown and the mouth down on the neck — which from the room
   * reads as a blank white head with two specks above it.
   */
  const socket = (cx: number, tilt: number) => {
    ctx.save();
    ctx.translate(cx, 54);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 19, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(11, 10, 20, 0.96)";
    ctx.fill();
    // a faint rim of light along the top of the socket
    ctx.beginPath();
    ctx.ellipse(0, -4, 14, 19, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = "rgba(214, 230, 255, 0.55)";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  };
  socket(45 + lean, 0.28);
  socket(83 + lean, -0.28);

  // the mouth, open and long
  ctx.beginPath();
  ctx.ellipse(64 + lean * 0.5, 82, 12, 17, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(10, 9, 18, 0.93)";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(64 + lean * 0.5, 77, 7, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(32, 29, 47, 0.6)";
  ctx.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
