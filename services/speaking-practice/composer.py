from __future__ import annotations

from typing import Any

from sessions import StudentModel


def compose_response(
    transcript: str,
    reply: str,
    audio_url: str,
    session: StudentModel,
    grammar_feedback: dict[str, Any] | None = None,
    teaching_plan: dict[str, Any] | None = None,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "transcript": transcript,
        "reply": reply,
        "audio_url": audio_url,
        "level": session.level,
        "score": session.score,
    }

    if grammar_feedback and grammar_feedback.get("severity") not in ("none", ""):
        result["grammar_feedback"] = grammar_feedback

    if teaching_plan:
        goal = teaching_plan.get("goal", "")
        if goal and goal != "continue_conversation":
            result["next_goal"] = goal

    return result
