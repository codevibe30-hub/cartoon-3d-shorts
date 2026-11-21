#!/usr/bin/env python3
"""Pack ONE slim job.zip window [FROM, TO) of this project for GHA / Modal.

Usage: pack_window.py <from> <to> <out.zip>
The zip carries only what scripts/render-chunks.mjs needs (src, public,
package.json, tsconfig, remotion.config.ts, the chunk renderer) plus a
render.sh that burns FROM/TO in, renders this window's chunks and packs
them as output.mp4 (a ZIP archive, same trick as the GHA fan-out).
NO API keys, NO audio/voice — finalize happens locally.
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {"node_modules", "out", ".git", "__pycache__"}

RENDER_SH = """#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export FROM={frm}
export TO={to}
npm install --no-audit --no-fund
node -e "import('@remotion/renderer').then((m) => m.ensureBrowser()).then(() => console.log('chrome ready'))"
node scripts/render-chunks.mjs 75
cd out/chunks && python3 -c "
import zipfile, glob
z = zipfile.ZipFile('../../output.mp4', 'w', zipfile.ZIP_STORED)
for f in sorted(glob.glob('chunk-*.mp4')):
    z.write(f, f)
z.close()
print('packed output.mp4')
" && cd ../..
ls -la output.mp4
"""


def add_tree(zf: zipfile.ZipFile, dirpath: str, arcbase: str) -> None:
    for dp, dns, fns in os.walk(dirpath):
        dns[:] = [d for d in dns if d not in SKIP]
        for fn in fns:
            full = os.path.join(dp, fn)
            rel = os.path.relpath(full, ROOT)
            zf.write(full, rel)


def main() -> None:
    frm, to, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in ["package.json", "tsconfig.json", "remotion.config.ts"]:
            zf.write(os.path.join(ROOT, f), f)
        zf.write(os.path.join(ROOT, "scripts", "render-chunks.mjs"), "scripts/render-chunks.mjs")
        add_tree(zf, os.path.join(ROOT, "src"), "src")
        add_tree(zf, os.path.join(ROOT, "public"), "public")
        zf.writestr("render.sh", RENDER_SH.format(frm=frm, to=to))
    print(f"{out}: {os.path.getsize(out)} bytes, window {frm}-{to}")


if __name__ == "__main__":
    main()
