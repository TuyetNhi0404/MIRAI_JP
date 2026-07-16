import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/listening_provider.dart';
import 'listening_detail_screen.dart';

class ListeningListScreen extends StatefulWidget {
  const ListeningListScreen({super.key});

  @override
  State<ListeningListScreen> createState() => _ListeningListScreenState();
}

class _ListeningListScreenState extends State<ListeningListScreen> {
  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);
  final List<String> _levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.accessToken != null) {
        Provider.of<ListeningProvider>(context, listen: false).loadContents(auth.accessToken!, level: 'N5');
      }
    });
  }

  void _onLevelSelected(String level) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.accessToken != null) {
      Provider.of<ListeningProvider>(context, listen: false).loadContents(auth.accessToken!, level: level);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _red),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'LUYỆN NGHE',
          style: TextStyle(
            color: _red,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: _red.withOpacity(0.12)),
        ),
      ),
      body: Consumer<ListeningProvider>(
        builder: (context, provider, child) {
          return Column(
            children: [
              // Level selection
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: _levels.map((level) {
                      final isSelected = provider.selectedLevel == level;
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: ChoiceChip(
                          label: Text(level, style: TextStyle(fontWeight: FontWeight.bold, color: isSelected ? Colors.white : Colors.black87)),
                          selected: isSelected,
                          selectedColor: _red,
                          backgroundColor: _redLight,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: isSelected ? _red : Colors.transparent)),
                          onSelected: (selected) {
                            if (selected && !provider.isLoading) {
                              _onLevelSelected(level);
                            }
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: provider.isLoading
                    ? const Center(child: CircularProgressIndicator(color: _red))
                    : provider.contents.isEmpty
                        ? Center(
                            child: Text(
                              'Không có bài nghe nào ở cấp độ ${provider.selectedLevel}.',
                              style: const TextStyle(fontSize: 16, color: Colors.black54),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                            itemCount: provider.contents.length,
                            itemBuilder: (context, index) {
                              final content = provider.contents[index];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.02),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(16),
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => ListeningDetailScreen(contentId: content.id),
                                        ),
                                      );
                                    },
                                    splashColor: _red.withOpacity(0.06),
                                    highlightColor: _redLight.withOpacity(0.5),
                                    child: Padding(
                                      padding: const EdgeInsets.all(16.0),
                                      child: Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: _redLight,
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: const Icon(Icons.headphones_rounded, color: _red),
                                          ),
                                          const SizedBox(width: 16),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  content.title,
                                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A)),
                                                  maxLines: 2,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  content.description ?? 'Bài luyện nghe ${content.level}',
                                                  style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 13),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ],
                                            ),
                                          ),
                                          Icon(Icons.chevron_right_rounded, color: _red.withOpacity(0.4), size: 20),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ],
          );
        },
      ),
    );
  }
}
