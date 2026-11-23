# Danau Kakaban — Fafnir-ID episode

**Judul:** Di Kalimantan, Danau Ini Isinya Jutaan Ubur-Ubur yang Nggak Bisa Nyengat?!
**Topik:** Danau Kakaban, Pulau Kakaban, Kepulauan Derawan, Berau, Kalimantan Timur — danau purba berisi jutaan ubur-ubur tak menyengat (4 spesies), terisolasi ribuan tahun sampai sengatnya "pensiun". Twist penutup: "Kakaban" = pulau yang memeluk.
**Fakta:** lihat sources.md (Wikipedia ID, DiveNavigator/Naturalis, makalah Kakaban-Sukearsana, iannews/LIPI, asiandivesite).
**VO:** Google Puck via Speko, 10 baris (voice/lines.txt). Durasi mentah 73,61 dtk → atempo 1.25× (pitch tetap) jadi 58,89 dtk / 1767 frame @30fps — ritme cepat khas Fafnir-ID. line_starts.json diskalakan dengan faktor yang sama; backup mentah di voice/line_starts_raw.json.
**Audio:** audio/build_audio.py → mix.wav 58,89 dtk, −14,00 LUFS, TP −1,42 dBTP.
**Subtitle:** 103 potongan dua kata dari gen_captions.py (EPISODE=kakaban), Nunito 500 99px, outline textShadow 5px bersih.
**Render:** 100% GitHub Actions dari repo (projects/kakaban), 9 run jendela half-open [FROM,TO): 0:225 … 1725:1767 (ekor 42 frame, --allow-partial). Run final: 45110612170, 45110635557, 45110657513, 45110684683, 45110720937, 45110754471, 45110787232, 45110820388, 45110846550 (out/jobs-gh-repo/20261123-041410/runs.json). Run ronde pertama (45109139883 dkk.) DIBUANG — kode scene direvisi setelah still frame-0 (ubur-ubur raksasa keluar frame di potret 9:16, sand bar pindah, Cassiopea disederhanakan).
**Anti-kontaminasi:** grep kata kunci proyek lain (Giethoorn/Belanda/Winton/669/Praha/dll) di semua file teks proyek = 0 hit; caption dari voice/lines.txt proyek ini sendiri.
**Gerak (STANDAR GERAK):** bel ubur-ubur berdenyut (pulse) + bob + drift arus lambat; air danau scroll; awan drift; burung melintas; pohon + rumpun rumput bergoyang angin; alang air bergoyang; perahu bobbing.

## Shot list (L = [1, 199, 395, 556, 732, 904, 1073, 1257, 1416, 1571, 1767])
1. **Cover** — hero kaget di perahu, ubur-ubur raksasa di kiri-kanan, kartu "JUTAAN UBUR-UBUR / NOL SENGAT!"
2. **Nama** — wide tinggi seluruh danau + tebing, kartu "DANAU / KAKABAN"
3. **4 spesies** — tracking, perahu hero melayang masuk ladang ubur-ubur, kartu "4 SPESIES / UBUR-UBUR"
4. **Sengat pensiun** — close water-level, hero lega di samping ubur-ubur raksasa, kartu "SENGATNYA / PENSIUN!"
5. **Re-hook: tebing karang** — low angle ke dinding karst, kartu "TEBING KARANG / 50 METER!"
6. **Kolam purba** — permukaan tenang, kartu "KOLAM RENANG / PURBA!"
7. **Petani alga** — sand bar, Cassiopea terbalik, kartu "RENANG / TERBALIK!"
8. **Aturan** — hero tegas di dermaga + papan larangan sepatu katak, kartu "TANPA SEPATU / KATAK!"
9. **Cuma 2 di dunia** — reverse wide dari ujung danau, kartu "CUMA 2 / DI DUNIA!"
10. **Punchline loop** — framing cover, hero tertawa, kartu hook lagi
