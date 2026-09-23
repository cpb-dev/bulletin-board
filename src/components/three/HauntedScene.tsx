"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { BoardTheme } from "@/lib/themes";
import { BOARD } from "@/lib/board-geometry";
import {
  ARM_BURIED_Y,
  armPose,
  pickRise,
  RISE_SECONDS,
  type RiseKind,
} from "@/lib/zombie";
import { makeToonGradient, mulberry32 } from "./textures";
import { AutumnGrove } from "./props/AutumnTree";
import { GraveMound } from "./props/GraveMound";
import { Ground } from "./props/Ground";
import { Sky } from "./props/Sky";
import { ZombieArm, type ArmKind } from "./props/ZombieArm";
import { HauntedHouse } from "./props/HauntedHouse";
import { Pumpkin } from "./props/Pumpkin";
import { Headstone, type HeadstoneKind } from "./props/Headstone";

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
      <Sky />

      {/* A dreary overcast, not a dark one — the ticket asks for
          daytime, so the dread comes from the scenery. Overcast means
          flat rather than black: a strong cool ambient with a weak sun
          behind the cloud, which leaves shadows soft and faint and
          gives the pumpkins and the lit windows something cold to glow
          against. */}
      <ambientLight intensity={1.0} color="#d9d6d1" />
      <directionalLight
        position={[-4, 7, 4]}
        intensity={0.72}
        color="#e7e3d8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        // The house is ten metres tall and stands off to the left, so
        // the frustum has to reach it. The biases keep its big flat
        // walls from striping themselves with shadow acne.
        shadow-camera-left={-14}
        shadow-camera-right={10}
        shadow-camera-top={14}
        shadow-camera-bottom={-4}
        shadow-camera-far={40}
        shadow-bias={-0.0012}
        shadow-normalBias={0.06}
        onUpdate={(self) => self.shadow.camera.updateProjectionMatrix()}
      />
      <hemisphereLight args={["#a6a6ac", "#4c4232", 0.62]} />

      <group position={[HOUSE_X, 0, HOUSE_Z]} rotation={[0, HOUSE_TURN, 0]}>
        <HauntedHouse />
      </group>
      <AutumnGrove trees={TREES} />

      <Ground color={theme.room.floor} />

      <BoardPosts gradient={gradient} />
      <Graves />
      <Pumpkins accent={theme.room.accent} />
      <DeadBranch gradient={gradient} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Trees                                                             */
/* ------------------------------------------------------------------ */

/**
 * Weighted to the right so the graveyard sits in woodland, with a
 * couple far back behind the board for depth. Each seed grows a
 * different tree — see `src/lib/tree.ts`.
 */
const TREES = [
  // Seeds chosen for the mix rather than at random: three broad dense
  // crowns, three open ones and one already bare, so the stand doesn't
  // read as one kind of tree repeated.
  { x: -2.6, z: -9.8, scale: 1.3, seed: 1182 },
  { x: 1.8, z: -10.5, scale: 1.15, seed: 1049 },
  { x: 6.8, z: -8.6, scale: 1.2, seed: 1084 },
  { x: 9.2, z: -5.4, scale: 1.05, seed: 1063 },
  { x: 10.4, z: -9.2, scale: 1.25, seed: 1210 },
  { x: 10.8, z: -2.4, scale: 0.95, seed: 1238 },
  { x: 7.6, z: -11.8, scale: 1.1, seed: 1056 },
];

/* ------------------------------------------------------------------ */
/*  Graves                                                             */
/* ------------------------------------------------------------------ */

function Graves() {
  const graves = useMemo(
    () => [
      // The graveyard proper: off to the right among the trees, spread
      // out rather than huddled, and well back from the camera at z 4.4.
      // A spread of ages, so the yard looks like it filled up over
      // decades rather than all at once — and a different body under
      // each, roughly matched to how long the stone has stood.
      { x: 2.8, z: -1.5, rot: 0.12, kind: "round" as const, size: 0.92, age: 0.9, arm: "skeletal" as const },
      { x: 5.4, z: -0.8, rot: -0.2, kind: "gabled" as const, size: 0.86, age: 0.4, arm: "bloated" as const },
      { x: 5.0, z: -2.6, rot: 0.3, kind: "cross" as const, size: 1.0, age: 1, arm: "skeletal" as const },
      { x: 3.6, z: -4.4, rot: -0.08, kind: "round" as const, size: 0.8, age: 0.72, arm: "gaunt" as const },
      { x: 6.6, z: -4.0, rot: 0.18, kind: "gabled" as const, size: 0.95, age: 0.2, arm: "bloated" as const },
      // The one that isn't part of the cluster: just off the board's
      // left edge, turned to face the camera so the carving reads.
      {
        x: -3.1,
        z: -1.4,
        rot: 0.1,
        kind: "round" as const,
        size: 1.0,
        // kept lightly weathered so the carving stays readable
        age: 0.35,
        epitaph: "SPOOKY\nSEASON",
        arm: "gaunt" as const,
      },
    ],
    []
  );
  return (
    <>
      {graves.map((g, i) => (
        <Grave key={i} seed={i + 1} {...g} />
      ))}
    </>
  );
}

