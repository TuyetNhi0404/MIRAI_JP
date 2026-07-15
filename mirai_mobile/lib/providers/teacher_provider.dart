import 'package:flutter/material.dart';
import '../models/course_model.dart';
import '../models/calendar_model.dart';
import '../models/attendance_model.dart';
import '../services/api_service.dart';
import '../services/calendar_service.dart';
import '../services/attendance_service.dart';

class TeacherProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final CalendarService _calendarService = CalendarService();
  final AttendanceService _attendanceService = AttendanceService();

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<CourseModel> _courses = [];
  List<CourseModel> get courses => _courses;

  List<CalendarModel> _weekCalendars = [];
  List<CalendarModel> get weekCalendars => _weekCalendars;

  List<AttendanceRecord> _currentAttendance = [];
  List<AttendanceRecord> get currentAttendance => _currentAttendance;

  Future<void> loadCourses(String token) async {
    _isLoading = true;
    notifyListeners();
    try {
      final data = await _apiService.fetchTeacherCourses(token);
      _courses = data.map((c) => CourseModel.fromJson(c)).toList();
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<EnrolledStudent>> loadClassMembers(String token, String courseId) async {
    try {
      final data = await _apiService.fetchClassMembers(token, courseId);
      return data.map((m) => EnrolledStudent.fromJson(m)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> loadWeekSchedule(String token, String startDate, String endDate) async {
    _isLoading = true;
    notifyListeners();
    try {
      _weekCalendars = await _calendarService.getCalendarsByWeek(token, startDate, endDate);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadAttendance(String token, String calendarId) async {
    _isLoading = true;
    notifyListeners();
    try {
      _currentAttendance = await _attendanceService.getStudentsForCalendar(token, calendarId);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateAttendance(String token, String calendarId, String userId, String status) async {
    try {
      await _attendanceService.updateAttendanceStatus(token, calendarId, userId, status);
      // Update local state
      final index = _currentAttendance.indexWhere((a) => a.user.id == userId);
      if (index != -1) {
        _currentAttendance[index].status = status;
        notifyListeners();
      }
    } catch (e) {
      rethrow;
    }
  }
}
