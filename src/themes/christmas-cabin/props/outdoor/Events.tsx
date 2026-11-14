"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";
import type { DayPhase } from "@/lib/day-cycle";
import {
  bird,
  eventAt,
  scheduleEvents,
  shootingStar,
  sleigh,
  snowball,
  type ScheduledEvent,
} from "../../lib/events";
import { GLASS_Z, onGlass } from "../../lib/outdoor";
import { makeOutdoorMaterial, type OutdoorUniforms } from "./material";

/** The cardinal is drawn a little larger than life, to read across the room. */
const BIRD_SCALE = 1.6;

/** How long a schedule to plan ahead: well past any visit. */
const PLAN_SECONDS = 6 * 3600;

/**
 * The little things that happen outside, at random (BB-35): a snowball
 * splatting on the glass, a cardinal landing on the sill, Santa's sleigh
 * crossing the sky, a shooting star. The schedule is planned once per
 * visit from a random seed (so it's different every time) for the part
 * of the day it is; each event's motion comes from `lib/events.ts`.
 */
export function Events({ phase, shared }: { phase: DayPhase; shared: OutdoorUniforms }) {
  const schedule = useMemo<ScheduledEvent[]>(
    () => scheduleEvents(phase, Math.floor(Math.random() * 1e9), PLAN_SECONDS),
    [phase]
  );
  const started = useRef<number | null>(null);
  // The event under way this frame; the effects below read it in their
  // own frame loops (a frame behind, which can't be seen).
  const current = useRef<Current>(null);
  const cardinal = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Object3D | null)[]>([]);
  const head = useRef<THREE.Object3D>(null);
  const santa = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (started.current === null) started.current = clock.elapsedTime;
    const t = clock.elapsedTime - started.current;
    const now = eventAt(schedule, t);
    const kind = now?.event.kind;
    current.current = now ? { kind: now.event.kind, p: now.p, seed: now.event.seed } : null;

    const c = cardinal.current;
    if (c) {
      c.visible = kind === "bird";
      if (kind === "bird") {
        const b = bird(now!.p, now!.event.seed);
        c.position.set(b.pos.x, b.pos.y, b.pos.z);
        c.scale.set(b.facing * BIRD_SCALE, BIRD_SCALE, BIRD_SCALE);
        wings.current.forEach((w, i) => w && (w.rotation.x = (i ? 1 : -1) * b.wings * 1.1));
        if (head.current) head.current.rotation.z = b.peck * 0.4;
      }
    }

    const s = santa.current;
    if (s) {
      s.visible = kind === "sleigh";
      if (kind === "sleigh") {
        const p = sleigh(now!.p, now!.event.seed);
        s.position.set(p.pos.x, p.pos.y, p.pos.z);
        s.scale.set(p.dir, 1, 1);
        s.rotation.z = p.bank;
      }
    }
  });

  return (
    <group>
      <SnowballFx current={current} shared={shared} />
      <Cardinal ref={cardinal} wings={wings} head={head} shared={shared} />
      <Sleigh ref={santa} phase={phase} />
      <ShootingStarFx current={current} />
    </group>
  );
}

/** What's happening this frame, shared with the effects. */
type Current = { kind: string; p: number; seed: number } | null;

// ---- snowball ---------------------------------------------------------------

/**
 * A clump of snow, splattered: a dense middle, ragged lobes, flecks and
 * drips. Seen from inside it's backlit by the day, so its thick middle
 * is shadowed grey-blue and its thin edges glow pale — that's what lets
 * it read against a white snowy view. The room's own light then warms it.
 */
function makeSplatTexture(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const r = mulberry32(99);
  const blob = (x: number, y: number, rad: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    // Thick (shadowed) in the middle, thin (bright) towards the edge.
    g.addColorStop(0, `rgba(118,128,150,${a})`);
    g.addColorStop(0.6, `rgba(178,188,206,${a})`);
    g.addColorStop(0.85, `rgba(240,244,252,${a * 0.9})`);
    g.addColorStop(1, "rgba(250,252,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(s / 2, s / 2, s * 0.3, 1);
  blob(s / 2 + s * 0.04, s / 2 - s * 0.03, s * 0.22, 1);
  // Lobes thrown outward, and streaks where it smeared.
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    const d = s * (0.16 + r() * 0.16);
    blob(s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, s * (0.07 + r() * 0.08), 1);
  }
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2;
    const d = s * (0.28 + r() * 0.2);
    blob(s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, 2 + r() * 5, 0.9);
  }
  // A few drips running down.
  for (let i = 0; i < 4; i++) {
    const x = s / 2 + (r() - 0.5) * s * 0.3;
    ctx.fillStyle = "rgba(205,212,226,0.85)";
    ctx.fillRect(x - 3, s / 2, 6, s * (0.2 + r() * 0.15));
    blob(x, s / 2 + s * 0.36, 6, 0.85);
  }
  return new THREE.CanvasTexture(c);
}

