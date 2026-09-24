"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useKit, useRepeated, WHITE_PAINT } from "./kit";
import { BRICK, STONE_GREY } from "./colours";
import { Garland, helix, swag } from "./Garland";

/**
 * The gazebo on the square: an open octagonal bandstand on a red brick
 * base, eight slim columns, white X-braced railings, a bracketed and
 * dentilled cornice, a shingled roof, and a little windowed cupola on
 * top. Steps come down on the +z side, where the railing is left open.
 *
 * Dressed for October: leaf garland wound up every column and swagged
 * round the eaves between them.
 *
 * Origin at ground level in the middle of the base.
 */

const N = 8;
/** Octagon with a flat side (not a corner) facing +z. */
const START = Math.PI / N;

const BASE_R = 2.4;
const BASE_H = 0.95;
const FLOOR = 1.09;
const COL_R = 2.28;
const COL_TOP = FLOOR + 2.45;
const BEAM_H = 0.32;
const EAVE = COL_TOP + BEAM_H + 0.08;
const ROOF_R = 3.2;
const ROOF_H = 1.5;

/** Corner i of an octagon of radius r, as (x, z). */
function corner(i: number, r: number): [number, number] {
  const a = START + (i * 2 * Math.PI) / N;
  return [Math.sin(a) * r, Math.cos(a) * r];
}

/** Which side the steps are on: the one facing +z. */
const STEP_SIDE = N - 1;

