// Storyboard stills: render one representative frame per shot (with the bottom one-line
// subtitle overlay baked in) to out/storyboard/scene-NN.png. One bundle for all frames.
// Usage: node scripts/stills.mjs [frame1 frame2 ...]  (defaults to the 10 scene key frames)
import fs from "node:fs";
import path from "node:path";
process.env.REMOTION_TMP = path.resolve("out/.tmp");
fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = process.env.REMOTION_TMP;
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";

const DEFAULT = [[1, 100], [2, 260], [3, 430], [4, 610], [5, 800], [6, 990], [7, 1130], [8, 1300], [9, 1460], [10, 1610]];
const frames = process.argv.length > 2 ? process.argv.slice(2).map((a) => a.split(":").map(Number)) : DEFAULT;
const browserExecutable = path.resolve("node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell");
const chromiumOptions = { gl: process.env.REMOTION_GL || "swangle" };

fs.mkdirSync("out/storyboard", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const COMP_ID = process.env.COMP_ID || "ExampleEpisode";
const composition = await selectComposition({ serveUrl, id: COMP_ID, browserExecutable, chromiumOptions });

for (let i = 0; i < frames.length; i++) {
  const [sc, f] = frames[i];
  const out = `out/storyboard/scene-${String(sc).padStart(2, "0")}-f${f}.png`;
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, output: out, frame: f, browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000 });
  console.log(`still frame ${f} -> ${out} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
console.log("ALL STILLS DONE");
