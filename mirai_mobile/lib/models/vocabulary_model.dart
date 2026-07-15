class VocabularyModel {
  final String id;
  final String word;
  final String reading;
  final String meaning;
  final String level;
  final String topic;
  final String? example;
  final String? exampleMeaning;
  final List<String>? tags;

  VocabularyModel({
    required this.id,
    required this.word,
    required this.reading,
    required this.meaning,
    required this.level,
    required this.topic,
    this.example,
    this.exampleMeaning,
    this.tags,
  });

  factory VocabularyModel.fromJson(Map<String, dynamic> json) {
    var tagList = json['tags'] as List? ?? [];
    List<String> parsedTags = tagList.map((t) => t.toString()).toList();

    return VocabularyModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      word: json['word']?.toString() ?? '',
      reading: json['reading']?.toString() ?? '',
      meaning: json['meaning']?.toString() ?? '',
      level: json['level']?.toString() ?? 'N5',
      topic: json['topic']?.toString() ?? '',
      example: json['example']?.toString(),
      exampleMeaning: json['exampleMeaning']?.toString(),
      tags: parsedTags,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'word': word,
      'reading': reading,
      'meaning': meaning,
      'level': level,
      'topic': topic,
      'example': example,
      'exampleMeaning': exampleMeaning,
      'tags': tags,
    };
  }
}
