"""
llm_client.py
─────────────────────────────────────────────────────────────────────────────
LLM provider chain: Local (llama.cpp) → Gemini → OpenRouter (fallback)

Env vars
────────
LOCAL_LLM_URL         – llama.cpp server URL  (default: http://local-llm:11434)
LOCAL_LLM_MODEL       – local model name      (default: qwen3-1.7b)
GEMINI_API_KEY        – Gemini API key        (optional fallback)
OPENROUTER_API_KEY    – OpenRouter key        (final fallback)
LLM_MODEL             – Gemini model          (default: gemini-2.5-flash)
OPENROUTER_MODEL      – fallback model        (default: openai/gpt-4o-mini)
LLM_MAX_TOKENS        – max output tokens     (default: 256)
"""

from __future__ import annotations

import json
import os
from typing import Generator

import httpx
from dotenv import load_dotenv
from google import genai
from google.genai import types

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
        "max_tokens": MAX_TOKENS,
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
        "max_tokens": MAX_TOKENS,
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
    genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
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
                max_output_tokens=MAX_TOKENS,
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
                max_output_tokens=MAX_TOKENS,
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
                "max_tokens": MAX_TOKENS,
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
                "max_tokens": MAX_TOKENS,
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
    Provider chain: Local → Gemini → OpenRouter
    """
    # 1. Try Local llama.cpp
    try:
        return _local_reply(messages)
    except Exception as e:
        print(f"[LLM] Local failed: {e}, fallback Gemini")

    # 2. Try Gemini
    try:
        return _gemini_reply(messages)
    except GeminiUnavailable as e:
        print(f"[FALLBACK TRIGGER] Gemini unavailable: {e}")

    # 3. Try OpenRouter
    try:
        return _openrouter_reply(messages)
    except AllProvidersExhausted:
        return "Tất cả API providers đều không khả dụng. Vui lòng kiểm tra API key."
    except Exception as e:
        print(f"[OPENROUTER ERROR] {e}")
        return "Lỗi khi kết nối AI. Vui lòng thử lại sau."


def translate_japanese_to_vietnamese(text: str) -> str:
    """Dịch câu tiếng Nhật sang tiếng Việt (chỉ dùng cho hover tooltip)."""
    cleaned = (text or "").strip()
    if not cleaned:
        return ""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a Japanese-to-Vietnamese translator. "
                "Translate the user's Japanese into natural, concise Vietnamese. "
                "Output ONLY the Vietnamese translation — no quotes, labels, or explanations."
            ),
        },
        {"role": "user", "content": cleaned},
    ]
    return get_ai_reply(messages)


def get_ai_reply_stream(messages: list[dict]) -> Generator[str, None, None]:
    """
    Streaming reply.
    Provider chain: Local → Gemini → OpenRouter
    """
    # 1. Try Local llama.cpp
    try:
        gen = _local_stream(messages)
        first = next(gen)
        yield first
        yield from gen
        return
    except StopIteration:
        return
    except Exception as e:
        print(f"[LLM] Local stream failed: {e}, fallback Gemini")

    # 2. Try Gemini
    try:
        gen = _gemini_stream(messages)
        first = next(gen)
        yield first
        yield from gen
        return
    except StopIteration:
        return
    except GeminiUnavailable as e:
        print(f"[FALLBACK TRIGGER] Gemini unavailable: {e}")

    # 3. Try OpenRouter
    try:
        yield from _openrouter_stream(messages)
    except AllProvidersExhausted:
        yield "Tất cả API providers đều không khả dụng. Vui lòng kiểm tra API key."
    except Exception as e:
        print(f"[OPENROUTER ERROR] {e}")
        yield "Lỗi khi kết nối AI. Vui lòng thử lại sau."