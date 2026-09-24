"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ContactShadows, RoundedBox, Sparkles } from "@react-three/drei";
import type { BoardTheme } from "@/themes/types";
import { BOARD, MINI_BOARD } from "@/lib/board-geometry";
import { mulberry32 } from "@/components/three/textures";

/**
 * The surprise board's home: a rose field at golden hour with a picnic
 * laid out beneath the boards — blanket, basket, food, cushions, a beer
 * and an Aperol spritz. Rendered instead of <Room/> when
 * theme.scene === "rosefield".
 *
 * Styled more realistically than the toon rooms: physically-based
 * materials, warm low sun, soft contact shadows, drifting petals and
 * pollen sparkles.
 */
export function RoseFieldScene({ theme }: { theme: BoardTheme }) {
  void theme;
  return (
    <group>
      <GoldenHourSky />
      <ambientLight intensity={0.7} color="#ffe4ee" />
      {/* steeper key light so shadows sit beneath things instead of
          smearing off to the right */}
      <directionalLight
        position={[-3.5, 11, 4]}
        intensity={1.7}
        color="#ffd9a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0002}
      />
      <hemisphereLight args={["#ffc9d8", "#3d7a3a", 0.55]} />

      <Meadow />
      <RoseField />
      <BoardPosts />
      <Picnic />

      {/* pollen / petal shimmer drifting through the air */}
      <Sparkles
        count={90}
        scale={[16, 4, 12]}
        position={[0, 2, -1]}
        size={2.2}
        speed={0.25}
        opacity={0.55}
        color="#ffd1e0"
      />
      <FallingPetals />

      {/* soft grounding shadow under the picnic */}
      <ContactShadows
        position={[0, 0.01, 1.3]}
        opacity={0.35}
        scale={8}
        blur={2.6}
        far={2}
        frames={1}
      />
    </group>
  );
}

/** Warm pink-to-peach gradient sky with a low sun. */
function GoldenHourSky() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = new THREE.Color("#f6b8a0");
    scene.fog = new THREE.Fog("#f7c5b2", 26, 70);
    return () => {
      scene.background = prevBg;
      scene.fog = prevFog;
    };
  }, [scene]);

  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#c98cc4"); // dusky lilac zenith
    g.addColorStop(0.45, "#f2a9a0");
    g.addColorStop(0.8, "#ffd9ae"); // golden band
    g.addColorStop(1, "#ffe9c9");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[46, 24, 16]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
      </mesh>
      {/* the low sun */}
      <mesh position={[-14, 4.4, -26]}>
        <circleGeometry args={[2.2, 40]} />
        <meshBasicMaterial color="#fff0cd" fog={false} />
      </mesh>
      <mesh position={[-14, 4.4, -26.05]}>
        <circleGeometry args={[4.2, 40]} />
        <meshBasicMaterial color="#ffdfae" transparent opacity={0.35} fog={false} />
      </mesh>
    </group>
  );
}

/** Rolling grass with instanced blades for texture up close. */
function Meadow() {
  const bladeRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 900;

  useEffect(() => {
    const mesh = bladeRef.current;
    if (!mesh) return;
    const rand = mulberry32(31);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const x = (rand() - 0.5) * 24;
      const z = 4 - rand() * 22;
      const h = 0.1 + rand() * 0.16;
      dummy.position.set(x, h / 2, z);
      dummy.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.3);
      dummy.scale.set(1, h / 0.16, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, col.set(rand() > 0.5 ? "#5c9a4a" : "#4f8b40"));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]} receiveShadow>
        <planeGeometry args={[46, 40]} />
        <meshStandardMaterial color="#5f9b4c" roughness={1} />
      </mesh>
      <instancedMesh
        ref={bladeRef}
        args={[undefined, undefined, COUNT]}
        // instanced bounds are computed from the tiny base geometry, so
        // three would cull the whole field when the origin leaves view
        frustumCulled={false}
      >
        <coneGeometry args={[0.015, 0.16, 4]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </group>
  );
}

