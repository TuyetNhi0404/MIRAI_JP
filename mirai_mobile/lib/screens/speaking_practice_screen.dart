import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:path_provider/path_provider.dart';
import '../models/speaking_model.dart';
import '../providers/speaking_provider.dart';
import '../providers/auth_provider.dart';
import '../config/api_config.dart';
import '../config/design_tokens.dart';

class SpeakingPracticeScreen extends StatefulWidget {
  const SpeakingPracticeScreen({super.key});

  @override
  State<SpeakingPracticeScreen> createState() => _SpeakingPracticeScreenState();
}

class _SpeakingPracticeScreenState extends State<SpeakingPracticeScreen> with SingleTickerProviderStateMixin {
  final _scrollController = ScrollController();
  final _textController = TextEditingController();
  final _audioRecorder = AudioRecorder();
  final _audioPlayer = AudioPlayer();
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  bool _recording = false;
  String _selectedLevel = 'N5';
  static const _levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800))..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.08).animate(_pulseController);
    WidgetsBinding.instance.addPostFrameCallback((_) => _startSession());
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _scrollController.dispose();
    _textController.dispose();
    _audioRecorder.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _startSession() async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    final provider = context.read<SpeakingProvider>();
    if (provider.messages.isEmpty) {
      await provider.startSession(token, level: _selectedLevel);
      _scrollToBottom();
    }
  }

  Future<void> _changeLevel(String level) async {
    if (level == _selectedLevel) return;
    setState(() => _selectedLevel = level);
    final token = context.read<AuthProvider>().accessToken;
    if (token != null) {
      await context.read<SpeakingProvider>().clearMessages(token, level: level);
      await context.read<SpeakingProvider>().startSession(token, level: level);
      _scrollToBottom();
    }
  }

  Future<void> _sendText() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    _textController.clear();
    context.read<SpeakingProvider>().addUserMessage(text);
    final token = context.read<AuthProvider>().accessToken;
    if (token != null) {
      await context.read<SpeakingProvider>().sendText(token, text);
      _playLastAudio();
      _scrollToBottom();
    }
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      _pulseController.reverse();
      setState(() => _recording = false);
      try {
        final path = await _audioRecorder.stop().timeout(const Duration(seconds: 5));
        if (path == null) return;
        final file = File(path);
        if (!await file.exists()) return;
        final bytes = await file.readAsBytes();
        final b64 = base64Encode(bytes);
        final token = context.read<AuthProvider>().accessToken;
        if (token != null) {
          await context.read<SpeakingProvider>().sendAudio(token, b64);
          await _playLastAudio();
          _scrollToBottom();
        }
      } catch (e) {
        if (mounted) {
          context.read<SpeakingProvider>().addUserMessage('🎤 (lỗi ghi âm)');
          _showError('Lỗi xử lý âm than');
        }
      }
    } else {
      try {
        final has = await _audioRecorder.hasPermission().timeout(const Duration(seconds: 3));
        if (!has) {
          if (mounted) _showError('Chưa cấp quyền micro');
          return;
        }
        final dir = await getTemporaryDirectory();
        final path = '${dir.path}/mirai_recording.m4a';
        await _audioRecorder
            .start(const RecordConfig(encoder: AudioEncoder.aacLc), path: path)
            .timeout(const Duration(seconds: 5));
        if (mounted) {
          _pulseController.forward();
          setState(() => _recording = true);
        }
      } catch (e) {
        if (mounted) _showError('Micro không khả dụng trên thiết bị này');
      }
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg, style: const TextStyle(fontSize: 13, color: AppColors.white)),
      backgroundColor: AppColors.error,
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.only(bottom: 100, left: 16, right: 16),
      duration: const Duration(seconds: 3),
    ));
  }

  Future<void> _playLastAudio() async {
    final p = context.read<SpeakingProvider>();
    final audioUrl = p.lastAudioUrl;
    if (audioUrl == null || audioUrl.isEmpty) return;
    try {
      final base = ApiConfig.baseUrl;
      await _audioPlayer.play(UrlSource('$base$audioUrl'));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SpeakingProvider>();
    final isTablet = MediaQuery.of(context).size.width > 768;

    return Scaffold(
      backgroundColor: AppColors.surfaceMuted,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.ink),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Luyện nói', style: TextStyle(color: AppColors.ink, fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 10),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.full),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedLevel,
                isDense: true,
                style: const TextStyle(fontSize: 13, color: AppColors.ink, fontWeight: FontWeight.w600),
                items: _levels.map((l) => DropdownMenuItem(value: l, child: Text(l))).toList(),
                onChanged: (v) {
                  if (v != null) _changeLevel(v);
                },
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20, color: AppColors.textTertiary),
            tooltip: 'Xoá lịch sử',
            onPressed: () async {
              final token = context.read<AuthProvider>().accessToken;
              if (token != null) {
                await context.read<SpeakingProvider>().clearMessages(token, level: _selectedLevel);
              }
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 1),
        ),
      ),
      body: SafeArea(
        child: provider.isLoading && provider.messages.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : _buildChat(provider, isTablet),
      ),
    );
  }

  Widget _buildChat(SpeakingProvider provider, bool isTablet) {
    return Column(
      children: [
        if (provider.offline)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.wifi_off, size: 14, color: AppColors.warning),
                SizedBox(width: 6),
                Expanded(child: Text('Chế độ offline — backend chưa kết nối', style: TextStyle(fontSize: 11, color: AppColors.warning))),
              ],
            ),
          ),
        Expanded(
          child: provider.messages.isEmpty
              ? _buildEmptyChat()
              : ListView.builder(
                  controller: _scrollController,
                  padding: EdgeInsets.all(isTablet ? AppSpacing.xxl : AppSpacing.lg),
                  itemCount: provider.messages.length,
                  itemBuilder: (context, index) {
                    final msg = provider.messages[index];
                    return _buildMessageBubble(msg, isTablet);
                  },
                ),
        ),
        if (provider.isLoading)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.full)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)),
                      const SizedBox(width: 8),
                      Text('Mirai đang suy nghĩ', style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        Container(
          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.white,
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))],
          ),
          child: SafeArea(
            top: false,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Container(
                    constraints: const BoxConstraints(maxHeight: 100),
                    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(AppRadius.full)),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _textController,
                            textInputAction: TextInputAction.send,
                            minLines: 1,
                            maxLines: 4,
                            onSubmitted: (_) => _sendText(),
                            decoration: const InputDecoration(
                              hintText: 'Nhập tin nhắn...',
                              hintStyle: TextStyle(color: AppColors.disabled, fontSize: 14),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            ),
                            style: const TextStyle(fontSize: 14, color: AppColors.ink),
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.send, size: 18, color: _textController.text.isNotEmpty ? AppColors.primary : AppColors.disabled),
                          onPressed: _textController.text.isNotEmpty ? _sendText : null,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                AnimatedBuilder(
                    animation: _pulseAnimation,
                    builder: (context, child) => Transform.scale(
                      scale: _pulseAnimation.value,
                      child: child,
                    ),
                    child: GestureDetector(
                      onTap: _toggleRecording,
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: _recording ? AppColors.primary : AppColors.primary.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.25), blurRadius: 8, offset: const Offset(0, 2))],
                        ),
                        child: Icon(_recording ? Icons.stop : Icons.mic, color: AppColors.white, size: 20),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyChat() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(color: AppColors.primaryLight, shape: BoxShape.circle),
            child: const Icon(Icons.chat_bubble_outline, size: 40, color: AppColors.primary),
          ),
          const SizedBox(height: AppSpacing.lg),
          const Text('Bắt đầu cuộc trò chuyện', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.ink)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Nhấn nút mic để nói hoặc gõ tin nhắn bên dưới', style: TextStyle(fontSize: 13, color: AppColors.disabled)),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(SpeakingMessage msg, bool isTablet) {
    final isUser = msg.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * (isTablet ? 0.55 : 0.75)),
        decoration: BoxDecoration(
          color: isUser ? AppColors.primary : AppColors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(AppRadius.xxl),
            topRight: const Radius.circular(AppRadius.xxl),
            bottomLeft: isUser ? const Radius.circular(AppRadius.xxl) : const Radius.circular(4),
            bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(AppRadius.xxl),
          ),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(msg.text, style: TextStyle(color: isUser ? AppColors.white : AppColors.ink, fontSize: 14)),
            if (msg.japanese != null && msg.japanese!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(msg.japanese!, style: TextStyle(color: isUser ? AppColors.white.withValues(alpha: 0.8) : AppColors.textTertiary, fontSize: 12, fontStyle: FontStyle.italic)),
            ],
          ],
        ),
      ),
    );
  }
}
