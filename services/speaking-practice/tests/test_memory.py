"""Tests for speaking coach memory helpers."""

from memory import (
    dialogue_history_entries,
    extract_facts_from_text,
    format_known_facts,
    merge_known_facts,
)
from sessions import StudentModel


class TestExtractFacts:
    def test_vietnam_japanese(self):
        assert extract_facts_from_text("私はベトナム人です。")["nationality"] == "Vietnam"

    def test_vietnam_vietnamese(self):
        assert extract_facts_from_text("Tôi là người Việt.")["nationality"] == "Vietnam"

    def test_japan(self):
        assert extract_facts_from_text("日本から来ました。")["nationality"] == "Japan"

    def test_name(self):
        assert extract_facts_from_text("私の名前はみらいです。")["name"] == "みらい"

    def test_empty(self):
        assert extract_facts_from_text("") == {}
        assert extract_facts_from_text("こんにちは。") == {}


class TestMergeKnownFacts:
    def test_merge_persists(self):
        s = StudentModel(user_id="u1")
        s2 = merge_known_facts(s, "ベトナム人です。")
        assert s2.known_facts["nationality"] == "Vietnam"
        s3 = merge_known_facts(s2, "私の名前はたなかです。")
        assert s3.known_facts["nationality"] == "Vietnam"
        assert s3.known_facts["name"] == "たなか"


class TestDialogueHistory:
    def test_keeps_both_roles(self):
        history = [
            {"role": "user", "text": "こんにちは"},
            {"role": "ai", "text": "お国はどちらですか。"},
            {"role": "user", "text": "ベトナム人です。"},
            {"role": "ai", "text": "そうですか。"},
        ]
        entries = dialogue_history_entries(history, max_turns=6)
        roles = [e["role"] for e in entries]
        assert "user" in roles and "ai" in roles
        assert any("ベトナム" in e["text"] for e in entries)

    def test_trims_to_max_turns(self):
        history = [{"role": "user" if i % 2 == 0 else "ai", "text": f"t{i}"} for i in range(20)]
        entries = dialogue_history_entries(history, max_turns=3)
        assert len(entries) == 6


class TestFormatKnownFacts:
    def test_format(self):
        text = format_known_facts({"nationality": "Vietnam"})
        assert "nationality: Vietnam" in text
        assert "do NOT re-ask" in text

    def test_empty(self):
        assert format_known_facts(None) == ""
        assert format_known_facts({}) == ""
