#!/bin/bash
# Finalize: concat chunks -> atadenoise + crf23 re-encode (chunks are crf16 with animated
# grain; -c copy would produce ~860 MB) -> mux audio/mix.wav as AAC 256k, faststart.
# Output: kereta-hanoi-54s.mp4 in the project root.
set -euo pipefail
cd "$(dirname "$0")/.."

ls out/chunks/chunk-*.mp4 | sort > out/chunks/list.txt
sed -i "s|^|file '|; s|$|'|" out/chunks/list.txt
sed -i "s|file 'out/chunks/|file '|" out/chunks/list.txt

ffmpeg -y -v error -f concat -safe 0 -i out/chunks/list.txt -i audio/mix.wav \
  -map 0:v:0 -map 1:a:0 -vf "atadenoise=0a=0.3:0b=0.3" \
  -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart \
  kereta-hanoi-54s.mp4
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate \
  -of default=noprint_wrappers=1 kereta-hanoi-54s.mp4
echo "FINAL: $PWD/kereta-hanoi-54s.mp4"
