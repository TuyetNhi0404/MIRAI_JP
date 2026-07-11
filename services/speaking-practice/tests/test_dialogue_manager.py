from dataclasses import replace

import pytest

from dialogue_manager import (
    evaluate_turn,
    detect_grammar_patterns,
    detect_advanced_patterns,
)
from sessions import StudentModel, default_session


def make_session(**overrides) -> StudentModel:
    s = default_session("test-user")
    if overrides:
        return replace(s, **overrides)
    return s


class TestDetectGrammarPatterns:
    def test_detects_past_tense(self):
        patterns = detect_grammar_patterns("昨日映画を見ました")
        assert "past_tense" in patterns
        assert "politeness" in patterns
        assert "particle" in patterns

    def test_detects_negative_form(self):
        patterns = detect_grammar_patterns("食べない")
        assert "negative_form" in patterns

    def test_detects_desiderative(self):
        patterns = detect_grammar_patterns("食べたい")
        assert "desiderative" in patterns

    def test_detects_potential(self):
        patterns = detect_grammar_patterns("日本語ができる")
        assert "potential" in patterns

    def test_detects_request(self):
        patterns = detect_grammar_patterns("ください")
        assert "request" in patterns

    def test_empty_text_returns_empty(self):
        patterns = detect_grammar_patterns("")
        assert patterns == {}

    @pytest.mark.parametrize("text,expected", [
        ("ます", {"masu_form", "politeness"}),
        ("食べた", {"past_tense"}),
        ("行きたい", {"desiderative"}),
        ("お願いします", {"request", "masu_form", "politeness"}),
    ])
    def test_individual_patterns(self, text: str, expected: set):
        patterns = detect_grammar_patterns(text)
        for exp in expected:
            assert exp in patterns, f"{exp} should be in {list(patterns.keys())}"

    def test_negative_not_confused_with_masen(self):
        # ません should not trigger negative_form (it's polite negative)
        patterns = detect_grammar_patterns("食べません")
        assert "negative_form" not in patterns
        assert "politeness" in patterns


class TestDetectAdvancedPatterns:
    def test_detects_te_shimau(self):
        patterns = detect_advanced_patterns("食べてしまう")
        assert "te_shimau" in patterns

    def test_detects_bakari(self):
        patterns = detect_advanced_patterns("本ばかり")
        assert "bakari" in patterns

    def test_detects_nagara(self):
        patterns = detect_advanced_patterns("歩きながら")
        assert "nagara" in patterns

    def test_empty_returns_empty(self):
        patterns = detect_advanced_patterns("")
        assert patterns == {}


class TestEvaluateTurn:
    def test_empty_transcript_returns_neutral(self):
        s = make_session()
        updated, plan = evaluate_turn("", 0.8, s)
        assert plan["goal"] == "continue_conversation"

    def test_updates_grammar_mastery(self):
        s = make_session()
        updated, plan = evaluate_turn("食べます", 0.8, s)
        assert "masu_form" in updated.grammar_mastery
        assert updated.grammar_mastery["masu_form"] == 0.35  # 0.3 + 0.05

    def test_increments_existing_grammar(self):
        s = make_session(grammar_mastery={"masu_form": 0.5})
        updated, plan = evaluate_turn("食べます", 0.8, s)
        assert updated.grammar_mastery["masu_form"] == 0.55  # 0.5 + 0.05

    def test_does_not_mutate_original_session(self):
        s = make_session()
        original_mastery = dict(s.grammar_mastery)
        evaluate_turn("食べます", 0.8, s)
        assert s.grammar_mastery == original_mastery  # frozen, not mutated

    def test_low_confidence_forces_ask_repeat(self):
        s = make_session()
        updated, plan = evaluate_turn("はい", 0.3, s)
        assert plan["goal"] == "ask_repeat"
        assert updated.confidence == 0.3

    def test_tracks_mistakes(self):
        s = make_session(level="N5")
        updated, plan = evaluate_turn("歩きながら食べてしまう", 0.85, s)
        mistake_labels = [m["grammar"] for m in updated.mistakes]
        assert "nagara" in mistake_labels
        assert "te_shimau" in mistake_labels

    def test_increments_existing_mistakes(self):
        s = make_session(
            level="N5",
            mistakes=[{"grammar": "past_tense", "count": 1, "last_seen": "old"}],
        )
        updated, plan = evaluate_turn("見ました", 0.85, s)
        past_mistakes = [m for m in updated.mistakes if m["grammar"] == "past_tense"]
        assert len(past_mistakes) == 1
        assert past_mistakes[0]["count"] == 2

    def test_returns_plan_with_goal(self):
        s = make_session()
        updated, plan = evaluate_turn("昨日映画を見ました", 0.85, s)
        assert "goal" in plan
        assert "correct" in plan
        assert "max_corrections" in plan
        assert "follow_up" in plan


class TestEvaluateTurnGrammarFeedback:
    def test_grammar_feedback_should_fix_merges_into_mistakes(self):
        s = make_session()
        fb = {"severity": "should_fix", "grammar": "past_tense", "suggestion": "見ました", "explanation": "Dùng thì quá khứ"}
        updated, plan = evaluate_turn("昨日映画を見る", 0.85, s, grammar_feedback=fb)
        past = [m for m in updated.mistakes if m["grammar"] == "past_tense"]
        assert len(past) >= 1

    def test_grammar_feedback_important_adds_new_grammar_label(self):
        s = make_session()
        fb = {"severity": "important", "grammar": "particle_wa", "suggestion": "私は学生です", "explanation": "Thiếu trợ từ wa"}
        updated, plan = evaluate_turn("私学生です", 0.7, s, grammar_feedback=fb)
        labels = [m["grammar"] for m in updated.mistakes]
        assert "particle_wa" in labels

    def test_grammar_feedback_none_does_not_add_mistakes(self):
        s = make_session(mistakes=[{"grammar": "past_tense", "count": 1, "last_seen": "old"}])
        fb = {"severity": "none", "grammar": "", "suggestion": "正解です", "explanation": "Câu đúng"}
        updated, plan = evaluate_turn("食べました", 0.9, s, grammar_feedback=fb)
        past_count = sum(1 for m in updated.mistakes if m["grammar"] == "past_tense")
        assert past_count == 1

    def test_grammar_feedback_minor_does_not_override(self):
        s = make_session()
        fb = {"severity": "minor", "grammar": "politeness", "suggestion": "問題ない", "explanation": "Chỉnh tinh tế"}
        updated, plan = evaluate_turn("はい", 0.8, s, grammar_feedback=fb)
        assert any(m["grammar"] == "politeness" for m in updated.mistakes) is False

    def test_grammar_feedback_empty_grammar_ignored(self):
        s = make_session()
        fb = {"severity": "should_fix", "grammar": "", "suggestion": "修正", "explanation": "Lỗi"}
        updated, plan = evaluate_turn("test", 0.8, s, grammar_feedback=fb)
        assert len(updated.mistakes) == 0

    def test_grammar_feedback_increments_existing_label(self):
        s = make_session(mistakes=[{"grammar": "past_tense", "count": 2, "last_seen": "before"}])
        fb = {"severity": "important", "grammar": "past_tense", "suggestion": "食べた", "explanation": "Quá khứ"}
        updated, plan = evaluate_turn("食べる", 0.8, s, grammar_feedback=fb)
        past = [m for m in updated.mistakes if m["grammar"] == "past_tense"]
        assert len(past) == 1
        assert past[0]["count"] == 3
