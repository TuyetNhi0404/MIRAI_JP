import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFFB90000);
  static const Color primaryLight = Color(0xFFFCE8E8);
  static const Color primarySurface = Color(0xFFFFF1F0);
  static const Color ink = Color(0xFF1F2238);
  static const Color textSecondary = Color(0xFF595959);
  static const Color textTertiary = Color(0xFF8C8C8C);
  static const Color border = Color(0xFFE8E8E8);
  static const Color surface = Color(0xFFF5F5F5);
  static const Color surfaceMuted = Color(0xFFFAFAFA);
  static const Color white = Colors.white;
  static const Color success = Color(0xFF52C41A);
  static const Color successBg = Color(0xFFF6FFED);
  static const Color error = Color(0xFFFF4D4F);
  static const Color errorBg = Color(0xFFFFF1F0);
  static const Color warning = Color(0xFFFA8C16);
  static const Color warningBg = Color(0xFFFFFBE6);
  static const Color info = Color(0xFF1890FF);
  static const Color infoBg = Color(0xFFE6F7FF);
  static const Color disabled = Color(0xFFBFBFBF);
  static const Color shadow = Color(0x08000000);
}

class AppRadius {
  static const double sm = 6;
  static const double md = 8;
  static const double lg = 12;
  static const double xl = 14;
  static const double xxl = 16;
  static const double full = 24;
}

class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
}

class AppShadow {
  static List<BoxShadow> card = [
    BoxShadow(
      color: AppColors.shadow,
      blurRadius: 8,
      offset: const Offset(0, 2),
    ),
  ];

  static List<BoxShadow> elevated = [
    BoxShadow(
      color: AppColors.shadow,
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> mic = [
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.3),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
  ];
}

class AppDuration {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 250);
  static const Duration slow = Duration(milliseconds: 400);
}