export function Gazebo() {
  const kit = useKit();
  const brick = useRepeated((k) => k.brick, 16, 1.55);
  const roof = useRepeated((k) => k.shingle, 10, 3);
  const cupolaRoof = useRepeated((k) => k.shingle, 4, 1);
  const stepBrick = useRepeated((k) => k.brick, 2, 1);

  const paint = <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />;
  const grey = <meshToonMaterial color={STONE_GREY} gradientMap={kit.ramp} />;

  const column = useMemo(makeColumnGeometry, []);
  const bracket = useMemo(makeBracketGeometry, []);
  useEffect(
    () => () => {
      column.dispose();
      bracket.dispose();
    },
    [column, bracket]
  );

  return (
    <group>
      {/* the brick base, with grey piers at its corners */}
      <mesh position={[0, BASE_H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[BASE_R, BASE_R, BASE_H, N, 1, true, START]} />
        <meshToonMaterial color={BRICK} map={brick} gradientMap={kit.ramp} />
      </mesh>
      {Array.from({ length: N }, (_, i) => {
        const [x, z] = corner(i, BASE_R);
        const a = START + (i * 2 * Math.PI) / N;
        return (
          <mesh key={i} position={[x, BASE_H / 2, z]} rotation={[0, a, 0]} castShadow>
            <boxGeometry args={[0.22, BASE_H, 0.22]} />
            {grey}
          </mesh>
        );
      })}
      {/* the floor, a grey cap slab overhanging the brick */}
      <mesh position={[0, (BASE_H + FLOOR) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[BASE_R + 0.16, BASE_R + 0.16, FLOOR - BASE_H, N, 1, false, START]} />
        {grey}
      </mesh>

      {/* columns */}
      {Array.from({ length: N }, (_, i) => {
        const [x, z] = corner(i, COL_R);
        return (
          <mesh key={i} geometry={column} position={[x, FLOOR, z]} castShadow receiveShadow>
            <meshToonMaterial color="#c9c5bb" gradientMap={kit.ramp} />
          </mesh>
        );
      })}

      {/* railings, every side but the one the steps come up */}
      {Array.from({ length: N }, (_, i) =>
        i === STEP_SIDE ? null : <Railing key={i} side={i} />
      )}

      {/* entablature: the beam, its dentil course, and the cornice */}
      <mesh position={[0, COL_TOP + BEAM_H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[COL_R + 0.14, COL_R + 0.14, BEAM_H, N, 1, false, START]} />
        <meshToonMaterial color="#e9e5da" gradientMap={kit.ramp} />
      </mesh>
      <Dentils />
      <mesh position={[0, COL_TOP + BEAM_H + 0.04, 0]} castShadow>
        <cylinderGeometry args={[COL_R + 0.34, COL_R + 0.3, 0.08, N, 1, false, START]} />
        {paint}
      </mesh>
      {/* a curved bracket at the head of every column */}
      {Array.from({ length: N }, (_, i) => {
        const [x, z] = corner(i, COL_R + 0.14);
        const a = START + (i * 2 * Math.PI) / N;
        return (
          <mesh
            key={i}
            geometry={bracket}
            position={[x, COL_TOP, z]}
            rotation={[0, a - Math.PI / 2, 0]}
            castShadow
          >
            {paint}
          </mesh>
        );
      })}

      {/* the roof, its soffit, and the hips */}
      <mesh position={[0, EAVE + ROOF_H / 2, 0]} castShadow receiveShadow>
        <coneGeometry args={[ROOF_R, ROOF_H, N, 1, false, START]} />
        {/* A cone's groups are side, top cap, bottom cap — and with no
            top cap the flat underside (the soffit) is still index 2. */}
        <meshToonMaterial attach="material-0" color="#6b6660" map={roof} gradientMap={kit.ramp} />
        <meshToonMaterial attach="material-1" color="#ece8de" gradientMap={kit.ramp} />
        <meshToonMaterial attach="material-2" color="#ece8de" gradientMap={kit.ramp} />
      </mesh>
      <Hips />

      <Cupola roofMap={cupolaRoof} />

      <Steps brickMap={stepBrick} />

      <GazeboGarland />
    </group>
  );
}

/** A column: a square plinth, a torus base, a tapering shaft, a capital. */
function makeColumnGeometry(): THREE.BufferGeometry {
  const h = COL_TOP - FLOOR;
  // lathe profile, bottom to top, as (radius, height)
  const pts = [
    [0.0, 0],
    [0.15, 0],
    [0.15, 0.1],
    [0.13, 0.12],
    [0.135, 0.15],
    [0.115, 0.19],
    [0.105, 0.22],
    [0.09, h - 0.3],
    [0.1, h - 0.27],
    [0.09, h - 0.24],
    [0.1, h - 0.2],
    [0.14, h - 0.12],
    [0.16, h - 0.08],
    [0.16, h],
    [0, h],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 16);
  g.computeVertexNormals();
  return g;
}

/** A scrolled bracket, one flat profile extruded thin. */
function makeBracketGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  // x out from the column, y down from the beam
  s.moveTo(0, 0);
  s.lineTo(0.34, 0);
  s.lineTo(0.34, -0.06);
  s.bezierCurveTo(0.2, -0.08, 0.1, -0.16, 0.06, -0.34);
  s.lineTo(0, -0.36);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false, curveSegments: 8 });
  g.translate(-0.05, 0, -0.03);
  return g;
}

/** The white railing for one side: top and bottom rails and an X. */
function Railing({ side }: { side: number }) {
  const kit = useKit();
  const [ax, az] = corner(side, COL_R);
  const [bx, bz] = corner(side + 1, COL_R);
  const mx = (ax + bx) / 2;
  const mz = (az + bz) / 2;
  const facing = START + ((side + 0.5) * 2 * Math.PI) / N;
  const L = Math.hypot(bx - ax, bz - az) - 0.2;
  const low = FLOOR + 0.14;
  const high = FLOOR + 0.92;
  const H = high - low;
  const diag = Math.hypot(L, H);
  const tilt = Math.atan2(H, L);
  const paint = <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />;
  return (
    <group position={[mx, 0, mz]} rotation={[0, facing, 0]}>
      <mesh position={[0, high + 0.04, 0]} castShadow>
        <boxGeometry args={[L, 0.07, 0.09]} />
        {paint}
      </mesh>
      <mesh position={[0, low - 0.03, 0]} castShadow>
        <boxGeometry args={[L, 0.06, 0.07]} />
        {paint}
      </mesh>
      {[tilt, -tilt].map((t) => (
        <mesh key={t} position={[0, (low + high) / 2, 0]} rotation={[0, 0, t]} castShadow>
          <boxGeometry args={[diag, 0.05, 0.045]} />
          {paint}
        </mesh>
      ))}
    </group>
  );
}

