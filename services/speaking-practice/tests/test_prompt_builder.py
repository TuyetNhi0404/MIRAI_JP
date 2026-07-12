from prompt_builder import (
    _detect_mood,
    _format_mood_hint,
    build_messages,
    SYSTEM_PROMPT,
    LEVEL_PROMPT,
    MODE_PROMPT,
)
from sessions import StudentModel


class TestDetectMood:
    def test_happy_detected(self):
        history = [
            {"role": "user", "text": "今日はとても楽しいです"},
            {"role": "ai", "text": "よかったですね！"},
        ]
        mood = _detect_mood(history, "映画が面白かったです！ありがとう！")
        assert mood == "happy"

    def test_low_energy_detected(self):
        history = [
            {"role": "user", "text": "難しいですね"},
            {"role": "ai", "text": "ゆっくりやりましょう"},
        ]
        mood = _detect_mood(history, "わからない…疲れました")
        assert mood == "low_energy"

    def test_nervous_detected(self):
        history = [
            {"role": "user", "text": "緊張しています"},
        ]
        mood = _detect_mood(history, "ちょっと自信ないです…")
        assert mood == "nervous"

    def test_neutral_when_no_markers(self):
        history: list[dict[str, str]] = [
            {"role": "user", "text": "今日はいい天気ですね"},
        ]
        mood = _detect_mood(history, "そうですね")
        assert mood == "neutral"

    def test_single_marker_returns_neutral(self):
        history: list[dict[str, str]] = [
            {"role": "user", "text": "楽しい"},
        ]
        mood = _detect_mood(history, "はい")
        assert mood == "neutral"


class TestFormatMoodHint:
    def test_happy_hint(self):
        hint = _format_mood_hint("happy")
        assert "happy" in hint.lower()
        assert "playful" in hint.lower()

    def test_low_energy_hint(self):
        hint = _format_mood_hint("low_energy")
        assert "gentle" in hint.lower()
        assert "encouraging" in hint.lower()

    def test_nervous_hint(self):
        hint = _format_mood_hint("nervous")
        assert "supportive" in hint.lower()
        assert "praise" in hint.lower()

    def test_neutral_hint(self):
        hint = _format_mood_hint("neutral")
        assert "warm" in hint.lower()

    def test_none_returns_empty(self):
        assert _format_mood_hint(None) == ""


class TestSystemPromptPersonality:
    def test_has_personality_section(self):
        assert "ミライの人格" in SYSTEM_PROMPT

    def test_has_name_and_backstory(self):
        assert "26歳" in SYSTEM_PROMPT
        assert "東京出身" in SYSTEM_PROMPT
        assert "大阪在住" in SYSTEM_PROMPT

    def test_has_hobbies(self):
        assert "カフェ巡り" in SYSTEM_PROMPT
        assert "写真" in SYSTEM_PROMPT
        assert "映画" in SYSTEM_PROMPT
        assert "料理" in SYSTEM_PROMPT

    def test_has_speech_patterns(self):
        assert "へえ〜" in SYSTEM_PROMPT
        assert "なるほどね" in SYSTEM_PROMPT
        assert "確かに〜" in SYSTEM_PROMPT

    def test_has_conversation_dynamics(self):
        assert "会話の自然さ" in SYSTEM_PROMPT
        assert "相槌・フィラー" in SYSTEM_PROMPT
        assert "感情を映す" in SYSTEM_PROMPT

    def test_has_topic_threading(self):
        assert "話題を自然につなぐ" in SYSTEM_PROMPT
        assert "そういえば" in SYSTEM_PROMPT

    def test_has_coaching_rules(self):
        assert "指導ルール" in SYSTEM_PROMPT
        assert "JLPTレベルを厳守" in SYSTEM_PROMPT

    def test_has_security_section(self):
        assert "セキュリティ" in SYSTEM_PROMPT


class TestLevelPromptDialogExamples:
    def test_n5_has_dialog_example(self):
        assert "自然な会話例" in LEVEL_PROMPT["N5"]
        assert "がくせい" in LEVEL_PROMPT["N5"]

    def test_n4_has_dialog_example(self):
        assert "自然な会話例" in LEVEL_PROMPT["N4"]
        assert "映画" in LEVEL_PROMPT["N4"]

    def test_n3_has_dialog_example(self):
        assert "自然な会話例" in LEVEL_PROMPT["N3"]
        assert "忙しくて" in LEVEL_PROMPT["N3"]

    def test_n2_has_dialog_example(self):
        assert "自然な会話例" in LEVEL_PROMPT["N2"]
        assert "残業" in LEVEL_PROMPT["N2"]

    def test_n1_has_dialog_example(self):
        assert "自然な会話例" in LEVEL_PROMPT["N1"]
        assert "AI" in LEVEL_PROMPT["N1"]


class TestModePromptScenarios:
    def test_roleplay_has_scenarios(self):
        assert "カフェ店員" in MODE_PROMPT["roleplay"]
        assert "コンビニ" in MODE_PROMPT["roleplay"]
        assert "ホテル" in MODE_PROMPT["roleplay"]

    def test_interview_has_questions(self):
        assert "自己紹介" in MODE_PROMPT["interview"]
        assert "志望動機" in MODE_PROMPT["interview"]

    def test_debate_has_topics(self):
        assert "AI" in MODE_PROMPT["debate"]
        assert "環境" in MODE_PROMPT["debate"]

    def test_shadowing_has_level_examples(self):
        assert "N5例" in MODE_PROMPT["shadowing"]
        assert "N3例" in MODE_PROMPT["shadowing"]


class TestBuildMessagesMood:
    def test_mood_injected_as_system_message(self):
        session = StudentModel(
            user_id="test", level="N5",
            history=[
                {"role": "user", "text": "とても楽しいです！"},
            ],
        )
        messages = build_messages(session, "映画が面白いです！")
        system_texts = [m["content"] for m in messages if m["role"] == "system"]
        combined = "".join(system_texts)
        assert "happy" in combined.lower()

    def test_nervous_mood_injected(self):
        session = StudentModel(
            user_id="test", level="N5",
            history=[
                {"role": "user", "text": "緊張しています"},
                {"role": "user", "text": "自信ないです"},
            ],
        )
        messages = build_messages(session, "ちょっと心配です")
        system_texts = [m["content"] for m in messages if m["role"] == "system"]
        combined = "".join(system_texts)
        assert "nervous" in combined.lower()
        assert "supportive" in combined.lower()

    def test_neutral_mood_injected(self):
        session = StudentModel(user_id="test", level="N5")
        messages = build_messages(session, "こんにちは")
        system_texts = [m["content"] for m in messages if m["role"] == "system"]
        combined = "".join(system_texts)
        assert "neutral" in combined.lower()