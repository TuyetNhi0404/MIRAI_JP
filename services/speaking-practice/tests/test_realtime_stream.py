"""Realtime speaking stability tests (/stream + /ws push) with mocked STT/LLM/TTS."""

from __future__ import annotations

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("SPEAKING_INTERNAL_KEY", "mirai-speaking-dev-key")
os.environ.setdefault("SKIP_SPEAKING_AUTH", "false")

from main import app
from sessions import reset_user_session, get_session
from ws_push import registry as ws_registry

AUTH_HEADERS = {
    "x-speaking-internal-key": "mirai-speaking-dev-key",
    "x-user-id": "rt-test-user",
}

FAKE_AUDIO = b"\x1a\x45\xdf\xa3" + b"\x00" * 200  # enough bytes for a fake chunk


def _collect_until_done(ws, timeout_msgs: int = 200) -> list[dict]:
    msgs: list[dict] = []
    for _ in range(timeout_msgs):
        data = ws.receive_json()
        msgs.append(data)
        if data.get("type") in ("done", "error"):
            break
    return msgs


def _types(msgs: list[dict]) -> list[str]:
    return [m.get("type", "") for m in msgs]


@pytest.fixture
def client():
    reset_user_session("rt-test-user", "N5")
    # Clear any leftover push sockets from previous tests.
    if "rt-test-user" in ws_registry._conns:
        ws_registry._conns.pop("rt-test-user", None)
    with TestClient(app) as c:
        yield c
    reset_user_session("rt-test-user", "N5")


class TestStreamRealtime:
    def test_stop_without_audio_returns_error(self, client: TestClient):
        with client.websocket_connect("/stream", headers=AUTH_HEADERS) as ws:
            ws.send_json({"type": "stop_talking"})
            msg = ws.receive_json()
            assert msg["type"] == "error"
            assert "No audio" in msg["message"]

    def test_happy_path_emits_transcript_tokens_audio_done(self, client: TestClient):
        with (
            patch("stream_handler.transcribe_audio", return_value=("こんにちは。", 0.9)),
            patch(
                "stream_handler.get_reply_and_grammar",
                return_value=(
                    "こんにちは。お元気ですか。",
                    {"severity": "none", "grammar": "", "explanation": "", "suggestion": "こんにちは。"},
                ),
            ),
            patch("stream_handler.generate_audio", return_value="/audio/fake.mp3"),
        ):
            with client.websocket_connect("/stream", headers=AUTH_HEADERS) as ws:
                ws.send_bytes(FAKE_AUDIO)
                ws.send_json({"type": "stop_talking"})
                msgs = _collect_until_done(ws)

        types = _types(msgs)
        assert "status" in types
        assert "transcript" in types
        assert "stats" in types
        assert "llm_token" in types
        assert "audio_chunk" in types
        assert types[-1] == "done"

        transcript = next(m for m in msgs if m["type"] == "transcript")
        assert transcript["text"] == "こんにちは。"
        audio = next(m for m in msgs if m["type"] == "audio_chunk")
        assert audio["url"] == "/audio/fake.mp3"

        # History persisted with both roles
        session = get_session("rt-test-user")
        assert len(session.history) >= 2
        assert session.history[-2]["role"] == "user"
        assert session.history[-1]["role"] == "ai"

    def test_memory_retained_across_two_turns(self, client: TestClient):
        """Second turn must receive full dialogue + known nationality fact."""
        llm_calls: list[dict] = []

        def fake_llm(transcript, level, history=None, reply_messages=None, topic=None, known_facts=None):
            llm_calls.append(
                {
                    "transcript": transcript,
                    "history": list(history or []),
                    "known_facts": dict(known_facts or {}),
                }
            )
            if "ベトナム" in transcript:
                return (
                    "ベトナムですね。お名前は？",
                    {"severity": "none", "grammar": "", "explanation": "", "suggestion": transcript},
                )
            return (
                "たなかさんですね。",
                {"severity": "none", "grammar": "", "explanation": "", "suggestion": transcript},
            )

        transcripts = ["私はベトナム人です。", "田中です。"]

        with (
            patch("stream_handler.transcribe_audio", side_effect=[(t, 0.92) for t in transcripts]),
            patch("stream_handler.get_reply_and_grammar", side_effect=fake_llm),
            patch("stream_handler.generate_audio", return_value="/audio/fake.mp3"),
        ):
            with client.websocket_connect("/stream", headers=AUTH_HEADERS) as ws:
                for _ in transcripts:
                    ws.send_bytes(FAKE_AUDIO)
                    ws.send_json({"type": "stop_talking"})
                    msgs = _collect_until_done(ws)
                    assert _types(msgs)[-1] == "done"

        assert len(llm_calls) == 2
        second = llm_calls[1]
        # Full dialogue (user+ai), not user-only strings
        assert any(isinstance(h, dict) and h.get("role") == "ai" for h in second["history"])
        assert any("ベトナム" in str(h.get("text", "")) for h in second["history"] if isinstance(h, dict))
        assert second["known_facts"].get("nationality") == "Vietnam"

        session = get_session("rt-test-user")
        assert session.known_facts.get("nationality") == "Vietnam"
        assert len(session.history) == 4  # 2 turns × (user+ai)

    def test_five_turns_stable_no_crash(self, client: TestClient):
        replies = [f"返事{i}です。" for i in range(5)]
        with (
            patch(
                "stream_handler.transcribe_audio",
                side_effect=[(f"発話{i}です。", 0.8) for i in range(5)],
            ),
            patch(
                "stream_handler.get_reply_and_grammar",
                side_effect=[
                    (r, {"severity": "none", "grammar": "", "explanation": "", "suggestion": ""})
                    for r in replies
                ],
            ),
            patch("stream_handler.generate_audio", return_value="/audio/t.mp3"),
        ):
            with client.websocket_connect("/stream", headers=AUTH_HEADERS) as ws:
                for i in range(5):
                    ws.send_bytes(FAKE_AUDIO + bytes([i]))
                    ws.send_json({"type": "stop_talking"})
                    msgs = _collect_until_done(ws)
                    assert msgs[-1]["type"] == "done", f"turn {i} did not complete"
                    assert any(m["type"] == "transcript" for m in msgs)

        session = get_session("rt-test-user")
        assert len(session.history) == 10

    def test_empty_transcript_still_finishes_cleanly(self, client: TestClient):
        with (
            patch("stream_handler.transcribe_audio", return_value=("", 0.0)),
            patch("stream_handler.generate_audio") as tts,
        ):
            with client.websocket_connect("/stream", headers=AUTH_HEADERS) as ws:
                ws.send_bytes(FAKE_AUDIO)
                ws.send_json({"type": "stop_talking"})
                msgs = _collect_until_done(ws)

        types = _types(msgs)
        assert "transcript" in types
        assert types[-1] == "done"
        tts.assert_not_called()


