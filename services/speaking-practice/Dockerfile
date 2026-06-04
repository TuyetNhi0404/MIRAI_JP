# OCR + Speaking FastAPI — target image ~2–3 GB (CPU inference, no local venv in context)
#
# Inspect after build:
#   docker images mirai-ocr --format '{{.Repository}}:{{.Tag}}\t{{.Size}}'
#   docker history mirai-ocr --human --no-trunc
#   docker buildx du --verbose   # BuildKit layer sizes
#   docker run --rm mirai-ocr du -sh /app /usr/local/lib/python3.11/site-packages /app/.cache
#
# syntax=docker/dockerfile:1

ARG PREBAKE_MODELS=1

# -----------------------------------------------------------------------------
# Builder: CPU PyTorch first (easyocr otherwise pulls ~2 GB CUDA/nvidia wheels)
# -----------------------------------------------------------------------------
FROM python:3.11-slim-bookworm AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-docker.txt ./

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
        torch torchvision \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir opencv-python-headless \
    && pip install --no-cache-dir -r requirements-docker.txt

# -----------------------------------------------------------------------------
# Runtime: slim base + site-packages + explicit app COPY (no COPY . .)
# -----------------------------------------------------------------------------
FROM python:3.11-slim-bookworm AS runtime

ARG PREBAKE_MODELS=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface \
    EASYOCR_MODULE_PATH=/app/.cache/easyocr \
    TORCH_HOME=/app/.cache/torch

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY main.py stt.py llm.py coach.py tts.py sessions.py auth.py ./

RUN mkdir -p uploads /app/.cache/huggingface /app/.cache/easyocr /app/.cache/torch

# Bake Whisper + EasyOCR weights into image (~400–600 MB). Set PREBAKE_MODELS=0 for smaller image + cold start.
RUN if [ "$PREBAKE_MODELS" = "1" ]; then \
      python -c "\
from faster_whisper import WhisperModel; \
WhisperModel('base', device='cpu', compute_type='int8'); \
print('whisper base cached')"; \
      python -c "\
import easyocr; \
easyocr.Reader(['ja', 'en'], gpu=False, model_storage_directory='/app/.cache/easyocr'); \
print('easyocr models cached')"; \
    else \
      echo "PREBAKE_MODELS=0 — models download on first request"; \
    fi

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "600"]
