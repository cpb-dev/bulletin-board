"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { ShopKind } from "../lib/layout";
import { useKit, useRepeated } from "./kit";
import {
  Awning,
  Cornice,
  DoorWreath,
  Fascia,
  Glass,
  SashWindow,
  ShopDoor,
  Trim,
  useShopWindow,
} from "./StreetParts";

/**
 * A shop on Main Street: a ground-floor shopfront (pilasters, a painted
 * fascia with the shop's name, big display windows either side of a
 * recessed door, an awning over it all) with one or two storeys above.
 *
 * The kinds are the fronts in the photos of the town: red brick with
 * teal paintwork and green-striped awnings; paler brick with arched
 * upper windows; a cream painted Victorian with a bay; plain painted
 * clapboard; and a taller brick block with pedimented windows and a
 * bracketed cornice.
 *
 * Origin at the middle of the shopfront, at pavement level; the front
 * is +z and the building runs back to z = -depth.
 */

interface Style {
  wall: "brick" | "clapboard";
  wallColor: string;
  trim: string;
  fasciaBg: string;
  fasciaInk: string;
  awning?: [string, string];
  arched?: boolean;
  pediments?: boolean;
  bay?: boolean;
  /** Extra height on the parapet, metres. */
  parapet?: number;
}

const STYLES: Record<Exclude<ShopKind, "lukes">, Style> = {
  "brick-teal": {
    wall: "brick",
    wallColor: "#b8613f",
    trim: "#2f6f69",
    fasciaBg: "#2f6f69",
    fasciaInk: "#f3ead2",
    awning: ["#3f7a4e", "#efe9d8"],
    arched: true,
  },
  "brick-arched": {
    wall: "brick",
    wallColor: "#c98a5c",
    trim: "#efe6cf",
    fasciaBg: "#6b2f2a",
    fasciaInk: "#f3e2b8",
    awning: ["#a8392e", "#f1e8d6"],
    arched: true,
    parapet: 0.5,
  },
  victorian: {
    wall: "clapboard",
    wallColor: "#e9dfc6",
    trim: "#7d8f99",
    fasciaBg: "#fbf6ea",
    fasciaInk: "#4a5a66",
    awning: ["#8a5a32", "#efe2c4"],
    bay: true,
  },
  clapboard: {
    wall: "clapboard",
    wallColor: "#b9c6a4",
    trim: "#f6f2e8",
    fasciaBg: "#f6f2e8",
    fasciaInk: "#5a3a2a",
    awning: ["#b64a32", "#f5eee0"],
  },
  "brick-tall": {
    wall: "brick",
    wallColor: "#a95a3d",
    trim: "#efe6cf",
    fasciaBg: "#27324a",
    fasciaInk: "#e9d9a8",
    pediments: true,
    parapet: 0.3,
  },
};

const GROUND = 3.3;
const STOREY = 2.8;

