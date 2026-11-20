# cartoon-3d-shorts

Pipeline produksi **Shorts kartun 3D ±55 detik** bertema fakta unik — narasi Bahasa
Indonesia yang cepat dan energik, karakter kepala *bean* ber-outline tinta di dunia 3D
warna cerah (three.js), voice-over TTS, dan subtitle karaoke **1 baris / 2 kata** yang
mengikuti ucapan narator kata-per-kata. Semua dirender secara programatik dengan
[Remotion](https://www.remotion.dev/) — tidak ada timeline editor video manual.

Repo ini berisi **satu episode contoh yang lengkap dan bisa langsung dirender**
("Di Jepang, Ada Stasiun yang Nggak Punya Pintu Keluar Sama Sekali" — Stasiun
Seiryu Miharashi), plus seluruh perkakas produksinya: riset → naskah →
voice-over → musik/SFX generatif → render per-chunk (bisa hybrid dua mesin).
(Tahap storyboard tersedia sebagai perkakas opsional, tapi secara default
dilewati sesuai spek terbaru.)

> Spesifikasi format video (struktur hook → build → twist → punchline, aturan
> subtitle, formula judul, metadata upload) didokumentasikan lengkap di
> **[docs/FORMAT.md](docs/FORMAT.md)**. Yang ditiru dari channel referensi hanyalah
> *gaya/format* — **isi dan topik selalu orisinal**.

## English summary

A programmatic pipeline for ±55-second cartoon-3D "unique facts" Shorts (Indonesian
narration): Remotion + three.js scenes, bean-head ink-outline characters, TTS
voice-over, word-synced two-word karaoke subtitles, generative music/SFX, and
chunked rendering (optionally hybrid across two machines). One complete example
episode is included and ready to render. See `docs/FORMAT.md` for the format spec.

## Kebutuhan

- **Node.js 20+** dan npm
- **ffmpeg + ffprobe** (di PATH) — muxing, validasi chunk, loudness
- **Chrome/Chromium** — Remotion mengunduh headless shell-nya sendiri saat render
  pertama; di Linux server tanpa sandbox tambahkan flag sesuai kebutuhan
- **Python 3.10+** dengan `numpy`, `scipy`, `Pillow` — pipeline audio & storyboard
- Untuk voice-over: **API key [Speko](https://speko.dev)** (TTS) — lihat Konfigurasi
- Untuk transkripsi timing kata (subtitle): `faster-whisper` (opsional, hanya saat
  membuat episode baru)
- Untuk render hybrid (opsional): akun [Simular Box](https://box.simular.ai) +
  helper CLI MCP-nya

## Install

```bash
git clone <repo-ini> cartoon-3d-shorts
cd cartoon-3d-shorts
npm install
pip install numpy scipy Pillow        # perkakas audio/storyboard
cp .env.example .env                   # lalu isi SPEKO_API_KEY bila perlu VO baru
```

Cek cepat tanpa render penuh:

```bash
npm run studio        # Remotion Studio: pratinjau episode contoh di browser
npm run typecheck     # validasi TypeScript
```

## Konfigurasi

Semua kredensial lewat **environment variable** — tidak ada key di dalam kode.
Salin `.env.example` menjadi `.env` dan isi:

| Variabel | Fungsi |
|---|---|
| `SPEKO_API_KEY` | API key Speko untuk sintesis voice-over (`voice/speko_tts.py`) |
| `SPEKO_VOICE` / `SPEKO_LANG` | Suara & bahasa VO (default `Puck` / `id`) |
| `BOX_MCP_HELPER` | Path helper CLI MCP Simular Box (hanya untuk render hybrid) |
| `COMP_ID` / `TOTAL_FRAMES` / `EPISODE_OUTPUT` | Identitas episode untuk skrip render (default = episode contoh) |

## Cara membuat episode baru

1. **Riset fakta** — kumpulkan sumber terpercaya, tulis `sources.md` (fakta
   terverifikasi + kehati-hatian redaksi). Contoh nyata: `examples/stasiun-miharashi/`.
2. **Naskah** — ±140–160 kata, 10 baris, struktur: prolog → "Tau gak sih kalau …"
   (intonasi tinggi) → 2–3 fakta → twist → punchline mengulang hook. Simpan sebagai
   `SCRIPT.md` + `voice/lines.txt` (satu baris per file audio).
3. **Kode adegan** — duplikat folder `src/videos/example/` menjadi
   `src/videos/<episode-baru>/`, sesuaikan `story.ts` (timeline shot) dan dunia 3D-nya,
   daftarkan komposisinya di `src/Root.tsx`.
4. **Storyboard (OPSIONAL — dilewati secara default)** — sesuai spek terbaru
   (lihat `docs/FORMAT.md`), tahap storyboard sudah DIHAPUS dari alur produksi:
   produksi langsung render video final (lompat ke langkah 5–6). Bila kamu tetap
   ingin meninjau still adegan dulu, perkakasnya masih tersedia:
   `node scripts/stills.mjs` merender still tiap adegan ke `out/storyboard/`,
   lalu `python3 scripts/make_storyboard.py` menyusun grid berlabel (label
   adegan di `scripts/storyboard_labels.json`).
5. **Voice-over** — `bash voice/synth.sh` (Speko TTS per baris) →
   `python3 voice/assemble.py` (gabung + `line_starts.json`) →
   buat `voice/voice16k.wav` lalu `python3 voice/transcribe.py` (timing kata) →
   `python3 scripts/gen_captions.py` (subtitle karaoke 2-kata) →
   `python3 audio/build_audio.py` (musik + SFX generatif, mix −14 LUFS).
6. **Render** — `node scripts/render-chunks.mjs` (render per chunk 75 frame,
   chunk yang sudah valid dilewati — aman di-interupsi) →
   `bash scripts/finalize.sh` (concat + mux audio → MP4 final).
   Pantau dengan `bash scripts/progress.sh`.

## Render hybrid dengan Simular Box (opsional)

Mesin kedua bisa mengambil sebagian rentang frame (±2–3× lebih cepat dari VM kecil):

1. Di mesin/box kedua: clone repo yang sama, `npm install`, pastikan ffmpeg ada.
2. Transfer proyek dengan `scripts/box_xfer.py` (`put`/`get`, terverifikasi sha256) —
   arahkan `BOX_MCP_HELPER` ke helper MCP kamu.
3. Bagi rentang frame lewat env: mesin A `FROM=0 TO=900`, box `FROM=900 TO=<total>`,
   jalankan `node scripts/render-chunks.mjs` di keduanya.
4. Tarik chunk dari box, lalu `bash scripts/finalize.sh` seperti biasa.

## Render via GitHub Actions (gratis, tanpa kartu)

Render di runner GitHub lewat workflow `.github/workflows/render.yml`
(manual dispatch). Kontraknya sederhana: workflow mengunduh **satu
`job.zip`** dari URL publik, menjalankan `render.sh` di dalamnya, dan
mengembalikan **`output.mp4`** sebagai artifact bernama `hasil-render`.

Isi `job.zip`: satu folder proyek episode (template repo ini) + `render.sh`
di root zip. `render.sh` memasang dependensi, mengunduh Chrome Headless
Shell Remotion, me-render semua chunk (`scripts/render-chunks.mjs`), lalu
mem-finalisasi menjadi `output.mp4` (env: `COMP_ID`, `TOTAL_FRAMES`,
`CHUNK`, `EPISODE_OUTPUT` — lihat `templates/render.sh`).

Alurnya:

1. **Kemas proyek jadi job.zip** (render.sh proyek dipakai bila ada,
   kalau tidak `templates/render.sh` yang dipakai):

   ```bash
   bash scripts/pack-job.sh /path/ke/proyek-episode job.zip
   ```

2. **Upload `job.zip` ke URL publik** mana pun yang bisa di-`curl`
   (release GitHub, object storage, dsb.) dan salin URL-nya.

3. **Trigger workflow + ambil hasil** dengan `gh` CLI (atau tombol
   *Run workflow* di tab Actions, isi input `assets_url`):

   ```bash
   gh workflow run render.yml -f assets_url=https://link-ke/job.zip
   gh run watch
   gh run download -n hasil-render
   ```

   Hasilnya: `output.mp4` di folder unduhan — video final episode itu.

## Render via Modal (Cara 2 — serverless, dipanggil seperti API)

Alternatif GitHub Actions: fungsi serverless di [Modal](https://modal.com)
yang dipanggil dari Python. Kontraknya **sama persis** — fungsi menerima
URL `job.zip`, menjalankan `render.sh` di dalamnya, dan mengembalikan isi
`output.mp4` sebagai bytes. Mesin Modal hanya menyala selama render
berjalan (kredit Starter $30/bulan, dibayar per detik).

Kode: `modal/render_app.py` (App `render-agent`, image Node 20 + ffmpeg +
library Chrome Headless Shell untuk Remotion, timeout 1800 detik) dan
`modal/call_render.py` (klien pemanggil).

```bash
# sekali saja: buat token di modal.com (Settings -> API Tokens), simpan sebagai
# MODAL_TOKEN_ID + MODAL_TOKEN_SECRET di modal.env (JANGAN commit file ini),
# lalu deploy:
pip install modal
set -a; . ./modal.env; set +a
modal deploy modal/render_app.py

# tiap render: kemas job.zip seperti Cara 1, upload ke URL publik, panggil:
python modal/call_render.py https://link-ke/job.zip hasil.mp4
```

## Struktur folder

```
.
├── .github/workflows/        # render.yml — render cloud via GitHub Actions
├── modal/                    # render_app.py + call_render.py — render via Modal (Cara 2)
├── templates/render.sh       # render.sh bawaan untuk job.zip (render cloud)
├── docs/FORMAT.md            # spesifikasi format video (terkunci)
├── examples/
│   └── stasiun-miharashi/    # SCRIPT.md + sources.md episode contoh
├── public/fonts/             # Nunito & Montserrat (SIL Open Font License)
├── src/
│   ├── Root.tsx              # registrasi komposisi Remotion
│   └── videos/example/       # mesin adegan episode contoh:
│       ├── Episode.tsx       #   komposisi utama + overlay subtitle
│       ├── story.ts          #   timeline shot per frame
│       ├── world.ts/build.ts #   dunia 3D (three.js) & kit bangunan/props
│       ├── cast.ts           #   karakter bean (sprite) & kostum
│       ├── toon.ts/ink.ts/…  #   shading toon, outline tinta, grade, lens
│       └── captions.ts       #   subtitle karaoke 2-kata (di-generate)
├── voice/                    # TTS (speko_tts.py, synth.sh), assemble, transcribe
├── audio/                    # musik & SFX generatif (dsp, instruments, sfx_gen)
└── scripts/                  # render-chunks, stills, storyboard, captions,
                              # progress, finalize, box_xfer (hybrid), pack-job
```

## Lisensi

- Kode dalam repo ini: **MIT** (lihat `package.json`).
- **Remotion** adalah framework terpisah dengan lisensinya sendiri
  (https://www.remotion.dev/license) — gratis untuk individu dan tim kecil;
  perusahaan yang lebih besar mungkin memerlukan Company License. Periksa sebelum
  memakai pipeline ini secara komersial.
- Font Nunito & Montserrat: **SIL Open Font License 1.1**.
- Speko, Simular Box, dan layanan TTS adalah layanan pihak ketiga dengan
  syarat & harga masing-masing.
