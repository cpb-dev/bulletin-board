"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import {
  FACE_Z,
  FIRE,
  FIREBOX_BACK_Z,
  flicker,
  HEARTH,
  OPENING,
  smokePuff,
  SMOKE,
  spark,
  SPARKS,
  THROAT,
} from "../../lib/fireplace";
import {
  makeBarkTexture,
  makeFirebrickTexture,
  makeFlameMaterial,
  makeLogEndTexture,
  makePuffTexture,
  makeSoftDotTexture,
} from "./textures";

/** The flames: where each stands, how wide and tall, and how it's turned. */
const FLAMES = [
  { x: -0.2, w: 0.42, h: 0.58, ry: 0, seed: 0.1 },
  { x: 0.18, w: 0.46, h: 0.66, ry: 0, seed: 0.37 },
  { x: 0.0, w: 0.5, h: 0.62, ry: 0.75, seed: 0.62 },
  { x: -0.05, w: 0.48, h: 0.55, ry: -0.75, seed: 0.84 },
  { x: -0.34, w: 0.3, h: 0.38, ry: 0.3, seed: 0.23 },
  { x: 0.35, w: 0.3, h: 0.42, ry: -0.3, seed: 0.51 },
];

/** Split logs on the grate: two along the back, one across the front. */
const LOGS: { p: THREE.Vector3Tuple; r: THREE.Vector3Tuple; len: number; rad: number }[] = [
  { p: [-0.12, FIRE.y + 0.06, -0.14], r: [0.12, 0.15, Math.PI / 2], len: 0.78, rad: 0.075 },
  { p: [0.14, FIRE.y + 0.07, -0.03], r: [-0.1, -0.2, Math.PI / 2], len: 0.74, rad: 0.07 },
  { p: [0.0, FIRE.y + 0.16, 0.06], r: [0.05, 0.45, Math.PI / 2 + 0.12], len: 0.66, rad: 0.062 },
];

/**
 * The fire and the space it burns in (BB-35): the firebrick lining,
 * blackened with soot; an iron grate; split logs with charred, glowing
 * ends over a bed of embers; licking flames; sparks spitting up; smoke
 * drawn back up the throat; and the firelight that flickers over the
 * room. `dim` (0..1) lowers the fire — Santa's boots coming down damp it.
 */
