import json, wave, numpy as np
from faster_whisper import WhisperModel
wf = wave.open("voice/voice16k.wav")
n = wf.getnframes()
d = np.frombuffer(wf.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, info = m.transcribe(d, language="id", word_timestamps=True, vad_filter=False)
words = []
for s in segs:
    for w in (s.words or []):
        words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
json.dump(words, open("voice/words.json", "w"), indent=1)
print(len(words), "words")
for w in words: print(w["s"], w["w"])
