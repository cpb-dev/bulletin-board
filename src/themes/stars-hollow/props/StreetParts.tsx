"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useKit } from "./kit";
import { useLook } from "./phase";
import {
  makeAwningTexture,
  makeFasciaTexture,
  makeHomeWindowTexture,
  makeShopWindowTexture,
} from "./textures";
import { Garland } from "./Garland";

/**
 * The joinery shops on Main Street are built from: windows, doors,
 * pilasters, fascias, awnings and cornices. Each one is placed in the
 * local frame of a facade — +z out of the wall, y up from the pavement,
 * the wall's face at z = 0.
 */

/** A plain box in a toon paint colour. */
export function Trim({
  at,
  size,
  color,
  cast = true,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
  cast?: boolean;
}) {
  const kit = useKit();
  return (
    <mesh position={at} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
      <meshToonMaterial color={color} gradientMap={kit.ramp} />
    </mesh>
  );
}

/**
 * Glass with the inside of a shop behind it. Lit a little from within
 * so a window reads as a window from across the square, not a dark hole.
 */
export function Glass({
  at,
  w,
  h,
  map,
  glow = 0.35,
}: {
  at: [number, number, number];
  w: number;
  h: number;
  map: THREE.Texture;
  glow?: number;
}) {
  // shops light up from within as it gets dark (BB-21)
  const { windowGlow } = useLook();
  return (
    <mesh position={at}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={map}
        emissive="#ffffff"
        emissiveMap={map}
        emissiveIntensity={glow * windowGlow}
        roughness={0.25}
        metalness={0.05}
      />
    </mesh>
  );
}

/**
 * A window texture, built once per seed and disposed with it: a shop's
 * stock and lamps, or (`home`) the curtains of a flat upstairs.
 */
export function useShopWindow(seed: number, warmth = 0.7, home = false): THREE.Texture {
  const t = useMemo(
    () => (home ? makeHomeWindowTexture(seed) : makeShopWindowTexture(seed, warmth)),
    [seed, warmth, home]
  );
  useEffect(() => () => t.dispose(), [t]);
  return t;
}

/**
 * An upper-floor sash window: glass, a frame, a sill below and a
 * lintel over it — flat, or arched for the brick fronts.
 */
export function SashWindow({
  x,
  y,
  w = 0.8,
  h = 1.4,
  trim,
  arched = false,
  pediment = false,
  glass,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  trim: string;
  arched?: boolean;
  pediment?: boolean;
  glass: THREE.Texture;
}) {
  const kit = useKit();
  const t = 0.07;
  return (
    <group position={[x, y, 0]}>
      <Glass at={[0, 0, 0.01]} w={w} h={h} map={glass} glow={0.2} />
      {/* the meeting rail between the sashes */}
      <Trim at={[0, 0, 0.03]} size={[w, 0.04, 0.03]} color={trim} cast={false} />
      <Trim at={[-w / 2 - t / 2, 0, 0.03]} size={[t, h + t, 0.06]} color={trim} />
      <Trim at={[w / 2 + t / 2, 0, 0.03]} size={[t, h + t, 0.06]} color={trim} />
      <Trim at={[0, -h / 2 - 0.05, 0.06]} size={[w + 0.26, 0.07, 0.14]} color={trim} />
      {arched ? (
        <mesh position={[0, h / 2, 0.03]} castShadow>
          {/* a half-ring over the head of the window */}
          <torusGeometry args={[w / 2 + t / 2, t / 1.5, 6, 16, Math.PI]} />
          <meshToonMaterial color={trim} gradientMap={kit.ramp} />
        </mesh>
      ) : (
        <Trim at={[0, h / 2 + 0.06, 0.05]} size={[w + 0.24, 0.12, 0.1]} color={trim} />
      )}
      {arched && (
        <mesh position={[0, h / 2, 0.01]}>
          <circleGeometry args={[w / 2, 16, 0, Math.PI]} />
          <meshStandardMaterial map={glass} roughness={0.3} emissive="#ffffff" emissiveMap={glass} emissiveIntensity={0.15} />
        </mesh>
      )}
      {pediment && (
        <mesh position={[0, h / 2 + 0.2, 0.06]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 1]} castShadow>
          <boxGeometry args={[(w + 0.3) * 0.72, (w + 0.3) * 0.72, 0.08]} />
          <meshToonMaterial color={trim} gradientMap={kit.ramp} />
        </mesh>
      )}
    </group>
  );
}

/** Painted fascia with the shop's name on it. */
export function Fascia({
  text,
  at,
  w,
  h,
  bg,
  ink,
}: {
  text: string;
  at: [number, number, number];
  w: number;
  h: number;
  bg: string;
  ink: string;
}) {
  const kit = useKit();
  const tex = useMemo(() => makeFasciaTexture(text, bg, ink, w / h), [text, bg, ink, w, h]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={at}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.1]} />
        <meshToonMaterial color={bg} gradientMap={kit.ramp} />
      </mesh>
      <mesh position={[0, 0, 0.051]}>
        <planeGeometry args={[w, h]} />
        <meshLambertMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

/**
 * A striped canvas awning: a sloping top, a hanging valance, and the
 * two triangular cheeks. `top` is where it meets the wall.
 */
