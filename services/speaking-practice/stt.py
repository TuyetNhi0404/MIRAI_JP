import asyncio
import subprocess
import json
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

WHISPER_BIN = os.getenv("WHISPER_BIN", "/usr/local/bin/whisper-cli")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "/models/ggml-small.bin")

async def transcribe_audio(audio_path: str) -> tuple[str, float]:
    return await asyncio.to_thread(_run_whisper, audio_path)

def _convert_to_wav(src: str) -> str:
    dst = src.rsplit(".", 1)[0] + ".wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", src, "-ar", "16000", "-ac", "1", "-sample_fmt", "s16", dst],
        capture_output=True,
        timeout=30,
    )
    return dst

def _run_whisper(audio_path: str) -> tuple[str, float]:
    convert = not audio_path.lower().endswith(".wav")
    wav_path = _convert_to_wav(audio_path) if convert else audio_path

    proc = subprocess.run(
        [
            WHISPER_BIN,
            "-m", WHISPER_MODEL,
            "-f", wav_path,
            "-l", "ja",
            "--output-json-full",
            "--no-prints",
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"whisper.cpp error: {proc.stderr.strip()}")

    json_path = Path(f"{wav_path}.json")
    if not json_path.exists():
        return "", 0.5

    data = json.loads(json_path.read_text())
    segments = data.get("transcription", [])
    if not segments:
        return "", 0.5

    transcript = " ".join(s["text"].strip() for s in segments)

    token_probs = []
    for seg in segments:
        for token in seg.get("tokens", []):
            p = token.get("p", 0)
            if p > 0:
                token_probs.append(p)

    if token_probs:
        confidence = sum(token_probs) / len(token_probs)
        confidence = min(1.0, max(0.0, confidence))
    else:
        confidence = 0.75

    return transcript.strip(), confidence
