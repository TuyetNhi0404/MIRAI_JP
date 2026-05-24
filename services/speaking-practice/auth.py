import os

from fastapi import HTTPException, Request, WebSocket
from starlette.websockets import WebSocketDisconnect

INTERNAL_KEY = os.getenv("SPEAKING_INTERNAL_KEY", "mirai-speaking-dev-key")
SKIP_AUTH = os.getenv("SKIP_SPEAKING_AUTH", "false").lower() == "true"


def _user_from_headers(headers) -> str | None:
    if SKIP_AUTH:
        return headers.get("x-user-id") or "dev-user"
    key = headers.get("x-speaking-internal-key", "")
    if key and key == INTERNAL_KEY:
        return headers.get("x-user-id")
    return None


async def get_current_user_id(request: Request) -> str:
    user_id = _user_from_headers(request.headers)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user_id


async def authenticate_websocket(websocket: WebSocket) -> str:
    user_id = _user_from_headers(websocket.headers)
    if not user_id:
        await websocket.close(code=4401, reason="Unauthorized")
        raise WebSocketDisconnect(code=4401)
    return user_id
