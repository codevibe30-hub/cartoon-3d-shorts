#!/bin/bash
# Concatenate the rendered chunks (video only, all identical encode params) and mux the final mix.
# Output: $EPISODE_OUTPUT (default episode-55s.mp4) in the project root.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${EPISODE_OUTPUT:-episode-55s.mp4}"

ls out/chunks/chunk-*.mp4 | sort > out/chunks/list.txt
# the concat demuxer wants "file '<name>'" lines relative to the list file
sed -i "s|^|file '|; s|$|'|" out/chunks/list.txt
sed -i "s|file 'out/chunks/|file '|" out/chunks/list.txt

ffmpeg -y -v error -f concat -safe 0 -i out/chunks/list.txt -c copy out/video-silent.mp4
ffmpeg -y -v error -i out/video-silent.mp4 -i audio/mix.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -movflags +faststart \
  "$OUT"
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate \
  -of default=noprint_wrappers=1 "$OUT"
echo "FINAL: $PWD/$OUT"
