"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  castFor,
  FORM_BUILD,
  type GhostForm,
  ghostPose,
  nextGhostTime,
  PASS_MARK,
  PASS_SECONDS,
  pickSighting,
  SHROUD_HALF,
  type MarkKind,
  type PassKind,
} from "@/lib/ghost";
import { mulberry32 } from "../textures";

/**
 * A ghost behind a window of the haunted house.
 *
 * The version before this was a pale shrouded figure, which is a
 * bedsheet at a school disco. What is frightening at a window is a
 * shape you can only half resolve against the light behind it, and
 * the moment it touches the glass. So this is a dark silhouette: a
 * lathed shroud with a pinched neck, a torn hem and sleeves, drawn
 * almost black with a cold rim where the lamp gets round it, fading
 * out at the hem rather than ending.
 *
 * One of the forms carries a face — gaunt, hollow-eyed, lit only
 * enough to read — and one is child-sized, which is worse.
 *
 * What it does on a pass, and what it leaves on the glass, is decided
 * in `src/lib/ghost.ts`.
 *
 * Haunted Hollow only.
 */

/** Segments round the shroud. Enough to turn without faceting. */
const RADIAL = 18;

/**
 * How much the figure is flattened front to back.
 *
 * A reveal is only as deep as the wall, and a solid of revolution as
 * wide as this one is deep enough to push its chest through the
 * glazing bars and stand in front of them. Squashed, it stays in the
 * room, and turning it still changes the silhouette.
 */
const SQUASH = 0.55;

/**
 * The profile the shroud is turned from: [height, radius], both as
 * fractions of the figure's height.
 *
 * The neck is the part that matters. Pinch it barely at all and head
 * and shoulders run together into one bell, and the thing reads as a
 * chess pawn.
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

/** Where the face sits: height, and how far out the head bulges. */
const FACE_AT = 0.885;
const FACE_OUT = 0.142;

/**
 * What each form is drawn in.
 *
 * Near the glass a figure is a silhouette, so it is nearly black.
 * Further back it is not: haze lifts a distant dark thing towards the
 * brightness behind it, and a figure at the back of a lamplit room
 * comes out a warm grey rather than a cut-out. That lift is most of
 * what makes a big shape read as far away instead of just big.
 *
 * Everything else about a form — its size, how high it stands, whether
 * it has a face, how far back it is — lives in `FORM_BUILD`.
 */
const BODY: Record<GhostForm, string> = {
  shade: "#0e1319",
  gaunt: "#121820",
  small: "#101620",
  looming: "#2f2d26",
  staring: "#2b2a24",
};

/** Dev harness only: hold one still part-way through a pass. */
export interface GhostFreeze {
  form: GhostForm;
  kind: PassKind;
  /** 0 at the start of the pass, 1 at the end. */
  p: number;
}

