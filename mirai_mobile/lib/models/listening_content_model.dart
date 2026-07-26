class ListeningContentModel {
  final String id;
  final String title;
  final String description;
  final String topic;
  final String level;
  final String audioSource;
  final String audioUrl;
  final String? transcript;
  final int? duration;
  final String? thumbnailUrl;
  final int playCount;
  final bool isPublished;
  final DateTime createdAt;

  ListeningContentModel({
    required this.id,
    required this.title,
    required this.description,
    required this.topic,
    required this.level,
    required this.audioSource,
    required this.audioUrl,
    this.transcript,
    this.duration,
    this.thumbnailUrl,
    required this.playCount,
    required this.isPublished,
    required this.createdAt,
  });

  factory ListeningContentModel.fromJson(Map<String, dynamic> json) {
    return ListeningContentModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      topic: json['topic'] ?? '',
      level: json['level'] ?? '',
      audioSource: json['audioSource'] ?? 'upload',
      audioUrl: json['audioUrl'] ?? '',
      transcript: json['transcript'],
      duration: json['duration'],
      thumbnailUrl: json['thumbnailUrl'],
      playCount: json['playCount'] ?? 0,
      isPublished: json['isPublished'] ?? true,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
    );
  }
}
