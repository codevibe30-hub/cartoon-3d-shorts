# projects/

Rumah proyek produksi untuk render GitHub Actions **langsung dari repo**
(jalur utama sejak 21 Nov 2026 — tanpa pack job.zip, tanpa upload ke
Muse storage).

Satu folder per video: `projects/<nama-proyek>/` berisi source Remotion
yang dibutuhkan runner:

- `package.json`, `tsconfig.json`, `remotion.config.ts`
- `src/` (komposisi + captions yang sudah digenerate)
- `public/` (font dan aset statis)
- `scripts/render-chunks.mjs` (renderer chunk 75 frame, env `FROM`/`TO`)

Tidak ikut: `node_modules/`, `out/`, `audio/`, `voice/` (finalisasi dan
VO dikerjakan lokal), file MP4/WAV hasil render (lihat `.gitignore`).

Cara render satu jendela frame:

```bash
python3 scripts/gh_dispatch_repo.py --local ~/workspace/cartoon-3d/<nama-proyek> 0:150 150:300
```

Script itu menyinkronkan folder lokal ke `projects/<nama-proyek>/`,
commit + push bila ada perubahan, lalu dispatch `render.yml` dengan
input `project_path` (+ `from_frame`/`to_frame`). Artifact hasilnya
tetap `hasil-render` (output.mp4 = ZIP berisi chunk-*.mp4), dan
`scripts/gh_pull.py` di folder proyek lokal menariknya seperti biasa.

Jalur lama (`assets_url` → job.zip dari Muse storage) tetap didukung
workflow sebagai LEGACY/darurat saja.