/** Hundreds of instanced roses, denser toward the horizon, plus hero roses. */
function RoseField() {
  const stems = useRef<THREE.InstancedMesh>(null);
  const blooms = useRef<THREE.InstancedMesh>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const COUNT = 340;

  const plants = useMemo(() => {
    const rand = mulberry32(52);
    const out: { x: number; z: number; h: number; tint: string; lean: number }[] = [];
    const pinks = ["#ff85ab", "#f76c9c", "#ff9ec0", "#e5527a", "#ffb3cb"];
    let placed = 0;
    while (placed < COUNT) {
      const x = (rand() - 0.5) * 26;
      const z = 3.5 - rand() * 24;
      // keep a clearing for the picnic and the boards
      if (Math.abs(x) < 3.4 && z > -3.6) continue;
      if (x > 2.6 && x < 6.6 && z > -3.6) continue; // mini board clearing
      out.push({
        x,
        z,
        h: 0.35 + rand() * 0.5,
        tint: pinks[Math.floor(rand() * pinks.length)],
        lean: (rand() - 0.5) * 0.25,
      });
      placed++;
    }
    return out;
  }, []);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    plants.forEach((p, i) => {
      dummy.position.set(p.x, p.h / 2, p.z);
      dummy.rotation.set(0, 0, p.lean);
      dummy.scale.set(1, p.h / 0.5, 1);
      dummy.updateMatrix();
      stems.current?.setMatrixAt(i, dummy.matrix);
      stems.current?.setColorAt(i, col.set("#3f7d38"));

      dummy.position.set(p.x + p.lean * p.h, p.h + 0.05, p.z);
      dummy.rotation.set(0, i, p.lean);
      dummy.scale.setScalar(0.8 + (i % 5) * 0.1);
      dummy.updateMatrix();
      blooms.current?.setMatrixAt(i, dummy.matrix);
      blooms.current?.setColorAt(i, col.set(p.tint));

      dummy.position.set(p.x - p.lean, p.h * 0.55, p.z + 0.03);
      dummy.rotation.set(0.4, i * 2.1, 0.6);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      leaves.current?.setMatrixAt(i, dummy.matrix);
      leaves.current?.setColorAt(i, col.set("#4c8a41"));
    });
    for (const m of [stems, blooms, leaves]) {
      if (!m.current) continue;
      m.current.instanceMatrix.needsUpdate = true;
      if (m.current.instanceColor) m.current.instanceColor.needsUpdate = true;
    }
  }, [plants]);

  return (
    <group>
      <instancedMesh
        ref={stems}
        args={[undefined, undefined, COUNT]}
        castShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.012, 0.02, 0.5, 5]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={blooms}
        args={[undefined, undefined, COUNT]}
        castShadow
        frustumCulled={false}
      >
        <icosahedronGeometry args={[0.085, 1]} />
        <meshStandardMaterial roughness={0.55} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={leaves}
        args={[undefined, undefined, COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.05, 6, 4]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>

      {/* hero roses framing the picnic, with layered petals */}
      <HeroRose position={[-2.6, 0, 0.4]} tint="#f7548c" scale={1.15} />
      <HeroRose position={[-3.1, 0, -0.8]} tint="#ff8fb4" scale={0.95} />
      <HeroRose position={[2.7, 0, 0.1]} tint="#ff7ba6" scale={1.05} />
      <HeroRose position={[6.9, 0, -0.9]} tint="#f7548c" scale={1.0} />
    </group>
  );
}

