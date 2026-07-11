from __future__ import annotations

from typing import Any

PLAN_DEFAULTS: dict[str, Any] = {
    "goal": "continue_conversation",
    "correct": False,
    "max_corrections": 0,
    "follow_up": "natural",
    "encourage": True,

    "difficulty": "easy",
}

LEVEL_RULES: dict[str, dict[str, Any]] = {
    "N5": {
        "difficulty": "easy",
        "encourage": True,
        "max_corrections": 1,
        "follow_up": "simple",
    },
    "N4": {
        "difficulty": "normal",
        "encourage": True,
        "max_corrections": 2,
        "follow_up": "simple",
    },
    "N3": {
        "difficulty": "normal",
        "encourage": False,
        "max_corrections": 3,
        "follow_up": "natural",
    },
    "N2": {
        "difficulty": "challenging",
        "encourage": False,
        "max_corrections": 3,
        "follow_up": "deep",
    },
    "N1": {
        "difficulty": "challenging",
        "encourage": False,
        "max_corrections": 4,
        "follow_up": "deep",
    },
}

REPEATED_MISTAKE_THRESHOLD = 2


def create_teaching_plan(
    level: str,
    mistakes: list[dict[str, Any]] | None = None,
    grammar_mastery: dict[str, float] | None = None,
    confidence: float = 0.8,
    mode: str = "free_talk",
) -> dict[str, Any]:
    try:
        return _build_plan(level, mistakes, grammar_mastery, confidence, mode)
    except Exception as exc:
        print(f"[planner] Error creating teaching plan: {exc}")
        return dict(PLAN_DEFAULTS)


def _build_plan(
    level: str,
    mistakes: list[dict[str, Any]] | None = None,
    grammar_mastery: dict[str, float] | None = None,
    confidence: float = 0.8,
    mode: str = "free_talk",
) -> dict[str, Any]:
    plan = dict(PLAN_DEFAULTS)
    level = level.upper() if level and level in LEVEL_RULES else "N5"
    rules = LEVEL_RULES[level]

    plan["difficulty"] = rules["difficulty"]
    plan["encourage"] = rules["encourage"]
    plan["follow_up"] = rules["follow_up"]

    if confidence < 0.4:
        plan["goal"] = "ask_repeat"
        plan["correct"] = False
        plan["max_corrections"] = 0
        return plan

    if confidence < 0.6:
        plan["goal"] = "confirm_understanding"
        plan["correct"] = False
        plan["max_corrections"] = 0
        return plan

    has_repeated_mistake = False
    if mistakes:
        for m in mistakes:
            if m.get("count", 0) >= REPEATED_MISTAKE_THRESHOLD:
                has_repeated_mistake = True
                plan["goal"] = f"fix_{m.get('grammar', 'error')}"
                break

    plan["correct"] = True
    plan["max_corrections"] = rules["max_corrections"]

    if grammar_mastery and not has_repeated_mistake:
        weak_areas = [g for g, v in grammar_mastery.items() if v < 0.4]
        if weak_areas:
            plan["goal"] = f"practice_{weak_areas[0]}"

    if mode == "shadowing":
        plan["goal"] = "shadowing_drill"
        plan["correct"] = True
        plan["max_corrections"] = 1
        plan["follow_up"] = "none"
    elif mode == "roleplay":
        plan["follow_up"] = "in_character"
    elif mode == "interview":
        plan["goal"] = "interview_question"
        plan["follow_up"] = "interview"
    elif mode == "debate":
        plan["goal"] = "challenge_opinion"
        plan["follow_up"] = "probing"

    return plan
