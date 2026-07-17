import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import '../models/speaking_model.dart';
import '../services/api_service.dart';
import '../services/speaking_socket.dart';

class SpeakingProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final AudioPlayer _audioPlayer = AudioPlayer();
  SpeakingSocket? _socket;

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
      ensureSocket(token);
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
    if (!_offline) ensureSocket(token);
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
      final audioUrl = res['audio_url'] as String?;
      _lastAudioUrl = audioUrl;
      if (reply.isNotEmpty) {
        _messages.add(SpeakingMessage(
          id: 'coach-${DateTime.now().millisecondsSinceEpoch}',
          sender: 'coach',
          text: reply,
          audioUrl: audioUrl,
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

    // Show a temporary "transcribing" bubble while the server processes audio.
    final userId = 'user-${DateTime.now().millisecondsSinceEpoch}';
    _messages.add(SpeakingMessage(
      id: userId,
      sender: 'user',
      text: '',
      partial: true,
    ));
    notifyListeners();

    try {
      final res = await _apiService.sendSpeakingAudio(token, audioBase64);
      final transcript = res['transcript'] as String? ?? '';
      final reply = res['reply'] as String? ?? '';
      final audioUrl = res['audio_url'] as String?;
      _lastAudioUrl = audioUrl;
      _level = res['level'] as String? ?? _level;

      final idx = _messages.indexWhere((m) => m.id == userId);
      if (idx != -1) {
        if (transcript.isNotEmpty) {
          _messages[idx] = _messages[idx].copyWith(text: transcript, partial: false);
          _autoTranslate(token, _messages[idx]);
        } else {
          _messages.removeAt(idx);
        }
      }

      // If the server returned the reply inline (no WS client connected), show it.
      // Otherwise the reply will arrive later through the /ws push channel.
      if (reply.isNotEmpty) {
        _appendCoachReply(token, reply, audioUrl);
      }
    } catch (e) {
      final idx = _messages.indexWhere((m) => m.id == userId);
      if (idx != -1) _messages.removeAt(idx);
      _addMockReply();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _appendCoachReply(String token, String reply, String? audioUrl) {
    if (reply.isEmpty) return;
    _messages.add(SpeakingMessage(
      id: 'coach-${DateTime.now().millisecondsSinceEpoch}',
      sender: 'coach',
      text: reply,
      audioUrl: audioUrl,
    ));
    _autoTranslate(token, _messages.last);
    notifyListeners();
    // Let the UI handle playback so it reuses the screen's tested audio pipeline.
    if (audioUrl != null && audioUrl.isNotEmpty) {
      onCoachReply?.call(audioUrl);
    }
  }

  /// Called when a new coach reply (with audio) arrives, so the screen can
  /// auto-play it using its own (verified) audio pipeline.
  void Function(String audioUrl)? onCoachReply;

  void _handleWsMessage(Map<String, dynamic> message) {
    if (message['type'] != 'reply') return;
    final reply = (message['reply'] as String?) ?? '';
    final audioUrl = message['audio_url'] as String?;
    final token = _currentToken;
    if (token != null) _appendCoachReply(token, reply, audioUrl);
  }

  String? _currentToken;

  void ensureSocket(String token) {
    _currentToken = token;
    if (_socket != null) return;
    _socket = SpeakingSocket(
      token: token,
      onMessage: _handleWsMessage,
      onClose: () {
        // attempt a single reconnect on drop
        _socket = null;
        if (_currentToken != null && !_offline) {
          Future.delayed(const Duration(seconds: 2), () => ensureSocket(_currentToken!));
        }
      },
    );
    _socket!.connect();
  }

  void closeSocket() {
    _socket?.close();
    _socket = null;
  }

  @override
  void dispose() {
    _socket?.close();
    _socket = null;
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<String?> fetchTranslation(String token, String messageId, String text) async {
    final idx = _messages.indexWhere((m) => m.id == messageId);
    if (idx == -1) return null;
    final current = _messages[idx];
    if (current.translation != null && current.translation!.isNotEmpty) {
      return current.translation;
    }

    if (_offline) {
      const fallback = '(Chế độ offline — không thể dịch)';
      _messages[idx] = current.copyWith(translation: fallback);
      notifyListeners();
      return fallback;
    }

    try {
      final res = await _apiService.translateSpeakingText(token, text);
      final translation = (res['translation'] as String? ?? '').trim();
      if (translation.isNotEmpty) {
        _messages[idx] = current.copyWith(translation: translation);
        notifyListeners();
        return translation;
      }
    } catch (_) {
      // ignore — leave translation empty, UI will show nothing
    }
    return null;
  }

  // Auto-translate a message in the background (mirrors FE's prefetch behaviour
  // so the user's own Japanese is also shown with a Vietnamese translation).
  Future<void> _autoTranslate(String token, SpeakingMessage msg) async {
    final text = msg.text;
    if (text.isEmpty) return;
    if (!RegExp(r'[\u3040-\u30FF\u4E00-\u9FFF]').hasMatch(text)) return;
    if (_offline) {
      _translateInPlace(msg.id, '(Chế độ offline — không thể dịch)');
      return;
    }
    try {
      final res = await _apiService.translateSpeakingText(token, text);
      final translation = (res['translation'] as String? ?? '').trim();
      if (translation.isNotEmpty) {
        _translateInPlace(msg.id, translation);
      }
    } catch (_) {
      // ignore — translation is optional, user can tap to retry
    }
  }

  void _translateInPlace(String messageId, String translation) {
    final idx = _messages.indexWhere((m) => m.id == messageId);
    if (idx == -1) return;
    final current = _messages[idx];
    if (current.translation != null && current.translation!.isNotEmpty) return;
    _messages[idx] = current.copyWith(translation: translation);
    notifyListeners();
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
