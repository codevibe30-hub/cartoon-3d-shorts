#!/bin/bash
# Render ONE episode project end-to-end on a plain machine or a CI runner
# (used by .github/workflows/render.yml, but works anywhere with Node 20 + ffmpeg).
#
# Run it from the project root — the folder that contains package.json and,
# next to it, this render.sh. The job.zip contract: the finished video MUST
# end up as ./output.mp4 in this folder.
#
# Env knobs (same names as the local pipeline):
#   COMP_ID        Remotion composition id     (default: ExampleEpisode)
#   TOTAL_FRAMES   total frames of the episode (default: 1659)
#   CHUNK          frames per render chunk     (default: 75)
#   EPISODE_OUTPUT final file name             (default: output.mp4)
set -euo pipefail
cd "$(dirname "$0")"

export COMP_ID="${COMP_ID:-ExampleEpisode}"
export TOTAL_FRAMES="${TOTAL_FRAMES:-1659}"
export EPISODE_OUTPUT="${EPISODE_OUTPUT:-output.mp4}"
CHUNK="${CHUNK:-75}"

npm install --no-audit --no-fund

# Fetch the Chrome Headless Shell that scripts/render-chunks.mjs expects in
# node_modules/.remotion (no-op when already downloaded).
node -e "import('@remotion/renderer').then((m) => m.ensureBrowser()).then(() => console.log('chrome headless shell ready'))"

# Chunked render (already-valid chunks are skipped, so a re-run resumes).
node scripts/render-chunks.mjs "$CHUNK"

# Concat chunks + mux audio/mix.wav -> $EPISODE_OUTPUT
bash scripts/finalize.sh

ls -la "$EPISODE_OUTPUT"
