"""Miharashi music + SFX + mix, built on the house dsp/instruments/sfx_gen toolkit.
Bright bouncy tune (C major, 124 bpm) ducked under the voice; train/river SFX on the story
beats. Master: exactly the VO length, -14.0 LUFS integrated, true peak <= -1 dBTP.
Run: python3 audio/build_audio.py  (writes audio/music.wav, audio/sfx.wav, audio/mix.wav)"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import SR, ns, st, dbg, rng, place, lp, read_wav, write_wav, integrated, true_peak, norm_to
import instruments as ins
import sfx_gen as sfx
import timeline as tl

DUR = tl.TOTAL
N = ns(DUR)
BPM = 124.0
BEAT = 60.0 / BPM
BAR = BEAT * 4
N_BARS = int(np.ceil(DUR / BAR))
ROOT = 130.81  # C3
CHORDS = [(0, 4, 7), (5, 9, 0), (0, 4, 7), (7, 11, 2),
          (0, 4, 7), (5, 9, 0), (7, 11, 2), (0, 4, 7)]
PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
R = rng(7)


def _r():
    return rng(int(R.integers(1, 1 << 30)))


def hz(semi):
    return ROOT * 2 ** (semi / 12.0)


def music():
    out = np.zeros((2, N))
    for bar in range(N_BARS):
        ch = CHORDS[bar % len(CHORDS)]
        place(out, ins.pad([hz(s) for s in ch], BAR * 1.05, 0.16, _r()), bar * BAR)
        place(out, ins.pluck(hz(ch[0]) / 2, 0.5, _r(), dur=0.5), bar * BAR)
        place(out, ins.pluck(hz(ch[0]) / 2, 0.45, _r(), dur=0.5), bar * BAR + 2 * BEAT)
        place(out, ins.pluck(hz(ch[2]) / 2, 0.4, _r(), dur=0.45), bar * BAR + 3 * BEAT)
        for e in range(8):
            if R.random() < 0.22:
                continue
            idx = int(R.integers(2, len(PENT) - 2))
            if e in (0, 4):
                idx = 4 + (bar % 3)
            place(out, ins.pluck(hz(PENT[idx] + 12), 0.3, _r(), dur=0.34), bar * BAR + e * BEAT / 2)
        if bar % 2 == 0:
            place(out, ins.glock(hz(ch[1]) * 4, 0.14, _r()), bar * BAR)
        for b in range(4):
            place(out, ins.timpani(55.0, 0.5, _r(), dur=0.5), bar * BAR + b * BEAT)
            if b in (1, 3):
                place(out, ins.snare(0.32, _r()), bar * BAR + b * BEAT)
        for e in range(8):
            place(out, ins.brush(0.1, _r(), dur=0.12), bar * BAR + e * BEAT / 2)
    for k in tl.kicks():
        place(out, ins.timpani(49.0, 0.6, _r(), dur=0.9), k)
    out = lp(out, 9000)
    return norm_to(out, -24.0, mode="integrated")


def crowd_cheer(dur_s, people=5, base=170.0):
    """a little crowd of synthesized voices cheering, spread over dur_s"""
    n = ns(dur_s)
    out = np.zeros((2, n))
    r = _r()
    for i in range(people):
        t0 = r.uniform(0, max(0.05, dur_s - 0.7))
        place(out, sfx.hurrah(_r(), base * r.uniform(0.85, 1.2), 1.0), t0, gain=0.5)
    return out


def sfx_track():
    out = np.zeros((2, N))
    ev = [
        (0.4, sfx.bird_chirps(3.5, _r(), density=0.3), 0.16),       # morning over the river
        (1.05, sfx.whoosh(0.9, _r()), 0.4),                         # the train slides in
        (1.92, sfx.clink(_r()), 0.5),                               # brakes: full stop
        (4.5, sfx.whoosh(0.8, _r()), 0.45),                         # it leaves him behind
        (17.5, sfx.whoosh(1.4, _r()), 0.22),                        # the little works train crawls past
        (20.2, sfx.clink(_r()), 0.25),
        (25.25, sfx.whoosh(1.1, _r()), 0.65),                       # the regular train blasts through...
        (26.9, sfx.whoosh(1.0, _r()), 0.5),                         # ...and is gone
        (35.6, sfx.bubbles(0.8, _r(), 20.0), 0.4),                  # the twist sparkle
        (40.3, sfx.bird_chirps(3.0, _r(), density=0.35), 0.15),     # the view: birds over the water
        (41.0, sfx.bubbles(1.2, _r(), 16.0), 0.22),                 # river sparkle
        (45.95, crowd_cheer(1.4, people=4), 0.3),                   # an audience of two, delighted
        (51.35, sfx.whoosh(0.9, _r()), 0.4),                        # the next train arrives
        (53.32, sfx.clink(_r()), 0.5),                              # full stop
        (54.0, sfx.bubbles(0.9, _r(), 18.0), 0.3),                  # he boards, happy
    ]
    for t0, w, g in ev:
        place(out, w, t0, gain=g)
    # river-valley babble bed under the quiet middle scenes, kept very low
    for t0, d in [(29.6, 5.9), (40.2, 5.6)]:
        place(out, sfx.babble(d, _r(), 150.0, 1.0), t0, gain=0.1)
    return norm_to(out, -16.0, mode="momentary")


def duck_env(voice, depth_db=6.0, atk=0.05, rel=0.35):
    n = len(voice)
    env = np.abs(voice)
    k = int(0.01 * SR)
    env = np.convolve(env, np.ones(k) / k, mode="same")
    target = np.where(env > 0.02, 10 ** (-depth_db / 20.0), 1.0)
    g = np.ones(n)
    ca, cr = np.exp(-1.0 / (atk * SR)), np.exp(-1.0 / (rel * SR))
    cur = 1.0
    for i in range(n):
        c = ca if target[i] < cur else cr
        cur = target[i] + (cur - target[i]) * c
        g[i] = cur
    return g


def limit(x, ceiling_db=-1.05):
    """simple look-ahead peak limiter on a (2, n) buffer: gain envelope from the peak overshoot,
    min-filtered for lookahead, release-smoothed; keeps loudness instead of a global gain cut"""
    from scipy.ndimage import minimum_filter1d
    ceil = dbg(ceiling_db)
    peak = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, ceil / np.maximum(peak, 1e-12))
    g = minimum_filter1d(g, size=int(0.005 * SR), mode="nearest")
    cr = np.exp(-1.0 / (0.25 * SR))
    out = np.empty_like(g)
    cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * cr
        out[i] = cur
    return x * out


def main():
    mus = music()
    sfxw = sfx_track()
    write_wav("audio/music.wav", mus)
    write_wav("audio/sfx.wav", sfxw)
    vx, sr = read_wav("voice/voice.wav")
    voice = vx[0] if vx.shape[0] == 1 else vx.mean(0)
    if sr != SR:
        from scipy.signal import resample_poly
        from math import gcd
        g0 = gcd(sr, SR)
        voice = resample_poly(voice, SR // g0, sr // g0)
    vbuf = np.zeros(N)
    vbuf[: min(N, len(voice))] = voice[:N]
    g = duck_env(vbuf)
    mix = st(vbuf) + mus * g + sfxw * (0.55 + 0.45 * g)
    mix = norm_to(mix, -14.0, mode="integrated")
    mix = limit(mix)
    tp = true_peak(mix)
    if tp > -1.0:
        mix = mix * dbg(-1.05 - tp)
    write_wav("audio/mix.wav", mix)
    print(f"mix: {DUR:.2f}s  LUFS {integrated(mix):.2f}  TP {true_peak(mix):.2f} dBTP")


if __name__ == "__main__":
    main()
