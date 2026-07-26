// lib/screens/kana_practice_screen.dart
// Port of FE/src/pages/Student/KanaPracticePage.tsx

import 'dart:ui';
import 'package:flutter/material.dart';
import '../data/kana_data.dart';
import '../data/kana_strokes_data.dart';
import '../utils/stroke_matching.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN – character grid + type selector
// ═══════════════════════════════════════════════════════════════════════════════

class KanaPracticeScreen extends StatefulWidget {
  const KanaPracticeScreen({super.key});

  @override
  State<KanaPracticeScreen> createState() => _KanaPracticeScreenState();
}

class _KanaPracticeScreenState extends State<KanaPracticeScreen> {
  KanaType _kanaType = KanaType.hiragana;

  void _onTypeChanged(KanaType type) {
    setState(() => _kanaType = type);
  }

  @override
  Widget build(BuildContext context) {
    final chars = getKanaData(_kanaType);

    // Group characters
    final Map<String, List<KanaChar>> grouped = {};
    for (final c in chars) {
      grouped.putIfAbsent(c.group, () => []).add(c);
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Color(0xFFB90000)),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: Color(0xFFEEEEEE)),
        ),
        title: const Column(
          children: [
            Text(
              'Luyện viết bảng chữ cái',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: Color(0xFF023665),
                letterSpacing: 0.5,
              ),
            ),
            Text(
              'Hiragana & Katakana',
              style: TextStyle(fontSize: 11, color: Colors.black38),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // ── Type selector ──────────────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
            child: _KanaTypeSelector(
              selected: _kanaType,
              onChanged: _onTypeChanged,
            ),
          ),

          // ── Stats bar ─────────────────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Row(
              children: [
                Container(
                  width: 4,
                  height: 18,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFB90000), Color(0xFFE53935)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Bảng ${_kanaType == KanaType.hiragana ? "Hiragana" : "Katakana"}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1A1A1A),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEDED),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${chars.length} ký tự',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFFB90000),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFEEEEEE)),

          // ── Scrollable grid ───────────────────────────────────────────────
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final groupKey in groupOrder)
                    if ((grouped[groupKey] ?? []).isNotEmpty)
                      _KanaGroupSection(
                        groupKey: groupKey,
                        chars: grouped[groupKey]!,
                        kanaType: _kanaType,
                      ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

class _KanaTypeSelector extends StatelessWidget {
  final KanaType selected;
  final ValueChanged<KanaType> onChanged;

  const _KanaTypeSelector({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEDED),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFEECCCC)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: KanaType.values.map((type) {
          final isActive = selected == type;
          return GestureDetector(
            onTap: () => onChanged(type),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFFB90000) : Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                boxShadow: isActive
                    ? [
                        BoxShadow(
                          color: const Color(0xFFB90000).withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        )
                      ]
                    : [],
              ),
              child: Row(
                children: [
                  Text(
                    type == KanaType.hiragana ? 'あ' : 'ア',
                    style: TextStyle(
                      fontSize: 18,
                      color: isActive ? Colors.white : const Color(0xFFB90000),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    type == KanaType.hiragana ? 'Hiragana' : 'Katakana',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: isActive ? Colors.white : const Color(0xFF888888),
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP SECTION
// ═══════════════════════════════════════════════════════════════════════════════

class _KanaGroupSection extends StatelessWidget {
  final String groupKey;
  final List<KanaChar> chars;
  final KanaType kanaType;

  const _KanaGroupSection({
    required this.groupKey,
    required this.chars,
    required this.kanaType,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Group label
          Row(
            children: [
              Container(
                width: 5,
                height: 22,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFB90000), Color(0xFFE53935)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                (groupLabels[groupKey] ?? groupKey).toUpperCase(),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF1A1A2E),
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  height: 1,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFFEEEEEE), Colors.transparent],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Wrap grid
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: chars
                .map((char) => _KanaCard(
                      char: char,
                      kanaType: kanaType,
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// KANA CARD
// ═══════════════════════════════════════════════════════════════════════════════

class _KanaCard extends StatelessWidget {
  final KanaChar char;
  final KanaType kanaType;

  const _KanaCard({required this.char, required this.kanaType});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => KanaDetailScreen(char: char, kanaType: kanaType),
        ));
      },
      child: Container(
        width: 72,
        height: 80,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFEEEEEE)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              char.kana,
              style: const TextStyle(
                fontSize: 26,
                color: Color(0xFF1A1A2E),
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              char.romaji,
              style: const TextStyle(
                fontSize: 10,
                color: Color(0xFF888888),
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAIL SCREEN – stroke instructions + drawing canvas
// ═══════════════════════════════════════════════════════════════════════════════

class KanaDetailScreen extends StatelessWidget {
  final KanaChar char;
  final KanaType kanaType;

  const KanaDetailScreen({super.key, required this.char, required this.kanaType});

  @override
  Widget build(BuildContext context) {
    final instructions = strokeInstructions[char.kana] ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Color(0xFFB90000)),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: Color(0xFFEEEEEE)),
        ),
        title: Text(
          'Luyện viết: ${char.kana}',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Color(0xFF023665),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Character header ─────────────────────────────────────────────
            _CharacterHeader(char: char, kanaType: kanaType),
            const SizedBox(height: 16),

            // ── Stroke instructions ──────────────────────────────────────────
            if (instructions.isNotEmpty) ...[
              _StrokeInstructionsCard(instructions: instructions),
              const SizedBox(height: 16),
            ],

            // ── Drawing canvas ───────────────────────────────────────────────
            _WritingCanvasCard(char: char),
          ],
        ),
      ),
    );
  }
}

// ─── Character header card ────────────────────────────────────────────────────

class _CharacterHeader extends StatelessWidget {
  final KanaChar char;
  final KanaType kanaType;

  const _CharacterHeader({required this.char, required this.kanaType});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF5D0D0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFB90000).withValues(alpha: 0.07),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          // Kana tile
          Container(
            width: 82,
            height: 82,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFB90000), Color(0xFFE53935)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFB90000).withValues(alpha: 0.3),
                  blurRadius: 14,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Center(
              child: Text(
                char.kana,
                style: TextStyle(
                  fontSize: char.kana.length > 1 ? 28 : 40,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  char.romaji.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1A1A2E),
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    _Badge(
                      label: kanaType == KanaType.hiragana ? 'Hiragana' : 'Katakana',
                    ),
                    _Badge(label: '${char.strokes} nét viết'),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Nhấn để xem hướng dẫn nét bút bên dưới',
                  style: TextStyle(fontSize: 11, color: Colors.black38),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  const _Badge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFB90000).withValues(alpha: 0.25)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Color(0xFFB90000),
        ),
      ),
    );
  }
}

