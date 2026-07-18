import 'package:flutter/material.dart';
import '../models/schedule_model.dart';
import '../services/api_service.dart';

class ScheduleProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final Map<String, String> _courseNameCache = {};
  final Map<String, String> _teacherNameCache = {};

  List<SessionItem> _items = [];
  bool _isLoading = false;
  String? _error;
  bool _authRequired = false;
  DateTime _currentMonday = _getMonday(DateTime.now());

  List<SessionItem> get items => _items;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get authRequired => _authRequired;
  DateTime get currentMonday => _currentMonday;

  String get weekStartStr {
    final d = _currentMonday;
    return '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  String get weekDisplay {
    final start = _currentMonday;
    final end = DateTime(start.year, start.month, start.day + 6);
    return '${start.day}/${start.month}/${start.year} – ${end.day}/${end.month}/${end.year}';
  }

  void goPreviousWeek() {
    _currentMonday = _currentMonday.subtract(const Duration(days: 7));
    notifyListeners();
  }

  void goNextWeek() {
    _currentMonday = _currentMonday.add(const Duration(days: 7));
    notifyListeners();
  }

  void goCurrentWeek() {
    _currentMonday = _getMonday(DateTime.now());
    notifyListeners();
  }

  static DateTime _getMonday(DateTime dt) {
    final day = dt.weekday;
    final diff = day - DateTime.monday;
    return DateTime(dt.year, dt.month, dt.day - diff);
  }

  Future<void> fetchSchedule(String token) async {
    _isLoading = true;
    _error = null;
    _authRequired = false;
    notifyListeners();

    try {
      final calRes = await _apiService.fetchCalendars(token);
      final rawData = calRes['data'] as List<dynamic>? ?? calRes['calendars'] as List<dynamic>? ?? [];

      String? userId;
      try {
        final profileRes = await _apiService.fetchProfile(token);
        final profile = profileRes['data'] as Map<String, dynamic>? ?? profileRes;
        userId = profile['_id'] as String? ?? profile['id'] as String?;
      } catch (_) {}

      final attendanceMap = <String, String>{};
      if (userId != null) {
        try {
          final attRes = await _apiService.fetchAttendanceByStudent(token, userId);
          final attData = attRes['data'] as List<dynamic>? ?? attRes['attendances'] as List<dynamic>? ?? [];
          for (final a in attData) {
            final rec = a as Map<String, dynamic>;
            final calId = rec['calendarId'];
            final calIdStr = calId is Map ? calId['_id'] as String? : calId?.toString();
            final status = rec['status'] as String? ?? 'not_yet';
            if (calIdStr != null) {
              attendanceMap[calIdStr] = status;
            }
          }
        } catch (_) {}
      }

      final uniqueCourseIds = <String>{};
      final uniqueTeacherIds = <String>{};
      for (final raw in rawData) {
        final cal = raw as Map<String, dynamic>;
        final cid = _resolveId(cal['courseId']);
        if (cid != null) uniqueCourseIds.add(cid);
        final tid = _resolveId(cal['teacherId']);
        if (tid != null) uniqueTeacherIds.add(tid);
      }

      await Future.wait([
        for (final cid in uniqueCourseIds)
          _courseNameCache.containsKey(cid)
              ? Future.value()
              : _apiService.fetchCourseById(token, cid).then((courseRes) {
                  final name = courseRes['courseName'] as String? ??
                      courseRes['name'] as String? ??
                      courseRes['data']?['courseName'] as String? ??
                      'Chưa xác định';
                  _courseNameCache[cid] = name;
                }).catchError((_) {
                  _courseNameCache[cid] = 'Chưa xác định';
                }),
        for (final tid in uniqueTeacherIds)
          _teacherNameCache.containsKey(tid)
              ? Future.value()
              : _apiService.fetchUserById(token, tid).then((userRes) {
                  final userData = userRes['data'] as Map<String, dynamic>? ?? userRes;
                  final name = userData['fullName'] as String? ??
                      userData['name'] as String? ??
                      userData['displayName'] as String? ??
                      'GV';
                  _teacherNameCache[tid] = name;
                }).catchError((_) {
                  _teacherNameCache[tid] = 'GV';
                }),
      ]);

      final items = <SessionItem>[];
      for (final raw in rawData) {
        final cal = raw as Map<String, dynamic>;
        final dateRaw = cal['date'] as String? ?? cal['startDate'] as String? ?? cal['day'] as String?;
        if (dateRaw == null) continue;

        final courseId = _resolveId(cal['courseId']);
        final sessionObj = cal['sessionId'] as Map<String, dynamic>? ?? cal['session'] as Map<String, dynamic>?;
        final startTime = sessionObj?['startTime'] as String? ?? cal['startTime'] as String? ?? '09:00';
        final endTime = sessionObj?['endTime'] as String? ?? cal['endTime'] as String? ?? '11:30';
        final hour = int.tryParse(startTime.split(':').first) ?? 9;
        final slotNum = cal['slotNumber'] as int? ?? (hour < 12 ? 1 : 4);

        final courseName = courseId != null
            ? (_courseNameCache[courseId] ?? 'Chưa xác định')
            : 'Chưa xác định';

        String teacher = 'GV';
        final teacherId = _resolveId(cal['teacherId']);
        if (teacherId != null) {
          teacher = _teacherNameCache[teacherId] ?? 'GV';
        }

        final calId = cal['_id'] as String? ?? cal['id'] as String? ?? '';
        final attStatus = attendanceMap[calId] ?? 'not_yet';
        final attendance = AttendanceStatus(status: attStatus);

        items.add(SessionItem(
          calendarId: calId,
          courseId: courseId ?? '',
          courseName: courseName,
          slotNumber: slotNum,
          date: dateRaw,
          startTime: startTime,
          endTime: endTime,
          teacher: teacher,
          attendance: attendance,
          room: cal['room'] as String?,
          sessionName: sessionObj?['sessionName'] as String?,
        ));
      }

      items.sort((a, b) {
        final c = a.date.compareTo(b.date);
        if (c != 0) return c;
        return a.slotNumber.compareTo(b.slotNumber);
      });

      _items = items;
    } catch (e) {
      if (e.toString().contains('401') || e.toString().contains('Unauthorized')) {
        _authRequired = true;
      }
      _error = 'Không thể tải lịch học';
      _items = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  String? _resolveId(dynamic val) {
    if (val == null) return null;
    if (val is String) return val;
    if (val is Map<String, dynamic>) return val['_id'] as String? ?? val['id'] as String?;
    return val.toString();
  }
}
