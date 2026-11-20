import numpy as np, json
from scipy.io import wavfile
SR = 24000
def load(p):
    sr, d = wavfile.read(p)
    assert sr == SR, (p, sr)
    if d.dtype == np.int16: d = d.astype(np.float32) / 32768.0
    return d
def trim(d, thr_db=-42.0, pad=0.04):
    thr = 10 ** (thr_db / 20.0)
    idx = np.where(np.abs(d) > thr)[0]
    if len(idx) == 0: return d
    a = max(0, idx[0] - int(pad * SR)); b = min(len(d), idx[-1] + int(pad * SR))
    return d[a:b]
lines = []
starts = []
pos = int(0.06 * SR)
gap = int(0.12 * SR)
out = [np.zeros(pos, dtype=np.float32)]
import glob
n = len(glob.glob("voice/lines/l*.wav"))
for i in range(1, n + 1):
    d = trim(load(f"voice/lines/l{i}.wav"))
    starts.append(pos / SR)
    out.append(d); pos += len(d)
    lines.append(len(d) / SR)
    out.append(np.zeros(gap, dtype=np.float32)); pos += gap
voice = np.concatenate(out)
dur = len(voice) / SR
print("assembled dur", round(dur, 3), "line durs", [round(x,2) for x in lines], "starts", [round(x,2) for x in starts])
wavfile.write("voice/voice_assembled.wav", SR, (voice * 32767).astype(np.int16))
json.dump({"starts": starts, "durs": lines, "total": dur}, open("voice/line_starts.json", "w"), indent=1)
