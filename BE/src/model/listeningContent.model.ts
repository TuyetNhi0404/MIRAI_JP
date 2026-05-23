import mongoose, { Schema, Document } from 'mongoose';

export interface IListeningContent extends Document {
  title: string;
  description: string;
  topic: string;
  level: string;
  audioSource: 'upload' | 'tts';
  audioUrl: string;
  transcript?: string;
  duration?: number;
  thumbnailUrl?: string;
  exercises: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  isPublished: boolean;
  playCount: number;
}

const listeningContentSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    topic: { 
      type: String, 
      enum: ['daily_life', 'travel', 'business', 'culture', 'school', 'shopping', 'weather', 'health', 'food', 'news', 'other'],
      required: true 
    },
    level: { type: String, enum: ['N5', 'N4', 'N3', 'N2', 'N1'], required: true },
    audioSource: { type: String, enum: ['upload', 'tts'], required: true },
    // Empty until file is uploaded to Cloudinary (audioSource === 'upload')
    audioUrl: { type: String, default: '' },
    transcript: { type: String },
    duration: { type: Number },
    thumbnailUrl: { type: String },
    exercises: [{ type: Schema.Types.ObjectId, ref: 'ListeningExercise' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false },
    playCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IListeningContent>('ListeningContent', listeningContentSchema);
