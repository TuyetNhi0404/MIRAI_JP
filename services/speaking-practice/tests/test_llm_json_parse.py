from llm import (
    _extract_json_string_field,
    _looks_like_json_blob,
    _parse_combined_json,
    LEVEL_SPEAKING_RULES,
)


def test_truncated_json_recovers_reply_not_blob():
    raw = (
        '{\n  "reply": "はじめまして、私はみらいです。どうぞよろしく。",\n'
        '  "severity": "should_fix",\n'
        '  "grammar": "noun_suffix_san",\n'
        '  "explanation": "Không dùng kính ngữ \'~san\' cho tên của chính mình. Từ'
    )
    parsed = _parse_combined_json(raw, "私はみらいさんです")
    assert parsed["reply"] == "はじめまして、私はみらいです。どうぞよろしく。"
    assert not _looks_like_json_blob(parsed["reply"])
    assert parsed["severity"] == "should_fix"
    assert parsed["grammar"] == "noun_suffix_san"


def test_complete_json_still_parses():
    raw = """{
      "reply": "はい、そうです。",
      "severity": "none",
      "grammar": "",
      "explanation": "Câu đúng.",
      "suggestion": "はい、そうです。"
    }"""
    parsed = _parse_combined_json(raw, "はい")
    assert parsed["reply"] == "はい、そうです。"
    assert parsed["severity"] == "none"


def test_extract_reply_field_handles_escapes():
    raw = r'{"reply": "こんにちは \"みなさん\"。", "severity": "none"'
    assert _extract_json_string_field(raw, "reply") == 'こんにちは "みなさん"。'


def test_n5_token_limit_allows_full_json_envelope():
    rules = LEVEL_SPEAKING_RULES["N5"]
    # Must be high enough that reply+explanation JSON is not truncated.
    assert "OUTPUT_TOKEN_LIMIT: 280" in rules or "OUTPUT_TOKEN_LIMIT: 3" in rules
    import re
    m = re.search(r"OUTPUT_TOKEN_LIMIT:\s*(\d+)", rules)
    assert m and int(m.group(1)) >= 200
