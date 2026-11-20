"""Modal render machine — Cara 2 (serverless, dipanggil seperti API).

Kontraknya IDENTIK dengan jalur GitHub Actions (.github/workflows/render.yml):
  input : URL publik ke job.zip (isi: proyek episode + render.sh di root zip)
  proses: unduh zip -> ekstrak -> `bash render.sh` di folder job
  output: isi job/output.mp4 sebagai bytes

render.sh proyek yang menjalankan npm install, mengunduh Chrome Headless
Shell Remotion, me-render chunk (scripts/render-chunks.mjs) dan mem-finalisasi
(scripts/finalize.sh). Karena itu image-nya butuh Node.js 20 + ffmpeg +
library runtime Chrome headless — BUKAN cuma ffmpeg.

Deploy (sekali):
    cd ~/workspace/modal-render
    set -a; . ./modal.env; set +a        # MODAL_TOKEN_ID + MODAL_TOKEN_SECRET
    .venv/bin/modal deploy render_app.py

Panggil:
    .venv/bin/python call_render.py https://link-ke/job.zip hasil.mp4
"""

import modal

app = modal.App("render-agent")

image = (
    # Node 20 resmi (bookworm) + Python 3.12 yang disuntikkan Modal —
    # menghindari tebakan nama paket library antar-rilis Debian.
    modal.Image.from_registry("node:20-bookworm-slim", add_python="3.12")
    .apt_install(
        "ffmpeg",
        "ca-certificates",
        "curl",
        "unzip",
        "git",
        "fonts-liberation",
        # Library runtime Chrome Headless Shell (Remotion ensureBrowser)
        "libnss3",
        "libnspr4",
        "libatk1.0-0",
        "libatk-bridge2.0-0",
        "libcups2",
        "libdrm2",
        "libxkbcommon0",
        "libxcomposite1",
        "libxdamage1",
        "libxfixes3",
        "libxrandr2",
        "libgbm1",
        "libasound2",
        "libpango-1.0-0",
        "libcairo2",
        "libatspi2.0-0",
        "libx11-6",
        "libxcb1",
        "libxext6",
        "libxi6",
        "libxtst6",
    )
)


@app.function(image=image, timeout=1800, cpu=4, memory=8192)
def render(job_url: str) -> bytes:
    import os
    import shutil
    import subprocess
    import urllib.request
    import zipfile

    workdir = "/tmp/render-job"
    shutil.rmtree(workdir, ignore_errors=True)
    os.makedirs(workdir)

    zip_path = os.path.join(workdir, "job.zip")
    urllib.request.urlretrieve(job_url, zip_path)

    job_dir = os.path.join(workdir, "job")
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(job_dir)

    # render.sh men-cd ke foldernya sendiri; hasil WAJIB job/output.mp4.
    subprocess.run(["bash", "render.sh"], cwd=job_dir, check=True)

    with open(os.path.join(job_dir, "output.mp4"), "rb") as f:
        return f.read()
