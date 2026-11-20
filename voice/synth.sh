#!/bin/bash
# Synthesize the episode voice-over with Speko TTS, one WAV per narration line.
# Needs: SPEKO_API_KEY in the environment (see .env.example), ffmpeg.
#
# This file ships with the EXAMPLE episode's lines (Seiryu Miharashi). For a new
# episode: rewrite voice/lines.txt, then mirror the lines here (line 1 is split
# into a short prolog segment + the hook segment, joined tight at the end, so the
# hook phrase "Tau gak sih" can carry its own high, emphatic delivery instruction).
set -e
cd "$(dirname "$0")/.."
S="python3 voice/speko_tts.py say --voice ${SPEKO_VOICE:-Puck} --lang ${SPEKO_LANG:-id}"
mkdir -p voice/seg voice/lines
say() { # out text instructions
  local out=$1 text=$2 instr=$3
  if [ -s "$out" ]; then echo "skip $out"; return; fi
  if [ -n "$instr" ]; then
    $S --text "$text" --instructions "$instr" --out "$out"
  else
    $S --text "$text" --out "$out"
  fi
  echo "done $out"; sleep 9
}
say voice/seg/l1a.wav "Turun dari kereta, eh nggak bisa pulang." ""
say voice/seg/l1b.wav "Tau gak sih kalau di Jepang, ada stasiun yang nggak punya pintu keluar sama sekali!" "Speak Indonesian with a HIGH, excited, emphatic intonation on the opening words 'Tau gak sih' — like stressing a surprising hook — then keep going fast and energetic."
say voice/lines/l2.wav "Namanya Seiryu Miharashi, di Iwakuni, Yamaguchi. Cuma peron beton di tebing, persis di tepi Sungai Nishiki." ""
say voice/lines/l3.wav "Nggak ada tangga, nggak ada jalan, nggak ada gerbang tiket. Belakangnya tebing, depannya jurang ke sungai!" ""
say voice/lines/l4.wav "Dibuka 19 Maret 2019, biaya bangunnya 112 juta yen. Semua material diangkut pakai kereta, malam-malam!" ""
say voice/lines/l5.wav "Kereta biasa cuma lewat, nggak berhenti. Yang berhenti cuma kereta khusus acara, harus pesan dulu." ""
say voice/lines/l6.wav "Turun di sini, kamu nggak bisa ke mana-mana. Pilihanmu cuma dua: menikmati pemandangan, atau naik kereta berikutnya." ""
say voice/lines/l7.wav "Tapi ini bukan salah desain. Stasiun ini memang sengaja dibuat tanpa pintu keluar!" ""
say voice/lines/l8.wav "Miharashi artinya tempat memandang. Fungsi satu-satunya stasiun ini memang cuma buat berhenti dan memandang sungai." ""
say voice/lines/l9.wav "Di sini kamu bukan penumpang. Kamu penonton, dan tiketmu dibayar lunas oleh pemandangan." ""
say voice/lines/l10.wav "Jadi ingat: di Jepang, ada stasiun yang nggak punya pintu keluar sama sekali!" ""
# line 1 = prolog segment + hook segment, joined tight
ffmpeg -y -v error -i "concat:voice/seg/l1a.wav|voice/seg/l1b.wav" -ar 24000 -ac 1 voice/lines/l1.wav
echo ALL SYNTH DONE
