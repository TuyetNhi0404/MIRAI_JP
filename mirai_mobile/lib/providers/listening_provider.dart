import 'package:flutter/material.dart';
import '../models/listening_content_model.dart';
import '../services/listening_service.dart';

class ListeningProvider extends ChangeNotifier {
  final ListeningService _listeningService = ListeningService();

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<ListeningContentModel> _contents = [];
  List<ListeningContentModel> get contents => _contents;

  String _selectedLevel = 'N5';
  String get selectedLevel => _selectedLevel;

  Future<void> loadContents(String token, {String? level}) async {
    if (level != null) {
      _selectedLevel = level;
    }
    
    _isLoading = true;
    notifyListeners();
    
    try {
      final response = await _listeningService.getAllContents(token, level: _selectedLevel);
      _contents = response['contents'] as List<ListeningContentModel>;
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<ListeningContentModel> loadContentDetail(String token, String id) async {
    _isLoading = true;
    notifyListeners();
    try {
      return await _listeningService.getContentById(token, id);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  void setLevel(String level) {
    _selectedLevel = level;
    notifyListeners();
  }
}
