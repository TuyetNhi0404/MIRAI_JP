"""LLM cascade: Gemini → OpenRouter → (optional) Local last."""

from __future__ import annotations

import time

import llm


def test_chain_without_local_stops_after_openrouter(monkeypatch):
    calls: list[str] = []

    monkeypatch.setattr(llm, "USE_LOCAL_LLM", False)
    monkeypatch.setattr(llm, "_gemini_reply", lambda _m: (_ for _ in ()).throw(RuntimeError("g")))
    monkeypatch.setattr(
        llm,
        "_openrouter_reply",
        lambda _m: calls.append("openrouter") or (_ for _ in ()).throw(RuntimeError("o")),
    )
    monkeypatch.setattr(llm, "_local_reply", lambda _m: calls.append("local") or "LOCAL")

    out = llm.get_ai_reply([{"role": "user", "content": "hi"}])
    assert "không khả dụng" in out.lower() or "API" in out
    assert calls == ["openrouter"]
    assert "local" not in calls


def test_chain_with_local_uses_local_as_final_chot_chan(monkeypatch):
    calls: list[str] = []

    monkeypatch.setattr(llm, "USE_LOCAL_LLM", True)
    monkeypatch.setattr(
        llm,
        "_gemini_reply",
        lambda _m: calls.append("gemini") or (_ for _ in ()).throw(RuntimeError("g")),
    )
    monkeypatch.setattr(
        llm,
        "_openrouter_reply",
        lambda _m: calls.append("openrouter") or (_ for _ in ()).throw(RuntimeError("o")),
    )
    monkeypatch.setattr(llm, "_local_reply", lambda _m: calls.append("local") or "LOCAL_OK")

    out = llm.get_ai_reply([{"role": "user", "content": "hi"}])
    assert out == "LOCAL_OK"
    assert calls == ["gemini", "openrouter", "local"]


def test_chain_gemini_success_skips_rest(monkeypatch):
    calls: list[str] = []

    monkeypatch.setattr(llm, "USE_LOCAL_LLM", True)
    monkeypatch.setattr(llm, "_gemini_reply", lambda _m: calls.append("gemini") or "GEMINI_OK")
    monkeypatch.setattr(llm, "_openrouter_reply", lambda _m: calls.append("openrouter") or "OR")
    monkeypatch.setattr(llm, "_local_reply", lambda _m: calls.append("local") or "LOCAL")

    out = llm.get_ai_reply([{"role": "user", "content": "hi"}])
    assert out == "GEMINI_OK"
    assert calls == ["gemini"]


def test_provider_timeout_falls_through(monkeypatch):
    calls: list[str] = []

    monkeypatch.setattr(llm, "USE_LOCAL_LLM", True)
    monkeypatch.setattr(llm, "LLM_TIMEOUT_GEMINI", 0.05)
    monkeypatch.setattr(llm, "LLM_TIMEOUT_OPENROUTER", 5.0)
    monkeypatch.setattr(llm, "LLM_TIMEOUT_LOCAL", 5.0)
    monkeypatch.setattr(llm, "LLM_CHAIN_BUDGET", 10.0)

    def slow_gemini(_m):
        calls.append("gemini")
        time.sleep(1.0)
        return "TOO_LATE"

    monkeypatch.setattr(llm, "_gemini_reply", slow_gemini)
    monkeypatch.setattr(llm, "_openrouter_reply", lambda _m: calls.append("openrouter") or "OR_OK")
    monkeypatch.setattr(llm, "_local_reply", lambda _m: calls.append("local") or "LOCAL")

    out = llm.get_ai_reply([{"role": "user", "content": "hi"}])
    assert out == "OR_OK"
    assert calls == ["gemini", "openrouter"]


def test_chain_budget_skips_local_when_exhausted(monkeypatch):
    calls: list[str] = []

    monkeypatch.setattr(llm, "USE_LOCAL_LLM", True)
    monkeypatch.setattr(llm, "LLM_TIMEOUT_GEMINI", 5.0)
    monkeypatch.setattr(llm, "LLM_TIMEOUT_OPENROUTER", 5.0)
    monkeypatch.setattr(llm, "LLM_TIMEOUT_LOCAL", 5.0)
    monkeypatch.setattr(llm, "LLM_CHAIN_BUDGET", 0.0)  # no time left at all

    monkeypatch.setattr(llm, "_gemini_reply", lambda _m: calls.append("gemini") or "G")
    monkeypatch.setattr(llm, "_openrouter_reply", lambda _m: calls.append("openrouter") or "O")
    monkeypatch.setattr(llm, "_local_reply", lambda _m: calls.append("local") or "L")

    out = llm.get_ai_reply([{"role": "user", "content": "hi"}])
    assert "không khả dụng" in out.lower() or "API" in out
    assert calls == []
