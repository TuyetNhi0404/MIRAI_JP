from __future__ import annotations

import json
import os
import re
from typing import Any

from llm import _gemini_client, _gemini_reply, get_ai_reply, GeminiUnavailable

GRAMMAR_AGENT_SYSTEM = """You are a Japanese grammar coach helping Vietnamese learners.
Analyze the user's Japanese sentence.

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "severity": "none" | "minor" | "should_fix" | "important",
  "grammar": "<grammar point as snake_case, or empty string if none>",
  "explanation": "<1-2 sentences in Vietnamese explaining the issue or praising correctness>",
  "suggestion": "<corrected Japanese sentence, or same as original if no fix needed>"
}

Rules:
- severity "none": sentence is correct, no issues
- severity "minor": small nuance, acceptable in conversation
- severity "should_fix": clear grammar/word-form mistake (wrong tense, particle, verb form)
- severity "important": mistake that blocks understanding
- grammar: single label e.g. "past_tense", "particle_wa", "verb_form", "word_order", "politeness"
- If no issue, grammar is "", suggestion equals original
- Match feedback complexity to JLPT level given in the user message"""


def _parse_grammar_json(raw: str, fallback_original: str) -> dict[str, Any]:
    text = (raw or "").strip()
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, dict) and "severity" in data:
                return _normalize_grammar(data, fallback_original)
        except json.JSONDecodeError:
            pass

    return {
        "severity": "none",
        "grammar": "",
        "explanation": "Không phân tích được.",
        "suggestion": fallback_original,
    }


def _normalize_grammar(data: dict[str, Any], fallback_original: str) -> dict[str, Any]:
    severity = str(data.get("severity", "none")).lower()
    if severity not in ("none", "minor", "should_fix", "important"):
        severity = "none"

    grammar = str(data.get("grammar") or "").strip()
    suggestion = str(data.get("suggestion") or fallback_original).strip()
    explanation = str(data.get("explanation") or "").strip()

    return {
        "severity": severity,
        "grammar": grammar,
        "explanation": explanation or "Không có ghi chú thêm.",
        "suggestion": suggestion,
    }


def analyze_grammar(
    transcript: str,
    level: str = "N5",
    history: list[str] | None = None,
) -> dict[str, Any]:
    """Analyze user transcript and return structured grammar feedback.

    Note: calls get_ai_reply sync internally.
    In async context, run via asyncio.to_thread or loop.run_in_executor.
    """
    cleaned = (transcript or "").strip()
    if not cleaned:
        return {
            "severity": "none",
            "grammar": "",
            "explanation": "",
            "suggestion": "",
        }

    context = ""
    if history:
        recent = [h for h in history if h.strip()][-4:]
        if recent:
            context = "Recent conversation:\n" + "\n".join(
                f"- {h}" for h in recent
            ) + "\n\n"

    user_content = (
        f"{context}" f"JLPT level: {level}\n" f"User sentence:\n{cleaned}"
    )

    messages = [
        {"role": "system", "content": GRAMMAR_AGENT_SYSTEM},
        {"role": "user", "content": user_content},
    ]

    # Prefer Gemini for grammar analysis when available — more accurate than local 3B
    raw: str | None = None
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key and _gemini_client is not None:
        try:
            raw = _gemini_reply(messages)
        except (GeminiUnavailable, Exception) as e:
            print(f"[grammar_agent] Gemini failed: {e}, fallback to LLM chain")

    if raw is None:
        raw = get_ai_reply(messages)

    return _parse_grammar_json(raw, cleaned)