export function Storefront({
  kind,
  sign,
  width,
  depth,
  floors,
  seed,
}: {
  kind: Exclude<ShopKind, "lukes">;
  sign?: string;
  width: number;
  depth: number;
  floors: number;
  seed: number;
}) {
  const kit = useKit();
  const style = STYLES[kind];
  const height = GROUND + floors * STOREY + (style.parapet ?? 0);
  const wallMap = useRepeated(
    (k) => (style.wall === "brick" ? k.brick : k.clapboard),
    style.wall === "brick" ? width / 0.9 : 1,
    style.wall === "brick" ? height / 0.6 : height / 1.6
  );
  const display = useShopWindow(seed, 0.75);
  const upper = useShopWindow(seed + 100, 0.25, true);

  // Upper windows, evenly across the front.
  const perFloor = Math.max(2, Math.floor(width / 1.35));
  const xs = Array.from(
    { length: perFloor },
    (_, i) => -width / 2 + ((i + 0.5) / perFloor) * width
  );
  const doorX = seed % 2 ? width * 0.18 : -width * 0.18;
  const winW = (width - 1.4) / 2 - 0.25;

  return (
    <group>
      {/* the body of the building */}
      <mesh position={[0, height / 2, -depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshToonMaterial color={style.wallColor} map={wallMap} gradientMap={kit.ramp} />
      </mesh>

      {/* ---- the shopfront ---- */}
      {/* pilasters at either end */}
      {[-1, 1].map((s) => (
        <Trim
          key={s}
          at={[s * (width / 2 - 0.13), GROUND / 2, 0.06]}
          size={[0.26, GROUND, 0.14]}
          color={style.trim}
        />
      ))}
      {/* the fascia, and a shelf of moulding over it */}
      <Fascia
        text={sign ?? ""}
        at={[0, GROUND - 0.4, 0.08]}
        w={width - 0.5}
        h={0.55}
        bg={style.fasciaBg}
        ink={style.fasciaInk}
      />
      <Trim at={[0, GROUND - 0.08, 0.14]} size={[width, 0.1, 0.3]} color={style.trim} />
      {/* display windows either side of the door, on panelled stall risers */}
      {[-1, 1].map((s) => {
        const cx = doorX + s * (0.7 + winW / 2 + 0.1);
        return (
          <group key={s} position={[cx, 0, 0.02]}>
            <Trim at={[0, 0.3, 0.02]} size={[winW + 0.1, 0.6, 0.08]} color={style.trim} />
            <Glass at={[0, 0.6 + 0.95, 0]} w={winW} h={1.9} map={display} glow={0.35} />
            <Trim at={[0, 0.6 + 1.9 + 0.04, 0.03]} size={[winW + 0.1, 0.08, 0.06]} color={style.trim} />
            <Trim at={[0, 0.6 + 0.95, 0.03]} size={[0.05, 1.9, 0.04]} color={style.trim} cast={false} />
          </group>
        );
      })}
      <ShopDoor x={doorX} color={style.trim} trim={style.trim} glass={display} wreath />
      {style.awning && <Awning w={width - 0.4} top={GROUND - 0.72} colours={style.awning} />}

      {/* ---- upper floors ---- */}
      {Array.from({ length: floors }, (_, f) => {
        const y = GROUND + f * STOREY + STOREY * 0.52;
        return (
          <group key={f}>
            {xs.map((x, i) =>
              style.bay && i === Math.floor(perFloor / 2) ? (
                <BayWindow key={i} x={x} y={y} trim={style.trim} wall={style.wallColor} glass={upper} />
              ) : (
                <SashWindow
                  key={i}
                  x={x}
                  y={y}
                  trim={style.trim}
                  arched={style.arched}
                  pediment={style.pediments}
                  glass={upper}
                />
              )
            )}
            {/* a string course between floors */}
            <Trim at={[0, GROUND + f * STOREY + 0.05, 0.03]} size={[width, 0.1, 0.08]} color={style.trim} />
          </group>
        );
      })}

      <Cornice w={width} y={height - 0.35} color={style.trim} />
      {/* A late-autumn touch: a wreath on the fascia of the bigger fronts. */}
      {floors > 1 && <DoorWreath y={GROUND + 0.02} z={0.2} r={0.24} />}
    </group>
  );
}

/** A three-sided bay window standing out from an upper floor. */
function BayWindow({
  x,
  y,
  trim,
  wall,
  glass,
}: {
  x: number;
  y: number;
  trim: string;
  wall: string;
  glass: THREE.Texture;
}) {
  const kit = useKit();
  const w = 1.1;
  const d = 0.45;
  const h = 1.6;
  const sides = useMemo(() => {
    const side = Math.hypot(d, 0.25);
    const angle = Math.atan2(d, 0.25);
    return { side, angle };
  }, []);
  return (
    <group position={[x, y, 0]}>
      {/* floor and roof of the bay */}
      <mesh position={[0, -h / 2 - 0.12, d / 2]} castShadow>
        <boxGeometry args={[w + 0.6, 0.24, d + 0.05]} />
        <meshToonMaterial color={trim} gradientMap={kit.ramp} />
      </mesh>
      <mesh position={[0, h / 2 + 0.12, d / 2]} castShadow>
        <boxGeometry args={[w + 0.7, 0.24, d + 0.12]} />
        <meshToonMaterial color={trim} gradientMap={kit.ramp} />
      </mesh>
      {/* front light */}
      <Glass at={[0, 0, d]} w={w} h={h} map={glass} glow={0.2} />
      <Trim at={[-w / 2, 0, d]} size={[0.08, h, 0.08]} color={trim} />
      <Trim at={[w / 2, 0, d]} size={[0.08, h, 0.08]} color={trim} />
      {/* the angled side lights */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 + 0.125), 0, d / 2]} rotation={[0, s * sides.angle, 0]}>
          <mesh>
            <planeGeometry args={[sides.side, h]} />
            <meshToonMaterial color={wall} gradientMap={kit.ramp} side={THREE.DoubleSide} />
          </mesh>
          <Glass at={[0, 0, 0.01]} w={sides.side * 0.7} h={h * 0.9} map={glass} glow={0.15} />
        </group>
      ))}
    </group>
  );
}
