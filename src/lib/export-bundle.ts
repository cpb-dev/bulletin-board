/**
 * Building a keepsake export: the folder layout, the file names, and the
 * self-contained HTML that renders a saved board offline.
 *
 * Everything here is pure — it takes bytes and returns bytes — so the
 * whole bundle can be asserted in unit tests without a browser, a
 * network or a renderer.
 *
 * ## Why the photos appear twice
 *
 * `photos/` holds the real JPEGs: that is the actual backup, openable in
 * any photo viewer, and the reason this ticket exists (item rows alone
 * were never a true second copy).
 *
 * `index.html` embeds the same photos again as data URIs, because a page
 * opened from `file://` may not use a neighbouring file as a WebGL
 * texture — Chrome treats every local file as its own origin and
 * `texImage2D` throws `SecurityError`. `fetch()` of a local file is
 * blocked for the same reason. So a viewer that works by double-clicking
 * has to carry its own copy of everything it draws.
 */

import { getTheme } from "@/themes";
import { secondaryThemeOf } from "./theme-view";
import type { Board, BoardExport, BoardItem, Profile } from "./types";
import type { ZipEntry } from "./zip";

/** A photo pulled out of storage, ready to be written into the export. */
export interface ExportPhoto {
  /** Supabase storage path, e.g. "<board-id>/<uuid>.jpg". */
  path: string;
  bytes: Uint8Array;
}

/** Where a photo ended up in the export folder. */
export interface PhotoManifestEntry {
  /** The storage path it had in the app. */
  path: string;
  /** Its place in the export folder, e.g. "photos/01-first-snow.jpg". */
  file: string;
}

export interface ExportInput {
  board: Board;
  items: BoardItem[];
  /** Display names, so notes keep their "posted by" stamp offline. */
  profiles: Record<string, Profile>;
  photos: ExportPhoto[];
  /** The compiled standalone viewer, inlined into index.html. */
  viewerScript: string;
  appName: string;
  /** Stamped into the export and used for the ZIP entry dates. */
  now?: Date;
}

export interface ExportBundle {
  /** The single top-level folder every entry sits inside. */
  folder: string;
  /** Suggested download name for the archive. */
  fileName: string;
  entries: ZipEntry[];
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Base64 without `btoa`, which only speaks latin-1 and is awkward to
 * feed raw bytes. Pure, so the data URIs are testable.
 */
export function toBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      BASE64_ALPHABET[(n >> 18) & 63] +
      BASE64_ALPHABET[(n >> 12) & 63] +
      BASE64_ALPHABET[(n >> 6) & 63] +
      BASE64_ALPHABET[n & 63];
  }
  const left = bytes.length - i;
  if (left === 1) {
    const n = bytes[i] << 16;
    out +=
      BASE64_ALPHABET[(n >> 18) & 63] + BASE64_ALPHABET[(n >> 12) & 63] + "==";
  } else if (left === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out +=
      BASE64_ALPHABET[(n >> 18) & 63] +
      BASE64_ALPHABET[(n >> 12) & 63] +
      BASE64_ALPHABET[(n >> 6) & 63] +
      "=";
  }
  return out;
}

/**
 * A file name that survives Windows, macOS and iOS Files alike: no
 * separators, no reserved punctuation, no trailing dots or spaces.
 */
export function safeFileName(raw: string, fallback = "board"): string {
  const cleaned = raw
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .replace(/[. ]+$/, "");
  return cleaned || fallback;
}

/** "first snow ❄" -> "first-snow", for a readable photo file name. */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/** The folder everything sits in, e.g. "Summer holiday 2026 (memory)". */
export function exportFolderName(board: Board): string {
  return `${safeFileName(board.title)} (memory)`;
}

/**
 * Name each photo after the item that carries it, so the folder reads
 * like a photo album rather than a pile of UUIDs. Numbered by board
 * order, which keeps names unique even when two captions match.
 */
export function photoManifest(
  items: BoardItem[],
  photos: ExportPhoto[]
): PhotoManifestEntry[] {
  const have = new Set(photos.map((p) => p.path));
  const manifest: PhotoManifestEntry[] = [];
  let n = 0;
  for (const item of items) {
    if (!item.photo_path || !have.has(item.photo_path)) continue;
    n += 1;
    const number = String(n).padStart(2, "0");
    const slug = slugify(item.content);
    manifest.push({
      path: item.photo_path,
      file: `photos/${number}${slug ? `-${slug}` : ""}.jpg`,
    });
  }
  return manifest;
}

