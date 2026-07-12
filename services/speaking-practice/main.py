from fastapi import Depends, FastAPI, File, UploadFile, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil
import os
import uuid
import asyncio
from pathlib import Path
from pydantic import BaseModel

from auth import authenticate_websocket, get_current_user_id
from sessions import get_session, store_session, reset_user_session, update_score, add_history
from stt import transcribe_audio
from llm import get_ai_reply, get_ai_reply_stream, translate_japanese_to_vietnamese
from coach import review_user_turn
from tts import generate_audio
from prompt_builder import build_messages
from dialogue_manager import evaluate_turn
from grammar_agent import analyze_grammar
from composer import compose_response
from sanitizer import is_injection


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
# ----------------- ENDPOINTS -----------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "speaking-practice"}


@app.post("/conversation")
async def conversation(
    audio_file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    import time
    t_start = time.time()
    session = get_session(user_id)

    file_extension = (audio_file.filename or "webm").split(".")[-1]
    input_audio_path = os.path.join("uploads", f"{uuid.uuid4().hex}.{file_extension}")

    with open(input_audio_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    t_stt = time.time()
    transcript, confidence = await transcribe_audio(input_audio_path)
    print(f"[ORCH] STT: {time.time() - t_stt:.2f}s confidence={confidence:.2f}")

    if not transcript:
        return {
            "transcript": "",
            "reply": "すみません、聞き取れませんでした。もう一度お願いします！",
            "audio_url": "",
            "level": session.level,
            "score": session.score,
        }

    if is_injection(transcript):
        print(f"[SEC] Injection detected in /conversation, user={user_id}")

    session = update_score(session, confidence)

    t_eval = time.time()
    grammar_feedback = await asyncio.to_thread(
        analyze_grammar, transcript, level=session.level,
        history=[h["text"] for h in session.history[-6:] if h["role"] == "user"],
    )
    print(f"[ORCH] Grammar: {time.time() - t_eval:.2f}s sev={grammar_feedback.get('severity')}")

    updated, plan = evaluate_turn(transcript, confidence, session, grammar_feedback)
    print(f"[ORCH] Plan goal={plan.get('goal')} diff={plan.get('difficulty')}")

    messages = build_messages(updated, transcript, teaching_plan=plan)

    t_llm = time.time()
    reply = get_ai_reply(messages)
    print(f"[ORCH] LLM: {time.time() - t_llm:.2f}s")

    session = add_history(updated, transcript, reply)
    store_session(user_id, session)

    audio_url = generate_audio(reply)

    result = compose_response(transcript, reply, audio_url, session, grammar_feedback, plan)
    print(f"[ORCH] Total turn: {time.time() - t_start:.2f}s")
    return result

class ReplyRequest(BaseModel):
    transcript: str


class TranslateRequest(BaseModel):
    text: str


class ReviewTurnRequest(BaseModel):
    transcript: str
    level: str = "N5"
    history: list[str] | None = None


@app.post("/coach/review-turn")
async def coach_review_turn(
    req: ReviewTurnRequest,
    user_id: str = Depends(get_current_user_id),
):
    del user_id
    transcript = (req.transcript or "").strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="transcript is required")
    if len(transcript) > 500:
        raise HTTPException(status_code=400, detail="transcript too long")
    level = (req.level or "N5").upper()
    if level not in ("N5", "N4", "N3", "N2", "N1"):
        level = "N5"
    review = review_user_turn(transcript, level=level, history=req.history)
    return review


@app.post("/translate")
async def translate(
    req: TranslateRequest,
    user_id: str = Depends(get_current_user_id),
):
    del user_id  # auth gate only
    translation = translate_japanese_to_vietnamese(req.text)
    return {"translation": translation.strip()}


@app.post("/transcribe")
async def transcribe(
    audio_file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    session = get_session(user_id)
    file_extension = (audio_file.filename or "webm").split(".")[-1]
    input_audio_path = os.path.join("uploads", f"{uuid.uuid4().hex}.{file_extension}")

    try:
        with open(input_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        print(f"[speaking] transcribe user={user_id} file={input_audio_path}")
        transcript, confidence = await transcribe_audio(input_audio_path)

        if not transcript:
            return {"transcript": "", "confidence": 0.0}

        session = update_score(session, confidence)
        store_session(user_id, session)
        return {"transcript": transcript, "confidence": confidence}
    except Exception as exc:
        print(f"[speaking] transcribe error: {exc}")
        raise

@app.post("/reply")
async def reply(
    req: ReplyRequest,
    user_id: str = Depends(get_current_user_id),
):
    import time
    t_start = time.time()
    session = get_session(user_id)

    if is_injection(req.transcript):
        print(f"[SEC] Injection detected in /reply, user={user_id}")

    t_eval = time.time()
    grammar_feedback = await asyncio.to_thread(
        analyze_grammar, req.transcript, level=session.level,
        history=[h["text"] for h in session.history[-6:] if h["role"] == "user"],
    )
    print(f"[ORCH] Grammar: {time.time() - t_eval:.2f}s sev={grammar_feedback.get('severity')}")

    proxy_confidence = _derive_text_confidence(grammar_feedback)
    session = update_score(session, proxy_confidence)

    updated, plan = evaluate_turn(req.transcript, proxy_confidence, session, grammar_feedback)
    print(f"[ORCH] Plan goal={plan.get('goal')} diff={plan.get('difficulty')}")

    messages = build_messages(updated, req.transcript, teaching_plan=plan)

    t_llm = time.time()
    reply_text = get_ai_reply(messages)
    print(f"[ORCH] LLM: {time.time() - t_llm:.2f}s")
    print(f"[LLM REPLY] {reply_text}")

    session = add_history(updated, req.transcript, reply_text)
    store_session(user_id, session)

    audio_url = generate_audio(reply_text)

    result = compose_response(req.transcript, reply_text, audio_url, session, grammar_feedback, plan)
    print(f"[ORCH] Total reply: {time.time() - t_start:.2f}s")
    return result

# ----------------- WEBSOCKET STREAMING ENDPOINT -----------------

@app.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    user_id = await authenticate_websocket(websocket)
    session = get_session(user_id)
    await websocket.accept()
    
    # We will accumulate audio bytes received from the client
    audio_bytes = bytearray()
    
    # Unique file name for the stream
    stream_id = uuid.uuid4().hex
    temp_audio_path = os.path.join("uploads", f"stream_{stream_id}.webm")
    
    # Progressive STT state (asyncio.Lock protected)
    stt_lock = asyncio.Lock()
    stt_in_progress = False
    stt_last_run_time = 0.0
    stt_last_audio_len = 0

    async def run_progressive_stt(data_to_transcribe: bytes):
        temp_prog_path = os.path.join("uploads", f"temp_prog_{uuid.uuid4().hex}.webm")
        try:
            with open(temp_prog_path, "wb") as f:
                f.write(data_to_transcribe)
            transcript, confidence = await transcribe_audio(temp_prog_path)
            if transcript.strip():
                await websocket.send_json({
                    "type": "transcript_partial",
                    "text": transcript
                })
        except Exception as e:
            print("Error in progressive STT:", e)
        finally:
            async with stt_lock:
                nonlocal stt_in_progress
                stt_in_progress = False
            if os.path.exists(temp_prog_path):
                try:
                    os.remove(temp_prog_path)
                except Exception:
                    pass
    
    try:
        while True:
            data = await websocket.receive()
            
            if "bytes" in data:
                audio_bytes.extend(data["bytes"])
                
                # Check if we should trigger progressive STT (e.g. every 1.5s, when not running, and when new data > 15KB accumulated)
                current_time = asyncio.get_event_loop().time()
                async with stt_lock:
                    if (current_time - stt_last_run_time > 1.5 and
                        not stt_in_progress and
                        len(audio_bytes) - stt_last_audio_len > 15000):
                        stt_in_progress = True
                        stt_last_run_time = current_time
                        stt_last_audio_len = len(audio_bytes)
                        asyncio.create_task(run_progressive_stt(bytes(audio_bytes)))
                
            elif "text" in data:
                import json
                try:
                    message = json.loads(data["text"])
                    if message.get("type") == "stop_talking":
                        if len(audio_bytes) == 0:
                            await websocket.send_json({"type": "error", "message": "No audio received."})
                            continue
                            
                        import time
                        start_time = time.time()
                        
                        # Save audio bytes
                        with open(temp_audio_path, "wb") as f:
                            f.write(audio_bytes)
                            
                        # 1. STT
                        await websocket.send_json({"type": "status", "message": "Transcribing..."})
                        stt_start = time.time()
                        transcript, confidence = await transcribe_audio(temp_audio_path)
                        stt_duration = time.time() - stt_start
                        print(f"[PERF] STT took {stt_duration:.2f}s (confidence: {confidence})")
                        
                        if not transcript:
                            await websocket.send_json({
                                "type": "transcript",
                                "text": "",
                                "reply": "すみません、聞き取れませんでした。もう一度お願いします！"
                            })
                            await websocket.send_json({"type": "done"})
                            audio_bytes = bytearray()
                            stt_last_audio_len = 0
                            continue
                            
                        await websocket.send_json({"type": "transcript", "text": transcript})

                        if is_injection(transcript):
                            print(f"[SEC] Injection detected in /stream, user={user_id}")

                        session = update_score(session, confidence)
                        await websocket.send_json({
                            "type": "stats",
                            "level": session.level,
                            "score": session.score,
                        })

                        grammar_start = time.time()
                        grammar_feedback = await asyncio.to_thread(
                            analyze_grammar, transcript, level=session.level,
                            history=[h["text"] for h in session.history[-6:] if h["role"] == "user"],
                        )
                        print(f"[ORCH] Grammar: {time.time() - grammar_start:.2f}s sev={grammar_feedback.get('severity')}")

                        updated, plan = evaluate_turn(transcript, confidence, session, grammar_feedback)
                        print(f"[ORCH] Plan goal={plan.get('goal')} diff={plan.get('difficulty')}")

                        messages = build_messages(updated, transcript, teaching_plan=plan)
                        
                        tts_queue = asyncio.Queue()
                        
                        async def tts_worker():
                            while True:
                                sentence = await tts_queue.get()
                                try:
                                    if sentence is None:
                                        break
                                    audio_url = await asyncio.to_thread(generate_audio, sentence)
                                    if audio_url:
                                        filename = audio_url.replace("/audio/", "")
                                        audio_path = Path("uploads") / filename
                                        if audio_path.exists():
                                            audio_bytes_out = audio_path.read_bytes()
                                            try:
                                                await websocket.send_bytes(audio_bytes_out)
                                            except Exception as send_err:
                                                print("TTS worker: websocket closed while sending audio:", send_err)
                                except Exception as e:
                                    print("TTS worker: error generating audio:", e)
                                finally:
                                    tts_queue.task_done()
                                
                        worker_task = asyncio.create_task(tts_worker())
                        
                        await websocket.send_json({"type": "status", "message": "Thinking..."})
                        full_reply = ""
                        current_sentence = ""
                        
                        llm_token_queue = asyncio.Queue()
                        
                        current_loop = asyncio.get_running_loop()
                        def run_llm_sync():
                            try:
                                for token in get_ai_reply_stream(messages):
                                    current_loop.call_soon_threadsafe(llm_token_queue.put_nowait, token)
                            finally:
                                current_loop.call_soon_threadsafe(llm_token_queue.put_nowait, None)
                        
                        llm_start = time.time()
                        llm_thread = asyncio.create_task(asyncio.to_thread(run_llm_sync))
                        
                        first_token = True
                        while True:
                            token = await llm_token_queue.get()
                            if token is None:
                                break
                            
                            if first_token:
                                first_token = False
                                print(f"[PERF] Time to first LLM token: {time.time() - llm_start:.2f}s")
                                
                            full_reply += token
                            current_sentence += token
                            
                            try:
                                await websocket.send_json({"type": "ai_token", "text": token})
                            except Exception:
                                break
                            
                            split_idx = -1
                            for idx, char in enumerate(current_sentence):
                                if char in ["。", "！", "？", "\n", ".", "!", "?"]:
                                    split_idx = idx
                                    break
                            
                            if split_idx != -1:
                                sentence_to_speak = current_sentence[:split_idx + 1].strip()
                                current_sentence = current_sentence[split_idx + 1:]
                                if len(sentence_to_speak) > 1:
                                    await tts_queue.put(sentence_to_speak)
                        
                        await llm_thread
                        llm_duration = time.time() - llm_start
                        print(f"[PERF] LLM Stream complete. Total duration: {llm_duration:.2f}s")
                        print(f"[LLM REPLY (STREAM)] {full_reply}")
                        
                        if current_sentence.strip():
                            await tts_queue.put(current_sentence.strip())
                            
                        await tts_queue.put(None)
                        try:
                            await asyncio.wait_for(tts_queue.join(), timeout=30.0)
                        except asyncio.TimeoutError:
                            print("Warning: TTS queue join timed out after 30s.")
                        
                        worker_task.cancel()
                        total_duration = time.time() - start_time
                        print(f"[PERF] Total response roundtrip took {total_duration:.2f}s")

                        session = add_history(updated, transcript, full_reply)
                        store_session(user_id, session)
                        
                        await websocket.send_json({"type": "done"})
                        
                        # Reset audio buffer
                        audio_bytes = bytearray()
                        stt_last_audio_len = 0
                        
                except Exception as e:
                    print("Error parsing WS message:", e)
                    await websocket.send_json({"type": "error", "message": str(e)})
                    
    except WebSocketDisconnect:
        print("WebSocket client disconnected.")
    except RuntimeError as e:
        if "disconnect" in str(e) or "Cannot call \"receive\"" in str(e):
            print("WebSocket client disconnected gracefully.")
        else:
            print("WebSocket RuntimeError:", e)
    finally:
        if os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except Exception:
                pass

# ----------------- SESSION RESET -----------------

@app.post("/reset")
async def reset_session_endpoint(
    level: str = Form("N5"),
    user_id: str = Depends(get_current_user_id),
):
    session = reset_user_session(user_id, level)
    return {
        "status": "success",
        "level": session.level,
        "score": session.score,
    }


@app.get("/audio/{filename}")
async def get_audio(
    filename: str,
    user_id: str = Depends(get_current_user_id),
):
    file_path = os.path.join("uploads", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg")
    return {"error": "File not found"}


# ----------------- PDF OCR/PARSING ENDPOINT -----------------

@app.post("/process-pdf")
async def process_pdf(
    file: UploadFile = File(...)
):
    # Save uploaded file to temp path
    suffix = os.path.splitext(file.filename or "")[1] or ".pdf"
    temp_path = os.path.join("uploads", f"temp_{uuid.uuid4().hex}{suffix}")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    pages_data = []
    doc_fitz = None
    try:
        # Try to import pypdf
        try:
            import pypdf
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="Thư viện 'pypdf' chưa được cài đặt ở môi trường Python. Hãy chạy pip install pypdf."
            )
            
        reader = pypdf.PdfReader(temp_path)
        total_pages = len(reader.pages)
        
        try:
            import fitz  # PyMuPDF
            doc_fitz = fitz.open(temp_path)
            print("[PDF-OCR] Đã mở tài liệu bằng PyMuPDF để chuẩn bị OCR dự phòng.")
        except ImportError:
            print("[PDF-OCR] Thư viện PyMuPDF (fitz) chưa được cài đặt. Không thể chạy OCR.")

        reader_ocr = None
        
        for page_idx in range(total_pages):
            page = reader.pages[page_idx]
            text = (page.extract_text() or "").strip()
            
            # If text is empty or very short, try OCR
            if len(text) < 20 and doc_fitz is not None:
                try:
                    try:
                        import easyocr
                    except ImportError:
                        print("[PDF-OCR] Thư viện easyocr chưa được cài đặt. Bỏ qua OCR.")
                        continue
                    
                    print(f"[PDF-OCR] Trang {page_idx + 1}/{total_pages} thiếu text kỹ thuật số. Bắt đầu OCR bằng EasyOCR...")
                    
                    fitz_page = doc_fitz[page_idx]
                    pix = fitz_page.get_pixmap()
                    img_data = pix.tobytes("png")
                    
                    if reader_ocr is None:
                        print("[PDF-OCR] Khởi tạo mô hình EasyOCR cho ngôn ngữ ['ja', 'en'] (Lần đầu sẽ tốn vài giây)...")
                        ocr_model_dir = os.environ.get(
                            "EASYOCR_MODULE_PATH",
                            os.path.join(os.path.dirname(__file__), ".cache", "easyocr"),
                        )
                        reader_ocr = easyocr.Reader(
                            ["ja", "en"],
                            gpu=False,
                            model_storage_directory=ocr_model_dir,
                        )
                        
                    ocr_result = reader_ocr.readtext(img_data, detail=0)
                    text = " ".join(ocr_result)
                    print(f"[PDF-OCR] Hoàn thành OCR trang {page_idx + 1}. Kích thước text: {len(text)} ký tự.")
                except Exception as ocr_err:
                    print(f"[PDF-OCR] Lỗi chạy OCR cho trang {page_idx + 1}: {ocr_err}")
            
            pages_data.append({
                "page_number": page_idx + 1,
                "text": text
            })
            
    except HTTPException:
        raise
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
                
    return {
        "filename": file.filename,
        "total_pages": len(pages_data),
        "pages": pages_data
    }

