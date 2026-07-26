import 'package:flutter/material.dart';
import '../models/submission_model.dart';
import '../services/api_service.dart';

class SubmissionProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<EnrolledCourse> _courses = [];
  List<Assignment> _assignments = [];
  final Map<String, Submission?> _submissions = {};
  bool _isLoadingCourses = false;
  bool _isLoadingAssignments = false;
  String? _error;
  String _selectedCourseId = '';
  String _searchQuery = '';
  String _statusFilter = 'all';

  List<EnrolledCourse> get courses => _courses;
  List<Assignment> get assignments => _filteredAssignments;
  bool get isLoadingCourses => _isLoadingCourses;
  bool get isLoadingAssignments => _isLoadingAssignments;
  String? get error => _error;
  String get selectedCourseId => _selectedCourseId;
  String get statusFilter => _statusFilter;

  void selectCourse(String id) {
    _selectedCourseId = id;
    notifyListeners();
  }

  void setSearch(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setStatusFilter(String filter) {
    _statusFilter = filter;
    notifyListeners();
  }

  List<Assignment> get _filteredAssignments {
    var result = _assignments;
    if (_searchQuery.isNotEmpty) {
      result = result.where((a) =>
        a.title.toLowerCase().contains(_searchQuery.toLowerCase())).toList();
    }
    if (_statusFilter == 'active') {
      result = result.where((a) => a.isOpen).toList();
    } else if (_statusFilter == 'closed') {
      result = result.where((a) => a.isClosed).toList();
    }
    return result;
  }

  Submission? getSubmission(String assignmentId) => _submissions[assignmentId];

  Future<void> fetchCourses(String token) async {
    _isLoadingCourses = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _apiService.fetchStudentCoursesWithData(token);
      final data = res['data'] as List<dynamic>? ?? [];
      _courses = data.map((e) => EnrolledCourse.fromJson(e as Map<String, dynamic>)).toList();
      if (_courses.isNotEmpty && _selectedCourseId.isEmpty) {
        _selectedCourseId = _courses.first.id;
      }
    } catch (e) {
      _error = 'Không thể tải danh sách khóa học';
    } finally {
      _isLoadingCourses = false;
      notifyListeners();
    }
  }

  Future<void> fetchAssignments(String token) async {
    if (_selectedCourseId.isEmpty) return;
    _isLoadingAssignments = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _apiService.fetchAssignments(
        token,
        _selectedCourseId,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        limit: 100,
      );
      final list = res['assignments'] as List<dynamic>? ?? [];
      _assignments = list.map((e) => Assignment.fromJson(e as Map<String, dynamic>)).toList();

      final results = await Future.wait(_assignments.map((a) async {
        try {
          final subRes = await _apiService.fetchMySubmission(token, a.id);
          return MapEntry(a.id, Submission.fromJson(subRes['submission'] as Map<String, dynamic>));
        } catch (_) {
          return MapEntry(a.id, null);
        }
      }));
      for (final e in results) {
        _submissions[e.key] = e.value;
      }
    } catch (e) {
      _assignments = [];
      _error = 'Không thể tải danh sách bài tập';
    } finally {
      _isLoadingAssignments = false;
      notifyListeners();
    }
  }
}
