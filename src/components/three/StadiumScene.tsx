"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { BoardTheme } from "@/lib/themes";
import { BOARD } from "@/lib/board-geometry";
import { makeToonGradient, mulberry32 } from "./textures";

type Team = "england" | "southafrica";

const ENGLAND_SHIRTS = ["#ffffff", "#f2f2f2", "#e2231a", "#cfd8ff"];
const SA_SHIRTS = ["#007a4d", "#0a9d63", "#ffb612", "#e03c31"];
const SKIN = ["#f2c9a0", "#e0a878", "#c68642", "#8d5524", "#ffe0bd"];

interface Person {
  x: number;
  y: number;
  z: number;
  s: number; // 0..1 around the stands (for the wave)
  phase: number;
  shirt: string;
  skin: string;
}

/** Rows/cols per stand. */
const ROWS = 6;

/**
 * The World Cup board's home: a football pitch in a stadium with tiered,
 * colour-coded stands full of England & South Africa fans (head + body
 * figures). Tap the crowd to send a Mexican wave rippling outward in
 * both directions from where you touched.
 */
export function StadiumScene({ theme }: { theme: BoardTheme }) {
  const gradient = useMemo(() => makeToonGradient(), []);
  return (
    <group>
      <StadiumSky />
      <ambientLight intensity={1.05} color="#eef4ff" />
      <directionalLight
        position={[5, 11, 5]}
        intensity={1.5}
        color="#fffdf5"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-4}
      />
      <hemisphereLight args={["#bfe0ff", "#2f7d3a", 0.55]} />

      <Pitch />
      <BoardStand gradient={gradient} accent={theme.room.accent} />
      <Stands gradient={gradient} />
      <Crowd />
      <Flag kind="england" position={[-3.6, 0, BOARD.wallZ + 0.2]} />
      <Flag kind="southafrica" position={[3.6, 0, BOARD.wallZ + 0.2]} />
      <Floodlights />
    </group>
  );
}

function StadiumSky() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color("#7cc0ef");
    scene.fog = new THREE.Fog("#bfe0f5", 34, 95);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);
  return null;
}

function Pitch() {
  const texture = useMemo(() => {
    const w = 512;
    const h = 512;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#34ad53" : "#2c9c49";
      ctx.fillRect(0, (i * h) / 14, w, h / 14);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 4;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.beginPath();
    ctx.moveTo(22, h / 2);
    ctx.lineTo(w - 22, h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 58, 0, Math.PI * 2);
    ctx.stroke();
    // penalty boxes
    ctx.strokeRect(w / 2 - 90, 22, 180, 70);
    ctx.strokeRect(w / 2 - 90, h - 92, 180, 70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3]} receiveShadow>
      <planeGeometry args={[44, 40]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}

function BoardStand({
  gradient,
  accent,
}: {
  gradient: THREE.Texture;
  accent: string;
}) {
  const bottom = BOARD.centerY - BOARD.height / 2;
  return (
    <group position={[0, 0, BOARD.wallZ - 0.1]}>
      {[-1.6, 1.6].map((x, i) => (
        <mesh key={i} position={[x, bottom / 2, -0.2]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, bottom + 0.3, 10]} />
          <meshToonMaterial color="#cfcfcf" gradientMap={gradient} />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[3.4, 0.12, 0.5]} />
        <meshToonMaterial color={accent} gradientMap={gradient} />
      </mesh>
    </group>
  );
}

// ---------- stand geometry (shared by structure + crowd) ----------

interface Seat {
  x: number;
  y: number;
  z: number;
  s: number;
  team: Team;
}

const STAND = {
  rowRise: 0.62,
  rowDepth: 0.95,
  baseY: 0.9,
  backZ: -13, // front edge of the back stand (pushed well back)
  sideX: 12, // front edge of the side stands
  sideFrontZ: 2,
  sideBackZ: -13,
  halfWidth: 11, // back stand spans -11..11 in x
};

/** Build every seat position once (used for both structure and crowd). */
function buildSeats(): Seat[] {
  const seats: Seat[] = [];
  const COLS_BACK = 26;
  const COLS_SIDE = 18;

  // left stand → England, s 0..0.34 (front to back)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS_SIDE; c++) {
      const x = -STAND.sideX - r * STAND.rowDepth;
      const y = STAND.baseY + r * STAND.rowRise;
      const z =
        STAND.sideFrontZ -
        (c / (COLS_SIDE - 1)) * (STAND.sideFrontZ - STAND.sideBackZ);
      seats.push({ x, y, z, s: (c / (COLS_SIDE - 1)) * 0.34, team: "england" });
    }
  }
  // back stand → mixed, s 0.34..0.66 (left to right)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS_BACK; c++) {
      const x = -STAND.halfWidth + (c / (COLS_BACK - 1)) * (STAND.halfWidth * 2);
      const y = STAND.baseY + r * STAND.rowRise;
      const z = STAND.backZ - r * STAND.rowDepth;
      const team: Team = c < COLS_BACK / 2 ? "england" : "southafrica";
      seats.push({ x, y, z, s: 0.34 + (c / (COLS_BACK - 1)) * 0.32, team });
    }
  }
  // right stand → South Africa, s 0.66..1 (back to front)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS_SIDE; c++) {
      const x = STAND.sideX + r * STAND.rowDepth;
      const y = STAND.baseY + r * STAND.rowRise;
      const z =
        STAND.sideBackZ +
        (c / (COLS_SIDE - 1)) * (STAND.sideFrontZ - STAND.sideBackZ);
      seats.push({
        x,
        y,
        z,
        s: 0.66 + (c / (COLS_SIDE - 1)) * 0.34,
        team: "southafrica",
      });
    }
  }
  return seats;
}

