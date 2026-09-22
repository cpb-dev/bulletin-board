"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { BoardTheme } from "@/lib/themes";
import { BOARD } from "@/lib/board-geometry";
import {
  GHOST_PASS_DURATION,
  ghostPass,
  nextGhostTime,
  ZOMBIE_HAND_DURATION,
  zombieHandPose,
} from "@/lib/haunted";
import { makeToonGradient, mulberry32 } from "./textures";

// The board's occlusion shadow in room view reaches roughly x -5.2..4.3
// at this depth, so a house centred behind the board is almost entirely
// hidden by it. It sits off to the left instead, turned towards the
// viewer so you read it as a house rather than a flat slab.
const HOUSE_Z = BOARD.wallZ - 4.8;
const HOUSE_X = -5.8;
const HOUSE_TURN = 0.62; // radians, front face swung towards the camera

/**
 * The Haunted Hollow scene: the board stands on posts in an autumn
 * graveyard outside a crooked old house on an overcast afternoon.
 * Ghosts drift past the windows every so often, pumpkins sit around in
 * the leaves, and tapping a grave brings a hand up out of the soil.
 *
 * Rendered instead of <Room/> when theme.scene === "haunted".
 */
export function HauntedScene({ theme }: { theme: BoardTheme }) {
  const gradient = useMemo(() => makeToonGradient(), []);

  return (
    <group>
      <SkyBackground />

      {/* Overcast autumn afternoon: soft and amber rather than dark —
          the ticket asks for daytime, so the dread comes from the
          scenery, not from turning the lights off. */}
      <ambientLight intensity={0.95} color="#f3e2c8" />
      <directionalLight
        position={[-4, 7, 4]}
        intensity={1.35}
        color="#ffe6b8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={7}
        shadow-camera-bottom={-3}
      />
      <hemisphereLight args={["#c9b79b", "#6b5436", 0.55]} />

      <HauntedHouse gradient={gradient} />
      <AutumnTrees gradient={gradient} />
      <FallingLeaves />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.5]} receiveShadow>
        <planeGeometry args={[40, 24]} />
        <meshToonMaterial color={theme.room.floor} gradientMap={gradient} />
      </mesh>

      <BoardPosts gradient={gradient} />
      <Graves gradient={gradient} />
      <Pumpkins gradient={gradient} accent={theme.room.accent} />
      <DeadBranch gradient={gradient} />
    </group>
  );
}

/**
 * Sets the scene's clear colour and fog directly — a nested
 * `<color attach="background">` would attach to the group, not the
 * scene. Restores both on unmount so switching themes stays clean.
 */
function SkyBackground() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color("#c7a789");
    scene.fog = new THREE.Fog("#d8bb9a", 22, 70);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);
  return <SkyDome />;
}

/** A big inverted sphere with a heavy amber-to-grey autumn gradient. */
function SkyDome() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "#8f7f7a"); // bruised grey overhead
    g.addColorStop(0.55, "#c9a184");
    g.addColorStop(1, "#e8c79d"); // hazy amber at the horizon
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[60, 24, 16]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  The house                                                          */
/* ------------------------------------------------------------------ */

/** Window positions on the house face, in local coordinates. */
const WINDOWS: { x: number; y: number; w: number; h: number }[] = [
  { x: -1.9, y: 2.0, w: 0.9, h: 1.1 },
  { x: 0.1, y: 2.0, w: 0.9, h: 1.1 },
  { x: 2.1, y: 2.0, w: 0.9, h: 1.1 },
  { x: -1.0, y: 4.1, w: 0.8, h: 0.9 },
  { x: 1.2, y: 4.1, w: 0.8, h: 0.9 },
];

