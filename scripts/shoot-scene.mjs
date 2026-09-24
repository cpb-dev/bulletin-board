/**
 * Dev-only: screenshot a theme's whole scene from the /dev/scene
 * harness. Requires `npm run dev` to be running.
 *
 *   node scripts/shoot-scene.mjs stars-hollow out/ room
 *   node scripts/shoot-scene.mjs stars-hollow out/ sign -3.8,1.6,1.5 -3.8,1.6,-1.5
 *
 * Args: <theme> <outDir> <name> [camera x,y,z] [look-at x,y,z] [WxH] [waitMs]
 * The size defaults to 1280x720; pass 390x844 for a phone.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const [
  theme = "stars-hollow",
  outDir = "shots",
  name = "room",
  cam = "",
  look = "",
  size = "1280x720",
  wait = "1500",
] = process.argv.slice(2);
const [width, height] = size.split("x").map(Number);
const base = process.env.HARNESS_URL ?? "http://localhost:3000";
const exe = process.env.CHROME_PATH;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width, height } });
const problems = [];
page.on("pageerror", (e) => problems.push(`ERR ${e}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console ${m.text()}`));

const url =
  `${base}/dev/scene?t=${theme}` +
  (cam ? `&c=${cam}` : "") +
  (look ? `&l=${look}` : "");
await page.goto(url, { waitUntil: "networkidle" });
await page
  .waitForSelector("canvas[data-ready='1']", { timeout: 60000 })
  .catch(() => problems.push(`ERR ${theme} never rendered`));
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: `${outDir}/${name}.png` });

console.log(problems.length ? [...new Set(problems)].map((p) => p.slice(0, 400)).slice(0, 6).join("\n") : `ok -> ${outDir}/${name}.png`);
await browser.close();
