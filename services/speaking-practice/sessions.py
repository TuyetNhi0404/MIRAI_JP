from __future__ import annotations

import time
from dataclasses import dataclass, field, replace
from typing import Any

SCORE_MAP: dict[str, int] = {
    "N5": 50,
    "N4": 60,
    "N3": 72,
    "N2": 82,
    "N1": 92,
}

LEVEL_BOUNDARIES: list[tuple[int, str]] = [
    (90, "N1"),
    (80, "N2"),
    (70, "N3"),
    (55, "N4"),
]

HISTORY_MAX_LEN = 60


@dataclass(frozen=True)
class StudentModel:
    user_id: str
    level: str = "N5"
    mode: str = "free_talk"
    history: list[dict[str, str]] = field(default_factory=list)
    weakness: list[str] = field(default_factory=lambda: ["particles"])
    score: int = 50
    confidence: float = 0.8
    mistakes: list[dict[str, Any]] = field(default_factory=list)
    grammar_mastery: dict[str, float] = field(default_factory=dict)


_user_sessions: dict[str, StudentModel] = {}
_session_access_time: dict[str, float] = {}
MAX_SESSIONS = 1000


def default_session(user_id: str, level: str = "N5") -> StudentModel:
    return StudentModel(
        user_id=user_id,
        level=level,
        score=SCORE_MAP.get(level, 50),
    )


def get_session(user_id: str) -> StudentModel:
    if user_id not in _user_sessions:
        if len(_user_sessions) >= MAX_SESSIONS:
            _evict_oldest()
        _user_sessions[user_id] = default_session(user_id)
    _session_access_time[user_id] = time.time()
    return _user_sessions[user_id]


def store_session(user_id: str, session: StudentModel) -> None:
    if user_id not in _user_sessions and len(_user_sessions) >= MAX_SESSIONS:
        _evict_oldest()
    _user_sessions[user_id] = session
    _session_access_time[user_id] = time.time()


def _evict_oldest() -> None:
    if not _session_access_time:
        return
    oldest_uid = min(_session_access_time, key=_session_access_time.get)  # type: ignore[arg-type]
    _user_sessions.pop(oldest_uid, None)
    _session_access_time.pop(oldest_uid, None)


def reset_user_session(user_id: str, level: str) -> StudentModel:
    new_session = default_session(user_id, level)
    _user_sessions[user_id] = new_session
    _session_access_time[user_id] = time.time()
    return new_session


def update_score(
    session: StudentModel, whisper_confidence: float
) -> StudentModel:
    delta = 2 if whisper_confidence >= 0.6 else -5
    new_score = max(0, min(100, session.score + delta))

    new_level = session.level
    for boundary, level_name in LEVEL_BOUNDARIES:
        if new_score > boundary:
            new_level = level_name
            break

    return replace(session, score=new_score, level=new_level)


def add_history(
    session: StudentModel, user_text: str, ai_text: str
) -> StudentModel:
    new_history = list(session.history)
    new_history.append({"role": "user", "text": user_text})
    new_history.append({"role": "ai", "text": ai_text})
    if len(new_history) > HISTORY_MAX_LEN:
        new_history = new_history[-HISTORY_MAX_LEN:]
    return replace(session, history=new_history)