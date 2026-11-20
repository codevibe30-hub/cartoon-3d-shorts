#!/usr/bin/env python3
"""Speko TTS client (standalone) — calls https://api.speko.dev.

Usage:
  speko_tts.py voices [--provider cartesia]
  speko_tts.py say --text "..." --lang id --out out.wav [--voice Puck] [--model M]
                   [--instructions "..."] [--speed 1.0]

Auth: set the SPEKO_API_KEY environment variable (see .env.example).
The key is sent as an `Authorization: Bearer <key>` header and is never
written to disk or printed. Get a key at https://speko.dev.

The /v1/synthesize response is raw audio bytes; the format rides in the
Content-Type header (e.g. `audio/pcm;rate=24000`). PCM responses are wrapped
into a WAV at the parsed rate (default 24000 Hz); anything else is saved
as returned, so name --out with the matching extension.
"""
import argparse, json, os, sys, urllib.request, urllib.error

BASE = "https://api.speko.dev"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused, verify the endpoint")


def api_key():
    key = os.environ.get("SPEKO_API_KEY", "").strip()
    if not key:
        sys.exit("SPEKO_API_KEY is not set — copy .env.example to .env and fill it in.")
    return key


def call(method, path, body=None, timeout=120):
    data = None
    headers = {"Authorization": f"Bearer {api_key()}"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=timeout) as resp:
            return resp.status, {k.lower(): v for k, v in resp.getheaders()}, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("voices")
    v.add_argument("--provider", default=None)
    s = sub.add_parser("say")
    s.add_argument("--text", required=True)
    s.add_argument("--lang", default="id")
    s.add_argument("--voice", default=None)
    s.add_argument("--model", default=None)
    s.add_argument("--instructions", default=None)
    s.add_argument("--speed", type=float, default=None)
    s.add_argument("--out", required=True)
    args = ap.parse_args()

    if args.cmd == "voices":
        path = "/v1/voices" + (f"?provider={args.provider}" if args.provider else "")
        status, headers, raw = call("GET", path)
        print("HTTP", status)
        print(raw.decode("utf-8", "replace")[:12000])
        return

    body = {"text": args.text, "intent": {"language": args.lang}}
    if args.voice:
        body["voice"] = args.voice
    if args.model:
        body["model"] = args.model
    if args.instructions:
        body["instructions"] = args.instructions
    if args.speed:
        body["speed"] = args.speed
    status, headers, raw = call("POST", "/v1/synthesize", body)
    if status != 200:
        print("HTTP", status, raw.decode("utf-8", "replace")[:2000])
        sys.exit(1)
    ctype = (headers.get("content-type") or "").lower()
    info = {k: headers.get(k.lower()) for k in ("Content-Type", "X-Speko-Provider", "X-Speko-Model", "X-Speko-Failover-Count")}
    if "pcm" in ctype or "raw" in ctype:
        import re, wave
        m = re.search(r"rate=(\d+)", ctype)
        rate = int(m.group(1)) if m else 24000
        with wave.open(args.out, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(raw)
        info["pcm_rate"] = rate
    else:
        with open(args.out, "wb") as f:
            f.write(raw)
    info["bytes"] = len(raw)
    info["out"] = args.out
    print(json.dumps(info, indent=1))


if __name__ == "__main__":
    main()
