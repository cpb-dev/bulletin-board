import { describe, expect, it } from "vitest";
import { buildZip, crc32, dosDateTime, type ZipEntry } from "../zip";

const text = (s: string) => new TextEncoder().encode(s);

/** Read a little-endian uint from the archive. */
function u32(zip: Uint8Array, at: number): number {
  return new DataView(zip.buffer, zip.byteOffset, zip.byteLength).getUint32(
    at,
    true
  );
}
function u16(zip: Uint8Array, at: number): number {
  return new DataView(zip.buffer, zip.byteOffset, zip.byteLength).getUint16(
    at,
    true
  );
}

/**
 * Walk the end-of-central-directory record back to each file, the way a
 * real unzip does — proving the offsets we wrote actually line up.
 */
function readCentralDirectory(zip: Uint8Array) {
  const eocd = zip.length - 22;
  expect(u32(zip, eocd)).toBe(0x06054b50);
  const count = u16(zip, eocd + 10);
  let at = u32(zip, eocd + 16);
  const files: { path: string; content: string; crc: number }[] = [];
  for (let i = 0; i < count; i++) {
    expect(u32(zip, at)).toBe(0x02014b50);
    const crc = u32(zip, at + 16);
    const size = u32(zip, at + 24);
    const nameLength = u16(zip, at + 28);
    const localOffset = u32(zip, at + 42);
    const path = new TextDecoder().decode(
      zip.subarray(at + 46, at + 46 + nameLength)
    );

    // Follow the pointer into the local header and read the bytes.
    expect(u32(zip, localOffset)).toBe(0x04034b50);
    const localNameLength = u16(zip, localOffset + 26);
    const extraLength = u16(zip, localOffset + 28);
    const start = localOffset + 30 + localNameLength + extraLength;
    files.push({
      path,
      crc,
      content: new TextDecoder().decode(zip.subarray(start, start + size)),
    });
    at += 46 + nameLength;
  }
  return files;
}

describe("crc32", () => {
  it("matches the known checksum for a standard test vector", () => {
    expect(crc32(text("The quick brown fox jumps over the lazy dog"))).toBe(
      0x414fa339
    );
  });

  it("is zero for no bytes at all", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe("dosDateTime", () => {
  it("packs a date into the two DOS fields", () => {
    const { time, date } = dosDateTime(new Date(2026, 5, 13, 14, 30, 44));
    expect(date).toBe(((2026 - 1980) << 9) | (6 << 5) | 13);
    expect(time).toBe((14 << 11) | (30 << 5) | 22);
  });

  it("clamps dates ZIP cannot represent", () => {
    // DOS time starts in 1980; anything older would wrap to nonsense.
    const { date } = dosDateTime(new Date(1971, 0, 1, 0, 0, 0));
    expect(date >> 9).toBe(0);
  });
});

describe("buildZip", () => {
  const entries: ZipEntry[] = [
    { path: "memory/index.html", data: text("<h1>hello</h1>") },
    { path: "memory/photos/01-sunset.jpg", data: new Uint8Array([1, 2, 3, 4]) },
  ];

  it("writes every entry, readable through the central directory", () => {
    const files = readCentralDirectory(buildZip(entries, new Date(2026, 0, 2)));
    expect(files.map((f) => f.path)).toEqual([
      "memory/index.html",
      "memory/photos/01-sunset.jpg",
    ]);
    expect(files[0].content).toBe("<h1>hello</h1>");
  });

  it("records a checksum that matches the stored bytes", () => {
    const files = readCentralDirectory(buildZip(entries, new Date(2026, 0, 2)));
    expect(files[0].crc).toBe(crc32(text("<h1>hello</h1>")));
    expect(files[1].crc).toBe(crc32(new Uint8Array([1, 2, 3, 4])));
  });

  it("flags names as UTF-8 so accents and emoji survive", () => {
    const zip = buildZip(
      [{ path: "mémoire 💝/board.json", data: text("{}") }],
      new Date(2026, 0, 2)
    );
    expect(u16(zip, 6) & 0x0800).toBe(0x0800);
    expect(readCentralDirectory(zip)[0].path).toBe("mémoire 💝/board.json");
  });

  it("is byte-for-byte reproducible for the same input and date", () => {
    const when = new Date(2026, 0, 2, 9, 0, 0);
    expect(buildZip(entries, when)).toEqual(buildZip(entries, when));
  });

  it("copes with an empty archive", () => {
    const zip = buildZip([], new Date(2026, 0, 2));
    expect(zip.length).toBe(22);
    expect(u16(zip, 22 - 22 + 10)).toBe(0);
  });
});
