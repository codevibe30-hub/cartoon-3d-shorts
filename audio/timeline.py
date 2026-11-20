"""Miharashi mix timeline: the voice line starts (music grid + ducking) and the kick times,
all read from the actual voice assembly, never hand-copied."""
import json, os

_VOICE = json.load(open(os.path.join(os.path.dirname(__file__), "..", "voice", "line_starts.json")))
STARTS = _VOICE["starts"]
TOTAL = _VOICE["total"]

# the moments the picture lands a hit: the first train stop, the pass-through blast,
# the twist reveal, the final train stop
KICKS = [1.9, 26.8, 35.64, 53.3]


def kicks():
    return KICKS
