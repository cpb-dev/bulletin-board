"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { groundHeight, scatterLitter } from "../lib/ground";
import { makeToonRamp, mulberry32 } from "@/components/three/textures";
import { AUTUMN_LEAVES, makeLeafTexture } from "./AutumnTree";

/**
 * The ground of Haunted Hollow.
 *
 * It was one flat plane in a single colour, which is fine until the
 * rest of the scene has bark and moss and weathered stone on it — then
 * it is the one surface that gives the whole thing away.
 *
 * Three things fix that. A canvas of wet earth, dead grass and trodden
 * mud, drawn pale so the theme's floor colour still tints it. Large
 * scale variation painted into the vertices, which is what stops a
 * texture tiled twenty times across from reading as wallpaper. And the
 * leaves that have already come down, lying flat where they landed.
 *
 * The plane itself rolls gently beyond the stage — see
 * `src/lib/ground.ts`, which holds it dead flat everywhere the scene
 * actually stands something.
 */

const WIDTH = 80;
const DEPTH = 64;
/** Centred here, matching the plane the scene used before. */
const CENTRE_Z = 1.5;
/** One wrap of the earth texture covers this many metres. */
const TILE = 4.5;

/* ------------------------------------------------------------------ */
/*  Textures                                                           */
/* ------------------------------------------------------------------ */

/**
 * Wet earth with dead grass over it and bare trodden patches.
 *
 * Drawn pale and low-contrast on purpose: this is multiplied by the
 * theme's floor colour, and it tiles seventeen times across the scene,
 * so anything bold in here becomes a repeating pattern.
 */
