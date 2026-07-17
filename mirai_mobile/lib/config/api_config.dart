import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConfig {
  // Configurable base URL. Detects if running on Android Emulator or iOS/Web
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000';
    }
    // Android emulator maps 10.0.2.2 to the host loopback (localhost)
    return Platform.isAndroid ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
  }

  static const String registerEndpoint = '/api/auth/register';
  static const String loginEndpoint = '/api/auth/login';
  static const String googleLoginEndpoint = '/api/auth/google';
  static const String logoutEndpoint = '/api/auth/logout';
  static const String refreshTokenEndpoint = '/api/auth/refresh-token';

  // The mobile app reaches the speaking service WebSocket directly on its own
  // port (8000). The BE HTTP proxy at /api/speaking is only used for the
  // request/response endpoints; connecting the WS through that proxy proved
  // unreliable for upgrade forwarding, so we talk to the speaking service
  // directly (it authenticates via the internal key + x-user-id).
  static String get speakingWsUrl {
    final host = baseUrl.replaceFirst(RegExp(r'^https?://'), '');
    final bareHost = host.contains(':') ? host.split(':').first : host;
    return 'ws://$bareHost:8000/ws';
  }

  static const String speakingInternalKey = 'mirai-speaking-dev-key';
}
