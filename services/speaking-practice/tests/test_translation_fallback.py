import llm


def test_translation_uses_openrouter_without_calling_gemini(monkeypatch):
    def unexpected_gemini(_messages):
        raise AssertionError("Gemini must not be used for tooltip translation")

    monkeypatch.setattr(llm, "_gemini_reply_short", unexpected_gemini)
    monkeypatch.setattr(llm, "_openrouter_reply_short", lambda _messages: "Âm nhạc")

    result = llm._translate_reply([{"role": "user", "content": "音楽"}])
    assert result == "Âm nhạc"


def test_translation_falls_back_to_local_when_openrouter_fails(monkeypatch):
    monkeypatch.setattr(llm, "_openrouter_reply_short", lambda _messages: (_ for _ in ()).throw(RuntimeError()))
    monkeypatch.setattr(llm, "_local_reply_short", lambda _messages: "Âm nhạc")

    result = llm._translate_reply([{"role": "user", "content": "音楽"}])
    assert result == "Âm nhạc"
