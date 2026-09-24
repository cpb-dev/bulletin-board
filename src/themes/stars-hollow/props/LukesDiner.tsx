"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useKit, useRepeated } from "./kit";
import { IRON } from "./colours";
import { Fascia, Glass, SashWindow, ShopDoor, Trim, useShopWindow } from "./StreetParts";
import {
  LUKES_YELLOW,
  makeDinerWindowTexture,
  makeFoodTexture,
  makeLukesSignTexture,
} from "./textures";

/**
 * Luke's, on the corner of Main Street.
 *
 * Cream-painted panelled shopfront on two sides, the big windows with
 * leaded transoms over them, green gingham half-curtains on brass
 * rails, and fairy lights round the glass; the old WILLIAMS HARDWARE
 * fascia still over the door; "Food" in the window; and the yellow
 * coffee-cup sign hanging from its black scroll bracket at the corner.
 * Luke's flat is upstairs, in grey-white clapboard under a hipped roof.
 *
 * Origin at the middle of the street front, at pavement level. The
 * street front is +z; the corner side, which faces back towards the
 * square and the board, is +x.
 */

export const LUKES = { width: 4.6, depth: 3.6 } as const;

const W = LUKES.width;
const D = LUKES.depth;
const G = 3.2;
const U = 2.7;
const CREAM = "#f1ead8";
const CREAM_TRIM = "#fbf6ea";
const SIDING = "#e1dfd6";

