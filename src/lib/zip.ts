/**
 * A tiny ZIP writer.
 *
 * Exports are built in the browser, from a page that must not grow a
 * dependency just to package a keepsake — so this writes the archive by
 * hand. Entries are *stored*, never deflated: an export is overwhelmingly
 * JPEG bytes, which do not compress, and storing keeps this pure,
 * synchronous and easy to unit-test.
 *
 * Pure functions only. No DOM, no Blob, no streams.
 */

/** One file in the archive. Directories are implied by `path`. */
export interface ZipEntry {
  /** Forward-slash path inside the archive, e.g. "board/photos/1.jpg". */
  path: string;
  data: Uint8Array;
}

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
/** PKZip 2.0: what "stored, with a UTF-8 name" needs. */
const VERSION = 20;
/** General-purpose bit 11 — filenames and comments are UTF-8. */
const UTF8_FLAG = 0x0800;
const METHOD_STORE = 0;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let bit = 0; bit < 8; bit++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (IEEE), the checksum every ZIP entry carries. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * MS-DOS date/time, which is all ZIP has room for: two-second
 * resolution and no year before 1980.
 */
export function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** UTF-8 encode without assuming TextEncoder is the same one everywhere. */
function encodeName(name: string): Uint8Array {
  return new TextEncoder().encode(name);
}

/** A little cursor that writes little-endian fields into a buffer. */
class Writer {
  private view: DataView;
  offset = 0;

  constructor(readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  u16(value: number): void {
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  u32(value: number): void {
    this.view.setUint32(this.offset, value >>> 0, true);
    this.offset += 4;
  }

  raw(value: Uint8Array): void {
    this.bytes.set(value, this.offset);
    this.offset += value.length;
  }
}

/**
 * Build a ZIP archive from `entries`, in the order given.
 *
 * `modified` stamps every entry — passing a fixed date makes the output
 * byte-for-byte reproducible, which is what the tests rely on.
 */
export function buildZip(
  entries: ZipEntry[],
  modified: Date = new Date()
): Uint8Array {
  const stamp = dosDateTime(modified);
  const prepared = entries.map((entry) => {
    const name = encodeName(entry.path);
    return { name, data: entry.data, crc: crc32(entry.data), offset: 0 };
  });

  const localSize = prepared.reduce(
    (total, e) => total + 30 + e.name.length + e.data.length,
    0
  );
  const centralSize = prepared.reduce(
    (total, e) => total + 46 + e.name.length,
    0
  );
  const out = new Writer(new Uint8Array(localSize + centralSize + 22));

  for (const entry of prepared) {
    entry.offset = out.offset;
    out.u32(LOCAL_HEADER_SIG);
    out.u16(VERSION);
    out.u16(UTF8_FLAG);
    out.u16(METHOD_STORE);
    out.u16(stamp.time);
    out.u16(stamp.date);
    out.u32(entry.crc);
    out.u32(entry.data.length); // compressed == uncompressed when stored
    out.u32(entry.data.length);
    out.u16(entry.name.length);
    out.u16(0); // no extra field
    out.raw(entry.name);
    out.raw(entry.data);
  }

  const centralStart = out.offset;
  for (const entry of prepared) {
    out.u32(CENTRAL_HEADER_SIG);
    out.u16(VERSION); // version made by
    out.u16(VERSION); // version needed
    out.u16(UTF8_FLAG);
    out.u16(METHOD_STORE);
    out.u16(stamp.time);
    out.u16(stamp.date);
    out.u32(entry.crc);
    out.u32(entry.data.length);
    out.u32(entry.data.length);
    out.u16(entry.name.length);
    out.u16(0); // extra
    out.u16(0); // comment
    out.u16(0); // disk number
    out.u16(0); // internal attributes
    out.u32(0); // external attributes
    out.u32(entry.offset);
    out.raw(entry.name);
  }

  const centralEnd = out.offset;
  out.u32(EOCD_SIG);
  out.u16(0); // this disk
  out.u16(0); // disk the central directory starts on
  out.u16(prepared.length);
  out.u16(prepared.length);
  out.u32(centralEnd - centralStart);
  out.u32(centralStart);
  out.u16(0); // no archive comment

  return out.bytes;
}
