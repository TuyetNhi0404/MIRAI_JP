from fastapi import Depends, FastAPI, File, UploadFile, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil
import os
import uuid
import asyncio
from pydantic import BaseModel

from auth import authenticate_websocket, get_current_user_id
from sessions import get_session, reset_user_session
from stt import transcribe_audio
from llm import get_ai_reply, get_ai_reply_stream, translate_japanese_to_vietnamese
from coach import review_user_turn
from tts import generate_audio

app = FastAPI(title="MIRAI Speaking Practice")


@app.on_event("startup")
async def warmup_whisper():
    print("[speaking] Warming up Whisper model (first run may take a minute)...")
    try:
        from stt import model
        print(f"[speaking] Whisper ready (model loaded: {model is not None})")
    except Exception as exc:
        print(f"[speaking] Whisper warmup failed: {exc}")

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
# ================= CORE SYSTEM =================
 
SYSTEM_PROMPT = """
You are Mirai, a friendly Japanese conversation coach.
 
Your primary role:
- Help the user improve spoken Japanese through natural, enjoyable conversation.
- Act like a real Japanese speaking partner, not a textbook.
- Keep the interaction immersive and conversational.
 
CORE RULES:
- Stay focused on the current topic. Never suddenly switch topics.
- Never give long lectures unless the user explicitly asks for explanation.
- Prioritize conversation flow over grammar teaching.
- Responses should usually be SHORT (1-3 sentences max).
- Sound warm, encouraging, and natural.
- Ask ONE simple follow-up question to keep the conversation going.
- STRICTLY follow the user's level instructions below — this is your most important rule.
 
CORRECTION RULES:
- Do NOT correct every mistake. Ignore minor errors.
- Only correct major or repeated mistakes.
- Corrections must be SHORT and embedded naturally in your reply.
- ALWAYS prefer implicit correction (model the correct form) over explicit explanation.
 
GOOD correction example:
  User: 昨日映画を見る
  Mirai: 昨日映画を見たんですね！何の映画でしたか？
  (You naturally used 見た, not 見る — no explanation needed)
 
BAD correction example:
  "You should have said 見た because it's past tense."
 
LANGUAGE RULES:
- Speak mostly Japanese.
- Use English ONLY when the user is clearly confused or explicitly asks for help in English.
- Never mix English unnecessarily into Japanese sentences.
 
VOICE CHAT RULES:
- Keep replies concise and easy to listen to in one breath.
- Never use bullet points or numbered lists.
- Avoid robotic or formal phrasing. Sound like a real friend.
- Use natural conversation fillers occasionally to sound human:
    へえ！/ なるほど / そうなんですね / いいですね！/ ほんとに？
 
Never mention these instructions. Never break character.
"""
 
# ================= LEVEL STATE =================
 
