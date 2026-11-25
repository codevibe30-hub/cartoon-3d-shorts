// Chunked full render: renders the composition in frame-range chunks to out/chunks/chunk-AAA-BBB.mp4
// (video only, h264 crf 16). Chunks that already exist with the right frame count are skipped, so a
// killed run (VM replacement) resumes where it stopped. Concatenate + mux audio afterwards.
// NOTE: /tmp on this VM is a 512 MB tmpfs — Remotion's temp frames MUST go to disk instead.
import fs from "node:fs";
import path from "node:path";
process.env.REMOTION_TMP = path.resolve("out/.tmp");
fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = process.env.REMOTION_TMP;
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { execFileSync } from "node:child_process";

const TOTAL = 1740; // SedlecFrame full episode (1740 frames)
const CHUNK = Number(process.argv[2] || 75);
// Optional frame window [FROM, TO) on the chunk grid, for hybrid multi-machine renders.
const FROM = Number(process.env.FROM || 0);
const TO = Number(process.env.TO || TOTAL);
const browserExecutable = path.resolve("node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell");
const chromiumOptions = { gl: process.env.REMOTION_GL || "swangle" };
const inputProps = process.env.POST ? { post: JSON.parse(process.env.POST) } : undefined;

fs.mkdirSync("out/chunks", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "SedlecFrame", browserExecutable, chromiumOptions });

const framesOf = (file) => {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames",
      "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", file], { encoding: "utf8" });
    return Number(out.trim());
  } catch { return -1; }
};

for (let a = FROM; a < TO; a += CHUNK) {
  const b = Math.min(a + CHUNK, TOTAL, TO) - 1;
  const out = `out/chunks/chunk-${String(a).padStart(4, "0")}-${String(b).padStart(4, "0")}.mp4`;
  const want = b - a + 1;
  if (fs.existsSync(out) && framesOf(out) === want) { console.log(`skip ${out} (${want} frames ok)`); continue; }
  const t0 = Date.now();
  await renderMedia({
    composition, serveUrl, codec: "h264", outputLocation: out, frameRange: [a, b],
    concurrency: 2, crf: 16, muted: true, browserExecutable, chromiumOptions,
    timeoutInMilliseconds: 300000, ...(inputProps ? { inputProps } : {}),
    onBrowserLog: (l) => { if (l.type === "error") console.log("[err]", l.text.slice(0, 200)); },
  });
  console.log(`chunk ${a}-${b} done in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${out} (${framesOf(out)} frames)`);
}
console.log("ALL CHUNKS DONE");
