/**
 * Dev-only: screenshot a prop from the /dev/model harness at several
 * angles, so a model can be iterated on without hunting for it in the
 * scene. Requires `npm run dev` to be running.
 *
 *   node scripts/shoot-model.mjs pumpkin out/ 0,45,90
 *   node scripts/shoot-model.mjs house out/ 0,35 0 22 4
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const [
  model = "pumpkin",
  outDir = "shots",
  angles = "0,40,90",
  variant = "0",
  // Big props (the house) need the camera pulled back and raised.
  dist = "",
  eye = "",
  // Slides the prop, to frame a detail on something big.
  ox = "",
  oy = "",
  // Height the camera aims at — for anything standing on the ground,
  // use this rather than `oy`, which slides the prop through the floor.
  ty = "",
] = process.argv.slice(2);
const extra =
  `${dist ? `&d=${dist}` : ""}${eye ? `&y=${eye}` : ""}` +
  `${ox ? `&ox=${ox}` : ""}${oy ? `&oy=${oy}` : ""}${ty ? `&ty=${ty}` : ""}`;
const base = process.env.HARNESS_URL ?? "http://localhost:3000";
const exe = process.env.CHROME_PATH; // set when the bundled build is missing

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 560, height: 560 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`ERR ${e}`));

for (const a of angles.split(",")) {
  const url = `${base}/dev/model?m=${model}&a=${a}&v=${variant}${extra}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page
    .waitForSelector("canvas[data-ready='1']", { timeout: 20000 })
    .catch(() => problems.push(`ERR ${model}@${a} never rendered`));
  // give the first frames time to land
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/${model}-${a}.png` });
}

console.log(problems.length ? problems.join("\n") : `ok -> ${outDir}`);
await browser.close();