/** One offline page in the export: which file, and which theme it shows. */
export interface ViewerPage {
  /** File name at the top of the export folder. */
  file: string;
  /** Theme id this page renders the board in. */
  theme: string;
  /** The page showing the board in its other theme, if it has one. */
  alternate?: { file: string; name: string; emoji: string };
}

/**
 * The offline pages to write. Every board gets `index.html` in its main
 * theme; a board with a second theme (BB-3) also gets a page in that one,
 * named after it, and each page links to the other. Two whole pages rather
 * than one with a switch because each has to carry its own copy of
 * everything it draws (see the note at the top of this file), and a
 * double-clicked file can't be told which theme to open in.
 */
export function viewerPages(board: Board): ViewerPage[] {
  const secondary = secondaryThemeOf(board);
  if (!secondary) return [{ file: "index.html", theme: board.theme }];
  const main = getTheme(board.theme);
  const second = getTheme(secondary);
  const secondFile = `index - ${safeFileName(second.name, "second theme")}.html`;
  return [
    {
      file: "index.html",
      theme: board.theme,
      alternate: { file: secondFile, name: second.name, emoji: second.emoji },
    },
    {
      file: secondFile,
      theme: secondary,
      alternate: { file: "index.html", name: main.name, emoji: main.emoji },
    },
  ];
}

/**
 * JSON safe to drop inside a `<script>` block: `</script>` anywhere in a
 * note would otherwise end the block early, and U+2028/9 are newlines to
 * a JS parser but not to JSON.
 */
export function inlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The offline board: one page carrying its own data, its own photos and
 * the compiled viewer. The 3D itself is the app's own components, so a
 * memory looks exactly as it did in the app.
 */
export function buildViewerHtml(
  input: ExportInput,
  page: ViewerPage = { file: "index.html", theme: input.board.theme }
): string {
  const manifest = photoManifest(input.items, input.photos);
  const byPath = new Map(input.photos.map((p) => [p.path, p]));
  const photoData: Record<string, string> = {};
  for (const entry of manifest) {
    const photo = byPath.get(entry.path);
    if (photo) {
      photoData[entry.path] = `data:image/jpeg;base64,${toBase64(photo.bytes)}`;
    }
  }

  const memory = {
    app: input.appName,
    exported_at: (input.now ?? new Date()).toISOString(),
    board: input.board,
    items: input.items,
    profiles: input.profiles,
    photos: photoData,
    theme: page.theme,
    ...(page.alternate && { alternate: page.alternate }),
  };

  const title = escapeHtml(`${input.board.title} · a memory`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Quicksand:wght@400;700&display=swap" rel="stylesheet">
<style>
${VIEWER_CSS}
</style>
</head>
<body>
<div id="root"></div>
<noscript>
  <p class="viewer-fallback">This memory is a little 3D room, so it needs JavaScript.
  Everything it shows is also in <code>board.json</code> and the <code>photos</code> folder beside this file.</p>
</noscript>
<script>window.__MEMORY__ = ${inlineJson(memory)};</script>
<script>
${input.viewerScript}
</script>
</body>
</html>
`;
}

/**
 * The handwriting and UI fonts come from Google Fonts when there's a
 * connection and fall back to system faces when there isn't; the 3D
 * scene itself never needs the network.
 */
const VIEWER_CSS = `:root {
  --font-ui: "Quicksand";
  --font-hand: "Patrick Hand";
  --ui-bg: #2e2017;
  --ui-panel: #473526;
  --ui-accent: #e8a04c;
  --ui-text: #ffeed8;
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; overscroll-behavior: none; }
body {
  background: var(--ui-bg);
  color: var(--ui-text);
  font-family: var(--font-ui), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  touch-action: manipulation;
}
#root { position: fixed; inset: 0; overflow: hidden; }
canvas { display: block; touch-action: none; }
.viewer-hint {
  position: absolute; inset-inline: 0; bottom: 1.5rem;
  text-align: center; font-size: 0.875rem; opacity: 0.8;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5); pointer-events: none;
}
.viewer-title {
  position: absolute; top: 1rem; left: 1rem; right: 1rem;
  display: flex; align-items: center; gap: 0.6rem;
  pointer-events: none;
}
.viewer-chip {
  background: var(--ui-panel); color: var(--ui-text);
  border-radius: 999px; padding: 0.5rem 1rem;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  font-weight: 700; font-size: 0.95rem;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.viewer-chip small { display: block; font-weight: 400; opacity: 0.7; font-size: 0.72rem; }
.viewer-switch {
  pointer-events: auto; flex-shrink: 0; margin-left: auto;
  display: grid; place-items: center; text-decoration: none;
}
.viewer-zoom {
  position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 0.5rem;
}
.viewer-button {
  border: none; border-radius: 999px; cursor: pointer;
  font-family: inherit; font-weight: 700;
  background: var(--ui-accent); color: var(--ui-bg);
  box-shadow: 0 3px 0 rgba(0,0,0,0.25);
  transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
  user-select: none; -webkit-user-select: none;
}
.viewer-button:hover { filter: brightness(1.06); transform: translateY(-1px); }
.viewer-button:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,0.25); }
.viewer-button.ghost { background: color-mix(in srgb, var(--ui-panel) 82%, white 18%); color: var(--ui-text); }
.viewer-button.round { width: 3rem; height: 3rem; padding: 0; font-size: 1.25rem; }
.viewer-button.round.small { height: 2.5rem; font-size: 0.875rem; }
.viewer-held {
  position: absolute; inset: 0; z-index: 10; pointer-events: none;
}
.viewer-held button {
  pointer-events: auto;
  position: absolute; top: 5rem; left: 50%; transform: translateX(-50%);
  padding: 0.6rem 1.1rem; font-size: 0.95rem;
}
.viewer-fallback { padding: 2rem; font-size: 1rem; line-height: 1.6; }`;

/** The note that explains the folder to whoever opens it in five years. */
export function buildReadme(input: ExportInput, folder: string): string {
  const saved = input.board.archived_at ?? input.board.created_at;
  const photoCount = photoManifest(input.items, input.photos).length;
  const noteCount = input.items.filter((i) => i.kind === "note").length;
  const [main, second] = viewerPages(input.board);
  // A board with a second theme (BB-3) has a page per theme.
  const secondPage = second
    ? `
               This page is the ${getTheme(main.theme).name} theme.

  ${second.file}
               The same board in its second theme, ${getTheme(second.theme).name}.
               Each page has a button to hop across to the other.`
    : "";
  return `${folder}
