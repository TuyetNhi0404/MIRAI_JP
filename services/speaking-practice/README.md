# MIRAI Speaking Practice (FastAPI)

## Chạy local

```bash
cd services/speaking-practice
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # điền API keys
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Từ thư mục gốc repo (không cần Python cài sẵn):

```bash
npm run run          # lần đầu: tải Python + cài deps
npm run dev:fe       # terminal 1
npm run dev:be       # terminal 2
npm run dev:speaking # terminal 3
```

## Chạy local trên Windows

`npm run dev:speaking` tự bootstrap lần đầu: tải Python portable qua `uv`, tạo
venv/cài Python dependencies cho FastAPI, clone + build `whisper.cpp`, tải model
STT Whisper, cài MeloTTS CPU và clone + build `llama.cpp`. Bạn **không cần cài
Python toàn cục**.

Trước lần chạy đầu, cài và mở lại terminal để chúng có trong `PATH`:

- Git for Windows: <https://git-scm.com/download/win>
- CMake (chọn **Add CMake to PATH**): <https://cmake.org/download/>
- Microsoft C++ Build Tools (Desktop development with C++), để CMake build
  `whisper.cpp` và `llama.cpp`: <https://visualstudio.microsoft.com/visual-cpp-build-tools/>
- Node.js 18 trở lên.

Model LLM GGUF fine-tune không được script tải. Hãy gửi/chép model của bạn vào
thư mục `models/` ở root repo. Nếu thư mục có đúng một file `.gguf`, script tự
nhận. Nếu có nhiều model hoặc model nằm nơi khác, đặt biến môi trường trước khi
chạy PowerShell:

```powershell
$env:LOCAL_LLM_MODEL_PATH = 'D:\models\mirai-jp-finetuned.Q4_K_M.gguf'
npm run dev:speaking
```

Mặc định llama.cpp được build CPU và chạy `-ngl 0`. Nếu bạn tự build runtime có
CUDA/Vulkan, có thể đặt `LLAMA_GPU_LAYERS` (ví dụ `999`) trước khi chạy.

Khi chưa có GGUF, script vẫn chạy FastAPI + Whisper + MeloTTS và dùng Gemini/
OpenRouter fallback (nếu API key được điền trong `services/speaking-practice/.env`).

## MIRAI integration

- BE: `ENABLE_SPEAKING_PRACTICE=true`, `SPEAKING_INTERNAL_KEY` khớp với Python `.env`
- FE: `VITE_ENABLE_SPEAKING_PRACTICE=true`
- Route: `/dashboard/student/speaking-practice` → proxy `/api/speaking/*`
- Coach: `POST /coach/review-turn` — grammar review (JSON)
- Grammar notes: `GET/POST /api/speaking-notes` (Node BE + MongoDB)
