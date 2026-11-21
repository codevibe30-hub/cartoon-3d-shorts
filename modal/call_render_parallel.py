"""Render SATU episode secara PARALEL di Modal — disamakan dengan GitHub Actions.

Alur (pola fan-out yang sama seperti 5 runner GitHub Actions):
  1. pack_windows.py memecah proyek jadi N job.zip jendela (FROM/TO di render.sh)
  2. tiap zip diupload ke Muse storage (remote-storage) -> URL publik
  3. N panggilan fungsi Modal `render` di-SPAWN BARENGAN (bukan sekuensial),
     tiap kontainer me-render jendelanya dan mengembalikan output.mp4
     (arsip ZIP berisi chunk-*.mp4 rentangnya)
  4. semua chunk diekstrak ke <proyek>/out/chunks/
  5. verifikasi tiap chunk: ffprobe nb_read_frames == rentang nama berkas

Fungsi Modal-nya TIDAK berubah (render_app.py render(job_url) tetap kompatibel
untuk panggilan tunggal lewat call_render.py).

Usage:
    .venv/bin/python call_render_parallel.py <project-dir> <total_frames> \
        [--windows 10] [--chunk 75] [--comp-id ExampleEpisode] [--keep-zips]

Token dibaca dari modal.env di folder ini (MODAL_TOKEN_ID/MODAL_TOKEN_SECRET).
"""

import argparse
import io
import json
import os
import subprocess
import sys
import time
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REMOTE_STORAGE = "/opt/hatch/bin/remote-storage"


def load_env() -> None:
    path = os.path.join(HERE, "modal.env")
    if not os.path.exists(path):
        sys.exit("modal.env tidak ada — buat token dulu (Settings -> API Tokens di modal.com)")
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def upload(path: str) -> str:
    out = subprocess.run([REMOTE_STORAGE, "upload-file", "--path", path],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)["url"]


def frames_of(path: str) -> int:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
         "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", path],
        capture_output=True, text=True)
    try:
        return int(out.stdout.strip())
    except ValueError:
        return -1


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("total_frames", type=int)
    ap.add_argument("--windows", type=int, default=10)
    ap.add_argument("--chunk", type=int, default=75)
    ap.add_argument("--comp-id", default="ExampleEpisode")
    ap.add_argument("--keep-zips", action="store_true")
    args = ap.parse_args()

    project = os.path.abspath(args.project)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    zip_dir = os.path.join(HERE, "parallel-jobs", stamp)
    os.makedirs(zip_dir, exist_ok=True)

    t_all = time.time()

    # 1) Pack windows
    pack = subprocess.run(
        [sys.executable, os.path.join(HERE, "pack_windows.py"), project,
         str(args.total_frames), "--windows", str(args.windows),
         "--chunk", str(args.chunk), "--comp-id", args.comp_id,
         "--out-dir", zip_dir],
        capture_output=True, text=True)
    if pack.returncode != 0:
        sys.exit(f"pack_windows gagal:\n{pack.stdout}\n{pack.stderr}")
    plan = json.loads(pack.stdout)
    wins = plan["windows"]
    print(f"[pack] {len(wins)} jendela, total {plan['total_frames']} frame, "
          f"chunk {plan['chunk']}", flush=True)

    # 2) Upload all window zips
    for w in wins:
        w["url"] = upload(w["zip"])
        print(f"[upload] w{w['window']} {os.path.basename(w['zip'])} "
              f"({w['bytes']} B) -> ok", flush=True)

    # 3) Spawn ALL calls first (parallel), then collect
    load_env()
    import modal

    fn = modal.Function.from_name("render-agent", "render")
    t_spawn = time.time()
    for w in wins:
        w["call"] = fn.spawn(w["url"])
    print(f"[spawn] {len(wins)} panggilan Modal jalan BARENGAN", flush=True)

    chunks_dir = os.path.join(project, "out", "chunks")
    os.makedirs(chunks_dir, exist_ok=True)

    total_chunks = 0
    bad = []
    for w in wins:
        data = w["call"].get(timeout=1800)
        dt = time.time() - t_spawn
        names = []
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for name in z.namelist():
                if name.startswith("chunk-") and name.endswith(".mp4"):
                    z.extract(name, chunks_dir)
                    names.append(name)
        # 5) Verify each chunk: frame count must equal its filename range
        for name in sorted(names):
            a, b = name[len("chunk-"):-len(".mp4")].split("-")
            want = int(b) - int(a) + 1
            got = frames_of(os.path.join(chunks_dir, name))
            total_chunks += 1
            if got != want:
                bad.append(f"{name}: mau {want} frame, dapat {got}")
        print(f"[done] w{w['window']} frame {w['from']}-{w['to'] - 1}: "
              f"{len(names)} chunk turun (t+{dt:.0f}s)", flush=True)

    if not args.keep_zips:
        for w in wins:
            os.unlink(w["zip"])

    dt_all = time.time() - t_all
    if bad:
        print("VERIFIKASI GAGAL:")
        for b in bad:
            print(" -", b)
        sys.exit(1)
    print(f"OK: {total_chunks} chunk terverifikasi di {chunks_dir} — "
          f"total end-to-end {dt_all:.1f} detik ({len(wins)} jendela paralel)")


if __name__ == "__main__":
    main()
