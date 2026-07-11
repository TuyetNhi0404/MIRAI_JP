import 'package:flutter/material.dart';
import '../models/speaking_model.dart';
import '../services/api_service.dart';

class SpeakingProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  bool _enabled = false;
  List<SpeakingMessage> _messages = [];
  bool _isLoading = false;
  bool _isRecording = false;
  String? _error;
  bool _serviceUnavailable = false;
  bool _offline = false;
  String _level = 'N5';
  String? _lastAudioUrl;

  bool get enabled => _enabled;
  List<SpeakingMessage> get messages => _messages;
  bool get isLoading => _isLoading;
  bool get isRecording => _isRecording;
  String? get error => _error;
  bool get serviceUnavailable => _serviceUnavailable;
  bool get offline => _offline;
  String get level => _level;
  String? get lastAudioUrl => _lastAudioUrl;

  static const _mockReplies = [
    'そうですね。いい天気ですね。',
    'はい、わかりました。続けてください。',
    'なるほど。それでどう思いますか？',
    'いい質問ですね。考えてみましょう。',
    'その通りです。もっと話してみてください。',
    'はい、よくできました！',
    'ちょっと難しいですね。でも大丈夫です。',
    '素晴らしい！もう一度お願いします。',
  ];

  int _mockIndex = 0;

  Future<void> startSession(String token, {String level = 'N5'}) async {
    _isLoading = true;
    _error = null;
    _serviceUnavailable = false;
    _offline = false;
    _messages = [];
    _level = level;
    notifyListeners();

    try {
      final res = await _apiService.resetSpeakingSession(token, level: level);
      _level = res['level'] as String? ?? level;
      _enabled = true;
      _messages = [
        SpeakingMessage(id: 'welcome', sender: 'coach', text: 'こんにちは！準備はいいですか？始めましょう！'),
      ];
    } catch (e) {
      _offline = true;
      _enabled = true;
      _messages = [
        SpeakingMessage(id: 'welcome', sender: 'coach', text: 'こんにちは！準備はいいですか？始めましょう！\n\n(Chế độ offline — phản hồi tự động)'),
      ];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> clearMessages(String token, {String level = 'N5'}) async {
    _messages.clear();
    _error = null;
    _mockIndex = 0;
    _offline = false;
    _lastAudioUrl = null;
    _level = level;
    notifyListeners();

    try {
      await _apiService.resetSpeakingSession(token, level: level);
    } catch (_) {
      _offline = true;
    }
    _messages = [
      SpeakingMessage(id: 'welcome', sender: 'coach', text: 'こんにちは！準備はいいですか？始めましょう！'),
    ];
    notifyListeners();
  }

  void setRecording(bool recording) {
    _isRecording = recording;
    notifyListeners();
  }

  void addUserMessage(String text) {
    _messages.add(SpeakingMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: 'user',
      text: text,
    ));
    notifyListeners();
  }

  Future<void> sendText(String token, String text) async {
    if (_offline) {
      _addMockReply();
      return;
    }
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _apiService.sendSpeakingText(token, text);
      final reply = res['reply'] as String? ?? '';
      _lastAudioUrl = res['audio_url'] as String?;
      if (reply.isNotEmpty) {
        _messages.add(SpeakingMessage(
          id: 'coach-${DateTime.now().millisecondsSinceEpoch}',
          sender: 'coach',
          text: reply,
        ));
      }
      _level = res['level'] as String? ?? _level;
    } catch (e) {
      _addMockReply();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> sendAudio(String token, String audioBase64) async {
    if (_offline) {
      _addMockReply();
      return;
    }
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _apiService.sendSpeakingAudio(token, audioBase64);
      final transcript = res['transcript'] as String? ?? '';
      final reply = res['reply'] as String? ?? '';
      _lastAudioUrl = res['audio_url'] as String?;
      if (transcript.isNotEmpty) {
        _messages.add(SpeakingMessage(
          id: 'user-${DateTime.now().millisecondsSinceEpoch}',
          sender: 'user',
          text: transcript,
        ));
      }
      if (reply.isNotEmpty) {
        _messages.add(SpeakingMessage(
          id: 'coach-${DateTime.now().millisecondsSinceEpoch}',
          sender: 'coach',
          text: reply,
        ));
      }
      _level = res['level'] as String? ?? _level;
    } catch (e) {
      _addMockReply();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _addMockReply() {
    final reply = _mockReplies[_mockIndex % _mockReplies.length];
    _mockIndex++;
    _messages.add(SpeakingMessage(
      id: 'coach-${DateTime.now().millisecondsSinceEpoch}',
      sender: 'coach',
      text: reply,
    ));
    notifyListeners();
  }
}
