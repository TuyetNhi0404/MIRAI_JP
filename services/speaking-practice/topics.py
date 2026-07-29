from __future__ import annotations

import random
import re

TOPICS_BY_LEVEL: dict[str, list[dict[str, str]]] = {
    "N5": [
        {"title": "自己紹介", "title_vi": "Tự giới thiệu", "prompt_ja": "自分の名前と国について話しましょう。", "prompt_vi": "Hãy nói về tên và đất nước của bạn."},
        {"title": "好きな食べ物", "title_vi": "Món ăn yêu thích", "prompt_ja": "好きな食べ物を教えてください。", "prompt_vi": "Hãy kể món ăn bạn thích."},
        {"title": "今日の天気", "title_vi": "Thời tiết hôm nay", "prompt_ja": "今日の天気はどうですか。", "prompt_vi": "Thời tiết hôm nay thế nào?"},
        {"title": "好きな動物", "title_vi": "Con vật yêu thích", "prompt_ja": "好きな動物はいますか。", "prompt_vi": "Có con vật nào bạn thích không?"},
        {"title": "家族", "title_vi": "Gia đình", "prompt_ja": "家族について話しましょう。", "prompt_vi": "Hãy nói về gia đình bạn."},
        {"title": "週末の予定", "title_vi": "Kế hoạch cuối tuần", "prompt_ja": "週末は何をしますか。", "prompt_vi": "Cuối tuần bạn làm gì?"},
        {"title": "好きな色", "title_vi": "Màu yêu thích", "prompt_ja": "好きな色はなんですか。", "prompt_vi": "Màu bạn thích là gì?"},
        {"title": "誕生日", "title_vi": "Sinh nhật", "prompt_ja": "誕生日はいつですか。", "prompt_vi": "Sinh nhật bạn khi nào?"},
    ],
    "N4": [
        {"title": "休日の過ごし方", "title_vi": "Cách dùng ngày nghỉ", "prompt_ja": "休みの日は何をして過ごすことが多いですか。", "prompt_vi": "Bạn thường làm gì vào ngày nghỉ?"},
        {"title": "好きな音楽", "title_vi": "Nhạc yêu thích", "prompt_ja": "どんな音楽を聴きますか。好きな歌手はいますか。", "prompt_vi": "Bạn nghe nhạc gì? Có ca sĩ yêu thích không?"},
        {"title": "日本のドラマ", "title_vi": "Phim Nhật", "prompt_ja": "日本ドラマや映画でよく見るものは何ですか。", "prompt_vi": "Bạn thường xem phim/drama Nhật nào?"},
        {"title": "思い出の場所", "title_vi": "Nơi kỷ niệm", "prompt_ja": "今まで行った中で、一番印象に残っている場所はどこですか。", "prompt_vi": "Nơi nào ấn tượng nhất bạn từng đến?"},
        {"title": "将来の夢", "title_vi": "Ước mơ tương lai", "prompt_ja": "将来やってみたいことはありますか。", "prompt_vi": "Bạn có ước muốn gì trong tương lai?"},
        {"title": "友達", "title_vi": "Bạn bè", "prompt_ja": "友達とどんなことをして遊びますか。", "prompt_vi": "Bạn thường chơi gì với bạn bè?"},
        {"title": "最近笑ったこと", "title_vi": "Chuyện buồn cười gần đây", "prompt_ja": "最近、笑った出来事は何ですか。", "prompt_vi": "Gần đây có chuyện gì khiến bạn cười không?"},
        {"title": "好きな季節", "title_vi": "Mùa yêu thích", "prompt_ja": "どの季節が一番好きですか。なぜですか。", "prompt_vi": "Bạn thích mùa nào nhất? Tại sao?"},
    ],
    "N3": [
        {"title": "仕事と生活", "title_vi": "Công việc & cuộc sống", "prompt_ja": "今の仕事について、大変なことと楽しいことを教えてください。", "prompt_vi": "Hãy kể về điều khó và điều vui trong công việc hiện tại."},
        {"title": "ベトナムと日本の違い", "title_vi": "Khác biệt VN vs Nhật", "prompt_ja": "ベトナムと日本の文化で、面白い違いは何だと思いますか。", "prompt_vi": "Bạn thấy điểm nào khác biệt thú vị giữa VN và Nhật?"},
        {"title": "習慣にしたいこと", "title_vi": "Thói quen muốn tạo", "prompt_ja": "最近始めたいと思っている習慣はありますか。", "prompt_vi": "Có thói quen nào bạn muốn bắt đầu gần đây không?"},
        {"title": "読んだ本", "title_vi": "Sách đã đọc", "prompt_ja": "最近読んだ本の中で、印象に残っているものはありますか。", "prompt_vi": "Cuốn sách nào gần đây bạn ấn tượng?"},
        {"title": "行ってみたい国", "title_vi": "Đất nước muốn đến", "prompt_ja": "まだ行ったことがない国で行ってみたいところはどこですか。", "prompt_vi": "Bạn muốn đến đất nước nào chưa từng đến?"},
        {"title": "ストレス解消法", "title_vi": "Cách giải stress", "prompt_ja": "ストレスを感じた時、どうやって解消しますか。", "prompt_vi": "Khi stress, bạn giải tỏa thế nào?"},
        {"title": "スマホの使い方", "title_vi": "Cách dùng điện thoại", "prompt_ja": "スマホの使いすぎて困ったことはありますか。", "prompt_vi": "Có khi nào bạn dùng điện thoại quá nhiều gây phiền không?"},
        {"title": "料理", "title_vi": "Nấu ăn", "prompt_ja": "自分で作った料理で一番好きなものは何ですか。", "prompt_vi": "Món bạn tự nấu thích nhất là gì?"},
    ],
    "N2": [
        {"title": "仕事観", "title_vi": "Triết lý công việc", "prompt_ja": "仕事を選ぶとき、一番大事にしていることは何ですか。", "prompt_vi": "Khi chọn việc, bạn coi trọng điều gì nhất?"},
        {"title": " SNS と社会", "title_vi": "SNS và xã hội", "prompt_ja": " SNS が人間関係に与える影響をどう思いますか。", "prompt_vi": "Bạn nghĩ gì về ảnh hưởng của SNS đến quan hệ?"},
        {"title": "移住", "title_vi": "Chuyển đến nước khác", "prompt_ja": "もし海外に住むとしたら、どこを選びますか。なぜですか。", "prompt_vi": "Nếu ở nước ngoài, bạn chọn đâu? Tại sao?"},
        {"title": "失敗から学んだこと", "title_vi": "Bài học từ thất bại", "prompt_ja": "過去に経験した失敗で、最も学びが大きかったものは何ですか。", "prompt_vi": "Thất bại nào cho bạn bài học lớn nhất?"},
        {"title": "デジタル化", "title_vi": "Số hóa", "prompt_ja": " AI や自動化が進むことで、生活は良くなると思いますか。", "prompt_vi": "Khi AI/automation phát triển, cuộc sống sẽ tốt hơn không?"},
        {"title": "健康習慣", "title_vi": "Thói quen sức khỏe", "prompt_ja": "日常生活で続けている健康のための習慣はありますか。", "prompt_vi": "Có thói quen gì giúp khỏe bạn duy trì?"},
        {"title": "暇な時間の過ごし方", "title_vi": "Cách dùng thời gian rảnh", "prompt_ja": "何もしない自由な時間ができた時、何をしますか。", "prompt_vi": "Có thời gian rảnh, bạn làm gì?"},
        {"title": "自分を表すもの", "title_vi": "Điều đại diện cho bạn", "prompt_ja": "あなたのことを一言で表すと、何ですか。", "prompt_vi": "Một từ để mô tả bạn là gì?"},
    ],
    "N1": [
        {"title": "抽象的概念の議論", "title_vi": "Tranh luận khái niệm trừu tượng", "prompt_ja": "「幸福」とは何だと思いますか。哲学的視点から話し合いませんか。", "prompt_vi": "Bạn nghĩ 'hạnh phúc' là gì? Có thảo luận từ góc triết học không?"},
        {"title": "文化の相互影響", "title_vi": "Ảnh hưởng văn hóa", "prompt_ja": "グローバル化の下で、ベトナムと日本の文化はどう変化していると思いますか。", "prompt_vi": "Trong toàn cầu hóa, văn hóa VN-Nhật thay đổi thế nào?"},
        {"title": "言語と思考", "title_vi": "Ngôn ngữ và tư duy", "prompt_ja": "言語は思考に影響すると思いますか。多言語話者としてどう感じますか。", "prompt_vi": "Bạn nghĩ ngôn ngữ ảnh hưởng tư duy không? Là người đa ngữ, bạn cảm thấy sao?"},
        {"title": "仕事と存在意義", "title_vi": "Công việc và ý nghĩa", "prompt_ja": "仕事を通じて、自分が社会にどう貢献できていると思いますか。", "prompt_vi": "Qua công việc, bạn thấy mình đóng góp gì cho xã hội?"},
        {"title": "未来の教育", "title_vi": "Giáo dục tương lai", "prompt_ja": " AI が教育に溶け込む時代、教師と生徒の関係はどう変わるべきだと思いますか。", "prompt_vi": "Khi AI hòa vào giáo dục, quan hệ thầy-trò nên thay đổi thế nào?"},
        {"title": "文化的タブー", "title_vi": "Điều cấm kỵ văn hóa", "prompt_ja": "ベトナムと日本で、タブーとされる話題はどう違いますか。", "prompt_vi": "Đề tài cấm kỵ ở VN và Nhật khác nhau thế nào?"},
        {"title": "美の基準", "title_vi": "Tiêu chuẩn cái đẹp", "prompt_ja": "国によって「美しさ」の基準が違うのは、なぜだと思いますか。", "prompt_vi": "Tiêu chuẩn 'vẻ đẹp' khác nhau giữa các nước, tại sao?"},
        {"title": "孤独の意義", "title_vi": "Ý nghĩa của sự cô đơn", "prompt_ja": "孤独は必要だと思いますか。それは成長とどう関係しますか。", "prompt_vi": "Bạn nghĩ cô đơn cần thiết không? Nó liên quan đến trưởng thành thế nào?"},
    ],
}

