from vocabulary import vocabulary_answer


def test_japanese_question_for_vietnamese_meaning_returns_vietnamese_only():
    assert vocabulary_answer("ベトナム語で音楽") == "Âm nhạc."


def test_romaji_question_returns_vietnamese_definition():
    assert vocabulary_answer("ongaku nghĩa là gì") == "ongaku（音楽・おんがく）nghĩa là âm nhạc."


def test_vietnamese_question_for_japanese_word_returns_japanese_answer():
    question = "rạp chiếu phim trong tiếng Nhật gọi là gì"
    assert vocabulary_answer(question) == "映画館（えいがかん）です。"


def test_unrelated_transcript_skips_vocabulary_fast_path():
    assert vocabulary_answer("今日はいい天気ですね") is None
    assert vocabulary_answer("こんにちは") is None