/** A close-up rose: bud wrapped in two rings of curved petals. */
function HeroRose({
  position,
  tint,
  scale = 1,
}: {
  position: [number, number, number];
  tint: string;
  scale?: number;
}) {
  const petals = useMemo(() => {
    const out: { ring: number; angle: number }[] = [];
    for (let ring = 0; ring < 2; ring++) {
      const n = ring === 0 ? 5 : 7;
      for (let i = 0; i < n; i++) {
        out.push({ ring, angle: (i / n) * Math.PI * 2 + ring * 0.45 });
      }
    }
    return out;
  }, []);

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.024, 0.72, 6]} />
        <meshStandardMaterial color="#3f7d38" roughness={0.9} />
      </mesh>
      {/* leaves */}
      {[0.3, 0.5].map((y, i) => (
        <mesh
          key={i}
          position={[i === 0 ? 0.09 : -0.09, y, 0]}
          rotation={[0.5, 0, i === 0 ? -0.9 : 0.9]}
        >
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color="#4c8a41" roughness={0.85} />
        </mesh>
      ))}
      <group position={[0, 0.78, 0]}>
        {/* centre bud */}
        <mesh castShadow>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial color={tint} roughness={0.45} />
        </mesh>
        {/* petal rings — half-sphere shells leaning outward */}
        {petals.map((p, i) => {
          const r = p.ring === 0 ? 0.07 : 0.115;
          const lean = p.ring === 0 ? 0.55 : 0.95;
          return (
            <group key={i} rotation={[0, p.angle, 0]}>
              <mesh position={[r, p.ring === 0 ? 0.01 : -0.02, 0]} rotation={[0, 0, -lean]}>
                <sphereGeometry args={[0.085, 10, 8, 0, Math.PI]} />
                <meshStandardMaterial
                  color={tint}
                  roughness={0.5}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/** Rustic posts holding up both boards so they sit in the scene. */
function BoardPosts() {
  const wood = "#8a6242";
  const posts: { x: number; top: number }[] = [
    { x: -BOARD.width / 2 + 0.3, top: BOARD.centerY },
    { x: BOARD.width / 2 - 0.3, top: BOARD.centerY },
    { x: MINI_BOARD.offsetX - MINI_BOARD.width / 2 + 0.2, top: MINI_BOARD.centerY },
    { x: MINI_BOARD.offsetX + MINI_BOARD.width / 2 - 0.2, top: MINI_BOARD.centerY },
  ];
  return (
    <group position={[0, 0, BOARD.wallZ - 0.12]}>
      {posts.map((p, i) => (
        <mesh key={i} position={[p.x, p.top / 2 + 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, p.top + 0.2, 8]} />
          <meshStandardMaterial color={wood} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Gingham blanket, basket, food, cushions and the two drinks. */
function Picnic() {
  const blanketTexture = useMemo(() => {
    const s = 256;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff6f4";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgba(229, 82, 122, 0.55)";
    const n = 8;
    for (let i = 0; i < n; i += 2) {
      ctx.fillRect((i * s) / n, 0, s / n, s);
      ctx.fillRect(0, (i * s) / n, s, s / n);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    return t;
  }, []);
  useEffect(() => () => blanketTexture.dispose(), [blanketTexture]);

  // gently rumpled blanket
  const blanketGeom = useMemo(() => {
    const g = new THREE.PlaneGeometry(2.6, 2.1, 18, 14);
    const pos = g.attributes.position;
    const rand = mulberry32(9);
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (rand() - 0.5) * 0.035);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => blanketGeom.dispose(), [blanketGeom]);

  return (
    <group position={[0, 0, 1.3]}>
      <mesh
        geometry={blanketGeom}
        rotation={[-Math.PI / 2, 0, 0.12]}
        position={[0, 0.02, 0]}
        receiveShadow
      >
        <meshStandardMaterial map={blanketTexture} roughness={0.95} />
      </mesh>

      <Basket position={[-0.75, 0, -0.45]} />

      {/* cushions */}
      <RoundedBox
        args={[0.6, 0.16, 0.6]}
        radius={0.07}
        position={[-1.05, 0.1, 0.55]}
        rotation={[0, 0.4, 0]}
        castShadow
      >
        <meshStandardMaterial color="#ffb3cb" roughness={0.9} />
      </RoundedBox>
      <RoundedBox
        args={[0.6, 0.16, 0.6]}
        radius={0.07}
        position={[1.05, 0.1, 0.5]}
        rotation={[0, -0.3, 0]}
        castShadow
      >
        <meshStandardMaterial color="#fff0e2" roughness={0.9} />
      </RoundedBox>

      {/* plate of food */}
      <group position={[0.2, 0, -0.3]}>
        <mesh position={[0, 0.035, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.34, 0.03, 24]} />
          <meshStandardMaterial color="#fffdf8" roughness={0.4} />
        </mesh>
        {/* baguette */}
        <mesh position={[-0.05, 0.1, -0.04]} rotation={[0, 0.7, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.055, 0.34, 4, 10]} />
          <meshStandardMaterial color="#d9a45f" roughness={0.85} />
        </mesh>
        {/* cheese wedge */}
        <mesh position={[0.13, 0.075, 0.1]} rotation={[0, -0.6, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.07, 3]} />
          <meshStandardMaterial color="#f6ce6b" roughness={0.7} />
        </mesh>
        {/* strawberries */}
        {[
          [-0.16, 0.14],
          [-0.05, 0.18],
          [0.04, 0.13],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.08, z]} rotation={[Math.PI, 0, i]} castShadow>
            <coneGeometry args={[0.035, 0.06, 8]} />
            <meshStandardMaterial color="#e03448" roughness={0.5} />
          </mesh>
        ))}
        {/* grapes */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={`g${i}`}
            position={[0.2 + (i % 3) * 0.045, 0.07 + Math.floor(i / 3) * 0.04, -0.12 + (i % 2) * 0.04]}
          >
            <sphereGeometry args={[0.026, 10, 10]} />
            <meshStandardMaterial color="#7c4a8f" roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* the two drinks — one beside each cushion */}
      <BeerGlass position={[-0.68, 0, 0.5]} />
      <AperolSpritz position={[0.72, 0, 0.42]} />

      {/* a couple of loose rose petals on the blanket */}
      {[
        [-0.35, 0.28, 0.5],
        [0.5, 0.55, 2.4],
        [-0.1, -0.62, 1.2],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.045, z]} rotation={[-Math.PI / 2, 0, r]}>
          <circleGeometry args={[0.045, 8]} />
          <meshStandardMaterial color="#ff9ec0" roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Woven picnic basket with an arched handle and folded napkin. */
function Basket({ position }: { position: [number, number, number] }) {
  const weave = useMemo(() => {
    const s = 128;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#a5713f";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(70, 40, 12, 0.45)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * s) / 8 + 6);
      ctx.lineTo(s, (i * s) / 8 + 6);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 220, 170, 0.35)";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i * s) / 8, 0);
      ctx.lineTo((i * s) / 8, s);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    return t;
  }, []);
  useEffect(() => () => weave.dispose(), [weave]);

  return (
    <group position={position} rotation={[0, -0.4, 0]}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.2, 0.3, 18]} />
        <meshStandardMaterial map={weave} roughness={0.9} />
      </mesh>
      {/* rim */}
      <mesh position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.26, 0.02, 8, 20]} />
        <meshStandardMaterial color="#7c5228" roughness={0.85} />
      </mesh>
      {/* handle */}
      <mesh position={[0, 0.32, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.24, 0.018, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#7c5228" roughness={0.85} />
      </mesh>
      {/* napkin peeking out */}
      <mesh position={[0.08, 0.32, 0.05]} rotation={[-0.4, 0.4, 0.2]}>
        <planeGeometry args={[0.24, 0.18]} />
        <meshStandardMaterial color="#ffe3ec" roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** A pint of beer: real glass (transmission), amber body, foamy head. */
function BeerGlass({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.062, 0.3, 20, 1, true]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.92}
          thickness={0.02}
          roughness={0.08}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* beer */}
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.066, 0.056, 0.22, 20]} />
        <meshStandardMaterial color="#e8930c" roughness={0.25} />
      </mesh>
      {/* foam */}
      <mesh position={[0, 0.265, 0]}>
        <cylinderGeometry args={[0.07, 0.066, 0.05, 20]} />
        <meshStandardMaterial color="#fff7e0" roughness={0.9} />
      </mesh>
      <mesh position={[0.02, 0.295, 0.02]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color="#fff7e0" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** An Aperol spritz: stemmed glass, orange fizz, slice and a straw. */
function AperolSpritz({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* stem + foot */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.055, 0.06, 0.015, 16]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} roughness={0.1} transparent />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.11, 8]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} roughness={0.1} transparent />
      </mesh>
      {/* bowl */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.085, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.92}
          thickness={0.02}
          roughness={0.06}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* the spritz */}
      <mesh position={[0, 0.185, 0]}>
        <sphereGeometry args={[0.075, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color="#ff5a1f" roughness={0.3} />
      </mesh>
      {/* ice cube glint */}
      <mesh position={[0.02, 0.23, 0.01]} rotation={[0.4, 0.6, 0.2]}>
        <boxGeometry args={[0.035, 0.035, 0.035]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.85} roughness={0.15} transparent />
      </mesh>
      {/* orange slice on the rim */}
      <mesh position={[0.075, 0.27, 0]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.045, 0.045, 0.012, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#ff9b3d" roughness={0.6} />
      </mesh>
      {/* straw */}
      <mesh position={[-0.035, 0.3, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.006, 0.006, 0.22, 8]} />
        <meshStandardMaterial color="#ff8fb4" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Rose petals loosed from the field, drifting and tumbling down. */
function FallingPetals() {
  const COUNT = 26;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const petals = useMemo(() => {
    const rand = mulberry32(77);
    return Array.from({ length: COUNT }, () => ({
      x: (rand() - 0.5) * 14,
      z: 3 - rand() * 12,
      speed: 0.14 + rand() * 0.2,
      sway: 0.4 + rand() * 0.8,
      phase: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 2,
    }));
  }, []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const col = new THREE.Color();
    petals.forEach((_, i) =>
      mesh.setColorAt(i, col.set(i % 2 === 0 ? "#ff9ec0" : "#ffc2d6"))
    );
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [petals]);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    petals.forEach((p, i) => {
      const fall = 4 - (((t * p.speed + p.phase) % 1) + 0) * 4;
      dummy.position.set(
        p.x + Math.sin(t * p.sway + p.phase) * 0.5,
        fall,
        p.z + Math.cos(t * p.sway * 0.7 + p.phase) * 0.3
      );
      dummy.rotation.set(t * p.spin, p.phase, t * p.spin * 0.6);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <circleGeometry args={[0.04, 8]} />
      <meshStandardMaterial roughness={0.6} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