export function makeEarthTexture(seed = 13): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  ctx.fillStyle = "#f4eede";
  ctx.fillRect(0, 0, S, S);

  /** Draw wrapped on both axes, so the tile joins cleanly. */
  const wrapped = (x: number, y: number, m: number, draw: (x: number, y: number) => void) => {
    const xs = [x, ...(x < m ? [x + S] : []), ...(x > S - m ? [x - S] : [])];
    const ys = [y, ...(y < m ? [y + S] : []), ...(y > S - m ? [y - S] : [])];
    for (const xx of xs) for (const yy of ys) draw(xx, yy);
  };

  // Broad drifts of pale dead grass. A graveyard in late autumn is
  // strawy, not bare earth, and these are most of what lifts the
  // ground out of the mud-brown it sits at otherwise.
  for (let i = 0; i < 22; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 30 + rand() * 90;
    wrapped(x, y, r, (xx, yy) => {
      const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
      const a = 0.16 + rand() * 0.2;
      g.addColorStop(0, `rgba(255, 252, 232, ${a})`);
      g.addColorStop(1, "rgba(255, 252, 232, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }


  // Broad damp patches, the wet ground under the trees.
  for (let i = 0; i < 26; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 24 + rand() * 78;
    wrapped(x, y, r, (xx, yy) => {
      const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
      const a = 0.08 + rand() * 0.12;
      g.addColorStop(0, `rgba(122, 108, 82, ${a})`);
      g.addColorStop(1, "rgba(122, 108, 82, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Bare trodden mud, a little lighter and flatter than the grass.
  for (let i = 0; i < 16; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 14 + rand() * 40;
    wrapped(x, y, r + 6, (xx, yy) => {
      ctx.beginPath();
      for (let a = 0; a <= 14; a++) {
        const ang = (a / 14) * Math.PI * 2;
        const rad = r * (0.6 + rand() * 0.65);
        const px = xx + Math.cos(ang) * rad;
        const py = yy + Math.sin(ang) * rad * 0.8;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(252, 246, 232, ${0.12 + rand() * 0.16})`;
      ctx.fill();
    });
  }

  // Dead grass: short strokes, lying every which way.
  for (let i = 0; i < 3200; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const len = 3 + rand() * 11;
    const ang = rand() * Math.PI * 2;
    const pale = rand() < 0.6;
    wrapped(x, y, len + 2, (xx, yy) => {
      ctx.strokeStyle = pale
        ? `rgba(255, 253, 234, ${0.22 + rand() * 0.34})`
        : `rgba(118, 112, 76, ${0.1 + rand() * 0.2})`;
      ctx.lineWidth = 0.7 + rand() * 1.1;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.quadraticCurveTo(
        xx + Math.cos(ang) * len * 0.6,
        yy + Math.sin(ang) * len * 0.6 - 1.5,
        xx + Math.cos(ang) * len,
        yy + Math.sin(ang) * len
      );
      ctx.stroke();
    });
  }

  // Twigs and small stones.
  for (let i = 0; i < 90; i++) {
    const x = rand() * S;
    const y = rand() * S;
    if (rand() < 0.55) {
      const len = 6 + rand() * 18;
      const ang = rand() * Math.PI * 2;
      wrapped(x, y, len + 2, (xx, yy) => {
        ctx.strokeStyle = `rgba(96, 76, 52, ${0.28 + rand() * 0.3})`;
        ctx.lineWidth = 1 + rand() * 1.4;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx + Math.cos(ang) * len, yy + Math.sin(ang) * len);
        ctx.stroke();
      });
    } else {
      const r = 1.5 + rand() * 3.5;
      wrapped(x, y, r + 2, (xx, yy) => {
        ctx.beginPath();
        ctx.ellipse(xx, yy, r, r * 0.75, rand() * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(214, 210, 200, ${0.22 + rand() * 0.28})`;
        ctx.fill();
      });
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(WIDTH / TILE, DEPTH / TILE);
  // The ground is seen at a grazing angle from a 1.45m eye. Without
  // this every bit of grass and grit blurs into flat mud a few metres
  // out, which is exactly the look this is meant to fix.
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

/**
 * The ground plane, displaced by `groundHeight` and given per-vertex
 * colour.
 *
 * The colour is the important part: a texture tiled this many times
 * across reads as wallpaper however carefully it is drawn, and nothing
 * breaks that up like variation at a scale the tile cannot reach.
 * Darker in the hollows and where the wood is, paler out in the open.
 */
export function makeGroundGeometry(
  segX = 96,
  segZ = 78,
  seed = 77
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(WIDTH, DEPTH, segX, segZ);
  const pos = geo.attributes.position;
  const colour: number[] = [];
  const rand = mulberry32(seed);
  const jitter = Array.from({ length: 6 }, () => rand() * Math.PI * 2);
  const tint = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    // Still a plane in its own XY at this point — z is up until the
    // mesh is rotated flat.
    const x = pos.getX(i);
    const worldZ = -pos.getY(i) + CENTRE_Z;
    pos.setZ(i, groundHeight(x, worldZ));

    const broad =
      Math.sin(x * 0.055 + jitter[0]) * Math.cos(worldZ * 0.048 + jitter[1]) *
        0.5 +
      Math.sin(x * 0.021 - worldZ * 0.026 + jitter[2]) * 0.5;
    // 0.72..1.06 — enough to see, not enough to read as blotches
    const shade = 0.89 + broad * 0.17;
    tint.setRGB(shade, shade * 0.985, shade * 0.95);
    colour.push(tint.r, tint.g, tint.b);
  }

  pos.needsUpdate = true;
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colour, 3));
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/*  The ground                                                         */
/* ------------------------------------------------------------------ */

export function Ground({ color }: { color: string }) {
  const ramp = useMemo(() => makeToonRamp([70, 118, 164, 206, 240, 255]), []);
  /**
   * The theme's floor colour, lifted.
   *
   * It was picked for a plain untextured plane, where being dark was
   * fine because there was nothing on it to see. A map needs headroom:
   * at the theme's own value the grass and grit and litter are all
   * there and all invisible, and the ground reads as wet tarmac. The
   * hue is the theme's; only the level moves.
   */
  const tint = useMemo(
    () => new THREE.Color(color).multiplyScalar(1.55),
    [color]
  );
  const earth = useMemo(() => makeEarthTexture(13), []);
  const geo = useMemo(() => makeGroundGeometry(), []);

  useEffect(
    () => () => {
      ramp.dispose();
      earth.dispose();
      geo.dispose();
    },
    [ramp, earth, geo]
  );

  return (
    <group>
      <mesh
        geometry={geo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, CENTRE_Z]}
        receiveShadow
      >
        <meshToonMaterial
          map={earth}
          color={tint}
          gradientMap={ramp}
          vertexColors
        />
      </mesh>
      <LeafLitter />
    </group>
  );
}

/**
 * The leaves that already came down, lying flat where they landed.
 *
 * Thickest under the trees on the right, thinning towards the board.
 * Lifted a couple of centimetres so they never z-fight with the
 * ground, and kept out of the foot of the board posts.
 */
function LeafLitter() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => makeLeafTexture(), []);

  const litter = useMemo(
    () =>
      scatterLitter(
        404,
        260,
        { x0: -16, x1: 18, z0: -16, z1: 5 },
        [
          // the board's posts, where a leaf half inside a post reads
          // as a bug rather than as litter
          { x: -2.1, z: -1.9, r: 0.55 },
          { x: 2.1, z: -1.9, r: 0.55 },
        ]
      ),
    []
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    litter.forEach((l, i) => {
      dummy.position.set(l.x, 0.018 + (i % 5) * 0.004, l.z);
      // flat on the ground, turned any which way, and tipped a little
      // so they are not all perfectly pressed down
      dummy.rotation.set(-Math.PI / 2 + (l.shade - 0.5) * 0.25, l.rot, 0);
      dummy.scale.setScalar(0.2 * l.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tint.set(
        AUTUMN_LEAVES[Math.floor(l.shade * AUTUMN_LEAVES.length) % AUTUMN_LEAVES.length]
      );
      // the ones on the ground have been there a while
      tint.multiplyScalar(0.72 + l.shade * 0.2);
      m.setColorAt(i, tint);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [litter]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, litter.length]}
      receiveShadow
    >
      <planeGeometry args={[1, 1]} />
      <meshToonMaterial
        map={texture}
        transparent
        alphaTest={0.35}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
