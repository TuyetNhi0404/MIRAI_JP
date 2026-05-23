import type { ListeningContent, ListeningExercise } from "./types";

export const mockListeningContents: ListeningContent[] = [
  {
    _id: "1",
    title: "JLPT N5 Listening Practice - Daily Life",
    description: "A simple conversation about daily routines and hobbies.",
    topic: "daily_life",
    level: "N5",
    audioSource: "tts",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    transcript: "私は毎朝7時に起きます。朝ごはんはパンとコーヒーです。8時に家を出て、電車で会社に行きます。",
    duration: 120,
    thumbnailUrl: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800",
    playCount: 1540,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "2",
    title: "JLPT N4 Listening - Travel to Kyoto",
    description: "Listening to a guide explaining the itinerary for a trip to Kyoto.",
    topic: "travel",
    level: "N4",
    audioSource: "upload",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    transcript: "京都へようこそ。今日は金閣寺と清水寺に行きます。昼ごはんは美味しいお寿司を食べましょう。",
    duration: 185,
    thumbnailUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800",
    playCount: 920,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "3",
    title: "Business Japanese N3 - Meeting",
    description: "Understand a basic business meeting scenario.",
    topic: "business",
    level: "N3",
    audioSource: "tts",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    transcript: "会議を始めます。先月の売上について報告をお願いします。はい、先月の売上は目標を達成しました。",
    duration: 250,
    thumbnailUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32d7?auto=format&fit=crop&q=80&w=800",
    playCount: 450,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const mockExercises: Record<string, ListeningExercise[]> = {
  "1": [
    {
      _id: "e1",
      contentId: "1",
      type: "quiz",
      orderIndex: 1,
      question: "何時に起きますか？",
      options: ["6時", "7時", "8時", "9時"],
      correctAnswer: "7時"
    },
    {
      _id: "e2",
      contentId: "1",
      type: "fill_blank",
      orderIndex: 2,
      question: "Fill in the blank",
      textWithBlanks: "私は毎朝___時に起きます。朝ごはんは___と___です。",
      answers: ["7", "パン", "コーヒー"]
    },
    {
      _id: "e3",
      contentId: "1",
      type: "dictation",
      orderIndex: 3,
      question: "Listen and write down what you hear.",
      targetText: "8時に家を出て、電車で会社に行きます。",
      audioSegmentStart: 10,
      audioSegmentEnd: 20
    }
  ]
};
