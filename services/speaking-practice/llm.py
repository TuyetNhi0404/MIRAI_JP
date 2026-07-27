"""
llm.py
─────────────────────────────────────────────────────────────────────────────
LLM provider chain: Gemini → OpenRouter → (optional) Local llama.cpp

Local is NEVER primary. When USE_LOCAL_LLM=true it is only the final chốt
chặn after Gemini and OpenRouter both fail. When false, chain stops after
OpenRouter.

Timeouts (speaking UX)
──────────────────────
Each provider has a hard timeout; the whole chain also has LLM_CHAIN_BUDGET
so Gemini cannot hang unbounded before fallbacks run.

Env vars
────────
GEMINI_API_KEY        – Gemini API key        (primary)
OPENROUTER_API_KEY    – OpenRouter key        (cloud fallback)
LOCAL_LLM_URL         – llama.cpp server URL  (final chốt chặn, optional)
LOCAL_LLM_MODEL       – local model name      (default: qwen3-1.7b)
USE_LOCAL_LLM         – true = enable local as LAST fallback; false = stop after OpenRouter
LLM_MODEL             – Gemini model          (default: gemini-3.5-flash)
OPENROUTER_MODEL      – fallback model        (default: openai/gpt-4o-mini)
LLM_MAX_TOKENS        – max output tokens     (default: 256)
LLM_TIMEOUT_GEMINI    – seconds (default 12)
LLM_TIMEOUT_OPENROUTER– seconds (default 10)
LLM_TIMEOUT_LOCAL     – seconds (default 15)
LLM_CHAIN_BUDGET      – total seconds for whole cascade (default 28)
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FuturesTimeout
from typing import Callable, TypeVar

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
# When true: after Gemini + OpenRouter fail, try local llama.cpp as FINAL chốt chặn.
# When false (default): Gemini → OpenRouter only (no local).
USE_LOCAL_LLM: bool = os.getenv("USE_LOCAL_LLM", "false").lower() in {"1", "true", "yes"}

LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-3.5-flash")
OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "256"))

# Per-provider hard timeouts + total chain budget (speaking UX).
# Worst-case ≈ min(sum(caps), budget) — budget stops unbounded Gemini hangs.
LLM_TIMEOUT_GEMINI: float = float(os.getenv("LLM_TIMEOUT_GEMINI", "12"))
LLM_TIMEOUT_OPENROUTER: float = float(os.getenv("LLM_TIMEOUT_OPENROUTER", "10"))
LLM_TIMEOUT_LOCAL: float = float(os.getenv("LLM_TIMEOUT_LOCAL", "15"))
LLM_CHAIN_BUDGET: float = float(os.getenv("LLM_CHAIN_BUDGET", "28"))

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

_local_client = httpx.Client(timeout=LLM_TIMEOUT_LOCAL)
_openrouter_client = httpx.Client(timeout=LLM_TIMEOUT_OPENROUTER)
_provider_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="llm-provider")

_T = TypeVar("_T")

# ── Sentinel exceptions ──────────────────────────────────────────────────────

class LocalUnavailable(Exception):
    pass

class GeminiUnavailable(Exception):
    pass

class AllProvidersExhausted(Exception):
    pass


class ProviderTimeout(Exception):
    """Raised when a provider exceeds its per-call or remaining chain budget."""


def _call_with_timeout(label: str, fn: Callable[[], _T], timeout_s: float) -> _T:
    """Hard-timeout a sync provider call (needed for Gemini which has no httpx timeout)."""
    if timeout_s <= 0:
        raise ProviderTimeout(f"{label} skipped — no time left in chain budget")
    fut = _provider_pool.submit(fn)
    try:
        return fut.result(timeout=timeout_s)
    except FuturesTimeout as exc:
        print(f"[LLM] {label} timed out after {timeout_s:.1f}s")
        raise ProviderTimeout(f"{label} timed out after {timeout_s:.1f}s") from exc


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
    """Gemini → OpenRouter → (optional) Local, with per-provider + total budget."""
    deadline = time.monotonic() + LLM_CHAIN_BUDGET

    def remaining(cap: float) -> float:
        return max(0.0, min(cap, deadline - time.monotonic()))

    try:
        return _call_with_timeout(
            "Gemini",
            lambda: _gemini_reply(messages),
            remaining(LLM_TIMEOUT_GEMINI),
        )
    except Exception as e:
        print(f"[LLM] Gemini failed: {e}, fallback OpenRouter")

    try:
        return _call_with_timeout(
            "OpenRouter",
            lambda: _openrouter_reply(messages),
            remaining(LLM_TIMEOUT_OPENROUTER),
        )
    except Exception as e:
        if USE_LOCAL_LLM:
            print(f"[LLM] OpenRouter failed: {e}, fallback Local (final chốt chặn)")
        else:
            print(f"[LLM] OpenRouter failed: {e} (local LLM disabled — stop)")
            return "Tất cả API providers đều không khả dụng. Vui lòng kiểm tra API key."

    if USE_LOCAL_LLM:
        try:
            return _call_with_timeout(
                "Local",
                lambda: _local_reply(messages),
                remaining(LLM_TIMEOUT_LOCAL),
            )
        except Exception as e:
            print(f"[LLM] Local failed: {e}")

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
You are a friendly conversation PARTNER, not only an interviewer.
Given the learner's Japanese sentence and the teaching context, respond ONCE with
ONLY valid JSON (no markdown) of this exact shape:

{
  "reply": "<Mirai's natural Japanese reply, following all persona/level rules>",
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
- Write Japanese that is easy to HEAR aloud: short clauses, clear 。 endings.
- ANSWER FIRST: If the learner asked you a question (〜か / ですか / ？ / how are you /
  are you ~), answer as Mirai first with a real content answer
  (e.g. 元気ですか → はい、元気です。). Do NOT reply with only the same question
  mirrored back. After answering, you MAY add one short reciprocal question.
- MEMORY: Read the dialogue history and known facts. NEVER re-ask something the
  learner already answered (nationality, name, hobby, etc.). Acknowledge briefly,
  then ask a NEW related question or continue naturally.
- Output ONLY the JSON object."""


