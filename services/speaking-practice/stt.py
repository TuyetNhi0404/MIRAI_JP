import asyncio
import subprocess
import json
import os
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv
load_dotenv()

WHISPER_BIN = os.getenv("WHISPER_BIN", "/usr/local/bin/whisper-cli")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "/models/ggml-base.bin")
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "auto")
WHISPER_THREADS = os.getenv("WHISPER_THREADS", "4")
WHISPER_SERVER_URL = os.getenv("WHISPER_SERVER_URL", "").rstrip("/")

_whisper_semaphore = asyncio.Semaphore(int(os.getenv("WHISPER_MAX_CONCURRENT", "2")))
_whisper_server_client = httpx.Client(timeout=60.0)


async def transcribe_audio(audio_path: str) -> tuple[str, float]:
    convert = not audio_path.lower().endswith(".wav")
    wav_path = _convert_to_wav(audio_path) if convert else None
    source_path = wav_path or audio_path
    try:
        if WHISPER_SERVER_URL:
            try:
                async with _whisper_semaphore:
                    return await asyncio.to_thread(_run_whisper_server, source_path)
            except httpx.HTTPError as error:
                print(f"[STT server] unavailable: {error}; falling back to whisper-cli")

        async with _whisper_semaphore:
            return await asyncio.to_thread(_run_whisper, source_path)
    finally:
        _cleanup_stt_temp(source_path, wav_path)


def _convert_to_wav(src: str) -> str:
    dst = src.rsplit(".", 1)[0] + ".wav"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", src, "-ar", "16000", "-ac", "1", "-sample_fmt", "s16", dst],
        capture_output=True,
        timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {proc.stderr.decode().strip()}")
    if not Path(dst).exists():
        raise RuntimeError(f"ffmpeg output not created: {dst}")
    return dst


def _cleanup_stt_temp(audio_path: str, wav_path: str | None = None) -> None:
    """Remove WAV conversion and whisper JSON sidecar files."""
    for p in [wav_path, f"{audio_path}.json"]:
        if p and Path(p).exists():
            try:
                Path(p).unlink()
            except Exception:
                pass


def _run_whisper(audio_path: str) -> tuple[str, float]:
    started_at = time.perf_counter()

    proc = subprocess.run(
        [
            WHISPER_BIN,
            "-m", WHISPER_MODEL,
            "-f", audio_path,
            "-l", WHISPER_LANGUAGE,
            "-t", WHISPER_THREADS,
            "--output-json-full",
            "--no-prints",
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"whisper.cpp error: {proc.stderr.strip()}")

    json_path = Path(f"{audio_path}.json")
    if not json_path.exists():
        return "", 0.5

    data = json.loads(json_path.read_text())
    segments = data.get("transcription", [])
    if not segments:
        return "", 0.5

    transcript = " ".join(s["text"].strip() for s in segments)

    token_probs: list[float] = []
    for seg in segments:
        tokens_field = seg.get("tokens", [])
        if not isinstance(tokens_field, list):
            continue
        for token in tokens_field:
            if isinstance(token, dict):
                p = token.get("p", 0)
            else:
                continue
            try:
                p_val = float(p)
            except (TypeError, ValueError):
                continue
            if p_val > 0:
                token_probs.append(p_val)

    if token_probs:
        confidence = sum(token_probs) / len(token_probs)
        confidence = min(1.0, max(0.0, confidence))
    else:
        confidence = 0.75

    transcript = transcript.strip()
    print(
        f"[STT] language={WHISPER_LANGUAGE} duration={time.perf_counter() - started_at:.2f}s "
        f"confidence={confidence:.2f} transcript={transcript[:240]!r}"
    )
    return transcript, confidence


def _run_whisper_server(audio_path: str) -> tuple[str, float]:
    started_at = time.perf_counter()
    with open(audio_path, "rb") as audio_file:
        response = _whisper_server_client.post(
            f"{WHISPER_SERVER_URL}/inference",
            files={
                "file": (Path(audio_path).name, audio_file, "application/octet-stream"),
                "language": (None, WHISPER_LANGUAGE),
                "response_format": (None, "verbose_json"),
            },
        )
    response.raise_for_status()
    data = response.json()

    segments = data.get("segments") or data.get("transcription") or []
    transcript = (data.get("text") or " ".join(
        str(segment.get("text", "")).strip() for segment in segments
    )).strip()

    token_probs: list[float] = []
    for segment in segments:
        tokens_field = segment.get("tokens", []) if isinstance(segment, dict) else []
        if not isinstance(tokens_field, list):
            continue
        for token in tokens_field:
            if not isinstance(token, dict):
                continue
            p = token.get("p", 0)
            try:
                p_val = float(p)
            except (TypeError, ValueError):
                continue
            if p_val > 0:
                token_probs.append(p_val)
    confidence = min(1.0, max(0.0, sum(token_probs) / len(token_probs))) if token_probs else 0.75
    print(
        f"[STT server] language={WHISPER_LANGUAGE} duration={time.perf_counter() - started_at:.2f}s "
        f"confidence={confidence:.2f} transcript={transcript[:240]!r}"
    )
    return transcript, confidence
