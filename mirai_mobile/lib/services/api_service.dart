import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/quiz_models.dart';

class ApiService {
  final http.Client _client = http.Client();

  // Helper for JSON headers
  Map<String, String> _getHeaders({String? token}) {
    final Map<String, String> headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // Handle Response helper
  dynamic _processResponse(http.Response response) {
    final Map<String, dynamic> data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else {
      throw Exception(data['message'] ?? 'An error occurred. Status: ${response.statusCode}');
    }
  }

  // Register Account
  Future<Map<String, dynamic>> register(String email, String password) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.registerEndpoint}');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // Traditional Login
  Future<Map<String, dynamic>> login(String email, String password) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.loginEndpoint}');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // Google Login
  Future<Map<String, dynamic>> googleLogin(String googleIdToken) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.googleLoginEndpoint}');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'token': googleIdToken,
        }),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // Refresh Token
  Future<String> refreshToken(String oldRefreshToken) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.refreshTokenEndpoint}');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'refreshToken': oldRefreshToken,
        }),
      );
      
      final data = _processResponse(response);
      return data['accessToken'] as String;
    } catch (e) {
      rethrow;
    }
  }

  // Logout
  Future<void> logout(String? accessToken) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.logoutEndpoint}');
    try {
      await _client.post(
        url,
        headers: _getHeaders(token: accessToken),
      );
    } catch (_) {
      // Ignore network errors on logout since we want to clear local state regardless
    }
  }
  // Fetch Available Courses (Public)
  Future<List<Map<String, dynamic>>> fetchAvailableCourses() async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/courses/available');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['data'] != null) {
        return List<Map<String, dynamic>>.from(decoded['data']);
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // Enroll in a Course
  Future<Map<String, dynamic>> enrollCourse(
      String courseId, String studentName, String studentEmail) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/enrollments');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'courseId': courseId,
          'studentName': studentName,
          'studentEmail': studentEmail,
        }),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // Get student enrolled courses
  Future<List<Map<String, dynamic>>> fetchStudentCourses(String token) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/courses/student/courses');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['data'] != null) {
        return List<Map<String, dynamic>>.from(decoded['data']);
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // Get teacher courses
  Future<List<Map<String, dynamic>>> fetchTeacherCourses(String token) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/courses/teacher/courses');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['data'] != null) {
        return List<Map<String, dynamic>>.from(decoded['data']);
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // Get teacher class members
  Future<List<Map<String, dynamic>>> fetchClassMembers(String token, String courseId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/courses/$courseId/members');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['data'] != null && decoded['data']['students'] != null) {
        return List<Map<String, dynamic>>.from(decoded['data']['students']);
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // Get all enrollments for Admin
  Future<List<Map<String, dynamic>>> fetchAllEnrollments(String token, {String? status}) async {
    String urlStr = '${ApiConfig.baseUrl}/api/enrollments';
    if (status != null) {
      urlStr += '?status=$status';
    }
    final Uri url = Uri.parse(urlStr);
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['data'] != null) {
        return List<Map<String, dynamic>>.from(decoded['data']);
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // Approve enrollment (Admin)
  Future<void> approveEnrollment(String token, String enrollmentId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/enrollments/$enrollmentId/approve');
    try {
      final response = await _client.patch(
        url,
        headers: _getHeaders(token: token),
      );
      _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // Reject enrollment (Admin)
  Future<void> rejectEnrollment(String token, String enrollmentId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/enrollments/$enrollmentId/reject');
    try {
      final response = await _client.patch(
        url,
        headers: _getHeaders(token: token),
      );
      _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // Get student course statistics
  Future<Map<String, dynamic>?> fetchStudentCourseStatistics(
      String token, String studentId, String courseId) async {
    final Uri url = Uri.parse(
        '${ApiConfig.baseUrl}/api/statistics/students/$studentId/courses/$courseId');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['data'] != null) {
        return Map<String, dynamic>.from(decoded['data']);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  // Fetch available student quizzes
  Future<List<QuizWithAttempt>> fetchStudentQuizzes(String token) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/quizzes/student/my-quizzes');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['quizzes'] != null) {
        final List<dynamic> list = decoded['quizzes'];
        return list.map((item) => QuizWithAttempt.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // Start selected quiz (fetch questions)
  Future<Quiz> startQuiz(String token, String quizId, String studentId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/quizzes/$quizId/start?studentId=$studentId');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['quiz'] != null) {
        return Quiz.fromJson(decoded['quiz']);
      }
      throw Exception('Không có dữ liệu bài kiểm tra');
    } catch (e) {
      rethrow;
    }
  }

  // Submit quiz answers
  Future<AttemptDetailResponse> submitQuiz(
    String token,
    String quizId,
    List<int> answers,
    int timeSpent,
    String studentId,
  ) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/quizzes/$quizId/submit');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(token: token),
        body: jsonEncode({
          'answers': answers,
          'timeSpent': timeSpent,
          'studentId': studentId,
        }),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['result'] != null) {
        return AttemptDetailResponse.fromJson(decoded['result']);
      }
      throw Exception('Không nhận được phản hồi kết quả thi');
    } catch (e) {
      rethrow;
    }
  }

  // Fetch student quiz history
  Future<List<QuizAttempt>> fetchStudentQuizHistory(String token, String studentId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/quizzes/history?studentId=$studentId');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['history'] != null) {
        final List<dynamic> list = decoded['history'];
        return list.map((item) => QuizAttempt.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // Fetch detailed attempt result
  Future<AttemptDetailResponse> fetchAttemptResult(String token, String attemptId, String studentId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/quizzes/attempt/$attemptId/result?studentId=$studentId');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['result'] != null) {
        return AttemptDetailResponse.fromJson(decoded['result']);
      }
      throw Exception('Không tìm thấy kết quả chi tiết');
    } catch (e) {
      rethrow;
    }
  }
}
