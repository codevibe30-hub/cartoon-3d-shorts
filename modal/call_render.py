"""Panggil fungsi render Modal dan simpan hasilnya.

Usage:
    .venv/bin/python call_render.py <job_url> [output.mp4]

Token dibaca dari modal.env di folder ini (MODAL_TOKEN_ID/MODAL_TOKEN_SECRET).
"""

import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))


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


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    job_url = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else "hasil.mp4"

    load_env()
    import modal

    fn = modal.Function.from_name("render-agent", "render")
    t0 = time.time()
    data = fn.remote(job_url)
    dt = time.time() - t0
    with open(out, "wb") as f:
        f.write(data)
    print(f"OK: {out} ({len(data)} bytes) dalam {dt:.1f} detik end-to-end")


if __name__ == "__main__":
    main()
