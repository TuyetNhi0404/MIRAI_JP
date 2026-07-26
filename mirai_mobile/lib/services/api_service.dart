import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
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
      throw Exception(
        data['message'] ?? 'An error occurred. Status: ${response.statusCode}',
      );
    }
  }

  // Register Account
  Future<Map<String, dynamic>> register(String email, String password) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}${ApiConfig.registerEndpoint}',
    );
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({'email': email, 'password': password}),
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
        body: jsonEncode({'email': email, 'password': password}),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // Google Login
  Future<Map<String, dynamic>> googleLogin(String googleIdToken) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}${ApiConfig.googleLoginEndpoint}',
    );
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({'token': googleIdToken}),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // Refresh Token
  Future<String> refreshToken(String oldRefreshToken) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}${ApiConfig.refreshTokenEndpoint}',
    );
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({'refreshToken': oldRefreshToken}),
      );

      final data = _processResponse(response);
      return data['accessToken'] as String;
    } catch (e) {
      rethrow;
    }
  }

  // Logout
  Future<void> logout(String? accessToken) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}${ApiConfig.logoutEndpoint}',
    );
    try {
      await _client.post(url, headers: _getHeaders(token: accessToken));
    } catch (_) {
      // Ignore network errors on logout since we want to clear local state regardless
    }
  }

  // Fetch Available Courses (Public)
  Future<List<Map<String, dynamic>>> fetchAvailableCourses() async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/courses/available');
    try {
      final response = await _client.get(url, headers: _getHeaders());
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
    String courseId,
    String studentName,
    String studentEmail,
  ) async {
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
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/courses/student/courses',
    );
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
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/courses/teacher/courses',
    );
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
  Future<List<Map<String, dynamic>>> fetchClassMembers(
    String token,
    String courseId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/courses/teacher/courses/$courseId/members',
    );
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null &&
          decoded['data'] != null &&
          decoded['data']['students'] != null) {
        return List<Map<String, dynamic>>.from(decoded['data']['students']);
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // Get all enrollments for Admin
  Future<List<Map<String, dynamic>>> fetchAllEnrollments(
    String token, {
    String? status,
  }) async {
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
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/enrollments/$enrollmentId/approve',
    );
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
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/enrollments/$enrollmentId/reject',
    );
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

  // ─── LEADERBOARD API ───────────────────────────────────────────────────────

  // Fetch course leaderboard
  Future<Map<String, dynamic>> fetchCourseLeaderboard(
    String token,
    String courseId, {
    int limit = 10,
  }) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/leaderboards/course/$courseId?limit=$limit',
    );
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

  // Fetch Vocabularies
  Future<List<Map<String, dynamic>>> fetchVocabularies({
    String? token,
    String? level,
    String? topic,
  }) async {
    String urlStr = '${ApiConfig.baseUrl}/api/vocabulary';
    final queryParams = <String>[];
    if (level != null && level.isNotEmpty) queryParams.add('level=$level');
    if (topic != null && topic.isNotEmpty) queryParams.add('topic=$topic');
    if (queryParams.isNotEmpty) {
      urlStr += '?${queryParams.join('&')}';
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

  Future<Map<String, dynamic>> createUser(
    String token,
    Map<String, dynamic> data,
  ) async {
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
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/courses/student/courses',
    );
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

  Future<Map<String, dynamic>> fetchStudentRankInCourse(
    String token,
    String studentId,
    String courseId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/leaderboards/student/$studentId/course/$courseId',
    );
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

  Future<Map<String, dynamic>> fetchAssignments(
    String token,
    String courseId, {
    String? search,
    int? limit,
    int? page,
  }) async {
    final params = <String, String>{};
    if (search != null) params['search'] = search;
    if (limit != null) params['limit'] = limit.toString();
    if (page != null) params['page'] = page.toString();
    final query = params.isNotEmpty
        ? '?${Uri(queryParameters: params).query}'
        : '';
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/assignments/get/$courseId$query',
    );
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

  // Fetch leaderboard by component (attendance, assignment, quiz)
  Future<Map<String, dynamic>> fetchLeaderboardByComponent(
    String token,
    String courseId,
    String component, {
    int limit = 10,
  }) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/leaderboards/course/$courseId/component/$component?limit=$limit',
    );
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

  Future<Map<String, dynamic>> fetchMySubmission(
    String token,
    String assignmentId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/submissions/$assignmentId/my-submission',
    );
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
  // ─── VOCABULARY API ────────────────────────────────────────────────────────

  // Search vocabulary by keyword (text lookup)
  Future<List<Map<String, dynamic>>> searchVocabulary({
    String? token,
    required String keyword,
  }) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/vocabulary?search=$keyword',
    );
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null && decoded['vocabularies'] != null) {
        return List<Map<String, dynamic>>.from(decoded['vocabularies']);
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  // ─── GRAMMAR API ───────────────────────────────────────────────────────────

  // Fetch grammar cards for student practice
  Future<Map<String, dynamic>> fetchStudentPracticeCards(String token) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/grammar/student/practice',
    );
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
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/submissions/$assignmentId/submit',
    );
    try {
      final request = http.MultipartRequest('POST', url);
      request.headers.addAll(_getHeaders(token: token));
      request.files.add(
        http.MultipartFile.fromBytes('files', fileBytes, filename: fileName),
      );
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

  Future<Map<String, dynamic>> fetchMyCourseMembers(
    String token,
    String userId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/course-members/my-courses?userId=$userId&role=student',
    );
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

  // Upload or update profile Avatar
  Future<Map<String, dynamic>> updateAvatar(
    String token,
    String filePath,
  ) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/profile/avatar');
    try {
      final request = http.MultipartRequest('PUT', url);
      request.headers.addAll({
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      });

      // Add the avatar file
      request.files.add(
        await http.MultipartFile.fromPath(
          'file',
          filePath,
          contentType: MediaType(
            'image',
            filePath.split('.').last == 'png' ? 'png' : 'jpeg',
          ),
        ),
      );

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchAttendanceByStudent(
    String token,
    String studentId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/attendances/student/$studentId',
    );
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

  // Get student course statistics
  Future<Map<String, dynamic>?> fetchStudentCourseStatistics(
    String token,
    String studentId,
    String courseId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/statistics/students/$studentId/courses/$courseId',
    );
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

  Future<Map<String, dynamic>> fetchCourseById(
    String token,
    String courseId,
  ) async {
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

  // Fetch available student quizzes
  Future<List<QuizWithAttempt>> fetchStudentQuizzes(String token) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/quizzes/student/my-quizzes',
    );
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

  // Start selected quiz (fetch questions)
  Future<Quiz> startQuiz(String token, String quizId, String studentId) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/quizzes/$quizId/start?studentId=$studentId',
    );
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

  Future<Map<String, dynamic>> fetchUserById(
    String token,
    String userId,
  ) async {
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

  Future<Map<String, dynamic>> resetSpeakingSession(
    String token, {
    String level = 'N5',
  }) async {
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

  Future<Map<String, dynamic>> sendSpeakingText(
    String token,
    String text,
  ) async {
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

  // Submit quiz answers
  Future<AttemptDetailResponse> submitQuiz(
    String token,
    String quizId,
    List<int> answers,
    int timeSpent,
    String studentId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/quizzes/$quizId/submit',
    );
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

  Future<Map<String, dynamic>> sendSpeakingAudio(
    String token,
    String audioBase64,
  ) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/speaking/conversation');
    try {
      final bytes = base64Decode(audioBase64);
      final request = http.MultipartRequest('POST', url)
        ..headers['Authorization'] = 'Bearer $token'
        ..files.add(
          http.MultipartFile.fromBytes(
            'audio_file',
            bytes,
            filename: 'audio.wav',
          ),
        );
      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> translateSpeakingText(
    String token,
    String text,
  ) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/speaking/translate');
    try {
      final response = await _client.post(
        url,
        headers: _getHeaders(token: token),
        body: jsonEncode({'text': text}),
      );
      return _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }

  // Fetch student quiz history
  Future<List<QuizAttempt>> fetchStudentQuizHistory(
    String token,
    String studentId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/quizzes/history?studentId=$studentId',
    );
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
  Future<AttemptDetailResponse> fetchAttemptResult(
    String token,
    String attemptId,
    String studentId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/quizzes/attempt/$attemptId/result?studentId=$studentId',
    );
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

  // --- Notifications API ---

  Future<List<Map<String, dynamic>>> fetchNotifications(
    String token, {
    int page = 1,
    int limit = 20,
  }) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/notifications/my-notifications?page=$page&limit=$limit',
    );
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null &&
          decoded['data'] != null &&
          decoded['data']['notifications'] != null) {
        return List<Map<String, dynamic>>.from(
          decoded['data']['notifications'],
        );
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  Future<int> getUnreadNotificationCount(String token) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/notifications/unread-count',
    );
    try {
      final response = await _client.get(
        url,
        headers: _getHeaders(token: token),
      );
      final decoded = _processResponse(response);
      if (decoded != null &&
          decoded['data'] != null &&
          decoded['data']['count'] != null) {
        return decoded['data']['count'] as int;
      }
      return 0;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> markNotificationAsRead(
    String token,
    String notificationId,
  ) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/notifications/$notificationId/read',
    );
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

  Future<void> markAllNotificationsAsRead(String token) async {
    final Uri url = Uri.parse(
      '${ApiConfig.baseUrl}/api/notifications/mark-all-read',
    );
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