TOPIC_CHANGE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"違う話題|別のこと|別のみた|話題変えて|話題を変え", re.IGNORECASE),
    re.compile(r"別の話|別のお話", re.IGNORECASE),
    re.compile(r"change\s+the\s+topic|change\s+topic|new\s+topic", re.IGNORECASE),
    re.compile(r"đổi\s+chủ\s+đề|chuyển\s+chủ\s+đề|nói\s+chuyện\s+khác", re.IGNORECASE),
    re.compile(r"他に話|別の話を", re.IGNORECASE),
]

TOPIC_CHANGE_KEYWORDS: set[str] = {
    "別のみた",
    "違う話題",
    "話題変えて",
    "話題を変え",
    "別の話",
    "別のお話",
    "話題を変えたい",
    "話題変えたい",
    "別の話題",
    "đổi chủ đề",
    "chuyển chủ đề",
    "nói chuyện khác",
    "change topic",
    "change the topic",
    "new topic",
}


def is_topic_change_request(text: str) -> bool:
    cleaned = (text or "").strip()
    if not cleaned:
        return False
    lower = cleaned.lower()
    for kw in TOPIC_CHANGE_KEYWORDS:
        if kw in lower:
            return True
    for pattern in TOPIC_CHANGE_PATTERNS:
        if pattern.search(cleaned):
            return True
    return False


