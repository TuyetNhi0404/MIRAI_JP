"""Lightweight learner memory helpers for speaking coach continuity."""

from __future__ import annotations

import re
from dataclasses import replace
from typing import Any

from sessions import StudentModel

# (pattern, fact_key, fact_value)
_FACT_PATTERNS: list[tuple[re.Pattern[str], str, str]] = [
    (re.compile(r"ベトナム人|ベトナムです|ベトナムから|ベトナムの|người\s*việt|việt\s*nam|vietnam|vietnamese", re.I), "nationality", "Vietnam"),
    (re.compile(r"日本人|日本です|日本から|日本の", re.I), "nationality", "Japan"),
    (re.compile(r"韓国人|韓国です|韓国から", re.I), "nationality", "Korea"),
    (re.compile(r"中国人|中国です|中国から", re.I), "nationality", "China"),
    (re.compile(r"アメリカ人|アメリカです|アメリカから", re.I), "nationality", "USA"),
    (re.compile(r"タイ人|タイです|タイから", re.I), "nationality", "Thailand"),
]

_NAME_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"私の名前は\s*([一-龯ぁ-んァ-ンA-Za-z]+?)(?:です|だ|と申します|といいます)"),
    re.compile(r"僕の名前は\s*([一-龯ぁ-んァ-ンA-Za-z]+?)(?:です|だ|と申します|といいます)"),
    re.compile(r"名前は\s*([一-龯ぁ-んァ-ンA-Za-z]+?)です"),
    re.compile(r"私は\s*([一-龯ぁ-んァ-ンA-Za-z]{2,12}?)です"),
    re.compile(r"(?:tên\s*(?:tôi|mình)\s*là|my name is)\s*([A-Za-zÀ-ỹ]+)", re.I),
]


def extract_facts_from_text(text: str) -> dict[str, str]:
    cleaned = (text or "").strip()
    if not cleaned:
        return {}
    facts: dict[str, str] = {}
    for pattern, key, value in _FACT_PATTERNS:
        if pattern.search(cleaned):
            facts[key] = value
    for pattern in _NAME_PATTERNS:
        match = pattern.search(cleaned)
        if match:
            name = match.group(1).strip()
            # Avoid treating nationality words as names.
            if name and name not in {"ベトナム人", "日本人", "学生", "先生"}:
                facts["name"] = name
            break
    return facts


def merge_known_facts(session: StudentModel, user_text: str) -> StudentModel:
    """Update session.known_facts from the latest learner utterance."""
    found = extract_facts_from_text(user_text)
    if not found:
        return session
    current = dict(getattr(session, "known_facts", None) or {})
    current.update(found)
    return replace(session, known_facts=current)


def dialogue_history_entries(
    history: list[dict[str, Any]],
    *,
    max_turns: int = 6,
) -> list[dict[str, str]]:
    """Return last N dialogue turns (user+ai pairs) with roles preserved."""
    if not history:
        return []
    max_entries = max(2, max_turns * 2)
    return [
        {"role": str(h.get("role", "")), "text": str(h.get("text", ""))}
        for h in history[-max_entries:]
        if (h.get("text") or "").strip()
    ]


def format_known_facts(facts: dict[str, str] | None) -> str:
    if not facts:
        return ""
    lines = [f"- {k}: {v}" for k, v in facts.items()]
    return "Known facts about the learner (do NOT re-ask these):\n" + "\n".join(lines)