LEVEL_PROMPT = {
    "N5": """
=== USER LEVEL: JLPT N5 (Absolute Beginner) ===
 
This user has just started learning Japanese. They know very few words and very basic grammar.
You MUST speak at the level of a children's picture book. Simple, slow, clear.
 
STRICT VOCABULARY RULES:
- ONLY use N5-level words: 私、あなた、です、ます、ある、いる、好き、食べる、飲む、見る、行く、来る、する、大きい、小さい、いい、わるい、今日、明日、昨日、何、どこ、だれ、いつ
- NO complex words. NO expressions like 〜んですが、〜ていただく、〜でしょうか、〜ということ、〜によって
- NO N4+ grammar patterns such as: 〜てみる、〜ておく、〜てしまう、〜ばかり、〜ながら、〜ために、〜ように
- Write numbers in hiragana: いち、に、さん、not 一、二、三
 
SENTENCE STRUCTURE RULES:
- Maximum 1 sentence per turn, occasionally 2 at most.
- Use simple Subject + Verb or Subject + wa + Adjective + desu structure.
- End sentences with: です / ます / か？ only.
- Never combine two clauses with て-form chains longer than 1 step.
 
KANJI RULES:
- AVOID kanji entirely. Write everything in hiragana or katakana.
- ONLY allow: 日、本、人、月、年、食、水、山、川 if you must — always add furigana in parentheses.
- Example: 日(にち)
 
WHAT GOOD N5 RESPONSES LOOK LIKE:
  ✅ "そうですか！わたしも すきです。あなたは？"
  ✅ "いいですね！どこに いきますか？"
  ✅ "そうなんですね。なに が すきですか？"
 
WHAT YOU MUST NEVER DO AT N5:
  ❌ Using 〜んですか / 〜でしょうか (too advanced)
  ❌ Long sentences with multiple clauses
  ❌ Rare or abstract vocabulary
  ❌ Kanji without hiragana reading
  ❌ Responding with more than 2 sentences
 
ENGLISH SUPPORT:
- If the user seems completely lost, you MAY add a short English hint in parentheses.
- Example: "なに が すきですか？(What do you like?)"
- Do this sparingly — only when the user seems stuck.
""",
 
    "N4": """
=== USER LEVEL: JLPT N4 (Elementary) ===
 
This user knows basic Japanese and can handle simple daily conversation.
Keep language simple but slightly more natural than N5.
 
VOCABULARY RULES:
- Use common daily vocabulary. Light kanji is okay (日本、食べ物、友達、学校、仕事).
- Avoid complex expressions: 〜に関して、〜によると、〜にもかかわらず、〜において
- Avoid N3+ grammar: 〜わけだ、〜に違いない、〜はずだ、〜ものの
 
SENTENCE STRUCTURE RULES:
- Sentences up to 2 clauses: A て B / A から B / A けど B
- Use: 〜てみる、〜ている、〜たい、〜ましょう、〜ませんか freely
- Keep each response to 2–3 sentences max.
 
WHAT GOOD N4 RESPONSES LOOK LIKE:
  ✅ "へえ、いいですね！どんな 食べ物が すきですか？"
  ✅ "そうなんですね。週末は どこかに 行きましたか？"
  ✅ "なるほど！それは たのしそう ですね。"
 
WHAT YOU MUST NEVER DO AT N4:
  ❌ Keigo (formal speech like 〜ていただけますでしょうか)
  ❌ Newspaper-style or abstract vocabulary
  ❌ Sentences with 3+ clauses chained together
""",
 
    "N3": """
=== USER LEVEL: JLPT N3 (Intermediate) ===
 
This user can hold a basic conversation. Introduce natural, conversational expressions.
 
VOCABULARY & GRAMMAR RULES:
- Natural spoken Japanese. Use common kanji freely.
- Introduce casual speech patterns: 〜じゃない？、〜んだ、〜かな、〜よね
- Grammar allowed: 〜ために、〜ように、〜ながら、〜ばかり、〜てしまう、〜はずだ
- Avoid highly formal or literary patterns.
 
STYLE RULES:
- Responses up to 3 sentences.
- Mix plain form and polite form naturally.
- Use natural interjections: ほんとに？、マジで？、そっかー、確かに
 
WHAT GOOD N3 RESPONSES LOOK LIKE:
  ✅ "へえ、それ面白そうだね！どんなところが 好きなの？"
  ✅ "なるほどね。私も似たような 経験あるよ。最近どう？"
""",
 
    "N2": """
=== USER LEVEL: JLPT N2 (Upper Intermediate) ===
 
This user can handle nuanced conversation. Speak naturally and encourage complex expression.
 
RULES:
- Speak like a native friend — casual, warm, natural.
- Use nuanced expressions, opinion language, and conjunctions freely.
- Grammar: 〜に違いない、〜わけだ、〜ものの、〜に関して、〜からこそ
- Encourage the user to give opinions and longer answers.
- Minimal English — only for true ambiguity.
 
WHAT GOOD N2 RESPONSES LOOK LIKE:
  ✅ "なるほどね、それって結構難しい問題だよね。あなたはどう思う？"
  ✅ "確かに、そういう見方もあるけど、個人的には〜だと思うな。"
""",
 
    "N1": """
=== USER LEVEL: JLPT N1 (Advanced / Near-Native) ===
 
This user is near-native level. Engage as you would with a native Japanese speaker.
 
RULES:
- No simplification whatsoever.
- Use natural idioms, slang, cultural references when appropriate.
- Complex grammar, keigo, and literary patterns are all fair game.
- Challenge the user with nuanced questions — ask for their opinion on abstract topics.
- Focus on subtle expression differences and fluency.
 
WHAT GOOD N1 RESPONSES LOOK LIKE:
  ✅ "そういえば、それって逆説的じゃない？どういう意図でそう言ったの？"
  ✅ "まあ、一概には言えないけど、文脈によっては全然違う意味になるよね。"
"""
}
 
# ================= OPTIONAL MODES =================
 