export function LukesDiner() {
  const kit = useKit();
  const siding = useRepeated((k) => k.clapboard, 1, U / 1.4);
  const inside = useMemo(() => makeDinerWindowTexture(2), []);
  const food = useMemo(makeFoodTexture, []);
  const sign = useMemo(makeLukesSignTexture, []);
  useEffect(
    () => () => {
      inside.dispose();
      food.dispose();
      sign.dispose();
    },
    [inside, food, sign]
  );
  const upper = useShopWindow(41, 0.3, true);
  const roof = useMemo(makeHipRoof, []);
  useEffect(() => () => roof.dispose(), [roof]);
  const shingle = useRepeated((k) => k.shingle, 4, 2);

  return (
    <group>
      {/* ground floor */}
      <mesh position={[0, G / 2, -D / 2]} castShadow receiveShadow>
        <boxGeometry args={[W, G, D]} />
        <meshToonMaterial color={CREAM} gradientMap={kit.ramp} />
      </mesh>
      {/* the flat upstairs, in clapboard */}
      <mesh position={[0, G + U / 2, -D / 2]} castShadow receiveShadow>
        <boxGeometry args={[W - 0.1, U, D - 0.1]} />
        <meshToonMaterial color={SIDING} map={siding} gradientMap={kit.ramp} />
      </mesh>
      {/* the hipped roof */}
      <mesh geometry={roof} position={[0, G + U, -D / 2]} castShadow receiveShadow>
        <meshToonMaterial color="#6a6560" map={shingle} gradientMap={kit.ramp} />
      </mesh>
      <Trim at={[0, G + U + 0.06, -D / 2]} size={[W + 0.5, 0.14, D + 0.5]} color={CREAM_TRIM} />

      {/* the box canopy between the floors, round both open sides */}
      <Trim at={[0, G + 0.05, 0.22]} size={[W + 0.5, 0.4, 0.45]} color={CREAM_TRIM} />
      <Trim at={[W / 2 + 0.22, G + 0.05, -D / 2 + 0.2]} size={[0.45, 0.4, D + 0.4]} color={CREAM_TRIM} />
      <Fascia
        text="WILLIAMS HARDWARE"
        at={[-0.3, G + 0.05, 0.46]}
        w={3.3}
        h={0.32}
        bg="#f4efe2"
        ink="#6f6a62"
      />

      {/* corner and end pilasters */}
      {[
        [W / 2 - 0.12, 0.08],
        [-W / 2 + 0.12, 0.08],
      ].map(([x, z], i) => (
        <Trim key={i} at={[x, G / 2, z]} size={[0.3, G, 0.18]} color={CREAM_TRIM} />
      ))}
      <Trim at={[W / 2 + 0.08, G / 2, -D + 0.12]} size={[0.18, G, 0.3]} color={CREAM_TRIM} />

      {/* ---- the street front: door, then a big window ---- */}
      <ShopDoor x={-1.35} color="#e8e1cf" trim={CREAM_TRIM} glass={inside} wreath />
      <WallLantern x={-2.0} y={2.2} />
      <WallLantern x={-0.7} y={2.2} />
      <DinerWindow x={0.85} w={2.3} inside={inside} seed={1} />

      {/* ---- the corner side, towards the square ---- */}
      <group position={[W / 2, 0, -D / 2]} rotation={[0, Math.PI / 2, 0]}>
        <DinerWindow x={-0.85} w={1.5} inside={inside} seed={2} food={food} />
        <DinerWindow x={0.85} w={1.5} inside={inside} seed={3} />
        <Trim at={[0, G / 2, 0.08]} size={[0.24, G, 0.16]} color={CREAM_TRIM} />
        {/* upstairs */}
        {[-0.85, 0.85].map((x) => (
          <SashWindow key={x} x={x} y={G + U * 0.5} w={0.8} h={1.3} trim={CREAM_TRIM} glass={upper} />
        ))}
      </group>
      {/* upstairs on the street front */}
      {[-1.2, 1.2].map((x) => (
        <SashWindow key={x} x={x} y={G + U * 0.5} w={0.8} h={1.3} trim={CREAM_TRIM} glass={upper} />
      ))}

      {/* Luke's sign, hung at the corner from its scroll bracket */}
      <group position={[W / 2 - 0.2, 2.95, 0.12]}>
        <ScrollBracket />
        <mesh position={[0, -0.36, 0.62]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <planeGeometry args={[0.95, 0.72]} />
          <meshLambertMaterial
            map={sign}
            alphaTest={0.4}
            side={THREE.DoubleSide}
            emissive={LUKES_YELLOW}
            emissiveMap={sign}
            emissiveIntensity={0.12}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * One of the diner's big windows: a leaded transom over the plate
 * glass, gingham café curtains on a brass rail across the lower half,
 * fairy lights round the frame, and a panelled riser under the sill.
 */
function DinerWindow({
  x,
  w,
  inside,
  seed,
  food,
}: {
  x: number;
  w: number;
  inside: THREE.Texture;
  seed: number;
  food?: THREE.Texture;
}) {
  const kit = useKit();
  const gingham = useRepeated((k) => k.gingham, w / 0.5, 1);
  const bottom = 0.72;
  const top = 2.45;
  const h = top - bottom;
  const cy = (bottom + top) / 2;
  return (
    <group position={[x, 0, 0.02]}>
      {/* riser and sill */}
      <Trim at={[0, bottom / 2, 0.03]} size={[w + 0.1, bottom, 0.08]} color={CREAM_TRIM} />
      <Trim at={[0, bottom + 0.02, 0.08]} size={[w + 0.2, 0.06, 0.16]} color={CREAM_TRIM} />
      <Glass at={[0, cy, 0]} w={w} h={h} map={inside} glow={0.4} />
      {/* leaded transom */}
      <mesh position={[0, top + 0.24, 0]}>
        <planeGeometry args={[w, 0.4]} />
        <meshLambertMaterial map={kit.transom} emissive="#ffffff" emissiveMap={kit.transom} emissiveIntensity={0.15} />
      </mesh>
      {/* frame and transom bar */}
      <Trim at={[0, top + 0.02, 0.04]} size={[w + 0.08, 0.06, 0.06]} color={CREAM_TRIM} />
      <Trim at={[0, top + 0.47, 0.04]} size={[w + 0.1, 0.07, 0.07]} color={CREAM_TRIM} />
      <Trim at={[-w / 2, (bottom + top + 0.47) / 2, 0.04]} size={[0.07, h + 0.5, 0.07]} color={CREAM_TRIM} />
      <Trim at={[w / 2, (bottom + top + 0.47) / 2, 0.04]} size={[0.07, h + 0.5, 0.07]} color={CREAM_TRIM} />
      {/* brass rail and gathered gingham */}
      <mesh position={[0, bottom + 0.82, 0.03]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, w - 0.05, 6]} />
        <meshStandardMaterial color="#c9a44a" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, bottom + 0.42, 0.02]}>
        <planeGeometry args={[w - 0.08, 0.78]} />
        <meshLambertMaterial map={gingham} />
      </mesh>
      {food && (
        <mesh position={[w * 0.12, bottom + 1.35, 0.012]}>
          <planeGeometry args={[0.75, 0.38]} />
          <meshLambertMaterial map={food} transparent alphaTest={0.1} emissive="#ffffff" emissiveMap={food} emissiveIntensity={0.2} />
        </mesh>
      )}
      <FairyLights w={w} bottom={bottom} top={top} seed={seed} />
    </group>
  );
}

