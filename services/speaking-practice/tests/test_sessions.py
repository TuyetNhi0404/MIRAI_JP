from dataclasses import replace

import pytest

from sessions import (
    StudentModel,
    default_session,
    get_session,
    store_session,
    update_score,
    add_history,
    reset_user_session,
    SCORE_MAP,
    _user_sessions,
)


class TestStudentModel:
    def test_create_default(self):
        s = StudentModel(user_id="test")
        assert s.user_id == "test"
        assert s.level == "N5"
        assert s.score == 50
        assert s.confidence == 0.8
        assert s.mode == "free_talk"
        assert s.history == []
        assert s.mistakes == []

    def test_frozen_dataclass_prevents_mutation(self):
        s = StudentModel(user_id="test")
        with pytest.raises(AttributeError):
            s.score = 100  # type: ignore[misc]

    def test_replace_creates_new_instance(self):
        s1 = StudentModel(user_id="test", level="N5")
        s2 = replace(s1, level="N4")
        assert s1.level == "N5"
        assert s2.level == "N4"
        assert s2.user_id == "test"

    def test_default_session(self):
        s = default_session("user1", "N4")
        assert s.user_id == "user1"
        assert s.level == "N4"
        assert s.score == SCORE_MAP["N4"]


class TestUpdateScore:
    def test_good_confidence_increases_score(self):
        s = StudentModel(user_id="test", score=50)
        updated = update_score(s, 0.85)
        assert updated.score == 52

    def test_bad_confidence_decreases_score(self):
        s = StudentModel(user_id="test", score=50)
        updated = update_score(s, 0.5)
        assert updated.score == 45

    def test_score_clamped_to_0(self):
        s = StudentModel(user_id="test", score=3)
        updated = update_score(s, 0.5)
        assert updated.score == 0

    def test_score_clamped_to_100(self):
        s = StudentModel(user_id="test", score=99)
        updated = update_score(s, 0.85)
        assert updated.score == 100

    def test_level_promotion_n5_to_n4(self):
        s = StudentModel(user_id="test", level="N5", score=54)
        updated = update_score(s, 0.85)
        assert updated.score == 56
        assert updated.level == "N4"

    def test_level_promotion_n4_to_n3(self):
        s = StudentModel(user_id="test", level="N4", score=69)
        updated = update_score(s, 0.85)
        assert updated.score == 71
        assert updated.level == "N3"


class TestAddHistory:
    def test_appends_user_and_ai(self):
        s = StudentModel(user_id="test")
        updated = add_history(s, "user text", "ai text")
        assert len(updated.history) == 2
        assert updated.history[0] == {"role": "user", "text": "user text"}
        assert updated.history[1] == {"role": "ai", "text": "ai text"}

    def test_does_not_mutate_original(self):
        s = StudentModel(user_id="test")
        add_history(s, "user text", "ai text")
        assert s.history == []

    def test_trims_to_60_entries(self):
        entries = [{"role": "user" if i % 2 == 0 else "ai", "text": str(i)} for i in range(70)]
        s = StudentModel(user_id="test", history=entries)
        updated = add_history(s, "new user", "new ai")
        assert len(updated.history) == 60


class TestSessionStorage:
    def test_get_session_creates_default(self):
        _user_sessions.clear()
        s = get_session("new-user")
        assert s.user_id == "new-user"
        assert s.level == "N5"

    def test_store_session_persists(self):
        _user_sessions.clear()
        s = StudentModel(user_id="stored-user", score=99)
        store_session("stored-user", s)
        retrieved = get_session("stored-user")
        assert retrieved.score == 99

    def test_reset_creates_fresh_session(self):
        _user_sessions.clear()
        s = StudentModel(user_id="reset-user", level="N3")
        store_session("reset-user", s)
        fresh = reset_user_session("reset-user", "N5")
        assert fresh.level == "N5"
        assert fresh.score == SCORE_MAP["N5"]
        # Verify stored version is also reset
        retrieved = get_session("reset-user")
        assert retrieved.level == "N5"
