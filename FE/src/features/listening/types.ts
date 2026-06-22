export interface ListeningContent {
  _id: string;
  title: string;
  description: string;
  topic: string;
  level: string;
  audioSource: 'upload' | 'tts';
  audioUrl: string;
  transcript: string;
  duration: number;
  thumbnailUrl: string;
  playCount: number;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}