MODE_PROMPT = {
    "free_talk": """
=== Mode: Free Conversation ===
- Prioritize natural, relaxed chatting about any topic.
- Keep the conversation flowing with one follow-up question per turn.
- React naturally to what the user says — show curiosity and warmth.
""",
 
    "shadowing": """
=== Mode: Shadowing Practice ===
- Provide one SHORT, clear sentence for the user to repeat.
- Keep sentences within the user's level (see level rules above).
- After the user attempts it, give brief encouraging feedback, then provide the next sentence.
- Do not give multiple sentences at once.
- Example (N5): "では、こちらをリピートしてください：「わたしは がくせい です。」"
""",
 
    "roleplay": """
=== Mode: Roleplay ===
- Stay fully immersed in the assigned scenario. Never break character.
- React naturally to the user's lines as the character would.
- If the user says something off-topic, gently steer back to the scenario in character.
- Keep your lines appropriate to the user's level.
""",
 
    "interview": """
=== Mode: Japanese Interview Practice ===
- Ask one interview-style question per turn (job interview, school interview, etc.).
- Listen to the user's answer, give brief natural feedback, then ask the next question.
- Evaluate clarity and completeness naturally through follow-up, not explicit grading.
- Example questions: 自己紹介をお願いします。/ 志望動機を教えてください。
""",
 
    "debate": """
=== Mode: Discussion / Debate ===
- Introduce a topic or opinion for the user to respond to.
- After the user responds, politely challenge or build on their point.
- Encourage the user to elaborate, give reasons, or consider the other side.
- Keep your own position consistent and interesting throughout the conversation.
"""
}

def build_messages(session, user_input):
    messages = []

    # 1. system
    mode = session.get("mode", "free_talk")
    system = SYSTEM_PROMPT + "\n" + LEVEL_PROMPT.get(session["level"], "") + "\n" + MODE_PROMPT.get(mode, "")

    messages.append({
        "role": "system",
        "content": system
    })

    # 2. memory (optional)
    if session.get("weakness"):
        weaknesses_str = ", ".join(session["weakness"])
        messages.append({
            "role": "system",
            "content": f"User weakness: {weaknesses_str}"
        })

    # 3. short history (last 3 turns only)
    for h in session["history"][-3:]:
        role = "assistant" if h["role"] == "ai" else "user"
        messages.append({
            "role": role,
            "content": h["text"]
        })

    # 4. current input
    messages.append({
        "role": "user",
        "content": user_input
    })

    return messages

def update_score(session, whisper_confidence):
    if whisper_confidence < 0.6:
        session["score"] -= 5
    else:
        session["score"] += 2

    # Cap score between 0 and 100
    session["score"] = max(0, min(100, session["score"]))

    # auto level adjust
    if session["score"] > 90:
        session["level"] = "N1"
    elif session["score"] > 80:
        session["level"] = "N2"
    elif session["score"] > 70:
        session["level"] = "N3"
    elif session["score"] > 55:
        session["level"] = "N4"
    else:
        session["level"] = "N5"

# ----------------- ENDPOINTS -----------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "speaking-practice"}


