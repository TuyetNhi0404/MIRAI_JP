from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import io

app = FastAPI(title="MeloTTS Service")


class TTSRequest(BaseModel):
    text: str
    language: str = "JP"
    speed: float = 1.0


_tts_model = None

def get_model():
    global _tts_model
    if _tts_model is not None:
        return _tts_model
    try:
        from melo.api import TTS
        _tts_model = TTS(language="JP", device="cpu")
        return _tts_model
    except Exception as e:
        import traceback
        print(f"[MeloTTS] Failed to load model:\n{traceback.format_exc()}")
        return None


@app.post("/tts")
def synthesize(req: TTSRequest):
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="TTS model not available")
    speaker_ids = model.hps.data.spk2id
    speaker_id = speaker_ids["JP"] if "JP" in speaker_ids else list(speaker_ids.values())[0]
    bio = io.BytesIO()
    model.tts_to_file(req.text, speaker_id, bio, speed=req.speed, format="mp3")
    bio.seek(0)
    return Response(content=bio.read(), media_type="audio/mpeg")


@app.get("/health")
def health():
    model = get_model()
    return {"status": "ok", "tts_ready": model is not None}
