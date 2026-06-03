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

## MIRAI integration

- BE: `ENABLE_SPEAKING_PRACTICE=true`, `SPEAKING_INTERNAL_KEY` khớp với Python `.env`
- FE: `VITE_ENABLE_SPEAKING_PRACTICE=true`
- Route: `/dashboard/student/speaking-practice` → proxy `/api/speaking/*`
- Coach: `POST /coach/review-turn` — grammar review (JSON)
- Grammar notes: `GET/POST /api/speaking-notes` (Node BE + MongoDB)