function HauntedHouse({ gradient }: { gradient: THREE.Texture }) {
  const wall = "#4a3f4d";
  const roof = "#2f2733";

  return (
    <group position={[HOUSE_X, 0, HOUSE_Z]} rotation={[0, HOUSE_TURN, 0]}>
      {/* main block */}
      <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 5.2, 4]} />
        <meshToonMaterial color={wall} gradientMap={gradient} />
      </mesh>
      {/* sagging roof — a squat pyramid, rolled a touch so it reads crooked */}
      <mesh position={[0, 5.9, 0]} rotation={[0, Math.PI / 4, 0.035]} castShadow>
        <coneGeometry args={[5.1, 2.3, 4]} />
        <meshToonMaterial color={roof} gradientMap={gradient} />
      </mesh>
      {/* tower on one side, for a lopsided silhouette */}
      <mesh position={[-3.5, 3.4, 0.4]} castShadow>
        <boxGeometry args={[1.9, 6.8, 1.9]} />
        <meshToonMaterial color="#443a47" gradientMap={gradient} />
      </mesh>
      <mesh position={[-3.5, 7.5, 0.4]} rotation={[0, Math.PI / 4, -0.05]}>
        <coneGeometry args={[1.7, 2.1, 4]} />
        <meshToonMaterial color={roof} gradientMap={gradient} />
      </mesh>
      {/* chimney */}
      <mesh position={[2.3, 6.6, -0.6]} castShadow>
        <boxGeometry args={[0.7, 2.1, 0.7]} />
        <meshToonMaterial color="#3b3340" gradientMap={gradient} />
      </mesh>

      {/* door */}
      <mesh position={[0.1, 0.85, 2.01]}>
        <planeGeometry args={[1.1, 1.7]} />
        <meshToonMaterial color="#2a2028" gradientMap={gradient} />
      </mesh>

      {WINDOWS.map((w, i) => (
        <Window key={i} {...w} seed={i + 1} gradient={gradient} />
      ))}
    </group>
  );
}

/**
 * One lit window. A ghost drifts behind the glass on its own random
 * schedule, so sightings never line up across windows.
 */
function Window({
  x,
  y,
  w,
  h,
  seed,
  gradient,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  gradient: THREE.Texture;
}) {
  const ghost = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const rand = useMemo(() => mulberry32(seed * 104729), [seed]);
  // Stagger the first sighting so they don't all arrive at once.
  const nextAt = useRef(seed * 2.2 + rand() * 6);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = ghost.current;
    const m = material.current;
    if (!g || !m) return;

    const p = (t - nextAt.current) / GHOST_PASS_DURATION;
    const pose = ghostPass(p);
    if (!pose) {
      g.visible = false;
      // Once the pass is over, book the next one.
      if (p > 1) nextAt.current = nextGhostTime(t, rand);
      return;
    }
    g.visible = true;
    // Scaled so the ghost's full width stays inside the pane at both
    // ends of the drift — there's no cheap way to clip to the glass, so
    // it must never wander onto the wall.
    g.position.x = pose.x * w * 0.55;
    g.position.y = pose.bob;
    m.opacity = pose.opacity * 0.85;
  });

  return (
    <group position={[x, y, 2.02]}>
      {/* the lit pane */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#d9b25c" />
      </mesh>

      {/* the ghost lives between the pane and the glazing bars, so it
          genuinely reads as being behind the glass */}
      <group ref={ghost} position={[0, 0, 0.01]} visible={false}>
        <mesh>
          <planeGeometry args={[w * 0.34, h * 0.62]} />
          <meshBasicMaterial
            ref={material}
            color="#f4f1ff"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
        {/* hollow eyes */}
        {[-0.06, 0.06].map((ex, i) => (
          <mesh key={i} position={[ex * (w / 0.9), h * 0.12, 0.005]}>
            <circleGeometry args={[w * 0.05, 10]} />
            <meshBasicMaterial color="#2a2233" transparent opacity={0.75} />
          </mesh>
        ))}
      </group>

      {/* glazing bars, in front of the ghost */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[w * 0.06, h, 0.02]} />
        <meshToonMaterial color="#2a2028" gradientMap={gradient} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[w, h * 0.06, 0.02]} />
        <meshToonMaterial color="#2a2028" gradientMap={gradient} />
      </mesh>
      {/* Frame, as four bars around the edge. This was one solid box
          spanning the whole window, which sat in front of the pane and
          hid the ghost completely. */}
      {[
        { p: [0, h / 2, 0.015], a: [w * 1.12, h * 0.07, 0.012] },
        { p: [0, -h / 2, 0.015], a: [w * 1.12, h * 0.07, 0.012] },
        { p: [-w / 2, 0, 0.015], a: [w * 0.09, h * 1.1, 0.012] },
        { p: [w / 2, 0, 0.015], a: [w * 0.09, h * 1.1, 0.012] },
      ].map((bar, i) => (
        <mesh key={i} position={bar.p as [number, number, number]}>
          <boxGeometry args={bar.a as [number, number, number]} />
          <meshToonMaterial color="#241c22" gradientMap={gradient} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Trees & leaves                                                     */
/* ------------------------------------------------------------------ */

const AUTUMN = ["#c2571f", "#d97b25", "#a33717", "#c99029", "#8f4420"];

function AutumnTrees({ gradient }: { gradient: THREE.Texture }) {
  const trees = useMemo(() => {
    const rand = mulberry32(2029);
    // All to the right of the house and pushed well back, so nothing
    // crowds it and the graveyard has open ground.
    return [
      { x: -2.6, z: -9.8, scale: 1.3 },
      { x: 1.8, z: -10.5, scale: 1.15 },
      { x: 7.2, z: -7.0, scale: 1.1 },
      { x: 9.8, z: -2.5, scale: 1.0 },
    ].map((t) => ({ ...t, seed: Math.floor(rand() * 10000) }));
  }, []);

  return (
    <>
      {trees.map((t, i) => (
        <AutumnTree key={i} gradient={gradient} {...t} />
      ))}
    </>
  );
}

/**
 * Trunk plus a cluster of icosahedron blobs — the same chunky toon
 * foliage the indoor flower bush uses, in autumn colours.
 */
function AutumnTree({
  gradient,
  x,
  z,
  scale,
  seed,
}: {
  gradient: THREE.Texture;
  x: number;
  z: number;
  scale: number;
  seed: number;
}) {
  const { blobs, branches } = useMemo(() => {
    const rand = mulberry32(seed);
    const blobs = Array.from({ length: 13 }, () => ({
      pos: [
        (rand() - 0.5) * 2.5,
        2.6 + rand() * 1.5,
        (rand() - 0.5) * 2.2,
      ] as [number, number, number],
      r: 0.5 + rand() * 0.45,
      tint: AUTUMN[Math.floor(rand() * AUTUMN.length)],
    }));
    const branches = Array.from({ length: 3 }, (_, i) => ({
      angle: (i / 3) * Math.PI * 2 + rand(),
      y: 1.7 + rand() * 0.7,
      len: 0.7 + rand() * 0.4,
    }));
    return { blobs, branches };
  }, [seed]);

  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.32, 3, 9]} />
        <meshToonMaterial color="#5b4132" gradientMap={gradient} />
      </mesh>
      {branches.map((b, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(b.angle) * b.len * 0.5,
            b.y,
            Math.sin(b.angle) * b.len * 0.5,
          ]}
          rotation={[0, -b.angle, Math.PI / 3]}
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.1, b.len, 6]} />
          <meshToonMaterial color="#4f3829" gradientMap={gradient} />
        </mesh>
      ))}
      {blobs.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow>
          <icosahedronGeometry args={[b.r, 0]} />
          <meshToonMaterial color={b.tint} gradientMap={gradient} />
        </mesh>
      ))}
    </group>
  );
}

