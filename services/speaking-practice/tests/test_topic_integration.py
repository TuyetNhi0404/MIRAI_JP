from topics import (
    is_topic_change_request,
    resolve_topic_change,
    build_topic_opening_reply,
    format_topic_suggestion_instruction,
    topic_context_line,
    suggest_topics,
)


def test_resolve_topic_change_returns_opening_reply():
    topic, reply = resolve_topic_change("N5")
    assert topic["title"]
    assert topic["prompt_ja"]
    assert "話しましょう" in reply or "話題" in reply


def test_build_topic_opening_reply_includes_title():
    topic = {
        "title": "自己紹介",
        "title_vi": "Tự giới thiệu",
        "prompt_ja": "自分の名前と国について話しましょう。",
        "prompt_vi": "Hãy nói về tên và đất nước của bạn.",
    }
    reply = build_topic_opening_reply(topic, "N3")
    assert "自己紹介" in reply
    assert "自分の名前" in reply


def test_build_topic_opening_reply_n5_is_shorter():
    topic = {
        "title": "自己紹介",
        "title_vi": "Tự giới thiệu",
        "prompt_ja": "自分の名前と国について話しましょう。",
        "prompt_vi": "Hãy nói về tên và đất nước của bạn.",
    }
    n5 = build_topic_opening_reply(topic, "N5")
    n1 = build_topic_opening_reply(topic, "N1")
    assert "はい。" in n5
    assert len(n5) <= len(n1)


def test_format_topic_suggestion_instruction_mentions_topics():
    text = format_topic_suggestion_instruction("N5")
    assert "Gợi ý chủ đề" in text
    assert "1." in text


def test_topic_context_line_empty_when_none():
    assert topic_context_line(None) == ""


def test_topic_context_line_includes_title():
    line = topic_context_line({
        "title": "家族",
        "title_vi": "Gia đình",
        "prompt_ja": "家族について話しましょう。",
        "prompt_vi": "Hãy nói về gia đình.",
    })
    assert "家族" in line
    assert "Current conversation topic" in line


def test_suggest_topics_count():
    topics = suggest_topics("N3", count=3)
    assert len(topics) == 3


def test_is_topic_change_still_works():
    assert is_topic_change_request("đổi chủ đề")
    assert is_topic_change_request("話題を変えて")
    assert not is_topic_change_request("今日はいい天気ですね")
