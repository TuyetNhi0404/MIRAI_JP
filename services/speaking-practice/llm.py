"""
llm_client.py
─────────────────────────────────────────────────────────────────────────────
LLM provider chain: Gemini (primary) → OpenRouter (fallback)

Env vars
────────
GEMINI_API_KEY        – Gemini API key  (optional if you only use OpenRouter)
OPENROUTER_API_KEY    – OpenRouter key  (fallback)
LLM_MODEL             – primary model   (default: gemini-2.5-flash)
OPENROUTER_MODEL      – fallback model  (default: openai/gpt-4o-mini)
LLM_MAX_TOKENS        – max output tokens (default: 100)
YOUR_SITE_URL         – sent in X-Your-Site header to OpenRouter (optional)
YOUR_SITE_NAME        – sent in X-Title header to OpenRouter   (optional)
"""

from __future__ import annotations

import os
from typing import Generator

import httpx
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-flash-latest")
OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "100"))

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    **({"HTTP-Referer": os.getenv("YOUR_SITE_URL")} if os.getenv("YOUR_SITE_URL") else {}),
    **({"X-Title": os.getenv("YOUR_SITE_NAME")} if os.getenv("YOUR_SITE_NAME") else {}),
}

# ── Sentinel exceptions ──────────────────────────────────────────────────────

class GeminiUnavailable(Exception):
    """Raised when Gemini should not be tried (missing key or rate-limited)."""


class AllProvidersExhausted(Exception):
    """Raised when every provider in the chain has failed."""


# ── Provider: Gemini ─────────────────────────────────────────────────────────

_gemini_client: genai.Client | None = (
    genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
)


def _is_rate_limit(err_msg: str) -> bool:
    return "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg


def _build_gemini_contents(
    messages: list[dict],
) -> tuple[str | None, list[types.Content]]:
    """Convert OpenAI-style messages → Gemini format."""
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
                import json
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
    Falls back to OpenRouter automatically when Gemini is unavailable or
    rate-limited.
    """
    # 1. Try Gemini
    try:
        return _gemini_reply(messages)
    except GeminiUnavailable as e:
        print(f"[FALLBACK TRIGGER] Gemini unavailable: {e}")

    # 2. Try OpenRouter
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
    Falls back to OpenRouter automatically when Gemini is unavailable or
    rate-limited.

    NOTE: Because Gemini is tried first and may fail mid-stream before any
    tokens are emitted, the generator catches GeminiUnavailable before the
    first yield and redirects cleanly to OpenRouter.
    """
    # 1. Try Gemini
    try:
        gen = _gemini_stream(messages)
        # Peek at the first value to trigger connection errors early.
        first = next(gen)
        yield first
        yield from gen
        return
    except StopIteration:
        return  # Empty but valid Gemini response
    except GeminiUnavailable as e:
        print(f"[FALLBACK TRIGGER] Gemini unavailable: {e}")

    # 2. Try OpenRouter
    try:
        yield from _openrouter_stream(messages)
    except AllProvidersExhausted:
        yield "Tất cả API providers đều không khả dụng. Vui lòng kiểm tra API key."
    except Exception as e:
        print(f"[OPENROUTER ERROR] {e}")
        yield "Lỗi khi kết nối AI. Vui lòng thử lại sau."