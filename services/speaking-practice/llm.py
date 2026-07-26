"""
llm.py
─────────────────────────────────────────────────────────────────────────────
LLM provider chain: Gemini → OpenRouter → Local llama.cpp (final fallback)

Env vars
────────
GEMINI_API_KEY        – Gemini API key        (primary)
OPENROUTER_API_KEY    – OpenRouter key        (fallback)
LOCAL_LLM_URL         – llama.cpp server URL  (default: http://local-llm:11434 | final fallback)
LOCAL_LLM_MODEL       – local model name      (default: qwen3-1.7b)
LLM_MODEL             – Gemini model          (default: gemini-3.5-flash)
OPENROUTER_MODEL      – fallback model        (default: openai/gpt-4o-mini)
LLM_MAX_TOKENS        – max output tokens     (default: 256)
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
from collections import OrderedDict

import httpx
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None
    types = None
    _GENAI_AVAILABLE = False

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────

LOCAL_LLM_URL: str = os.getenv("LOCAL_LLM_URL", "http://local-llm:11434")
LOCAL_LLM_MODEL: str = os.getenv("LOCAL_LLM_MODEL", "qwen3-1.7b")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
# When true: local llama.cpp is tried first, then OpenRouter, then Gemini.
# When false (default): Gemini first, then OpenRouter. Local is never used.
USE_LOCAL_LLM: bool = os.getenv("USE_LOCAL_LLM", "false").lower() in {"1", "true", "yes"}

LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-3.5-flash")
OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "256"))

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    **({"HTTP-Referer": os.getenv("YOUR_SITE_URL")} if os.getenv("YOUR_SITE_URL") else {}),
    **({"X-Title": os.getenv("YOUR_SITE_NAME")} if os.getenv("YOUR_SITE_NAME") else {}),
}

# ── Gemini client singleton ──────────────────────────────────────────────────
_gemini_client: genai.Client | None = (
    genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY and _GENAI_AVAILABLE else None
)

# ── Shared HTTP clients (connection pooling) ─────────────────────────────────

_local_client = httpx.Client(timeout=20.0)
_openrouter_client = httpx.Client(timeout=15.0)

# ── Sentinel exceptions ──────────────────────────────────────────────────────

class LocalUnavailable(Exception):
    pass

class GeminiUnavailable(Exception):
    pass

class AllProvidersExhausted(Exception):
    pass


def _max_tokens_for(messages: list[dict]) -> int:
    for message in reversed(messages):
        if message.get("role") != "system":
            continue
        match = re.search(r"\[OUTPUT_TOKEN_LIMIT:\s*(\d+)\]", message.get("content", ""))
        if match:
            return min(MAX_TOKENS, max(16, int(match.group(1))))
    return MAX_TOKENS


# ── Provider: Local llama.cpp ────────────────────────────────────────────────

def _inject_no_think(messages: list[dict]) -> list[dict]:
    msgs = [m.copy() for m in messages]
    for m in msgs:
        if m["role"] == "system":
            m["content"] = "/no_think\n" + m["content"]
            break
    return msgs


def _local_reply(messages: list[dict]) -> str:
    payload = {
        "model": LOCAL_LLM_MODEL,
        "messages": _inject_no_think(messages),
        "max_tokens": _max_tokens_for(messages),
        "temperature": 0.7,
        "stream": False,
    }
    resp = _local_client.post(f"{LOCAL_LLM_URL}/v1/chat/completions", json=payload)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]



def _is_rate_limit(err_msg: str) -> bool:
    return "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg


def _build_gemini_contents(
    messages: list[dict],
) -> tuple[str | None, list[types.Content]]:
    system_parts: list[str] = []
    contents: list[types.Content] = []

    for msg in messages:
        role, text = msg["role"], msg["content"]
        if role == "system":
            system_parts.append(text)
        elif role == "user":
            contents.append(types.Content(role="user", parts=[types.Part(text=text)]))
        elif role == "assistant":
            contents.append(types.Content(role="model", parts=[types.Part(text=text)]))

    return ("\n\n".join(system_parts) or None), contents


def _gemini_reply(messages: list[dict]) -> str:
    if not _gemini_client:
        raise GeminiUnavailable("GEMINI_API_KEY not set.")

    system_instruction, contents = _build_gemini_contents(messages)
    try:
        response = _gemini_client.models.generate_content(
            model=LLM_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                max_output_tokens=_max_tokens_for(messages),
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        _log_gemini_usage(response.usage_metadata)
        return response.text or ""

    except Exception as e:
        err_msg = str(e)
        if _is_rate_limit(err_msg):
            print(f"[GEMINI RATE LIMIT] {err_msg}")
            raise GeminiUnavailable("Rate limit hit.") from e
        print(f"[GEMINI ERROR] {err_msg}")
        raise



def _log_gemini_usage(usage) -> None:
    if usage:
        print(
            f"[GEMINI STATS] In: {usage.prompt_token_count} | "
            f"Out: {usage.candidates_token_count} | "
            f"Total: {usage.total_token_count}"
        )


# ── Provider: OpenRouter ─────────────────────────────────────────────────────

def _openrouter_reply(messages: list[dict]) -> str:
    if not OPENROUTER_API_KEY:
        raise AllProvidersExhausted("OPENROUTER_API_KEY not set.")

    print(f"[FALLBACK] Switching to OpenRouter ({OPENROUTER_MODEL})…")
    resp = _openrouter_client.post(
        f"{OPENROUTER_BASE_URL}/chat/completions",
        headers=OPENROUTER_HEADERS,
        json={
            "model": OPENROUTER_MODEL,
            "messages": messages,
            "max_tokens": _max_tokens_for(messages),
        },
    )
    resp.raise_for_status()
    data = resp.json()

    usage = data.get("usage", {})
    if usage:
        print(
            f"[OPENROUTER STATS] In: {usage.get('prompt_tokens')} | "
            f"Out: {usage.get('completion_tokens')} | "
            f"Total: {usage.get('total_tokens')}"
        )

    return data["choices"][0]["message"]["content"]



def get_ai_reply(messages: list[dict]) -> str:
    if USE_LOCAL_LLM:
        try:
            return _local_reply(messages)
        except Exception as e:
            print(f"[LLM] Local failed: {e}, fallback OpenRouter")

        try:
            return _openrouter_reply(messages)
        except Exception as e:
            print(f"[LLM] OpenRouter failed: {e}, fallback Gemini")

        try:
            return _gemini_reply(messages)
        except Exception as e:
            print(f"[LLM] Gemini failed: {e}")
            return "Tất cả API providers đều không khả dụng. Vui lòng kiểm tra API key."

    try:
        return _gemini_reply(messages)
    except Exception as e:
        print(f"[LLM] Gemini failed: {e}, fallback OpenRouter")

    try:
        return _openrouter_reply(messages)
    except Exception as e:
        print(f"[LLM] OpenRouter failed: {e}")
        return "Tất cả API providers đều không khả dụng. Vui lòng kiểm tra API key."


TRANSLATE_CACHE_MAX = 200
TRANSLATE_CACHE_TTL = 3600

_translate_cache: OrderedDict[str, tuple[str, float]] = OrderedDict()
_cache_lock = threading.Lock()

_JAPANESE_GLOSSARY = {
    "音楽": "Âm nhạc",
    "料理": "Nấu ăn / ẩm thực",
    "旅行": "Du lịch",
    "映画": "Phim ảnh",
    "趣味": "Sở thích",
}


def _translate_cache_key(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def translate_japanese_to_vietnamese(text: str) -> str:
    cleaned = (text or "").strip()
    if not cleaned:
        return ""

    glossary_key = cleaned.strip("()（）[]［］ ")
    if glossary_key in _JAPANESE_GLOSSARY:
        return _JAPANESE_GLOSSARY[glossary_key]

    cache_key = _translate_cache_key(cleaned)

    with _cache_lock:
        if cache_key in _translate_cache:
            value, ts = _translate_cache[cache_key]
            if time.time() - ts < TRANSLATE_CACHE_TTL:
                _translate_cache.move_to_end(cache_key)
                return value
            del _translate_cache[cache_key]

    messages = [
        {
            "role": "system",
            "content": (
                "Translate this Japanese to Vietnamese. "
                "Output ONLY the Vietnamese translation, nothing else."
            ),
        },
        {"role": "user", "content": cleaned},
    ]

    result = _translate_reply(messages)

    if result and not result.startswith("[") and len(result) >= 2:
        with _cache_lock:
            if len(_translate_cache) >= TRANSLATE_CACHE_MAX:
                _translate_cache.popitem(last=False)
            _translate_cache[cache_key] = (result, time.time())
    return result


def _translate_reply(messages: list[dict]) -> str:
    try:
        return _openrouter_reply_short(messages)
    except Exception as e:
        print(f"[TRANSLATE] OpenRouter failed: {e}, fallback Local")

    try:
        return _local_reply_short(messages)
    except Exception as e:
        print(f"[TRANSLATE] Local failed: {e}")
        return "[Dịch vụ tạm thời không khả dụng — thử lại sau]"


def _gemini_reply_short(messages: list[dict]) -> str:
    if not _gemini_client:
        raise GeminiUnavailable("GEMINI_API_KEY not set.")
    system_instruction, contents = _build_gemini_contents(messages)
    response = _gemini_client.models.generate_content(
        model=LLM_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            max_output_tokens=80,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )
    return (response.text or "").strip()


def _local_reply_short(messages: list[dict]) -> str:
    payload = {
        "model": LOCAL_LLM_MODEL,
        "messages": _inject_no_think(messages),
        "max_tokens": 80,
        "temperature": 0.3,
        "stream": False,
    }
    resp = _local_client.post(f"{LOCAL_LLM_URL}/v1/chat/completions", json=payload)
    resp.raise_for_status()
    data = resp.json()
    return (data["choices"][0]["message"]["content"] or "").strip()


def _openrouter_reply_short(messages: list[dict]) -> str:
    if not OPENROUTER_API_KEY:
        raise AllProvidersExhausted("OPENROUTER_API_KEY not set.")

    print(f"[TRANSLATE] Switching to OpenRouter ({OPENROUTER_MODEL})")
    resp = _openrouter_client.post(
        f"{OPENROUTER_BASE_URL}/chat/completions",
        headers=OPENROUTER_HEADERS,
        json={
            "model": OPENROUTER_MODEL,
            "messages": messages,
            "max_tokens": 80,
            "temperature": 0.3,
        },
    )
    resp.raise_for_status()
    data = resp.json()
    return (data["choices"][0]["message"]["content"] or "").strip()


# ── Combined reply + grammar (single LLM call) ──────────────────────────────

_COMBINED_SYSTEM = """You are Mirai (ミライ), a Japanese conversation coach for Vietnamese learners.
Given the learner's Japanese sentence and the teaching context, respond ONCE with
ONLY valid JSON (no markdown) of this exact shape:

