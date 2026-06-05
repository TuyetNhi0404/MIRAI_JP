import os

# Local dev: project .hf_cache; Docker: HF_HOME=/app/.cache/huggingface (set in Dockerfile)
if "HF_HOME" not in os.environ:
    os.environ["HF_HOME"] = os.path.abspath(
        os.path.join(os.path.dirname(__file__), ".hf_cache")
    )

from faster_whisper import WhisperModel

model_size = "small"
model = WhisperModel(model_size, device="cpu", compute_type="int8")

def transcribe_audio(audio_path: str):
    segments, info = model.transcribe(audio_path, beam_size=1, language="ja", vad_filter=True)
    text = "".join([segment.text for segment in segments])
    return text.strip(), info.language_probability