class TestWsPushChannel:
    def test_ws_registers_and_accepts_connection(self, client: TestClient):
        with client.websocket_connect("/ws", headers=AUTH_HEADERS):
            assert ws_registry.get("rt-test-user") is not None
        assert ws_registry.get("rt-test-user") is None

    def test_background_turn_pushes_when_socket_connected(self, client: TestClient):
        """Background orchestrator pushes reply if /ws is registered."""
        from main import _process_turn_background
        import time
        import anyio

        pushed: list[dict] = []

        class FakeWs:
            async def send_json(self, message):
                pushed.append(message)

        async def run_turn():
            await ws_registry.connect("rt-test-user", FakeWs())  # type: ignore[arg-type]
            try:
                await _process_turn_background(
                    user_id="rt-test-user",
                    transcript="ベトナム人です。",
                    confidence=0.9,
                    level="N5",
                    t_start=time.time(),
                )
            finally:
                await ws_registry.disconnect("rt-test-user")

        with (
            patch(
                "main.get_reply_and_grammar",
                return_value=(
                    "そうですか。",
                    {
                        "severity": "none",
                        "grammar": "",
                        "explanation": "",
                        "suggestion": "はい。",
                    },
                ),
            ),
            patch("main.generate_audio", return_value="/audio/push.mp3"),
        ):
            anyio.run(run_turn)

        assert pushed, "expected a pushed reply on /ws"
        assert pushed[0]["type"] == "reply"
        assert pushed[0].get("reply") == "そうですか。"
        session = get_session("rt-test-user")
        assert session.known_facts.get("nationality") == "Vietnam"

    def test_reply_http_keeps_memory(self, client: TestClient):
        """Fallback /reply path also stores known_facts + dialogue."""
        calls: list[dict] = []

        def fake_llm(transcript, level, history=None, reply_messages=None, topic=None, known_facts=None):
            calls.append({"history": list(history or []), "known_facts": dict(known_facts or {})})
            return (
                "ベトナムですね。",
                {"severity": "none", "grammar": "", "explanation": "", "suggestion": transcript},
            )

        with patch("main.get_reply_and_grammar", side_effect=fake_llm), patch(
            "main.generate_audio", return_value=None
        ):
            r1 = client.post(
                "/reply",
                headers=AUTH_HEADERS,
                json={"transcript": "私はベトナム人です。"},
            )
            assert r1.status_code == 200
            r2 = client.post(
                "/reply",
                headers=AUTH_HEADERS,
                json={"transcript": "田中です。"},
            )
            assert r2.status_code == 200

        assert len(calls) == 2
        assert calls[1]["known_facts"].get("nationality") == "Vietnam"
        assert any(
            isinstance(h, dict) and h.get("role") == "ai" for h in calls[1]["history"]
        )


class TestHealthAndAuth:
    def test_health(self, client: TestClient):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_stream_rejects_missing_auth(self, client: TestClient):
        with pytest.raises(Exception):
            with client.websocket_connect("/stream"):
                pass