/**
 * A headstone, its patch of turned soil, and whatever is under it.
 *
 * Tapping either brings an arm up. Which of the four rises you get is
 * picked at random each time, so the same grave doesn't do the same
 * thing twice running; taps while one is playing are ignored so it
 * always finishes (same rule as the beach crabs).
 */
function Grave({
  x,
  z,
  rot,
  kind,
  size,
  seed,
  age,
  epitaph,
  arm,
}: {
  x: number;
  z: number;
  rot: number;
  kind: HeadstoneKind;
  size: number;
  seed: number;
  age: number;
  /** Carved into the headstone's face, newline-separated. */
  epitaph?: string;
  /** Which body is buried here. */
  arm: ArmKind;
}) {
  const now = useRef(0);
  const start = useRef(-99);
  const buried = useRef<THREE.Group>(null);
  // The pose lives in a ref and is read by the arm's own frame loop.
  // Through state it would re-render the whole arm every frame.
  const pose = useRef(armPose("burst", 0));
  const [rise, setRise] = useState<RiseKind | null>(null);

  function disturb(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (rise) return; // let it finish clawing before it goes again
    start.current = now.current;
    setRise(pickRise());
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    now.current = t;
    if (!rise) return;

    const p = (t - start.current) / RISE_SECONDS[rise];
    pose.current = armPose(rise, Math.min(1, p));
    if (buried.current) {
      buried.current.visible = pose.current.y > ARM_BURIED_Y + 0.02;
    }
    if (p >= 1) setRise(null);
  });

  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <group position={[0, 0, -0.35]}>
        <Headstone
          kind={kind}
          seed={seed}
          size={size}
          age={age}
          lean={rot * 0.5}
          epitaph={epitaph}
          onPointerDown={disturb}
        />
      </group>

      {/* The turned soil — and the tap target that reads as "the grave".
          Older graves have settled further; the age that weathers the
          stone sinks the earth in front of it. */}
      <group position={[0, 0, 0.12]}>
        <GraveMound seed={seed} age={age} onPointerDown={disturb} />
      </group>

      {/* Whatever is under it, buried until disturbed. Kept mounted so
          a tap doesn't pay for building the geometry. */}
      <group ref={buried} position={[0, 0, 0.12]} visible={false}>
        <ZombieArm kind={arm} pose={pose} seed={seed} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Set dressing                                                       */
/* ------------------------------------------------------------------ */

function Pumpkins({ accent }: { accent: string }) {
  const pumpkins = useMemo(() => {
    const rand = mulberry32(777);
    // Room view has the camera at (0.4, 4.4). A carved face is only
    // worth carving if it's turned towards the viewer, so each pumpkin
    // is aimed at it rather than randomly rotated.
    const CAM_X = 0.4;
    const CAM_Z = 4.4;
    return [
      // kept well clear of the SPOOKY SEASON stone at (-3.1, -1.4)
      { x: -1.5, z: 0.9, s: 0.4, face: 0 },
      { x: -5.2, z: -0.6, s: 0.46, face: 1 },
      { x: 2.6, z: -0.4, s: 0.32, face: 2 },
      // Sat 0.4 from the cross grave at (5.0, -2.6) — close enough to
      // block it. Pushed back behind the stone; the room camera is at
      // z 4.4, so a more negative z reads as further away.
      { x: 4.3, z: -3.5, s: 0.36, face: 0 },
      { x: 1.4, z: -1.1, s: 0.26, face: 1 },
    ].map((p) => ({
      ...p,
      rot: Math.atan2(CAM_X - p.x, CAM_Z - p.z),
      wobble: (rand() - 0.5) * 0.25,
    }));
  }, []);

  return (
    <>
      {pumpkins.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rot, p.wobble]}>
          <Pumpkin size={p.s} face={p.face} color={accent} />
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