export function Awning({
  w,
  top,
  reach = 0.95,
  drop = 0.55,
  colours,
}: {
  w: number;
  top: number;
  reach?: number;
  drop?: number;
  colours: [string, string];
}) {
  const tex = useMemo(() => makeAwningTexture(colours[0], colours[1]), [colours]);
  useEffect(() => () => tex.dispose(), [tex]);
  const repeat = useMemo(() => {
    const t = tex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(w / 1.6, 1);
    t.needsUpdate = true;
    return t;
  }, [tex, w]);
  useEffect(() => () => repeat.dispose(), [repeat]);
  const slope = Math.hypot(reach, drop);
  const angle = Math.atan2(drop, reach);
  const cheek = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(reach, -drop);
    s.lineTo(0, -drop);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [reach, drop]);
  useEffect(() => () => cheek.dispose(), [cheek]);
  return (
    <group position={[0, top, 0]}>
      <mesh position={[0, -drop / 2, reach / 2]} rotation={[angle - Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[w, slope]} />
        <meshLambertMaterial map={repeat} side={THREE.DoubleSide} />
      </mesh>
      {/* valance */}
      <mesh position={[0, -drop - 0.1, reach + 0.005]} castShadow>
        <planeGeometry args={[w, 0.2]} />
        <meshLambertMaterial map={repeat} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={cheek} position={[(s * w) / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <meshLambertMaterial map={repeat} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** A panelled shop door with a glazed top half. */
export function ShopDoor({
  x,
  w = 0.95,
  h = 2.2,
  color,
  trim,
  glass,
  wreath = false,
}: {
  x: number;
  w?: number;
  h?: number;
  color: string;
  trim: string;
  glass: THREE.Texture;
  wreath?: boolean;
}) {
  return (
    <group position={[x, 0, 0]}>
      {/* a shallow recess: the door stands back from the facade */}
      <Trim at={[0, h / 2, -0.1]} size={[w, h, 0.05]} color={color} />
      <Glass at={[0, h * 0.68, -0.07]} w={w * 0.7} h={h * 0.44} map={glass} glow={0.3} />
      <Trim at={[0, h * 0.24, -0.065]} size={[w * 0.66, h * 0.3, 0.02]} color={trim} cast={false} />
      <Trim at={[-w / 2 - 0.05, h / 2 + 0.05, 0]} size={[0.1, h + 0.1, 0.2]} color={trim} />
      <Trim at={[w / 2 + 0.05, h / 2 + 0.05, 0]} size={[0.1, h + 0.1, 0.2]} color={trim} />
      <Trim at={[0, h + 0.08, 0]} size={[w + 0.3, 0.14, 0.22]} color={trim} />
      {/* brass knob */}
      <Trim at={[w * 0.36, h * 0.48, -0.05]} size={[0.05, 0.05, 0.05]} color="#c9a44a" cast={false} />
      {wreath && <DoorWreath y={h * 0.7} z={-0.02} />}
    </group>
  );
}

/**
 * An autumn wreath: a ring of leaves round a dark twig core, with a
 * bow at the bottom. Leaves, not a painted ring — a smooth torus in
 * leaf colour reads as a life buoy.
 */
export function DoorWreath({ y, z, r = 0.2 }: { y: number; z: number; r?: number }) {
  const kit = useKit();
  const ring = useMemo(() => [new THREE.EllipseCurve(0, 0, r, r)].map(toCurve3), [r]);
  return (
    <group position={[0, y, z]}>
      <mesh>
        <torusGeometry args={[r, r * 0.16, 6, 20]} />
        <meshToonMaterial color="#5a3a26" gradientMap={kit.ramp} />
      </mesh>
      <Garland curves={ring} perMetre={Math.round((50 + 60 * r) / (2 * Math.PI * r))} size={r * 0.55} thickness={r * 0.14} seed={Math.round(r * 100)} />
      <mesh position={[0, -r * 1.02, r * 0.12]}>
        <boxGeometry args={[r * 0.55, r * 0.26, 0.03]} />
        <meshToonMaterial color="#8c2a1f" gradientMap={kit.ramp} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * r * 0.14, -r * 1.3, r * 0.12]} rotation={[0, 0, s * 0.3]}>
          <boxGeometry args={[r * 0.12, r * 0.5, 0.02]} />
          <meshToonMaterial color="#8c2a1f" gradientMap={kit.ramp} />
        </mesh>
      ))}
    </group>
  );
}

/** A flat 2D curve in the xy plane, lifted into 3D for the garland. */
function toCurve3(c: THREE.Curve<THREE.Vector2>): THREE.Curve<THREE.Vector3> {
  const pts = c.getSpacedPoints(32).map((p) => new THREE.Vector3(p.x, p.y, 0));
  return new THREE.CatmullRomCurve3(pts, true);
}

/** A cornice along the top of a facade, carried on small brackets. */
export function Cornice({ w, y, color, brackets = true }: { w: number; y: number; color: string; brackets?: boolean }) {
  const n = Math.max(3, Math.round(w / 0.7));
  return (
    <group position={[0, y, 0]}>
      <Trim at={[0, 0.18, 0.2]} size={[w + 0.36, 0.14, 0.42]} color={color} />
      <Trim at={[0, 0.06, 0.12]} size={[w + 0.2, 0.12, 0.26]} color={color} />
      <Trim at={[0, -0.1, 0.05]} size={[w + 0.04, 0.22, 0.1]} color={color} />
      {brackets &&
        Array.from({ length: n }, (_, i) => {
          const x = -w / 2 + ((i + 0.5) / n) * w;
          return <Trim key={i} at={[x, -0.02, 0.2]} size={[0.1, 0.26, 0.3]} color={color} />;
        })}
    </group>
  );
}