/** Small blocks under the cornice, all the way round — one instanced mesh. */
function Dentils() {
  const kit = useKit();
  const matrices = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const apothem = (COL_R + 0.14) * Math.cos(Math.PI / N);
    const side = 2 * (COL_R + 0.14) * Math.sin(Math.PI / N);
    const count = 13;
    for (let k = 0; k < N; k++) {
      const c = START + ((k + 0.5) * 2 * Math.PI) / N;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c);
      for (let j = 0; j < count; j++) {
        const lx = -side / 2 + ((j + 0.5) / count) * side;
        const p = new THREE.Vector3(lx, COL_TOP + BEAM_H - 0.07, apothem + 0.03).applyQuaternion(q);
        out.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
      }
    }
    return out;
  }, []);
  return (
    <instancedMesh
      args={[undefined, undefined, matrices.length]}
      ref={(m) => {
        if (!m) return;
        matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
        m.instanceMatrix.needsUpdate = true;
      }}
    >
      <boxGeometry args={[0.06, 0.09, 0.06]} />
      <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />
    </instancedMesh>
  );
}

/** A thin ridge cap down each of the roof's eight hips. */
function Hips() {
  const kit = useKit();
  const hips = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        const [x, z] = corner(i, ROOF_R);
        const from = new THREE.Vector3(x, EAVE, z);
        const to = new THREE.Vector3(0, EAVE + ROOF_H, 0);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const dir = to.clone().sub(from);
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize()
        );
        return { mid, q, len: dir.length() };
      }),
    []
  );
  return (
    <>
      {hips.map((h, i) => (
        <mesh key={i} position={h.mid} quaternion={h.q} castShadow>
          <cylinderGeometry args={[0.04, 0.04, h.len, 6]} />
          <meshToonMaterial color="#56514b" gradientMap={kit.ramp} />
        </mesh>
      ))}
    </>
  );
}