/** Little warm bulbs round three sides of a window, on one instanced mesh. */
function FairyLights({ w, bottom, top, seed }: { w: number; bottom: number; top: number; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const points = useMemo(() => {
    const out: THREE.Vector3[] = [];
    const step = 0.13;
    for (let y = bottom + 0.1; y <= top; y += step) {
      out.push(new THREE.Vector3(-w / 2 + 0.06, y, 0.05));
      out.push(new THREE.Vector3(w / 2 - 0.06, y, 0.05));
    }
    for (let x = -w / 2 + 0.06; x <= w / 2; x += step) {
      out.push(new THREE.Vector3(x, top - 0.05 - Math.sin(((x + w / 2) / w) * Math.PI) * 0.05, 0.05));
    }
    return out;
  }, [w, bottom, top]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    points.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points, seed]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]}>
      <sphereGeometry args={[0.018, 6, 5]} />
      <meshBasicMaterial color="#ffe3a0" toneMapped={false} />
    </instancedMesh>
  );
}

/** A black carriage lantern with a warm pane, either side of the door. */
function WallLantern({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y, 0.12]}>
      <mesh castShadow>
        <boxGeometry args={[0.2, 0.34, 0.2]} />
        <meshStandardMaterial color={IRON} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.101]}>
        <planeGeometry args={[0.14, 0.24]} />
        <meshBasicMaterial color="#ffd98f" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.16, 0.12, 4]} />
        <meshStandardMaterial color={IRON} roughness={0.5} />
      </mesh>
    </group>
  );
}

/**
 * The wrought-iron bracket Luke's sign hangs from: a straight arm out
 * from the wall with a scroll curling under it, a smaller curl at the
 * wall, and two short chains down to the sign. It stands out along +z.
 */
function ScrollBracket() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    // the arm
    const arm = new THREE.CylinderGeometry(0.018, 0.018, 1.15, 6);
    arm.rotateX(Math.PI / 2);
    arm.translate(0, 0, 0.55);
    parts.push(arm);
    // the brace: a quarter curve from the wall up to the arm
    const brace = new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, -0.5, 0),
        new THREE.Vector3(0, -0.05, 0.05),
        new THREE.Vector3(0, 0, 0.75)
      ),
      12,
      0.014,
      5
    );
    parts.push(brace);
    // scrolls: little spirals, one under the arm, one at the tip
    const spiral = (cz: number, r: number, turns: number, dir: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const a = t * turns * Math.PI * 2 * dir;
        const rr = r * (1 - t * 0.75);
        pts.push(new THREE.Vector3(0, -rr * Math.cos(a) + r - 0.02, cz + rr * Math.sin(a)));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.011, 5);
    };
    parts.push(spiral(0.25, 0.14, 1.1, 1));
    parts.push(spiral(1.05, 0.09, 1.2, -1));
    // wall plate
    const plate = new THREE.BoxGeometry(0.08, 0.6, 0.02);
    plate.translate(0, -0.25, 0);
    parts.push(plate);
    // chains to the sign
    for (const z of [0.36, 0.88]) {
      const c = new THREE.CylinderGeometry(0.006, 0.006, 0.1, 4);
      c.translate(0, -0.05, z);
      parts.push(c);
    }
    return parts;
  }, []);
  useEffect(() => () => geo.forEach((g) => g.dispose()), [geo]);
  return (
    <group>
      {geo.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial color={IRON} roughness={0.45} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** A low hipped roof over a W × D footprint. */
function makeHipRoof(): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(W + 0.4, 1.3, D + 0.4);
  g.translate(0, 0.65, 0);
  g.computeVertexNormals();
  return g;
}