/** Stepped seating decks, roofs and pitch-side ad boards. */
function Stands({ gradient }: { gradient: THREE.Texture }) {
  const seatGreen = "#0d5c2a";
  return (
    <group>
      {/* back deck (stepped) */}
      {Array.from({ length: ROWS }).map((_, r) => (
        <mesh
          key={`b${r}`}
          position={[0, STAND.baseY - 0.35 + r * STAND.rowRise, STAND.backZ - r * STAND.rowDepth]}
          receiveShadow
        >
          <boxGeometry args={[STAND.halfWidth * 2 + 2, 0.4, STAND.rowDepth]} />
          <meshToonMaterial
            color={r % 2 === 0 ? "#1f4e7a" : "#27608f"}
            gradientMap={gradient}
          />
        </mesh>
      ))}
      {/* side decks */}
      {[-1, 1].map((side) =>
        Array.from({ length: ROWS }).map((_, r) => (
          <mesh
            key={`s${side}-${r}`}
            position={[
              side * (STAND.sideX + r * STAND.rowDepth),
              STAND.baseY - 0.35 + r * STAND.rowRise,
              (STAND.sideFrontZ + STAND.sideBackZ) / 2,
            ]}
            receiveShadow
          >
            <boxGeometry
              args={[STAND.rowDepth, 0.4, STAND.sideFrontZ - STAND.sideBackZ + 2]}
            />
            <meshToonMaterial
              color={side < 0 ? "#7a1f2b" : seatGreen}
              gradientMap={gradient}
            />
          </mesh>
        ))
      )}

      {/* roofs */}
      <mesh position={[0, STAND.baseY + ROWS * STAND.rowRise + 0.6, STAND.backZ - ROWS * STAND.rowDepth + 1]}>
        <boxGeometry args={[STAND.halfWidth * 2 + 3, 0.3, ROWS * STAND.rowDepth + 2]} />
        <meshStandardMaterial color="#dfe6ee" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`roof${side}`}
          position={[
            side * (STAND.sideX + ROWS * STAND.rowDepth - 1),
            STAND.baseY + ROWS * STAND.rowRise + 0.6,
            (STAND.sideFrontZ + STAND.sideBackZ) / 2,
          ]}
        >
          <boxGeometry
            args={[ROWS * STAND.rowDepth + 2, 0.3, STAND.sideFrontZ - STAND.sideBackZ + 3]}
          />
          <meshStandardMaterial color="#dfe6ee" roughness={0.9} />
        </mesh>
      ))}

      <AdBoards />
    </group>
  );
}

