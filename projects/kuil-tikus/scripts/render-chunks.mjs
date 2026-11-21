import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(process.cwd());
const TOTAL = 1735;
const CHUNK = 75;
const jobs = [];
for (let start = 0; start < TOTAL; start += CHUNK) jobs.push([start, Math.min(start + CHUNK, TOTAL)]);
const [from, to] = jobs[Number(process.argv[2])];
console.log(`rendering frames ${from}-${to - 1} (${to - from} frames)`);

const res = spawnSync("npx", ["remotion", "render", "KuilTikus",
  path.join(root, "out", "frames"), `--frames=${from}-${to - 1}`,
  "--concurrency=3", "--log=error"],
  { cwd: root, stdio: "inherit", shell: true, env: process.env });
if (res.status !== 0) process.exit(res.status ?? 1);

const padded = n => String(n).padStart(4, "0");
const parts = [];
for (let f = from; f < to; f++) {
  const src = path.join(root, "out", "frames", `element-${padded(f)}.png`);
  if (!fs.existsSync(src)) { console.error(`missing frame ${f}`); process.exit(1); }
  parts.push(src);
}
const listPath = path.join(root, "out", `list-${from}-${to}.txt`);
fs.writeFileSync(listPath, parts.map(p => `file '${p.replace(/\\/g, "/")}'\n`).join(""));

const out = path.join(root, "out", "chunks", `chunk-${from}-${to}.mp4`);
fs.mkdirSync(path.dirname(out), { recursive: true });
const enc = spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath,
  "-framerate", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "13", "-pix_fmt", "yuv420p", out],
  { stdio: "inherit" });
if (enc.status !== 0) process.exit(enc.status ?? 1);
console.log("wrote", out);
