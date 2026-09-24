/**
 * Dev-only: how heavy is a theme's scene? Loads /dev/scene for each
 * theme named and prints draw calls and triangles for one frame of the
 * room view. Requires `npm run dev` to be running.
 *
 *   node scripts/dev/scene-stats.mjs stars-hollow haunted-hollow
 */
import { chromium } from "@playwright/test";

const themes = process.argv.slice(2);
const base = process.env.HARNESS_URL ?? "http://localhost:3000";
const exe = process.env.CHROME_PATH;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const t of themes) {
  await page.goto(`${base}/dev/scene?t=${t}`, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas[data-ready='1']", { timeout: 60000 });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const gl = window.__gl;
    return { calls: gl.info.render.calls, triangles: gl.info.render.triangles, textures: gl.info.memory.textures, geometries: gl.info.memory.geometries };
  });
  console.log(t, JSON.stringify(info));
}
await browser.close();
