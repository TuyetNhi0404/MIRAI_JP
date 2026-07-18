# OCR + Speaking FastAPI — local AI stack (whisper.cpp + llama.cpp + MeloTTS)
#
# Build:
#   docker build -t mirai-ocr ./services/speaking-practice
#
# syntax=docker/dockerfile:1

ARG PREBAKE_MODELS=1

# -----------------------------------------------------------------------------
# Stage 1: Build whisper.cpp from source
# -----------------------------------------------------------------------------
FROM python:3.11-slim-bookworm AS whisper-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    git build-essential cmake \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth=1 https://github.com/ggerganov/whisper.cpp /tmp/whisper.cpp \
    && cd /tmp/whisper.cpp \
    && cmake -B build -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON \
    && cmake --build build --config Release -j$(nproc) \
    && cp build/bin/whisper-cli /usr/local/bin/whisper-cli \
    && rm -rf /tmp/whisper.cpp

# Download whisper model
RUN mkdir -p /models && \
    curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin" \
    -o /models/ggml-medium.bin

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
# Runtime: slim base + site-packages + explicit app COPY
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
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface \
    EASYOCR_MODULE_PATH=/app/.cache/easyocr \
    TORCH_HOME=/app/.cache/torch

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy whisper.cpp binary and model from whisper-builder
COPY --from=whisper-builder /usr/local/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=whisper-builder /models/ggml-medium.bin /models/ggml-medium.bin

COPY main.py stt.py llm.py coach.py tts.py sessions.py auth.py ./

RUN mkdir -p uploads /app/.cache/huggingface /app/.cache/easyocr /app/.cache/torch

# Bake EasyOCR weights into image (~400-600 MB)
RUN if [ "$PREBAKE_MODELS" = "1" ]; then \
      python -c "\
import easyocr; \
easyocr.Reader(['ja', 'en'], gpu=False, model_storage_directory='/app/.cache/easyocr'); \
print('easyocr models cached')"; \
    else \
      echo "PREBAKE_MODELS=0 — models download on first request"; \
    fi

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "600"]