export function Firebox({ dim }: { dim: React.RefObject<number> }) {
  const brick = useMemo(makeFirebrickTexture, []);
  const bark = useMemo(makeBarkTexture, []);
  const logEnd = useMemo(makeLogEndTexture, []);
  const dot = useMemo(makeSoftDotTexture, []);
  const puff = useMemo(makePuffTexture, []);
  const flames = useMemo(() => FLAMES.map((f) => makeFlameMaterial(f.seed)), []);
  useEffect(
    () => () => {
      [brick, bark, logEnd, dot, puff].forEach((t) => t.dispose());
      flames.forEach((m) => m.dispose());
    },
    [brick, bark, logEnd, dot, puff, flames]
  );

  const light = useRef<THREE.PointLight>(null);
  const inner = useRef<THREE.PointLight>(null);
  const coals = useRef<THREE.MeshBasicMaterial>(null);

  const backHalf = OPENING.width / 2 - 0.1;
  const openingH = OPENING.top - OPENING.bottom;
  const sideLen = Math.hypot(FACE_Z - 0.04 - FIREBOX_BACK_Z, OPENING.width / 2 - backHalf);
  const sideAngle = Math.atan2(OPENING.width / 2 - backHalf, FACE_Z - 0.04 - FIREBOX_BACK_Z);

  // Sparks: one Points cloud, fading via colour (additive, so dark = gone).
  const sparkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARKS.count * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SPARKS.count * 3), 3));
    return g;
  }, []);
  useEffect(() => () => sparkGeo.dispose(), [sparkGeo]);

  const puffs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const damp = 1 - 0.35 * (dim.current ?? 0);
    const f = flicker(t) * damp;
    if (light.current) {
      light.current.intensity = 4.2 * f;
      light.current.position.x = Math.sin(t * 2.3) * 0.04;
    }
    if (inner.current) inner.current.intensity = 2.2 * f;
    for (const m of flames) {
      m.uniforms.uTime.value = t;
      m.uniforms.uIntensity.value = 0.85 + 0.25 * (f - 1) + 0.15 * damp;
    }
    // Embers breathe: brighter and dimmer, slower than the flames.
    if (coals.current) coals.current.color.setScalar((0.85 + 0.6 * (flicker(t * 0.6 + 3) - 1)) * damp);

    const pos = sparkGeo.attributes.position as THREE.BufferAttribute;
    const col = sparkGeo.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < SPARKS.count; i++) {
      const s = spark(i, t);
      pos.setXYZ(i, s.x, s.y, s.z);
      const g = s.glow * damp;
      col.setXYZ(i, 1 * g, 0.55 * g, 0.15 * g);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    puffs.current.forEach((m, i) => {
      if (!m) return;
      const p = smokePuff(i, t);
      m.position.set(p.x, p.y, p.z);
      m.scale.setScalar(p.scale);
      m.rotation.z = t * 0.2 + i;
      (m.material as THREE.MeshBasicMaterial).opacity = p.opacity;
    });
  });

  return (
    <group>
      {/* firebrick lining: back, splayed sides, and the roof with the throat */}
      <mesh position={[0, OPENING.bottom + openingH / 2, FIREBOX_BACK_Z]}>
        <planeGeometry args={[backHalf * 2, openingH]} />
        <meshStandardMaterial map={brick} roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (backHalf + OPENING.width / 2) / 2, OPENING.bottom + openingH / 2, (FACE_Z - 0.04 + FIREBOX_BACK_Z) / 2]}
          rotation={[0, -s * (Math.PI / 2 - sideAngle), 0]}
        >
          <planeGeometry args={[sideLen, openingH]} />
          <meshStandardMaterial map={brick} roughness={1} />
        </mesh>
      ))}
      {/* the roof, stopping short of the back to leave the throat open */}
      <mesh
        position={[0, OPENING.top, (FACE_Z + THROAT.z + 0.08) / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[OPENING.width, FACE_Z - THROAT.z - 0.08]} />
        <meshStandardMaterial color="#0b0807" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* the flue beyond the throat: black, so smoke disappears up it */}
      <mesh position={[0, OPENING.top + 0.4, THROAT.z]}>
        <boxGeometry args={[OPENING.width - 0.1, 0.8, 0.26]} />
        <meshBasicMaterial color="#050403" side={THREE.BackSide} />
      </mesh>
      {/* the ash on the firebox floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, HEARTH.height + 0.002, (FACE_Z + FIREBOX_BACK_Z) / 2]}>
        <planeGeometry args={[OPENING.width - 0.05, FACE_Z - FIREBOX_BACK_Z]} />
        <meshStandardMaterial color="#3a3430" roughness={1} />
      </mesh>

      <Grate />
      <Coals material={coals} />

      {LOGS.map((l, i) => (
        <mesh key={i} position={l.p} rotation={l.r} castShadow>
          <cylinderGeometry args={[l.rad, l.rad * 1.08, l.len, 12, 1]} />
          {/* Bark, with a deep ember glow showing through its cracks. */}
          <meshStandardMaterial attach="material-0" map={bark} emissive="#5a1606" emissiveIntensity={0.35} roughness={1} />
          <meshStandardMaterial attach="material-1" map={logEnd} emissive="#ff6a1a" emissiveIntensity={0.25} roughness={1} />
          <meshStandardMaterial attach="material-2" map={logEnd} emissive="#ff6a1a" emissiveIntensity={0.25} roughness={1} />
        </mesh>
      ))}

      {FLAMES.map((f, i) => (
        <mesh key={i} position={[f.x, FIRE.y + 0.06 + f.h / 2, FIRE.z]} rotation={[0, f.ry, 0]} material={flames[i]}>
          <planeGeometry args={[f.w, f.h]} />
        </mesh>
      ))}

      <points geometry={sparkGeo}>
        <pointsMaterial
          size={0.03}
          map={dot}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {Array.from({ length: SMOKE.count }, (_, i) => (
        <mesh key={i} ref={(m) => void (puffs.current[i] = m)}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={puff} color="#6e655c" transparent depthWrite={false} opacity={0} />
        </mesh>
      ))}

      {/* firelight: one out into the room, one lighting the firebox */}
      <pointLight ref={light} position={[0, 0.6, FACE_Z + 0.35]} intensity={4} distance={7} decay={2} color="#ff8a3a" />
      <pointLight ref={inner} position={[0, 0.55, FIRE.z + 0.1]} intensity={2} distance={1.4} decay={2} color="#ff7a26" />
    </group>
  );
}

/** A cast-iron grate: bars across, on two legs. */
function Grate() {
  const iron = <meshStandardMaterial color="#1c1a19" metalness={0.6} roughness={0.55} />;
  return (
    <group position={[0, FIRE.y - 0.04, FIRE.z]}>
      {[-0.16, -0.06, 0.04, 0.14].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.8, 6]} />
          {iron}
        </mesh>
      ))}
      {[-0.36, 0.36].map((x) => (
        <group key={x} position={[x, -0.03, -0.01]}>
          <mesh>
            <boxGeometry args={[0.03, 0.03, 0.4]} />
            {iron}
          </mesh>
          {[-0.17, 0.17].map((z) => (
            <mesh key={z} position={[0, -0.05, z]}>
              <cylinderGeometry args={[0.012, 0.016, 0.1, 6]} />
              {iron}
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** A bed of glowing embers under the logs: one instanced mesh. */
function Coals({ material }: { material: React.RefObject<THREE.MeshBasicMaterial | null> }) {
  const count = 46;
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const r = mulberry32(83);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      o.position.set(Math.cos(a) * d * 0.36, FIRE.y - 0.05 + r() * 0.03, FIRE.z + Math.sin(a) * d * 0.17);
      o.rotation.set(r() * 3, r() * 3, r() * 3);
      o.scale.setScalar(0.025 + r() * 0.03);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      // Hottest in the middle — orange-yellow — through deep red to
      // nearly black ash at the edges. Some are dark even in the middle.
      const heat = (1 - d * 0.85) * (r() < 0.25 ? 0.25 : 1);
      m.setColorAt(i, c.setRGB(0.08 + heat * 1.0, 0.01 + heat * heat * 0.42, heat * heat * 0.04));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshBasicMaterial ref={material} toneMapped={false} />
    </instancedMesh>
  );
}