// ─── Stroke instructions card ─────────────────────────────────────────────────

class _StrokeInstructionsCard extends StatelessWidget {
  final List<String> instructions;
  const _StrokeInstructionsCard({required this.instructions});

  static const List<Color> _stepColors = [
    Color(0xFF4CAF50),
    Color(0xFF2196F3),
    Color(0xFFFF9800),
    Color(0xFF9C27B0),
    Color(0xFFE91E63),
    Color(0xFF00BCD4),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF0F0F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 18,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFB90000), Color(0xFFE53935)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Hướng dẫn nét bút',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF444444),
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...instructions.asMap().entries.map((entry) {
            final idx = entry.key;
            final inst = entry.value;
            final color = _stepColors[idx % _stepColors.length];
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '${idx + 1}',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Text(
                        inst,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF555555),
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ─── Writing canvas card ──────────────────────────────────────────────────────

class _WritingCanvasCard extends StatelessWidget {
  final KanaChar char;
  const _WritingCanvasCard({required this.char});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF0F0F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          Row(
            children: [
              Container(
                width: 4,
                height: 18,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFB90000), Color(0xFFE53935)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                '✏️  Luyện viết',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF444444),
                ),
              ),
              const Spacer(),
              const Text(
                'Dùng ngón tay để vẽ',
                style: TextStyle(fontSize: 11, color: Colors.black38),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Canvas
          _KanaWritingCanvas(guidanceChar: char.kana, expectedStrokes: char.strokes),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAWING CANVAS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

class _StrokeData {
  final List<Offset> points;
  final Color color;
  _StrokeData({required this.points, required this.color});
}

class _KanaWritingCanvas extends StatefulWidget {
  final String guidanceChar;
  final int expectedStrokes;

  const _KanaWritingCanvas({
    required this.guidanceChar,
    required this.expectedStrokes,
  });

  @override
  State<_KanaWritingCanvas> createState() => _KanaWritingCanvasState();
}

class _KanaWritingCanvasState extends State<_KanaWritingCanvas> {
  List<_StrokeData> _strokes = [];
  List<Offset> _currentPoints = [];
  bool _isDrawing = false;
  String? _feedbackMsg;
  bool _feedbackIsError = false;
  Size _canvasSize = const Size(300, 300);

  @override
  void didUpdateWidget(_KanaWritingCanvas oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.guidanceChar != widget.guidanceChar) {
      setState(() {
        _strokes = [];
        _currentPoints = [];
        _isDrawing = false;
        _feedbackMsg = null;
      });
    }
  }

  void _showFeedback(String msg, {bool isError = false}) {
    setState(() {
      _feedbackMsg = msg;
      _feedbackIsError = isError;
    });
    Future.delayed(const Duration(milliseconds: 2000), () {
      if (mounted) setState(() => _feedbackMsg = null);
    });
  }

  void _onPanStart(DragStartDetails details, Size canvasSize) {
    setState(() {
      _isDrawing = true;
      _currentPoints = [details.localPosition];
    });
  }

  void _onPanUpdate(DragUpdateDetails details) {
    setState(() {
      _currentPoints.add(details.localPosition);
    });
  }

  void _onPanEnd(DragEndDetails details) {
    if (!_isDrawing || _currentPoints.length < 2) {
      setState(() {
        _isDrawing = false;
        _currentPoints = [];
      });
      return;
    }

    final completedStroke = List<Offset>.from(_currentPoints);
    final completedCount = _strokes.where((s) => s.color == const Color(0xFF4CAF50)).length;

    final standardSVGStrokes = kanaStrokePaths[widget.guidanceChar] ?? [];

    if (standardSVGStrokes.isEmpty) {
      // Fallback
      if (completedCount >= widget.expectedStrokes) {
        _showFeedback('Bạn đã vẽ xong chữ này rồi! 🎉');
        setState(() {
          _isDrawing = false;
          _currentPoints = [];
        });
        return;
      }

      setState(() {
        _strokes.add(_StrokeData(
          points: completedStroke,
          color: const Color(0xFF4CAF50),
        ));
        _isDrawing = false;
        _currentPoints = [];
      });

      if (completedCount + 1 == widget.expectedStrokes) {
        _showFeedback('🎉 Tuyệt vời! Bạn đã vẽ đúng chữ.');
      }
      return;
    }

    if (completedCount >= standardSVGStrokes.length) {
      _showFeedback('Bạn đã vẽ xong chữ này rồi! 🎉');
      setState(() {
        _isDrawing = false;
        _currentPoints = [];
      });
      return;
    }

    final strokePathStr = standardSVGStrokes[completedCount];
    
    final matchResult = StrokeMatching.matchStroke(
      completedStroke,
      strokePathStr,
      _canvasSize.width,
      _canvasSize.height,
    );

    if (matchResult.isCorrect) {
      setState(() {
        _strokes.add(_StrokeData(
          points: completedStroke,
          color: const Color(0xFF4CAF50),
        ));
        _isDrawing = false;
        _currentPoints = [];
      });
      if (completedCount + 1 == standardSVGStrokes.length) {
        _showFeedback('🎉 Tuyệt vời! Bạn đã vẽ đúng chữ.');
      }
    } else {
      if (matchResult.isReversed) {
        _showFeedback('Sai chiều! Hãy vẽ lại đúng chiều.', isError: true);
      } else {
        _showFeedback('Nét chưa chuẩn hoặc sai thứ tự!', isError: true);
      }
      
      final tempStroke = _StrokeData(points: completedStroke, color: const Color(0xFFF44336));
      setState(() {
        _strokes.add(tempStroke);
        _isDrawing = false;
        _currentPoints = [];
      });
      
      Future.delayed(const Duration(milliseconds: 600), () {
        if (mounted) {
          setState(() {
            _strokes.remove(tempStroke);
          });
        }
      });
    }
  }

  void _clearCanvas() {
    setState(() {
      _strokes = [];
      _currentPoints = [];
      _isDrawing = false;
      _feedbackMsg = null;
    });
  }

  void _undoLastStroke() {
    if (_strokes.isEmpty) return;
    setState(() {
      _strokes.removeLast();
      _feedbackMsg = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final completedCount = _strokes.where((s) => s.color == const Color(0xFF4CAF50)).length;

    return Column(
      children: [
        // Canvas
        LayoutBuilder(
          builder: (ctx, constraints) {
            final size = constraints.maxWidth;
            
            // Post frame update to avoid setState during build if size changes
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && _canvasSize.width != size) {
                setState(() => _canvasSize = Size(size, size));
              }
            });

            return Center(
              child: Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFEEEEEE), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 20,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(19),
                  child: Stack(
                    children: [
                      // Background painter (guide lines + ghost char)
                      Listener(
                        onPointerDown: (e) => _onPanStart(DragStartDetails(localPosition: e.localPosition), Size(size, size)),
                        onPointerMove: (e) => _onPanUpdate(DragUpdateDetails(globalPosition: e.position, localPosition: e.localPosition)),
                        onPointerUp: (e) => _onPanEnd(DragEndDetails()),
                        onPointerCancel: (e) => _onPanEnd(DragEndDetails()),
                        behavior: HitTestBehavior.opaque,
                        child: CustomPaint(
                          painter: _KanaBackgroundPainter(
                            guidanceChar: widget.guidanceChar,
                          ),
                          foregroundPainter: _KanaStrokesPainter(
                            strokes: _strokes,
                            currentPoints: _currentPoints,
                            isDrawing: _isDrawing,
                          ),
                          size: Size(size, size),
                        ),
                      ),

                      // Feedback / hint overlay
                      if (_feedbackMsg != null)
                        Positioned(
                          bottom: 16,
                          left: 16,
                          right: 16,
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                              decoration: BoxDecoration(
                                color: _feedbackIsError
                                    ? const Color(0xDCDC2626)
                                    : const Color(0xDC10B981),
                                borderRadius: BorderRadius.circular(30),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.12),
                                    blurRadius: 10,
                                  ),
                                ],
                              ),
                              child: Text(
                                _feedbackMsg!,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        )
                      else if (_strokes.isEmpty && !_isDrawing)
                        Positioned(
                          bottom: 16,
                          left: 16,
                          right: 16,
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xCC1A1A2E),
                                borderRadius: BorderRadius.circular(30),
                              ),
                              child: const Text(
                                '✍️  Bắt đầu vẽ tại đây',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),

        const SizedBox(height: 18),

        // Action buttons
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _clearCanvas,
                icon: const Icon(Icons.delete_sweep_rounded, size: 18),
                label: const Text('Xóa hết'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF555555),
                  side: const BorderSide(color: Color(0xFFDDDDDD)),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _strokes.isEmpty ? null : _undoLastStroke,
                icon: const Icon(Icons.undo_rounded, size: 18),
                label: const Text('Hoàn tác'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFB90000),
                  disabledForegroundColor: const Color(0xFFCCCCCC),
                  side: BorderSide(
                    color: _strokes.isEmpty
                        ? const Color(0xFFEEEEEE)
                        : const Color(0xFFB90000).withValues(alpha: 0.5),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // Stroke counter
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Số nét đã vẽ: ',
              style: TextStyle(fontSize: 13, color: Color(0xFF888888)),
            ),
            Text(
              '$completedCount',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Color(0xFFB90000),
              ),
            ),
            Text(
              ' / ${widget.expectedStrokes}',
              style: const TextStyle(fontSize: 13, color: Color(0xFFAAAAAA)),
            ),
          ],
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM PAINTERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Paints the background: white fill, dashed cross-hair, ghost character
class _KanaBackgroundPainter extends CustomPainter {
  final String guidanceChar;
  _KanaBackgroundPainter({required this.guidanceChar});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // White background
    canvas.drawRect(
      Rect.fromLTWH(0, 0, w, h),
      Paint()..color = Colors.white,
    );

    // Dashed center lines
    _drawDashed(canvas, Offset(w / 2, 0), Offset(w / 2, h),
        const Color(0xFFB90000).withValues(alpha: 0.12));
    _drawDashed(canvas, Offset(0, h / 2), Offset(w, h / 2),
        const Color(0xFFB90000).withValues(alpha: 0.12));

    // Ghost character
    final textPainter = TextPainter(
      text: TextSpan(
        text: guidanceChar,
        style: TextStyle(
          fontSize: guidanceChar.length > 1 ? w * 0.42 : w * 0.60,
          color: const Color(0xFFB90000).withValues(alpha: 0.07),
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset((w - textPainter.width) / 2, (h - textPainter.height) / 2),
    );
  }

  void _drawDashed(Canvas canvas, Offset start, Offset end, Color color) {
    const dashLength = 8.0;
    const gapLength = 8.0;
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    final dx = end.dx - start.dx;
    final dy = end.dy - start.dy;
    final totalLen = (end - start).distance;
    final unitX = dx / totalLen;
    final unitY = dy / totalLen;

    double dist = 0;
    bool drawing = true;
    while (dist < totalLen) {
      final segLen = drawing ? dashLength : gapLength;
      final double nextDist = (dist + segLen).clamp(0.0, totalLen);
      if (drawing) {
        canvas.drawLine(
          Offset(start.dx + unitX * dist, start.dy + unitY * dist),
          Offset(start.dx + unitX * nextDist, start.dy + unitY * nextDist),
          paint,
        );
      }
      dist = nextDist;
      drawing = !drawing;
    }
  }

  @override
  bool shouldRepaint(_KanaBackgroundPainter old) =>
      old.guidanceChar != guidanceChar;
}

/// Paints completed strokes and the current in-progress stroke
class _KanaStrokesPainter extends CustomPainter {
  final List<_StrokeData> strokes;
  final List<Offset> currentPoints;
  final bool isDrawing;

  _KanaStrokesPainter({
    required this.strokes,
    required this.currentPoints,
    required this.isDrawing,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Draw completed strokes
    for (int i = 0; i < strokes.length; i++) {
      final stroke = strokes[i];
      if (stroke.points.length < 2) continue;

      final paint = Paint()
        ..color = stroke.color
        ..strokeWidth = 5.5
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;

      final path = Path()..moveTo(stroke.points.first.dx, stroke.points.first.dy);
      for (final pt in stroke.points.skip(1)) {
        path.lineTo(pt.dx, pt.dy);
      }
      canvas.drawPath(path, paint);

      // Starting circle with stroke number
      final startPt = stroke.points.first;
      canvas.drawCircle(startPt, 11, Paint()..color = stroke.color);
      final textPainter = TextPainter(
        text: TextSpan(
          text: '${i + 1}',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.w900,
          ),
        ),
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(startPt.dx - textPainter.width / 2, startPt.dy - textPainter.height / 2),
      );
    }

    // Draw current stroke (being drawn)
    if (isDrawing && currentPoints.length >= 2) {
      final paint = Paint()
        ..color = const Color(0xFFB90000)
        ..strokeWidth = 6
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;

      final path = Path()..moveTo(currentPoints.first.dx, currentPoints.first.dy);
      for (final pt in currentPoints.skip(1)) {
        path.lineTo(pt.dx, pt.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_KanaStrokesPainter old) =>
      old.strokes != strokes ||
      old.currentPoints != currentPoints ||
      old.isDrawing != isDrawing;
}