const BURST = 14;

function SnowballFx({ shared, current }: { shared: OutdoorUniforms; current: React.RefObject<Current> }) {
  // A touch cool, so it shows against the white snow as it flies in.
  const ballMat = useMemo(() => makeOutdoorMaterial(shared, { color: "#9fadc4" }), [shared]);
  const splatTex = useMemo(makeSplatTexture, []);
  const splatMat = useMemo(() => {
    splatTex.colorSpace = THREE.SRGBColorSpace;
    // Lit by the room (it's on the glass, facing in), with a little glow
    // of its own so the daylight behind it still comes through.
    return new THREE.MeshStandardMaterial({
      map: splatTex,
      emissiveMap: splatTex,
      emissive: "#ffffff",
      emissiveIntensity: 0.35,
      transparent: true,
      depthWrite: false,
      roughness: 0.9,
    });
  }, [splatTex]);
  const burst = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(BURST * 3), 3));
    return g;
  }, []);
  const burstMat = useMemo(
    () => new THREE.PointsMaterial({ color: "#ffffff", size: 0.035, transparent: true, depthWrite: false, fog: false }),
    []
  );
  useEffect(
    () => () => {
      [ballMat, splatMat, burstMat].forEach((m) => m.dispose());
      splatTex.dispose();
      burst.dispose();
    },
    [ballMat, splatMat, burstMat, splatTex, burst]
  );

  const ball = useRef<THREE.Mesh>(null);
  const splat = useRef<THREE.Mesh>(null);
  const bits = useRef<THREE.Points>(null);

  useFrame(() => {
    const c = current.current;
    const s = c?.kind === "snowball" ? snowball(c.p, c.seed) : null;
    {
      {
        if (ball.current) {
          ball.current.visible = !!s?.ball;
          if (s?.ball) ball.current.position.set(s.ball.x, s.ball.y, s.ball.z);
        }
        if (splat.current) {
          splat.current.visible = !!s?.splat;
          if (s?.splat) {
            const g = onGlass(s.splat.u, s.splat.v);
            splat.current.position.set(g.x, g.y - s.splat.slide, GLASS_Z - 0.004);
            splat.current.scale.setScalar(s.splat.size);
            splatMat.opacity = s.splat.opacity;
          }
        }
        if (bits.current) {
          bits.current.visible = s?.burst != null;
          if (s?.burst != null && s.splat) {
            const g = onGlass(s.splat.u, s.splat.v);
            const pos = burst.attributes.position as THREE.BufferAttribute;
            const q = s.burst;
            for (let i = 0; i < BURST; i++) {
              const a = (i / BURST) * Math.PI * 2;
              const v = 0.35 + ((i * 37) % 10) / 20;
              pos.setXYZ(i, g.x + Math.cos(a) * v * q, g.y + Math.sin(a) * v * q - 0.6 * q * q, GLASS_Z - 0.02 - 0.15 * q);
            }
            pos.needsUpdate = true;
            burstMat.opacity = 1 - q;
          }
        }
      }
    }
  });

  return (
    <group>
      <mesh ref={ball} visible={false} material={ballMat}>
        <sphereGeometry args={[0.1, 16, 12]} />
      </mesh>
      <mesh ref={splat} visible={false} material={splatMat} renderOrder={2}>
        <planeGeometry args={[0.6, 0.6]} />
      </mesh>
      <points ref={bits} visible={false} geometry={burst} material={burstMat} frustumCulled={false} />
    </group>
  );
}

// ---- cardinal ---------------------------------------------------------------

/**
 * A male cardinal, about 20 cm, built facing +x: red body and crest,
 * black mask, orange beak, a long tail, and two wings that open in
 * flight. Lit like the rest of the outdoors.
 */