/** Colourful pitch-side advertising hoardings. */
function AdBoards() {
  const texture = useMemo(() => {
    const w = 256;
    const h = 24;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    const cols = ["#e2231a", "#007a4d", "#ffb612", "#002395", "#ffffff"];
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect((i * w) / 16, 0, w / 16, h);
    }
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚽ WORLD CUP 2026 ⚽", w / 2, h / 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    return t;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.45, STAND.backZ + 1.4]}>
        <boxGeometry args={[STAND.halfWidth * 2, 0.55, 0.15]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
}

/** Instanced crowd: bodies + heads, animated, tappable (bidirectional wave). */
function Crowd() {
  const seats = useMemo(() => buildSeats(), []);
  const people = useMemo<Person[]>(() => {
    const rand = mulberry32(2026);
    return seats.map((seat) => {
      const shirts = seat.team === "england" ? ENGLAND_SHIRTS : SA_SHIRTS;
      return {
        x: seat.x,
        y: seat.y,
        z: seat.z,
        s: seat.s,
        phase: rand() * Math.PI * 2,
        shirt: shirts[Math.floor(rand() * shirts.length)],
        skin: SKIN[Math.floor(rand() * SKIN.length)],
      };
    });
  }, [seats]);

  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const waveStart = useRef(-100);
  const waveOrigin = useRef(0);
  const now = useRef(0);

  useEffect(() => {
    const col = new THREE.Color();
    people.forEach((p, i) => {
      bodies.current?.setColorAt(i, col.set(p.shirt));
      heads.current?.setColorAt(i, col.set(p.skin));
    });
    if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true;
    if (heads.current?.instanceColor) heads.current.instanceColor.needsUpdate = true;
  }, [people]);

  const circDist = (a: number, b: number) => {
    const d = Math.abs(a - b) % 1;
    return Math.min(d, 1 - d);
  };

  useFrame((state) => {
    if (!bodies.current || !heads.current) return;
    const t = state.clock.elapsedTime;
    now.current = t;
    const elapsed = t - waveStart.current;
    const active = elapsed >= 0 && elapsed < 5;
    // two fronts spreading out from the tap point
    const frontA = (((waveOrigin.current + elapsed * 0.5) % 1) + 1) % 1;
    const frontB = (((waveOrigin.current - elapsed * 0.5) % 1) + 1) % 1;
    const width = 0.07;

    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      let jump = Math.abs(Math.sin(t * 3 + p.phase)) * 0.08;
      if (active) {
        const d = Math.min(circDist(p.s, frontA), circDist(p.s, frontB));
        if (d < width) jump += (1 - d / width) * 0.6;
      }
      dummy.position.set(p.x, p.y + jump, p.z);
      dummy.updateMatrix();
      bodies.current.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p.x, p.y + jump + 0.4, p.z);
      dummy.updateMatrix();
      heads.current.setMatrixAt(i, dummy.matrix);
    }
    bodies.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceMatrix.needsUpdate = true;
  });

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (e.instanceId == null) return;
    waveOrigin.current = people[e.instanceId].s;
    waveStart.current = now.current;
  }

  return (
    <group>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, people.length]}
        onPointerDown={onPointerDown}
        castShadow
      >
        <capsuleGeometry args={[0.12, 0.3, 4, 8]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, people.length]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

function makeFlagTexture(kind: Team): THREE.CanvasTexture {
  const w = 160;
  const h = 100;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  if (kind === "england") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e2231a";
    ctx.fillRect(w / 2 - 12, 0, 24, h);
    ctx.fillRect(0, h / 2 - 12, w, 24);
  } else {
    ctx.fillStyle = "#e03c31";
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = "#002395";
    ctx.fillRect(0, h / 2, w, h / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, h * 0.33, w, h * 0.34);
    ctx.fillStyle = "#007a4d";
    ctx.fillRect(0, h * 0.4, w, h * 0.2);
    ctx.fillStyle = "#ffb612";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.46, h / 2);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.09);
    ctx.lineTo(w * 0.36, h / 2);
    ctx.lineTo(0, h * 0.91);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Flag({
  kind,
  position,
}: {
  kind: Team;
  position: [number, number, number];
}) {
  const geom = useMemo(() => new THREE.PlaneGeometry(0.95, 0.6, 16, 8), []);
  const base = useMemo(() => geom.attributes.position.array.slice(), [geom]);
  const texture = useMemo(() => makeFlagTexture(kind), [kind]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state) => {
    const pos = geom.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const edge = (x + 0.475) / 0.95;
      pos.setZ(i, Math.sin(x * 6 + t * 6) * 0.06 * edge);
    }
    pos.needsUpdate = true;
  });

  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 2.2, 8]} />
        <meshStandardMaterial color="#cccccc" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh geometry={geom} position={[0.48, 1.9, 0]}>
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Floodlights() {
  const corners: [number, number][] = [
    [-12, -13],
    [12, -13],
  ];
  return (
    <group>
      {corners.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 4, 0]}>
            <cylinderGeometry args={[0.14, 0.18, 8, 8]} />
            <meshStandardMaterial color="#b8b8b8" />
          </mesh>
          <mesh position={[0, 8.3, 0]}>
            <boxGeometry args={[1.8, 0.9, 0.25]} />
            <meshStandardMaterial
              color="#fffbe6"
              emissive="#fff7cc"
              emissiveIntensity={0.9}
            />
          </mesh>
          <pointLight position={[0, 8, 1]} intensity={0.7} distance={26} color="#fff7e0" />
        </group>
      ))}
    </group>
  );
}
