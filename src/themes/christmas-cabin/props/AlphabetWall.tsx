"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { mulberry32 } from "@/components/three/textures";
import { ALPHABET_WALL, ROOM } from "../lib/layout";
import { STRING, bulbLevels, letterSpots, planSpellings, spellingAt, wireY } from "../lib/letterlights";
import { makeBulbGlowTexture, makePaintedLettersTexture } from "./textures";

/** Bulb glass colours, cycled along the string: classic C9 Christmas colours. */
const BULBS = ["#ff3b2f", "#2fd05e", "#2f7dff", "#ffc42a", "#ff5ccf", "#ff8a1f"];
/** How long the message plan runs before it starts again (seconds). */
const PLAN_LENGTH = 6 * 3600;
/** Size of each bulb's glow on the wall, in metres. */
const GLOW = 0.7;

/**
 * The alphabet light wall on the right side wall (BB-35): the alphabet
 * painted straight onto the boards in cream, three rows filling the wall
 * between the wainscot and the fairy lights, with a coloured C9 bulb on a
 * sagging green string over each letter.
 *
 * The string twinkles, and every so often it dims and spells a message —
 * "MERRY CHRISTMAS", "I LOVE YOU" — one bulb at a time, then chases back
 * on. The timing lives in `lib/letterlights.ts`; this just draws it.
 */
export function AlphabetWall() {
  const { z, y, width, height, rows } = ALPHABET_WALL;
  const letters = useMemo(makePaintedLettersTexture, []);
  const glowTex = useMemo(makeBulbGlowTexture, []);
  useEffect(
    () => () => {
      letters.dispose();
      glowTex.dispose();
    },
    [letters, glowTex]
  );

  const spots = useMemo(letterSpots, []);
  const plan = useMemo(() => planSpellings(Math.floor(Math.random() * 1e9), PLAN_LENGTH), []);

  // Each string: a green flex through its hooks, sagging between them.
  const wires = useMemo(
    () =>
      rows.map((_, r) => {
        const pts: THREE.Vector3[] = [];
        const n = 48;
        for (let i = 0; i <= n; i++) {
          const x = -width / 2 + 0.02 + ((width - 0.04) * i) / n;
          pts.push(new THREE.Vector3(x, wireY(r, x), 0.03));
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.007, 5, false);
      }),
    [rows, width]
  );
  useEffect(() => () => wires.forEach((g) => g.dispose()), [wires]);

  // A C9 bulb: a lathed teardrop, tip down, origin at the socket.
  const bulbGeom = useMemo(() => {
    const L = STRING.bulbLength;
    const pts = [
      [0.0, 0],
      [0.02, -0.004],
      [0.03, -L * 0.3],
      [0.028, -L * 0.6],
      [0.015, -L * 0.88],
      [0.0, -L],
    ].map(([px, py]) => new THREE.Vector2(px, py));
    return new THREE.LatheGeometry(pts, 12);
  }, []);
  const socketGeom = useMemo(() => new THREE.CylinderGeometry(0.014, 0.016, 0.04, 8), []);
  const glowGeom = useMemo(() => new THREE.PlaneGeometry(GLOW, GLOW), []);
  useEffect(
    () => () => {
      bulbGeom.dispose();
      socketGeom.dispose();
      glowGeom.dispose();
    },
    [bulbGeom, socketGeom, glowGeom]
  );

  const bulbs = useRef<THREE.InstancedMesh>(null);
  const sockets = useRef<THREE.InstancedMesh>(null);
  const glows = useRef<THREE.InstancedMesh>(null);
  const spill = useRef<THREE.PointLight>(null);
  const spot = useRef<THREE.PointLight>(null);

  const base = useMemo(() => spots.map((_, i) => new THREE.Color(BULBS[i % BULBS.length])), [spots]);

  // Place everything once; only colours change per frame.
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    const r = mulberry32(8);
    spots.forEach((s, i) => {
      const top = s.bulbY - 0.01;
      // Bulbs never hang quite straight.
      e.set((r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.35);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(s.bulbX, top - STRING.bulbDrop + 0.02, 0.05), q, one);
      sockets.current?.setMatrixAt(i, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.02, 0)));
      bulbs.current?.setMatrixAt(i, m);
      // The glow sits on the wall just under the bulb, washing down over its letter.
      m.compose(new THREE.Vector3(s.bulbX, top - STRING.bulbDrop - 0.06, 0.012), new THREE.Quaternion(), one);
      glows.current?.setMatrixAt(i, m);
      sockets.current?.setColorAt(i, new THREE.Color("#1f3a24"));
    });
    for (const mesh of [bulbs.current, sockets.current, glows.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [spots]);

  const levels = useMemo(() => new Float32Array(26), []);
  const c = useMemo(() => new THREE.Color(), []);
  const clock = useRef(0);
  useFrame((_, dt) => {
    clock.current = (clock.current + Math.min(dt, 0.1)) % PLAN_LENGTH;
    const t = clock.current;
    bulbLevels(plan, t, levels);
    let sum = 0;
    for (let i = 0; i < spots.length; i++) {
      const v = levels[i];
      sum += v;
      // Unlit glass still shows its colour, just dull.
      c.copy(base[i]).multiplyScalar(0.16 + 1.15 * v);
      bulbs.current?.setColorAt(i, c);
      c.copy(base[i]).multiplyScalar(v * (0.35 + 0.9 * v));
      glows.current?.setColorAt(i, c);
    }
    if (bulbs.current?.instanceColor) bulbs.current.instanceColor.needsUpdate = true;
    if (glows.current?.instanceColor) glows.current.instanceColor.needsUpdate = true;
    if (spill.current) spill.current.intensity = 0.9 * (sum / spots.length);

    // While a message is spelt, the lit letter throws its colour on the wall.
    const s = spellingAt(plan, t);
    let lit = -1;
    let best = 0.2;
    if (s) {
      for (let i = 0; i < 26; i++) {
        if (levels[i] > best) {
          best = levels[i];
          lit = i;
        }
      }
    }
    if (spot.current) {
      if (lit >= 0) {
        spot.current.position.set(spots[lit].x, (spots[lit].y + spots[lit].bulbY) / 2, 0.3);
        spot.current.color.copy(base[lit]);
        spot.current.intensity = 1.6 * best;
      } else spot.current.intensity = 0;
    }
  });

  return (
    // On the right wall, facing into the room (-x). Local +x runs towards
    // the front of the room, local +z out from the wall.
    <group position={[ROOM.halfWidth - 0.01, y, z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={letters}
          transparent
          depthWrite={false}
          roughness={0.85}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      {wires.map((g, r) => (
        <mesh key={r} geometry={g}>
          <meshStandardMaterial color="#2a4a2f" roughness={0.6} />
        </mesh>
      ))}
      <instancedMesh ref={sockets} args={[socketGeom, undefined, spots.length]}>
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[bulbGeom, undefined, spots.length]}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glows} args={[glowGeom, undefined, spots.length]} renderOrder={2}>
        <meshBasicMaterial
          map={glowTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
      {/* the string's glow on the wall, and the lit letter's colour */}
      <pointLight ref={spill} position={[0, 0.2, 0.7]} intensity={0.6} distance={3.2} color="#ffd9b0" />
      <pointLight ref={spot} position={[0, 0, 0.35]} intensity={0} distance={1.4} decay={2} />
    </group>
  );
}
