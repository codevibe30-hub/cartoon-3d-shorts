#!/usr/bin/env python3
"""Pull finished GitHub Actions render artifacts into out/chunks/ + verify.

Usage: gh_pull.py <runs.json>
For every job in runs.json whose run completed with success and whose chunks
are not all on disk yet: download artifact 'hasil-render' (output.mp4, itself a
ZIP of chunk-*.mp4), extract into out/chunks/, ffprobe-verify every chunk.
Prints a summary line per job; exits 0 always (caller decides completeness).
"""
import io
import json
import os
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = "codevibe30-hub/cartoon-3d-shorts"


def gh(*args):
    return subprocess.run(["gh", *args], capture_output=True, text=True).stdout


def frames_of(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
         "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", path],
        capture_output=True, text=True)
    try:
        return int(out.stdout.strip())
    except ValueError:
        return -1


def main():
    raw = json.load(open(sys.argv[1]))
    runs = raw["jobs"] if isinstance(raw, dict) else raw
    status = {r["databaseId"]: (r["status"], r["conclusion"]) for r in json.loads(
        gh("run", "list", "-R", REPO, "--workflow", "render.yml", "--limit", "100",
           "--json", "databaseId,status,conclusion"))}
    chunks_dir = os.path.join(ROOT, "out", "chunks")
    os.makedirs(chunks_dir, exist_ok=True)
    for j in runs:
        frm, to, rid = j["from"], j["to"], j["run_id"]
        want = []
        a = frm
        while a < to:
            b = min(a + 75, to) - 1
            want.append((f"chunk-{a:04d}-{b:04d}.mp4", b - a + 1))
            a += 75
        have = all(os.path.exists(os.path.join(chunks_dir, n)) and frames_of(os.path.join(chunks_dir, n)) == c for n, c in want)
        if have:
            print(f"[have] {frm}-{to} (run {rid}) all {len(want)} chunks verified on disk")
            continue
        st, concl = status.get(rid, ("?", None))
        if st != "completed":
            print(f"[wait] {frm}-{to} (run {rid}) status={st}")
            continue
        if concl != "success":
            print(f"[FAIL] {frm}-{to} (run {rid}) conclusion={concl}")
            continue
        dest = os.path.join(ROOT, "out", "gh-pull", str(rid))
        os.makedirs(dest, exist_ok=True)
        r = subprocess.run(["gh", "run", "download", str(rid), "-R", REPO, "-n", "hasil-render", "-D", dest],
                           capture_output=True, text=True)
        outp = os.path.join(dest, "output.mp4")
        if r.returncode != 0 or not os.path.exists(outp):
            print(f"[FAIL] {frm}-{to} (run {rid}) download: {r.stderr[-200:]}")
            continue
        with open(outp, "rb") as fh:
            data = fh.read()
        try:
            z = zipfile.ZipFile(io.BytesIO(data))
            names = [n for n in z.namelist() if n.startswith("chunk-") and n.endswith(".mp4")]
            for n in names:
                z.extract(n, chunks_dir)
        except zipfile.BadZipFile:
            print(f"[FAIL] {frm}-{to} (run {rid}) output.mp4 is not a zip and not handled")
            continue
        bad = []
        for n, c in want:
            got = frames_of(os.path.join(chunks_dir, n))
            if got != c:
                bad.append(f"{n}: want {c}, got {got}")
        if bad:
            print(f"[FAIL] {frm}-{to} (run {rid}) verify: {bad}")
        else:
            print(f"[done] {frm}-{to} (run {rid}) {len(want)} chunks landed + verified")


if __name__ == "__main__":
    main()
