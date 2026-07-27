from tts import (
    LEVEL_VOICE_PROFILES,
    normalize_level,
    prepare_speech_text,
    voice_settings_for_level,
)


def test_n5_is_slower_than_n1():
    n5 = voice_settings_for_level("N5")
    n1 = voice_settings_for_level("N1")
    assert n5["speed"] < n1["speed"]
    assert n5["stability"] > n1["stability"]


def test_n5_speed_within_elevenlabs_window():
    from tts import SPEED_MIN, SPEED_MAX, clamp_speed

    n5 = voice_settings_for_level("N5")
    assert SPEED_MIN <= n5["speed"] <= SPEED_MAX
    assert clamp_speed(0.55) == SPEED_MIN
    assert clamp_speed(2.0) == SPEED_MAX


def test_unknown_level_falls_back_to_n5():
    assert normalize_level("XYZ") == "N5"
    assert voice_settings_for_level(None)["speed"] == LEVEL_VOICE_PROFILES["N5"]["speed"]


def test_prepare_speech_text_adds_pause_for_beginners():
    text = "こんにちは。元気ですか。"
    n5 = prepare_speech_text(text, "N5")
    n1 = prepare_speech_text(text, "N1")
    assert "…" in n5
    assert n5 != n1
    assert "こんにちは。" in n5


def test_prepare_speech_text_n1_keeps_natural():
    text = "こんにちは。元気ですか。"
    assert prepare_speech_text(text, "N1") == text


def test_all_levels_have_profiles():
    from tts import SPEED_MIN, SPEED_MAX

    for lv in ("N5", "N4", "N3", "N2", "N1"):
        s = voice_settings_for_level(lv)
        assert SPEED_MIN <= s["speed"] <= SPEED_MAX
        assert 0.0 <= s["stability"] <= 1.0
