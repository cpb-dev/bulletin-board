import * as THREE from "three";
import { mulberry32 } from "@/components/three/textures";

/**
 * Canvas textures for the fireplace (BB-35): stone, sooty firebrick,
 * bark and charred log ends, knitted stockings and their fur cuffs, and
 * the soft puffs and sparks of the fire. Drawn in code, no image files.
 */

function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function tex(c: HTMLCanvasElement, srgb = true, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/**
 * Stone surface: pale speckle, pits and a few lichen-like stains, drawn
 * light so each stone's own colour does the colouring. Returns a matching
 * bump map so pits and grain catch the firelight.
 */
export function makeStoneTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const s = 256;
  const color = canvas(s);
  const bump = canvas(s);
  const rand = mulberry32(71);
  color.ctx.fillStyle = "#ece6dc";
  color.ctx.fillRect(0, 0, s, s);
  bump.ctx.fillStyle = "#808080";
  bump.ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    const x = rand() * s;
    const y = rand() * s;
    const r = 0.6 + rand() * 2.2;
    const v = Math.floor(170 + rand() * 85);
    color.ctx.fillStyle = `rgba(${v},${v - 6},${v - 14},${0.25 + rand() * 0.35})`;
    color.ctx.beginPath();
    color.ctx.arc(x, y, r, 0, Math.PI * 2);
    color.ctx.fill();
    const b = Math.floor(90 + rand() * 120);
    bump.ctx.fillStyle = `rgba(${b},${b},${b},0.5)`;
    bump.ctx.beginPath();
    bump.ctx.arc(x, y, r, 0, Math.PI * 2);
    bump.ctx.fill();
  }
  // Soft weathering blotches.
  for (let i = 0; i < 26; i++) {
    const x = rand() * s;
    const y = rand() * s;
    const r = 12 + rand() * 40;
    const g = color.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(140,128,110,${0.12 + rand() * 0.12})`);
    g.addColorStop(1, "rgba(140,128,110,0)");
    color.ctx.fillStyle = g;
    color.ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return { map: tex(color.c), bump: tex(bump.c, false) };
}

/**
 * The firebox's lining: firebrick in running bond, blackened with soot
 * that thickens towards the top and the throat. Drawn once for the whole
 * wall (it doesn't repeat), so the soot gradient belongs to the wall.
 */
export function makeFirebrickTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = "#2a1c16";
  ctx.fillRect(0, 0, w, h);
  const rand = mulberry32(13);
  const bw = 64;
  const bh = 26;
  for (let row = 0; row * bh < h; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w + bw; x += bw) {
      const v = 0.75 + rand() * 0.4;
      ctx.fillStyle = `rgb(${Math.floor(120 * v)},${Math.floor(62 * v)},${Math.floor(40 * v)})`;
      ctx.fillRect(x + off + 2, row * bh + 2, bw - 4, bh - 4);
    }
  }
  // Soot: heavy at the top, thinning down the wall, with smoky streaks.
  const soot = ctx.createLinearGradient(0, 0, 0, h);
  soot.addColorStop(0, "rgba(8,6,5,0.97)");
  soot.addColorStop(0.45, "rgba(12,9,7,0.7)");
  soot.addColorStop(1, "rgba(20,14,10,0.25)");
  ctx.fillStyle = soot;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    const x = rand() * w;
    ctx.strokeStyle = `rgba(5,4,3,${0.1 + rand() * 0.2})`;
    ctx.lineWidth = 4 + rand() * 18;
    ctx.beginPath();
    ctx.moveTo(x, h * (0.4 + rand() * 0.5));
    ctx.bezierCurveTo(x + (rand() - 0.5) * 40, h * 0.3, x + (rand() - 0.5) * 60, h * 0.15, x, 0);
    ctx.stroke();
  }
  return tex(c);
}

/** Rough bark, split into ridges along the log. Repeats round the log. */
export function makeBarkTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = "#24170f";
  ctx.fillRect(0, 0, w, h);
  const rand = mulberry32(29);
  for (let i = 0; i < 70; i++) {
    const y = rand() * h;
    const v = 18 + rand() * 30;
    ctx.strokeStyle = `rgb(${v + 22},${v + 10},${v})`;
    ctx.lineWidth = 2 + rand() * 5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3 + (rand() - 0.5) * 3);
    ctx.stroke();
  }
  // Charring on the underside, which faces the fire.
  const char = ctx.createLinearGradient(0, 0, 0, h);
  char.addColorStop(0, "rgba(10,8,7,0.15)");
  char.addColorStop(0.5, "rgba(10,8,7,0.45)");
  char.addColorStop(1, "rgba(10,8,7,0.9)");
  ctx.fillStyle = char;
  ctx.fillRect(0, 0, w, h);
  return tex(c, true, true);
}

/**
 * A split log's end: pale growth rings, blackened at the rim, with a
 * glowing crack of ember where it's burning.
 */
export function makeLogEndTexture(): THREE.CanvasTexture {
  const s = 128;
  const { c, ctx } = canvas(s);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "#c9a26e");
  g.addColorStop(0.75, "#8a6440");
  g.addColorStop(0.9, "#1c120c");
  g.addColorStop(1, "#ff7a26");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "rgba(90,60,35,0.6)";
  for (let r = 6; r < s * 0.36; r += 5) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(s / 2 + 1, s / 2 - 1, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A glowing crack.
  ctx.strokeStyle = "#ff9a3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.5);
  ctx.lineTo(s * 0.62, s * 0.3);
  ctx.lineTo(s * 0.7, s * 0.12);
  ctx.stroke();
  return tex(c);
}

/** A soft round sprite: the shape of a spark, and of a puff of smoke. */
export function makeSoftDotTexture(): THREE.CanvasTexture {
  const s = 64;
  const { c, ctx } = canvas(s);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return tex(c, false);
}

/**
 * A billowy puff of smoke: several soft lobes, each a radial gradient
 * falling to nothing, so it never reads as a heap of discs.
 */
export function makePuffTexture(): THREE.CanvasTexture {
  const s = 128;
  const { c, ctx } = canvas(s);
  const rand = mulberry32(37);
  for (let i = 0; i < 9; i++) {
    const x = s * (0.3 + rand() * 0.4);
    const y = s * (0.3 + rand() * 0.4);
    const r = s * (0.18 + rand() * 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  return tex(c, false);
}

/**
 * A knitted stocking's yarn: stitches as small "V"s in rows, the body in
 * one colour with cream stripes near the top and toe. Drawn pale-ish so
 * the knit shows; the stocking's colour is in the drawing, not a tint.
 */
export function makeStockingKnit(body: string, stripe: string): THREE.CanvasTexture {
  const w = 128;
  const h = 192;
  const { c, ctx } = canvas(w, h);
  const stitchW = 8;
  const stitchH = 7;
  const rows = Math.ceil(h / stitchH);
  for (let r = 0; r < rows; r++) {
    // Stripes in a few bands of rows.
    const inStripe = (r > 4 && r < 7) || (r > 9 && r < 11) || (r > rows - 6 && r < rows - 3);
    const col = inStripe ? stripe : body;
    for (let x = 0; x < w; x += stitchW) {
      const cx = x + stitchW / 2;
      const cy = r * stitchH + stitchH / 2;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, r * stitchH, stitchW, stitchH);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(cx + side * 1.8, cy);
        ctx.rotate(side * 0.5);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.1, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  return tex(c, true, true);
}

/**
 * A fluffy fur cuff with an initial stitched on it.
 */
export function makeCuffTexture(initial: string, thread: string): THREE.CanvasTexture {
  const w = 256;
  const h = 96;
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = "#f3eee6";
  ctx.fillRect(0, 0, w, h);
  const rand = mulberry32(initial.charCodeAt(0));
  for (let i = 0; i < 1800; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI * 2;
    const t = 215 + rand() * 40;
    ctx.strokeStyle = `rgba(${t},${t - 4},${t - 10},0.6)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
    ctx.stroke();
  }
  ctx.fillStyle = thread;
  ctx.font = "bold 64px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, w / 2, h / 2 + 4);
  return tex(c);
}

