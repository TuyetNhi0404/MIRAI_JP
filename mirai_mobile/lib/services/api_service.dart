import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

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
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/courses/teacher/courses/$courseId/members');
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
}
