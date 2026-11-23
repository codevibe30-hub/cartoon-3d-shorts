#!/usr/bin/env python3
"""Dispatch GitHub Actions render windows DIRECTLY FROM THE REPO.

Usage: gh_dispatch_repo.py --local <project-dir> [--name <repo-name>]
                           [--repo-dir <checkout>] [--ref <git-ref>]
                           FROM:TO [FROM:TO ...]

Syncs the local project folder into the repo checkout at
projects/<name>/ (source + public assets only: no node_modules, no out/,
no audio/, no voice/), commits + pushes if anything changed, then
dispatches render.yml with project_path + from_frame/to_frame.
NO pack_window.py, NO job.zip, NO Muse storage upload.

Run ids are recorded to <project-dir>/out/jobs-gh-repo/<stamp>/runs.json
in the same format gh_pull.py consumes ({"from","to","run_id"} per job),
so the existing gh_pull.py pulls repo-path artifacts unchanged.

WINDOW CONVENTION — HALF-OPEN [FROM, TO): TO is the first frame NOT
rendered, exactly like the workflow input comment and render-chunks.mjs.
One 75-frame chunk starting at frame 0 is written 0:75, two chunks 0:150.
NEVER write inclusive windows (0:74): every window silently loses its
last frame. (2026-11-22: 22 chunks lost their last frame this
way and needed 22 extra 1-frame patch runs.) Window sizes must be a
multiple of 75; a partial tail window needs --allow-partial.
"""
import argparse
import json
import os
import subprocess
import sys
import time

REPO = "codevibe30-hub/cartoon-3d-shorts"
DEFAULT_REPO_DIR = os.path.expanduser("~/workspace/github-release/cartoon-3d-shorts")

SYNC_EXCLUDES = [
    "--exclude", "node_modules",
    "--exclude", "out",
    "--exclude", ".git",
    "--exclude", "__pycache__",
    "--exclude", "audio",
    "--exclude", "voice",
    "--exclude", "*.log",
    "--exclude", "scripts/box_xfer.py",
]


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, check=True, **kw).stdout


def gh(*args):
    return run(["gh", *args])


def sync_project(local, repo_dir, name):
    dest = os.path.join(repo_dir, "projects", name)
    os.makedirs(dest, exist_ok=True)
    # No --delete-excluded: excluded files (e.g. scripts/box_xfer.py) are
    # neither synced nor deleted on either side.
    subprocess.run(["rsync", "-a", *SYNC_EXCLUDES, local.rstrip("/") + "/", dest + "/"],
                   check=True, capture_output=True, text=True)
    run(["git", "-C", repo_dir, "add", f"projects/{name}"])
    status = run(["git", "-C", repo_dir, "status", "--porcelain", f"projects/{name}"])
    if status.strip():
        stamp = time.strftime("%Y%m%d-%H%M%S")
        run(["git", "-C", repo_dir, "commit", "-m", f"projects/{name}: sync for repo render {stamp}"])
        run(["git", "-C", repo_dir, "push"])
        print(f"[sync] projects/{name} committed + pushed", flush=True)
    else:
        print(f"[sync] projects/{name} already up to date", flush=True)


CHUNK = 75


def validate_windows(wins, allow_partial):
    """Guard against the inclusive-window trap (see module docstring).

    Windows are half-open [FROM, TO). Every window size must be a
    positive multiple of CHUNK unless --allow-partial is given (tail
    window at the end of a comp). Raises SystemExit on any violation,
    before anything is synced or dispatched.
    """
    for frm, to in wins:
        size = to - frm
        if size <= 0:
            raise SystemExit(
                f"[window] {frm}:{to} invalid — TO must be greater than FROM "
                f"(half-open [FROM, TO): TO is the first frame NOT rendered)")
        if size % CHUNK != 0 and not allow_partial:
            raise SystemExit(
                f"[window] {frm}:{to} spans {size} frames — not a multiple of "
                f"{CHUNK}. Windows are half-open [FROM, TO): a {CHUNK}-frame "
                f"chunk from {frm} is written {frm}:{frm + CHUNK}, NOT "
                f"{frm}:{frm + CHUNK - 1} (inclusive windows lose the last "
                f"frame of every chunk). If this is a partial TAIL window, "
                f"re-run with --allow-partial.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", required=True, help="local project folder (e.g. ~/workspace/cartoon-3d/tuna-40m)")
    ap.add_argument("--name", default=None, help="repo folder name under projects/ (default: basename of --local)")
    ap.add_argument("--repo-dir", default=DEFAULT_REPO_DIR, help="local checkout of the repo")
    ap.add_argument("--ref", default=None, help="optional git ref for the runner checkout")
    ap.add_argument("--allow-partial", action="store_true",
                    help="allow window sizes that are not a multiple of 75 (partial tail window only)")
    ap.add_argument("windows", nargs="+",
                    help="frame windows FROM:TO, half-open [FROM, TO): TO = first frame NOT rendered (75-frame chunk from 0 = 0:75)")
    args = ap.parse_args()

    local = os.path.abspath(os.path.expanduser(args.local))
    name = args.name or os.path.basename(local)
    project_path = f"projects/{name}"

    wins = []
    for arg in args.windows:
        a, b = arg.split(":")
        wins.append((int(a), int(b)))
    validate_windows(wins, args.allow_partial)

    sync_project(local, args.repo_dir, name)

    stamp = time.strftime("%Y%m%d-%H%M%S")
    out_dir = os.path.join(local, "out", "jobs-gh-repo", stamp)
    os.makedirs(out_dir, exist_ok=True)
    jobs = []
    for frm, to in wins:
        before = json.loads(gh("run", "list", "-R", REPO, "--workflow", "render.yml",
                               "--limit", "30", "--json", "databaseId"))
        known = {r["databaseId"] for r in before}
        fields = ["-f", f"project_path={project_path}",
                  "-f", f"from_frame={frm}", "-f", f"to_frame={to}"]
        if args.ref:
            fields += ["-f", f"ref={args.ref}"]
        gh("workflow", "run", "render.yml", "-R", REPO, *fields)
        run_id = None
        for _ in range(20):
            time.sleep(3)
            runs = json.loads(gh("run", "list", "-R", REPO, "--workflow", "render.yml",
                                 "--limit", "30", "--json", "databaseId,createdAt"))
            new = [r for r in runs if r["databaseId"] not in known]
            if new:
                run_id = new[0]["databaseId"]
                break
        jobs.append({"from": frm, "to": to, "run_id": run_id, "path": "repo",
                     "project_path": project_path})
        print(f"[dispatch] {project_path} {frm}-{to} -> run {run_id}", flush=True)
        time.sleep(2)
    with open(os.path.join(out_dir, "runs.json"), "w") as f:
        json.dump(jobs, f, indent=1)
    print("runs.json:", os.path.join(out_dir, "runs.json"))


if __name__ == "__main__":
    main()
