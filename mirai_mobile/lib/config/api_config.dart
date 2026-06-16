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
}
