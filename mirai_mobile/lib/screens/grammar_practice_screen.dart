import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/grammar_card_model.dart';

class GrammarPracticeScreen extends StatefulWidget {
  const GrammarPracticeScreen({super.key});

  @override
  State<GrammarPracticeScreen> createState() => _GrammarPracticeScreenState();
}

class _GrammarPracticeScreenState extends State<GrammarPracticeScreen>
    with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  late TabController _tabController;
  
  bool _isLoading = false;
  List<GrammarCardModel> _allCards = [];
  Set<String> _masteredCardIds = {};

  // Currently expanded card ID
  String? _expandedCardId;

  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);
  static const _redMid = Color(0xFFE53935);

  final List<String> _levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _levels.length, vsync: this);
    _loadGrammarData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadGrammarData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;

    if (token == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      // 1. Fetch mastered state from local storage
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys();
      final mastered = keys
          .where((key) => key.startsWith('grammar_mastered_'))
          .where((key) => prefs.getBool(key) == true)
          .map((key) => key.replaceFirst('grammar_mastered_', ''))
          .toSet();

      // 2. Fetch cards from API
      final response = await _apiService.fetchStudentPracticeCards(token);
      final List<GrammarCardModel> cards = [];
      
      if (response['success'] == true && response['cards'] != null) {
        final list = response['cards'] as List? ?? [];
        for (var item in list) {
          final card = GrammarCardModel.fromJson(Map<String, dynamic>.from(item));
          card.isMastered = mastered.contains(card.id);
          cards.add(card);
        }
      }

      if (mounted) {
        setState(() {
          _allCards = cards;
          _masteredCardIds = mastered;
        });
      }
    } catch (e) {
      debugPrint('Error loading grammar cards: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tải dữ liệu ngữ pháp: ${e.toString()}'), backgroundColor: _red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _toggleMastered(GrammarCardModel card) async {
    final prefs = await SharedPreferences.getInstance();
    final key = 'grammar_mastered_${card.id}';
    final newState = !card.isMastered;

    await prefs.setBool(key, newState);
    
    setState(() {
      card.isMastered = newState;
      if (newState) {
        _masteredCardIds.add(card.id);
      } else {
        _masteredCardIds.remove(card.id);
      }
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(newState ? 'Đã đánh dấu thuộc bài!' : 'Đã bỏ đánh dấu thuộc bài.'),
          duration: const Duration(seconds: 1),
          backgroundColor: newState ? Colors.green : Colors.black87,
        ),
      );
    }
  }

  // Speak emulator helper
  void _playSpeech(String text) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.volume_up_rounded, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text('Đang phát âm: "$text"', style: const TextStyle(fontWeight: FontWeight.bold))),
          ],
        ),
        duration: const Duration(milliseconds: 1500),
        backgroundColor: _red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _red),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'LUYỆN NGỮ PHÁP',
          style: TextStyle(
            color: _red,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        centerTitle: true,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Column(
            children: [
              TabBar(
                controller: _tabController,
                labelColor: _red,
                unselectedLabelColor: Colors.black45,
                indicatorColor: _red,
                indicatorWeight: 3,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                tabs: _levels.map((level) => Tab(text: level)).toList(),
              ),
              Container(height: 1, color: Colors.black12),
            ],
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: _red))
          : TabBarView(
              controller: _tabController,
              children: _levels.map((level) {
                final filteredCards = _allCards.where((c) => c.level.toUpperCase() == level).toList();
                return _buildCardsList(filteredCards, level);
              }).toList(),
            ),
    );
  }

  Widget _buildCardsList(List<GrammarCardModel> cards, String level) {
    if (cards.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _redLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.menu_book_rounded, color: _red, size: 48),
            ),
            const SizedBox(height: 16),
            Text(
              'Chưa có cấu trúc ngữ pháp nào cho $level',
              style: const TextStyle(color: Colors.black54, fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Các bài học ngữ pháp mới sẽ được hệ thống thêm vào sau.',
              style: TextStyle(color: Colors.black.withOpacity(0.35), fontSize: 12),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: _red,
      onRefresh: _loadGrammarData,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        itemCount: cards.length,
        itemBuilder: (context, index) {
          final card = cards[index];
          final isExpanded = _expandedCardId == card.id;

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
              border: Border.all(
                color: card.isMastered ? Colors.green.withOpacity(0.2) : Colors.transparent,
                width: 1.5,
              ),
            ),
            child: Theme(
              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                key: PageStorageKey<String>(card.id),
                initiallyExpanded: isExpanded,
                onExpansionChanged: (expanded) {
                  setState(() {
                    _expandedCardId = expanded ? card.id : null;
                  });
                },
                leading: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: card.isMastered ? Colors.green.withOpacity(0.15) : _redLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    card.level,
                    style: TextStyle(
                      color: card.isMastered ? Colors.green : _red,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                title: Text(
                  card.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text(
                    card.meaningVi,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 13),
                  ),
                ),
                trailing: IconButton(
                  icon: Icon(
                    card.isMastered ? Icons.check_circle_rounded : Icons.check_circle_outline_rounded,
                    color: card.isMastered ? Colors.green : Colors.black26,
                  ),
                  onPressed: () => _toggleMastered(card),
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: 20, right: 20, bottom: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Divider(color: Color(0xFFF2F2F2), height: 16),
                        
                        // Structure
                        const Text(
                          'Cấu trúc cú pháp:',
                          style: TextStyle(color: Colors.black45, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF5F5F7),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            card.structure,
                            style: const TextStyle(
                              color: Color(0xFF1A1A1A),
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                        
                        const SizedBox(height: 16),

                        // Explanation
                        const Text(
                          'Giải thích chi tiết:',
                          style: TextStyle(color: Colors.black45, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          card.explanation,
                          style: const TextStyle(
                            color: Color(0xFF333333),
                            fontSize: 13.5,
                            height: 1.4,
                          ),
                        ),

                        if (card.examples.isNotEmpty) ...[
                          const SizedBox(height: 20),
                          const Text(
                            'Ví dụ minh họa:',
                            style: TextStyle(color: Colors.black45, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          ...card.examples.map((example) => _buildExampleTile(example)),
                        ],
                      ],
                    ),
                  )
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildExampleTile(GrammarExample example) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF0F0F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            icon: const Icon(Icons.volume_up_rounded, color: _red, size: 18),
            onPressed: () => _playSpeech(example.jp),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Japanese sentence
                Text(
                  example.jp,
                  style: const TextStyle(
                    color: Color(0xFF1A1A1A),
                    fontSize: 14.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                // Romaji if present
                if (example.romaji != null && example.romaji!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    example.romaji!,
                    style: TextStyle(
                      color: Colors.black.withOpacity(0.4),
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                // Vietnamese translation
                Text(
                  example.vi,
                  style: TextStyle(
                    color: Colors.black.withOpacity(0.65),
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
