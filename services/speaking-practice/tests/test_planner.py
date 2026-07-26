
import pytest

from planner import create_teaching_plan


def test_default_plan_for_n5():
    plan = create_teaching_plan(level="N5")
    assert plan["goal"] == "continue_conversation"
    assert plan["correct"] is True
    assert plan["max_corrections"] == 1
    assert plan["difficulty"] == "easy"
    assert plan["encourage"] is True


def test_low_confidence_ask_repeat():
    plan = create_teaching_plan(level="N5", confidence=0.3)
    assert plan["goal"] == "ask_repeat"
    assert plan["correct"] is False
    assert plan["max_corrections"] == 0


def test_medium_confidence_confirm():
    plan = create_teaching_plan(level="N5", confidence=0.5)
    assert plan["goal"] == "confirm_understanding"
    assert plan["correct"] is False


def test_high_confidence_enables_corrections():
    plan = create_teaching_plan(level="N5", confidence=0.85)
    assert plan["correct"] is True
    assert plan["max_corrections"] == 1  # N5 = 1 correction


@pytest.mark.parametrize("level,max_corrections,encourage", [
    ("N5", 1, True),
    ("N4", 2, True),
    ("N3", 3, False),
    ("N2", 3, False),
    ("N1", 4, False),
])
def test_level_rules(level: str, max_corrections: int, encourage: bool):
    plan = create_teaching_plan(level=level, confidence=0.85)
    assert plan["max_corrections"] == max_corrections
    assert plan["encourage"] is encourage


def test_repeated_mistake_triggers_fix_goal():
    mistakes = [
        {"grammar": "particle", "count": 3, "last_seen": "test"},
    ]
    plan = create_teaching_plan(level="N5", mistakes=mistakes, confidence=0.85)
    assert plan["goal"] == "fix_particle"
    assert plan["correct"] is True


def test_weak_grammar_triggers_practice_goal():
    grammar_mastery = {
        "past_tense": 0.2,
        "politeness": 0.8,
    }
    plan = create_teaching_plan(
        level="N5", grammar_mastery=grammar_mastery, confidence=0.85
    )
    assert plan["goal"] == "practice_past_tense"
    assert plan["correct"] is True


def test_mode_shadowing():
    plan = create_teaching_plan(level="N5", mode="shadowing", confidence=0.85)
    assert plan["goal"] == "shadowing_drill"
    assert plan["max_corrections"] == 1
    assert plan["follow_up"] == "none"


def test_mode_roleplay():
    plan = create_teaching_plan(level="N5", mode="roleplay", confidence=0.85)
    assert plan["follow_up"] == "in_character"


def test_mode_interview():
    plan = create_teaching_plan(level="N5", mode="interview", confidence=0.85)
    assert plan["goal"] == "interview_question"
    assert plan["follow_up"] == "interview"


def test_mode_debate():
    plan = create_teaching_plan(level="N5", mode="debate", confidence=0.85)
    assert plan["goal"] == "challenge_opinion"
    assert plan["follow_up"] == "probing"


def test_error_handling_returns_default():
    plan = create_teaching_plan(level=None, mistakes=None, confidence=0.85)  # type: ignore[arg-type]
    assert plan["goal"] == "continue_conversation"


def test_unknown_level_falls_back_to_n5():
    plan = create_teaching_plan(level="N99", confidence=0.85)
    assert plan["difficulty"] == "easy"
    assert plan["max_corrections"] == 1
