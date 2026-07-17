import os
import time
import uuid
from pathlib import Path

import httpx

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "")
ELEVENLABS_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

_tts_client = httpx.Client(timeout=60.0)

_tts_cache: dict[str, tuple[str, float]] = {}
_TTS_CACHE_MAX = 512
_TTS_CACHE_TTL = 3600


def generate_audio(text: str) -> str:
    if not text or not text.strip():
        return ""
    if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
        print("[TTS] ElevenLabs credentials missing; skipped.")
        return ""

    cached = _tts_cache.get(text)
    if cached:
        url, ts = cached
        # Extract filename from /audio/{filename} and check if file still exists
        filename = url.rsplit("/", 1)[-1] if "/" in url else ""
        if filename and (UPLOAD_DIR / filename).exists() and (time.time() - ts) < _TTS_CACHE_TTL:
            return url
        _tts_cache.pop(text, None)

    try:
        started_at = time.perf_counter()
        resp = _tts_client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
            headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
            json={
                "text": text,
                "model_id": ELEVENLABS_MODEL_ID,
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
        )
        resp.raise_for_status()

        filename = f"{uuid.uuid4().hex}.mp3"
        output_path = UPLOAD_DIR / filename
        output_path.write_bytes(resp.content)
        print(
            f"[TTS] duration={time.perf_counter() - started_at:.2f}s "
            f"bytes={len(resp.content)} text={text[:240]!r}"
        )
        url = f"/audio/{filename}"

        if len(_tts_cache) >= _TTS_CACHE_MAX:
            # Evict oldest
            oldest_key = min(_tts_cache, key=lambda k: _tts_cache[k][1])
            _tts_cache.pop(oldest_key, None)
        _tts_cache[text] = (url, time.time())

        return url
    except Exception as e:
        print(f"[TTS] ElevenLabs error: {e}")
        return ""
