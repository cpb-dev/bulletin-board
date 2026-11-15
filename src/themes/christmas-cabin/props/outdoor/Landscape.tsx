"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "@/components/three/textures";
import { forest, GROUND, houses, terrainHeight } from "../../lib/outdoor";
import { makeOutdoorMaterial, type OutdoorUniforms } from "./material";

/**
 * The land outside (BB-35): a glittering snowy slope rising to a ridge
 * and rolling hills, a pine forest scattered over them with snow on
 * every tier, a little village of cabins whose windows light up as it
 * gets dark, and snow-capped mountains on the horizon.
 */
export function Landscape({ shared, villageLights }: { shared: OutdoorUniforms; villageLights: number }) {
  return (
    <group>
      <Ground shared={shared} />
      <Mountains shared={shared} />
      <Forest shared={shared} />
      <Village shared={shared} lights={villageLights} />
    </group>
  );
}

function Ground({ shared }: { shared: OutdoorUniforms }) {
  const geometry = useMemo(() => {
    const w = GROUND.maxX - GROUND.minX;
    const d = GROUND.maxZ - GROUND.minZ;
    const g = new THREE.PlaneGeometry(w, d, 120, 80);
    g.rotateX(-Math.PI / 2);
    g.translate((GROUND.maxX + GROUND.minX) / 2, 0, (GROUND.maxZ + GROUND.minZ) / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    return g;
  }, []);
  const material = useMemo(
    () => makeOutdoorMaterial(shared, { color: "#f4f7fb", sparkle: 0.9, hazeNear: 20, hazeFar: 110 }),
    [shared]
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );
  return <mesh geometry={geometry} material={material} />;
}

/** A jagged range on the horizon, behind the hills, rock with snow above. */
function Mountains({ shared }: { shared: OutdoorUniforms }) {
  const geometry = useMemo(() => {
    const r = mulberry32(17);
    const N = 160;
    const R = 78;
    // Peaks along an arc from far left round to slightly right of behind.
    const heights = Array.from({ length: N + 1 }, (_, k) => {
      const a = k / N;
      // Low enough to leave a band of sky above them through the window.
      return 8 + 5 * Math.sin(a * 23) * Math.sin(a * 7 + 1) + 2.5 * Math.sin(a * 61 + 2) + r() * 2;
    });
    const positions: number[] = [];
    const colors: number[] = [];
    const rock = new THREE.Color("#5d667a");
    const snow = new THREE.Color("#eef3fb");
    const ang = (k: number) => -1.95 + (k / N) * 2.9;
    const at = (k: number, radius: number, y: number) => {
      const a = ang(k);
      return [Math.sin(a) * radius, y, -Math.cos(a) * radius - 2];
    };
    // Each step: a quad strip from the foot (buried in the hills) to the crest.
    for (let k = 0; k < N; k++) {
      const rows = (kk: number) => {
        const h = heights[kk];
        return [at(kk, R - 10, 0), at(kk, R - 3, h * 0.55), at(kk, R + 2, h)];
      };
      const a = rows(k);
      const b = rows(k + 1);
      for (let j = 0; j < 2; j++) {
        const quad = [a[j], b[j], a[j + 1], b[j], b[j + 1], a[j + 1]];
        for (const v of quad) {
          positions.push(v[0], v[1], v[2]);
          const c = v[1] > 6.5 + 2 * Math.sin(v[0] * 0.3) ? snow : rock;
          colors.push(c.r, c.g, c.b);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const material = useMemo(
    () => makeOutdoorMaterial(shared, { vertexColors: true, snowCap: 0.7, hazeNear: 40, hazeFar: 95 }),
    [shared]
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );
  return <mesh geometry={geometry} material={material} />;
}

/** One pine: a short trunk and three tiers, to be instanced. Unit height. */
function pineGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.035, 0.05, 0.16, 6).translate(0, 0.08, 0);
  const tiers = [
    new THREE.ConeGeometry(0.34, 0.42, 9).translate(0, 0.32, 0),
    new THREE.ConeGeometry(0.26, 0.36, 9).translate(0, 0.56, 0),
    new THREE.ConeGeometry(0.17, 0.32, 9).translate(0, 0.8, 0),
  ];
  const paint = (g: THREE.BufferGeometry, hex: string) => {
    const c = new THREE.Color(hex);
    const n = g.attributes.position.count;
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Array(n).fill(0).flatMap(() => [c.r, c.g, c.b]), 3));
    return g;
  };
  const g = mergeGeometries([paint(trunk, "#4a3526"), ...tiers.map((t) => paint(t, "#2c4a3a"))]);
  [trunk, ...tiers].forEach((x) => x.dispose());
  return g;
}

function Forest({ shared }: { shared: OutdoorUniforms }) {
  const trees = useMemo(() => forest(), []);
  const geometry = useMemo(pineGeometry, []);
  const material = useMemo(
    () => makeOutdoorMaterial(shared, { vertexColors: true, snowCap: 1, hazeNear: 20, hazeFar: 105 }),
    [shared]
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const r = mulberry32(3);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    trees.forEach((t, i) => {
      o.position.set(t.x, t.y - 0.1, t.z);
      o.rotation.set(0, r() * 6.28, 0);
      const s = t.height;
      o.scale.set(s * (0.85 + r() * 0.3), s, s * (0.85 + r() * 0.3));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      const l = 0.8 + r() * 0.35;
      m.setColorAt(i, c.setRGB(l, l, l));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [trees]);
  return <instancedMesh ref={mesh} args={[geometry, material, trees.length]} />;
}

/** Cabins: log-brown walls, snowy roofs, chimneys, and windows that light up. */
function Village({ shared, lights }: { shared: OutdoorUniforms; lights: number }) {
  const list = useMemo(() => houses(), []);
  const walls = useMemo(() => makeOutdoorMaterial(shared, { color: "#6b4a34", hazeNear: 25, hazeFar: 100 }), [shared]);
  const roof = useMemo(() => makeOutdoorMaterial(shared, { color: "#4a3a34", snowCap: 1, hazeNear: 25, hazeFar: 100 }), [shared]);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, fog: false }), []);
  useEffect(
    () => () => {
      walls.dispose();
      roof.dispose();
      glow.dispose();
    },
    [walls, roof, glow]
  );
  useEffect(() => {
    // Dark glass by day; warm and bright once the lamps are lit.
    glow.color.set("#2b3346").lerp(new THREE.Color("#ffc46e").multiplyScalar(2.2), lights);
  }, [glow, lights]);

  return (
    <group>
      {list.map((h, i) => (
        <group key={i} position={[h.x, h.y, h.z]} rotation={[0, h.rot, 0]}>
          <mesh position={[0, h.h / 2 - 0.2, 0]} material={walls}>
            <boxGeometry args={[h.w, h.h + 0.4, h.d]} />
          </mesh>
          {/* a pitched roof: a three-sided prism along the cabin */}
          <mesh position={[0, h.h + 0.35, 0]} rotation={[0, 0, Math.PI / 2]} material={roof}>
            {/* thetaStart pi/2 puts one edge straight up: the ridge */}
            <cylinderGeometry args={[h.d * 0.62, h.d * 0.62, h.w + 0.4, 3, 1, false, Math.PI / 2]} />
          </mesh>
          <mesh position={[h.w * 0.25, h.h + 0.9, 0]} material={walls}>
            <boxGeometry args={[0.35, 1.0, 0.35]} />
          </mesh>
          {/* two windows on the side facing the cabin we're in */}
          {[-0.25, 0.25].map((wx) => (
            <mesh key={wx} position={[wx * h.w, h.h * 0.45, h.d / 2 + 0.01]} material={glow}>
              <planeGeometry args={[0.55, 0.6]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