${"=".repeat(folder.length)}

A keepsake copy of "${input.board.title}", saved from ${input.appName}
on ${(input.now ?? new Date()).toLocaleDateString()}.

  ${noteCount} note${noteCount === 1 ? "" : "s"}, ${photoCount} photo${photoCount === 1 ? "" : "s"}
  board first started ${new Date(input.board.created_at).toLocaleDateString()}
  kept as a memory ${new Date(saved).toLocaleDateString()}

What's in here
--------------

  index.html   Open this. It's the board itself — the same room, the same
               theme, the same notes and photos, read-only. It needs no
               internet and no app; a double-click is enough. (With a
               connection it also picks up the handwriting font.)${secondPage}

  board.json   Everything the board knew: the board's own details and
               every item, with its position, size, tilt and paper. This
               is the machine-readable copy.

  photos/      The original photos, full size, named after their captions
               and numbered in board order. board.json says which file
               belongs to which item.

The photos are in here twice on purpose: once as real .jpg files you can
open, print or copy anywhere, and once tucked inside ${second ? "each .html page" : "index.html"}, because
a page opened straight off your disk isn't allowed to read the files next
to it.

Nothing in this folder talks to the internet or to the app it came from.
It is yours, offline, forever.
`;
}

/** Lay out the whole export folder, ready to be zipped. */
export function buildExportBundle(input: ExportInput): ExportBundle {
  const folder = exportFolderName(input.board);
  const now = input.now ?? new Date();
  const manifest = photoManifest(input.items, input.photos);
  const byPath = new Map(input.photos.map((p) => [p.path, p]));
  const text = new TextEncoder();

  const keepsake: BoardExport = {
    exported_at: now.toISOString(),
    app: input.appName,
    board: input.board,
    items: input.items,
    profiles: input.profiles,
    photos: manifest,
  };

  const entries: ZipEntry[] = [
    ...viewerPages(input.board).map((page) => ({
      path: `${folder}/${page.file}`,
      data: text.encode(buildViewerHtml({ ...input, now }, page)),
    })),
    {
      path: `${folder}/board.json`,
      data: text.encode(JSON.stringify(keepsake, null, 2)),
    },
    {
      path: `${folder}/README.txt`,
      data: text.encode(buildReadme({ ...input, now }, folder)),
    },
  ];

  for (const entry of manifest) {
    const photo = byPath.get(entry.path);
    if (photo) entries.push({ path: `${folder}/${entry.file}`, data: photo.bytes });
  }

  return { folder, fileName: `${folder}.zip`, entries };
}