function Cardinal({
  shared,
  wings,
  head,
  ref,
}: {
  shared: OutdoorUniforms;
  wings: React.RefObject<(THREE.Object3D | null)[]>;
  head: React.RefObject<THREE.Object3D | null>;
  ref: React.Ref<THREE.Group>;
}) {
  const m = useMemo(
    () => ({
      red: makeOutdoorMaterial(shared, { color: "#c4161c" }),
      dark: makeOutdoorMaterial(shared, { color: "#8e1016" }),
      mask: makeOutdoorMaterial(shared, { color: "#141012" }),
      beak: makeOutdoorMaterial(shared, { color: "#f08a2a" }),
    }),
    [shared]
  );
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return (
    <group ref={ref} visible={false}>
      {/* body, plump and tilted up at the front */}
      <mesh position={[0, 0.07, 0]} rotation={[0, 0, 0.35]} scale={[1.25, 0.85, 0.8]} material={m.red}>
        <sphereGeometry args={[0.055, 14, 10]} />
      </mesh>
      {/* tail */}
      <mesh position={[-0.085, 0.065, 0]} rotation={[0, 0, -0.35]} material={m.dark}>
        <boxGeometry args={[0.09, 0.012, 0.035]} />
      </mesh>
      {/* head, crest, mask and beak */}
      <group ref={head} position={[0.05, 0.115, 0]}>
        <mesh material={m.red}>
          <sphereGeometry args={[0.034, 12, 10]} />
        </mesh>
        <mesh position={[-0.008, 0.035, 0]} rotation={[0, 0, 0.4]} material={m.red}>
          <coneGeometry args={[0.016, 0.045, 8]} />
        </mesh>
        <mesh position={[0.022, -0.004, 0]} scale={[0.6, 0.8, 1.05]} material={m.mask}>
          <sphereGeometry args={[0.026, 10, 8]} />
        </mesh>
        <mesh position={[0.042, -0.004, 0]} rotation={[0, 0, -Math.PI / 2]} material={m.beak}>
          <coneGeometry args={[0.012, 0.028, 8]} />
        </mesh>
      </group>
      {/* wings: pivot at the shoulder, open about the body's long axis */}
      {[-1, 1].map((s, i) => (
        <group key={s} ref={(w) => void (wings.current[i] = w)} position={[0, 0.085, s * 0.04]}>
          <mesh position={[-0.01, 0, s * 0.035]} scale={[1.1, 0.18, 0.75]} material={m.dark}>
            <sphereGeometry args={[0.05, 10, 6]} />
          </mesh>
        </group>
      ))}
      {/* legs */}
      {[-0.012, 0.012].map((lz) => (
        <mesh key={lz} position={[0.005, 0.012, lz]} material={m.mask}>
          <cylinderGeometry args={[0.003, 0.003, 0.024, 4]} />
        </mesh>
      ))}
    </group>
  );
}

// ---- Santa's sleigh -------------------------------------------------------

/**
 * Santa's sleigh and reindeer, built facing +x: a silhouette against the
 * evening or night sky, with Rudolph's nose glowing at the front and a
 * faint sparkle trail. About 7 m long, so it reads at 55 m.
 */
