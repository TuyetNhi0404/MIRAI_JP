"""Vocabulary lookup — fast-path answers without an LLM."""

from sessions import add_history, store_session
from tts import generate_audio
from composer import compose_response


_ROMAJI_VOCABULARY = {
    "ongaku": ("音楽", "おんがく", "âm nhạc"),
    "ryouri": ("料理", "りょうり", "nấu ăn / ẩm thực"),
    "ryokou": ("旅行", "りょこう", "du lịch"),
    "eiga": ("映画", "えいが", "phim ảnh"),
    "shumi": ("趣味", "しゅみ", "sở thích"),
}

_JAPANESE_VOCABULARY = {
    "音楽": "âm nhạc",
    "おんがく": "âm nhạc",
    "料理": "nấu ăn / ẩm thực",
    "りょうり": "nấu ăn / ẩm thực",
    "旅行": "du lịch",
    "りょこう": "du lịch",
    "映画": "phim ảnh",
    "えいが": "phim ảnh",
    "趣味": "sở thích",
    "しゅみ": "sở thích",
}

_VIETNAMESE_TO_JAPANESE = {
    "rạp chiếu phim": "映画館（えいがかん）です。",
    "rap chieu phim": "映画館（えいがかん）です。",
    "phim ảnh": "映画（えいが）です。",
    "phim anh": "映画（えいが）です。",
    "âm nhạc": "音楽（おんがく）です。",
    "am nhac": "音楽（おんがく）です。",
    "du lịch": "旅行（りょこう）です。",
    "du lich": "旅行（りょこう）です。",
    "sở thích": "趣味（しゅみ）です。",
    "so thich": "趣味（しゅみ）です。",
}


def vocabulary_answer(transcript: str) -> str | None:
    """Answer common Vietnamese/Japanese vocabulary questions without an LLM."""
    lowered = (transcript or "").lower()
    asks_japanese_word = any(marker in lowered for marker in (
        "tiếng nhật", "tieng nhat", "trong tiếng nhật", "trong tieng nhat",
        "nhật gọi là gì", "nhat goi la gi", "tiếng nhật gọi", "tieng nhat goi",
    ))
    if asks_japanese_word:
        for vietnamese, japanese_answer in _VIETNAMESE_TO_JAPANESE.items():
            if vietnamese in lowered:
                return japanese_answer

    asks_vietnamese_meaning = any(marker in lowered for marker in (
        "nghĩa là gì", "nghia la gi", "có nghĩa gì", "co nghia gi",
        "dịch là gì", "dich la gi",
    ))
    asks_in_japanese = "ベトナム語" in transcript or "越南語" in transcript
    if not asks_vietnamese_meaning and not asks_in_japanese:
        return None

    if asks_in_japanese:
        for japanese, vietnamese in _JAPANESE_VOCABULARY.items():
            if japanese in transcript:
                return vietnamese.capitalize() + "."

    for romaji, (kanji, reading, vietnamese) in _ROMAJI_VOCABULARY.items():
        if romaji in lowered:
            return f"{romaji}（{kanji}・{reading}）nghĩa là {vietnamese}."
    return None


def vocabulary_result(transcript: str, answer: str, session):
    """Build a full response for a vocabulary fast-path answer."""
    session = add_history(session, transcript, answer)
    store_session(session.user_id, session)
    audio_url = generate_audio(answer)
    print(f"[TURN] vocabulary transcript={transcript[:240]!r} reply={answer[:240]!r} audio={bool(audio_url)}")
    return compose_response(transcript, answer, audio_url, session)
