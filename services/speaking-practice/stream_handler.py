"""WebSocket /stream handler — extracted from main.py for clarity."""

import asyncio
import json
import os
import time
import uuid

from fastapi import WebSocket

from sessions import get_session, store_session, update_score, add_history
from stt import transcribe_audio
from llm import get_reply_and_grammar
from tts import generate_audio
from dialogue_manager import evaluate_turn
from sanitizer import is_injection, sanitize_transcript
from vocabulary import vocabulary_answer, vocabulary_result


MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB


async def handle_stream(websocket: WebSocket, user_id: str):
    session = get_session(user_id)
    audio_bytes = bytearray()
    stream_id = uuid.uuid4().hex
    temp_audio_path = os.path.join("uploads", f"stream_{stream_id}.webm")

    # Progressive STT state
    stt_lock = asyncio.Lock()
    stt_in_progress = False
    stt_last_run_time = 0.0
    stt_last_audio_len = 0
    progressive_stt_tasks: set[asyncio.Task] = set()

    async def run_progressive_stt(data_to_transcribe: bytes):
        nonlocal stt_in_progress
        temp_prog_path = os.path.join("uploads", f"temp_prog_{uuid.uuid4().hex}.webm")
        try:
            with open(temp_prog_path, "wb") as f:
                f.write(data_to_transcribe)
            transcript, confidence = await transcribe_audio(temp_prog_path)
            if transcript.strip():
                await websocket.send_json({"type": "transcript_partial", "text": transcript})
        except Exception as e:
            print("[WS] progressive STT error:", e)
        finally:
            async with stt_lock:
                stt_in_progress = False
            if os.path.exists(temp_prog_path):
                try:
                    os.remove(temp_prog_path)
                except Exception:
                    pass

    def reset_audio_buffer():
        nonlocal audio_bytes, stt_last_audio_len
        audio_bytes = bytearray()
        stt_last_audio_len = 0

    async def handle_stop_talking():
        nonlocal session, audio_bytes, stt_last_audio_len

        if len(audio_bytes) == 0:
            await websocket.send_json({"type": "error", "message": "No audio received."})
            return

        session = get_session(user_id)
        start_time = time.time()

        with open(temp_audio_path, "wb") as f:
            f.write(audio_bytes)

        # 1. STT
        await websocket.send_json({"type": "status", "message": "Transcribing..."})
        stt_start = time.time()
        transcript, confidence = await transcribe_audio(temp_audio_path)
        print(f"[PERF] STT took {time.time() - stt_start:.2f}s (confidence: {confidence})")

        if not transcript:
            await websocket.send_json({
                "type": "transcript",
                "text": "",
                "reply": "すみません、聞き取れませんでした。もう一度お願いします！",
            })
            await websocket.send_json({"type": "done"})
            reset_audio_buffer()
            return

        await websocket.send_json({"type": "transcript", "text": transcript})

        if is_injection(transcript):
            print(f"[SEC] Injection detected in /stream, user={user_id}")
            transcript, _ = sanitize_transcript(transcript)

        # Vocabulary fast path
        answer = vocabulary_answer(transcript)
        if answer:
            await websocket.send_json({
                "type": "stats",
                "level": session.level,
                "score": session.score,
            })
            session = add_history(session, transcript, answer)
            store_session(user_id, session)
            await websocket.send_json({"type": "llm_token", "text": answer})
            audio_url = await asyncio.to_thread(generate_audio, answer)
            if audio_url:
                await websocket.send_json({"type": "audio_chunk", "url": audio_url})
            await websocket.send_json({"type": "done"})
            reset_audio_buffer()
            return

        # 2. LLM + grammar
        grammar_start = time.time()
        session = update_score(session, confidence)
        await websocket.send_json({
            "type": "stats",
            "level": session.level,
            "score": session.score,
        })

        full_reply, grammar_feedback = await asyncio.to_thread(
            get_reply_and_grammar,
            transcript,
            session.level,
            history=[h["text"] for h in session.history[-6:] if h["role"] == "user"],
        )
        print(f"[ORCH] Grammar: {time.time() - grammar_start:.2f}s sev={grammar_feedback.get('severity')}")

        updated, plan = evaluate_turn(transcript, confidence, session, grammar_feedback)

        if grammar_feedback.get("severity") not in ("none", ""):
            await websocket.send_json({
                "type": "grammar_feedback",
                "grammar_feedback": grammar_feedback,
            })

        # 3. Stream LLM tokens + TTS
        await _stream_reply(websocket, full_reply, grammar_start)

        session = add_history(updated, transcript, full_reply)
        store_session(user_id, session)
        await websocket.send_json({"type": "done"})
        reset_audio_buffer()

    async def _stream_reply(ws: WebSocket, full_reply: str, grammar_start: float):
        tts_queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def tts_worker():
            while True:
                sentence = await tts_queue.get()
                try:
                    if sentence is None:
                        break
                    audio_url = await asyncio.to_thread(generate_audio, sentence)
                    if audio_url:
                        try:
                            await ws.send_json({"type": "audio_chunk", "url": audio_url})
                        except Exception as send_err:
                            print("[WS] TTS worker: ws closed:", send_err)
                except Exception as e:
                    print("[WS] TTS worker error:", e)
                finally:
                    tts_queue.task_done()

        worker_task = asyncio.create_task(tts_worker())
        try:
            await ws.send_json({"type": "status", "message": "Thinking..."})
            llm_start = time.time()
            print(f"[PERF] Time to first token: {time.time() - grammar_start:.2f}s")

            current_sentence = ""
            ws_ok = True
            for token in full_reply:
                try:
                    await ws.send_json({"type": "llm_token", "text": token})
                except Exception:
                    ws_ok = False
                    break

                current_sentence += token
                split_idx = -1
                for idx, char in enumerate(current_sentence):
                    if char in ["。", "！", "？", "\n", ".", "!", "?"]:
                        split_idx = idx
                        break

                if split_idx != -1:
                    sentence_to_speak = current_sentence[: split_idx + 1].strip()
                    current_sentence = current_sentence[split_idx + 1 :]
                    if len(sentence_to_speak) > 1:
                        await tts_queue.put(sentence_to_speak)

            print(f"[PERF] Reply emit complete. Total duration: {time.time() - llm_start:.2f}s")

            if not ws_ok:
                try:
                    await ws.send_json({"type": "error", "message": "Connection lost during reply."})
                except Exception:
                    pass
                return

            if current_sentence.strip():
                await tts_queue.put(current_sentence.strip())

            await tts_queue.put(None)
            try:
                await asyncio.wait_for(tts_queue.join(), timeout=30.0)
            except asyncio.TimeoutError:
                print("[WS] TTS queue join timed out after 30s.")
        finally:
            worker_task.cancel()

    async def handle_bytes(data: bytes):
        nonlocal audio_bytes, stt_last_run_time, stt_last_audio_len, stt_in_progress
        audio_bytes.extend(data)
        if len(audio_bytes) > MAX_AUDIO_BYTES:
            await websocket.send_json({"type": "error", "message": "Audio too large."})
            audio_bytes = bytearray()
            return

        current_time = asyncio.get_running_loop().time()
        async with stt_lock:
            if (
                current_time - stt_last_run_time > 1.5
                and not stt_in_progress
                and len(audio_bytes) - stt_last_audio_len > 15000
            ):
                stt_in_progress = True
                stt_last_run_time = current_time
                stt_last_audio_len = len(audio_bytes)
                task = asyncio.create_task(run_progressive_stt(bytes(audio_bytes)))
                progressive_stt_tasks.add(task)
                task.add_done_callback(progressive_stt_tasks.discard)

    # ── Main loop ──
    try:
        while True:
            data = await websocket.receive()

            if "bytes" in data:
                await handle_bytes(data["bytes"])
            elif "text" in data:
                try:
                    message = json.loads(data["text"])
                    if not isinstance(message, dict):
                        continue
                    if message.get("type") == "stop_talking":
                        await handle_stop_talking()
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    safe_msg = "Internal server error" if not isinstance(e, ValueError) else str(e)
                    await websocket.send_json({"type": "error", "message": safe_msg})
                    reset_audio_buffer()

    except WebSocketDisconnect:
        print("[WS] Client disconnected.")
    except RuntimeError as e:
        if "disconnect" in str(e) or "Cannot call" in str(e):
            print("[WS] Client disconnected gracefully.")
        else:
            print("[WS] RuntimeError:", e)
    finally:
        for task in progressive_stt_tasks:
            task.cancel()
        if os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except Exception:
                pass
