"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { BoardTheme } from "@/lib/themes";
import { BOARD } from "@/lib/board-geometry";
import { makeToonGradient, mulberry32 } from "./textures";

/**
 * The World Cup board's home: a football pitch in a stadium, with an
 * animated, tappable crowd (touch them to set off a wave around the
 * stands), England & South Africa flags, and floodlights. Rendered
 * instead of <Room/> when theme.scene === "stadium".
 */
export function StadiumScene({ theme }: { theme: BoardTheme }) {
  const gradient = useMemo(() => makeToonGradient(), []);
  return (
    <group>
      <StadiumSky />
      <ambientLight intensity={1.0} color="#eaf2ff" />
      <directionalLight
        position={[4, 9, 4]}
        intensity={1.5}
        color="#fffdf5"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-2}
      />
      <hemisphereLight args={["#cfe6ff", "#2f7d3a", 0.5]} />

      <Pitch />
      <BoardStand gradient={gradient} accent={theme.room.accent} />
      <Stands gradient={gradient} />
      <Crowd />
      <Flag kind="england" position={[-3.4, 0, BOARD.wallZ + 0.2]} />
      <Flag kind="southafrica" position={[3.4, 0, BOARD.wallZ + 0.2]} />
      <Floodlights />
    </group>
  );
}

/** Bright daytime sky set on the scene (so it's never the black clear colour). */
function StadiumSky() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color("#8fc7f0");
    scene.fog = new THREE.Fog("#bfe0f5", 28, 80);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);
  return null;
}