/** The windowed cupola on the ridge, with its own little roof and finial. */
function Cupola({ roofMap }: { roofMap: THREE.Texture }) {
  const kit = useKit();
  const base = EAVE + ROOF_H - 0.42;
  const R = 0.6;
  const H = 0.62;
  const paint = <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />;
  const apothem = R * Math.cos(Math.PI / N);
  return (
    <group position={[0, base, 0]}>
      <mesh position={[0, H / 2, 0]} castShadow>
        <cylinderGeometry args={[R, R + 0.03, H, N, 1, false, START]} />
        {paint}
      </mesh>
      {/* a dark window in every face, in a white surround */}
      {Array.from({ length: N }, (_, k) => {
        const c = START + ((k + 0.5) * 2 * Math.PI) / N;
        return (
          <group key={k} rotation={[0, c, 0]}>
            <mesh position={[0, H * 0.55, apothem + 0.012]}>
              <planeGeometry args={[0.24, 0.26]} />
              <meshBasicMaterial color="#2a2f38" />
            </mesh>
            <mesh position={[0, H * 0.55 - 0.16, apothem + 0.02]}>
              <boxGeometry args={[0.32, 0.04, 0.04]} />
              {paint}
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, H + 0.04, 0]} castShadow>
        <cylinderGeometry args={[R + 0.14, R + 0.1, 0.08, N, 1, false, START]} />
        {paint}
      </mesh>
      <mesh position={[0, H + 0.08 + 0.2, 0]} castShadow>
        <coneGeometry args={[R + 0.2, 0.4, N, 1, false, START]} />
        <meshToonMaterial attach="material-0" color="#6b6660" map={roofMap} gradientMap={kit.ramp} />
        <meshToonMaterial attach="material-1" color="#ece8de" gradientMap={kit.ramp} />
        <meshToonMaterial attach="material-2" color="#ece8de" gradientMap={kit.ramp} />
      </mesh>
      <mesh position={[0, H + 0.52, 0]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshToonMaterial color="#56514b" gradientMap={kit.ramp} />
      </mesh>
      <mesh position={[0, H + 0.66, 0]}>
        <coneGeometry args={[0.025, 0.22, 8]} />
        <meshToonMaterial color="#56514b" gradientMap={kit.ramp} />
      </mesh>
    </group>
  );
}

/**
 * Four steps up to the floor on the open side: brick risers under grey
 * treads, grey newel posts at the foot, and white handrails.
 */
function Steps({ brickMap }: { brickMap: THREE.Texture }) {
  const kit = useKit();
  const apothem = BASE_R * Math.cos(Math.PI / N);
  const rise = FLOOR / 5;
  const run = 0.32;
  const W = 1.66;
  const grey = <meshToonMaterial color={STONE_GREY} gradientMap={kit.ramp} />;
  const paint = <meshToonMaterial color={WHITE_PAINT} gradientMap={kit.ramp} />;
  const foot = apothem + 4 * run;
  return (
    <group>
      {[1, 2, 3, 4].map((k) => {
        const h = k * rise;
        const depth = (5 - k) * run;
        return (
          <group key={k}>
            <mesh position={[0, (h - 0.05) / 2, apothem + depth / 2]} castShadow receiveShadow>
              <boxGeometry args={[W, h - 0.05, depth]} />
              <meshToonMaterial color={BRICK} map={brickMap} gradientMap={kit.ramp} />
            </mesh>
            <mesh position={[0, h - 0.025, apothem + depth / 2 + 0.02]} castShadow receiveShadow>
              <boxGeometry args={[W + 0.04, 0.05, depth + 0.04]} />
              {grey}
            </mesh>
          </group>
        );
      })}
      {/* newel posts at the foot, handrails up to the columns */}
      {[-1, 1].map((s) => {
        const x = s * (W / 2 + 0.06);
        const from = new THREE.Vector3(x, 1.0, foot - 0.1);
        const to = new THREE.Vector3(x, FLOOR + 0.95, apothem);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const dir = to.clone().sub(from);
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          dir.clone().normalize()
        );
        return (
          <group key={s}>
            <mesh position={[x, 0.55, foot - 0.1]} castShadow>
              <boxGeometry args={[0.16, 1.1, 0.16]} />
              {grey}
            </mesh>
            <mesh position={[x, 1.13, foot - 0.1]} castShadow>
              <boxGeometry args={[0.2, 0.06, 0.2]} />
              {grey}
            </mesh>
            <mesh position={mid} quaternion={q} castShadow>
              <boxGeometry args={[0.07, 0.07, dir.length()]} />
              {paint}
            </mesh>
            {/* two balusters under each rail */}
            {[0.33, 0.66].map((t) => {
              const p = from.clone().lerp(to, t);
              const d = p.z - apothem;
              const floorY = d <= 0 ? FLOOR : rise * Math.min(4, Math.floor(5 - d / run));
              const len = p.y - floorY;
              return (
                <mesh key={t} position={[x, floorY + len / 2, p.z]} castShadow>
                  <boxGeometry args={[0.05, len, 0.05]} />
                  {paint}
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/** Leaf garland wound up each column and swagged between their heads. */
function GazeboGarland() {
  const curves = useMemo(() => {
    const out: THREE.Curve<THREE.Vector3>[] = [];
    for (let i = 0; i < N; i++) {
      const [x, z] = corner(i, COL_R);
      out.push(helix(x, z, 0.13, FLOOR + 0.2, COL_TOP - 0.15, 3.2, i));
      const [bx, bz] = corner(i + 1, COL_R + 0.2);
      const [ax, az] = corner(i, COL_R + 0.2);
      out.push(
        swag(
          new THREE.Vector3(ax, COL_TOP + 0.02, az),
          new THREE.Vector3(bx, COL_TOP + 0.02, bz),
          0.26
        )
      );
    }
    return out;
  }, []);
  return <Garland curves={curves} perMetre={46} size={0.14} thickness={0.05} seed={8} />;
}
