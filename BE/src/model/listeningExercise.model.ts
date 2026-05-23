import mongoose, { Schema, Document } from 'mongoose';

export interface IListeningExercise extends Document {
  contentId: mongoose.Types.ObjectId;
  type: 'quiz' | 'fill_blank' | 'dictation';
  orderIndex: number;
  question: string;
  
  // For 'quiz'
  options?: string[];
  correctAnswer?: string;
  
  // For 'fill_blank'
  textWithBlanks?: string;
  answers?: string[];
  
  // For 'dictation'
  targetText?: string;
  audioSegmentStart?: number;
  audioSegmentEnd?: number;
}

const listeningExerciseSchema: Schema = new Schema(
  {
    contentId: { type: Schema.Types.ObjectId, ref: 'ListeningContent', required: true },
    type: { type: String, enum: ['quiz', 'fill_blank', 'dictation'], required: true },
    orderIndex: { type: Number, required: true },
    question: { type: String, required: true },
    
    // For 'quiz'
    options: [{ type: String }],
    correctAnswer: { type: String },
    
    // For 'fill_blank'
    textWithBlanks: { type: String },
    answers: [{ type: String }],
    
    // For 'dictation'
    targetText: { type: String },
    audioSegmentStart: { type: Number },
    audioSegmentEnd: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model<IListeningExercise>('ListeningExercise', listeningExerciseSchema);
