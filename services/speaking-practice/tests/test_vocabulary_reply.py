from main import _vocabulary_answer
from tts import _contains_vietnamese


def test_japanese_question_for_vietnamese_meaning_returns_vietnamese_only():
    assert _vocabulary_answer("ベトナム語で音楽と呼ばれるものは何ですか") == "Âm nhạc."


def test_romaji_question_returns_vietnamese_definition():
    assert _vocabulary_answer("ongaku nghĩa là gì") == "ongaku（音楽・おんがく）nghĩa là âm nhạc."


def test_vietnamese_question_for_japanese_word_returns_japanese_answer():
    question = "rạp chiếu phim trong tiếng Nhật gọi là gì"
    assert _vocabulary_answer(question) == "映画館（えいがかん）です。"


def test_vietnamese_text_never_uses_japanese_tts():
    assert _contains_vietnamese("Âm nhạc.") is True
    assert _contains_vietnamese("音楽です。") is False
