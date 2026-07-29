#!/usr/bin/env python3
"""Live smoke: continuous streaming conversation (/stream), NOT hold-to-talk.

Mirrors FE mode \"Liên tục\":
  1) one long-lived WebSocket /stream
  2) chunked binary audio (~250ms slices)
  3) JSON {\"type\":\"stop_talking\"} after speech
  4) wait for done → start next turn on SAME socket
"""

from __future__ import annotations

import argparse
import asyncio
import json
import time
from pathlib import Path

import websockets

DEFAULT_URL = "ws://127.0.0.1:8000/stream"
AUTH = {
    "x-speaking-internal-key": "mirai-speaking-dev-key",
    "x-user-id": "stream-smoke-user",
}


def chunk_bytes(data: bytes, size: int = 1500) -> list[bytes]:
    return [data[i : i + size] for i in range(0, len(data), size)] or [b"\x00"]


async def one_turn(
    ws,
    audio_path: Path,
    turn_idx: int,
    *,
    chunk_delay: float = 0.05,
    turn_timeout: float = 90.0,
) -> dict:
    raw = audio_path.read_bytes()
    chunks = chunk_bytes(raw, 1800)
    t0 = time.perf_counter()
    print(f"\n=== Turn {turn_idx} · {audio_path.name} · {len(chunks)} chunks · {len(raw)} bytes ===")

    for i, c in enumerate(chunks):
        await ws.send(c)
        if chunk_delay:
            await asyncio.sleep(chunk_delay)
        if i == 0 or i == len(chunks) - 1 or (i + 1) % 5 == 0:
            print(f"  sent chunk {i + 1}/{len(chunks)} ({len(c)} B)")

    await ws.send(json.dumps({"type": "stop_talking"}))
    print("  → stop_talking")

    events: list[str] = []
    transcript = ""
    reply_chars = 0
    audio_chunks = 0
    error = None
    deadline = time.perf_counter() + turn_timeout

    while time.perf_counter() < deadline:
        remaining = deadline - time.perf_counter()
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except asyncio.TimeoutError:
            error = "timeout waiting for done"
            break

        if isinstance(msg, bytes):
            events.append("binary?")
            continue

        data = json.loads(msg)
        typ = data.get("type", "?")
        events.append(typ)

        if typ == "status":
            print(f"  status: {data.get('message')}")
        elif typ == "transcript_partial":
            print(f"  partial: {(data.get('text') or '')[:80]!r}")
        elif typ == "transcript":
            transcript = data.get("text") or ""
            print(f"  transcript: {transcript[:120]!r}")
        elif typ == "llm_token":
            reply_chars += len(data.get("text") or "")
        elif typ == "audio_chunk":
            audio_chunks += 1
            print(f"  audio_chunk: {data.get('url')}")
        elif typ == "stats":
            print(f"  stats: level={data.get('level')} score={data.get('score')}")
        elif typ == "grammar_feedback":
            sev = (data.get("grammar_feedback") or {}).get("severity")
            print(f"  grammar: severity={sev}")
        elif typ == "error":
            error = data.get("message") or "error"
            print(f"  ERROR: {error}")
            break
        elif typ == "done":
            break

    elapsed = time.perf_counter() - t0
    ok = error is None and "done" in events
    result = {
        "turn": turn_idx,
        "ok": ok,
        "elapsed_s": round(elapsed, 2),
        "transcript": transcript,
        "reply_chars": reply_chars,
        "audio_chunks": audio_chunks,
        "events": events,
        "error": error,
    }
    print(
        f"  ← done={ok} in {elapsed:.1f}s · reply_chars={reply_chars} · "
        f"audio={audio_chunks} · events={events}"
    )
    return result


async def run_session(url: str, audio_files: list[Path], settle: float) -> int:
    print(f"Connecting continuous stream session → {url}")
    print(f"Turns: {len(audio_files)} (same WebSocket, like FE Liên tục)")

    async with websockets.connect(
        url,
        additional_headers=AUTH,
        max_size=8 * 1024 * 1024,
        open_timeout=10,
        close_timeout=5,
    ) as ws:
        print("WS open — session active")
        results = []
        for i, path in enumerate(audio_files, start=1):
            results.append(await one_turn(ws, path, i))
            if i < len(audio_files) and settle:
                # FE waits for TTS queue empty then restarts mic (~200ms)
                await asyncio.sleep(settle)
                print(f"  (settle {settle}s — resume listening)")

        # Socket must still be alive after multi-turn continuous session
        try:
            await ws.ping()
            alive = True
        except Exception:
            alive = False

    ok_n = sum(1 for r in results if r["ok"])
    print("\n========== SUMMARY ==========")
    for r in results:
        status = "OK" if r["ok"] else "FAIL"
        print(
            f"  turn {r['turn']}: {status} {r['elapsed_s']}s "
            f"transcript={r['transcript'][:60]!r} err={r['error']}"
        )
    print(f"  socket alive after session: {alive}")
    print(f"  passed {ok_n}/{len(results)}")
    return 0 if ok_n == len(results) and alive else 1


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--url", default=DEFAULT_URL)
    p.add_argument("--settle", type=float, default=0.4, help="pause between turns")
    p.add_argument(
        "audio",
        nargs="*",
        type=Path,
        default=[
            Path("/tmp/mirai_stream_smoke/turn1.webm"),
            Path("/tmp/mirai_stream_smoke/turn2.webm"),
            Path("/tmp/mirai_stream_smoke/turn3.webm"),
        ],
    )
    args = p.parse_args()
    missing = [a for a in args.audio if not a.exists()]
    if missing:
        raise SystemExit(f"missing audio: {missing}")
    raise SystemExit(asyncio.run(run_session(args.url, args.audio, args.settle)))


if __name__ == "__main__":
    main()
