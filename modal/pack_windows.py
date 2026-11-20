"""Kemas satu proyek episode jadi N job.zip JENDELA untuk render paralel Modal.

Pola sama seperti fan-out GitHub Actions: tiap jendela = job.zip RAMPING
(hanya file yang dibutuhkan scripts/render-chunks.mjs) dengan render.sh yang
membakar FROM/TO jendelanya. render.sh jendela TIDAK mem-finalisasi — ia
me-render chunk rentangnya saja, lalu mengemas out/chunks/chunk-*.mp4 jadi
output.mp4 (arsip ZIP; trik yang sama seperti artifact GitHub Actions).
Pemanggil mengekstrak chunk-chunk itu ke out/chunks/ proyek lokal dan
memverifikasi jumlah frame tiap chunk.

Jendela selalu sejajar grid chunk: window_size = ceil(total_chunks/windows)
chunk, jadi tidak ada chunk yang terbelah di dua jendela.

Usage:
    .venv/bin/python pack_windows.py <project-dir> <total_frames> \
        [--windows 5] [--chunk 75] [--comp-id ExampleEpisode] [--out-dir DIR]

Output: job-w<i>-<from>-<to>.zip per jendela di out-dir + ringkasan JSON
di stdout (daftar zip + rentang frame tiap jendela).
"""

import argparse
import json
import os
import shutil
import sys
import tempfile
import zipfile

# File/dir ramping yang dibutuhkan render-chunks.mjs (bundle + render saja;
# audio/voice/docs TIDAK ikut — finalisasi terjadi di mesin lokal).
SLIM_FILES = ["package.json", "package-lock.json", "tsconfig.json", "remotion.config.ts"]
SLIM_DIRS = ["src", "public"]
SLIM_SCRIPTS = ["scripts/render-chunks.mjs"]
SKIP_PARTS = {"node_modules", "out", ".git", "__pycache__"}

RENDER_SH = """#!/bin/bash
# Render SATU JENDELA frame ({frm}-{to} dari {total}) — jalur paralel Modal.
# Dihasilkan pack_windows.py; pola sama dengan fan-out GitHub Actions:
# render chunk rentang ini saja (FROM/TO terbakar di sini), TANPA finalize,
# lalu kemas chunk hasilnya jadi output.mp4 (arsip ZIP) untuk diambil pemanggil.
set -euo pipefail
cd "$(dirname "$0")"

export COMP_ID="{comp}"
export TOTAL_FRAMES={total}
export FROM={frm}
export TO={to}
CHUNK={chunk}

npm install --no-audit --no-fund

# Fetch the Chrome Headless Shell that scripts/render-chunks.mjs expects in
# node_modules/.remotion (no-op when already downloaded).
node -e "import('@remotion/renderer').then((m) => m.ensureBrowser()).then(() => console.log('chrome headless shell ready'))"

# Chunked render for THIS window only (render-chunks.mjs honors FROM/TO).
node scripts/render-chunks.mjs "$CHUNK"

# Package this window's chunks as output.mp4 (ZIP archive, stored — mp4 is
# already compressed). The caller extracts chunk-*.mp4 into out/chunks/.
python3 - <<'PYEOF'
import glob, zipfile
files = sorted(glob.glob("out/chunks/chunk-*.mp4"))
assert files, "no chunks rendered for this window"
with zipfile.ZipFile("output.mp4", "w", zipfile.ZIP_STORED) as z:
    for f in files:
        z.write(f, arcname=f.split("/")[-1])
print("packed", len(files), "chunks into output.mp4")
PYEOF

ls -la output.mp4
"""


def copy_slim(project: str, stage: str) -> None:
    for name in SLIM_FILES:
        src = os.path.join(project, name)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(stage, name))
    for name in SLIM_DIRS:
        src = os.path.join(project, name)
        if not os.path.isdir(src):
            sys.exit(f"folder wajib tidak ada di proyek: {src}")
        for root, dirs, files in os.walk(src):
            dirs[:] = [d for d in dirs if d not in SKIP_PARTS]
            rel = os.path.relpath(root, project)
            for fn in files:
                if fn.endswith(".zip"):
                    continue
                s = os.path.join(root, fn)
                d = os.path.join(stage, rel, fn)
                os.makedirs(os.path.dirname(d), exist_ok=True)
                shutil.copy2(s, d)
    for name in SLIM_SCRIPTS:
        src = os.path.join(project, name)
        if not os.path.exists(src):
            sys.exit(f"script wajib tidak ada di proyek: {src}")
        d = os.path.join(stage, name)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copy2(src, d)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("total_frames", type=int)
    ap.add_argument("--windows", type=int, default=5)
    ap.add_argument("--chunk", type=int, default=75)
    ap.add_argument("--comp-id", default="ExampleEpisode")
    ap.add_argument("--out-dir", default=None)
    args = ap.parse_args()

    project = os.path.abspath(args.project)
    if not os.path.exists(os.path.join(project, "package.json")):
        sys.exit(f"bukan proyek episode (tidak ada package.json): {project}")

    total, chunk, nwin = args.total_frames, args.chunk, args.windows
    total_chunks = -(-total // chunk)
    chunks_per_window = -(-total_chunks // nwin)
    windows = []
    for i in range(nwin):
        frm = i * chunks_per_window * chunk
        if frm >= total:
            break
        to = min((i + 1) * chunks_per_window * chunk, total)
        windows.append((frm, to))

    out_dir = args.out_dir or os.path.join(project, "modal-windows")
    os.makedirs(out_dir, exist_ok=True)

    made = []
    for i, (frm, to) in enumerate(windows):
        stage = tempfile.mkdtemp(prefix=f"win{i}-")
        try:
            copy_slim(project, stage)
            with open(os.path.join(stage, "render.sh"), "w") as f:
                f.write(RENDER_SH.format(comp=args.comp_id, total=total, frm=frm, to=to, chunk=chunk))
            zname = f"job-w{i}-{frm:04d}-{to:04d}.zip"
            zpath = os.path.join(out_dir, zname)
            with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
                for root, dirs, files in os.walk(stage):
                    dirs[:] = [d for d in dirs if d not in SKIP_PARTS]
                    for fn in files:
                        full = os.path.join(root, fn)
                        z.write(full, arcname=os.path.relpath(full, stage))
            made.append({"window": i, "from": frm, "to": to, "zip": zpath,
                         "bytes": os.path.getsize(zpath)})
        finally:
            shutil.rmtree(stage, ignore_errors=True)

    print(json.dumps({"total_frames": total, "chunk": chunk, "windows": made}, indent=1))


if __name__ == "__main__":
    main()
