# Keepsake exports

A memory can be downloaded as a folder you keep yourself: the board's
data, its photos as real files, and a page that opens the whole board in
3D on your own device — no app, no account, no internet.

The ⬇️ button beside each saved board in the memory box produces a ZIP:

```
Summer holiday 2026 (memory)/
  index.html    the board itself, read-only, offline
  board.json    every row: the board and its items
  photos/       the photos, full size, named after their captions
  README.txt    what all of the above is
```

## Why it exists

Archived boards used to be backed only by a JSON file of item rows.
Those rows carry a `photo_path`, not a photo — the files live in a
private Supabase bucket behind short-lived signed URLs — so the export
described a board rather than preserving one. Deleting a memory would
have been irreversible (BB-4's prune tool depends on this being fixed).

## The three constraints that shaped it

A page opened straight off someone's disk is far more restricted than
one served over HTTP, and all three restrictions bite here:

1. **`fetch()` of a neighbouring file is blocked.** So the board's data
   cannot live in `board.json` as far as the viewer is concerned — it is
   inlined into `index.html` as `window.__MEMORY__`.
2. **A local image may not become a WebGL texture.** Chrome treats every
   `file://` URL as its own origin, so `texImage2D` on an `<img>` loaded
   from `photos/` throws `SecurityError`. The photos are therefore
   *also* inlined, as `data:` URIs.
3. **ES modules will not load.** The viewer is built as one classic
   `<script>`.

That is why the photos appear twice. `photos/` is the backup a person
can actually use; the copies inside `index.html` are what the renderer
is allowed to read. The duplication is deliberate and documented in the
README that ships in the folder.

## How the viewer is built

`src/viewer/` is a second, tiny entry point into the app's own 3D code.
It renders through the real `Board`, `NoteMesh`, `PhotoMesh`, `HeldItem`
and `CameraRig`, and the real theme modules from `@/themes/scenes` —
not a simplified copy — because a keepsake has to look like the board
did. Only the 2D overlay is the viewer's own: the app's HUD is routing,
sign-out, the theme picker and notifications, none of which mean
anything in a folder on a laptop.

`scripts/build-viewer.mjs` bundles it with esbuild into
`public/export/viewer.js` (git-ignored; built by `predev`/`prebuild`, so
`npm run dev` and `npm run build` both produce it). The one substitution
is `@/lib/supabase/client`, aliased to `src/viewer/supabase-stub.ts`,
which resolves photos out of the export's own inlined data and refuses
every write. That alias is what lets the export reuse the app's drawing
code **unchanged** — there is no forked copy of anything visual to drift.

The bundle is ~1.2 MB (three.js, React, R3F and every theme's scene). It is
carried once per exported folder, alongside photos that are usually
larger.

## The archive

`src/lib/zip.ts` writes the ZIP by hand — *stored*, never deflated,
since an export is overwhelmingly JPEG bytes. That keeps it a pure,
synchronous, unit-tested function instead of a dependency on the
`/memories` page, which must stay light (see the theme-isolation skill's
note about that route).

`src/lib/export-bundle.ts` decides the folder layout, the file names and
the contents of `index.html` and `README.txt`, all purely.
`src/lib/export-download.ts` is the only impure part: it fetches the
viewer bundle, calls the data layer and hands the blob to the browser.

## Looking at an export

```bash
npm run build:viewer
npm run export:preview      # writes /tmp/try-export and screenshots it
```

`scripts/dev/try-export.mts` builds a real export, opens `index.html`
from `file://` in headless Chromium and saves `room.png` and
`board.png`, so the offline board can be looked at rather than assumed.
Set `TRY_EXPORT_THEME` to check a particular theme.

## Known gaps

- The handwriting font comes from Google Fonts, so an export opened
  offline falls back to the system cursive face. Everything else — the
  scene, the props, the photos — is generated and needs no network.
- Photo bytes are held in memory while the archive is built, so a very
  large board on an old phone could struggle. Boards here hold a handful
  of photos; if that ever changes, stream into a `FileSystemWritable`
  instead.