def suggest_topics(level: str = "N5", count: int = 5) -> list[dict[str, str]]:
    normalized = level.upper() if level else "N5"
    if normalized not in TOPICS_BY_LEVEL:
        normalized = "N5"
    pool = TOPICS_BY_LEVEL[normalized]
    return random.sample(pool, min(count, len(pool)))


def format_topic_suggestion_instruction(level: str = "N5") -> str:
    topics = suggest_topics(level, count=4)
    lines = ["【 Gợi ý chủ đề hôm nay 】"]
    for i, t in enumerate(topics, 1):
        lines.append(f"  {i}. {t['title']} — {t['prompt_vi']}")
    return "\n".join(lines)


def next_topic_prompt(level: str = "N5") -> dict[str, str]:
    normalized = level.upper() if level else "N5"
    if normalized not in TOPICS_BY_LEVEL:
        normalized = "N5"
    return random.choice(TOPICS_BY_LEVEL[normalized])


def build_topic_opening_reply(topic: dict[str, str], level: str | None = "N5") -> str:
    """Japanese coach line that opens or switches to a topic (level-aware length)."""
    title = (topic.get("title") or "").strip()
    prompt_ja = (topic.get("prompt_ja") or "").strip()
    lv = (level or "N5").upper()

    if lv == "N5":
        # Short + clear for beginners / slow TTS.
        if title and prompt_ja:
            return f"はい。では「{title}」です。{prompt_ja}"
        if prompt_ja:
            return f"はい。新しい話題です。{prompt_ja}"
        return "はい。新しい話題にしましょう。"

    if lv == "N4":
        if title and prompt_ja:
            return f"わかりました。では「{title}」について話しましょう。{prompt_ja}"
        if prompt_ja:
            return f"わかりました。新しい話題にしましょう。{prompt_ja}"
        return "わかりました。新しい話題にしましょう。"

    if title and prompt_ja:
        return f"わかりました！では「{title}」について話しましょう。{prompt_ja}"
    if prompt_ja:
        return f"わかりました！では新しい話題にしましょう。{prompt_ja}"
    return "わかりました！では新しい話題にしましょう。何について話したいですか？"


def resolve_topic_change(level: str) -> tuple[dict[str, str], str]:
    """Pick a new topic for the learner's level and build the coach reply."""
    topic = next_topic_prompt(level)
    return topic, build_topic_opening_reply(topic, level)


def topic_context_line(topic: dict[str, str] | None) -> str:
    if not topic:
        return ""
    title = topic.get("title") or ""
    prompt_vi = topic.get("prompt_vi") or ""
    return (
        f"Current conversation topic: {title}"
        + (f" ({prompt_vi})" if prompt_vi else "")
        + ". Stay loosely on this topic, but NEVER re-ask facts already in "
        "dialogue history / known facts. Advance the conversation."
    )
