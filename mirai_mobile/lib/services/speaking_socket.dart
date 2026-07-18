import 'dart:convert';
import 'dart:io';

import '../config/api_config.dart';

/// Thin WebSocket client for the speaking-practice `/ws` push channel.
///
/// Flow: the UI calls the HTTP `/conversation` endpoint (which returns the
/// transcript immediately), then this socket delivers the finished coach reply
/// as a `{"type": "reply", ...}` message once the (slow) LLM+TTS pipeline ends.
class SpeakingSocket {
  final String token;
  final void Function(Map<String, dynamic> message) onMessage;
  final void Function()? onOpen;
  final void Function()? onClose;

  WebSocket? _socket;
  bool _closedByUser = false;

  SpeakingSocket({
    required this.token,
    required this.onMessage,
    this.onOpen,
    this.onClose,
  });

  Future<void> connect() async {
    if (_socket != null) return;
    try {
      final url = ApiConfig.speakingWsUrl;
      final userId = _extractUserId(token);
      final ws = await WebSocket.connect(
        url,
        headers: {
          'x-user-id': userId,
          'x-speaking-internal-key': ApiConfig.speakingInternalKey,
        },
      );
      _socket = ws;
      ws.listen(
        (data) {
          if (data is String) {
            try {
              final json = jsonDecode(data) as Map<String, dynamic>;
              onMessage(json);
            } catch (_) {
              // ignore malformed frames
            }
          }
        },
        onDone: () {
          _socket = null;
          if (!_closedByUser) onClose?.call();
        },
        onError: (_) {
          _socket = null;
          if (!_closedByUser) onClose?.call();
        },
        cancelOnError: false,
      );
      onOpen?.call();
    } catch (e) {
      _socket = null;
      onClose?.call();
    }
  }

  void send(Map<String, dynamic> message) {
    try {
      _socket?.add(jsonEncode(message));
    } catch (_) {
      // socket not ready — caller can retry on reconnect
    }
  }

  void close() {
    _closedByUser = true;
    try {
      _socket?.close();
    } catch (_) {}
    _socket = null;
  }

  // The speaking service identifies the user via the x-user-id header. Our JWT
  // `sub` claim is the user id; fall back to "dev-user" if it can't be parsed.
  String _extractUserId(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return 'dev-user';
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      ) as Map<String, dynamic>;
      return (payload['sub'] ?? payload['id'] ?? 'dev-user').toString();
    } catch (_) {
      return 'dev-user';
    }
  }
}