/**
 * The flames' shader: licking tongues of fire on a plane, from value
 * noise scrolling upward through a teardrop mask, coloured from a white-
 * yellow core through orange to deep red at the tips. Additive, so
 * overlapping flames glow hotter where they cross.
 */
export function makeFlameMaterial(seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uIntensity: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSeed;
      uniform float uIntensity;
      varying vec2 vUv;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int k = 0; k < 4; k++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        float t = uTime * 1.6 + uSeed * 7.0;
        float n = fbm(vec2(uv.x * 3.2 + uSeed, uv.y * 2.4 - t));
        float n2 = fbm(vec2(uv.x * 6.0 - uSeed, uv.y * 4.0 - t * 1.4));
        // Tongues lick sideways more the higher they get.
        float x = (uv.x - 0.5) * 2.0 + (n - 0.5) * 0.9 * uv.y;
        float w = mix(0.85, 0.04, pow(uv.y, 0.75));
        float shape = 1.0 - smoothstep(w * 0.45, w, abs(x));
        // Ragged, flickering tips: the top breaks up with the noise.
        float top = 1.0 - smoothstep(0.35, 0.95, uv.y + (n2 - 0.5) * 0.6);
        float base = smoothstep(0.0, 0.12, uv.y);
        float a = shape * top * base;
        float heat = clamp(a * (1.15 - uv.y) + (n - 0.5) * 0.25, 0.0, 1.0);
        vec3 col = mix(vec3(0.75, 0.12, 0.02), vec3(1.0, 0.45, 0.06), smoothstep(0.15, 0.5, heat));
        col = mix(col, vec3(1.0, 0.85, 0.45), smoothstep(0.55, 0.9, heat));
        gl_FragColor = vec4(col * uIntensity * a, a);
      }
    `,
  });
}