# Spoken-Japanese coaching targets per JLPT band.
# OUTPUT_TOKEN_LIMIT covers the FULL JSON envelope (reply + grammar fields),
# not only the Japanese sentence — too-low limits truncate JSON mid-string and
# break parsing (TTS then speaks raw JSON).
LEVEL_SPEAKING_RULES: dict[str, str] = {
    "N5": (
        "[OUTPUT_TOKEN_LIMIT: 280] "
        "In the JSON \"reply\" field only: short です/ます Japanese "
        "(aim ≤ 28 characters; if answering a learner question, up to 2 very short "
        "clauses like 「はい、元気です。あなたは？」 is OK). "
        "Only N5 vocab/grammar. No compound slang, no advanced keigo. "
        "Prefer concrete words. End with 。 so TTS can pause clearly. "
        "If the learner asked you something, ANSWER first — never only echo their question. "
        "If nationality/name/hobby is already in known facts or dialogue, do NOT ask again. "
        "Keep explanation ≤ 1 short Vietnamese sentence."
    ),
    "N4": (
        "[OUTPUT_TOKEN_LIMIT: 300] "
        "In the JSON \"reply\" field only: 1 short sentence, optionally a tiny follow-up "
        "(aim ≤ 40 Japanese characters total). Keep です/ます. Simple connectors only "
        "(それから / でも). Clear 。 endings for listening. "
        "If asked a question, answer first, then optionally ask back."
    ),
    "N3": (
        "[OUTPUT_TOKEN_LIMIT: 340] "
        "In the JSON \"reply\" field: 1–2 natural sentences. Everyday polite Japanese. "
        "Still avoid long nested clauses. Answer learner questions before asking new ones."
    ),
    "N2": (
        "[OUTPUT_TOKEN_LIMIT: 380] "
        "In the JSON \"reply\" field: 1–3 natural sentences. Natural conversational pace "
        "and richer vocab are OK. Answer first when asked."
    ),
    "N1": (
        "[OUTPUT_TOKEN_LIMIT: 420] "
        "In the JSON \"reply\" field: fluent natural Japanese (1–3 sentences). "
        "Nuance and natural connectors are welcome. Answer first when asked."
    ),
}


def _level_speaking_rules(level: str) -> str:
    lv = (level or "N5").upper()
    return LEVEL_SPEAKING_RULES.get(lv, LEVEL_SPEAKING_RULES["N5"])