export function WindowGhost({
  w,
  h,
  seed,
  /**
   * The window reads these each frame: how much of its lamp is
   * blocked, and what is currently printed on its glass. Refs rather
   * than callbacks — they change every frame and must never touch
   * React.
   */
  shadow,
  mark,
  markKind,
  freeze,
}: {
  w: number;
  h: number;
  seed: number;
  shadow?: RefObject<number>;
  mark?: RefObject<number>;
  markKind?: RefObject<MarkKind>;
  freeze?: GhostFreeze;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  /** Own clock, so a frozen harness ghost does not drift. */
  const clock = useRef(0);
  const sleeves = useRef<(THREE.Group | null)[]>([]);
  const faceMesh = useRef<THREE.Mesh>(null);
  const rest = useRef<Float32Array | null>(null);
  const mats = useRef<THREE.Material[]>([]);
  const bodyMats = useRef<THREE.MeshBasicMaterial[]>([]);
  /** Which form the body is currently painted as. */
  const painted = useRef<GhostForm | null>(null);

  const rand = useMemo(() => mulberry32(seed * 104729), [seed]);
  const cast = useMemo(() => castFor(seed), [seed]);
  /** Stagger the first sighting so five windows never line up. */
  const nextAt = useRef(seed * 2.2 + rand() * 6);
  const sighting = useRef(pickSighting(cast, rand));

  /** Natural figure height; each form scales off this. */
  const gh = h * 0.52;
  const gw = gh * SHROUD_HALF;

  const geo = useMemo(
    () => ({
      shroud: makeShroudGeometry(gh, seed),
      sleeve: makeSleeveGeometry(gh),
    }),
    [gh, seed]
  );
  const face = useMemo(() => makeFaceTexture(seed), [seed]);

  useEffect(() => {
    return () => {
      geo.shroud.dispose();
      geo.sleeve.dispose();
      face.dispose();
    };
  }, [geo, face]);

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 1 / 20);
    const t = clock.current + delta;
    clock.current = t;

    const active = freeze ?? {
      ...sighting.current,
      p: (t - nextAt.current) / PASS_SECONDS[sighting.current.kind],
    };
    const pose = ghostPose(active.kind, active.p);

    if (!freeze && !pose && active.p > 1) {
      // Once the pass is over, book the next one and choose what it
      // will be, so it is settled before it is needed.
      nextAt.current = nextGhostTime(t, rand);
      sighting.current = pickSighting(cast, rand);
    }

    if (markKind) markKind.current = PASS_MARK[active.kind];
    if (shadow) {
      // something at the back of the room stands across much less of
      // the lamp than something against the glass
      shadow.current =
        (pose?.shadow ?? 0) * (1 - FORM_BUILD[active.form].depth * 0.55);
    }
    if (mark) mark.current = pose?.press ?? 0;

    if (!pose) {
      g.visible = false;
      return;
    }
    g.visible = true;

    const build = FORM_BUILD[active.form];

    if (painted.current !== active.form) {
      painted.current = active.form;
      for (const m of bodyMats.current) m.color.set(BODY[active.form]);
    }

    /*
     * Room left to move without any part of it crossing the rebate.
     *
     * Measured off *this form's* half-width, not the natural one — a
     * form half again as tall is half again as wide, and sizing the
     * travel off the wrong figure walks it out over the clapboard,
     * which there is no cheap way to clip.
     *
     * Set-back forms barely move across at all, which is its own
     * depth cue: distance costs you angle.
     */
    const halfWide = gw * build.size * pose.scale;
    const travel =
      Math.max(0, w / 2 - halfWide * 1.15) * (1 - build.depth * 0.55);
    // Set a little low, so the head lands inside a light rather than
    // behind the bar between two of them.
    g.position.set(
      pose.x * travel,
      (pose.y - build.drop) * h - (gh * build.size) / 2 - h * 0.06,
      // back into the room, and only the near ones come to the glass
      pose.z * 0.07 - build.depth * gh * 0.1
    );
    g.rotation.y = pose.turn;
    // a slow, uneasy lean as it goes
    g.rotation.z = Math.sin(t * 0.9 + seed) * 0.04;
    const s = pose.scale * build.size;
    g.scale.set(s, s, s * SQUASH);

    // hazier the further back it is, which is the other half of why a
    // big one reads as distant rather than merely large
    const haze = 1 - build.depth * 0.2;
    for (const m of mats.current) m.opacity = pose.opacity * haze;
    if (faceMesh.current) faceMesh.current.visible = build.face;

    /*
     * The arms. Hanging at rest; at full reach they come up and
     * forward until the palms would be flat on the glass — which is
     * where the print on the window comes from.
     */
    const r = pose.reach;
    for (let i = 0; i < 2; i++) {
      const arm = sleeves.current[i];
      if (!arm) continue;
      const side = i === 0 ? -1 : 1;
      /*
       * Raised almost entirely about X, so the arm swings up and
       * forward in the plane it hangs in. Driving the raise partly
       * from Z as well splays the arms straight out sideways and the
       * figure comes out as a scarecrow, which is what happened first
       * time — Euler XYZ applies the Z swing innermost, so it fans the
       * arm out before the raise ever gets to it.
       */
      arm.rotation.set(
        0.18 - r * 2.0,
        -r * side * 0.16,
        side * (0.17 + r * 0.29)
      );
    }

    // Billow the shroud: nothing at the crown, everything at the hem.
    // It goes still while it is pressed against the glass.
    const geometry = geo.shroud;
    const pos = geometry.attributes.position;
    if (!rest.current) {
      rest.current = Float32Array.from(pos.array as ArrayLike<number>);
    }
    const b = rest.current;
    const calm = 1 - pose.press * 0.75;
    for (let i = 0; i < pos.count; i++) {
      const bx = b[i * 3];
      const by = b[i * 3 + 1];
      const bz = b[i * 3 + 2];
      const d = Math.max(0, 1 - by / (gh * 0.62));
      const fall = d * d * calm;
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
  const registerBody = (m: THREE.MeshBasicMaterial | null) => {
    register(m);
    if (m && !bodyMats.current.includes(m)) bodyMats.current.push(m);
  };

  const shroudColour = BODY[freeze?.form ?? "gaunt"];

  return (
    <group ref={group} visible={false}>
      <group ref={body}>
        <mesh geometry={geo.shroud}>
          <meshBasicMaterial
            ref={registerBody}
            color={shroudColour}
            vertexColors
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Sleeves. Not hands — what the hands do is printed on the
            glass, which is sharper than any geometry at this size. */}
        {[0, 1].map((i) => {
          const side = i === 0 ? -1 : 1;
          return (
            <group
              key={i}
              ref={(n) => {
                sleeves.current[i] = n;
              }}
              position={[side * gh * 0.118, gh * 0.64, gh * 0.03]}
              rotation={[0.18, 0, side * 0.17]}
            >
              <mesh geometry={geo.sleeve} scale={[side, 1, 1]}>
                <meshBasicMaterial
                  ref={registerBody}
                  color={shroudColour}
                  vertexColors
                  transparent
                  opacity={0}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          );
        })}

        {/* The face, on the front of the head. Turn the ghost and it
            goes edge-on and vanishes, which is what a face does. */}
        <mesh
          ref={faceMesh}
          position={[0, gh * FACE_AT, gh * (FACE_OUT + 0.004)]}
        >
          <planeGeometry args={[gh * 0.34, gh * 0.34]} />
          <meshBasicMaterial
            ref={register}
            map={face}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Shades a geometry into its vertex colours, with alpha.
 *
 * The scene's light is a dreary overcast — ambient 1.0 and a weak key
 * — which is flat by design and leaves a lit material with no form at
 * all. So the form is baked instead: a cold rim where the lamp behind
 * gets round the edge of the figure, and an alpha that runs out at the
 * hem so the cloth dissolves rather than stopping.
 *
 * Four components, because three enables vertex alpha only when the
 * colour attribute has them — and the hem fading out is most of what
 * makes this read as a ghost rather than as a dark vase.
 */
function shadeGhost(
  geo: THREE.BufferGeometry,
  height: number,
  /** Where this part hangs on the figure, 0 hem to 1 crown. */
  from = 0
) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const v = Math.max(0, Math.min(1, pos.getY(i) / height + from));
    // edge-on to the front is where the light behind it creeps round
    const rim = 1 - Math.abs(nrm.getZ(i));
    const lift = Math.min(1, 0.55 + rim * rim * 1.5);
    col[i * 4] = lift;
    col[i * 4 + 1] = lift * 1.02;
    col[i * 4 + 2] = Math.min(1, lift * 1.12);
    // solid at the shoulders, gone by the hem
    col[i * 4 + 3] = Math.min(1, 0.12 + v * 1.5);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 4));
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
    // full at the shoulder, tapering to where a hand would be
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
 * The face: gaunt, hollow-eyed, and lit only enough to read.
 *
 * Drawn to fade out at its own edges rather than filling its plane,
 * so it reads as a face coming out of the dark and not as a mask
 * stuck on the front of a head. The eyes are the darkest thing on it
 * and the cheekbones the brightest, which is the whole trick: two
 * round sockets and an O of a mouth is a pumpkin.
 */
