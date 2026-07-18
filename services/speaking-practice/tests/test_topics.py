from topics import (
    TOPICS_BY_LEVEL,
    is_topic_change_request,
    suggest_topics,
    next_topic_prompt,
    TOPIC_CHANGE_KEYWORDS,
)


class TestSuggestTopics:
    def test_n5_returns_n5_topics(self):
        topics = suggest_topics("N5", count=3)
        assert len(topics) == 3
        for t in topics:
            assert t in TOPICS_BY_LEVEL["N5"]

    def test_unknown_level_falls_back_to_n5(self):
        topics = suggest_topics("XYZ", count=2)
        assert len(topics) == 2
        for t in topics:
            assert t in TOPICS_BY_LEVEL["N5"]

    def test_default_level_is_n5(self):
        topics = suggest_topics()
        assert all(t in TOPICS_BY_LEVEL["N5"] for t in topics)

    def test_lowercase_normalized(self):
        topics = suggest_topics("n3", count=2)
        assert all(t in TOPICS_BY_LEVEL["N3"] for t in topics)

    def test_count_clamped_to_pool(self):
        topics = suggest_topics("N5", count=100)
        assert len(topics) == len(TOPICS_BY_LEVEL["N5"])

    def test_count_zero(self):
        topics = suggest_topics("N5", count=0)
        assert topics == []

    def test_topics_have_required_fields(self):
        topics = suggest_topics("N5", count=1)
        t = topics[0]
        assert "title" in t
        assert "title_vi" in t
        assert "prompt_ja" in t
        assert "prompt_vi" in t


class TestAllLevelsHaveTopics:
    def test_all_levels_have_topics(self):
        for level in ("N5", "N4", "N3", "N2", "N1"):
            assert level in TOPICS_BY_LEVEL
            assert len(TOPICS_BY_LEVEL[level]) >= 5

    def test_vi_titles_exist(self):
        for level, topics in TOPICS_BY_LEVEL.items():
            for t in topics:
                assert t["title_vi"], f"level {level} missing title_vi"
                assert t["prompt_ja"], f"level {level} missing prompt_ja"
                assert t["prompt_vi"], f"level {level} missing prompt_vi"


class TestIsTopicChangeRequest:
    def test_japanese_change_request(self):
        assert is_topic_change_request("別のみた")
        assert is_topic_change_request("違う話題")
        assert is_topic_change_request("話題を変えて")

    def test_vietnamese_change_request(self):
        assert is_topic_change_request("đổi chủ đề")
        assert is_topic_change_request("chuyển chủ đề")
        assert is_topic_change_request("nói chuyện khác")

    def test_english_change_request(self):
        assert is_topic_change_request("change topic")
        assert is_topic_change_request("Change the topic please")

    def test_normal_conversation_not_detected(self):
        assert not is_topic_change_request("こんにちは")
        assert not is_topic_change_request("昨日映画を見ました")
        assert not is_topic_change_request("今日はいい天気ですね")

    def test_empty_text(self):
        assert not is_topic_change_request("")
        assert not is_topic_change_request(None)

    def test_partial_keyword_in_normal_text(self):
        assert not is_topic_change_request("話は面白いですね")


class TestTopicChangeKeywords:
    def test_keywords_set_present(self):
        assert len(TOPIC_CHANGE_KEYWORDS) >= 8
        assert "別のみた" in TOPIC_CHANGE_KEYWORDS
        assert "話題変えて" in TOPIC_CHANGE_KEYWORDS
        assert "đổi chủ đề" in TOPIC_CHANGE_KEYWORDS


class TestNextTopicPrompt:
    def test_returns_single_topic(self):
        t = next_topic_prompt("N5")
        assert "title" in t
        assert "prompt_ja" in t
        assert t in TOPICS_BY_LEVEL["N5"]

    def test_falls_back_to_n5(self):
        t = next_topic_prompt("UNKNOWN")
        assert t in TOPICS_BY_LEVEL["N5"]