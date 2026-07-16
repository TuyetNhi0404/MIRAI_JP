import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/calendar_model.dart';

class CalendarService {
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

  Future<List<CalendarModel>> getAllCalendars(String token) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/calendars');
    try {
      final response = await _client.get(url, headers: _getHeaders(token));
      final decoded = _processResponse(response);
      if (decoded != null && decoded['data'] != null) {
        return (decoded['data'] as List).map((c) => CalendarModel.fromJson(c)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  Future<List<CalendarModel>> getCalendarsByWeek(String token, String startDate, String endDate) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/calendars/week?startDate=$startDate&endDate=$endDate');
    try {
      final response = await _client.get(url, headers: _getHeaders(token));
      final decoded = _processResponse(response);
      if (decoded != null && decoded['data'] != null) {
        return (decoded['data'] as List).map((c) => CalendarModel.fromJson(c)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }
}