/** Leaves tumbling down and resetting at the top — one instanced mesh. */
function FallingLeaves() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const COUNT = 42;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const leaves = useMemo(() => {
    const rand = mulberry32(55);
    return Array.from({ length: COUNT }, () => ({
      x: (rand() - 0.5) * 22,
      z: (rand() - 0.5) * 14 - 1,
      top: 4 + rand() * 4,
      speed: 0.35 + rand() * 0.5,
      spin: (rand() - 0.5) * 3,
      sway: 0.4 + rand() * 0.9,
      phase: rand() * Math.PI * 2,
      tint: new THREE.Color(AUTUMN[Math.floor(rand() * AUTUMN.length)]),
    }));
  }, []);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    leaves.forEach((l, i) => m.setColorAt(i, l.tint));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [leaves]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    leaves.forEach((l, i) => {
      // wrap continuously from the top back down
      const fallen = (t * l.speed) % (l.top + 0.5);
      const y = l.top - fallen;
      dummy.position.set(
        l.x + Math.sin(t * l.sway + l.phase) * 0.6,
        y,
        l.z + Math.cos(t * l.sway * 0.7 + l.phase) * 0.3
      );
      dummy.rotation.set(t * l.spin, t * l.spin * 0.6, l.phase);
      dummy.scale.setScalar(0.11);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, COUNT]}
      // instanced meshes are frustum-culled by their base geometry's
      // bounds at the origin, which culls the whole field on a turn
      frustumCulled={false}
    >
      <planeGeometry args={[1, 0.7]} />
      <meshToonMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Graves                                                             */
/* ------------------------------------------------------------------ */

function Graves({ gradient }: { gradient: THREE.Texture }) {
  const graves = useMemo(
    () => [
      // The graveyard proper: one cluster off to the right, well back
      // from the camera at z 4.4.
      { x: 3.4, z: -2.2, rot: 0.12 },
      { x: 4.8, z: -1.5, rot: -0.2 },
      { x: 5.6, z: -3.0, rot: 0.3 },
      { x: 4.0, z: -4.0, rot: -0.08 },
      // The one that isn't part of the cluster: left of the board,
      // over towards the house, turned to face the camera so it reads.
      { x: -3.6, z: -1.2, rot: 0.1, epitaph: "SPOOKY\nSEASON" },
    ],
    []
  );
  return (
    <>
      {graves.map((g, i) => (
        <Grave key={i} gradient={gradient} {...g} />
      ))}
    </>
  );
}

