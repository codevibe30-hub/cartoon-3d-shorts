#!/usr/bin/env python3
"""Transfer files local machine <-> a Simular Box via an MCP helper CLI, without
dumping bytes to stdout.
put: local file -> box path (base64 parts via write_file, assembled by shell)
get: box path -> local file (base64 via read_file paging, sha256 verified)
Only summaries are printed.

The helper is any CLI compatible with:
  <helper> call-tool --name <shell|write_file|read_file> --arguments-file <json>
Point BOX_MCP_HELPER at it (see .env.example), or place it next to this script
as box_mcp.py. Simular Box access: https://box.simular.ai (optional — only needed
for hybrid renders).
"""
import base64, hashlib, json, subprocess, sys, os

HELPER = os.environ.get("BOX_MCP_HELPER") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "box_mcp.py")
TMP = "/tmp/box_xfer_args.json"

def call(tool, args):
    with open(TMP, "w") as f:
        json.dump(args, f)
    r = subprocess.run(["python3", HELPER, "call-tool", "--name", tool,
                        "--arguments-file", TMP], capture_output=True, text=True, timeout=660)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} failed rc={r.returncode}: {r.stderr[-500:]} {r.stdout[-500:]}")
    out = json.loads(r.stdout)
    if out.get("isError"):
        raise RuntimeError(f"{tool} isError: {json.dumps(out)[:500]}")
    return out["content"][0]["text"]

def shell(cmd, timeout_s=600):
    txt = call("shell", {"command": cmd, "timeout_s": timeout_s})
    if "\n[exit status" in txt:
        txt = txt.rsplit("\n[exit status", 1)[0]
    return txt

def put(local, remote):
    data = open(local, "rb").read()
    b64 = base64.b64encode(data).decode()
    PART = 200_000
    parts = [b64[i:i+PART] for i in range(0, len(b64), PART)] or [""]
    d = "/tmp/xfer_put"
    shell(f"rm -rf {d} && mkdir -p {d}")
    for i, p in enumerate(parts):
        call("write_file", {"path": f"{d}/part{i:03d}", "content": p})
    sha = hashlib.sha256(data).hexdigest()
    out = shell(f"cat {d}/part* | base64 -d > '{remote}' && sha256sum '{remote}' && wc -c < '{remote}' && rm -rf {d}")
    ok = sha in out
    print(f"put {local} -> {remote}: {len(data)} bytes, {len(parts)} parts, sha_ok={ok}")
    if not ok:
        raise RuntimeError(f"sha mismatch: box says {out!r}, want {sha}")

def get(remote, local):
    meta = shell(f"wc -c < '{remote}' && sha256sum '{remote}'")
    size_s, sha = meta.split()[0], meta.split()[1]
    size = int(size_s)
    nlines = int(shell(f"base64 -w 120 '{remote}' > /tmp/xfer_get.b64 && wc -l < /tmp/xfer_get.b64"))
    PAGE = 700
    buf = []
    off = 1
    while off <= nlines:
        txt = call("read_file", {"path": "/tmp/xfer_get.b64", "offset": off, "limit": PAGE})
        got = 0
        for line in txt.split("\n"):
            if "\t" not in line or line.startswith("[showing"):
                continue
            buf.append(line.split("\t", 1)[1])
            got += 1
        if got == 0:
            raise RuntimeError(f"read_file returned no lines at offset {off}")
        off += got
    data = base64.b64decode("".join(buf))
    got_sha = hashlib.sha256(data).hexdigest()
    ok = (len(data) == size and got_sha == sha)
    print(f"get {remote} -> {local}: {len(data)} bytes (want {size}), sha_ok={ok}")
    if not ok:
        raise RuntimeError("get verification failed")
    with open(local, "wb") as f:
        f.write(data)
    shell("rm -f /tmp/xfer_get.b64")

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "put":
        put(sys.argv[2], sys.argv[3])
    elif cmd == "get":
        get(sys.argv[2], sys.argv[3])
    elif cmd == "shell":
        print(shell(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 600))
    else:
        sys.exit(f"unknown cmd {cmd}")
