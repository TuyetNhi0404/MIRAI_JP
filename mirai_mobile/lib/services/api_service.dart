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

  // ==================== ACCOUNT MANAGEMENT (Admin) ====================

  Future<Map<String, dynamic>> fetchUsers(String token) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/admin/users');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createUser(String token, Map<String, dynamic> data) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/admin/create-user');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(token: token),
        body: jsonEncode(data),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> lockUser(String token, String userId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/admin/lock/$userId');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(token: token),
      );
      _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> unlockUser(String token, String userId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/admin/unlock/$userId');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(token: token),
      );
      _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // ==================== SUBMISSION ASSIGNMENT (Student) ====================

  Future<Map<String, dynamic>> fetchStudentCoursesWithData(String token) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/courses/student/courses');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchAssignments(String token, String courseId, {String? search, int? limit, int? page}) async {
    final params = <String, String>{};
    if (search != null) params['search'] = search;
    if (limit != null) params['limit'] = limit.toString();
    if (page != null) params['page'] = page.toString();
    final query = params.isNotEmpty ? '?${Uri(queryParameters: params).query}' : '';
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/assignments/get/$courseId$query');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchMySubmission(String token, String assignmentId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/submissions/$assignmentId/my-submission');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> submitAssignment(
    String token,
    String assignmentId,
    List<int> fileBytes,
    String fileName,
  ) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/submissions/$assignmentId/submit');
    try {
      final request = http.MultipartRequest('POST', url);
      request.headers.addAll(_getHeaders(token: token));
      request.files.add(http.MultipartFile.fromBytes(
        'files',
        fileBytes,
        filename: fileName,
      ));
      final streamedResponse = await _client.send(request);
      final response = await http.Response.fromStream(streamedResponse);
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // ==================== STUDENT SCHEDULE ====================

  Future<Map<String, dynamic>> fetchProfile(String token) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/profile');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchMyCourseMembers(String token, String userId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/course-members/my-courses?userId=$userId&role=student');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchCalendars(String token) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/calendars');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchAttendanceByStudent(String token, String studentId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/attendances/student/$studentId');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchCourseById(String token, String courseId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/courses/$courseId');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchSessions(String token) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/sessions');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchUserById(String token, String userId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/users/$userId');
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // ==================== SPEAKING PRACTICE ====================

  Future<Map<String, dynamic>> resetSpeakingSession(String token, {String level = 'N5'}) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/speaking/reset');
    try {
      final request = http.MultipartRequest('POST', url)
        ..headers['Authorization'] = 'Bearer $token'
        ..fields['level'] = level;
      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> sendSpeakingText(String token, String text) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/speaking/reply');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(token: token),
        body: jsonEncode({'transcript': text}),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> sendSpeakingAudio(String token, String audioBase64) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/speaking/conversation');
    try {
      final bytes = base64Decode(audioBase64);
      final request = http.MultipartRequest('POST', url)
        ..headers['Authorization'] = 'Bearer $token'
        ..files.add(http.MultipartFile.fromBytes('audio_file', bytes, filename: 'audio.webm'));
      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }
}
