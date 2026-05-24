SCORE_MAP = {
    "N5": 50,
    "N4": 60,
    "N3": 72,
    "N2": 82,
    "N1": 92,
}

_user_sessions: dict[str, dict] = {}


def default_session(user_id: str, level: str = "N5") -> dict:
    return {
        "user_id": user_id,
        "level": level,
        "mode": "free_talk",
        "history": [],
        "weakness": ["particles"],
        "score": SCORE_MAP.get(level, 50),
    }


def get_session(user_id: str) -> dict:
    if user_id not in _user_sessions:
        _user_sessions[user_id] = default_session(user_id)
    return _user_sessions[user_id]


def reset_user_session(user_id: str, level: str) -> dict:
    _user_sessions[user_id] = default_session(user_id, level)
    return _user_sessions[user_id]
