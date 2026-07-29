"""ElevenLabs TTS with JLPT-level voice profiles.

N5/N4 → slower, clearer, steadier (teaching pace)
N2/N1 → nearer natural conversational speed

ElevenLabs rejects speed outside ~0.7–1.2 on many models (400 Bad Request).
We clamp to that window and add phrase pauses for beginners instead of
going below 0.7.
"""

from __future__ import annotations

import os
import re
import time
import uuid
from pathlib import Path
from typing import Any

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

# ElevenLabs practical speed window (values outside often → HTTP 400).
SPEED_MIN = 0.70
SPEED_MAX = 1.20

# speed: 1.0 = default. Lower = slower (better for beginners).
# stability: higher = clearer / less dramatic (teaching voice).
LEVEL_VOICE_PROFILES: dict[str, dict[str, Any]] = {
    "N5": {
        "speed": 0.70,  # slowest ElevenLabs allows
        "stability": 0.78,
        "similarity_boost": 0.88,
        "style": 0.0,
        "use_speaker_boost": True,
    },
    "N4": {
        "speed": 0.78,
        "stability": 0.70,
        "similarity_boost": 0.85,
        "style": 0.05,
        "use_speaker_boost": True,
    },
    "N3": {
        "speed": 0.88,
        "stability": 0.58,
        "similarity_boost": 0.80,
        "style": 0.10,
        "use_speaker_boost": True,
    },
    "N2": {
        "speed": 0.98,
        "stability": 0.50,
        "similarity_boost": 0.75,
        "style": 0.15,
        "use_speaker_boost": True,
    },
    "N1": {
        "speed": 1.08,
        "stability": 0.45,
        "similarity_boost": 0.72,
        "style": 0.20,
        "use_speaker_boost": True,
    },
}


def normalize_level(level: str | None) -> str:
    lv = (level or "N5").upper().strip()
    return lv if lv in LEVEL_VOICE_PROFILES else "N5"


def clamp_speed(speed: float) -> float:
    return max(SPEED_MIN, min(SPEED_MAX, float(speed)))


def voice_settings_for_level(level: str | None) -> dict[str, Any]:
    settings = dict(LEVEL_VOICE_PROFILES[normalize_level(level)])
    settings["speed"] = clamp_speed(settings.get("speed", 1.0))
    return settings


def prepare_speech_text(text: str, level: str | None = "N5") -> str:
    """Light text shaping so beginners hear clearer phrase boundaries."""
    cleaned = (text or "").strip()
    if not cleaned:
        return ""

    lv = normalize_level(level)
    if lv == "N5":
        # Extra listening pauses (speed cannot go below 0.7 on ElevenLabs).
        cleaned = re.sub(r"、\s*", "、 … ", cleaned)
        cleaned = re.sub(r"([。！？])(?![…\s]|$)", r"\1 … ", cleaned)
        if cleaned.endswith(("。", "！", "？")):
            cleaned = cleaned + " …"
        cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    elif lv == "N4":
        cleaned = re.sub(r"([。！？])(?![…\s]|$)", r"\1 … ", cleaned)
        cleaned = re.sub(r"、\s*", "、 ", cleaned)
        cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned


def _post_tts(spoken: str, settings: dict[str, Any]) -> httpx.Response:
    return _tts_client.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
        headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
        json={
            "text": spoken,
            "model_id": ELEVENLABS_MODEL_ID,
            "voice_settings": settings,
        },
    )


def generate_audio(text: str, level: str | None = "N5") -> str:
    if not text or not text.strip():
        return ""
    # Never speak raw model JSON if a caller forgot to parse.
    stripped = text.lstrip()
    if stripped.startswith("{") and '"reply"' in stripped:
        print("[TTS] Refusing to speak JSON blob — caller should pass parsed reply only")
        return ""
    if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
        print("[TTS] ElevenLabs credentials missing; skipped.")
        return ""

    lv = normalize_level(level)
    spoken = prepare_speech_text(text, lv)
    settings = voice_settings_for_level(lv)
    cache_key = f"{lv}|{spoken}|{settings['speed']}"

    cached = _tts_cache.get(cache_key)
    if cached:
        url, ts = cached
        filename = url.rsplit("/", 1)[-1] if "/" in url else ""
        if filename and (UPLOAD_DIR / filename).exists() and (time.time() - ts) < _TTS_CACHE_TTL:
            return url
        _tts_cache.pop(cache_key, None)

    try:
        started_at = time.perf_counter()
        resp = _post_tts(spoken, settings)

        # Retry once with safe defaults if voice_settings rejected (common 400).
        if resp.status_code == 400:
            detail = (resp.text or "")[:400]
            print(f"[TTS] 400 with level settings ({detail!r}) — retrying safe defaults")
            safe = {
                "stability": 0.6,
                "similarity_boost": 0.8,
                "speed": clamp_speed(settings.get("speed", 0.85)),
                "use_speaker_boost": True,
            }
            resp = _post_tts(spoken, safe)
            settings = safe

        if resp.status_code >= 400:
            print(f"[TTS] ElevenLabs HTTP {resp.status_code}: {(resp.text or '')[:500]}")
            resp.raise_for_status()

        filename = f"{uuid.uuid4().hex}.mp3"
        output_path = UPLOAD_DIR / filename
        output_path.write_bytes(resp.content)
        print(
            f"[TTS] level={lv} speed={settings.get('speed')} "
            f"duration={time.perf_counter() - started_at:.2f}s "
            f"bytes={len(resp.content)} text={spoken[:240]!r}"
        )
        url = f"/audio/{filename}"

        if len(_tts_cache) >= _TTS_CACHE_MAX:
            oldest_key = min(_tts_cache, key=lambda k: _tts_cache[k][1])
            _tts_cache.pop(oldest_key, None)
        _tts_cache[cache_key] = (url, time.time())

        return url
    except Exception as e:
        print(f"[TTS] ElevenLabs error: {e}")
        return ""
