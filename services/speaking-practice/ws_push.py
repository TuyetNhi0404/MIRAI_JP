"""Lightweight per-user WebSocket registry for async reply push.

The HTTP /conversation endpoint returns the transcript immediately, then runs
LLM + grammar + TTS in the background and pushes the finished reply/audio to the
connected client through this registry (so the UI can show the transcript first
and stream the coach reply afterwards).
"""

import asyncio
from typing import Dict, Optional

from fastapi import WebSocket


class WsRegistry:
    def __init__(self) -> None:
        self._conns: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            # Close any previous socket for the same user to avoid duplicates.
            old = self._conns.get(user_id)
            if old is not None and old is not websocket:
                try:
                    await old.close()
                except Exception:
                    pass
            self._conns[user_id] = websocket

    async def disconnect(self, user_id: str) -> None:
        async with self._lock:
            if self._conns.get(user_id) is not None:
                self._conns.pop(user_id, None)

    def get(self, user_id: str) -> Optional[WebSocket]:
        return self._conns.get(user_id)

    async def push(self, user_id: str, message: dict) -> bool:
        ws = self.get(user_id)
        if ws is None:
            return False
        try:
            await ws.send_json(message)
            return True
        except Exception as e:
            print(f"[WS-PUSH] failed to push to {user_id}: {e}")
            return False


registry = WsRegistry()
