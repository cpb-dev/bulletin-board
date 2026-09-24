/**
 * Compile the standalone memory viewer.
 *
 * Exports carry their own copy of the board, so the viewer has to be one
 * self-contained classic script with no imports, no module graph and no
 * network: a page opened from `file://` cannot load an ES module, cannot
 * `fetch()` the file next to it, and cannot even use a neighbouring JPEG
 * as a WebGL texture. Everything it needs is inlined into `index.html`
 * at export time.
 *
 * The one substitution is `@/lib/supabase/client`, aliased to a stub
 * that resolves photos out of the export's own inlined data. That alias
 * is what lets the export reuse the app's real 3D components unchanged,
 * so an exported memory renders identically to the live board.
 *
 * Output: public/export/viewer.js (git-ignored; built by predev/prebuild).
 */

import { build } from "esbuild";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outfile = path.join(root, "public/export/viewer.js");

await mkdir(path.dirname(outfile), { recursive: true });

await build({
  entryPoints: [path.join(root, "src/viewer/main.tsx")],
  outfile,
  bundle: true,
  minify: true,
  // A classic script: file:// refuses type="module".
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  legalComments: "none",
  logLevel: "warning",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_APP_NAME": '"Our Little Board"',
  },
  alias: {
    // The export has no Supabase, no session and no network.
    "@/lib/supabase/client": path.join(root, "src/viewer/supabase-stub.ts"),
  },
});

const { size } = await stat(outfile);
console.log(
  `viewer.js  ${(size / 1024).toFixed(0)} kB  ->  public/export/viewer.js`
);