export function makeFaceTexture(seed: number): THREE.CanvasTexture {
  const S = 160;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  const rand = mulberry32(seed * 7717);
  const lean = (rand() - 0.5) * 7;
  const cx = S / 2 + lean * 0.4;

  /** A soft blob, the only brush this needs. */
  const blob = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    colour: string,
    a: number,
    rot = 0
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(${colour}, ${a})`);
    g.addColorStop(0.55, `rgba(${colour}, ${a * 0.62})`);
    g.addColorStop(1, `rgba(${colour}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // cold and a little green, and never bright: this is a face that
  // happens to be catching a lamp, not a light source
  const PALE = "188, 202, 194";
  const DARK = "5, 7, 11";

  // the pale of the face, falling away at every edge so it reads as a
  // face coming out of the dark rather than a mask on a head
  blob(cx, 80, 39, 55, PALE, 0.62);

  // The bones that catch what light there is. Gaunt is not thin: it is
  // brow, cheekbone and jaw standing out of hollows.
  blob(cx, 52, 26, 8, PALE, 0.42);
  blob(cx - 24, 84, 12, 10, PALE, 0.4, -0.25);
  blob(cx + 24, 84, 12, 10, PALE, 0.4, 0.25);
  blob(cx, 100, 9, 8, PALE, 0.24);

  /*
   * The sockets. Small, deep, angled down towards the nose, and with
   * nothing bright inside them — two big round holes with a rim of
   * light is a pumpkin, which is exactly what the first attempt was.
   */
  blob(cx - 16, 64, 9, 13, DARK, 0.97, 0.34);
  blob(cx + 16, 64, 9, 13, DARK, 0.97, -0.34);

  // temples and the hollows under the cheekbones
  blob(cx - 38, 62, 12, 16, DARK, 0.4);
  blob(cx + 38, 62, 12, 16, DARK, 0.4);
  blob(cx - 24, 103, 13, 10, DARK, 0.42);
  blob(cx + 24, 103, 13, 10, DARK, 0.42);

  // the nose: shadow down one side, and two dark nostrils
  blob(cx - 6, 82, 6, 16, DARK, 0.36);
  blob(cx - 5, 95, 3, 3.6, DARK, 0.7);
  blob(cx + 5, 95, 3, 3.6, DARK, 0.7);

  /*
   * The mouth: a thin line with its corners *below* its middle.
   *
   * Bow it the other way and the control point sits under the ends,
   * which draws a smile — and a smiling gaunt face is a party mask.
   */
  ctx.strokeStyle = "rgba(6, 8, 12, 0.82)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 12, 115 + lean * 0.2);
  ctx.quadraticCurveTo(cx, 107, cx + 12, 114 - lean * 0.2);
  ctx.stroke();
  blob(cx, 122, 13, 8, DARK, 0.4);

  // and the whole lower face losing itself in the body
  blob(cx, 140, 34, 22, DARK, 0.5);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
