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
LLM_MODEL             – Gemini model          (default: gemini-2.5-flash)
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
from typing import Generator

import httpx
from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore[assignment]
    types = None  # type: ignore[assignment]
    _GENAI_AVAILABLE = False

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────

LOCAL_LLM_URL: str = os.getenv("LOCAL_LLM_URL", "http://local-llm:11434")
LOCAL_LLM_MODEL: str = os.getenv("LOCAL_LLM_MODEL", "qwen3-1.7b")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash")
OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "256"))

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    **({"HTTP-Referer": os.getenv("YOUR_SITE_URL")} if os.getenv("YOUR_SITE_URL") else {}),
    **({"X-Title": os.getenv("YOUR_SITE_NAME")} if os.getenv("YOUR_SITE_NAME") else {}),
}

# ── Sentinel exceptions ──────────────────────────────────────────────────────

class LocalUnavailable(Exception):
    """Raised when local LLM fails."""


class GeminiUnavailable(Exception):
    """Raised when Gemini should not be tried (missing key or rate-limited)."""


class AllProvidersExhausted(Exception):
    """Raised when every provider in the chain has failed."""


def _max_tokens_for(messages: list[dict]) -> int:
    """Honor a per-turn level cap embedded by the speaking prompt builder."""
    for message in reversed(messages):
        if message.get("role") != "system":
            continue
        match = re.search(r"\[OUTPUT_TOKEN_LIMIT:\s*(\d+)\]", message.get("content", ""))
        if match:
            return min(MAX_TOKENS, max(16, int(match.group(1))))
    return MAX_TOKENS


# ── Provider: Local llama.cpp ────────────────────────────────────────────────

def _inject_no_think(messages: list[dict]) -> list[dict]:
    """Add /no_think prefix to system prompt to disable Qwen3 thinking mode."""
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
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(f"{LOCAL_LLM_URL}/v1/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def _local_stream(messages: list[dict]) -> Generator[str, None, None]:
    payload = {
        "model": LOCAL_LLM_MODEL,
        "messages": _inject_no_think(messages),
        "max_tokens": _max_tokens_for(messages),
        "temperature": 0.7,
        "stream": True,
    }
    with httpx.Client(timeout=30.0) as http:
        with http.stream(
            "POST",
            f"{LOCAL_LLM_URL}/v1/chat/completions",
            json=payload,
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if raw == "[DONE]":
                    break
                try:
                    chunk = json.loads(raw)
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except (json.JSONDecodeError, KeyError):
                    continue


# ── Provider: Gemini ─────────────────────────────────────────────────────────

_gemini_client: genai.Client | None = (
    genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY and _GENAI_AVAILABLE else None
)


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


def _gemini_stream(messages: list[dict]) -> Generator[str, None, None]:
    if not _gemini_client:
        raise GeminiUnavailable("GEMINI_API_KEY not set.")

    system_instruction, contents = _build_gemini_contents(messages)
    try:
        stream = _gemini_client.models.generate_content_stream(
            model=LLM_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                max_output_tokens=_max_tokens_for(messages),
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        for chunk in stream:
            if chunk.text:
                yield chunk.text
            if getattr(chunk, "usage_metadata", None):
                _log_gemini_usage(chunk.usage_metadata)

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
    with httpx.Client(timeout=60) as http:
        resp = http.post(
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


def _openrouter_stream(messages: list[dict]) -> Generator[str, None, None]:
    if not OPENROUTER_API_KEY:
        raise AllProvidersExhausted("OPENROUTER_API_KEY not set.")

    print(f"[FALLBACK] Switching to OpenRouter stream ({OPENROUTER_MODEL})…")
    with httpx.Client(timeout=60) as http:
        with http.stream(
            "POST",
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers=OPENROUTER_HEADERS,
            json={
                "model": OPENROUTER_MODEL,
                "messages": messages,
                "max_tokens": _max_tokens_for(messages),
                "stream": True,
            },
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]":
                    break
                try:
                    chunk = json.loads(payload)
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except (json.JSONDecodeError, KeyError):
                    continue


# ── Public API ───────────────────────────────────────────────────────────────

def get_ai_reply(messages: list[dict]) -> str:
    """
    Non-streaming reply.
    Provider chain: Gemini → OpenRouter → Local llama.cpp
    """
    # 1. Try Gemini (primary)
    try:
        return _gemini_reply(messages)
    except GeminiUnavailable as e:
        print(f"[LLM] Gemini unavailable: {e}, fallback OpenRouter")

    # 2. Try OpenRouter
    try:
        return _openrouter_reply(messages)
    except Exception as e:
        print(f"[LLM] OpenRouter failed: {e}, fallback Local")

    # 3. Try Local llama.cpp (final fallback)
    try:
        return _local_reply(messages)
    except Exception as e:
        print(f"[LLM] Local failed: {e}")
        return "Tất cả API providers đều không khả dụng. Vui lòng kiểm tra API key."


TRANSLATE_CACHE_MAX = 200
TRANSLATE_CACHE_TTL = 3600

_translate_cache: OrderedDict[str, tuple[str, float]] = OrderedDict()
_cache_lock = threading.Lock()

# Fast path for the first, very common speaking-topic words. It keeps the
# vocabulary tooltip useful even while an LLM provider is slow or unavailable.
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
    """Dịch câu tiếng Nhật sang tiếng Việt — LRU cache + thread-safe + TTL."""
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
    """Translate-only chain: OpenRouter → Local (max 80 tokens)."""
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
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(f"{LOCAL_LLM_URL}/v1/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return (data["choices"][0]["message"]["content"] or "").strip()


def _openrouter_reply_short(messages: list[dict]) -> str:
    """OpenRouter fallback for a tooltip translation; keep it fast and concise."""
    if not OPENROUTER_API_KEY:
        raise AllProvidersExhausted("OPENROUTER_API_KEY not set.")

    print(f"[TRANSLATE] Switching to OpenRouter ({OPENROUTER_MODEL})")
    with httpx.Client(timeout=20.0) as http:
        resp = http.post(
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


def get_ai_reply_stream(messages: list[dict]) -> Generator[str, None, None]:
    """
    Streaming reply.
    Provider chain: Gemini → OpenRouter → Local llama.cpp
    """
    # 1. Try Gemini (primary)
    try:
        gen = _gemini_stream(messages)
        first = next(gen)
        yield first
        yield from gen
        return
    except StopIteration:
        return
    except GeminiUnavailable as e:
        print(f"[LLM] Gemini stream unavailable: {e}, fallback OpenRouter")

    # 2. Try OpenRouter
    try:
        gen = _openrouter_stream(messages)
        first = next(gen)
        yield first
        yield from gen
        return
    except StopIteration:
        return
    except Exception as e:
        print(f"[LLM] OpenRouter stream failed: {e}, fallback Local")

    # 3. Try Local llama.cpp (final fallback)
    try:
        yield from _local_stream(messages)
    except Exception as e:
        print(f"[LLM] Local stream failed: {e}")
        yield "Tất cả API providers đều không khả dụng. Vui lòng kiểm tra API key."
