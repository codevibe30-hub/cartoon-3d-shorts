#!/bin/bash
# Finalize the Hugh Glass short: concat all chunks, the house
# re-encode (atadenoise + libx264 crf23 — quality recipe, NO plain
# concat-copy), then mux the approved mix with faststart.
set -e
cd "$(dirname "$0")/.."
ls out/chunks/chunk-*.mp4 | sort -V > /tmp/glass-chunks.txt
COUNT=$(wc -l < /tmp/glass-chunks.txt)
echo "chunks: $COUNT"
: > out/concat.txt
while read -r f; do echo "file '$PWD/$f'" >> out/concat.txt; done < /tmp/glass-chunks.txt
ffmpeg -y -f concat -safe 0 -i out/concat.txt -c copy out/video-raw.mp4
ffmpeg -y -i out/video-raw.mp4 -vf "atadenoise=0a=0.3:0b=0.3" \
  -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p out/video-clean.mp4
ffmpeg -y -i out/video-clean.mp4 -i audio/mix.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart \
  hugh-glass.mp4
echo "== final =="
ffprobe -v error -show_entries format=duration,size -of default=nw=1 hugh-glass.mp4