/**
 * A headstone and its mound of soil. Tapping either brings a hand up
 * out of the ground; taps while it's already up are ignored so the
 * animation always plays through (same rule as the beach crabs).
 */
function Grave({
  gradient,
  x,
  z,
  rot,
  epitaph,
}: {
  gradient: THREE.Texture;
  x: number;
  z: number;
  rot: number;
  /** Carved into the headstone's face, newline-separated. */
  epitaph?: string;
}) {
  const hand = useRef<THREE.Group>(null);
  const fingers = useRef<THREE.Group>(null);
  const now = useRef(0);
  const start = useRef(-99);
  const [rising, setRising] = useState(false);

  const carved = useMemo(
    () => (epitaph ? makeEpitaphTexture(epitaph) : null),
    [epitaph]
  );
  useEffect(() => () => carved?.dispose(), [carved]);

  function disturb(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (rising) return; // let it finish clawing before it goes again
    start.current = now.current;
    setRising(true);
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    now.current = t;
    const h = hand.current;
    if (!h) return;

    if (!rising) {
      h.visible = false;
      return;
    }

    const p = (t - start.current) / ZOMBIE_HAND_DURATION;
    if (p >= 1) {
      setRising(false);
      h.visible = false;
      return;
    }

    const pose = zombieHandPose(p);
    h.visible = pose.y > -0.4;
    h.position.y = pose.y;
    h.rotation.z = pose.lean;
    h.rotation.y = pose.lean * 0.6;
    if (fingers.current) {
      fingers.current.rotation.x = -pose.grasp;
    }
  });

  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* Headstone parts share one transform so the carved face stays
          flush against the stone however the stone is tilted. */}
      <group position={[0, 0.42, -0.35]} rotation={[0.06, 0, rot * 0.5]}>
        <mesh
          castShadow
          onPointerDown={disturb}
          onClick={(e) => e.stopPropagation()}
        >
          <boxGeometry args={[0.62, 0.85, 0.12]} />
          <meshToonMaterial color="#8d8a86" gradientMap={gradient} />
        </mesh>
        {/* rounded top */}
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry
            args={[0.31, 0.31, 0.12, 14, 1, false, 0, Math.PI]}
          />
          <meshToonMaterial color="#8d8a86" gradientMap={gradient} />
        </mesh>
        {carved && (
          <mesh position={[0, 0.03, 0.062]}>
            <planeGeometry args={[0.5, 0.5]} />
            <meshBasicMaterial map={carved} transparent depthWrite={false} />
          </mesh>
        )}
      </group>

      {/* mound of loose soil — the tap target that reads as "the grave" */}
      <mesh
        position={[0, 0.05, 0.12]}
        scale={[1, 0.34, 1]}
        receiveShadow
        onPointerDown={disturb}
        onClick={(e) => e.stopPropagation()}
      >
        <sphereGeometry args={[0.55, 14, 10]} />
        <meshToonMaterial color="#4a3a2a" gradientMap={gradient} />
      </mesh>

      {/* the hand, buried until disturbed */}
      <group ref={hand} position={[0, -0.45, 0.12]} visible={false}>
        {/* forearm */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.5, 8]} />
          <meshToonMaterial color="#8fa07d" gradientMap={gradient} />
        </mesh>
        {/* palm */}
        <mesh position={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[0.17, 0.2, 0.09]} />
          <meshToonMaterial color="#9aab86" gradientMap={gradient} />
        </mesh>
        {/* fingers, curling as it gropes */}
        <group ref={fingers} position={[0, 0.16, 0]}>
          {[-0.055, -0.018, 0.018, 0.055].map((fx, i) => (
            <mesh
              key={i}
              position={[fx, 0.07, 0]}
              rotation={[0, 0, (i - 1.5) * 0.06]}
              castShadow
            >
              <capsuleGeometry args={[0.018, 0.12, 3, 6]} />
              <meshToonMaterial color="#9aab86" gradientMap={gradient} />
            </mesh>
          ))}
        </group>
        {/* thumb */}
        <mesh position={[-0.1, 0.11, 0]} rotation={[0, 0, 0.7]} castShadow>
          <capsuleGeometry args={[0.018, 0.08, 3, 6]} />
          <meshToonMaterial color="#9aab86" gradientMap={gradient} />
        </mesh>
      </group>
    </group>
  );
}

