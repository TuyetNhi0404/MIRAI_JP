import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/vocabulary_model.dart';

class OcrVocabScreen extends StatefulWidget {
  const OcrVocabScreen({super.key});

  @override
  State<OcrVocabScreen> createState() => _OcrVocabScreenState();
}

class _OcrVocabScreenState extends State<OcrVocabScreen> {
  final ApiService _apiService = ApiService();
  final ImagePicker _imagePicker = ImagePicker();
  final TextEditingController _searchController = TextEditingController();

  File? _imageFile;
  bool _isProcessingOcr = false;
  bool _isSearching = false;

  // Extracted texts from ML Kit
  List<String> _extractedWords = [];
  
  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);
  static const _redMid = Color(0xFFE53935);

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _captureOrPickImage(ImageSource source) async {
    try {
      final XFile? file = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (file == null) return;

      setState(() {
        _imageFile = File(file.path);
        _extractedWords = [];
        _isProcessingOcr = true;
      });

      // Start OCR
      await _runJapaneseOcr(file.path);
    } catch (e) {
      debugPrint('Error picking/capturing image: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi chọn hình ảnh: ${e.toString()}'), backgroundColor: _redMid),
      );
      setState(() => _isProcessingOcr = false);
    }
  }

  Future<void> _runJapaneseOcr(String path) async {
    final inputImage = InputImage.fromFilePath(path);
    // Explicitly configure Japanese recognition model
    final textRecognizer = TextRecognizer(script: TextRecognitionScript.japanese);

    try {
      final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);
      
      final List<String> words = [];
      
      // Extract unique texts from lines/words
      for (TextBlock block in recognizedText.blocks) {
        for (TextLine line in block.lines) {
          final trimmed = line.text.trim();
          if (trimmed.isNotEmpty) {
            // Clean up common noise and split by spaces if necessary
            if (trimmed.contains(' ')) {
              words.addAll(trimmed.split(' ').where((w) => w.trim().isNotEmpty));
            } else {
              words.add(trimmed);
            }
          }
        }
      }

      // De-duplicate lists
      final uniqueWords = words.toSet().toList();

      if (mounted) {
        setState(() {
          _extractedWords = uniqueWords;
        });
      }
    } catch (e) {
      debugPrint('ML Kit OCR error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nhận diện chữ Nhật thất bại. Bạn có thể tra cứu thủ công bằng ô tìm kiếm.'),
            backgroundColor: _redMid,
          ),
        );
      }
    } finally {
      await textRecognizer.close();
      if (mounted) {
        setState(() => _isProcessingOcr = false);
      }
    }
  }

  Future<void> _lookupWord(String word) async {
    if (word.trim().isEmpty) return;
    setState(() => _isSearching = true);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;

    try {
      final List<Map<String, dynamic>> results = await _apiService.searchVocabulary(
        token: token,
        keyword: word.trim(),
      );

      if (results.isEmpty) {
        if (mounted) {
          _showNotFoundDialog(word);
        }
      } else {
        final List<VocabularyModel> vocabs = results
            .map((r) => VocabularyModel.fromJson(r))
            .toList();
        
        if (mounted) {
          _showVocabularyDetailBottomSheet(vocabs.first);
        }
      }
    } catch (e) {
      debugPrint('Error looking up vocabulary: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tra cứu từ vựng: ${e.toString()}'), backgroundColor: _red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSearching = false);
      }
    }
  }

  void _showNotFoundDialog(String word) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 24),
            SizedBox(width: 10),
            Text('Không tìm thấy', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Không tìm thấy nghĩa của từ "$word" trong cơ sở dữ liệu học tập của MIRAI JP.',
          style: const TextStyle(height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Đóng', style: TextStyle(color: _red, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  void _showVocabularyDetailBottomSheet(VocabularyModel vocab) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Pull indicator
              Center(
                child: Container(
                  width: 48,
                  height: 4.5,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.black12,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),

              // Title Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          vocab.reading,
                          style: TextStyle(color: Colors.black.withOpacity(0.4), fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          vocab.word,
                          style: const TextStyle(
                            color: Color(0xFF1A1A1A),
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: _redLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      vocab.level,
                      style: const TextStyle(color: _red, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  )
                ],
              ),

              const Divider(color: Color(0xFFF2F2F2), height: 24),

              // Meaning
              const Text(
                'Ý NGHĨA:',
                style: TextStyle(color: Colors.black38, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.1),
              ),
              const SizedBox(height: 6),
              Text(
                vocab.meaning,
                style: const TextStyle(
                  color: Color(0xFF1A1A1A),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 20),

              // Topic
              const Text(
                'CHỦ ĐỀ:',
                style: TextStyle(color: Colors.black38, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.1),
              ),
              const SizedBox(height: 4),
              Text(
                vocab.topic,
                style: TextStyle(
                  color: Colors.black.withOpacity(0.7),
                  fontSize: 14,
                ),
              ),

              // Examples
              if (vocab.example != null && vocab.example!.isNotEmpty) ...[
                const SizedBox(height: 24),
                const Text(
                  'VÍ DỤ MINH HỌA:',
                  style: TextStyle(color: Colors.black38, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.1),
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F9FA),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFECEEF0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        vocab.example!,
                        style: const TextStyle(
                          color: Color(0xFF1A1A1A),
                          fontSize: 14.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (vocab.exampleMeaning != null && vocab.exampleMeaning!.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          vocab.exampleMeaning!,
                          style: TextStyle(
                            color: Colors.black.withOpacity(0.6),
                            fontSize: 12.5,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
              
              const SizedBox(height: 20),
            ],
          ),
        ),
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
          'QUÉT ẢNH TRA TỪ',
          style: TextStyle(
            color: _red,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ─── Search Bar (Manual Lookup Backup) ───────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F5F7),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: TextField(
                        controller: _searchController,
                        onSubmitted: _lookupWord,
                        decoration: const InputDecoration(
                          hintText: 'Nhập từ tiếng Nhật để tra cứu...',
                          prefixIcon: Icon(Icons.search_rounded, color: Colors.black38),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _isSearching ? null : () => _lookupWord(_searchController.text),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _red,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    child: _isSearching
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Tra từ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),

            // ─── Camera Input Card ───────────────────────────────────────────
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
                ],
              ),
              child: Column(
                children: [
                  if (_imageFile == null) ...[
                    Container(
                      height: 180,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8F9FA),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.black12, style: BorderStyle.none), // custom dashed later if needed
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.camera_alt_outlined, color: Colors.black26, size: 48),
                          const SizedBox(height: 12),
                          const Text(
                            'Chụp ảnh tài liệu tiếng Nhật để nhận diện',
                            style: TextStyle(color: Colors.black54, fontSize: 12.5, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    // Display Selected Photo
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.file(
                            _imageFile!,
                            height: 220,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          ),
                        ),
                        if (_isProcessingOcr)
                          Container(
                            height: 220,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: Colors.black38,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  CircularProgressIndicator(color: Colors.white),
                                  SizedBox(height: 14),
                                  Text(
                                    'Đang trích xuất chữ Nhật...',
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                  )
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                  
                  const SizedBox(height: 18),
                  
                  // Camera Actions
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _captureOrPickImage(ImageSource.gallery),
                          icon: const Icon(Icons.photo_library_rounded, color: _red, size: 18),
                          label: const Text('Thư viện', style: TextStyle(color: _red, fontWeight: FontWeight.bold, fontSize: 12.5)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: _red, width: 1.5),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _captureOrPickImage(ImageSource.camera),
                          icon: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 18),
                          label: const Text('Chụp ảnh', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _red,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ─── OCR Extracted Text Chips ────────────────────────────────────
            if (_imageFile != null && !_isProcessingOcr) ...[
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.all(20),
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'TỪ VỰNG PHÁT HIỆN ĐƯỢC (Bấm vào để dịch nghĩa):',
                      style: TextStyle(color: Colors.black45, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.1),
                    ),
                    const SizedBox(height: 12),
                    _extractedWords.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.symmetric(vertical: 10.0),
                            child: Text(
                              'Không nhận diện được từ tiếng Nhật nào. Hãy thử chụp góc thẳng hơn hoặc dùng ô tìm kiếm.',
                              style: TextStyle(color: Colors.black38, fontSize: 13),
                            ),
                          )
                        : Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _extractedWords.map((word) {
                              return ActionChip(
                                label: Text(word),
                                labelStyle: const TextStyle(fontWeight: FontWeight.bold, color: _red, fontSize: 13),
                                backgroundColor: _redLight,
                                side: BorderSide.none,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                onPressed: _isSearching ? null : () {
                                  _searchController.text = word;
                                  _lookupWord(word);
                                },
                              );
                            }).toList(),
                          ),
                  ],
                ),
              ),
            ],
            
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
