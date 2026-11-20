#!/bin/bash
# Finalize: concat the rendered chunks, re-encode with atadenoise + crf 23, and mux the final mix.
# Why re-encode: chunks are crf 16 and the grade adds animated grain, so -c copy yields
# ~116 Mbps (~860 MB for 55 s). atadenoise tames the grain temporally; crf 23 lands ~50 MB
# with no visible quality loss and no banding (proven on desa-nagoro, 2026-11-20).
# Output: $EPISODE_OUTPUT (default episode-55s.mp4) in the project root.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${EPISODE_OUTPUT:-episode-55s.mp4}"

ls out/chunks/chunk-*.mp4 | sort > out/chunks/list.txt
# the concat demuxer wants "file '<name>'" lines relative to the list file
sed -i "s|^|file '|; s|$|'|" out/chunks/list.txt
sed -i "s|file 'out/chunks/|file '|" out/chunks/list.txt

ffmpeg -y -v error -f concat -safe 0 -i out/chunks/list.txt -i audio/mix.wav \
  -map 0:v:0 -map 1:a:0 -vf "atadenoise=0a=0.3:0b=0.3" \
  -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart \
  "$OUT"
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate \
  -of default=noprint_wrappers=1 "$OUT"
echo "FINAL: $PWD/$OUT"