/** Lettering carved into a headstone face, transparent around the text. */
function makeEpitaphTexture(text: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  const lines = text.split("\n");
  const lineHeight = 56;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 44px Georgia, 'Times New Roman', serif";

  const top = size / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    const y = top + i * lineHeight;
    // a pale lip under each letter sells the chiselled groove
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText(line, size / 2, y + 2.5);
    ctx.fillStyle = "#3c3833";
    ctx.fillText(line, size / 2, y);
  });

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ */
/*  Set dressing                                                       */
/* ------------------------------------------------------------------ */

function Pumpkins({
  gradient,
  accent,
}: {
  gradient: THREE.Texture;
  accent: string;
}) {
  const pumpkins = useMemo(() => {
    const rand = mulberry32(777);
    // Room view has the camera at (0.4, 4.4); a carved pumpkin is only
    // worth carving if its face is turned towards it, so those get an
    // aimed rotation rather than the random one.
    const CAM_X = 0.4;
    const CAM_Z = 4.4;
    return [
      { x: -2.4, z: 0.2, s: 0.4, carved: true },
      { x: 2.6, z: -0.4, s: 0.32, carved: false },
      { x: -4.3, z: -1.4, s: 0.46, carved: false },
      { x: 4.6, z: -2.6, s: 0.36, carved: true },
      { x: 1.4, z: -1.1, s: 0.26, carved: false },
    ].map((p) => ({
      ...p,
      rot: p.carved
        ? Math.atan2(CAM_X - p.x, CAM_Z - p.z)
        : rand() * Math.PI,
    }));
  }, []);

  return (
    <>
      {pumpkins.map((p, i) => (
        <group key={i} position={[p.x, p.s * 0.8, p.z]} rotation={[0, p.rot, 0]}>
          {/* squashed sphere reads as a pumpkin at this scale */}
          <mesh scale={[1, 0.78, 1]} castShadow>
            <sphereGeometry args={[p.s, 14, 12]} />
            <meshToonMaterial color={accent} gradientMap={gradient} />
          </mesh>
          {/* stalk */}
          <mesh position={[0, p.s * 0.78, 0]} castShadow>
            <cylinderGeometry args={[p.s * 0.1, p.s * 0.14, p.s * 0.34, 6]} />
            <meshToonMaterial color="#5f7a38" gradientMap={gradient} />
          </mesh>
          {p.carved && (
            <group position={[0, 0, p.s * 0.97]}>
              {[-0.3, 0.3].map((ex, j) => (
                <mesh key={j} position={[ex * p.s, p.s * 0.18, 0]}>
                  <circleGeometry args={[p.s * 0.16, 3]} />
                  <meshBasicMaterial color="#ffd166" />
                </mesh>
              ))}
              <mesh position={[0, -p.s * 0.2, 0]}>
                <planeGeometry args={[p.s * 0.5, p.s * 0.16]} />
                <meshBasicMaterial color="#ffd166" />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </>
  );
}

/** Two stout posts holding the board up out of the leaves. */
function BoardPosts({ gradient }: { gradient: THREE.Texture }) {
  const z = BOARD.wallZ - 0.2;
  const top = BOARD.centerY - BOARD.height / 2 + 0.2;
  return (
    <group>
      {[-1.7, 1.7].map((x, i) => (
        <mesh key={i} position={[x, top / 2, z]} castShadow>
          <cylinderGeometry args={[0.1, 0.13, top, 8]} />
          <meshToonMaterial color="#4a3729" gradientMap={gradient} />
        </mesh>
      ))}
      {/* cross brace behind the board */}
      <mesh position={[0, top * 0.55, z - 0.06]} castShadow>
        <boxGeometry args={[3.6, 0.12, 0.1]} />
        <meshToonMaterial color="#402f24" gradientMap={gradient} />
      </mesh>
    </group>
  );
}

/** A bare branch leaning in from one side, for a bit of foreground. */
function DeadBranch({ gradient }: { gradient: THREE.Texture }) {
  return (
    <group position={[-3.6, 0, 3.4]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, 0.24]} castShadow>
        <cylinderGeometry args={[0.05, 0.11, 2.2, 7]} />
        <meshToonMaterial color="#4a3b30" gradientMap={gradient} />
      </mesh>
      {[0.5, 0.95, 1.4].map((y, i) => (
        <mesh
          key={i}
          position={[0.22 + i * 0.1, y + 0.5, 0]}
          rotation={[0, 0, i % 2 ? -0.9 : -1.3]}
          castShadow
        >
          <cylinderGeometry args={[0.02, 0.045, 0.7, 5]} />
          <meshToonMaterial color="#44372c" gradientMap={gradient} />
        </mesh>
      ))}
    </group>
  );
}
