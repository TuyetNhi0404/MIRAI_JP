from fastapi import Depends, FastAPI, File, UploadFile, Form, WebSocket, HTTPException
from starlette.websockets import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil
import os
import uuid
import asyncio
import time
from pathlib import Path
from pydantic import BaseModel

from auth import authenticate_websocket, get_current_user_id
from sessions import get_session, store_session, reset_user_session, update_score, add_history
from stt import transcribe_audio
from llm import get_reply_and_grammar, translate_japanese_to_vietnamese
from tts import generate_audio
from dialogue_manager import evaluate_turn
from composer import compose_response
from sanitizer import is_injection, sanitize_transcript
from topics import suggest_topics
from vocabulary import vocabulary_answer, vocabulary_result
from stream_handler import handle_stream
from ws_push import registry as ws_registry


def _derive_text_confidence(grammar_feedback: dict) -> float:
    severity = grammar_feedback.get("severity", "none")
    if severity == "none":
        return 0.85
    if severity == "minor":
        return 0.70
    if severity == "should_fix":
        return 0.55
    if severity == "important":
        return 0.35
    return 0.70


app = FastAPI(title="MIRAI Speaking Practice")

_app_started = False


@app.on_event("startup")
async def warmup():
    global _app_started
    if _app_started:
        return
    _app_started = True
    print("[speaking] Service started")

    async def _cleanup_old_audio():
        while True:
            try:
                now = time.time()
                uploads = Path("uploads")
                if uploads.exists():
                    for f in uploads.iterdir():
                        if f.is_file() and f.suffix in (".mp3", ".wav", ".json", ".webm"):
                            if now - f.stat().st_mtime > 3600:
                                try:
                                    f.unlink()
                                except Exception:
                                    pass
            except Exception:
                pass
            await asyncio.sleep(600)

    asyncio.create_task(_cleanup_old_audio())


_allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5000,http://localhost:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)


# ── Models ───────────────────────────────────────────────────

class ReplyRequest(BaseModel):
    transcript: str


class TranslateRequest(BaseModel):
    text: str


class TopicSuggestRequest(BaseModel):
    level: str = "N5"
    count: int = 5


# ── Endpoints ────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "speaking-practice"}