function Sleigh({ phase, ref }: { phase: DayPhase; ref: React.Ref<THREE.Group> }) {
  const sil = useMemo(
    () => new THREE.MeshBasicMaterial({ color: phase === "night" ? "#0b0e1c" : "#2a1d2e", fog: false }),
    [phase]
  );
  const nose = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff3b2e", toneMapped: false, fog: false }), []);
  useEffect(
    () => () => {
      sil.dispose();
      nose.dispose();
    },
    [sil, nose]
  );
  const deer = [1.6, 2.9, 4.2, 5.5];
  return (
    <group ref={ref} visible={false}>
      {/* sleigh: a curled body on runners, Santa and his sack */}
      <mesh position={[0, 0.25, 0]} material={sil}>
        <boxGeometry args={[1.3, 0.55, 0.6]} />
      </mesh>
      <mesh position={[-0.55, 0.62, 0]} material={sil}>
        <boxGeometry args={[0.3, 0.5, 0.6]} />
      </mesh>
      <mesh position={[0.05, -0.12, 0]} material={sil}>
        <boxGeometry args={[1.7, 0.07, 0.5]} />
      </mesh>
      <mesh position={[0.82, 0.0, 0]} rotation={[0, 0, 0.9]} material={sil}>
        <torusGeometry args={[0.16, 0.035, 6, 12, Math.PI * 1.2]} />
      </mesh>
      <mesh position={[0.1, 0.75, 0]} material={sil}>
        <sphereGeometry args={[0.28, 12, 10]} />
      </mesh>
      <mesh position={[0.18, 1.08, 0]} material={sil}>
        <sphereGeometry args={[0.15, 10, 8]} />
      </mesh>
      <mesh position={[0.12, 1.28, 0]} rotation={[0, 0, -0.5]} material={sil}>
        <coneGeometry args={[0.12, 0.3, 8]} />
      </mesh>
      <mesh position={[-0.4, 0.75, 0]} material={sil}>
        <sphereGeometry args={[0.3, 10, 8]} />
      </mesh>
      {/* the reins */}
      <mesh position={[3.2, 0.42, 0]} rotation={[0, 0, Math.PI / 2 - 0.04]} material={sil}>
        <cylinderGeometry args={[0.012, 0.012, 4.8, 4]} />
      </mesh>
      {/* reindeer in a line, legs mid-gallop */}
      {deer.map((dx, i) => (
        <group key={dx} position={[dx, 0.35 + (i % 2) * 0.08, 0]}>
          <mesh material={sil}>
            <boxGeometry args={[0.7, 0.26, 0.24]} />
          </mesh>
          <mesh position={[0.4, 0.22, 0]} rotation={[0, 0, -0.6]} material={sil}>
            <boxGeometry args={[0.1, 0.32, 0.12]} />
          </mesh>
          <mesh position={[0.52, 0.38, 0]} material={sil}>
            <boxGeometry args={[0.2, 0.1, 0.1]} />
          </mesh>
          {/* antlers */}
          <mesh position={[0.46, 0.52, 0]} rotation={[0, 0, 0.4]} material={sil}>
            <boxGeometry args={[0.02, 0.2, 0.02]} />
          </mesh>
          <mesh position={[0.4, 0.5, 0]} rotation={[0, 0, -0.5]} material={sil}>
            <boxGeometry args={[0.02, 0.16, 0.02]} />
          </mesh>
          {/* legs, front reaching forward, back kicking out */}
          {[
            [0.24, -0.6],
            [0.18, -0.2],
            [-0.24, 0.6],
            [-0.3, 0.25],
          ].map(([lx, rot], k) => (
            <mesh key={k} position={[lx, -0.24, 0]} rotation={[0, 0, rot]} material={sil}>
              <boxGeometry args={[0.04, 0.32, 0.04]} />
            </mesh>
          ))}
          {i === deer.length - 1 && (
            <mesh position={[0.64, 0.38, 0]} material={nose}>
              <sphereGeometry args={[0.07, 8, 6]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ---- shooting star ----------------------------------------------------------

const STAR_TRAIL = 24;

/**
 * A bright head and a fading trail: a run of glowing points from the head
 * back to the tail, each fainter than the one before, drawn additively so
 * they melt into one streak.
 */
function ShootingStarFx({ current }: { current: React.RefObject<Current> }) {
  const dot = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }, []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(STAR_TRAIL * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(STAR_TRAIL * 3), 3));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.9,
        map: dot,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        toneMapped: false,
      }),
    [dot]
  );
  useEffect(() => () => dot.dispose(), [dot]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );
  const line = useMemo(() => {
    const l = new THREE.Points(geometry, material);
    l.visible = false;
    l.frustumCulled = false;
    return l;
  }, [geometry, material]);
  useFrame(() => {
    const c = current.current;
    const s = c?.kind === "shootingStar" ? shootingStar(c.p, c.seed) : null;
    line.visible = !!s;
    if (!s) return;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < STAR_TRAIL; i++) {
      const k = i / (STAR_TRAIL - 1);
      pos.setXYZ(
        i,
        s.head.x + (s.tail.x - s.head.x) * k,
        s.head.y + (s.tail.y - s.head.y) * k,
        s.head.z + (s.tail.z - s.head.z) * k
      );
      const v = s.glow * (1 - k) ** 1.6;
      col.setXYZ(i, v, v * 0.95, v * 0.85);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });
  return <primitive object={line} />;
}
