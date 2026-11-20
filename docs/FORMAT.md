# FORMAT PRODUKSI — Shorts Fakta Unik Gaya "Fafnir-ID" (spesifikasi terkunci)

Format ini mengadopsi GAYA channel referensi Fafnir: **Indonesia, energik, ada teks kata kunci** — ritme, struktur, dan formula judulnya ditiru; ISI/TOPIK selalu orisinal (lihat bagian Koreksi Arah). Format ini sengaja menyimpang dari pakem Shorts kartun 3D berbahasa Inggris (deadpan/tanpa teks).

## Spesifikasi terkunci
- **Bahasa:** Indonesia (judul + narasi)
- **Narasi:** cepat, energik, santai jenaka, tanpa jeda panjang; satu penjelasan utuh + punchline. **VO SELALU dibuka: [prolog beberapa kata DISESUAIKAN TEMA video] → frasa "Tau gak sih kalau …" → langsung masuk cerita** (berlaku semua video seri ini; prolog BUKAN frasa tetap — tiap video prolognya beda mengikuti temanya). **INTONASI: frasa "Tau gak sih" WAJIB diucapkan dengan intonasi TINGGI seakan MENEGASKAN (penekanan hook) — saat sintesis beri penekanan pada frasa itu (kapital/tanda baca/instruksi gaya bila provider mendukung) dan QA wajib mengecek potongan "Tau gak sih" benar-benar terdengar menegaskan, bukan datar.**
- **Durasi:** ±50–60 detik (target ±55 dtk); naskah ±140–160 kata
- **Struktur wajib:** frame pertama = premis judul divisualkan → build 2–3 fakta cepat → twist → punchline penutup yang MENGULANG kalimat hook → loop mulus → TANPA CTA subscribe/like
- **Teks layar (WAJIB — aturan terbaru 'Subtitle 1 baris 2 kata, ngikutin narator ngomong'):** subtitle di posisi BAWAH, tampil SATU BARIS berisi DUA KATA per tampilan, berganti mengikuti ucapan narator kata-per-kata (sinkron ke timing kata VO/words.json — pasangan kata muncul persis saat diucapkan). Aturan ini MENGGANTIKAN aturan lama "kalimat penuh per potongan kalimat". **WEIGHT FONT: Nunito weight 500** (dipilih karena Black 900 dinilai terlalu bold), ukuran tetap 99px.
- **Teks layar (riwayat):** aturan lama adalah subtitle kalimat penuh SATU BARIS per potongan kalimat (font Montserrat ExtraBold 99px, perjalanan ukuran 41px → 72px → 150px → 99px); digantikan aturan 2-kata di atas. Apa pun aturannya: potongan subtitle di-packing per lebar piksel aktual (canvas measureText), JANGAN ubah ukuran/font sembarangan, JANGAN jadi 2 baris. Kotak caption atas DIHAPUS. Teks kata kunci besar terpisah DIHAPUS — di layar bawah hanya ada satu garis subtitle itu.
- **Judul:** formula "Di [negara], …" / "Kenapa …?" + angka konkret + "?!" / emoji seperlunya
- **Visual:** dunia 3D warna cerah; karakter TETAP gaya kita (kepala bean outline tinta) sebagai pembeda dari stick-figure dia
- **Audio:** musik tidak dominan (narasi memimpin), SFX ringan mengikuti aksi; loudness final ± −14 LUFS
- **Suara VO:** Google **"Puck"** via Speko (--voice Puck, lang id) — dipilih dari beberapa sampel suara gratis. Suara berbayar/terkunci top-up tidak dipakai; jalur gratis didahulukan.
- **Naskah:** selalu orisinal, fakta diverifikasi dari sumber (pola sources.md seperti di examples/); JANGAN menyalin naskah/video channel referensi — yang ditiru format & mekanismenya
- **Output & upload:** file MP4; upload ke akun sosmed kamu (IG/FB/YT) dengan ritme wajar manusiawi (hindari pola spam: jangan posting massal beruntun).
- **Metadata upload:** metadata DISESUAIKAN PER SOSMED, target penonton Indonesia + luar negeri (deskripsi dwibahasa ID + EN): **YT Shorts** — judul berisi PERSIS 5 hashtag relevan di akhir (mis. #TaugakSih #FaktaUnik #FunFact #Korea #Shorts); deskripsi dwibahasa + set hashtag lengkap (±10–12, campuran ID + EN, JANGAN cuma 1). **IG Reel** — caption: baris pertama judul TANPA hashtag, deskripsi dwibahasa, lalu semua hashtag dikelompokkan di paling bawah caption. **FB Reel** — caption ringkas: judul tanpa hashtag + 1–2 kalimat deskripsi + maks 3–5 hashtag di akhir (jangan dump banyak hashtag).

## Alur produksi (WAJIB)
- **Storyboard tetap dibuat sebagai laporan, render TIDAK menunggu persetujuan:** storyboard (still tiap adegan + subtitle bawah 1 baris, grid berlabel) dibuat dan ditinjau, lalu render jalan terus. Koreksi arah tetap bisa diberikan kapan pun.

## ⚠️ KOREKSI ARAH (MENANG atas semua aturan topik sebelumnya)
Yang ditiru dari channel referensi HANYA GAYA/format (ritme, struktur, formula judul). **ISI/TOPIK WAJIB ORISINAL 100%** — JANGAN produksi ulang topik dari katalog Shorts channel mana pun. Sumber topik: daftar ide orisinal kamu sendiri + hasil riset sendiri.

## Mesin topik (urutan prioritas)
1. Keanehan aturan/budaya negara ("Di Jepang, …", "Di Korea, …") — terbukti paling viral di channel referensi
2. "Kenapa …?" benda/fenomena sehari-hari
3. Bencana/kegagalan engineering spesifik yang jarang diceritakan (mis. Lake Peigneur 1980, cocok dengan formula "Di Amerika, …")

## Referensi
- Contoh episode lengkap (naskah + sumber fakta): `examples/stasiun-miharashi/`
- Panduan pemakaian pipeline: `README.md` di root repo ini
