/**
 * Dev-only: build a real export and open it the way you would at home —
 * straight off the disk, no server. Screenshots what it draws so the
 * offline board can actually be looked at rather than assumed.
 *
 *   npm run build:viewer && npx tsx scripts/dev/try-export.mts
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildExportBundle } from "../../src/lib/export-bundle.ts";
import type { Board, BoardItem } from "../../src/lib/types.ts";

const out = process.env.TRY_EXPORT_DIR ?? "/tmp/try-export";
const theme = process.env.TRY_EXPORT_THEME ?? "beach-hut";

const board: Board = {
  id: "board-1",
  title: "Summer holiday 2026",
  theme,
  status: "archived",
  is_primary: false,
  kind: "standard",
  private_to: null,
  reveal_at: null,
  reveal_message: null,
  revealed_at: null,
  created_by: "u1",
  created_at: "2026-06-01T00:00:00Z",
  archived_at: "2026-09-01T00:00:00Z",
};

function item(over: Partial<BoardItem>): BoardItem {
  return {
    id: "x",
    board_id: "board-1",
    kind: "note",
    content: "",
    photo_path: null,
    paper: "butter",
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    fixture_id: null,
    created_by: "u1",
    created_at: "2026-06-02T00:00:00Z",
    updated_at: "2026-06-02T00:00:00Z",
    ...over,
  };
}

const items: BoardItem[] = [
  item({ id: "1", content: "we should do this again", x: -0.55, y: 0.35, rotation: -0.06 }),
  item({ id: "2", content: "best week ever ♡", x: 0.5, y: 0.3, rotation: 0.08, scale: 1.1 }),
  item({ id: "3", kind: "photo", photo_path: "board-1/a.jpg", content: "First swim", x: -0.1, y: -0.35, rotation: 0.04, scale: 1.3 }),
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

// A stand-in holiday photo, made rather than downloaded.
const shot = await browser.newPage({ viewport: { width: 640, height: 480 } });
await shot.setContent(
  `<body style="margin:0;background:linear-gradient(#7ec8e3,#f7e4b3);height:100vh">
     <div style="position:absolute;bottom:0;width:100%;height:38%;background:#e9d8a6"></div>
     <div style="position:absolute;top:12%;left:14%;width:96px;height:96px;border-radius:50%;background:#ffe9a8"></div>
   </body>`
);
const photoBytes = new Uint8Array(await shot.screenshot({ type: "jpeg", quality: 82 }));
await shot.close();

const bundle = buildExportBundle({
  board,
  items,
  profiles: { u1: { id: "u1", display_name: "Kalli", created_at: "2026-01-01T00:00:00Z" } },
  photos: [{ path: "board-1/a.jpg", bytes: photoBytes }],
  viewerScript: await readFile("public/export/viewer.js", "utf8"),
  appName: "Our Little Board",
});

await rm(out, { recursive: true, force: true });
for (const entry of bundle.entries) {
  const file = path.join(out, entry.path);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, entry.data);
}
console.log(`wrote ${bundle.entries.length} files to ${out}/${bundle.folder}`);

const page = await browser.newPage({ viewport: { width: 1100, height: 750 } });
const problems: string[] = [];
page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

await page.goto(`file://${path.join(out, bundle.folder, "index.html")}`);
await page.waitForTimeout(3500);
await page.screenshot({ path: path.join(out, "room.png") });

// Walk up to the board, the way tapping it does.
await page.evaluate(() => {
  const canvas = document.querySelector("canvas")!;
  const r = canvas.getBoundingClientRect();
  for (const type of ["pointerdown", "pointerup", "click"]) {
    canvas.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        clientX: r.width / 2,
        clientY: r.height * 0.42,
      })
    );
  }
});
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(out, "board.png") });

console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "no console errors");
await browser.close();
