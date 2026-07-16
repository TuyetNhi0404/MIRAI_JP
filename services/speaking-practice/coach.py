"""Grammar coach — review user turns (JSON response)."""

from __future__ import annotations

import json
import re
from typing import Any

from llm import get_ai_reply
from sanitizer import sanitize_transcript

COACH_SYSTEM = """You are a Japanese grammar coach helping Vietnamese learners.
Analyze the user's Japanese sentence from a speaking practice session.

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "original": "<user sentence as given>",
  "corrected": "<natural corrected Japanese, or same as original if already good>",
  "explanation_vi": "<1-2 short sentences in Vietnamese explaining the fix or praising correctness>",
  "severity": "minor" | "should_fix" | "important",
  "tags": ["snake_case_tag", ...]
}

Rules:
- severity "minor": small nuance or already acceptable — corrected MUST equal original
- severity "should_fix": clear grammar/word-form mistake (wrong tense, particle, verb form)
- severity "important": mistake that blocks understanding
- tags: 1-4 short labels e.g. past_tense, particle, verb_form, word_order
- If sentence is fine, corrected equals original, severity minor
- If there is a better natural phrasing due to grammar, set corrected to the fix and severity should_fix or important
- Match feedback complexity to JLPT level given in the user message"""


def _parse_coach_json(raw: str, fallback_original: str) -> dict[str, Any]:
    text = (raw or "").strip()
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, dict) and data.get("original"):
                return _normalize_review(data, fallback_original)
        except json.JSONDecodeError:
            pass

    return {
        "original": fallback_original,
        "corrected": fallback_original,
        "explanation_vi": "Không phân tích được. Thử lại sau.",
        "severity": "minor",
        "tags": [],
    }


def _normalize_review(data: dict[str, Any], fallback_original: str) -> dict[str, Any]:
    severity = str(data.get("severity", "minor")).lower()
    if severity not in ("minor", "should_fix", "important"):
        severity = "should_fix"

    tags = data.get("tags") or []
    if not isinstance(tags, list):
        tags = []
    tags = [str(t) for t in tags[:6]]

    original = str(data.get("original") or fallback_original).strip()
    corrected = str(data.get("corrected") or original).strip()
    explanation_vi = str(data.get("explanation_vi") or "").strip()

    if severity == "minor":
        corrected = original

    return {
        "original": original,
        "corrected": corrected,
        "explanation_vi": explanation_vi or "Không có ghi chú thêm.",
        "severity": severity,
        "tags": tags,
    }


def review_user_turn(
    transcript: str,
    level: str = "N5",
    history: list[str] | None = None,
) -> dict[str, Any]:
    cleaned, flagged = sanitize_transcript(transcript)
    if not cleaned:
        return _parse_coach_json("", "")

    context = ""
    if history:
        recent = [h for h in history if h.strip()][-4:]
        if recent:
            recent_clean = []
            for h in recent:
                hc, _hf = sanitize_transcript(h)
                recent_clean.append(hc)
            context = "Recent conversation:\n" + "\n".join(f"- {h}" for h in recent_clean) + "\n\n"

    user_content = (
        f"{context}"
        f"JLPT level: {level}\n"
        f"User sentence to review:\n{cleaned}"
    )

    messages = [
        {"role": "system", "content": COACH_SYSTEM},
        {"role": "user", "content": user_content},
    ]
    raw = get_ai_reply(messages)
    return _parse_coach_json(raw, cleaned)
