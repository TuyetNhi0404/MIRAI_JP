import os
import time
import httpx
import uuid
from pathlib import Path

MELO_TTS_URL = os.getenv("MELO_TTS_URL", "http://melo-tts:8001")
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def _contains_vietnamese(text: str) -> bool:
    """Melo is Japanese-only; Vietnamese must remain text-only."""
    return any(char in text.lower() for char in "ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ")


def generate_audio(text: str) -> str:
    """Call MeloTTS local, return URL path of saved MP3."""
    if not text or not text.strip():
        return ""
    if _contains_vietnamese(text):
        print("[TTS] Skipped Vietnamese response; Japanese-only voice is enabled.")
        return ""

    try:
        started_at = time.perf_counter()
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{MELO_TTS_URL}/tts",
                json={
                    "text": text,
                    "language": "JA",
                    "speed": 1.0,
                }
            )
            resp.raise_for_status()

        filename = f"{uuid.uuid4().hex}.mp3"
        output_path = UPLOAD_DIR / filename
        output_path.write_bytes(resp.content)
        print(
            f"[TTS] duration={time.perf_counter() - started_at:.2f}s "
            f"bytes={len(resp.content)} text={text[:240]!r}"
        )
        return f"/audio/{filename}"
    except Exception as e:
        print(f"[TTS] MeloTTS error: {e}")
        return ""