/** Green pitch with painted white markings. */
function Pitch() {
  const texture = useMemo(() => {
    const w = 512;
    const h = 512;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    // mown stripes
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#2fa44e" : "#2b9747";
      ctx.fillRect(0, (i * h) / 12, w, h / 12);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.beginPath();
    ctx.moveTo(24, h / 2);
    ctx.lineTo(w - 24, h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
      <planeGeometry args={[34, 30]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}

/** A simple stand to hold the board upright on the pitch. */
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
          <meshToonMaterial color="#d6d6d6" gradientMap={gradient} />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[3.4, 0.12, 0.5]} />
        <meshToonMaterial color={accent} gradientMap={gradient} />
      </mesh>
    </group>
  );
}

/** Tiered stand structures (the seating banks themselves). */
function Stands({ gradient }: { gradient: THREE.Texture }) {
  const concrete = "#9fb1c4";
  return (
    <group>
      {/* back stand */}
      <mesh position={[0, 2.4, -9]} rotation={[-0.5, 0, 0]} receiveShadow>
        <boxGeometry args={[20, 6, 0.6]} />
        <meshToonMaterial color={concrete} gradientMap={gradient} />
      </mesh>
      {/* left stand */}
      <mesh
        position={[-8.5, 2.4, -3.5]}
        rotation={[-0.5, Math.PI / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[14, 6, 0.6]} />
        <meshToonMaterial color={concrete} gradientMap={gradient} />
      </mesh>
      {/* right stand */}
      <mesh
        position={[8.5, 2.4, -3.5]}
        rotation={[-0.5, -Math.PI / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[14, 6, 0.6]} />
        <meshToonMaterial color={concrete} gradientMap={gradient} />
      </mesh>
    </group>
  );
}

interface Person {
  x: number;
  y: number;
  z: number;
  s: number; // 0..1 position around the stands (for the wave)
  phase: number;
}

/**
 * The instanced crowd. Everyone bobs (cheering); tap anyone to start a
 * Mexican wave that ripples around the stands from that point.
 */
function Crowd() {
  const COLS = 22;
  const ROWS = 5;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const waveStart = useRef(-100);
  const waveOrigin = useRef(0);
  const now = useRef(0);

  const people = useMemo<Person[]>(() => {
    const rand = mulberry32(2026);
    const out: Person[] = [];
    const addRow = (
      mapPos: (col: number, row: number) => [number, number, number],
      sRange: [number, number]
    ) => {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const [x, y, z] = mapPos(c, r);
          const s =
            sRange[0] + ((c + 0.5) / COLS) * (sRange[1] - sRange[0]);
          out.push({ x, y, z, s, phase: rand() * Math.PI * 2 });
        }
      }
    };
    // left stand (front→back), back stand (left→right), right stand (back→front)
    addRow(
      (c, r) => [-7.5 - r * 0.7, 0.9 + r * 0.62, 1 - (c / (COLS - 1)) * 9.5],
      [0, 0.34]
    );
    addRow(
      (c, r) => [-8 + (c / (COLS - 1)) * 16, 0.9 + r * 0.62, -7.6 - r * 0.7],
      [0.34, 0.66]
    );
    addRow(
      (c, r) => [7.5 + r * 0.7, 0.9 + r * 0.62, -8.5 + (c / (COLS - 1)) * 9.5],
      [0.66, 1]
    );
    return out;
  }, []);

  const colors = useMemo(() => {
    const rand = mulberry32(7);
    // England & South Africa colours, plus general fan colours
    const palette = [
      "#ffffff",
      "#e2231a",
      "#1b8a3a",
      "#ffb612",
      "#002395",
      "#f4c430",
      "#d12b2b",
      "#2a6ad4",
    ];
    return people.map(() => palette[Math.floor(rand() * palette.length)]);
  }, [people]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const col = new THREE.Color();
    people.forEach((_, i) => {
      mesh.setColorAt(i, col.set(colors[i]));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [people, colors]);

  const circDist = (a: number, b: number) => {
    const d = Math.abs(a - b) % 1;
    return Math.min(d, 1 - d);
  };

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    now.current = t;
    const elapsed = t - waveStart.current;
    const waveActive = elapsed >= 0 && elapsed < 4.5;
    const waveFront = (waveOrigin.current + elapsed * 0.55) % 1;
    const width = 0.07;

    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      let y = p.y + Math.abs(Math.sin(t * 3 + p.phase)) * 0.1;
      if (waveActive) {
        const d = circDist(p.s, waveFront);
        if (d < width) y += (1 - d / width) * 0.6;
      }
      dummy.position.set(p.x, y, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (e.instanceId == null) return;
    waveOrigin.current = people[e.instanceId].s;
    waveStart.current = now.current; // same clock as useFrame
  }

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, people.length]}
      onPointerDown={onPointerDown}
      castShadow
    >
      <boxGeometry args={[0.18, 0.46, 0.18]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  );
}

function makeFlagTexture(kind: "england" | "southafrica"): THREE.CanvasTexture {
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
    // South Africa (approximation)
    ctx.fillStyle = "#e03c31";
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = "#002395";
    ctx.fillRect(0, h / 2, w, h / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, h * 0.33, w, h * 0.34);
    ctx.fillStyle = "#007a4d";
    ctx.fillRect(0, h * 0.4, w, h * 0.2);
    // hoist triangle: gold border then black
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

/** A flag on a pole that flutters in the wind. */
function Flag({
  kind,
  position,
}: {
  kind: "england" | "southafrica";
  position: [number, number, number];
}) {
  const geom = useMemo(() => new THREE.PlaneGeometry(0.95, 0.6, 16, 8), []);
  const base = useMemo(
    () => geom.attributes.position.array.slice(),
    [geom]
  );
  const texture = useMemo(() => makeFlagTexture(kind), [kind]);
  useEffect(() => () => texture.dispose(), [texture]);
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const pos = geom.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const edge = (x + 0.475) / 0.95; // 0 at pole, 1 at fly end
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
      <mesh ref={mesh} geometry={geom} position={[0.48, 1.9, 0]}>
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Floodlight pylons at the back corners. */
function Floodlights() {
  const corners: [number, number][] = [
    [-9, -9],
    [9, -9],
  ];
  return (
    <group>
      {corners.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 6, 8]} />
            <meshStandardMaterial color="#aaaaaa" />
          </mesh>
          <mesh position={[0, 6.2, 0]}>
            <boxGeometry args={[1.4, 0.7, 0.2]} />
            <meshStandardMaterial
              color="#fffbe6"
              emissive="#fff7cc"
              emissiveIntensity={0.8}
            />
          </mesh>
          <pointLight position={[0, 6, 1]} intensity={0.6} distance={20} color="#fff7e0" />
        </group>
      ))}
    </group>
  );
}
