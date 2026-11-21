#!/usr/bin/env python3
"""Dispatch GitHub Actions render windows for this project.

Usage: gh_dispatch.py FROM:TO [FROM:TO ...]
Packs each window (pack_window.py), uploads to Muse storage, dispatches the
render.yml workflow with assets_url, and records run ids to
out/jobs-gh/<stamp>/runs.json (matched by dispatch order + creation time).
"""
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = "codevibe30-hub/cartoon-3d-shorts"
REMOTE_STORAGE = "/opt/hatch/bin/remote-storage"


def upload(path):
    out = subprocess.run([REMOTE_STORAGE, "upload-file", "--path", path],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)["url"]


def gh(*args):
    return subprocess.run(["gh", *args], capture_output=True, text=True, check=True).stdout


def main():
    wins = []
    for arg in sys.argv[1:]:
        a, b = arg.split(":")
        wins.append((int(a), int(b)))
    stamp = time.strftime("%Y%m%d-%H%M%S")
    zip_dir = os.path.join(ROOT, "out", "jobs-gh", stamp)
    os.makedirs(zip_dir, exist_ok=True)
    jobs = []
    for frm, to in wins:
        zp = os.path.join(zip_dir, f"job-{frm}-{to}.zip")
        subprocess.run([sys.executable, os.path.join(HERE, "pack_window.py"),
                        str(frm), str(to), zp], check=True, capture_output=True, text=True)
        url = upload(zp)
        before = json.loads(gh("run", "list", "-R", REPO, "--workflow", "render.yml",
                               "--limit", "30", "--json", "databaseId"))
        known = {r["databaseId"] for r in before}
        gh("workflow", "run", "render.yml", "-R", REPO, "-f", f"assets_url={url}")
        run_id = None
        for _ in range(20):
            time.sleep(3)
            runs = json.loads(gh("run", "list", "-R", REPO, "--workflow", "render.yml",
                                 "--limit", "30", "--json", "databaseId,createdAt"))
            new = [r for r in runs if r["databaseId"] not in known]
            if new:
                run_id = new[0]["databaseId"]
                break
        jobs.append({"from": frm, "to": to, "zip": zp, "url": url, "run_id": run_id})
        print(f"[dispatch] {frm}-{to} -> run {run_id}", flush=True)
        time.sleep(2)
    with open(os.path.join(zip_dir, "runs.json"), "w") as f:
        json.dump(jobs, f, indent=1)
    print("runs.json:", os.path.join(zip_dir, "runs.json"))


if __name__ == "__main__":
    main()
