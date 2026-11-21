// Renders 5 sample stills of the PRODUCTION composition (NyepiBali, src/index.ts)
// to stills-check/frame-1..5.png — preview of the subtitle outline change
// (black outline 8px -> 5px, font unchanged Nunito 500 99px). Mirrors
// scripts/render-preview-still.mjs plumbing. NOT a production render.
import fs from "node:fs";
import path from "node:path";
process.env.REMOTION_TMP = path.resolve("out/.tmp");
fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = process.env.REMOTION_TMP;
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";

const browserExecutable = path.resolve("node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell");
const chromiumOptions = { gl: process.env.REMOTION_GL || "swangle" };
// Picked from a probe pass over the finished MP4: frames where a character is
// actually framed (hero in shots 4/8, the resident in shot 5, hero koi in 10).
// Probe mode: STILL_FRAMES=690,880 STILL_OUT=/tmp/probe2 STILL_PREFIX=probe
const FRAMES = process.env.STILL_FRAMES
  ? process.env.STILL_FRAMES.split(",").map(Number)
  : [540, 720, 1155, 1235, 1455];
const outDir = path.resolve(process.env.STILL_OUT || "stills-check");
const PREFIX = process.env.STILL_PREFIX || "frame";
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "DapurIndia", browserExecutable, chromiumOptions });

for (let i = 0; i < FRAMES.length; i++) {
  const output = path.join(outDir, `${PREFIX}-${i + 1}.png`);
  await renderStill({
    composition, serveUrl, output, browserExecutable, chromiumOptions,
    imageFormat: "png", frame: FRAMES[i], timeoutInMilliseconds: 300000,
    onBrowserLog: (l) => { if (l.type === "error") console.log("[err]", l.text.slice(0, 300)); },
  });
  console.log(`STILL ${i + 1}/5 DONE frame=${FRAMES[i]} ->`, output);
}
console.log("ALL STILLS DONE");