@app.post("/conversation")
async def conversation(
    audio_file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    t_start = time.time()
    session = get_session(user_id)
    ext = (audio_file.filename or "webm").split(".")[-1]
    input_path = os.path.join("uploads", f"{uuid.uuid4().hex}.{ext}")

    with open(input_path, "wb") as buf:
        shutil.copyfileobj(audio_file.file, buf)

    try:
        transcript, confidence = await transcribe_audio(input_path)
        print(f"[ORCH] STT: {time.time() - t_start:.2f}s confidence={confidence:.2f}")

        if not transcript:
            return {
                "transcript": "",
                "reply": "すみません、聞き取れませんでした。もう一度お願いします！",
                "audio_url": "",
                "pending": False,
                "level": session.level,
                "score": session.score,
            }

        if is_injection(transcript):
            print(f"[SEC] Injection detected in /conversation, user={user_id}")
            transcript, _ = sanitize_transcript(transcript)

        answer = vocabulary_answer(transcript)
        if answer:
            return vocabulary_result(transcript, answer, session)

        # Show the transcript to the client immediately; run the (slow) LLM +
        # grammar + TTS pipeline in the background and push the reply over the
        # user's WebSocket connection when it is ready.
        session = update_score(session, confidence)
        store_session(user_id, session)

        asyncio.create_task(
            _process_turn_background(
                user_id=user_id,
                transcript=transcript,
                confidence=confidence,
                level=session.level,
                t_start=t_start,
            )
        )

        return {
            "transcript": transcript,
            "reply": None,
            "audio_url": None,
            "pending": True,
            "level": session.level,
            "score": session.score,
        }
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass


async def _process_turn_background(
    user_id: str,
    transcript: str,
    confidence: float,
    level: str,
    t_start: float,
) -> None:
    """Run LLM + grammar + TTS off the request path and push the result via WS."""
    try:
        session = get_session(user_id)
        t_llm = time.time()
        reply, grammar_feedback = await asyncio.to_thread(
            get_reply_and_grammar,
            transcript,
            level,
            history=[h["text"] for h in session.history[-6:] if h["role"] == "user"],
        )
        print(f"[ORCH] LLM+Grammar: {time.time() - t_llm:.2f}s sev={grammar_feedback.get('severity')} reply={reply[:240]!r}")

        updated, plan = evaluate_turn(transcript, confidence, session, grammar_feedback)
        print(f"[ORCH] Plan goal={plan.get('goal')} diff={plan.get('difficulty')}")

        session = add_history(updated, transcript, reply)
        store_session(user_id, session)

        audio_url = await asyncio.to_thread(generate_audio, reply)
        print(f"[ORCH] TTS: {time.time() - t_llm:.2f}s audio={bool(audio_url)}")

        result = compose_response(transcript, reply, audio_url, session, grammar_feedback, plan)
        print(f"[ORCH] Total turn: {time.time() - t_start:.2f}s transcript={transcript[:240]!r}")

        # Push to the connected client (mobile uses WS; FE web can poll too).
        pushed = await ws_registry.push(user_id, {"type": "reply", **result})
        if not pushed:
            print(f"[ORCH] No WS connection for {user_id}; reply dropped (client should poll /reply).")
    except Exception as exc:
        print(f"[ORCH] Background turn failed for {user_id}: {exc}")
        await ws_registry.push(
            user_id,
            {
                "type": "reply",
                "transcript": transcript,
                "reply": "すみません、少し問題が起きました。もう一度お願いします。",
                "audio_url": None,
                "level": level,
                "score": confidence,
            },
        )


@app.post("/transcribe")
async def transcribe(
    audio_file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    session = get_session(user_id)
    ext = (audio_file.filename or "webm").split(".")[-1]
    input_path = os.path.join("uploads", f"{uuid.uuid4().hex}.{ext}")

    try:
        with open(input_path, "wb") as buf:
            shutil.copyfileobj(audio_file.file, buf)

        try:
            transcript, confidence = await transcribe_audio(input_path)
        except Exception as exc:
            print(f"[speaking] transcribe audio failed: {exc}")
            return {"transcript": "", "confidence": 0.0}

        if not transcript:
            return {"transcript": "", "confidence": 0.0}

        session = update_score(session, confidence)
        store_session(user_id, session)
        return {"transcript": transcript, "confidence": confidence}
    except Exception as exc:
        print(f"[speaking] transcribe error: {exc}")
        raise
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass


@app.post("/reply")
async def reply(
    req: ReplyRequest,
    user_id: str = Depends(get_current_user_id),
):
    t_start = time.time()
    session = get_session(user_id)

    if is_injection(req.transcript):
        print(f"[SEC] Injection detected in /reply, user={user_id}")
        req = ReplyRequest(transcript=sanitize_transcript(req.transcript)[0])

    answer = vocabulary_answer(req.transcript)
    if answer:
        return vocabulary_result(req.transcript, answer, session)

    proxy_confidence = _derive_text_confidence({"severity": "none"})

    t_llm = time.time()
    reply_text, grammar_feedback = await asyncio.to_thread(
        get_reply_and_grammar,
        req.transcript,
        session.level,
        history=[h["text"] for h in session.history[-6:] if h["role"] == "user"],
    )
    print(f"[ORCH] LLM+Grammar: {time.time() - t_llm:.2f}s sev={grammar_feedback.get('severity')}")
    print(f"[LLM REPLY] {reply_text[:240]!r}")

    updated, plan = evaluate_turn(req.transcript, proxy_confidence, session, grammar_feedback)
    print(f"[ORCH] Plan goal={plan.get('goal')} diff={plan.get('difficulty')}")

    session = add_history(updated, req.transcript, reply_text)
    store_session(user_id, session)

    audio_url = await asyncio.to_thread(generate_audio, reply_text)
    print(f"[ORCH] TTS: {time.time() - t_llm:.2f}s audio={bool(audio_url)}")

    result = compose_response(req.transcript, reply_text, audio_url, session, grammar_feedback, plan)
    print(f"[ORCH] Total reply: {time.time() - t_start:.2f}s reply={reply_text[:240]!r}")
    return result


@app.post("/translate")
async def translate(
    req: TranslateRequest,
    user_id: str = Depends(get_current_user_id),
):
    del user_id
    translation = await asyncio.to_thread(translate_japanese_to_vietnamese, req.text)
    return {"translation": translation.strip()}


@app.post("/topics/suggest")
async def topics_suggest(
    req: TopicSuggestRequest,
    user_id: str = Depends(get_current_user_id),
):
    del user_id
    topics = suggest_topics(req.level, count=req.count)
    return {"level": req.level.upper(), "topics": topics}


# ── WebSocket streaming ──────────────────────────────────────

@app.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    user_id = await authenticate_websocket(websocket)
    await websocket.accept()
    await handle_stream(websocket, user_id)


@app.websocket("/ws")
async def websocket_push(websocket: WebSocket):
    """Event-based push channel: the client connects here, then calls the HTTP
    /conversation endpoint. The transcript is returned by HTTP immediately, and
    the finished coach reply is pushed back through this socket as a
    {"type": "reply", ...} message."""
    user_id = await authenticate_websocket(websocket)
    await websocket.accept()
    await ws_registry.connect(user_id, websocket)
    print(f"[WS /ws] client connected user_id={user_id!r}")
    try:
        # Keep the connection open. We don't expect client messages; just wait
        # until the client disconnects so we can clean up the registry.
        while True:
            await websocket.receive()
    except WebSocketDisconnect:
        print(f"[WS /ws] client disconnected user_id={user_id!r}")
    except Exception as e:
        print(f"[WS /ws] closed user_id={user_id!r}: {e}")
    finally:
        await ws_registry.disconnect(user_id)


# ── Session reset ────────────────────────────────────────────

@app.post("/reset")
async def reset_session_endpoint(
    level: str = Form("N5"),
    user_id: str = Depends(get_current_user_id),
):
    session = reset_user_session(user_id, level)
    return {"status": "success", "level": session.level, "score": session.score}


@app.get("/audio/{filename}")
async def get_audio(
    filename: str,
    user_id: str = Depends(get_current_user_id),
):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=404, detail="File not found")
    file_path = os.path.join("uploads", filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="audio/mpeg")


# ── PDF OCR ──────────────────────────────────────────────────

@app.post("/process-pdf")
async def process_pdf(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    suffix = os.path.splitext(file.filename or "")[1] or ".pdf"
    temp_path = os.path.join("uploads", f"temp_{uuid.uuid4().hex}{suffix}")

    with open(temp_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    pages_data = []
    doc_fitz = None
    try:
        import fitz
        import easyocr

        doc_fitz = fitz.open(temp_path)
        total_pages = len(doc_fitz)
        print(f"[PDF-OCR] Processing PDF: {file.filename} with {total_pages} pages using PyMuPDF.")

        reader_ocr = None

        for page_idx in range(total_pages):
            page = doc_fitz[page_idx]
            text = (page.get_text() or "").strip()

            if len(text) < 50:
                try:
                    print(f"[PDF-OCR] Page {page_idx + 1}/{total_pages} has short digital text. Running EasyOCR locally...")
                    matrix = fitz.Matrix(1.5, 1.5)
                    pix = page.get_pixmap(matrix=matrix)
                    img_data = pix.tobytes("png")

                    if reader_ocr is None:
                        ocr_model_dir = os.environ.get(
                            "EASYOCR_MODULE_PATH",
                            os.path.join(os.path.dirname(__file__), ".cache", "easyocr"),
                        )
                        reader_ocr = easyocr.Reader(
                            ["ja", "en"],
                            gpu=False,
                            model_storage_directory=ocr_model_dir,
                        )

                    ocr_res = reader_ocr.readtext(img_data, detail=0)
                    if ocr_res:
                        text = " ".join(ocr_res)
                    print(f"[PDF-OCR] Local EasyOCR completed for page {page_idx + 1}. Extracted: {len(text)} chars.")
                except Exception as ocr_err:
                    print(f"[PDF-OCR] EasyOCR error on page {page_idx + 1}: {ocr_err}")

            pages_data.append({"page_number": page_idx + 1, "text": text})

    except Exception as e:
        print(f"[PDF-OCR] Lỗi phân tích tài liệu PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích cú pháp PDF: {str(e)}")
    finally:
        if doc_fitz is not None:
            try:
                doc_fitz.close()
            except Exception:
                pass
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

    return {"filename": file.filename, "total_pages": len(pages_data), "pages": pages_data}
