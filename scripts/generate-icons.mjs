/**
 * Generates the PWA icons without any image dependencies: a tiny PNG
 * encoder + per-pixel drawing of a cork board with a pinned love note.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------- minimal PNG encoder ----------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // scanlines with filter byte 0
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- drawing ----------

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const CORK = hex("#c89d68");
const CORK_DARK = hex("#a98050");
const FRAME = hex("#6e4a2a");
const NOTE = hex("#fff3b8");
const NOTE_SHADOW = hex("#8a6a44");
const PIN = hex("#e2574c");
const PIN_HI = hex("#f59287");
const HEART = hex("#e2574c");

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawIcon(size, { maskable }) {
  const px = Buffer.alloc(size * size * 4);
  const r = rand(7);
  const speckles = Array.from({ length: 140 }, () => [
    r() * size,
    r() * size,
    (0.004 + r() * 0.008) * size,
  ]);

  const cornerR = maskable ? 0 : size * 0.21;
  const frameW = size * (maskable ? 0.1 : 0.055);

  // note placement (rotated square) and pin
  const cx = size / 2;
  const cy = size / 2;
  const noteHalf = size * 0.27;
  const angle = -0.13;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let color = CORK;
      let alpha = 255;

      // rounded-corner alpha mask (non-maskable icons only)
      if (cornerR > 0) {
        const dx = Math.max(cornerR - x, x - (size - 1 - cornerR), 0);
        const dy = Math.max(cornerR - y, y - (size - 1 - cornerR), 0);
        if (Math.hypot(dx, dy) > cornerR) alpha = 0;
      }

      // wooden frame
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edge < frameW) color = FRAME;

      // cork speckles
      if (color === CORK) {
        for (const [sx, sy, sr] of speckles) {
          if (Math.hypot(x - sx, y - sy) < sr) {
            color = CORK_DARK;
            break;
          }
        }
      }

      // sticky note (rotated local coords)
      const lx = (x - cx) * cosA - (y - cy) * sinA;
      const ly = (x - cx) * sinA + (y - cy) * cosA;
      const sOff = size * 0.018;
      if (
        Math.abs(lx - sOff) < noteHalf &&
        Math.abs(ly - sOff) < noteHalf &&
        !(Math.abs(lx) < noteHalf && Math.abs(ly) < noteHalf)
      ) {
        color = NOTE_SHADOW; // drop shadow peeking out
      }
      if (Math.abs(lx) < noteHalf && Math.abs(ly) < noteHalf) {
        color = NOTE;
        // heart on the note
        const hx = lx / (noteHalf * 0.62);
        const hy = -(ly + noteHalf * 0.12) / (noteHalf * 0.62);
        const f =
          Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * Math.pow(hy, 3);
        if (f < 0) color = HEART;
      }

      // pin at the note's top
      const pinX = cx + noteHalf * 0.0 * cosA;
      const pinY = cy - noteHalf * 0.82;
      const pd = Math.hypot(x - pinX, y - pinY);
      if (pd < size * 0.065) {
        color = PIN;
        if (Math.hypot(x - (pinX - size * 0.018), y - (pinY - size * 0.018)) < size * 0.022)
          color = PIN_HI;
      }

      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = alpha;
    }
  }
  return encodePng(size, size, px);
}

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "icon-192.png"), drawIcon(192, { maskable: false }));
writeFileSync(join(outDir, "icon-512.png"), drawIcon(512, { maskable: false }));
writeFileSync(
  join(outDir, "icon-maskable-512.png"),
  drawIcon(512, { maskable: true })
);
writeFileSync(
  join(outDir, "apple-touch-icon.png"),
  drawIcon(180, { maskable: true })
);
console.log("icons written to public/icons/");
