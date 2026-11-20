#!/bin/bash
# Pack one episode project folder into a job.zip for the GitHub Actions
# render workflow (.github/workflows/render.yml).
#
# Usage:
#   bash scripts/pack-job.sh <project-dir> [output.zip]
#
# The zip root contains the project files plus render.sh at the top level:
# the project's own render.sh wins; otherwise templates/render.sh from this
# repo is used. node_modules, out/, .git and old zips are excluded — the
# runner installs dependencies itself via render.sh.
set -euo pipefail

PROJ="${1:?usage: pack-job.sh <project-dir> [output.zip]}"
OUT="${2:-job.zip}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -d "$PROJ" ] || { echo "project dir not found: $PROJ" >&2; exit 1; }
[ -f "$PROJ/package.json" ] || { echo "no package.json in $PROJ — not an episode project" >&2; exit 1; }

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

rsync -a \
  --exclude 'node_modules' \
  --exclude 'out' \
  --exclude '.git' \
  --exclude '*.zip' \
  "$PROJ"/ "$STAGE"/

if [ -f "$STAGE/render.sh" ]; then
  echo "pack: using the project's own render.sh"
else
  cp "$REPO_ROOT/templates/render.sh" "$STAGE/render.sh"
  echo "pack: using templates/render.sh"
fi
chmod +x "$STAGE/render.sh"

OUT_ABS="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
rm -f "$OUT_ABS"
( cd "$STAGE" && zip -qr "$OUT_ABS" . )
echo "pack: wrote $OUT_ABS ($(du -h "$OUT_ABS" | cut -f1))"