{
  "reply": "<Mirai's natural Japanese reply, 1-3 sentences, following all persona/level rules>",
  "severity": "none" | "minor" | "should_fix" | "important",
  "grammar": "<grammar point as snake_case, or empty string if none>",
  "explanation": "<1-2 sentences in Vietnamese explaining any issue, or praise if correct>",
  "suggestion": "<corrected Japanese sentence, or same as original if no fix needed>"
}

Rules:
- severity "none": sentence is correct.
- severity "minor": small nuance, acceptable in conversation (suggestion MUST equal original).
- severity "should_fix": clear grammar/word-form mistake.
- severity "important": mistake blocking understanding.
- The "reply" field is the real conversation turn and MUST obey the level/output
  limits given in the context. Do NOT put grammar lectures in "reply".
- Output ONLY the JSON object."""


def get_reply_and_grammar(
    transcript: str,
    level: str,
    history: list[str] | None = None,
    reply_messages: list[dict] | None = None,
) -> tuple[str, dict]:
    """Single LLM call that returns both the conversation reply and grammar feedback."""
    context = ""
    if history:
        recent = [h for h in history if h.strip()][-4:]
        if recent:
            context = "Recent conversation:\n" + "\n".join(f"- {h}" for h in recent) + "\n\n"

    user_content = (
        f"{context}"
        f"JLPT level: {level}\n"
        f"Learner said:\n{transcript}"
    )
    messages = [
        {"role": "system", "content": _COMBINED_SYSTEM},
        {"role": "user", "content": user_content},
    ]

    raw = get_ai_reply(messages)
    parsed = _parse_combined_json(raw, transcript)
    return parsed["reply"], parsed


def _parse_combined_json(raw: str, fallback_original: str) -> dict:
    import json as _json
    import re as _re

    text = (raw or "").strip()
    match = _re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            data = _json.loads(match.group())
            if isinstance(data, dict) and data.get("reply"):
                return _normalize_combined(data, fallback_original)
        except _json.JSONDecodeError:
            pass

    # Fallback: treat the raw text as the reply, no grammar feedback.
    return {
        "reply": text or "すみません、もう一度お願いします。",
        "severity": "none",
        "grammar": "",
        "explanation": "",
        "suggestion": fallback_original,
    }


def _normalize_combined(data: dict, fallback_original: str) -> dict:
    severity = str(data.get("severity", "none")).lower()
    if severity not in ("none", "minor", "should_fix", "important"):
        severity = "none"
    grammar = str(data.get("grammar") or "").strip()
    suggestion = str(data.get("suggestion") or fallback_original).strip()
    explanation = str(data.get("explanation") or "").strip()
    reply = str(data.get("reply") or "").strip()
    if severity == "minor":
        suggestion = fallback_original
    if not reply:
        reply = "すみません、もう一度お願いします。"
    return {
        "reply": reply,
        "severity": severity,
        "grammar": grammar,
        "explanation": explanation or "Không có ghi chú thêm.",
        "suggestion": suggestion,
    }


