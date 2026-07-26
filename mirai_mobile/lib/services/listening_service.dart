import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/listening_content_model.dart';

class ListeningService {
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

  Future<Map<String, dynamic>> getAllContents(String token, {String? level, String? topic, int page = 1, int limit = 20}) async {
    String query = '?page=$page&limit=$limit';
    if (level != null && level.isNotEmpty) query += '&level=$level';
    if (topic != null && topic.isNotEmpty) query += '&topic=$topic';
    
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/listening/contents$query');
    try {
      final response = await _client.get(url, headers: _getHeaders(token));
      final decoded = _processResponse(response);
      
      List<ListeningContentModel> contents = [];
      if (decoded != null && decoded['contents'] != null) {
        contents = (decoded['contents'] as List).map((c) => ListeningContentModel.fromJson(c)).toList();
      }
      return {
        'contents': contents,
        'total': decoded['total'] ?? 0,
        'page': decoded['page'] ?? 1,
        'limit': decoded['limit'] ?? 20,
      };
    } catch (e) {
      rethrow;
    }
  }

  Future<ListeningContentModel> getContentById(String token, String id) async {
    final Uri url = Uri.parse('${ApiConfig.baseUrl}/api/listening/contents/$id');
    try {
      final response = await _client.get(url, headers: _getHeaders(token));
      final decoded = _processResponse(response);
      return ListeningContentModel.fromJson(decoded);
    } catch (e) {
      rethrow;
    }
  }
}
