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
- **UPGRADE VISUAL 3D (perintah Baginda Raja 21 Nov 2026, berlaku mulai video #7):** (1) Pencahayaan berlapis (key + fill + rim) + soft shadow WAJIB agar terasa 3D, hindari flat lighting. (2) Sudut kamera beragam (wide/medium/close-up/low/high angle) + transisi antar adegan pakai gerakan kamera, bukan potongan datar statis. (3) Palet warna lebih kaya, aksen per adegan tetap harmonis. (4) Suasana sejuk & terang (siang cerah), hindari kesan gelap. Kualitas gambar TIDAK boleh turun — resolusi & resep finalisasi crf23 tetap.
- **LINGKUNGAN & BACKGROUND WAJIB REALISTIS-DETAIL (perintah Baginda Raja 21 Nov 2026, mulai video #7):** tanah, air, tembok, bangunan, gunung, dan background di belakang karakter DILARANG flat/polos satu warna (boring, tidak jelas). Wajib tekstur permukaan, air beriak + pantulan, bayangan lingkungan konsisten, lapisan kedalaman + perspektif atmosferik, detail kecil penghidup suasana. Tetap satu gaya dengan karakter (stylized realistis, bukan foto tempelan).
- **Audio:** musik tidak dominan (narasi memimpin); SFX WAJIB di momen penting dan di setiap adegan bila dibutuhkan (perintah Baginda Raja 21 Nov 2026); loudness final ± −14 LUFS
- **Suara VO:** Google **"Puck"** via Speko (--voice Puck, lang id) — dipilih dari beberapa sampel suara gratis. Suara berbayar/terkunci top-up tidak dipakai; jalur gratis didahulukan.
- **Naskah:** selalu orisinal, fakta diverifikasi dari sumber (pola sources.md seperti di examples/); JANGAN menyalin naskah/video channel referensi — yang ditiru format & mekanismenya
- **Output & upload:** file MP4; upload ke akun sosmed kamu (IG/FB/YT) dengan ritme wajar manusiawi (hindari pola spam: jangan posting massal beruntun).
- **Metadata upload:** metadata DISESUAIKAN PER SOSMED, target penonton Indonesia + luar negeri (deskripsi dwibahasa ID + EN): **YT Shorts** — judul berisi PERSIS 5 hashtag relevan di akhir (mis. #TaugakSih #FaktaUnik #FunFact #Korea #Shorts); deskripsi dwibahasa + set hashtag lengkap (±10–12, campuran ID + EN, JANGAN cuma 1). **IG Reel** — caption: baris pertama judul TANPA hashtag, deskripsi dwibahasa, lalu semua hashtag dikelompokkan di paling bawah caption. **FB Reel** — caption ringkas: judul tanpa hashtag + 1–2 kalimat deskripsi + maks 3–5 hashtag di akhir (jangan dump banyak hashtag).

## Alur produksi (WAJIB)
- **Storyboard DIHAPUS dari alur produksi (aturan terbaru):** produksi langsung render video final TANPA tahap storyboard — riset → naskah → kode adegan → VO → render. Perkakas storyboard (`scripts/stills.mjs` + `scripts/make_storyboard.py`) tetap tersedia di repo ini, tapi sifatnya OPSIONAL dan secara default DILEWATI; pakai hanya bila kamu memang ingin meninjau still adegan sebelum render penuh.
- **QA STILLS DIHAPUS dari alur produksi (aturan terbaru, perintah Baginda Raja 21 Nov 2026: 'Gausah ada QA'):** alur produksi = naskah → VO → LANGSUNG fan-out render hybrid total. TIDAK ADA tahap QA stills pra-render sama sekali. Yang TETAP wajib hanya verifikasi teknis file FINAL: ffprobe (durasi, 1080×1920, 30fps, codec, frame count) + loudness ±−14 LUFS.
- **RENDER HYBRID TOTAL (aturan terbaru):** SEMUA render dibagi ke mesin-mesin render yang tersedia (tiap mesin jendela frame sendiri). Setelah semua chunk lengkap & terverifikasi, chunk DISATUKAN lalu video difinalisasi seperti biasa (gabung chunk + VO/musik + loudness ±−14 LUFS + verifikasi final).
- **VM TIDAK LAGI MERENDER (aturan terbaru, perintah Baginda Raja 21 Nov 2026):** mesin lokal (VM) HANYA bertugas menarik/mengumpulkan chunk + finalisasi — BUKAN mesin render. Semua frame render dibagi ke cloud box + runner GitHub Actions paralel (workflow `render.yml`) + panggilan Modal paralel saja. **ARMADA DIPERBESAR (perintah Baginda Raja 21 Nov 2026, mulai video #7): 10 runner GitHub + 10 panggilan Modal paralel + Box** — jendela dipecah lebih halus, kualitas & cakupan frame tidak berubah.
- **ANTI-BANDING:** hindari bidang gradasi polos besar (dinding/langit/lantai satu warna menggradasi), terutama di adegan penutup — permukaan besar wajib diberi tekstur/detail/grain halus pemecah banding. (Encode final terbukti bukan penyebab banding: final adalah salinan persis chunk.)
- **(Riwayat — tidak berlaku lagi)** Aturan lama: storyboard (still tiap adegan + subtitle bawah 1 baris, grid berlabel) dibuat sebagai laporan dan render tidak menunggu persetujuan. Sudah digantikan aturan di atas.

## ⚠️ KOREKSI ARAH (MENANG atas semua aturan topik sebelumnya)
Yang ditiru dari channel referensi HANYA GAYA/format (ritme, struktur, formula judul). **ISI/TOPIK WAJIB ORISINAL 100%** — JANGAN produksi ulang topik dari katalog Shorts channel mana pun. Sumber topik: daftar ide orisinal kamu sendiri + hasil riset sendiri.

## Mesin topik (urutan prioritas)
1. Keanehan aturan/budaya negara ("Di Jepang, …", "Di Korea, …") — terbukti paling viral di channel referensi
2. "Kenapa …?" benda/fenomena sehari-hari
3. Bencana/kegagalan engineering spesifik yang jarang diceritakan (mis. Lake Peigneur 1980, cocok dengan formula "Di Amerika, …")

## Referensi
- Contoh episode lengkap (naskah + sumber fakta): `examples/stasiun-miharashi/`
- Panduan pemakaian pipeline: `README.md` di root repo ini
