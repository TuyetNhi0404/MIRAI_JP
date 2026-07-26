import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/attendance_model.dart';

class AttendanceService {
  final http.Client _client = http.Client();

  Map<String, String> _getHeaders(String token) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  dynamic _processResponse(http.Response response) {
    final Map<String, dynamic> data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else {
      throw Exception(data['message'] ?? 'An error occurred. Status: ${response.statusCode}');
    }
  }

  Future<List<AttendanceRecord>> getStudentsForCalendar(String token, String calendarId) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/attendances/$calendarId/students');
    try {
      final response = await _client.get(url, headers: _getHeaders(token));
      final decoded = _processResponse(response);
      if (decoded != null && decoded['students'] != null) {
        return (decoded['students'] as List).map((a) => AttendanceRecord.fromJson(a)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateAttendanceStatus(String token, String calendarId, String userId, String status) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/attendances/calendar/$calendarId/user/$userId');
    try {
      final response = await _client.put(
        url,
        headers: _getHeaders(token),
        body: jsonEncode({'status': status}),
      );
      _processResponse(response);
    } catch (e) {
      rethrow;
    }
  }
}