def get_reply_and_grammar(
    transcript: str,
    level: str,
    history: list[dict] | list[str] | None = None,
    reply_messages: list[dict] | None = None,
    topic: dict | None = None,
    known_facts: dict[str, str] | None = None,
) -> tuple[str, dict]:
    """Single LLM call that returns both the conversation reply and grammar feedback."""
    from memory import format_known_facts
    from topics import topic_context_line

    context = _format_history_block(history)
    facts_block = format_known_facts(known_facts)
    topic_line = topic_context_line(topic)

    user_content = "\n".join(
        part
        for part in (
            context,
            facts_block,
            f"JLPT level: {level}",
            topic_line,
            f"Learner said:\n{transcript}",
            "Respond as Mirai. If the learner asked a question, answer it first "
            "(do not only ask the same thing back), then continue naturally.",
        )
        if part
    )
    messages = [
        {
            "role": "system",
            "content": f"{_COMBINED_SYSTEM}\n\n{_level_speaking_rules(level)}",
        },
        {"role": "user", "content": user_content},
    ]

    raw = get_ai_reply(messages)
    parsed = _parse_combined_json(raw, transcript)
    # Hard guard: never return a JSON blob as the spoken coach line.
    reply = parsed["reply"]
    if _looks_like_json_blob(reply):
        recovered = _extract_json_string_field(reply, "reply")
        parsed["reply"] = recovered or "すみません、もう一度お願いします。"
    return parsed["reply"], parsed


def _format_history_block(history: list[dict] | list[str] | None) -> str:
    if not history:
        return ""

    lines: list[str] = []
    # New format: list[{"role","text"}]
    if history and isinstance(history[0], dict):
        for item in history:
            role = str(item.get("role", ""))
            text = str(item.get("text", "")).strip()
            if not text:
                continue
            label = "Learner" if role == "user" else "Coach"
            lines.append(f"{label}: {text}")
    else:
        # Legacy: plain user-only strings
        for text in history:  # type: ignore[assignment]
            t = str(text).strip()
            if t:
                lines.append(f"Learner: {t}")

    if not lines:
        return ""
    return "Recent dialogue (do not re-ask answered facts):\n" + "\n".join(lines)


_JSON_STRING_FIELD_RE = re.compile(
    r'"(?P<key>reply|severity|grammar|explanation|suggestion)"\s*:\s*"(?P<val>(?:\\.|[^"\\])*)"',
    re.DOTALL,
)


def _looks_like_json_blob(text: str) -> bool:
    t = (text or "").lstrip()
    return t.startswith("{") and ("\"reply\"" in t or "'reply'" in t)


def _extract_json_string_field(text: str, key: str) -> str | None:
    """Pull a JSON string field even from truncated / invalid JSON."""
    for match in _JSON_STRING_FIELD_RE.finditer(text or ""):
        if match.group("key") != key:
            continue
        raw_val = match.group("val")
        try:
            # Decode JSON string escapes ("\n", "\"", etc.)
            return json.loads(f"\"{raw_val}\"")
        except json.JSONDecodeError:
            return raw_val.replace('\\"', '"').replace("\\n", "\n")
    return None


def _parse_combined_json(raw: str, fallback_original: str) -> dict:
    text = (raw or "").strip()
    # Strip markdown fences if the model wraps JSON.
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text).strip()

    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, dict) and data.get("reply"):
                return _normalize_combined(data, fallback_original)
        except json.JSONDecodeError:
            pass

    # Truncated JSON: recover fields by regex instead of speaking the blob.
    if _looks_like_json_blob(text):
        recovered = {
            "reply": _extract_json_string_field(text, "reply") or "",
            "severity": _extract_json_string_field(text, "severity") or "none",
            "grammar": _extract_json_string_field(text, "grammar") or "",
            "explanation": _extract_json_string_field(text, "explanation") or "",
            "suggestion": _extract_json_string_field(text, "suggestion") or fallback_original,
        }
        if recovered["reply"]:
            print("[LLM] Recovered truncated JSON reply via field extract")
            return _normalize_combined(recovered, fallback_original)
        print("[LLM] Truncated JSON without usable reply — using safe fallback")
        return {
            "reply": "すみません、もう一度お願いします。",
            "severity": "none",
            "grammar": "",
            "explanation": "",
            "suggestion": fallback_original,
        }

    # Plain-text fallback (non-JSON model output).
    if _looks_like_json_blob(text):
        text = "すみません、もう一度お願いします。"
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
    if not reply or _looks_like_json_blob(reply):
        recovered = _extract_json_string_field(reply, "reply") if reply else None
        reply = recovered or "すみません、もう一度お願いします。"
    return {
        "reply": reply,
        "severity": severity,
        "grammar": grammar,
        "explanation": explanation or "Không có ghi chú thêm.",
        "suggestion": suggestion,
    }


