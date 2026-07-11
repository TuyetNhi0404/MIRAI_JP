from __future__ import annotations

import re
from dataclasses import replace
from typing import Any

from planner import create_teaching_plan
from sessions import StudentModel

# Japanese-friendly grammar patterns
# Avoid \\b and \\w — they don't work reliably with CJK characters
COMMON_GRAMMAR_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"(?<!ませ)ない[。、\s]?$"), "negative_form"),
    (re.compile(r"ます"), "masu_form"),
    (re.compile(r"[たタ][。、\s]?$"), "past_tense"),
    (re.compile(r"(たい|たかった)"), "desiderative"),
    (re.compile(r"[がをにでへとからよりは]"), "particle"),
    (re.compile(r"(です|ます|ません|でした|ました|でしょう|ではない)"), "politeness"),
    (re.compile(r"(おう|よう|[いきぎしちにひり]う)[。、\s]?$"), "volitional"),
    (re.compile(r"(できる|できます|できた|出来る)"), "potential"),
    (re.compile(r"(ください|お願い|頂戴|下さい|おねがい)"), "request"),
]

# Grammar patterns beyond expected level for beginners
ADVANCED_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"てしまう|ちゃう|じゃう"), "te_shimau"),
    (re.compile(r"ばかり"), "bakari"),
    (re.compile(r"ながら"), "nagara"),
    (re.compile(r"ために"), "tameni"),
    (re.compile(r"ように"), "youni"),
    (re.compile(r"はず"), "hazu"),
    (re.compile(r"わけ"), "wake"),
    (re.compile(r"に関して"), "nikanshite"),
    (re.compile(r"において"), "nioite"),
    (re.compile(r"にもかかわらず"), "nimokakawarazu"),
]


def detect_grammar_patterns(text: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for pattern, label in COMMON_GRAMMAR_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            counts[label] = len(matches)
    return counts


def detect_advanced_patterns(text: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for pattern, label in ADVANCED_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            counts[label] = len(matches)
    return counts


def evaluate_turn(
    transcript: str,
    confidence: float,
    session: StudentModel,
    grammar_feedback: dict[str, Any] | None = None,
) -> tuple[StudentModel, dict[str, Any]]:
    cleaned = (transcript or "").strip()

    grammar_used = detect_grammar_patterns(cleaned)

    # Combine detected grammar into mistakes tracking
    counts_so_far: dict[str, int] = {}
    for m in session.mistakes:
        counts_so_far[m["grammar"]] = m.get("count", 0)

    for label, count in grammar_used.items():
        counts_so_far[label] = counts_so_far.get(label, 0) + count

    # For N5/N4: flag advanced grammar patterns as potential mistakes
    if session.level in ("N5", "N4"):
        advanced = detect_advanced_patterns(cleaned)
        for label, count in advanced.items():
            counts_so_far[label] = counts_so_far.get(label, 0) + count

    # Merge Grammar Agent feedback into mistakes (hybrid approach)
    if grammar_feedback and grammar_feedback.get("severity") in ("should_fix", "important"):
        fb_grammar = grammar_feedback.get("grammar", "").strip()
        if fb_grammar:
            counts_so_far[fb_grammar] = counts_so_far.get(fb_grammar, 0) + 1

    new_mistakes: list[dict[str, Any]] = [
        {"grammar": g, "count": c, "last_seen": cleaned[:50]}
        for g, c in counts_so_far.items()
    ]

    grammar_mastery = dict(session.grammar_mastery)
    for g in grammar_used:
        grammar_mastery[g] = min(1.0, grammar_mastery.get(g, 0.3) + 0.05)

    plan = create_teaching_plan(
        level=session.level,
        mistakes=new_mistakes,
        grammar_mastery=grammar_mastery,
        confidence=confidence,
        mode=session.mode,
    )

    updated = replace(
        session,
        mistakes=new_mistakes,
        grammar_mastery=grammar_mastery,
        confidence=confidence,
    )

    return updated, plan
