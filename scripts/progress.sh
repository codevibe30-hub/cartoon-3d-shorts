#!/bin/bash
# Render progress: count finished frames from valid chunks.
# A chunk counts as done when its ffprobe frame count == the frame range in its filename.
# Env: TOTAL_FRAMES (default 1659), CHUNK (default 75), EPISODE_OUTPUT (default episode-55s.mp4)
cd "$(dirname "$0")/.." || exit 1
TOTAL=${TOTAL_FRAMES:-1659}
CHUNK=${CHUNK:-75}
CHUNKS_TOTAL=$(( (TOTAL + CHUNK - 1) / CHUNK ))
OUT="${EPISODE_OUTPUT:-episode-55s.mp4}"
done=0
chunks_done=0
shopt -s nullglob
for f in out/chunks/chunk-*.mp4; do
  base=$(basename "$f" .mp4)
  a=${base:6:4}
  b=${base:11:4}
  want=$((10#$b - 10#$a + 1))
  n=$(ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null)
  n=${n//[!0-9]/}
  [ -z "$n" ] && n=0
  if [ "$n" -ge "$want" ]; then
    done=$((done + want))
    chunks_done=$((chunks_done + 1))
  else
    done=$((done + n))
  fi
done
pct=$(awk "BEGIN{printf \"%.1f\", $done * 100 / $TOTAL}")
final="no"
[ -f "$OUT" ] && final="yes"
proc="no"
pgrep -f "render-chunks.mjs" >/dev/null && proc="yes"
echo "frames_done=$done total=$TOTAL pct=$pct chunks_done=$chunks_done chunks_total=$CHUNKS_TOTAL final_exists=$final render_running=$proc"
