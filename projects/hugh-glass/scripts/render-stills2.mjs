import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(process.cwd());
const frames = process.argv.slice(2).map(Number);
for (const f of frames) {
  const out = path.join(root, "stills", `f${f}.png`);
  console.log("still", f);
  const res = spawnSync("npx", ["remotion", "still", "HughGlass", out, `--frame=${f}`, "--log=error"],
    { cwd: root, stdio: "inherit", shell: true, env: process.env });
  if (res.status !== 0) process.exit(res.status ?? 1);
}
