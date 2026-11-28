// One-off verification stills: bundle once, renderStill per frame arg.
import fs from "node:fs";
import path from "node:path";
process.env.REMOTION_TMP = path.resolve("out/.tmp");
fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = process.env.REMOTION_TMP;
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";

const frames = process.argv.slice(2).map(Number);
const browserExecutable = path.resolve("node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell");
const chromiumOptions = { gl: process.env.REMOTION_GL || "swangle" };
fs.mkdirSync("stills/check", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "EtalaseFrame", browserExecutable, chromiumOptions });
for (const f of frames) {
  const out = `stills/check/f${String(f).padStart(4, "0")}.png`;
  await renderStill({ composition, serveUrl, frame: f, output: out, browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000 });
  console.log("still", out);
}
console.log("STILLS DONE");
