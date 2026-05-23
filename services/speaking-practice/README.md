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

Hoặc từ `BE/`: `npm run dev:speaking`

## MIRAI integration

- BE: `ENABLE_SPEAKING_PRACTICE=true`, `SPEAKING_INTERNAL_KEY` khớp với Python `.env`
- FE: `VITE_ENABLE_SPEAKING_PRACTICE=true`
- Route: `/dashboard/student/speaking-practice` → proxy `/api/speaking/*`