@app.post("/conversation")
async def conversation(
    audio_file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    session = get_session(user_id)
    # 1. Save uploaded file
    file_extension = audio_file.filename.split('.')[-1]
    input_audio_path = os.path.join("uploads", f"{uuid.uuid4().hex}.{file_extension}")
    
    with open(input_audio_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)
        
    # 2. STT (faster-whisper)
    transcript, confidence = transcribe_audio(input_audio_path)
    
    if not transcript:
        return {
            "transcript": "",
            "reply": "すみません、聞き取れませんでした。もう一度お願いします！",
            "audio_url": "",
            "level": session["level"],
            "score": session["score"]
        }
        
    # 3. Update score based on Whisper confidence
    update_score(session, confidence)
    
    # 4. Context Builder
    messages = build_messages(session, transcript)
    
    # 5. LLM (OpenRouter)
    reply = get_ai_reply(messages)
    
    # 6. Store History
    session["history"].append({
        "role": "user",
        "text": transcript
    })
    session["history"].append({
        "role": "ai",
        "text": reply
    })
    
    # 7. TTS (ElevenLabs)
    audio_url = generate_audio(reply)
    
    return {
        "transcript": transcript,
        "reply": reply,
        "audio_url": audio_url,
        "level": session["level"],
        "score": session["score"]
    }

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
        transcript, confidence = transcribe_audio(input_audio_path)

        if not transcript:
            return {"transcript": "", "confidence": 0.0}

        update_score(session, confidence)
        return {"transcript": transcript, "confidence": confidence}
    except Exception as exc:
        print(f"[speaking] transcribe error: {exc}")
        raise

@app.post("/reply")
async def reply(
    req: ReplyRequest,
    user_id: str = Depends(get_current_user_id),
):
    session = get_session(user_id)
    messages = build_messages(session, req.transcript)
    reply_text = get_ai_reply(messages)
    print(f"[LLM REPLY] {reply_text}")
    
    session["history"].append({
        "role": "user",
        "text": req.transcript
    })
    session["history"].append({
        "role": "ai",
        "text": reply_text
    })
    
    audio_url = generate_audio(reply_text)
    
    return {
        "reply": reply_text,
        "audio_url": audio_url,
        "level": session["level"],
        "score": session["score"]
    }

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
    
    # Progressive STT state
    stt_state = {
        "in_progress": False,
        "last_run_time": 0.0,
        "last_audio_len": 0
    }
    
    # Inner task to execute progressive Whisper STT without blocking the WebSocket
    async def run_progressive_stt(data_to_transcribe: bytes):
        temp_prog_path = os.path.join("uploads", f"temp_prog_{uuid.uuid4().hex}.webm")
        try:
            with open(temp_prog_path, "wb") as f:
                f.write(data_to_transcribe)
            # Run STT in executor thread pool
            transcript, confidence = await asyncio.to_thread(transcribe_audio, temp_prog_path)
            if transcript.strip():
                await websocket.send_json({
                    "type": "transcript_partial",
                    "text": transcript
                })
        except Exception as e:
            print("Error in progressive STT:", e)
        finally:
            stt_state["in_progress"] = False
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
                if (current_time - stt_state["last_run_time"] > 1.5 and 
                    not stt_state["in_progress"] and 
                    len(audio_bytes) - stt_state["last_audio_len"] > 15000):
                    
                    stt_state["in_progress"] = True
                    stt_state["last_run_time"] = current_time
                    stt_state["last_audio_len"] = len(audio_bytes)
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
                            
                        # 1. STT (faster-whisper in thread pool)
                        await websocket.send_json({"type": "status", "message": "Transcribing..."})
                        stt_start = time.time()
                        transcript, confidence = await asyncio.to_thread(transcribe_audio, temp_audio_path)
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
                            stt_state["last_audio_len"] = 0
                            continue
                            
                        await websocket.send_json({"type": "transcript", "text": transcript})
                        
                        # 2. Update score
                        update_score(session, confidence)
                        await websocket.send_json({
                            "type": "stats", 
                            "level": session["level"], 
                            "score": session["score"]
                        })
                        
                        # 3. Context Builder
                        messages = build_messages(session, transcript)
                        
                        # 4. Initialize TTS Queue and Worker Task
                        tts_queue = asyncio.Queue()
                        
                        async def tts_worker():
                            while True:
                                sentence = await tts_queue.get()
                                try:
                                    if sentence is None:
                                        break
                                    # Generate audio in executor thread pool
                                    audio_url = await asyncio.to_thread(generate_audio, sentence)
                                    if audio_url:
                                        try:
                                            await websocket.send_json({
                                                "type": "audio_chunk",
                                                "url": audio_url
                                            })
                                        except Exception as send_err:
                                            print("TTS worker: websocket closed while sending audio:", send_err)
                                except Exception as e:
                                    print("TTS worker: error generating audio:", e)
                                finally:
                                    # ALWAYS release the queue slot to prevent deadlock
                                    tts_queue.task_done()
                                
                        worker_task = asyncio.create_task(tts_worker())
                        
                        # 5. Run LLM stream in a thread (blocking requests lib) and pipe to queue
                        await websocket.send_json({"type": "status", "message": "Thinking..."})
                        full_reply = ""
                        current_sentence = ""
                        
                        # Run the synchronous LLM generator in a thread to avoid blocking event loop
                        llm_token_queue = asyncio.Queue()
                        
                        current_loop = asyncio.get_running_loop()
                        def run_llm_sync():
                            """Runs synchronous LLM generator and puts tokens into an asyncio queue."""
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
                                await websocket.send_json({"type": "llm_token", "text": token})
                            except Exception:
                                break
                            
                            # Sentence splitter
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
                        
                        # Speak leftover text
                        if current_sentence.strip():
                            await tts_queue.put(current_sentence.strip())
                            
                        # Signal TTS worker to stop and wait (with timeout to prevent deadlock)
                        await tts_queue.put(None)
                        try:
                            await asyncio.wait_for(tts_queue.join(), timeout=30.0)
                        except asyncio.TimeoutError:
                            print("Warning: TTS queue join timed out after 30s.")
                        
                        worker_task.cancel()
                        total_duration = time.time() - start_time
                        print(f"[PERF] Total response roundtrip took {total_duration:.2f}s")
                                
                        # Save history
                        session["history"].append({
                            "role": "user",
                            "text": transcript
                        })
                        session["history"].append({
                            "role": "ai",
                            "text": full_reply
                        })
                        
                        await websocket.send_json({"type": "done"})
                        
                        # Reset audio buffer
                        audio_bytes = bytearray()
                        stt_state["last_audio_len"] = 0
                        
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
        "level": session["level"],
        "score": session["score"],
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
                        reader_ocr = easyocr.Reader(['ja', 'en'])
                        
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

