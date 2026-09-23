"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GHOST_PASS_DURATION, ghostPass, nextGhostTime } from "@/lib/haunted";
import { mulberry32 } from "../textures";

/**
 * A ghost drifting behind a window. The figure is drawn to a canvas so
 * it can carry real detail — hollow sockets, a wailing mouth, a ragged
 * hem — and the mesh it sits on is a segmented plane whose lower rows
 * are warped every frame, so the shroud actually billows rather than
 * sliding past as a rigid cut-out.
 */
export function WindowGhost({ w, h, seed }: { w: number; h: number; seed: number }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const geo = useRef<THREE.PlaneGeometry>(null);
  const base = useRef<Float32Array | null>(null);
  const rand = useMemo(() => mulberry32(seed * 104729), [seed]);
  // Stagger the first sighting so they don't all arrive at once.
  const nextAt = useRef(seed * 2.2 + rand() * 6);

  const texture = useMemo(() => makeGhostTexture(seed), [seed]);
  useEffect(() => () => texture.dispose(), [texture]);

  const gw = w * 0.42;
  const gh = h * 0.8;

  useFrame((state) => {
    const g = group.current;
    const m = mat.current;
    const geometry = geo.current;
    if (!g || !m || !geometry) return;
    const t = state.clock.elapsedTime;

    const p = (t - nextAt.current) / GHOST_PASS_DURATION;
    const pose = ghostPass(p);
    if (!pose) {
      g.visible = false;
      // Once the pass is over, book the next one.
      if (p > 1) nextAt.current = nextGhostTime(t, rand);
      return;
    }
    g.visible = true;
    // Scaled so the figure's full width stays inside the pane at both
    // ends of the drift — there's no cheap way to clip to the glass, so
    // it must never wander onto the wall.
    g.position.x = pose.x * w * 0.45;
    g.position.y = pose.bob;
    m.opacity = pose.opacity * 0.9;
    // a slow, uneasy lean as it passes
    g.rotation.z = Math.sin(t * 0.9 + seed) * 0.05;

    const pos = geometry.attributes.position;
    if (!base.current) {
      base.current = Float32Array.from(pos.array as ArrayLike<number>);
    }
    const b = base.current;
    for (let i = 0; i < pos.count; i++) {
      const bx = b[i * 3];
      const by = b[i * 3 + 1];
      // 0 at the head, 1 at the hem — the head barely moves, the
      // shroud below it swings.
      const d = Math.max(0, 0.5 - by / gh);
      const fall = d * d;
      pos.setXYZ(
        i,
        bx + Math.sin(t * 2.4 + by * 9 + seed) * gw * 0.18 * fall,
        by + Math.sin(t * 3.1 + bx * 7 + seed) * gh * 0.04 * fall,
        Math.sin(t * 1.9 + by * 6) * 0.015 * fall
      );
    }
    pos.needsUpdate = true;
  });

  return (
    <group ref={group} position={[0, 0, 0.01]} visible={false}>
      <mesh>
        <planeGeometry ref={geo} args={[gw, gh, 10, 14]} />
        <meshBasicMaterial
          ref={mat}
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Draws one hollow-eyed figure in a shroud: a head, sunken angled
 * sockets, a long wailing mouth and a torn hem. `seed` shifts the
 * features so the five windows aren't haunted by identical twins.
 */
export function makeGhostTexture(seed: number): THREE.CanvasTexture {
  const W = 256;
  const H = 384;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);

  const rand = mulberry32(seed * 7717);
  const lean = (rand() - 0.5) * 14; // a little asymmetry per ghost

  // ---- shroud silhouette ----
  ctx.beginPath();
  ctx.moveTo(66, 112);
  ctx.arc(128, 112, 62, Math.PI, 0, true); // over the top of the head
  ctx.bezierCurveTo(206, 162, 212 + lean, 232, 208, 302);
  // torn hem, right to left
  ctx.quadraticCurveTo(190, 352, 170, 308);
  ctx.quadraticCurveTo(150, 356, 130, 306);
  ctx.quadraticCurveTo(110, 350, 90, 308);
  ctx.quadraticCurveTo(68, 354, 48, 302);
  ctx.bezierCurveTo(44 + lean, 232, 50, 162, 66, 112);
  ctx.closePath();

  const body = ctx.createLinearGradient(0, 40, 0, 356);
  body.addColorStop(0, "rgba(247, 250, 255, 0.97)");
  body.addColorStop(0.55, "rgba(222, 232, 248, 0.86)");
  body.addColorStop(1, "rgba(186, 204, 232, 0.35)"); // wisps away at the hem
  ctx.fillStyle = body;
  ctx.shadowColor = "rgba(226, 238, 255, 0.85)";
  ctx.shadowBlur = 26;
  ctx.fill();
  ctx.shadowBlur = 0;

  // ---- shading, so it reads as a form rather than a flat cut-out ----
  const shade = ctx.createRadialGradient(112, 130, 20, 128, 200, 170);
  shade.addColorStop(0, "rgba(255, 255, 255, 0)");
  shade.addColorStop(1, "rgba(120, 140, 175, 0.35)");
  ctx.fillStyle = shade;
  ctx.fill();

  // ---- sunken sockets, angled inward so it glares ----
  const socket = (cx: number, tilt: number) => {
    ctx.save();
    ctx.translate(cx, 106);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 21, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(18, 16, 28, 0.88)";
    ctx.fill();
    // a faint rim of light at the top of the socket
    ctx.beginPath();
    ctx.ellipse(0, -4, 14, 21, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = "rgba(210, 226, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };
  socket(102, 0.26);
  socket(154, -0.26);

  // ---- open, wailing mouth ----
  ctx.beginPath();
  ctx.ellipse(128, 170, 17, 27, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(14, 12, 22, 0.8)";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(128, 164, 11, 17, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(30, 26, 44, 0.55)";
  ctx.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
