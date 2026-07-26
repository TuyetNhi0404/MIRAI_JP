import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class VocabFlashcardView extends StatefulWidget {
  const VocabFlashcardView({super.key});

  @override
  State<VocabFlashcardView> createState() => _VocabFlashcardViewState();
}

class _VocabFlashcardViewState extends State<VocabFlashcardView>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  int _currentIndex = 0;
  bool _isFront = true;

  final FlutterTts _flutterTts = FlutterTts();

  List<Map<String, dynamic>> _flashcards = [];
  bool _isLoading = true;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    _initTts();
    _loadVocabularies();
  }

  void _initTts() async {
    await _flutterTts.setLanguage("ja-JP");
    await _flutterTts.setSpeechRate(0.4);
  }

  Future<void> _speak(String text) async {
    if (text.isNotEmpty) {
      await _flutterTts.speak(text);
    }
  }

  Future<void> _loadVocabularies() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.accessToken;
      // Mặc định lấy N5 trước, có thể truyền topic hoặc level sau
      final vocabularies = await ApiService().fetchVocabularies(token: token, level: 'N5');
      if (mounted) {
        setState(() {
          _flashcards = vocabularies;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _flipCard() {
    if (_controller.isAnimating) return;
    if (_isFront) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
    setState(() {
      _isFront = !_isFront;
    });
  }

  void _nextCard() {
    if (_currentIndex < _flashcards.length - 1) {
      if (!_isFront) {
        _controller.reverse();
        _isFront = true;
      }
      setState(() {
        _currentIndex++;
      });
    }
  }

  void _prevCard() {
    if (_currentIndex > 0) {
      if (!_isFront) {
        _controller.reverse();
        _isFront = true;
      }
      setState(() {
        _currentIndex--;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const SizedBox(
        height: 400,
        child: Center(child: CircularProgressIndicator(color: Color(0xFFB90000))),
      );
    }
    if (_errorMessage.isNotEmpty) {
      return SizedBox(
        height: 400,
        child: Center(
          child: Text('Lỗi tải từ vựng: $_errorMessage', style: const TextStyle(color: Colors.redAccent)),
        ),
      );
    }
    if (_flashcards.isEmpty) {
      return const SizedBox(
        height: 400,
        child: Center(
          child: Text('Chưa có từ vựng nào trong kho dữ liệu.', style: TextStyle(color: Colors.black54, fontSize: 16)),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Từ vựng N5',
              style: TextStyle(
                color: Color(0xFFB90000),
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFB90000).withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_currentIndex + 1} / ${_flashcards.length}',
                style: const TextStyle(
                  color: Color(0xFFFF8B8B),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),

        // Flip Card
        GestureDetector(
          onTap: _flipCard,
          child: AnimatedBuilder(
            animation: _animation,
            builder: (context, child) {
              final angle = _animation.value * pi;
              final transform = Matrix4.identity()
                ..setEntry(3, 2, 0.001) // perspective
                ..rotateY(angle);

              // If angle > pi/2, we are showing the back
              final isBackVisible = angle >= pi / 2;

              return Transform(
                transform: transform,
                alignment: Alignment.center,
                child: isBackVisible
                    ? Transform(
                        transform: Matrix4.identity()..rotateY(pi),
                        alignment: Alignment.center,
                        child: _buildCardBack(_flashcards[_currentIndex]),
                      )
                    : _buildCardFront(_flashcards[_currentIndex]),
              );
            },
          ),
        ),

        const SizedBox(height: 48),

        // Navigation Controls
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildNavButton(
              icon: Icons.arrow_back_rounded,
              label: 'Trở lại',
              onTap: _currentIndex > 0 ? _prevCard : null,
            ),
            const SizedBox(width: 12),
            _buildNavButton(
              icon: Icons.sync_rounded,
              label: 'Lật thẻ',
              onTap: _flipCard,
              isPrimary: true,
            ),
            const SizedBox(width: 12),
            _buildNavButton(
              icon: Icons.arrow_forward_rounded,
              label: 'Tiếp theo',
              onTap: _currentIndex < _flashcards.length - 1 ? _nextCard : null,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCardFront(Map<String, dynamic> card) {
    return Container(
      height: 350,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFFB90000).withOpacity(0.05),
            Colors.white,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFB90000).withOpacity(0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFB90000).withOpacity(0.1),
            blurRadius: 20,
            spreadRadius: 2,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  card['word'] ?? '',
                  style: const TextStyle(
                    fontSize: 64,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFB90000),
                    shadows: [
                      Shadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4)),
                    ],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Chạm để xem nghĩa',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            top: 16,
            right: 16,
            child: IconButton(
              icon: const Icon(Icons.volume_up_rounded, color: Color(0xFFB90000), size: 28),
              onPressed: () => _speak(card['word'] ?? ''),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardBack(Map<String, dynamic> card) {
    final hasExample = card['example'] != null && card['example'].toString().isNotEmpty;

    return Container(
      height: 350,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFB90000).withOpacity(0.2), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFB90000).withOpacity(0.1),
            blurRadius: 20,
            spreadRadius: 2,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  card['reading'] ?? '',
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A1A),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  card['topic'] ?? '',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFFB90000),
                    letterSpacing: 1.2,
                  ),
                  textAlign: TextAlign.center,
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Divider(color: Colors.black12),
                ),
                Text(
                  card['meaning'] ?? '',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFB90000),
                  ),
                  textAlign: TextAlign.center,
                ),
                if (hasExample) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFB90000).withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Text(
                          card['example'] ?? '',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF1A1A1A),
                            fontStyle: FontStyle.italic,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        if (card['exampleMeaning'] != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4.0),
                            child: Text(
                              card['exampleMeaning'],
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.black54,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                      ],
                    ),
                  ),
                ]
              ],
            ),
          ),
          Positioned(
            top: 16,
            right: 16,
            child: IconButton(
              icon: const Icon(Icons.volume_up_rounded, color: Color(0xFFB90000), size: 28),
              onPressed: () => _speak(card['word'] ?? card['reading'] ?? ''),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavButton({
    required IconData icon,
    required String label,
    required VoidCallback? onTap,
    bool isPrimary = false,
  }) {
    final bool disabled = onTap == null;
    
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.symmetric(
          horizontal: isPrimary ? 24 : 16,
          vertical: isPrimary ? 16 : 12,
        ),
        decoration: BoxDecoration(
          color: disabled
              ? Colors.grey.withOpacity(0.1)
              : isPrimary
                  ? const Color(0xFFB90000)
                  : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: isPrimary || disabled ? null : Border.all(color: const Color(0xFFB90000).withOpacity(0.3)),
          boxShadow: isPrimary && !disabled
              ? [
                  BoxShadow(
                    color: const Color(0xFFB90000).withOpacity(0.4),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  )
                ]
              : !isPrimary && !disabled
                ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  )
                ] : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!isPrimary && icon == Icons.arrow_back_rounded) ...[
              Icon(icon, color: disabled ? Colors.black26 : const Color(0xFFB90000), size: 20),
              const SizedBox(width: 8),
            ],
            Text(
              label,
              style: TextStyle(
                color: disabled ? Colors.black26 : (isPrimary ? Colors.white : const Color(0xFFB90000)),
                fontWeight: FontWeight.bold,
                fontSize: isPrimary ? 16 : 14,
              ),
            ),
            if (!isPrimary && icon == Icons.arrow_forward_rounded) ...[
              const SizedBox(width: 8),
              Icon(icon, color: disabled ? Colors.black26 : const Color(0xFFB90000), size: 20),
            ],
            if (isPrimary) ...[
              const SizedBox(width: 8),
              Icon(icon, color: Colors.white, size: 20),
            ],
          ],
        ),
      ),
    );
  }
}
