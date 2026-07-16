import 'dart:async';
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
  final VoidCallback? onBack;

  const SpeakingPracticeScreen({super.key, this.onBack});

  @override
  State<SpeakingPracticeScreen> createState() => _SpeakingPracticeScreenState();
}

class _SpeakingPracticeScreenState extends State<SpeakingPracticeScreen>
    with TickerProviderStateMixin {
  final _scrollController = ScrollController();
  final _audioRecorder = AudioRecorder();
  final _audioPlayer = AudioPlayer();

  late AnimationController _micController;
  late Animation<double> _micScale;
  late Animation<double> _micGlow;
  late AnimationController _waveController;

  bool _recording = false;
  bool _holding = false;
  String _selectedLevel = 'N5';
  static const _levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

  static const Duration _holdThreshold = Duration(milliseconds: 220);
  Timer? _holdTimer;

  @override
  void initState() {
    super.initState();
    _micController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);

    _micScale = Tween<double>(begin: 1.0, end: 1.18).animate(
      CurvedAnimation(parent: _micController, curve: Curves.easeOut),
    );
    _micGlow = Tween<double>(begin: 0.18, end: 0.42).animate(
      CurvedAnimation(parent: _micController, curve: Curves.easeInOut),
    );

    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _audioPlayer.onPlayerError.listen((error) {
      debugPrint('AudioPlayer error: $error');
      if (mounted) _showError('Lỗi phát âm thanh');
    });

    WidgetsBinding.instance.addPostFrameCallback((_) => _startSession());
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    _micController.dispose();
    _waveController.dispose();
    _scrollController.dispose();
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
    if (!mounted) return;
    final token = context.read<AuthProvider>().accessToken;
    if (token != null) {
      await context.read<SpeakingProvider>().clearMessages(token, level: level);
      if (!mounted) return;
      await context.read<SpeakingProvider>().startSession(token, level: level);
      _scrollToBottom();
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg, style: const TextStyle(fontSize: 13, color: AppColors.white)),
      backgroundColor: AppColors.error,
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.only(bottom: 120, left: 16, right: 16),
      duration: const Duration(seconds: 3),
    ));
  }

  Future<void> _playAudio(String audioUrl) async {
    if (audioUrl.isEmpty) return;
    try {
      final base = ApiConfig.baseUrl;
      await _audioPlayer.play(UrlSource('$base/api/speaking$audioUrl'));
    } catch (e) {
      debugPrint('Audio playback error: $e');
      _showError('Không thể phát âm thanh');
    }
  }

  Future<void> _stopAndSend() async {
    _micController.stop();
    setState(() => _recording = false);
    try {
      final path = await _audioRecorder.stop().timeout(const Duration(seconds: 5));
      if (path == null) return;
      final file = File(path);
      if (!await file.exists()) return;
      final bytes = await file.readAsBytes();
      final b64 = base64Encode(bytes);
      if (!mounted) return;
      final token = context.read<AuthProvider>().accessToken;
      if (token != null) {
        await context.read<SpeakingProvider>().sendAudio(token, b64);
        final p = context.read<SpeakingProvider>();
        if (p.lastAudioUrl != null && p.lastAudioUrl!.isNotEmpty) {
          await _playAudio(p.lastAudioUrl!);
        }
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        context.read<SpeakingProvider>().addUserMessage('🎤 (lỗi ghi âm)');
        _showError('Lỗi xử lý âm than');
      }
    }
  }

  Future<void> _beginHold() async {
    setState(() => _holding = true);
    _holdTimer = Timer(_holdThreshold, () async {
      try {
        final has = await _audioRecorder.hasPermission().timeout(const Duration(seconds: 3));
        if (!has) {
          if (mounted) _showError('Chưa cấp quyền micro');
          setState(() => _holding = false);
          return;
        }
        final dir = await getTemporaryDirectory();
        final path = '${dir.path}/mirai_recording.m4a';
        await _audioRecorder
            .start(const RecordConfig(encoder: AudioEncoder.aacLc), path: path)
            .timeout(const Duration(seconds: 5));
        if (mounted) {
          _micController.repeat(reverse: true);
          setState(() => _recording = true);
        }
      } catch (e) {
        if (mounted) _showError('Micro không khả dụng trên thiết bị này');
        setState(() => _holding = false);
      }
    });
  }

  Future<void> _cancelHold() async {
    _holdTimer?.cancel();
    if (_recording) {
      try {
        await _audioRecorder.stop().timeout(const Duration(seconds: 3));
      } catch (_) {}
    }
    _micController.stop();
    if (mounted) {
      setState(() {
        _holding = false;
        _recording = false;
      });
    }
  }

  void _onMicTapDown() => _beginHold();
  void _onMicTapUp() {
    _holdTimer?.cancel();
    if (_recording) {
      _stopAndSend();
    } else {
      if (mounted) setState(() => _holding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SpeakingProvider>();
    final isTablet = MediaQuery.of(context).size.width > 768;

    return Scaffold(
      backgroundColor: AppColors.surfaceMuted,
      appBar: AppBar(
        backgroundColor: Colors.white.withValues(alpha: 0.85),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.arrow_back_ios_rounded, size: 16, color: AppColors.ink),
          ),
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          },
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, Color(0xFFE53935)],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.smart_toy_rounded, size: 16, color: Colors.white),
            ),
            const SizedBox(width: 8),
            const Text(
              'Luyện nói',
              style: TextStyle(
                color: AppColors.ink,
                fontSize: 17,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
        actions: [
          _LevelChip(
            level: _selectedLevel,
            levels: _levels,
            onChanged: _changeLevel,
          ),
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.refresh_rounded, size: 16, color: AppColors.textTertiary),
            ),
            tooltip: 'Xoá lịch sử',
            onPressed: () async {
              final token = context.read<AuthProvider>().accessToken;
              if (token != null) {
                await context.read<SpeakingProvider>().clearMessages(token, level: _selectedLevel);
              }
            },
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 0.5),
        ),
      ),
      body: Column(
        children: [
          if (provider.offline)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: AppColors.warning.withValues(alpha: 0.1),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(Icons.wifi_off_rounded, size: 14, color: AppColors.warning),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Chế độ offline — backend chưa kết nối',
                      style: TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: provider.isLoading && provider.messages.isEmpty
                ? const _LoadingState()
                : provider.messages.isEmpty
                    ? _buildEmptyChat()
                    : _buildChat(provider, isTablet),
          ),
          if (provider.isLoading && provider.messages.isNotEmpty)
            const _TypingIndicator(),
          _buildMicBar(provider),
        ],
      ),
    );
  }

  Widget _buildChat(SpeakingProvider provider, bool isTablet) {
    return ListView.builder(
      controller: _scrollController,
      padding: EdgeInsets.fromLTRB(
        isTablet ? 24 : 16,
        isTablet ? 24 : 12,
        isTablet ? 24 : 16,
        isTablet ? 24 : 12,
      ),
      itemCount: provider.messages.length,
      itemBuilder: (context, index) {
        final msg = provider.messages[index];
        return _MessageBubble(
          key: ValueKey(msg.id),
          msg: msg,
          isTablet: isTablet,
          index: index,
          onTranslate: (messageId, text) async {
            final token = context.read<AuthProvider>().accessToken;
            if (token != null) {
              await provider.fetchTranslation(token, messageId, text);
            }
          },
          onReplay: (audioUrl) => _playAudio(audioUrl),
        );
      },
    );
  }

  Widget _buildEmptyChat() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 800),
              curve: Curves.easeOutBack,
              builder: (context, value, child) {
                return Transform.scale(
                  scale: value,
                  child: child,
                );
              },
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primaryLight, Color(0xFFFFE0E0)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      blurRadius: 24,
                      spreadRadius: 4,
                    ),
                  ],
                ),
                child: const Icon(Icons.chat_bubble_outline_rounded, size: 44, color: AppColors.primary),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Bắt đầu cuộc trò chuyện',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Giữ nút mic để nói chuyện với Mirai AI.\nNhấn vào tin nhắn để xem bản dịch.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textTertiary,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMicBar(SpeakingProvider provider) {
    final hint = _recording
        ? 'Đang ghi âm… thả ra để gửi'
        : _holding
            ? 'Giữ để ghi âm'
            : 'Giữ để nói';

    return Container(
      padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.of(context).padding.bottom + 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        border: Border(top: BorderSide(color: AppColors.border, width: 0.5)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(
                position: Tween<Offset>(begin: const Offset(0, 0.2), end: Offset.zero).animate(anim),
                child: child,
              ),
            ),
            child: Container(
              key: ValueKey(hint),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: _recording ? AppColors.primary.withValues(alpha: 0.08) : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                hint,
                style: TextStyle(
                  fontSize: 12,
                  color: _recording ? AppColors.primary : AppColors.textTertiary,
                  fontWeight: _recording ? FontWeight.w600 : FontWeight.w400,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          GestureDetector(
            onTapDown: (_) => _onMicTapDown(),
            onTapUp: (_) => _onMicTapUp(),
            onTapCancel: () => _cancelHold(),
            child: AnimatedBuilder(
              animation: _micController,
              builder: (context, child) {
                final active = _recording || _holding;
                return Stack(
                  alignment: Alignment.center,
                  children: [
                    if (_recording)
                      ...List.generate(3, (i) {
                        return AnimatedBuilder(
                          animation: _waveController,
                          builder: (context, _) {
                            final wavePhase = (i - 1) * 0.3;
                            final t = (_waveController.value + wavePhase) % 1.0;
                            final radius = 38.0 + t * 28;
                            final opacity = (1.0 - t) * 0.25;
                            return Container(
                              width: radius * 2,
                              height: radius * 2,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.primary.withValues(alpha: opacity),
                              ),
                            );
                          },
                        );
                      }),
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: _recording
                              ? [AppColors.primary, const Color(0xFFE53935)]
                              : [AppColors.primary.withValues(alpha: 0.92), AppColors.primary],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: active ? _micGlow.value : 0.2),
                            blurRadius: active ? 24 : 10,
                            spreadRadius: active ? 6 : 0,
                            offset: Offset(0, active ? 4 : 2),
                          ),
                        ],
                      ),
                      child: Transform.scale(
                        scale: active ? _micScale.value : 1.0,
                        child: Icon(
                          _recording ? Icons.stop_rounded : Icons.mic_rounded,
                          color: Colors.white,
                          size: 30,
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _LevelChip extends StatelessWidget {
  final String level;
  final List<String> levels;
  final ValueChanged<String> onChanged;

  const _LevelChip({
    required this.level,
    required this.levels,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: Icon(Icons.speed_rounded, size: 14, color: AppColors.textTertiary),
          ),
          const SizedBox(width: 4),
          DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: level,
              isDense: true,
              dropdownColor: Colors.white,
              borderRadius: BorderRadius.circular(14),
              elevation: 4,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.ink,
                fontWeight: FontWeight.w600,
              ),
              items: levels.map((l) {
                return DropdownMenuItem(
                  value: l,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Text(l),
                  ),
                );
              }).toList(),
              onChanged: (v) {
                if (v != null) onChanged(v);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingState extends StatefulWidget {
  const _LoadingState();

  @override
  State<_LoadingState> createState() => _LoadingStateState();
}

class _LoadingStateState extends State<_LoadingState>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              return Transform.scale(
                scale: 1.0 + _pulseController.value * 0.08,
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [AppColors.primaryLight, Color(0xFFFFE0E0)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.1 + _pulseController.value * 0.1),
                        blurRadius: 20 + _pulseController.value * 10,
                        spreadRadius: 2 + _pulseController.value * 4,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.smart_toy_rounded, size: 36, color: AppColors.primary),
                ),
              );
            },
          ),
          const SizedBox(height: 20),
          const Text(
            'Đang kết nối với Mirai AI…',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: AppColors.primary.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.smart_toy_rounded, size: 16, color: AppColors.primary),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) {
                return AnimatedBuilder(
                  animation: _animController,
                  builder: (context, child) {
                    final offset = i * 0.2;
                    final t = (_animController.value + offset) % 1.0;
                    final height = 4.0 + t * 6;
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Container(
                        width: 6,
                        height: height,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.3 + t * 0.4),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    );
                  },
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatefulWidget {
  final SpeakingMessage msg;
  final bool isTablet;
  final int index;
  final Future<void> Function(String messageId, String text) onTranslate;
  final Future<void> Function(String audioUrl) onReplay;

  const _MessageBubble({
    super.key,
    required this.msg,
    required this.isTablet,
    required this.index,
    required this.onTranslate,
    required this.onReplay,
  });

  @override
  State<_MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<_MessageBubble>
    with SingleTickerProviderStateMixin {
  bool _showTranslation = false;
  bool _translating = false;
  late AnimationController _entryController;
  late Animation<double> _entryAnimation;

  @override
  void initState() {
    super.initState();
    _entryController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 300 + (widget.index % 5) * 50),
    );
    _entryAnimation = CurvedAnimation(
      parent: _entryController,
      curve: Curves.easeOutQuart,
    );
    _entryController.forward();
  }

  @override
  void dispose() {
    _entryController.dispose();
    super.dispose();
  }

  Future<void> _toggleTranslation() async {
    if (widget.msg.translation != null && widget.msg.translation!.isNotEmpty) {
      setState(() => _showTranslation = !_showTranslation);
      return;
    }
    if (_translating) return;
    setState(() => _translating = true);
    await widget.onTranslate(widget.msg.id, widget.msg.text);
    if (mounted) {
      setState(() {
        _translating = false;
        _showTranslation = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final msg = widget.msg;
    final isUser = msg.isUser;

    return FadeTransition(
      opacity: _entryAnimation,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: Offset(isUser ? 0.2 : -0.2, 0),
          end: Offset.zero,
        ).animate(_entryAnimation),
        child: _buildBubble(msg, isUser),
      ),
    );
  }

  Widget _buildBubble(SpeakingMessage msg, bool isUser) {
    final showTranslate = msg.isCoach && !_translating && _showTranslation && msg.translation != null && msg.translation!.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, Color(0xFFE53935)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(Icons.smart_toy_rounded, size: 16, color: Colors.white),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: msg.isCoach ? _toggleTranslation : null,
                  onLongPress: msg.isCoach ? _toggleTranslation : null,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isUser ? AppColors.primary : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: isUser ? const Radius.circular(16) : const Radius.circular(4),
                        bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(16),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (isUser ? AppColors.primary : Colors.black).withValues(alpha: isUser ? 0.15 : 0.04),
                          blurRadius: isUser ? 8 : 4,
                          offset: Offset(0, isUser ? 4 : 2),
                        ),
                      ],
                      border: msg.isCoach && _showTranslation
                          ? Border.all(color: AppColors.primary.withValues(alpha: 0.3), width: 1.5)
                          : null,
                    ),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * (widget.isTablet ? 0.55 : 0.75),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          msg.text,
                          style: TextStyle(
                            color: isUser ? Colors.white : AppColors.ink,
                            fontSize: 14,
                            height: 1.4,
                          ),
                        ),
                        if (msg.japanese != null && msg.japanese!.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isUser ? Colors.white.withValues(alpha: 0.12) : AppColors.surface,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              msg.japanese!,
                              style: TextStyle(
                                color: isUser ? Colors.white.withValues(alpha: 0.85) : AppColors.textTertiary,
                                fontSize: 12,
                                fontStyle: FontStyle.italic,
                                height: 1.3,
                              ),
                            ),
                          ),
                        ],
                        if (_translating) ...[
                          const SizedBox(height: 8),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: isUser ? Colors.white.withValues(alpha: 0.8) : AppColors.primary,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Đang dịch…',
                                style: TextStyle(
                                  color: isUser ? Colors.white.withValues(alpha: 0.7) : AppColors.textTertiary,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                if (showTranslate)
                  AnimatedSize(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOut,
                    child: Container(
                      margin: const EdgeInsets.only(top: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Icon(Icons.translate_rounded, size: 12, color: AppColors.primary),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              msg.translation!,
                              style: const TextStyle(
                                color: AppColors.ink,
                                fontSize: 13,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (msg.isCoach && msg.audioUrl != null && msg.audioUrl!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: SizedBox(
                      height: 28,
                      child: TextButton.icon(
                        onPressed: () => widget.onReplay(msg.audioUrl!),
                        icon: const Icon(Icons.volume_up_rounded, size: 14, color: AppColors.primary),
                        label: const Text(
                          'Nghe lại',
                          style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w500),
                        ),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          backgroundColor: AppColors.primaryLight,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.person_rounded, size: 18, color: AppColors.textTertiary),
            ),
          ],
        ],
      ),
    );
  }
}
