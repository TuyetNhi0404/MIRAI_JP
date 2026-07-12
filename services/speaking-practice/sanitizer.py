from __future__ import annotations

import re

INJECTION_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"ignore\s+(previous|all|above|prior)\s+(instructions|rules|prompts|guidelines)", re.IGNORECASE), "ignore_instructions"),
    (re.compile(r"(you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as|from\s+now\s+on\s+you)", re.IGNORECASE), "role_override"),
    (re.compile(r"system\s*:\s*(you|instruction|prompt|rule)", re.IGNORECASE), "system_prefix"),
    (re.compile(r"(disregard|override|overwrite|forget)\s+(your|the|all)\s+(instructions|rules|role|prompt)", re.IGNORECASE), "override_cmd"),
    (re.compile(r"(new\s+system\s+prompt|new\s+instructions|new\s+rules)", re.IGNORECASE), "new_prompt"),
    (re.compile(r"(do\s+not\s+(follow|obey|listen)|stop\s+(following|being))\s+(your\s+)?(instructions|rules|role)", re.IGNORECASE), "stop_follow"),
    (re.compile(r"\[system\]|\[/system\]|\[prompt\]|\[/prompt\]", re.IGNORECASE), "bbcode_injection"),
    (re.compile(r"\b(DAN|jailbreak|prompt\s*leak)\b", re.IGNORECASE), "jailbreak_tag"),
    (re.compile(r"speak\s+(only\s+)?english\s+(from\s+now\s+on|always|forever)", re.IGNORECASE), "language_override"),
    (re.compile(r"---+\s*BEGIN\s+INSTRUCTION|---+\s*END\s+INSTRUCTION", re.IGNORECASE), "delimiter_injection"),
]

INJECTION_KEYWORDS: set[str] = {
    "ignore previous instructions",
    "ignore all previous instructions",
    "ignore all instructions",
    "ignore your instructions",
    "disregard your role",
    "disregard your instructions",
    "forget your rules",
    "forget your instructions",
    "override system prompt",
    "you are now",
    "from now on you",
    "new system prompt",
    "new instruction",
    "system: you",
    "system: new",
    "act as a",
    "pretend you are",
    "pretend to be",
    "do not follow your instructions",
    "stop being mirai",
    "you are not mirai",
    "speak only english",
}


def sanitize_transcript(transcript: str) -> tuple[str, bool]:
    """Strip injection patterns, return (cleaned_text, was_flagged)."""
    cleaned = (transcript or "").strip()
    if not cleaned:
        return cleaned, False

    flagged = False
    lower = cleaned.lower()

    for keyword in INJECTION_KEYWORDS:
        if keyword in lower:
            flagged = True
            break

    if not flagged:
        for pattern, _label in INJECTION_PATTERNS:
            if pattern.search(cleaned):
                flagged = True
                break

    if flagged:
        cleaned = _redact_injection(cleaned)

    return cleaned, flagged


def _redact_injection(text: str) -> str:
    """Remove injected instruction while preserving legitimate Japanese content."""
    for pattern, _label in INJECTION_PATTERNS:
        text = pattern.sub("[filtered]", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def is_injection(transcript: str) -> bool:
    """Quick check: does this transcript contain injection patterns?"""
    _, flagged = sanitize_transcript(transcript)
    return flagged


def filter_injection_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    """Remove history entries that contain injection patterns."""
    return [h for h in history if not _entry_contains_injection(h)]


def _entry_contains_injection(entry: dict[str, str]) -> bool:
    text = (entry.get("text") or "").lower()
    for keyword in INJECTION_KEYWORDS:
        if keyword in text:
            return True
    for pattern, _label in INJECTION_PATTERNS:
        if pattern.search(text):
            return True
    return False