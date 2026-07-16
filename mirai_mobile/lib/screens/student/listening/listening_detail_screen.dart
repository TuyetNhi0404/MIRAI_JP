import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:provider/provider.dart';
import '../../../models/listening_content_model.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/listening_provider.dart';

class ListeningDetailScreen extends StatefulWidget {
  final String contentId;

  const ListeningDetailScreen({super.key, required this.contentId});

  @override
  State<ListeningDetailScreen> createState() => _ListeningDetailScreenState();
}

class _ListeningDetailScreenState extends State<ListeningDetailScreen> {
  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);

  ListeningContentModel? _content;
  bool _isLoading = true;
  late AudioPlayer _audioPlayer;
  bool _isPlaying = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  bool _showTranscript = false;
  double _playbackSpeed = 1.0;

  @override
  void initState() {
    super.initState();
    _audioPlayer = AudioPlayer();
    _initAudioPlayer();
    _loadDetail();
  }

  void _initAudioPlayer() {
    _audioPlayer.playerStateStream.listen((state) {
      if (mounted) {
        setState(() {
          _isPlaying = state.playing;
        });
      }
    });

    _audioPlayer.durationStream.listen((newDuration) {
      if (mounted) {
        setState(() {
          _duration = newDuration ?? Duration.zero;
        });
      }
    });

    _audioPlayer.positionStream.listen((newPosition) {
      if (mounted) {
        setState(() {
          _position = newPosition;
        });
      }
    });
  }

  Future<void> _loadDetail() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.accessToken != null) {
      try {
        final content = await Provider.of<ListeningProvider>(context, listen: false)
            .loadContentDetail(auth.accessToken!, widget.contentId);
        if (mounted) {
          setState(() {
            _content = content;
            _isLoading = false;
          });
          if (content != null && content.audioUrl != null) {
            await _audioPlayer.setUrl(content.audioUrl!);
          }
        }
      } catch (e) {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Lỗi tải bài nghe: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
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
          'BÀI NGHE',
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
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: _red))
          : _content == null
              ? const Center(child: Text('Không tìm thấy bài nghe', style: TextStyle(color: Colors.black54)))
              : Column(
                  children: [
                    // Audio Player section
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      child: Column(
                        children: [
                          Text(
                            _content!.title,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A)),
                          ),
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.replay_10_rounded),
                                color: Colors.black54,
                                iconSize: 32,
                                onPressed: () {
                                  final newPosition = _position - const Duration(seconds: 10);
                                  _audioPlayer.seek(newPosition < Duration.zero ? Duration.zero : newPosition);
                                },
                              ),
                              const SizedBox(width: 16),
                              Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _red,
                                  boxShadow: [
                                    BoxShadow(
                                      color: _red.withOpacity(0.3),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: IconButton(
                                  icon: Icon(_isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded),
                                  color: Colors.white,
                                  iconSize: 48,
                                  onPressed: () {
                                    if (_isPlaying) {
                                      _audioPlayer.pause();
                                    } else {
                                      _audioPlayer.play();
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(width: 16),
                              IconButton(
                                icon: const Icon(Icons.forward_10_rounded),
                                color: Colors.black54,
                                iconSize: 32,
                                onPressed: () {
                                  final newPosition = _position + const Duration(seconds: 10);
                                  _audioPlayer.seek(newPosition > _duration ? _duration : newPosition);
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          SliderTheme(
                            data: SliderThemeData(
                              thumbColor: _red,
                              activeTrackColor: _red,
                              inactiveTrackColor: _redLight,
                              overlayColor: _red.withOpacity(0.2),
                              trackHeight: 4,
                            ),
                            child: Slider(
                              min: 0.0,
                              max: _duration.inMilliseconds.toDouble() > 0 ? _duration.inMilliseconds.toDouble() : 1.0,
                              value: _position.inMilliseconds.toDouble().clamp(0.0, _duration.inMilliseconds.toDouble() > 0 ? _duration.inMilliseconds.toDouble() : 1.0),
                              onChanged: (value) {
                                _audioPlayer.seek(Duration(milliseconds: value.toInt()));
                              },
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(_formatDuration(_position), style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 12)),
                                Text(_formatDuration(_duration), style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 12)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.speed_rounded, color: Colors.black54, size: 18),
                              const SizedBox(width: 8),
                              DropdownButton<double>(
                                value: _playbackSpeed,
                                underline: const SizedBox(),
                                icon: const Icon(Icons.keyboard_arrow_down_rounded, color: _red),
                                items: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) {
                                  return DropdownMenuItem(
                                    value: speed,
                                    child: Text('${speed}x', style: const TextStyle(fontWeight: FontWeight.bold, color: _red, fontSize: 14)),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() {
                                      _playbackSpeed = value;
                                    });
                                    _audioPlayer.setSpeed(value);
                                  }
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    
                    // Transcript Section
                    Expanded(
                      child: Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(top: 16),
                        padding: const EdgeInsets.all(24),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _showTranscript = !_showTranscript;
                                });
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                                child: Row(
                                  children: [
                                    const Expanded(
                                      child: Text(
                                        'NỘI DUNG BÀI NGHE (TRANSCRIPT)',
                                        style: TextStyle(
                                          color: _red,
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 1.2,
                                        ),
                                      ),
                                    ),
                                    if (_showTranscript)
                                      const Text('ẨN BỚT', style: TextStyle(color: _red, fontSize: 11, fontWeight: FontWeight.bold)),
                                    const SizedBox(width: 4),
                                    Icon(
                                      _showTranscript ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                                      color: _red,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            if (_showTranscript)
                              Expanded(
                                child: SingleChildScrollView(
                                  child: Text(
                                    _content!.transcript ?? 'Chưa có nội dung chữ cho bài nghe này.',
                                    style: const TextStyle(fontSize: 16, height: 1.6, color: Color(0xFF1A1A1A)),
                                  ),
                                ),
                              )
                            else
                              Expanded(
                                child: Center(
                                  child: TextButton.icon(
                                    onPressed: () {
                                      setState(() {
                                        _showTranscript = true;
                                      });
                                    },
                                    icon: const Icon(Icons.visibility_rounded, color: _red),
                                    label: const Text('Hiển thị nội dung chữ', style: TextStyle(color: _red, fontWeight: FontWeight.bold)),
                                    style: TextButton.styleFrom(
                                      backgroundColor: _redLight,
                                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                  ),
                                ),
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
